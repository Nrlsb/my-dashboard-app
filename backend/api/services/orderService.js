// backend/api/services/orderService.js

const { pool, pool2 } = require('../db');
const { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } = require('../emailService');
const { generateOrderPDF, generateOrderCSV } = require('../utils/fileGenerator');

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

module.exports = {
  createOrder,
};
