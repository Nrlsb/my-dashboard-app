/*
* =================================================================
* CONTROLADORES (Lógica de Negocio)
* =================================================================
*
* Conecta la lógica de la API (rutas) con la base de datos (db).
*
* =================================================================
*/

const { pool, pool2 } = require('./db'); // Importar el pool de conexiones
const bcrypt = require('bcryptjs'); // (NUEVO) Para hashear contraseñas
const { formatCurrency, formatMovementType } = require('./utils/helpers'); // Importar helpers
const { getExchangeRates } = require('./utils/exchangeRateService'); // (NUEVO) Importar servicio de cotizaciones

// (NUEVO) Importar el servicio de email
const { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } = require('./emailService');
const { generateOrderPDF, generateOrderCSV } = require('./utils/fileGenerator');


// =================================================================
// --- (NUEVO) Autenticación y Perfil (Users Table) ---
// =================================================================

/**
 * (NUEVO) Obtiene las cotizaciones del dólar (billete y divisa)
 */
const getExchangeRatesController = async (req, res) => {
  try {
    const rates = await getExchangeRates();
    return rates;
  } catch (error) {
    console.error('Error en getExchangeRatesController:', error);
    throw error;
  }
};

/**
 * Autentica un usuario contra la tabla 'users'
 */
const authenticateProtheusUser = async (email, password) => {
  try {
    console.log(`Buscando usuario con email: ${email}`);
    // Paso 1: Autenticar usuario contra la DB1 (pool)
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('Usuario no encontrado.');
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }
    
    const user = result.rows[0];
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      console.log('Contraseña incorrecta.');
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }

    console.log(`Usuario ${user.id} autenticado. Verificando permisos de admin en DB2...`);
    const { password_hash, ...userWithoutPassword } = user;

    // Paso 2: Verificar si es admin en la DB2 (pool2)
    try {
      const adminCheck = await pool2.query('SELECT 1 FROM admins WHERE user_id = $1', [user.id]);
      if (adminCheck.rows.length > 0) {
        console.log(`El usuario ${user.id} ES administrador.`);
        userWithoutPassword.is_admin = true;
      } else {
        console.log(`El usuario ${user.id} NO es administrador.`);
        userWithoutPassword.is_admin = false;
      }
    } catch (adminDbError) {
      console.error('Error al consultar la tabla de administradores en DB2:', adminDbError);
      // Decidir si fallar o continuar sin permisos de admin.
      // Es más seguro asumir que no es admin si la DB2 falla.
      userWithoutPassword.is_admin = false;
    }
    
    // Paso 3: Devolver el usuario con el estado de admin actualizado
    return { success: true, user: userWithoutPassword };
    
  } catch (error) {
    console.error('Error en authenticateProtheusUser:', error);
    throw error; // Lanza el error para que la ruta lo maneje
  }
};

/**
 * Registra un nuevo usuario en la tabla 'users'
 */
