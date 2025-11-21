// backend/api/services/orderService.js

const { pool, pool2 } = require('../db');
const { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } = require('../emailService');
const { generateOrderPDF, generateOrderCSV } = require('../utils/fileGenerator');
const orderModel = require('../models/orderModel');
const userModel = require('../models/userModel'); // Importar userModel
const { formatCurrency } = require('../utils/helpers');

/**
 * Orquesta la creación de un nuevo pedido, incluyendo la transacción en la base de datos,
 * la actualización de la cuenta corriente y el envío de notificaciones.
 * @param {object} orderData - Los datos del pedido { items, total, paymentMethod }.
 * @param {number} userId - El ID del usuario que realiza el pedido.
 * @returns {object} - Un objeto con el resultado de la operación.
 */
const createOrder = async (orderData, userId) => {
  const { items, total, paymentMethod } = orderData;

  // --- 1. Obtener datos del usuario para el email ---
  let user;
  try {
    const userResult = await pool.query('SELECT full_name, email, a1_cod FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`Usuario con ID ${userId} no encontrado.`);
    }
    user = userResult.rows[0];
  } catch (error) {
    console.error('Error al buscar usuario en createOrder:', error);
    throw error; // Detener la ejecución si no encontramos al usuario
  }

  const client = await pool2.connect();
  let newOrder;
  let newOrderId;

  try {
    // Iniciar Transacción en BD 2
    await client.query('BEGIN');

    // 2. Insertar el pedido principal (orders) en BD 2
    const orderInsertQuery = `
      INSERT INTO orders (user_id, a1_cod, total, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at;
    `;
    const orderValues = [userId, user.a1_cod, total, 'Pendiente'];

    const orderResult = await client.query(orderInsertQuery, orderValues);
    newOrder = orderResult.rows[0];
    newOrderId = newOrder.id;

    // 3. Insertar los items del pedido (order_items) en BD 2
    const itemInsertQuery = `
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, product_code)
      VALUES ($1, $2, $3, $4, $5);
    `;

    for (const item of items) {
      const itemValues = [
        newOrderId,
        item.id,
        item.quantity,
        item.price,
        item.code
      ];
      await client.query(itemInsertQuery, itemValues);
    }

    // Terminar Transacción en BD 2
    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en la transacción de guardado de pedido en BD2:', error);
    throw error;
  } finally {
    client.release();
  }

  // --- Lógica Post-Transacción ---
  try {
    // 4. Si paga con 'Cuenta Corriente', registrar el débito en BD 1
    if (paymentMethod === 'Cuenta Corriente') {
      try {
        const updateBalanceQuery = `
          INSERT INTO account_movements (user_id, debit, description, order_ref, date)
          VALUES ($1, $2, $3, $4, CURRENT_DATE);
        `;
        await pool.query(updateBalanceQuery, [userId, total, `Débito por Pedido #${newOrderId}`, newOrderId]);
      } catch (balanceError) {
        console.error(`[ERROR CRÍTICO] Pedido #${newOrderId} guardado, pero falló la actualización de saldo para usuario ${userId}:`, balanceError);
      }
    }

    // 5. Enviar correos y generar archivos
    const productIds = items.map(item => item.id);
    const productsResult = await pool.query('SELECT id, description FROM products WHERE id = ANY($1::int[])', [productIds]);
    const productMap = new Map(productsResult.rows.map(p => [p.id, p.description]));

    const enrichedItems = items.map(item => ({
      ...item,
      name: productMap.get(item.id) || 'Descripción no encontrada',
    }));

    const sellerEmail = process.env.SELLER_EMAIL;
    const fromEmail = process.env.EMAIL_FROM;

    if (!sellerEmail || !fromEmail || !process.env.RESEND_API_KEY) {
      console.warn(`[Pedido #${newOrderId}] Faltan variables .env (RESEND_API_KEY, SELLER_EMAIL o EMAIL_FROM). No se enviarán correos.`);
    } else {
      console.log(`[Pedido #${newOrderId}] Enviando correos a ${user.email} y ${sellerEmail}...`);

      const orderDataForFiles = { user, newOrder, items: enrichedItems, total };
      
      const pdfBuffer = await generateOrderPDF(orderDataForFiles);
      const csvBuffer = await generateOrderCSV(enrichedItems);

      const pdfAttachment = {
        filename: `Pedido_${newOrderId}.pdf`,
        content: pdfBuffer,
      };
      const csvAttachment = {
        filename: `Pedido_${newOrderId}.csv`,
        content: csvBuffer,
      };
      
      await sendOrderConfirmationEmail(
        user.email,
        newOrderId,
        enrichedItems,
        total,
        user.full_name,
        [pdfAttachment]
      );

      await sendNewOrderNotificationEmail(
        sellerEmail,
        newOrderId,
        enrichedItems,
        total,
        user,
        [pdfAttachment, csvAttachment]
      );
      
      console.log(`[Pedido #${newOrderId}] Correos con adjuntos enviados con éxito.`);
    }

  } catch (postTransactionError) {
    console.error(`[ERROR POST-TRANSACCIÓN] Pedido #${newOrderId} guardado, pero fallaron operaciones posteriores (email/saldo):`, postTransactionError);
  }

  return { success: true, message: 'Pedido guardado con éxito.', orderId: newOrderId };
};

