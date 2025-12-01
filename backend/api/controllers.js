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
const {
  sendOrderConfirmationEmail,
  sendNewOrderNotificationEmail,
} = require('./emailService');
const { generateOrderPDF, generateOrderCSV } = require('./utils/fileGenerator');
const jwt = require('jsonwebtoken');

// =================================================================
// --- (NUEVO) Controladores de Autenticación ---
// =================================================================

const loginController = async (req, res) => {
  console.log('POST /api/login -> Autenticando contra DB...');
  try {
    let email = req.body.email; // Obtener email
    const password = req.body.password; // Obtener password

    if (typeof email === 'object' && email !== null && email.email) {
      email = email.email;
    }

    if (
      !email ||
      typeof email !== 'string' ||
      email.trim() === '' ||
      !password ||
      typeof password !== 'string' ||
      password.trim() === ''
    ) {
      return res
        .status(400)
        .json({ message: 'Email y contraseña son obligatorios.' });
    }

    const result = await userService.authenticateUser(email, password);
    if (result.success) {
      const user = result.user;

      const payload = {
        userId: user.id,
        name: user.full_name,
        isAdmin: user.is_admin,
        codCliente: user.a1_cod,
        role: user.role || 'cliente',
        codigo: user.codigo || null,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      const userWithRole = { ...user, role: payload.role };

      res.json({
        success: true,
        user: userWithRole,
        token: token,
        first_login: result.first_login,
      });
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error en /api/login:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const registerController = async (req, res) => {
  console.log('POST /api/register -> Registrando nuevo usuario en DB...');
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Nombre, email y contraseña son obligatorios.' });
    }

    const newUser = await userService.registerUser(req.body);
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error en /api/register:', error);
    if (error.message.includes('email ya está registrado')) {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: 'El email ya está registrado.' });
    }
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const getProfileController = async (req, res) => {
  console.log('GET /api/profile -> Consultando perfil de usuario en DB...');
  try {
    // req.userId es añadido por el middleware authenticateToken
    const profileData = await userService.getUserProfile(req.userId);

    if (!profileData) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json(profileData);
  } catch (error) {
    console.error('Error en /api/profile (GET):', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const updateProfileController = async (req, res) => {
  console.log('PUT /api/profile -> Actualizando perfil en DB...');
  try {
    const result = await userService.updateUserProfile(req.userId, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/profile (PUT):', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// =================================================================
// --- (NUEVO) Autenticación y Perfil (Users Table) ---
// =================================================================

/**
 * (NUEVO) Autentica un usuario contra el sistema Protheus.
 * Placeholder: Implementar lógica de autenticación Protheus aquí.
 */
const authenticateProtheusUser = async (req, res) => {
  console.log('POST /api/protheus-login -> Autenticando contra Protheus...');
  try {
    // Lógica de autenticación Protheus
    // Por ahora, solo un placeholder
    res.status(501).json({ message: 'Funcionalidad de autenticación Protheus no implementada.' });
  } catch (error) {
    console.error('Error en authenticateProtheusUser:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * (NUEVO) Registra un usuario en el sistema Protheus.
 * Placeholder: Implementar lógica de registro Protheus aquí.
 */
const registerProtheusUser = async (req, res) => {
  console.log('POST /api/protheus-register -> Registrando usuario en Protheus...');
  try {
    // Lógica de registro Protheus
    // Por ahora, solo un placeholder
    res.status(501).json({ message: 'Funcionalidad de registro Protheus no implementada.' });
  } catch (error) {
    console.error('Error en registerProtheusUser:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * (NUEVO) Obtiene el perfil de un usuario del sistema Protheus.
 * Placeholder: Implementar lógica para obtener perfil Protheus aquí.
 */
const getProfile = async (req, res) => {
  console.log('GET /api/protheus-profile -> Consultando perfil Protheus...');
  try {
    // Lógica para obtener perfil Protheus
    // Por ahora, solo un placeholder
    res.status(501).json({ message: 'Funcionalidad de obtener perfil Protheus no implementada.' });
  } catch (error) {
    console.error('Error en getProfile (Protheus):', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * (NUEVO) Actualiza el perfil de un usuario en el sistema Protheus.
 * Placeholder: Implementar lógica para actualizar perfil Protheus aquí.
 */
const updateProfile = async (req, res) => {
  console.log('PUT /api/protheus-profile -> Actualizando perfil Protheus...');
  try {
    // Lógica para actualizar perfil Protheus
    // Por ahora, solo un placeholder
    res.status(501).json({ message: 'Funcionalidad de actualizar perfil Protheus no implementada.' });
  } catch (error) {
    console.error('Error en updateProfile (Protheus):', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// =================================================================
// --- Cuenta Corriente (Movements Table) ---
// =================================================================

/**
 * (NUEVO) Obtiene el saldo de un usuario del sistema Protheus.
 * Placeholder: Implementar lógica para obtener saldo Protheus aquí.
 */
const fetchProtheusBalance = async (req, res) => {
  console.log('GET /api/protheus-balance -> Consultando saldo Protheus...');
  try {
    // Lógica para obtener saldo Protheus
    // Por ahora, solo un placeholder
    res.status(501).json({ message: 'Funcionalidad de obtener saldo Protheus no implementada.' });
  } catch (error) {
    console.error('Error en fetchProtheusBalance:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
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
      return res
        .status(403)
        .json({ message: 'Acceso denegado. Se requiere rol de vendedor.' });
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





// =================================================================
// --- (NUEVO) Administración de Cuenta Corriente ---
// =================================================================





// =================================================================
// --- Pedidos (Orders Tables) ---
// =================================================================







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

const getProductsController = async (req, res) => {
  console.log('GET /api/products -> Consultando productos en DB (paginado)...');
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      brand = '',
      moneda = '0',
    } = req.query;
    const data = await productService.fetchProducts({
      page,
      limit,
      search,
      brand,
      moneda,
      userId: req.userId, // req.userId es opcional aquí
    });
    res.json(data);
  } catch (error) {
    console.error('Error en /api/products:', error);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
};

const getProductsByGroupController = async (req, res) => {
  console.log(
    `GET /api/products/group/${req.params.groupCode} -> Consultando productos por grupo...`
  );
  try {
    const { groupCode } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const data = await productService.fetchProductsByGroup(
      groupCode,
      page,
      limit,
      req.userId // Opcional
    );
    res.json(data);
  } catch (error) {
    console.error(
      `Error en /api/products/group/${req.params.groupCode}:`,
      error
    );
    res
      .status(500)
      .json({ message: 'Error al obtener productos por grupo.' });
  }
};

const getBrandsController = async (req, res) => {
  console.log('GET /api/brands -> Consultando lista de marcas...');
  try {
    const brands = await productService.fetchProtheusBrands(req.userId);
    res.json(brands);
  } catch (error) {
    console.error('Error en /api/brands:', error);
    res.status(500).json({ message: 'Error al obtener marcas.' });
  }
};

const getOffersController = async (req, res) => {
  console.log('GET /api/offers -> Consultando ofertas en DB...');
  try {
    const offers = await productService.fetchProtheusOffers(req.userId);
    res.json(offers);
  } catch (error) {
    console.error('Error en /api/offers:', error);
    res.status(500).json({ message: 'Error al obtener ofertas.' });
  }
};

const getProductsByIdController = async (req, res) => {
  const productId = req.params.id;
  console.log(
    `GET /api/products/${productId} -> Consultando producto individual...`
  );
  try {
    const product = await productService.fetchProductDetails(
      productId,
      req.userId // Opcional
    );
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Producto no encontrado.' });
    }
  } catch (error) {
    console.error(`Error en /api/products/${productId}:`, error);
    res.status(500).json({ message: 'Error al obtener el producto.' });
  }
};

const getProductsOrdersController = async (req, res) => {
  console.log('GET /api/products/orders -> Endpoint para /api/products/orders alcanzado.');
  res.status(404).json({ message: 'Endpoint /api/products/orders no implementado o no válido para productos.' });
};

const getOrdersController = async (req, res) => {
  console.log('GET /api/orders -> Consultando pedidos en DB...');
  try {
    const orders = await orderService.fetchOrders(req.user);
    res.json(orders);
  } catch (error) {
    console.error('Error en /api/orders:', error);
    res.status(500).json({ message: 'Error al obtener pedidos.' });
  }
};

const createOrderController = async (req, res) => {
  console.log(
    'POST /api/orders -> Guardando nuevo pedido/presupuesto en DB...'
  );
  try {
    const { userId, ...orderData } = req.body;
    const result = await orderService.createOrder(orderData, req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error en POST /api/orders:', error);
    res.status(500).json({ message: 'Error al guardar el pedido.' });
  }
};

const getOrderByIdController = async (req, res) => {
  console.log(
    `GET /api/orders/${req.params.id} -> Consultando detalles en DB...`
  );
  try {
    const orderId = req.params.id;
    const orderDetails = await orderService.fetchOrderDetails(
      orderId,
      req.user
    );
    if (orderDetails) {
      res.json(orderDetails);
    } else {
      res.status(404).json({ message: 'Pedido no encontrado.' });
    }
  } catch (error) {
    console.error(`Error en /api/orders/${req.params.id}:`, error);
    res
      .status(500)
      .json({
        message: error.message || 'Error al obtener detalles del pedido.',
      });
  }
};

const downloadOrderPdfController = async (req, res) => {
  console.log(`GET /api/orders/${req.params.id}/pdf -> Generando PDF...`);
  try {
    const orderId = req.params.id;
    const pdfBuffer = await orderService.downloadOrderPdf(orderId, req.user);

    if (pdfBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Pedido_${orderId}.pdf`
      );
      res.send(pdfBuffer);
    } else {
      res
        .status(404)
        .json({ message: 'Pedido no encontrado o no le pertenece.' });
    }
  } catch (error) {
    console.error(`Error en /api/orders/${req.params.id}/pdf:`, error);
    const isNotFound = error.message.includes('Pedido no encontrado');
    res
      .status(isNotFound ? 404 : 500)
      .json({
        message: error.message || 'Error al generar el PDF del pedido.',
      });
  }
};

const getExchangeRatesController = async (req, res) => {
  console.log(
    'GET /api/exchange-rates -> Consultando cotizaciones del dólar...'
  );
  try {
    const rates = await require('../utils/exchangeRateService').getExchangeRates();
    res.json(rates);
  } catch (error) {
    console.error('Error en /api/exchange-rates:', error);
    res.status(500).json({ message: 'Error al obtener las cotizaciones.' });
  }
};

const createProtheusQueryController = async (req, res) => {
  console.log('POST /api/queries -> Guardando consulta en DB...');
  try {
    const { userId, ...queryData } = req.body;
    const result = await supportService.saveProtheusQuery(queryData, req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/queries:', error);
    res.status(500).json({ message: 'Error al enviar la consulta.' });
  }
};

const uploadVoucherController = async (req, res) => {
  console.log(
    'POST /api/upload-voucher -> Archivo recibido, guardando en DB...'
  );
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'No se recibió ningún archivo.' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    const result = await supportService.saveProtheusVoucher(
      fileInfo,
      req.userId
    );
    res.json({ success: true, fileInfo: result });
  } catch (error) {
    console.error('Error en /api/upload-voucher:', error);
    res.status(500).json({ message: 'Error al procesar el archivo.' });
  }
};

const getDashboardPanelsController = async (req, res) => {
  console.log('GET /api/dashboard-panels -> Consultando paneles visibles...');
  try {
    const panels = await dashboardService.getDashboardPanels(req.user);
    res.json(panels);
  } catch (error) {
    console.error('Error en /api/dashboard-panels:', error);
    res
      .status(500)
      .json({ message: 'Error al obtener los paneles del dashboard.' });
  }
};

const createCreditNoteController = async (req, res) => {
  console.log(`POST /api/credit-note -> Admin ${req.userId} creando NC...`);
  try {
    const { targetUserCod, reason, items, invoiceRefId } = req.body;
    const adminUserId = req.userId;

    if (
      !targetUserCod ||
      !reason ||
      !items ||
      !invoiceRefId ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res
        .status(400)
        .json({
          message:
            'Faltan campos: targetUserCod, reason, invoiceRefId, y un array de items son obligatorios.',
        });
    }

    const result = await accountingService.createCreditNote(
      targetUserCod,
      reason,
      items,
      invoiceRefId,
      adminUserId
    );
    res.json(result);
  } catch (error) {
    console.error('Error en /api/credit-note:', error);
    res
      .status(500)
      .json({ message: error.message || 'Error interno del servidor.' });
  }
};

const getCustomerInvoicesController = async (req, res) => {
  console.log(
    `GET /api/customer-invoices/${req.params.cod} -> Buscando facturas...`
  );
  try {
    const customerCod = req.params.cod;
    const invoices = await accountingService.fetchCustomerInvoices(customerCod);
    res.json(invoices);
  } catch (error) {
    console.error('Error en /api/customer-invoices:', error);
    res
      .status(error.message.includes('no existe') ? 404 : 500)
      .json({ message: error.message });
  }
};

const getDeniedProductGroupsByUserController = async (req, res) => {
  const { userId } = req.params;
  console.log(
    `GET /api/admin/users/${userId}/product-groups -> Admin ${req.userId} fetching permissions...`
  );
  try {
    const permissions = await getDeniedProductGroups(userId);
    res.json(permissions);
  } catch (error) {
    console.error(
      `Error in /api/admin/users/${userId}/product-groups:`,
      error
    );
    res
      .status(500)
      .json({ message: 'Error al obtener los permisos del usuario.' });
  }
};

const getAdminDashboardPanelsController = async (req, res) => {
  console.log(
    'GET /api/admin/dashboard-panels -> Admin consultando todos los paneles...'
  );
  try {
    const panels = await dashboardService.getAdminDashboardPanels();
    res.json(panels);
  } catch (error) {
    console.error('Error en /api/admin/dashboard-panels:', error);
    res
      .status(500)
      .json({
        message: 'Error al obtener los paneles del dashboard para admin.',
      });
  }
};

const updateDashboardPanelController = async (req, res) => {
  const panelId = req.params.id;
  const { is_visible } = req.body;
  console.log(
    `PUT /api/admin/dashboard-panels/${panelId} -> Admin actualizando visibilidad...`
  );
  try {
    if (typeof is_visible !== 'boolean') {
      return res
        .status(400)
        .json({
          message:
            'El campo is_visible es obligatorio y debe ser un booleano.',
        });
    }
    const result = await dashboardService.updateDashboardPanel(
      panelId,
      is_visible
    );
    res.json(result);
  } catch (error) {
    console.error(`Error en /api/admin/dashboard-panels/${panelId}:`, error);
    res
      .status(500)
      .json({ message: 'Error al actualizar el panel del dashboard.' });
  }
};

const getBalanceController = async (req, res) => {
  console.log('GET /api/balance -> Consultando saldo en DB...');
  try {
    const balanceData = await movementService.getBalance(req.userId);
    res.json(balanceData);
  } catch (error) {
    console.error('Error en /api/balance:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const getMovementsController = async (req, res) => {
  console.log('GET /api/movements -> Consultando movimientos en DB...');
  try {
    const movementsData = await movementService.getMovements(req.userId);
    res.json(movementsData);
  } catch (error) {
    console.error('Error en /api/movements:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// =================================================================
// --- Productos y Ofertas (Products Table) ---
// =================================================================








// =================================================================
// --- Consultas y Carga de Archivos ---
// =================================================================











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
    res
      .status(500)
      .json({ message: 'Error al obtener detalles de grupos de productos' });
  }
};





/**
 * Genera y envía el CSV de un pedido.
 * @param {object} req - El objeto de solicitud de Express.
 * @param {object} res - El objeto de respuesta de Express.
 */
const downloadOrderCsvController = async (req, res) => {
  try {
    const orderId = req.params.id;
    const user = req.user; // Usuario autenticado desde el token

    const csvBuffer = await orderService.downloadOrderCsv(orderId, user);

    if (csvBuffer) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Pedido_${orderId}.csv`
      );
      res.send(csvBuffer);
    } else {
      // La lógica de permisos ya está en el servicio, así que esto es un fallback.
      res
        .status(404)
        .json({ message: 'Pedido no encontrado o no le pertenece.' });
    }
  } catch (error) {
    console.error(`Error en /api/orders/${req.params.id}/csv:`, error);
    const isNotFound = error.message.includes('Pedido no encontrado');
    res
      .status(isNotFound ? 404 : 500)
      .json({
        message: error.message || 'Error al generar el CSV del pedido.',
      });
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
    const result = await adminService.updateUserGroupPermissions(
      userId,
      groups
    );
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
    const result = await adminService.getProductGroupsForAdmin();
    res.json(result);
  } catch (error) {
    console.error('Error en getProductGroupsForAdmin (controller):', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
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
      return res
        .status(400)
        .json({ message: 'La nueva contraseña es obligatoria.' });
    }

    const result = await userService.changePassword(
      userId,
      newPassword,
      userRole
    );
    res.json(result);
  } catch (error) {
    console.error('Error en changePasswordController:', error);
    res
      .status(500)
      .json({
        message: error.message || 'Error interno al cambiar la contraseña.',
      });
  }
};


/**
 * (NUEVO) Obtiene todos los clientes registrados en el sistema.
 * Solo accesible para administradores.
 */
const getAllClientsController = async (req, res) => {
  try {
    console.log('GET /api/admin/clients -> Admin consultando todos los clientes...');
    // No se filtra por vendedor_codigo, se obtienen todos.
    const clients = await userService.getAllClients();
    res.json(clients);
  } catch (error) {
    console.error('Error en getAllClientsController:', error);
    res.status(500).json({ message: 'Error interno al obtener todos los clientes.' });
  }
};

module.exports = {
  loginController,
  registerController,
  getProfileController,
  updateProfileController,
  authenticateProtheusUser,
  registerProtheusUser,
  getProfile,
  updateProfile,
  getVendedorClientsController,
  fetchProtheusBalance,







  getAccessories,
  getProductGroupsDetails,

  downloadOrderCsvController,
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
  getProductsController,
  getProductsByGroupController,
  getBrandsController,
  getOffersController,
  getProductsByIdController,
  getOrdersController,
  getProductsOrdersController,
  createOrderController,
  getOrderByIdController,
  downloadOrderPdfController,
  getExchangeRatesController,
  createProtheusQueryController,
  uploadVoucherController,
  getDashboardPanelsController,
  createCreditNoteController,
  getCustomerInvoicesController,
  getDeniedProductGroupsByUserController,
  getAdminDashboardPanelsController,
  updateDashboardPanelController,
  getBalanceController,
  getMovementsController,
  getAllClientsController, // Add the new controller to the exports
};