const registerProtheusUser = async (userData) => {
  // (CORREGIDO) El frontend envía 'nombre', pero la BD espera 'full_name'
  const { nombre, email, password, a1_cod, a1_loja, a1_cgc, a1_tel, a1_email } = userData;
  
  try {
    // Verificar si el email ya existe
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new Error('El email ya está registrado.');
    }
    
    // (NUEVO) Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // (CORREGIDO) Se inserta en 'full_name' (el script no tiene 'a1_email')
    const query = `
      INSERT INTO users 
        (full_name, email, password_hash, a1_cod, a1_loja, a1_cgc, a1_tel, is_admin)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    // Por defecto, is_admin = false
    // (CORREGIDO) Se usa 'nombre' (del form) para 'full_name' (de la BD)
    const values = [nombre, email, passwordHash, a1_cod, a1_loja, a1_cgc, a1_tel, false];
    
    const result = await pool.query(query, values);
    const newUser = result.rows[0];
    
    // No devolver el hash
    const { password_hash, ...userToReturn } = newUser;
    console.log(`Nuevo usuario registrado: ${userToReturn.email}`);
    
    return userToReturn;
    
  } catch (error) {
    console.error('Error en registerProtheusUser:', error);
    throw error; // Lanza el error para que la ruta lo maneje
  }
};


/**
 * Obtiene los datos del perfil de un usuario
 */
const getProfile = async (userId) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return null; // Usuario no encontrado
    }
    
    const { password_hash, ...profileData } = result.rows[0];
    return profileData;
    
  } catch (error) {
    console.error('Error en getProfile:', error);
    throw error;
  }
};

/**
 * Actualiza los datos del perfil de un usuario
 */
const updateProfile = async (userId, profileData) => {
  // (CORREGIDO) El frontend envía 'nombre', la BD espera 'full_name'
  const { nombre, a1_tel, a1_email, a1_endereco } = profileData;
  // (Opcional: incluir cambio de contraseña aquí, verificando la actual)
  
  try {
    // (CORREGIDO) Se actualiza 'full_name' y 'a1_endereco'. Se quita 'a1_email' (no existe)
    const query = `
      UPDATE users
      SET full_name = $1, a1_tel = $2, a1_endereco = $3
      WHERE id = $4
      RETURNING *;
    `;
    const values = [nombre, a1_tel, a1_endereco || null, userId];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Usuario no encontrado al actualizar.');
    }
    
    const { password_hash, ...updatedUser } = result.rows[0];
    console.log(`Perfil actualizado para usuario: ${updatedUser.email}`);
    
    return { success: true, message: 'Perfil actualizado.', user: updatedUser };
    
  } catch (error) {
    console.error('Error en updateProfile:', error);
    throw error;
  }
};


// =================================================================
// --- Cuenta Corriente (Movements Table) ---
// =================================================================

/**
 * Obtiene el saldo total (SUMA) de los movimientos de un usuario
 */
const fetchProtheusBalance = async (userId) => {
  try {
    // Adaptado a la tabla 'account_movements'
    const query = `
      SELECT 
        COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) AS total_balance
      FROM account_movements
      WHERE user_id = $1;
    `;
    const result = await pool.query(query, [userId]);
    
    const balance = parseFloat(result.rows[0].total_balance);
    
    return {
      balance: balance,
      formattedBalance: formatCurrency(balance) // Usar el helper
    };
    
  } catch (error) {
    console.error('Error en fetchProtheusBalance:', error);
    throw error;
  }
};


/**
 * Obtiene el historial de movimientos de un usuario
 */
const fetchProtheusMovements = async (userId) => {
  try {
    // Adaptado a la tabla 'account_movements'
    const query = `
      SELECT *, 
             TO_CHAR(date, 'DD/MM/YYYY') as formatted_date
      FROM account_movements
      WHERE user_id = $1
      ORDER BY date DESC, created_at DESC;
    `;
    const result = await pool.query(query, [userId]);
    
    // Formatear los datos antes de enviarlos
    const formattedMovements = result.rows.map(mov => {
      // La tabla tiene 'debit' y 'credit', no 'amount'. Creamos un valor unificado.
      const amount = mov.credit - mov.debit;
      return {
        ...mov,
        amount: amount, // Añadimos el campo 'amount' calculado
        formattedAmount: formatCurrency(amount),
        // La columna 'type' no existe, se elimina 'formattedType'
      };
    });
    
    return formattedMovements;
    
  } catch (error) {
    console.error('Error en fetchProtheusMovements:', error);
    throw error;
  }
};

// =================================================================
// --- (NUEVO) Administración de Cuenta Corriente ---
// =================================================================

/**
 * (Admin) Crea una Nota de Crédito (NC) para un cliente
 */
const createCreditNote = async (targetUserCod, reason, items, invoiceRefId, adminUserId) => {
  try {
    // 1. Verificar que el cliente (targetUserCod) existe
    const userResult = await pool.query('SELECT id FROM users WHERE a1_cod = $1', [targetUserCod]);
    if (userResult.rows.length === 0) {
      throw new Error(`El cliente con código ${targetUserCod} no existe en la base de datos.`);
    }
    const targetUserId = userResult.rows[0].id;

    // 2. Calcular el total de la NC basado en los items
    let totalCreditAmount = 0;
    for (const item of items) {
      totalCreditAmount += item.quantity * item.unit_price;
    }

    if (totalCreditAmount <= 0) {
      throw new Error('El monto de la nota de crédito debe ser positivo.');
    }

    // 3. Insertar el movimiento en 'account_movements'
    // Adaptado a script.sql: Se usa la columna 'credit'.
    const query = `
      INSERT INTO account_movements 
        (user_id, credit, description, date)
      VALUES 
        ($1, $2, $3, CURRENT_DATE)
      RETURNING *;
    `;
    // La info extra (admin, reason) va en la descripción.
    const description = `Nota de Crédito (Admin: ${adminUserId}): ${reason}. Ref Fact: ${invoiceRefId}.`;
    const values = [targetUserId, totalCreditAmount, description];
    
    const result = await pool.query(query, values);
    
    console.log(`Nota de Crédito creada por Admin ${adminUserId} para Cliente ${targetUserCod}. Monto: ${totalCreditAmount}`);
    
    return { success: true, message: 'Nota de crédito creada exitosamente.', movement: result.rows[0] };

  } catch (error) {
    console.error('Error en createCreditNote:', error);
    throw error;
  }
};

/**
 * (Admin) Busca facturas de un cliente (para referencia de NC)
 */
const fetchCustomerInvoices = async (customerCod) => {
  try {
    // Adaptado a 'account_movements': Una factura es un débito con referencia a un pedido.
    const query = `
      SELECT 
        am.id, am.date, am.debit, am.description, am.order_ref,
        TO_CHAR(am.date, 'DD/MM/YYYY') as formatted_date
      FROM account_movements am
      JOIN users u ON am.user_id = u.id
      WHERE u.a1_cod = $1 
        AND am.debit > 0
        AND am.order_ref IS NOT NULL
      ORDER BY am.date DESC;
    `;
    
    const result = await pool.query(query, [customerCod]);
    
    if (result.rows.length === 0) {
      console.log(`No se encontraron facturas para el código: ${customerCod}`);
      return []; 
    }
    
    // Formatear para que coincida con lo que el frontend podría esperar
    return result.rows.map(inv => ({
      id: inv.id,
      created_at: inv.date, // Mapear 'date' a 'created_at'
      amount: -inv.debit, // Frontend esperaba un débito como negativo
      formattedAmount: formatCurrency(-inv.debit),
      description: inv.description,
      formatted_date: inv.formatted_date,
      invoiceId: inv.order_ref // El ID de la factura es la referencia del pedido
    }));
    
  } catch (error) {
    console.error(`Error en fetchCustomerInvoices para ${customerCod}:`, error);
    throw error;
  }
};

/**
 * (Admin) Obtiene detalles de CUALQUIER pedido (para NC)
 */
const fetchAdminOrderDetails = async (orderId) => {
  try {
    // 1. Obtener datos del pedido desde BD2
    const orderQuery = `
      SELECT *, TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted_date
      FROM orders
      WHERE id = $1;
    `;
    const orderResult = await pool2.query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      return null; // Pedido no encontrado
    }
    const order = orderResult.rows[0];

    // 2. Obtener datos del usuario desde BD1
    const userQuery = `SELECT full_name as user_nombre, email as user_email FROM users WHERE id = $1;`;
    const userResult = await pool.query(userQuery, [order.user_id]);
    const user = userResult.rows[0] || { user_nombre: 'N/A', user_email: 'N/A' };
    
    // 3. Obtener items del pedido desde BD2
    const itemsQuery = `SELECT * FROM order_items WHERE order_id = $1;`;
    const itemsResult = await pool2.query(itemsQuery, [orderId]);
    const items = itemsResult.rows;

    if (items.length > 0) {
        // 4. Obtener los IDs de los productos
        const productIds = items.map(item => item.product_id);

        // 5. Obtener las descripciones de los productos desde BD1
        const productsQuery = `SELECT id, description FROM products WHERE id = ANY($1::int[]);`;
        const productsResult = await pool.query(productsQuery, [productIds]);
        const productMap = new Map(productsResult.rows.map(p => [p.id, p.description]));

        // 6. Enriquecer los items con la descripción del producto
        items.forEach(item => {
            item.product_name = productMap.get(item.product_id) || 'Descripción no disponible';
        });
    }
    
    // 7. Combinar y formatear
    const orderDetails = {
      ...order,
      ...user,
      items: items.map(item => ({
        ...item,
        product_name: item.product_name,
        formattedPrice: formatCurrency(item.unit_price)
      })),
      formattedTotal: formatCurrency(order.total)
    };
    
    return orderDetails;
    
  } catch (error)
 {
    console.error(`Error en fetchAdminOrderDetails (Admin) para ID ${orderId}:`, error);
    throw error;
  }
};


// =================================================================
// --- Pedidos (Orders Tables) ---
// =================================================================

/**
 * Obtiene el historial de pedidos de un usuario
 */
const fetchProtheusOrders = async (userId) => {
  try {
    const query = `
      SELECT id, total, status, 
             TO_CHAR(created_at, 'DD/MM/YYYY') as formatted_date,
             (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await pool2.query(query, [userId]);
    
    // Formatear los datos antes de enviarlos
    const formattedOrders = result.rows.map(order => ({
      ...order,
      formattedTotal: formatCurrency(order.total)
    }));
    
    return formattedOrders;
    
  } catch (error) {
    console.error('Error en fetchProtheusOrders:', error);
    throw error;
  }
};

