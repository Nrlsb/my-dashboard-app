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
const adminService = require('./services/adminService'); // (NUEVO) Importar el servicio de administración
const supportService = require('./services/supportService'); // (NUEVO) Importar el servicio de soporte
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

/**
 * (NUEVO) Obtiene los clientes asignados a un vendedor logueado.
 */
const getVendedorClientsController = async (req, res) => {
  try {
    // El middleware de autenticación debería haber puesto `user` en `req`.
    // Asumimos que el objeto `user` para un vendedor tiene su `codigo`.
    const { user } = req;

    if (!user || user.role !== 'vendedor' || !user.codigo) {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de vendedor.' });
    }

    const clients = await userService.getVendedorClients(user.codigo);
    res.json(clients);
  } catch (error) {
    console.error('Error en getVendedorClientsController:', error);
    res.status(500).json({ message: 'Error interno al obtener los clientes.' });
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




// =================================================================
// --- Pedidos (Orders Tables) ---
// =================================================================

/**
 * Obtiene el historial de pedidos de un usuario
 */
const fetchProtheusOrders = async (user) => { // Cambiar userId a user
  try {
    return await orderService.fetchOrders(user); // Pasar user completo
  } catch (error) {
    console.error('Error en fetchProtheusOrders (controller):', error);
    throw error;
  }
};

/**
 * Obtiene los detalles (incluyendo items) de un pedido específico de un usuario
 */
const fetchProtheusOrderDetails = async (orderId, user) => {
  try {
    return await orderService.fetchOrderDetails(orderId, user);
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

/**
 * Actualiza los detalles de múltiples pedidos (número de pedido de venta del vendedor y estado de confirmación).
 */
const updateOrderDetailsController = async (req, res) => {
  try {
    const { updatedOrders } = req.body;
    await orderService.updateOrderDetails(updatedOrders);
    res.status(200).json({ message: 'Pedidos actualizados exitosamente.' });
  } catch (error) {
    console.error('Error en updateOrderDetailsController:', error);
    res.status(500).json({ message: 'Error interno al actualizar pedidos.' });
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
  try {
    return await supportService.saveProtheusQuery(queryData, userId);
  } catch (error) {
    console.error('Error en saveProtheusQuery (controller):', error);
    throw error;
  }
};

/**
 * Guarda la información de un comprobante subido
 */
const saveProtheusVoucher = async (fileInfo, userId) => {
  try {
    return await supportService.saveProtheusVoucher(fileInfo, userId);
  } catch (error) {
    console.error('Error en saveProtheusVoucher (controller):', error);
    throw error;
  }
};

// =================================================================
// --- (NUEVO) Dashboard Panels ---
// =================================================================

/**
 * Obtiene los paneles del dashboard para un usuario específico.
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
 * Obtiene los paneles del dashboard para administradores.
 */
const getAdminDashboardPanels = async () => {
  try {
    return await dashboardService.getAdminDashboardPanels();
  } catch (error) {
    console.error('Error en getAdminDashboardPanels (controller):', error);
    throw error;
  }
};

/**
 * Actualiza un panel del dashboard.
 */
const updateDashboardPanel = async (panelId, updates) => {
  try {
    return await dashboardService.updateDashboardPanel(panelId, updates);
  } catch (error) {
    console.error('Error en updateDashboardPanel (controller):', error);
    throw error;
  }
};

/**
 * Obtiene los accesorios.
 */
const getAccessories = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const accessories = await productService.getAccessories(userId);
    res.json(accessories);
  } catch (error) {
    console.error('Error en getAccessories (controller):', error);
    res.status(500).json({ message: 'Error al obtener accesorios' });
  }
};

/**
 * Obtiene los detalles de los grupos de productos.
 */
const getProductGroupsDetails = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const groupDetails = await productService.getProductGroupsDetails(userId);
    res.json(groupDetails);
  } catch (error) {
    console.error('Error en getProductGroupsDetails (controller):', error);
    res.status(500).json({ message: 'Error al obtener detalles de grupos de productos' });
  }
};

/**
 * Obtiene productos por grupo.
 */
const fetchProductsByGroup = async (groupCode, page, limit, userId) => {
  try {
    const result = await productService.fetchProductsByGroup(groupCode, page, limit, userId);
    return result;
  } catch (error) {
    console.error('Error en fetchProductsByGroup (controller):', error);
    throw error;
  }
};

/**
 * Genera el PDF de un pedido.
 * @param {number} orderId - El ID del pedido.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<Buffer>} - El contenido del PDF como un buffer.
 */
const downloadOrderPDF = async (orderId, userId) => {
  try {
    return await orderService.downloadOrderPdf(orderId, userId);
  } catch (error) {
    console.error(`Error en downloadOrderPDF (controller) para pedido ${orderId}:`, error);
    throw error;
  }
};

// =================================================================
// --- (NUEVO) Wrappers para Administración (CORRECCIÓN CRÍTICA) ---
// =================================================================

const fetchAdminOrderDetails = async (req, res) => {
  try {
    const { id } = req.params; // Extraemos el ID del request
    const order = await adminService.fetchAdminOrderDetails(id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    res.json(order); // Enviamos la respuesta HTTP
  } catch (error) {
    console.error(`Error en fetchAdminOrderDetails controller:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getUsersForAdmin = async (req, res) => {
  try {
    const users = await adminService.getUsersForAdmin();
    res.json(users);
  } catch (error) {
    console.error('Error en getUsersForAdmin controller:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

const updateUserGroupPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { groups } = req.body;
    const result = await adminService.updateUserGroupPermissions(userId, groups);
    res.json(result);
  } catch (error) {
    console.error('Error en updateUserGroupPermissions controller:', error);
    res.status(500).json({ message: 'Error al actualizar permisos' });
  }
};

const getAdmins = async (req, res) => {
  try {
    const admins = await adminService.getAdmins();
    res.json(admins);
  } catch (error) {
    console.error('Error en getAdmins controller:', error);
    res.status(500).json({ message: 'Error al obtener administradores' });
  }
};

const addAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await adminService.addAdmin(userId);
    res.json(result);
  } catch (error) {
    console.error('Error en addAdmin controller:', error);
    res.status(500).json({ message: error.message });
  }
};

const removeAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await adminService.removeAdmin(userId);
    res.json(result);
  } catch (error) {
    console.error('Error en removeAdmin controller:', error);
    res.status(500).json({ message: error.message });
  }
};

const getProductGroupsForAdmin = async (req, res) => {
    try {
        const result = await pool.query(`SELECT DISTINCT product_group, brand FROM products WHERE product_group IS NOT NULL AND product_group != '' ORDER BY product_group ASC;`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error en getProductGroupsForAdmin:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

const toggleProductOfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await productService.toggleProductOfferStatus(id);
        res.json(result);
    } catch (error) {
        console.error('Error en toggleProductOfferStatus:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * (NUEVO) Cambia la contraseña de un usuario logueado.
 */
const changePasswordController = async (req, res) => {
  try {
    const userId = req.user.userId; // ID del usuario autenticado
    const userRole = req.user.role; // Rol del usuario autenticado
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'La nueva contraseña es obligatoria.' });
    }

    const result = await userService.changePassword(userId, newPassword, userRole);
    res.json(result);

  } catch (error) {
    console.error('Error en changePasswordController:', error);
    res.status(500).json({ message: error.message || 'Error interno al cambiar la contraseña.' });
  }
};

module.exports = {
  authenticateProtheusUser,
  registerProtheusUser,
  getProfile,
  updateProfile,
  getVendedorClientsController,
  fetchProtheusBalance,
  fetchProtheusMovements,
  createCreditNote,
  fetchCustomerInvoices,
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
  getAccessories,
  getProductGroupsDetails,
  fetchProductsByGroup,
  downloadOrderPDF,
  getDeniedProductGroups,
  fetchAdminOrderDetails,
  getUsersForAdmin,
  updateUserGroupPermissions,
  getAdmins,
  addAdmin,
  removeAdmin,
  getProductGroupsForAdmin,
  toggleProductOfferStatus,
  changePasswordController,
  updateOrderDetailsController,
};