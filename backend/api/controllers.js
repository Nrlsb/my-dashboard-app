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

// (NUEVO) Importar el servicio de email
const { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } = require('./emailService');


// =================================================================
// --- (NUEVO) Autenticación y Perfil (Users Table) ---
// =================================================================

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
    // (NUEVO) Buscamos el A1_COD del usuario
    const user = await getProfile(userId);
    if (!user || !user.a1_cod) {
      throw new Error('Código de cliente no encontrado para el usuario.');
    }
    
    // (MODIFICADO) Sumamos por A1_COD en lugar de user_id
    const query = `
      SELECT COALESCE(SUM(amount), 0) AS total_balance
      FROM protheus_movements
      WHERE a1_cod = $1;
    `;
    const result = await pool.query(query, [user.a1_cod]);
    
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
    // (NUEVO) Buscamos el A1_COD del usuario
    const user = await getProfile(userId);
    if (!user || !user.a1_cod) {
      throw new Error('Código de cliente no encontrado para el usuario.');
    }

    // (MODIFICADO) Buscamos por A1_COD
    const query = `
      SELECT *, 
             TO_CHAR(created_at, 'DD/MM/YYYY') as formatted_date
      FROM protheus_movements
      WHERE a1_cod = $1
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [user.a1_cod]);
    
    // Formatear los datos antes de enviarlos
    const formattedMovements = result.rows.map(mov => ({
      ...mov,
      formattedAmount: formatCurrency(mov.amount),
      formattedType: formatMovementType(mov.type) // Usar el helper
    }));
    
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
    const userResult = await pool.query('SELECT id, a1_cod FROM users WHERE a1_cod = $1', [targetUserCod]);
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

    // 3. Insertar el movimiento de "Crédito (NC)"
    // (Importante: El 'amount' para créditos es POSITIVO)
    const query = `
      INSERT INTO protheus_movements 
        (user_id, type, amount, description, a1_cod, related_invoice_id, admin_id)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const description = `NC (Admin): ${reason}. Ref Fact: ${invoiceRefId}.`;
    const values = [targetUserId, 'Crédito (NC)', totalCreditAmount, description, targetUserCod, invoiceRefId, adminUserId];
    
    const result = await pool.query(query, values);
    
    console.log(`Nota de Crédito creada por Admin ${adminUserId} para Cliente ${targetUserCod}. Monto: ${totalCreditAmount}`);
    
    return { success: true, message: 'Nota de crédito creada exitosamente.', movement: result.rows[0] };

  } catch (error) {
    console.error('Error en createCreditNote:', error);
    throw error; // Lanza el error para que la ruta lo maneje
  }
};

/**
 * (Admin) Busca facturas de un cliente (para referencia de NC)
 */