/**
 * Obtiene los detalles (incluyendo items) de un pedido específico de un usuario
 */
const fetchProtheusOrderDetails = async (orderId, userId) => {
  try {
    // 1. Obtener datos del pedido (y verificar que pertenece al usuario) desde BD2
    const orderQuery = `
      SELECT *, 
             TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted_date
      FROM orders
      WHERE id = $1 AND user_id = $2;
    `;
    const orderResult = await pool2.query(orderQuery, [orderId, userId]);
    
    if (orderResult.rows.length === 0) {
      return null; // Pedido no encontrado o no pertenece al usuario
    }
    
    // 2. Obtener items del pedido desde BD2 (sin el JOIN)
    const itemsQuery = `SELECT * FROM order_items WHERE order_id = $1;`;
    const itemsResult = await pool2.query(itemsQuery, [orderId]);
    const items = itemsResult.rows;

    if (items.length > 0) {
        // 3. Obtener los IDs de los productos
        const productIds = items.map(item => item.product_id);

        // 4. Obtener las descripciones de los productos desde BD1
        const productsQuery = `SELECT id, description FROM products WHERE id = ANY($1::int[]);`;
        const productsResult = await pool.query(productsQuery, [productIds]);
        const productMap = new Map(productsResult.rows.map(p => [p.id, p.description]));

        // 5. Enriquecer los items con la descripción del producto
        items.forEach(item => {
            item.product_name = productMap.get(item.product_id) || 'Descripción no disponible';
        });
    }
    
    // 6. Combinar y formatear
    const orderDetails = {
      ...orderResult.rows[0],
      items: items.map(item => ({
        ...item,
        product_name: item.product_name, // Usar el nombre enriquecido
        formattedPrice: formatCurrency(item.unit_price)
      })),
      formattedTotal: formatCurrency(orderResult.rows[0].total)
    };
    
    return orderDetails;
    
  } catch (error) {
    console.error(`Error en fetchProtheusOrderDetails para ID ${orderId} y User ${userId}:`, error);
    throw error;
  }
};


/**
 * Guarda un nuevo pedido (y sus items) en la base de datos
 */
