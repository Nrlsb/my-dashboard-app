/*
* =================================================================
* CONTROLADORES (Lógica de Negocio)
* =================================================================
*
* Conecta la lógica de la API (rutas) con la base de datos (db).
*
* =================================================================
*/

const pool = require('./db'); // Importar el pool de conexiones
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
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('Usuario no encontrado.');
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }
    
    const user = result.rows[0];
    
    // (NUEVO) Comparamos la contraseña hasheada
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      console.log('Contraseña incorrecta.');
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }

    // Si la contraseña es correcta, devolvemos el usuario (sin el hash)
    console.log(`Usuario ${user.id} autenticado.`);
    const { password_hash, ...userWithoutPassword } = user;
    
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
    // 1. Obtener datos del pedido
    // (CORREGIDO) Se cambió 'u.nombre' por 'u.full_name'
    const orderQuery = `
      SELECT p.*, 
             u.full_name as user_nombre, 
             u.email as user_email,
             TO_CHAR(p.created_at, 'DD/MM/YYYY HH24:MI') as formatted_date
      FROM orders p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1;
    `;
    const orderResult = await pool.query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      return null; // Pedido no encontrado
    }
    
    // 2. Obtener items del pedido
    // ========================================================
    // --- INICIO DE LA CORRECCIÓN (ADMIN) ---
    // ========================================================
    // Se hace JOIN con 'products' para obtener la descripción/nombre real
    const itemsQuery = `
      SELECT 
        oi.*, 
        p.description as product_name_from_products
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1;
    `;
    const itemsResult = await pool.query(itemsQuery, [orderId]);
    
    // 3. Combinar y formatear
    const orderDetails = {
      ...orderResult.rows[0],
      items: itemsResult.rows.map(item => ({
        ...item,
        // Usamos la descripción de la tabla 'products' como fuente principal
        product_name: item.product_name_from_products,
        formattedPrice: formatCurrency(item.unit_price)
      })),
      formattedTotal: formatCurrency(orderResult.rows[0].total)
    };
    // ========================================================
    // --- FIN DE LA CORRECCIÓN (ADMIN) ---
    // ========================================================
    
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
    const result = await pool.query(query, [userId]);
    
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
    // 1. Obtener datos del pedido (y verificar que pertenece al usuario)
    const orderQuery = `
      SELECT *, 
             TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted_date
      FROM orders
      WHERE id = $1 AND user_id = $2;
    `;
    const orderResult = await pool.query(orderQuery, [orderId, userId]);
    
    if (orderResult.rows.length === 0) {
      return null; // Pedido no encontrado o no pertenece al usuario
    }
    
    // ========================================================
    // --- INICIO DE LA CORRECCIÓN ---
    // ========================================================
    // 2. Obtener items del pedido (CORREGIDO: Se hace JOIN con 'products')
    // Esto asegura que SIEMPRE tengamos la descripción,
    // incluso si falló al guardarse en 'order_items.product_name'
    const itemsQuery = `
      SELECT 
        oi.*, 
        p.description as product_name_from_products
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1;
    `;
    const itemsResult = await pool.query(itemsQuery, [orderId]);
    
    // 3. Combinar y formatear
    const orderDetails = {
      ...orderResult.rows[0],
      items: itemsResult.rows.map(item => ({
        ...item,
        product_name: item.product_name_from_products,
        formattedPrice: formatCurrency(item.unit_price)
      })),
      formattedTotal: formatCurrency(orderResult.rows[0].total)
    };
    // ========================================================
    // --- FIN DE LA CORRECCIÓN ---
    // ========================================================
    
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

  // (MODIFICADO) Conectamos un cliente para la transacción
  const client = await pool.connect();
  
  try {
    // Iniciar Transacción
    await client.query('BEGIN');
    
    // 1. Insertar el pedido principal (orders)
    // Adaptado a script.sql: Se quitan 'payment_method' y 'a1_cod'.
    const orderInsertQuery = `
      INSERT INTO orders (user_id, total, status)
      VALUES ($1, $2, $3)
      RETURNING id, created_at;
    `;
    const orderValues = [userId, total, 'Pendiente'];
    
    const orderResult = await client.query(orderInsertQuery, orderValues);
    const newOrder = orderResult.rows[0];
    const newOrderId = newOrder.id;

    // 2. Insertar los items del pedido (order_items)
    // Adaptado a script.sql: Se quita 'product_name'.
    const itemInsertQuery = `
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, product_code)
      VALUES ($1, $2, $3, $4, $5);
    `;
    
    // (MODIFICADO) Usamos un bucle 'for...of' para 'await' dentro
    for (const item of items) {
      const itemValues = [
        newOrderId,
        item.id,       // 'id' del producto
        item.quantity,
        item.price,    // 'price' del producto
        item.code      // 'code' del producto
      ];
      await client.query(itemInsertQuery, itemValues);
    }
    
    // 3. Si paga con 'Cuenta Corriente', registrar el débito
    // Adaptado a la tabla 'account_movements'.
    if (paymentMethod === 'Cuenta Corriente') {
      const updateBalanceQuery = `
        INSERT INTO account_movements (user_id, debit, description, order_ref, date)
        VALUES ($1, $2, $3, $4, CURRENT_DATE);
      `;
      // Insertamos un movimiento de 'débito' (positivo en su columna) por el total del pedido.
      await client.query(updateBalanceQuery, [userId, total, `Débito por Pedido #${newOrderId}`, newOrderId]);
    }

    // Terminar Transacción
    await client.query('COMMIT');
    
    // --- 4. Enviar correos y generar archivos después de confirmar la transacción ---
    try {
      // Primero, enriquecemos los items con sus descripciones desde la BD
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

    } catch (emailError) {
      // Si falla el email, NO detenemos la operación. Solo lo logueamos.
      // El pedido ya se guardó y la transacción se completó.
      console.error(`[Pedido #${newOrderId}] El pedido se guardó, pero falló el envío de correos:`, emailError);
    }
    // --- (FIN NUEVO) ---

    // Devolver éxito (el pedido se guardó)
    return { success: true, message: 'Pedido guardado con éxito.', orderId: newOrderId };

  } catch (error) {
    // Si algo falla ANTES del COMMIT, hacer rollback
    await client.query('ROLLBACK');
    console.error('Error en la transacción de guardado de pedido:', error);
    throw error; // Lanza el error para que la ruta lo maneje
  } finally {
    client.release(); // (NUEVO) Liberar el cliente de vuelta al pool
  }
};

