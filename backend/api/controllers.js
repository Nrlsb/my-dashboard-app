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
const productService = require('./services/productService'); // (NUEVO) Importar el servicio de productos
const orderService = require('./services/orderService'); // (NUEVO) Importar el servicio de pedidos
const movementService = require('./services/movementService'); // (NUEVO) Importar el servicio de movimientos
const userService = require('./services/userService'); // (NUEVO) Importar el servicio de usuarios
const accountingService = require('./services/accountingService'); // (NUEVO) Importar el servicio de contabilidad
const dashboardService = require('./services/dashboardService'); // (NUEVO) Importar el servicio de dashboard
const { getDeniedProductGroups } = require('./models/productModel'); //(NUEVO) Importar funcion de productModel

// (NUEVO) Importar el servicio de email
const { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } = require('./emailService');
const { generateOrderPDF, generateOrderCSV } = require('./utils/fileGenerator');


// =================================================================
// --- (NUEVO) Autenticación y Perfil (Users Table) ---
// =================================================================

/**
 * Autentica un usuario contra la tabla 'users'
 */
const authenticateProtheusUser = async (email, password) => {
  try {
    return await userService.authenticateUser(email, password);
  } catch (error) {
    console.error('Error en authenticateProtheusUser (controller):', error);
    throw error;
  }
};

/**
 * Registra un nuevo usuario en la tabla 'users'
 */
const registerProtheusUser = async (userData) => {
  try {
    return await userService.registerUser(userData);
  } catch (error) {
    console.error('Error en registerProtheusUser (controller):', error);
    throw error;
  }
};


/**
 * Obtiene los datos del perfil de un usuario
 */
const getProfile = async (userId) => {
  try {
    return await userService.getUserProfile(userId);
  } catch (error) {
    console.error('Error en getProfile (controller):', error);
    throw error;
  }
};

/**
 * Actualiza los datos del perfil de un usuario
 */
const updateProfile = async (userId, profileData) => {
  try {
    return await userService.updateUserProfile(userId, profileData);
  } catch (error) {
    console.error('Error en updateProfile (controller):', error);
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
    return await movementService.getBalance(userId);
  } catch (error) {
    console.error('Error en fetchProtheusBalance (controller):', error);
    throw error;
  }
};


/**
 * Obtiene el historial de movimientos de un usuario
 */
const fetchProtheusMovements = async (userId) => {
  try {
    return await movementService.getMovements(userId);
  } catch (error) {
    console.error('Error en fetchProtheusMovements (controller):', error);
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
    return await accountingService.createCreditNote(targetUserCod, reason, items, invoiceRefId, adminUserId);
  } catch (error) {
    console.error('Error en createCreditNote (controller):', error);
    throw error;
  }
};

/**
 * (Admin) Busca facturas de un cliente (para referencia de NC)
 */
const fetchCustomerInvoices = async (customerCod) => {
  try {
    return await accountingService.fetchCustomerInvoices(customerCod);
  } catch (error) {
    console.error(`Error en fetchCustomerInvoices (controller) para ${customerCod}:`, error);
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
    return await orderService.fetchOrders(userId);
  } catch (error) {
    console.error('Error en fetchProtheusOrders (controller):', error);
    throw error;
  }
};

/**
 * Obtiene los detalles (incluyendo items) de un pedido específico de un usuario
 */
const fetchProtheusOrderDetails = async (orderId, userId) => {
  try {
    return await orderService.fetchOrderDetails(orderId, userId);
  } catch (error) {
    console.error(`Error en fetchProtheusOrderDetails (controller) para ID ${orderId}:`, error);
    throw error;
  }
};


/**
 * Guarda un nuevo pedido (y sus items) en la base de datos
 */
const saveProtheusOrder = async (orderData, userId) => {
  try {
    // La lógica compleja ahora está en el servicio
    const result = await orderService.createOrder(orderData, userId);
    return result;
  } catch (error) {
    // El servicio ya loguea los errores internos, aquí solo relanzamos
    console.error('Error en el controlador saveProtheusOrder:', error.message);
    throw error;
  }
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
    const result = await productService.fetchProducts({ page, limit, search, brand, userId });
    return result;
  } catch (error) {
    console.error('[DEBUG] Error en fetchProtheusProducts (controller):', error);
    throw error;
  }
};

/**
 * (NUEVO) Obtiene el detalle de un solo producto
 */
const fetchProductDetails = async (productId, userId = null) => {
  try {
    const productDetails = await productService.fetchProductDetails(productId, userId);
    return productDetails;
  } catch (error) {
    console.error(`Error en fetchProductDetails (controller) para ID ${productId}:`, error);
    throw error;
  }
};