const saveProtheusOrder = async (orderData, userId) => {
  const { items, total, paymentMethod } = orderData;
  
  // --- 1. Obtener datos del usuario para el email ---
  let user;
  try {
    // (CORREGIDO) Se cambió 'nombre' por 'full_name'
    const userResult = await pool.query('SELECT full_name, email, a1_cod FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`Usuario con ID ${userId} no encontrado.`);
    }
    user = userResult.rows[0];
  } catch (error) {
    console.error('Error al buscar usuario en saveProtheusOrder:', error);
    throw error; // Detener la ejecución si no encontramos al usuario
  }

  // (MODIFICADO) Conectamos un cliente para la transacción a la BD 2
  const client = await pool2.connect();
  let newOrder; // La declaramos aquí para que sea accesible fuera del try/catch de la transacción
  let newOrderId;
  
  try {
    // Iniciar Transacción en BD 2
    await client.query('BEGIN');
    
    // 1. Insertar el pedido principal (orders) en BD 2
    const orderInsertQuery = `
      INSERT INTO orders (user_id, total, status)
      VALUES ($1, $2, $3)
      RETURNING id, created_at;
    `;
    const orderValues = [userId, total, 'Pendiente'];
    
    const orderResult = await client.query(orderInsertQuery, orderValues);
    newOrder = orderResult.rows[0];
    newOrderId = newOrder.id; // Asignamos el ID del nuevo pedido

    // 2. Insertar los items del pedido (order_items) en BD 2
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
    // Si algo falla, hacer rollback en BD 2
    await client.query('ROLLBACK');
    console.error('Error en la transacción de guardado de pedido en BD2:', error);
    throw error; // Lanza el error para que la ruta lo maneje
  } finally {
    client.release(); // Liberar el cliente de vuelta al pool2
  }

  // --- Lógica Post-Transacción ---
  try {
    // 3. Si paga con 'Cuenta Corriente', registrar el débito en BD 1 (FUERA de la transacción principal)
    if (paymentMethod === 'Cuenta Corriente') {
      try {
        const updateBalanceQuery = `
          INSERT INTO account_movements (user_id, debit, description, order_ref, date)
          VALUES ($1, $2, $3, $4, CURRENT_DATE);
        `;
        await pool.query(updateBalanceQuery, [userId, total, `Débito por Pedido #${newOrderId}`, newOrderId]);
      } catch (balanceError) {
        // CRÍTICO: El pedido se guardó pero no se pudo actualizar el saldo.
        // Se debe registrar este error para una corrección manual.
        console.error(`[ERROR CRÍTICO] Pedido #${newOrderId} guardado, pero falló la actualización de saldo para usuario ${userId}:`, balanceError);
      }
    }

    // 4. Enviar correos y generar archivos
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
    // Si falla el envío de email o la actualización de saldo, NO detenemos la operación.
    // El pedido ya se guardó. Solo lo logueamos.
    console.error(`[ERROR POST-TRANSACCIÓN] Pedido #${newOrderId} guardado, pero fallaron operaciones posteriores (email/saldo):`, postTransactionError);
  }

  // Devolver éxito (el pedido se guardó)
  return { success: true, message: 'Pedido guardado con éxito.', orderId: newOrderId };
};

// =================================================================
// --- Productos y Ofertas (Products Table) ---
// =================================================================

/**
 * Obtiene la lista de productos (paginada y con búsqueda)
 */
const fetchProtheusProducts = async (page = 1, limit = 20, search = '', brand = '', userId = null) => {
  console.log(`[DEBUG] fetchProtheusProducts llamado con: page=${page}, limit=${limit}, search='${search}', brand='${brand}', userId=${userId}`);
  try {
    // (NUEVO) Obtener las cotizaciones del dólar
    const exchangeRates = await getExchangeRates();
    const ventaBillete = exchangeRates.venta_billete;
    const ventaDivisa = exchangeRates.venta_divisa;

    const offset = (page - 1) * limit;
    let queryParams = [];
    
    // --- Query para Contar Total ---
    let countQuery = 'SELECT COUNT(*) FROM products WHERE price > 0 AND description IS NOT NULL';
    
    // --- Query para Obtener Productos ---
    // (MODIFICADO) Se añade product_group a la selección
    let dataQuery = `
            SELECT
              id, code, description, price, brand,
              capacity_description, moneda, cotizacion, product_group
            FROM products      WHERE price > 0 AND description IS NOT NULL
    `;
    
    // --- Aplicar Filtros ---
    let paramIndex = 1;

    // (NUEVO) Lógica de permisos por grupo de productos
    let isUserAdmin = false;
    if (userId) {
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0) {
        isUserAdmin = userResult.rows[0].is_admin;
      }
    }
    console.log(`[DEBUG] userId: ${userId}, isUserAdmin: ${isUserAdmin}`);

    if (userId) {
      const deniedGroups = await getDeniedProductGroups(userId);
      console.log(`[DEBUG] Grupos denegados para usuario no admin ${userId}:`, deniedGroups);
      
      if (deniedGroups.length > 0) {
        const groupQuery = ` product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
        countQuery += ` AND ${groupQuery}`;
        dataQuery += ` AND ${groupQuery}`;
        queryParams.push(deniedGroups);
        paramIndex++;
      } else {
        // Si no hay grupos denegados, el usuario puede ver todos los productos.
        // No se añade ninguna cláusula WHERE para grupos de productos.
        console.log(`[DEBUG] Usuario ${userId} no tiene grupos denegados, mostrando todos los productos.`);
      }
    }
    
    if (search) {
      const searchQuery = ` (description ILIKE $${paramIndex} OR code ILIKE $${paramIndex}) `;
      countQuery += ` AND ${searchQuery}`;
      dataQuery += ` AND ${searchQuery}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (brand) {
      const brands = brand.split(',');
      const brandQuery = ` brand = ANY($${paramIndex}::varchar[]) `;
      countQuery += ` AND ${brandQuery}`;
      dataQuery += ` AND ${brandQuery}`;
      queryParams.push(brands);
      paramIndex++;
    }
    
    // --- Ordenar y Paginar (Solo para dataQuery) ---
    dataQuery += ` ORDER BY description ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    console.log(`[DEBUG] countQuery: ${countQuery}`);
    console.log(`[DEBUG] dataQuery: ${dataQuery}`);
    console.log(`[DEBUG] queryParams:`, queryParams);

    // --- Ejecutar Queries ---
    const countResult = await pool.query(countQuery, queryParams);
    const totalProducts = parseInt(countResult.rows[0].count, 10);
    console.log(`[DEBUG] totalProducts: ${totalProducts}`);
    
    const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset]);
    console.log(`[DEBUG] Productos obtenidos: ${dataResult.rows.length}`);
    
    // Obtener los IDs de los productos para consultar su estado de oferta en DB2
    const productIds = dataResult.rows.map(prod => prod.id);
    let offerStatusMap = new Map();
    if (productIds.length > 0) {
      const offerStatusResult = await pool2.query(
        'SELECT product_id, is_on_offer FROM product_offer_status WHERE product_id = ANY($1::int[])',
        [productIds]
      );
      offerStatusResult.rows.forEach(row => {
        offerStatusMap.set(row.product_id, row.is_on_offer);
      });
    }

    const products = dataResult.rows.map(prod => {
      let originalPrice = prod.price; // El precio base del producto
      let finalPrice = prod.price;

      // (MODIFICADO) Aplicar cotización según el tipo de moneda
      if (prod.moneda === 2) { // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) { // Dólar Divisa
        finalPrice = originalPrice * ventaDivisa;
      }

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formatCurrency(finalPrice),
        brand: prod.brand,
        imageUrl: null,
        capacityDesc: prod.capacity_description,
        capacityValue: null,
        moneda: prod.moneda,
        // (MODIFICADO) La cotización ahora refleja la que se usó
        cotizacion: prod.moneda === 2 ? ventaBillete : (prod.moneda === 3 ? ventaDivisa : 1),
        originalPrice: originalPrice,
        product_group: prod.product_group, // (NUEVO) Devolver el grupo del producto
        oferta: offerStatusMap.get(prod.id) || false // Obtener el estado de oferta de DB2
      };
    });
    
    return {
      products,
      totalProducts
    };
    
  } catch (error) {
    console.error('[DEBUG] Error en fetchProtheusProducts:', error);
    throw error;
  }
};

/**
 * (NUEVO) Obtiene el detalle de un solo producto
 */
const fetchProductDetails = async (productId, userId = null) => {
  try {
    // (CORREGIDO) Nombres de columnas actualizados según script.sql
    // (MODIFICADO) Se añade product_group a la selección
    let query = `
      SELECT 
        id, code, description, price, brand, 
        capacity_description, product_group
      FROM products
      WHERE id = $1 AND price > 0 AND description IS NOT NULL
    `;
    let queryParams = [productId];
    let paramIndex = 2; // Inicializar paramIndex

    if (userId) {
      const deniedGroups = await getDeniedProductGroups(userId);
      
      if (deniedGroups.length > 0) {
        const groupQuery = ` AND product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
        query += groupQuery;
        queryParams.push(deniedGroups);
        paramIndex++;
      } else {
        // Si no hay grupos denegados, el usuario puede ver el producto.
        // No se añade ninguna cláusula WHERE para grupos de productos.
      }
    }
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return null; // Producto no encontrado
    }
    
    // (CORREGIDO) Mapeo actualizado
    const prod = result.rows[0];
    const productDetails = {
      id: prod.id,
      code: prod.code,
      name: prod.description, // Mapea 'description' de la BD a 'name' para el frontend
      price: prod.price,
      formattedPrice: formatCurrency(prod.price),
      brand: prod.brand,
      imageUrl: null, 
      capacityDesc: prod.capacity_description, // Mapea 'capacity_description'
      capacityValue: null, 
      additionalInfo: {},
      product_group: prod.product_group // (NUEVO) Devolver el grupo del producto
    };
    
    return productDetails;

  } catch (error) {
    console.error(`Error en fetchProductDetails para ID ${productId}:`, error);
    throw error;
  }
};