// =================================================================
// --- Productos y Ofertas (Products Table) ---
// =================================================================

/**
 * Obtiene la lista de productos (paginada y con búsqueda)
 */
const fetchProtheusProducts = async (page = 1, limit = 20, search = '', brand = '', moneda = '1', userId = null) => {
  console.log(`[DEBUG] fetchProtheusProducts llamado con: page=${page}, limit=${limit}, search='${search}', brand='${brand}', moneda='${moneda}', userId=${userId}`);
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
      FROM products
      WHERE price > 0 AND description IS NOT NULL
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
      const brandQuery = ` brand = $${paramIndex} `;
      countQuery += ` AND ${brandQuery}`;
      dataQuery += ` AND ${brandQuery}`;
      queryParams.push(brand);
      paramIndex++;
    }

    if (moneda && moneda !== '0') { // Asumimos que '0' o '' significa todas las monedas
      const monedaQuery = ` moneda = $${paramIndex} `;
      countQuery += ` AND ${monedaQuery}`;
      dataQuery += ` AND ${monedaQuery}`;
      queryParams.push(moneda);
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
        product_group: prod.product_group // (NUEVO) Devolver el grupo del producto
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
            if (userId) {      const deniedGroups = await getDeniedProductGroups(userId);
      
      if (deniedGroups.length > 0) {
        const groupQuery = ` product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
        query += ` AND ${groupQuery}`;
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
const fetchProtheusBrands = async () => {
  try {
    // (CORREGIDO) Apunta a 'brand' en 'products'
    const query = `
      SELECT DISTINCT brand 
      FROM products 
      WHERE brand IS NOT NULL AND brand != ''
      ORDER BY brand ASC;
    `;
    const result = await pool.query(query);
    
    // (CORREGIDO) Mapea 'brand'
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
    // (NUEVO) Ahora busca productos donde 'oferta' es true.
    // (MODIFICADO) Se añade product_group a la selección
    let query = `
      SELECT 
        id, code, description, price, brand, 
        capacity_description, moneda, cotizacion, product_group
      FROM products 
      WHERE oferta = true AND price > 0 AND description IS NOT NULL
    `;
    let queryParams = [];
    let paramIndex = 1;

    // (NUEVO) Lógica de permisos por grupo de productos
    let isUserAdmin = false;
    if (userId) {
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0) {
        isUserAdmin = userResult.rows[0].is_admin;
      }
    }

    if (userId) {
      const deniedGroups = await getDeniedProductGroups(userId);
      
      if (deniedGroups.length > 0) {
        const groupQuery = ` product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
        query += ` AND ${groupQuery}`;
        queryParams.push(deniedGroups);
        paramIndex++;
      } else {
        // Si no hay grupos denegados, el usuario puede ver todas las ofertas.
        // No se añade ninguna cláusula WHERE para grupos de productos.
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
        product_group: prod.product_group // (NUEVO) Devolver el grupo del producto
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
    const result = await pool.query('SELECT * FROM dashboard_panels WHERE is_visible = true ORDER BY id');
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
    const result = await pool.query('SELECT * FROM dashboard_panels ORDER BY id');
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
    const result = await pool.query(query, values);
    
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
    const query = `
      UPDATE products 
      SET oferta = NOT oferta 
      WHERE id = $1 
      RETURNING id, description, code, price, oferta;
    `;
    const result = await pool.query(query, [productId]);
    
    if (result.rows.length === 0) {
      throw new Error('Producto no encontrado.');
    }
    
    const updatedProduct = result.rows[0];
    console.log(`Estado de oferta para producto ${productId} cambiado a ${updatedProduct.oferta}`);
    return updatedProduct;
    
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
      SELECT DISTINCT product_group 
      FROM products 
      WHERE product_group IS NOT NULL AND product_group != '' 
      ORDER BY product_group ASC;
    `;
    const result = await pool.query(query);
    // Return an array of strings, not an array of objects
    return result.rows.map(row => row.product_group);
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
    const result = await pool.query(query, [userId]);
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
  const client = await pool.connect();
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
};