const fetchCustomerInvoices = async (customerCod) => {
  try {
    // Busca movimientos de tipo 'Factura' (que son débitos)
    const query = `
      SELECT id, created_at, amount, description, 
             TO_CHAR(created_at, 'DD/MM/YYYY') as formatted_date
      FROM protheus_movements
      WHERE a1_cod = $1 
        AND type = 'Factura'
        AND amount < 0 -- Las facturas son débitos
      ORDER BY created_at DESC;
    `;
    
    const result = await pool.query(query, [customerCod]);
    
    if (result.rows.length === 0) {
      // (NUEVO) No es un error si no tiene facturas, solo devolvemos array vacío
      console.log(`No se encontraron facturas para el código: ${customerCod}`);
      return []; 
    }
    
    // Formatear antes de devolver
    return result.rows.map(inv => ({
      ...inv,
      formattedAmount: formatCurrency(inv.amount),
      // Extraer el ID de la factura de la descripción, ej: "Factura #F12345"
      invoiceId: inv.description.split('#')[1] || inv.id 
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
    const itemsQuery = `
      SELECT * FROM order_items
      WHERE order_id = $1;
    `;
    const itemsResult = await pool.query(itemsQuery, [orderId]);
    
    // 3. Combinar y formatear
    const orderDetails = {
      ...orderResult.rows[0],
      items: itemsResult.rows.map(item => ({
        ...item,
        formattedPrice: formatCurrency(item.unit_price)
      })),
      formattedTotal: formatCurrency(orderResult.rows[0].total)
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
             (SELECT COUNT(*) FROM protheus_order_items WHERE order_id = orders.id) as item_count
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
    
    // 2. Obtener items del pedido
    const itemsQuery = `
      SELECT * FROM protheus_order_items
      WHERE order_id = $1;
    `;
    const itemsResult = await pool.query(itemsQuery, [orderId]);
    
    // 3. Combinar y formatear
    const orderDetails = {
      ...orderResult.rows[0],
      items: itemsResult.rows.map(item => ({
        ...item,
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
  
  // --- (NUEVO) 1. Obtener datos del usuario para el email y el pedido ---
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
    const orderInsertQuery = `
      INSERT INTO orders (user_id, total, status )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at;
    `;
    // (MODIFICADO) Guardamos el a1_cod del usuario en el pedido
    const orderValues = [userId, total, paymentMethod || null, 'Pendiente', user.a1_cod];
    const orderResult = await client.query(orderInsertQuery, orderValues);
    const newOrder = orderResult.rows[0];
    const newOrderId = newOrder.id;

    // 2. Insertar los items del pedido (order_items)
    const itemInsertQuery = `
      INSERT INTO protheus_order_items (order_id, product_id, quantity, unit_price, product_name, product_code)
      VALUES ($1, $2, $3, $4, $5, $6);
    `;
    
    // (MODIFICADO) Usamos un bucle 'for...of' para 'await' dentro
    for (const item of items) {
      // (NOTA) Asumimos que el frontend envía 'id', 'quantity', 'price',
      // 'name' (que mapea a 'description'), y 'code'.
      const itemValues = [
        newOrderId,
        item.id,       // 'id' del producto
        item.quantity,
        item.price,    // 'price' del producto
        item.name,     // 'name' del producto (que debe ser la 'description' de la tabla products)
        item.code      // 'code' del producto
      ];
      await client.query(itemInsertQuery, itemValues);
    }
    
    // (NUEVO) 3. Si paga con 'Cuenta Corriente', registrar el débito
    if (paymentMethod === 'Cuenta Corriente') {
      const updateBalanceQuery = `
        INSERT INTO protheus_movements (user_id, type, amount, description, a1_cod)
        VALUES ($1, $2, $3, $4, $5);
      `;
      // Insertamos un movimiento de 'débito' (negativo) por el total del pedido
      await client.query(updateBalanceQuery, [userId, 'Débito (Pedido)', -total, `Pedido #${newOrderId}`, user.a1_cod]);
    }

    // Terminar Transacción
    await client.query('COMMIT');
    
    // --- (NUEVO) 4. Enviar correos después de confirmar la transacción ---
    try {
      const sellerEmail = process.env.SELLER_EMAIL;
      const fromEmail = process.env.EMAIL_FROM;

      if (!sellerEmail || !fromEmail || !process.env.RESEND_API_KEY) {
        console.warn(`[Pedido #${newOrderId}] Faltan variables .env (RESEND_API_KEY, SELLER_EMAIL o EMAIL_FROM). No se enviarán correos.`);
      } else {
        console.log(`[Pedido #${newOrderId}] Enviando correos a ${user.email} y ${sellerEmail}...`);
        
        // Enviar al comprador
        // (CORREGIDO) Se pasa 'user.full_name' como 'customerName'
        await sendOrderConfirmationEmail(
          user.email,       // to
          fromEmail,        // from
          newOrderId,
          items,
          total,
          user.full_name
        );

        // Enviar al vendedor
        await sendNewOrderNotificationEmail(
          sellerEmail,      // to
          fromEmail,        // from
          newOrderId,
          items,
          total,
          user // Pasamos el objeto de usuario completo (full_name, email, a1_cod)
        );
        
        console.log(`[Pedido #${newOrderId}] Correos enviados con éxito.`);
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
const fetchProtheusProducts = async (page = 1, limit = 20, search = '', brand = '') => {
  try {
    const offset = (page - 1) * limit;
    let queryParams = [];
    
    // --- Query para Contar Total ---
    // (CORREGIDO) Apunta a 'products' y usa 'price' y 'description' (en lugar de 'name')
    let countQuery = 'SELECT COUNT(*) FROM products WHERE price > 0 AND description IS NOT NULL';
    
    // --- Query para Obtener Productos ---
    // (CORREGIDO) Nombres de columnas actualizados según script.sql
    let dataQuery = `
      SELECT 
        id, code, description, price, brand, 
        capacity_description
      FROM products
      WHERE price > 0 AND description IS NOT NULL
    `;
    
    // --- Aplicar Filtros ---
    let paramIndex = 1;
    
    if (search) {
      // (CORREGIDO) Buscamos en 'description' (nombre) O 'code' (código)
      const searchQuery = ` (description ILIKE $${paramIndex} OR code ILIKE $${paramIndex}) `;
      countQuery += ` AND ${searchQuery}`;
      dataQuery += ` AND ${searchQuery}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (brand) {
      // (CORREGIDO) Buscamos en 'brand'
      const brandQuery = ` brand = $${paramIndex} `;
      countQuery += ` AND ${brandQuery}`;
      dataQuery += ` AND ${brandQuery}`;
      queryParams.push(brand);
      paramIndex++;
    }
    
    // --- Ordenar y Paginar (Solo para dataQuery) ---
    // (CORREGIDO) Ordenar por 'description'
    dataQuery += ` ORDER BY description ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    // --- Ejecutar Queries ---
    const countResult = await pool.query(countQuery, queryParams);
    const totalProducts = parseInt(countResult.rows[0].count, 10);
    
    const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset]);
    
    // (CORREGIDO) Mapeo actualizado a los nuevos nombres de columna
    // El frontend recibirá 'name' pero con el valor de 'description'
    const products = dataResult.rows.map(prod => ({
      id: prod.id,
      code: prod.code,
      name: prod.description, // Mapea 'description' de la BD a 'name' para el frontend
      price: prod.price,
      formattedPrice: formatCurrency(prod.price),
      brand: prod.brand,
      imageUrl: null, 
      capacityDesc: prod.capacity_description, // Mapea 'capacity_description'
      capacityValue: null 
    }));
    
    return {
      products,
      totalProducts
    };
    
  } catch (error) {
    console.error('Error en fetchProtheusProducts:', error);
    throw error;
  }
};

/**
 * (NUEVO) Obtiene el detalle de un solo producto
 */
const fetchProductDetails = async (productId) => {
  try {
    // (CORREGIDO) Nombres de columnas actualizados según script.sql
    const query = `
      SELECT 
        id, code, description, price, brand, 
        capacity_description
      FROM products
      WHERE id = $1 AND price > 0 AND description IS NOT NULL;
    `;
    
    const result = await pool.query(query, [productId]);
    
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
      additionalInfo: {} 
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
const fetchProtheusOffers = async () => {
  try {
    // (PENDIENTE) La columna 'b1_oferta' o similar no existe en el script.sql.
    // Se debe definir una nueva lógica para determinar qué productos son "ofertas".
    // Devolviendo un array vacío por ahora.
    console.warn("fetchProtheusOffers: No hay lógica de ofertas definida.");
    return [];
    
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
    // Buscamos el A1_COD del usuario
    const user = await getProfile(userId);
    if (!user || !user.a1_cod) {
      throw new Error('Código de cliente no encontrado para el usuario.');
    }
    
    // (CORREGIDO) Inserta en la tabla 'queries' (no 'protheus_queries')
    const query = `
      INSERT INTO queries (user_id, subject, message, status, a1_cod)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [userId, subject, message, 'Abierta', user.a1_cod];
    
    const result = await pool.query(query, values);
    
    console.log(`Consulta guardada para usuario ${userId} (Cliente ${user.a1_cod})`);
    
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
};