/**
 * Obtiene la lista de marcas únicas
 */
const fetchProtheusBrands = async (userId = null) => {
  try {
    let query = `
      SELECT DISTINCT brand 
      FROM products 
      WHERE brand IS NOT NULL AND brand != ''
    `;
    let queryParams = [];
    let paramIndex = 1;

    if (userId) {
      const deniedGroups = await getDeniedProductGroups(userId);
      if (deniedGroups.length > 0) {
        query += ` AND product_group NOT IN (SELECT unnest($${paramIndex}::varchar[]))`;
        queryParams.push(deniedGroups);
        paramIndex++;
      }
    }

    query += ` ORDER BY brand ASC;`;
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(row => row.brand);
    
  } catch (error) {
    console.error('Error en fetchProtheusBrands:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de ofertas (ej. productos con descuento)
 */
const fetchProtheusOffers = async (userId = null) => {
  try {
    // 1. Obtener los IDs de los productos en oferta desde DB2
    const offerProductIdsResult = await pool2.query(
      'SELECT product_id FROM product_offer_status WHERE is_on_offer = true'
    );
    const offerProductIds = offerProductIdsResult.rows.map(row => row.product_id);

    if (offerProductIds.length === 0) {
      return []; // No hay productos en oferta
    }

    // 2. Obtener los detalles de esos productos desde DB1
    let query = `
      SELECT
        id, code, description, price, brand,
        capacity_description, moneda, cotizacion, product_group
      FROM products
      WHERE id = ANY($1::int[]) AND price > 0 AND description IS NOT NULL
    `;
    let queryParams = [offerProductIds];
    let paramIndex = 2;

    // Lógica de permisos por grupo de productos
    if (userId) {
      const deniedGroups = await getDeniedProductGroups(userId);

      if (deniedGroups.length > 0) {
        const groupQuery = ` product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
        query += ` AND ${groupQuery}`;
        queryParams.push(deniedGroups);
        paramIndex++;
      }
    }

    query += ` ORDER BY description ASC;`;

    const result = await pool.query(query, queryParams);

    // Reutilizar la lógica de formateo de precios de fetchProtheusProducts
    const exchangeRates = await getExchangeRates();
    const ventaBillete = exchangeRates.venta_billete;
    const ventaDivisa = exchangeRates.venta_divisa;

    const offers = result.rows.map(prod => {
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      if (prod.moneda === 2) { // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) { // Dólar Divisa
        finalPrice = originalPrice * ventaDivisa;
      }

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formatCurrency(finalPrice),
        brand: prod.brand,
        imageUrl: null,
        capacityDesc: prod.capacity_description,
        moneda: prod.moneda,
        cotizacion: prod.moneda === 2 ? ventaBillete : (prod.moneda === 3 ? ventaDivisa : 1),
        originalPrice: originalPrice,
        product_group: prod.product_group,
        oferta: true // Siempre true para ofertas
      };
    });

    return offers;

  } catch (error) {
    console.error('Error en fetchProtheusOffers:', error);
    throw error;
  }
};

// =================================================================
// --- Consultas y Carga de Archivos ---
// =================================================================

/**
 * Guarda una nueva consulta de un usuario
 */
const saveProtheusQuery = async (queryData, userId) => {
  const { subject, message } = queryData;
  
  try {
    // Adaptado a script.sql: Se quita la dependencia de 'a1_cod'.
    const query = `
      INSERT INTO queries (user_id, subject, message, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [userId, subject, message, 'Recibida']; // 'Recibida' es el default en el script
    
    const result = await pool.query(query, values);
    
    console.log(`Consulta guardada para usuario ${userId}`);
    
    // (PENDIENTE) Aquí se podría enviar un email de notificación al administrador
    
    return { success: true, message: 'Consulta enviada con éxito.', query: result.rows[0] };
    
  } catch (error) {
    console.error('Error en saveProtheusQuery:', error);
    throw error;
  }
};


/**
 * Guarda la información de un comprobante subido
 */
const saveProtheusVoucher = async (fileInfo, userId) => {
  // Extraemos los datos de fileInfo que SÍ existen en la BD
  const { originalName, path, mimeType, size } = fileInfo;
  
  try {
    // (CORREGIDO) Inserta en la tabla 'vouchers' (no 'protheus_vouchers')
    // (CORREGIDO) Se eliminaron las columnas 'filename', 'status', 'a1_cod' que NO existen en la tabla.
    // (CORREGIDO) Se cambió 'size' por 'file_size' para que coincida con la BD.
    const query = `
      INSERT INTO vouchers 
        (user_id, original_name, file_path, mime_type, file_size)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [userId, originalName, path, mimeType, size];
    
    const result = await pool.query(query, values);
    
    console.log(`Comprobante subido por usuario ${userId}: ${originalName}`);
    
    // (PENDIENTE) Aquí se podría enviar un email de notificación al administrador
    
    return result.rows[0]; // Devuelve la info guardada en la BD
    
  } catch (error) {
    console.error('Error en saveProtheusVoucher:', error);
    throw error;
  }
};

// =================================================================
// --- (NUEVO) Dashboard Panels ---
// =================================================================

/**
 * Obtiene los paneles del dashboard visibles para todos los usuarios
 */
const getDashboardPanels = async (userId) => {
  try {
    let isAdmin = false;
    if (userId) {
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0) {
        isAdmin = userResult.rows[0].is_admin;
      }
    }

    let query = 'SELECT * FROM dashboard_panels';
    if (!isAdmin) {
      query += ' WHERE is_visible = true';
    }
    query += ' ORDER BY id';

    const result = await pool2.query(query);
    let panels = result.rows;

    // Comprobar si el panel de ofertas debe mostrarse
    const offersPanelIndex = panels.findIndex(panel => panel.navigation_path === 'offers');

    if (offersPanelIndex > -1) {
      const offers = await fetchProtheusOffers(userId); // <--- Pass userId here
      if (offers.length === 0) {
        // Si no hay ofertas, filtramos el panel de la lista
        panels = panels.filter(panel => panel.navigation_path !== 'offers');
      }
    }

    return panels;
  } catch (error) {
    console.error('Error en getDashboardPanels:', error);
    throw error;
  }
};

/**
 * (Admin) Obtiene todos los paneles del dashboard
 */
const getAdminDashboardPanels = async () => {
  try {
    const result = await pool2.query('SELECT * FROM dashboard_panels ORDER BY id');
    return result.rows;
  } catch (error) {
    console.error('Error en getAdminDashboardPanels:', error);
    throw error;
  }
};

/**
 * (Admin) Actualiza la visibilidad de un panel del dashboard
 */
const updateDashboardPanel = async (panelId, isVisible) => {
  try {
    const query = `
      UPDATE dashboard_panels
      SET is_visible = $1
      WHERE id = $2
      RETURNING *;
    `;
    const values = [isVisible, panelId];
    const result = await pool2.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Panel no encontrado al actualizar.');
    }
    
    console.log(`Visibilidad del panel ${panelId} actualizada a ${isVisible}`);
    return { success: true, message: 'Visibilidad del panel actualizada.', panel: result.rows[0] };
  } catch (error) {
    console.error('Error en updateDashboardPanel:', error);
    throw error;
  }
};

/**
 * (Admin) Cambia el estado de 'oferta' de un producto.
 */
const toggleProductOfferStatus = async (productId) => {
  try {
    // 1. Verificar si el producto existe en DB1 (solo lectura)
    const productResult = await pool.query('SELECT id, description, code, price FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) {
      throw new Error('Producto no encontrado en la base de datos principal.');
    }
    const productDetails = productResult.rows[0];

    // 2. Intentar obtener el estado de oferta del producto desde DB2
    const existingOffer = await pool2.query('SELECT is_on_offer FROM product_offer_status WHERE product_id = $1', [productId]);

    let newOfferStatus;
    if (existingOffer.rows.length > 0) {
      // Si existe, alternar el estado
      newOfferStatus = !existingOffer.rows[0].is_on_offer;
      await pool2.query(
        'UPDATE product_offer_status SET is_on_offer = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
        [newOfferStatus, productId]
      );
    } else {
      // Si no existe, insertar un nuevo registro con is_on_offer = true
      newOfferStatus = true;
      await pool2.query(
        'INSERT INTO product_offer_status (product_id, is_on_offer) VALUES ($1, $2)',
        [productId, newOfferStatus]
      );
    }

    console.log(`Estado de oferta para producto ${productId} cambiado a ${newOfferStatus} en DB2.`);

    // Devolver la información del producto combinada con el nuevo estado de oferta
    return {
      id: productDetails.id,
      description: productDetails.description,
      code: productDetails.code,
      price: productDetails.price,
      oferta: newOfferStatus, // Usamos 'oferta' para compatibilidad con el frontend
    };

  } catch (error) {
    console.error(`Error en toggleProductOfferStatus para producto ${productId}:`, error);
    throw error;
  }
};
/**
 * (Admin) Obtiene la lista de clientes (no-admins)
 */
const getUsersForAdmin = async () => {
  try {
    const query = `
      SELECT id, full_name, email, a1_cod 
      FROM users 
      WHERE is_admin = false 
      ORDER BY full_name ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error in getUsersForAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Obtiene la lista de grupos de productos únicos
 */
const getProductGroupsForAdmin = async () => {
  try {
    const query = `
      SELECT DISTINCT product_group, brand 
      FROM products 
      WHERE product_group IS NOT NULL AND product_group != '' AND brand IS NOT NULL AND brand != ''
      ORDER BY product_group ASC;
    `;
    const result = await pool.query(query);
    // Return an array of objects { product_group, brand }
    return result.rows;
  } catch (error) {
    console.error('Error in getProductGroupsForAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Obtiene los permisos de grupo para un usuario específico
 */
const getDeniedProductGroups = async (userId) => {
  try {
    const query = `
      SELECT product_group 
      FROM user_product_group_permissions 
      WHERE user_id = $1;
    `;
    const result = await pool2.query(query, [userId]);
    const deniedGroups = result.rows.map(row => row.product_group);
    return deniedGroups;
  } catch (error) {
    console.error(`Error in getDeniedProductGroups for user ${userId}:`, error);
    throw error;
  }
};

/**
 * (Admin) Actualiza los permisos de grupo para un usuario específico
 */
const updateUserGroupPermissions = async (userId, groups) => {
  const client = await pool2.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete old permissions
    await client.query('DELETE FROM user_product_group_permissions WHERE user_id = $1', [userId]);

    // 2. Insert new permissions if any
    if (groups && groups.length > 0) {
      const insertQuery = 'INSERT INTO user_product_group_permissions (user_id, product_group) VALUES ($1, $2)';
      for (const group of groups) {
        await client.query(insertQuery, [userId, group]);
      }
    }

    await client.query('COMMIT');
    console.log(`Denied product group permissions updated for user ${userId}`);
    return { success: true, message: 'Permisos actualizados correctamente.' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error in updateUserGroupPermissions for user ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * (NUEVO) Obtiene la lista de productos accesorios
 */
const getAccessories = async (userId) => {
  try {
    let accessoryGroups = ['0102', '0103', '0114', '0120', '0121', '0125', '0128', '0136', '0140', '0143', '0144', '0148', '0149', '0166', '0177', '0186', '0187'];

    if (userId) {
      const deniedGroups = await getDeniedProductGroups(userId);
      if (deniedGroups.length > 0) {
        accessoryGroups = accessoryGroups.filter(group => !deniedGroups.includes(group));
      }
    }

    if (accessoryGroups.length === 0) {
      return []; // No hay grupos de accesorios para mostrar
    }

    const query = `
      SELECT id, code, description, price, product_group
      FROM products 
      WHERE product_group = ANY($1) AND price > 0 AND description IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 20;
    `;
    const result = await pool.query(query, [accessoryGroups]);
    
    const accessories = result.rows.map(prod => ({
      id: prod.id,
      code: prod.code,
      name: prod.description,
      price: prod.price,
      formattedPrice: formatCurrency(prod.price),
      image_url: `https://via.placeholder.com/150/2D3748/FFFFFF?text=${encodeURIComponent(prod.description.split(' ')[0])}`,
      group_code: prod.product_group,
    }));
    
    return accessories;
    
  } catch (error) {
    console.error('Error en getAccessories:', error);
    throw error;
  }
};

/**
 * (NUEVO) Obtiene detalles de una lista de grupos de productos,
 * incluyendo una imagen aleatoria de un producto de cada grupo.
 */
const getProductGroupsDetails = async (userId) => {
  let groupCodes = ['0102', '0103', '0114', '0120', '0121', '0125', '0128', '0136', '0140', '0143', '0144', '0148', '0149', '0166', '0177', '0186', '0187'];
  
  try {
    if (userId) {
      const deniedGroups = await getDeniedProductGroups(userId);
      if (deniedGroups.length > 0) {
        groupCodes = groupCodes.filter(code => !deniedGroups.includes(code));
      }
    }

    if (groupCodes.length === 0) {
      return [];
    }

    const groupDetails = [];

    for (const code of groupCodes) {
      const productQuery = `
        SELECT brand, description
        FROM products
        WHERE product_group = $1 AND brand IS NOT NULL AND brand != ''
        LIMIT 1;
      `;
      const productResult = await pool.query(productQuery, [code]);
      
      let imageUrl = `https://via.placeholder.com/150/2D3748/FFFFFF?text=${encodeURIComponent(code)}`;
      let name = `Grupo ${code}`;

      if (productResult.rows.length > 0) {
        const product = productResult.rows[0];
        name = product.brand; 
        const imageName = product.description || name;
        imageUrl = `https://via.placeholder.com/150/2D3748/FFFFFF?text=${encodeURIComponent(imageName.split(' ')[0])}`;
      }
      
      groupDetails.push({
        group_code: code,
        name: name, 
        image_url: imageUrl,
      });
    }
    
    return groupDetails;
    
  } catch (error) {
    console.error('Error en getProductGroupsDetails:', error);
    throw error;
  }
};

/**
 * (NUEVO) Obtiene la lista de productos para un grupo específico (paginada)
 */
const fetchProductsByGroup = async (groupCode, page = 1, limit = 20, userId = null) => {
  console.log(`[DEBUG] fetchProductsByGroup llamado con: groupCode=${groupCode}, page=${page}, limit=${limit}, userId=${userId}`);
  try {
    const exchangeRates = await getExchangeRates();
    const ventaBillete = exchangeRates.venta_billete;
    const ventaDivisa = exchangeRates.venta_divisa;

    const offset = (page - 1) * limit;
    let queryParams = [groupCode];
    let paramIndex = 2;

    // --- Query para Contar Total ---
    let countQuery = 'SELECT COUNT(*) FROM products WHERE product_group = $1 AND price > 0 AND description IS NOT NULL';
    
    // --- Query para Obtener Productos ---
    let dataQuery = `
      SELECT 
        id, code, description, price, brand, 
        capacity_description, moneda, cotizacion, product_group
      FROM products
      WHERE product_group = $1 AND price > 0 AND description IS NOT NULL
    `;

    // Lógica de permisos por grupo de productos
    if (userId) {
      const deniedGroups = await getDeniedProductGroups(userId);
      if (deniedGroups.includes(groupCode)) {
        // Si el grupo actual está denegado para el usuario, no devolvemos nada.
        console.log(`[DEBUG] Acceso denegado al grupo ${groupCode} para el usuario ${userId}.`);
        return { products: [], totalProducts: 0, groupName: '' };
      }
    }
    
    // --- Ordenar y Paginar ---
    dataQuery += ` ORDER BY description ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    // --- Ejecutar Queries ---
    const countResult = await pool.query(countQuery, [groupCode]);
    const totalProducts = parseInt(countResult.rows[0].count, 10);
    
    const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset]);
    
    let groupName = '';
    if (dataResult.rows.length > 0) {
      groupName = dataResult.rows[0].brand; // El nombre del grupo es la marca
    } else {
      // Si no hay productos, intentamos obtener el nombre del grupo de todas formas
      const groupNameResult = await pool.query('SELECT brand FROM products WHERE product_group = $1 AND brand IS NOT NULL LIMIT 1', [groupCode]);
      if (groupNameResult.rows.length > 0) {
        groupName = groupNameResult.rows[0].brand;
      }
    }

    const products = dataResult.rows.map(prod => {
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      if (prod.moneda === 2) { // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) { // Dólar Divisa
        finalPrice = originalPrice * ventaDivisa;
      }

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formatCurrency(finalPrice),
        brand: prod.brand,
        imageUrl: null,
        capacityDesc: prod.capacity_description,
      };
    });
    
    return {
      products,
      totalProducts,
      groupName,
    };
    
  } catch (error) {
    console.error('[DEBUG] Error en fetchProductsByGroup:', error);
    throw error;
  }
};

// =================================================================
// --- (NUEVO) Gestión de Administradores ---
// =================================================================

/**
 * (Admin) Obtiene la lista de todos los administradores.
 */
const getAdmins = async () => {
  try {
    const adminIdsResult = await pool2.query('SELECT user_id FROM admins ORDER BY created_at DESC');
    if (adminIdsResult.rows.length === 0) {
      return [];
    }
    const adminIds = adminIdsResult.rows.map(row => row.user_id);
    // Busca la información de los usuarios en la DB1
    const usersResult = await pool.query('SELECT id, full_name, email FROM users WHERE id = ANY($1::int[])', [adminIds]);
    return usersResult.rows;
  } catch (error) {
    console.error('Error en getAdmins:', error);
    throw error;
  }
};

/**
 * (Admin) Añade un nuevo administrador.
 */
const addAdmin = async (userId) => {
  try {
    // 1. Verificar que el usuario existe en la DB1
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('El usuario no existe en la base de datos principal.');
    }
    // 2. Insertar en la tabla admins en DB2. ON CONFLICT evita duplicados.
    await pool2.query('INSERT INTO admins (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    return { success: true, message: 'Usuario añadido como administrador.' };
  } catch (error) {
    console.error('Error en addAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Elimina a un administrador.
 */
const removeAdmin = async (userId) => {
  try {
    const result = await pool2.query('DELETE FROM admins WHERE user_id = $1', [userId]);
    if (result.rowCount === 0) {
      // Esto puede pasar si el usuario ya no era admin, no es necesariamente un error.
      return { success: false, message: 'El usuario no era administrador.' };
    }
    return { success: true, message: 'Administrador eliminado correctamente.' };
  } catch (error) {
    console.error('Error en removeAdmin:', error);
    throw error;
  }
};


// Exportar todos los controladores
module.exports = {
  authenticateProtheusUser,
  registerProtheusUser,
  getProfile,
  updateProfile,
  fetchProtheusBalance,
  fetchProtheusMovements,
  createCreditNote,
  fetchCustomerInvoices,
  fetchAdminOrderDetails,
  fetchProtheusOrders,
  fetchProtheusOrderDetails,
  saveProtheusOrder,
  fetchProtheusProducts,
  fetchProductDetails,
  fetchProtheusBrands,
  fetchProtheusOffers,
  saveProtheusQuery,
  saveProtheusVoucher,
  getExchangeRatesController,
  getDashboardPanels,
  getAdminDashboardPanels,
  updateDashboardPanel,
  toggleProductOfferStatus,
  getUsersForAdmin,
  getProductGroupsForAdmin,
  getDeniedProductGroups, // Renamed export
  updateUserGroupPermissions,
  getAccessories,
  getProductGroupsDetails,
  fetchProductsByGroup,
  getAdmins,
  addAdmin,
  removeAdmin,
};