/**
 * Obtiene y formatea el historial de pedidos de un usuario.
 * Si el usuario es un vendedor, obtiene los pedidos de todos sus clientes.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<Array<object>>} - Una promesa que se resuelve con la lista de pedidos formateados.
 */
const fetchOrders = async (user) => { // Cambiar userId a user
  console.log(`[orderService] fetchOrders llamado para user:`, user);
  // CORRECCIÓN: Usar user.userId en lugar de user.id
  let targetUserIds = [user.userId]; // Por defecto, buscar pedidos del propio usuario (usando user.userId)

  // El objeto 'user' ya viene con el rol y código correctos del token JWT
  // No necesitamos llamar a userModel.findUserById(user.id) de nuevo aquí
  // porque ya tenemos la información del usuario autenticado.

  if (!user) { // Esto ya no debería ser necesario si el middleware funciona
    throw new Error('Usuario no encontrado.');
  }

  // 2. Si el usuario es un vendedor, obtener los IDs de sus clientes
  if (user.role === 'vendedor' && user.codigo) {
    console.log(`[orderService] Usuario ${user.userId} es VENDEDOR con codigo: ${user.codigo}`); // Usar user.userId
    const clients = await userModel.findUsersByVendedorCodigo(user.codigo);
    console.log(`[orderService] Clientes encontrados para vendedor ${user.codigo}:`, clients.map(c => c.id));
    targetUserIds = clients.map(client => client.id);
    // Si el vendedor también es un cliente y tiene pedidos propios,
    // podríamos querer incluir su propio ID aquí si no está ya en la lista de clientes.
    // Por ahora, nos basamos en que findUsersByVendedorCodigo devuelve todos los clientes.
    // Si el vendedor puede tener pedidos propios no asociados a un cliente,
    // y quiere verlos, habría que añadir user.id a targetUserIds.
    // Por la descripción, parece que solo quiere ver los de sus clientes.

    if (targetUserIds.length === 0) {
      console.log(`[orderService] Vendedor ${user.userId} no tiene clientes asignados. Devolviendo array vacío.`); // Usar user.userId
      return [];
    }
  } else {
    console.log(`[orderService] Usuario ${user.userId} NO es vendedor o no tiene codigo. Role: ${user.role}, Codigo: ${user.codigo}`); // Usar user.userId
  }

  console.log(`[orderService] Buscando pedidos para targetUserIds:`, targetUserIds);
  const orders = await orderModel.findOrders(targetUserIds);
  console.log(`[orderService] Pedidos encontrados: ${orders.length}`);
  
  return orders.map(order => ({
    ...order,
    formattedTotal: formatCurrency(order.total)
  }));
};

/**
 * Obtiene y formatea los detalles de un pedido específico.
 * @param {number} orderId - El ID del pedido.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object|null>} - Una promesa que se resuelve con los detalles del pedido formateados o null.
 */
const fetchOrderDetails = async (orderId, userId) => {
  const orderDetails = await orderModel.findOrderDetailsById(orderId, userId);

  if (!orderDetails) {
    return null;
  }

  // Formatear y enriquecer
  return {
    ...orderDetails,
    items: orderDetails.items.map(item => ({
      ...item,
      product_name: item.product_name,
      formattedPrice: formatCurrency(item.unit_price)
    })),
    formattedTotal: formatCurrency(orderDetails.total)
  };
};

/**
 * Prepara los datos de un pedido y genera su PDF.
 * @param {number} orderId - El ID del pedido.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<Buffer>} - El contenido del PDF como un buffer.
 */
const downloadOrderPdf = async (orderId, userId) => {
  try {
    // 1. Obtener detalles del pedido
    const orderDetails = await orderModel.findOrderDetailsById(orderId, userId);
    if (!orderDetails) {
      throw new Error('Pedido no encontrado o no le pertenece al usuario.');
    }

    // 2. Obtener datos del usuario
    const userResult = await pool.query('SELECT full_name, email, a1_cod FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`Usuario con ID ${userId} no encontrado.`);
    }
    const user = userResult.rows[0];

    // 3. Enriquecer items con nombres de productos para el PDF
    const productIds = orderDetails.items.map(item => item.product_id);
    const productsResult = await pool.query('SELECT id, description FROM products WHERE id = ANY($1::int[])', [productIds]);
    const productMap = new Map(productsResult.rows.map(p => [p.id, p.description]));

    const enrichedItems = orderDetails.items.map(item => ({
      code: item.product_code,
      name: productMap.get(item.product_id) || 'Descripción no encontrada',
      quantity: item.quantity,
      price: item.unit_price,
    }));

    // 4. Preparar orderData para generateOrderPDF
    const orderDataForPdf = {
      user: user,
      newOrder: {
        id: orderDetails.id,
        created_at: orderDetails.created_at,
      },
      items: enrichedItems,
      total: orderDetails.total,
    };

    // 5. Generar el PDF
    const pdfBuffer = await generateOrderPDF(orderDataForPdf);
    return pdfBuffer;

  } catch (error) {
    console.error(`Error en orderService.downloadOrderPdf para pedido ${orderId}:`, error);
    throw error;
  }
};

module.exports = {
  createOrder,
  fetchOrders,
  fetchOrderDetails,
  downloadOrderPdf,
};