/**
 * Obtiene la lista de marcas únicas
 */
const fetchProtheusBrands = async (userId = null) => {
  try {
    const brands = await productService.fetchProtheusBrands(userId);
    return brands;
  } catch (error) {
    console.error('Error en fetchProtheusBrands (controller):', error);
    throw error;
  }
};

/**
 * Obtiene la lista de ofertas (ej. productos con descuento)
 */
const fetchProtheusOffers = async (userId = null) => {
  try {
    return await productService.fetchProtheusOffers(userId);
  } catch (error) {
    console.error('Error en fetchProtheusOffers (controller):', error);
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
    return await dashboardService.getDashboardPanels(userId);
  } catch (error) {
    console.error('Error en getDashboardPanels (controller):', error);
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
    const accessories = await productService.getAccessories(userId);
    return accessories;
  } catch (error) {
    console.error('Error en getAccessories (controller):', error);
    throw error;
  }
};

/**
 * (NUEVO) Obtiene detalles de una lista de grupos de productos,
 * incluyendo una imagen aleatoria de un producto de cada grupo.
 */
const getProductGroupsDetails = async (userId) => {
  try {
    const groupDetails = await productService.getProductGroupsDetails(userId);
    return groupDetails;
  } catch (error) {
    console.error('Error en getProductGroupsDetails (controller):', error);
    throw error;
  }
};

/**
 * (NUEVO) Obtiene la lista de productos para un grupo específico (paginada)
 */
const fetchProductsByGroup = async (groupCode, page = 1, limit = 20, userId = null) => {
  try {
    return await productService.fetchProductsByGroup(groupCode, page, limit, userId);
  } catch (error) {
    console.error('[DEBUG] Error en fetchProductsByGroup (controller):', error);
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

/**
 * (NUEVO) Genera y devuelve un buffer de PDF para un pedido específico.
 */
const downloadOrderPDF = async (orderId, userId) => {
  try {
    // 1. Obtener datos del usuario de la BD1
    const userQuery = 'SELECT full_name, a1_cod FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    if (userResult.rows.length === 0) {
      // No debería pasar si el token es válido, pero es una buena validación
      throw new Error(`Usuario con ID ${userId} no encontrado.`);
    }
    const user = userResult.rows[0];

    // 2. Obtener datos del pedido de la BD2, asegurando que pertenece al usuario
    const orderQuery = `SELECT * FROM orders WHERE id = $1 AND user_id = $2;`;
    const orderResult = await pool2.query(orderQuery, [orderId, userId]);
    if (orderResult.rows.length === 0) {
      return null; // Pedido no encontrado o no pertenece al usuario
    }
    const order = orderResult.rows[0];

    // 3. Obtener items del pedido de la BD2
    const itemsQuery = `SELECT * FROM order_items WHERE order_id = $1;`;
    const itemsResult = await pool2.query(itemsQuery, [orderId]);
    const items = itemsResult.rows;

    // 4. Enriquecer los items con los nombres de los productos de la BD1
    if (items.length > 0) {
      const productIds = items.map(item => item.product_id);
      const productsQuery = `SELECT id, description FROM products WHERE id = ANY($1::int[]);`;
      const productsResult = await pool.query(productsQuery, [productIds]);
      const productMap = new Map(productsResult.rows.map(p => [p.id, p.description]));
      
      items.forEach(item => {
        item.name = productMap.get(item.product_id) || 'Descripción no disponible';
        // La función para generar el PDF espera 'price', no 'unit_price'
        item.price = item.unit_price;
        // La función para generar el PDF espera 'code', no 'product_code'
        item.code = item.product_code;
      });
    }

    // 5. Ensamblar los datos para el generador de PDF
    const orderDataForPDF = {
      user: user,
      newOrder: { // El generador de PDF espera un objeto llamado 'newOrder'
        id: order.id,
        created_at: order.created_at,
      },
      items: items,
      total: order.total,
    };

    // 6. Generar el PDF
    const pdfBuffer = await generateOrderPDF(orderDataForPDF);
    return pdfBuffer;

  } catch (error) {
    console.error(`Error en downloadOrderPDF para Pedido ID ${orderId} y Usuario ${userId}:`, error);
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
  getDashboardPanels,
  getAdminDashboardPanels,
  updateDashboardPanel,
  toggleProductOfferStatus,
  getUsersForAdmin,
  getProductGroupsForAdmin,
  updateUserGroupPermissions,
  getAccessories,
  getProductGroupsDetails,
  fetchProductsByGroup,
  getAdmins,
  addAdmin,
  removeAdmin,
  downloadOrderPDF,
  getDeniedProductGroups,
};