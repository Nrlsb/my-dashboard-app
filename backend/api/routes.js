const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // <-- AÑADIDO
const rateLimit = require('express-rate-limit');
const { upload } = require('./middleware/upload'); // Importar config de Multer
const controllers = require('./controllers'); // Importar todos los controladores
const pool = require('./db'); // (NUEVO) Importamos pool para la db

// --- Rate Limiter for login ---
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 login requests per `window` (here, per 15 minutes)
	message:
		'Demasiados intentos de inicio de sesión desde esta IP, por favor intente de nuevo después de 15 minutos',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// --- (NUEVO) Middleware de Autenticación JWT ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    return res.status(401).json({ message: 'No autorizado: Token no proporcionado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (err) {
      console.error('Error de verificación de JWT:', err.message);
      return res.status(403).json({ message: 'Prohibido: Token no válido o expirado.' });
    }

    req.user = userPayload; // Adjuntamos el payload decodificado (ej: { userId, name, isAdmin })
    // Para mantener compatibilidad temporal con código que usa req.userId
    req.userId = userPayload.userId; 
    next();
  });
};

// --- (NUEVO) Middleware de Administrador ---
// Verifica si el usuario autenticado via JWT es un administrador.
// DEBE usarse SIEMPRE DESPUÉS de 'authenticateToken'.
const requireAdmin = async (req, res, next) => {
  try {
    // req.user fue establecido por el middleware 'authenticateToken'
    if (req.user && req.user.isAdmin) {
      next(); // Es admin, continuar
    } else {
      // No es admin, denegar acceso
      return res.status(403).json({ message: 'Acceso denegado. Requiere permisos de administrador.' });
    }
  } catch (error) {
    console.error('Error en middleware requireAdmin:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
    }
  };
  
// --- (NUEVO) Middleware Opcional de Autenticación JWT ---
const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return next(); // No hay token, continuar sin autenticar.
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (!err) {
      // Si el token es válido, adjuntar datos a la solicitud.
      req.user = userPayload;
      req.userId = userPayload.userId;
    }
    // Si el token es inválido, simplemente continuamos sin autenticar.
    next();
  });
};
  
  
  // =================================================================
  // --- ENDPOINTS DE TU API ---
  // =================================================================
  
  // --- Autenticación ---
  // Estas rutas no se protegen porque aquí es donde el usuario obtiene el token
  router.post('/login', loginLimiter, async (req, res) => {
    console.log('POST /api/login -> Autenticando contra DB...');
    try {
      let email = req.body.email; // Obtener email
      const password = req.body.password; // Obtener password

      if (typeof email === 'object' && email !== null && email.email) {
        email = email.email;
      }

      if (!email || typeof email !== 'string' || email.trim() === '' ||
          !password || typeof password !== 'string' || password.trim() === '') {
        return res.status(400).json({ message: 'Email y contraseña son obligatorios.' });
      }

      const result = await controllers.authenticateProtheusUser(email, password);
      if (result.success) {
        const user = result.user;
        const payload = {
          userId: user.id,
          name: user.nombre,
          isAdmin: user.is_admin,
          codCliente: user.cod_cliente,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: '7d',
        });

        res.json({
          success: true,
          user: user,
          token: token,
        });
      } else {
        res.status(401).json({ message: result.message });
      }
    } catch (error) {
      console.error('Error en /api/login:', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  router.post('/register', async (req, res) => {
    console.log('POST /api/register -> Registrando nuevo usuario en DB...');
    try {
      const { nombre, email, password } = req.body;
  
      if (!nombre || !email || !password) {
        return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
      }
  
      const newUser = await controllers.registerProtheusUser(req.body);
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
  });
  
  
  // --- Endpoints de Perfil ---
  router.get('/profile', authenticateToken, async (req, res) => {
    console.log('GET /api/profile -> Consultando perfil de usuario en DB...');
    try {
      const profileData = await controllers.getProfile(req.userId);
      
      if (!profileData) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      
      res.json(profileData);
      
    } catch (error) {
      console.error('Error en /api/profile (GET):', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  router.put('/profile', authenticateToken, async (req, res) => {
    console.log('PUT /api/profile -> Actualizando perfil en DB...');
    try {
      const result = await controllers.updateProfile(req.userId, req.body);
      res.json(result);
  
    } catch (error) {
      console.error('Error en /api/profile (PUT):', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  
  // --- Cuenta Corriente ---
  router.get('/balance', authenticateToken, async (req, res) => {
    console.log('GET /api/balance -> Consultando saldo en DB...');
    try {
      const balanceData = await controllers.fetchProtheusBalance(req.userId);
      res.json(balanceData);
    } catch (error) {
      console.error('Error en /api/balance:', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  router.get('/movements', authenticateToken, async (req, res) => {
    console.log('GET /api/movements -> Consultando movimientos en DB...');
    try {
      const movementsData = await controllers.fetchProtheusMovements(req.userId);
      res.json(movementsData);
    } catch (error) {
      console.error('Error en /api/movements:', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  // --- Endpoints de Administrador ---
  router.post('/credit-note', authenticateToken, requireAdmin, async (req, res) => {
    console.log(`POST /api/credit-note -> Admin ${req.userId} creando NC...`);
    try {
      const { targetUserCod, reason, items, invoiceRefId } = req.body; 
      const adminUserId = req.userId;
  
      if (!targetUserCod || !reason || !items || !invoiceRefId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Faltan campos: targetUserCod, reason, invoiceRefId, y un array de items son obligatorios.' });
      }
      
      const result = await controllers.createCreditNote(targetUserCod, reason, items, invoiceRefId, adminUserId);
      res.json(result);
  
    } catch (error) {
      console.error('Error en /api/credit-note:', error);
      res.status(500).json({ message: error.message || 'Error interno del servidor.' });
    }
  });
  
  router.get('/customer-invoices/:cod', authenticateToken, requireAdmin, async (req, res) => {
    console.log(`GET /api/customer-invoices/${req.params.cod} -> Buscando facturas...`);
    try {
      const customerCod = req.params.cod;
      const invoices = await controllers.fetchCustomerInvoices(customerCod);
      res.json(invoices);
    } catch (error) {
      console.error('Error en /api/customer-invoices:', error);
      res.status(error.message.includes('no existe') ? 404 : 500).json({ message: error.message });
    }
  });
  
  router.get('/admin/order-details/:id', authenticateToken, requireAdmin, async (req, res) => {
    console.log(`GET /api/admin/order-details/${req.params.id} -> Admin ${req.userId} fetching details...`);
    try {
      const orderId = req.params.id;
      const orderDetails = await controllers.fetchAdminOrderDetails(orderId);
      if (orderDetails) {
        res.json(orderDetails);
      } else {
        res.status(404).json({ message: 'Pedido no encontrado.' });
      }
    } catch (error) {
      console.error(`Error en /api/admin/order-details/${req.params.id}:`, error);
      res.status(500).json({ message: error.message || 'Error al obtener detalles del pedido.' });
    }
  });
  
  router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    console.log(`GET /api/admin/users -> Admin ${req.userId} fetching user list...`);
    try {
      const users = await controllers.getUsersForAdmin();
      res.json(users);
    } catch (error) {
      console.error('Error in /api/admin/users:', error);
      res.status(500).json({ message: 'Error al obtener la lista de usuarios.' });
    }
  });
  
  router.get('/admin/product-groups', authenticateToken, requireAdmin, async (req, res) => {
    console.log(`GET /api/admin/product-groups -> Admin ${req.userId} fetching product groups...`);
    try {
      const groups = await controllers.getProductGroupsForAdmin();
      res.json(groups);
    } catch (error) {
      console.error('Error in /api/admin/product-groups:', error);
      res.status(500).json({ message: 'Error al obtener los grupos de productos.' });
    }
  });
  
  router.get('/admin/users/:userId/product-groups', authenticateToken, requireAdmin, async (req, res) => {
    const { userId } = req.params;
    console.log(`GET /api/admin/users/${userId}/product-groups -> Admin ${req.userId} fetching permissions...`);
    try {
      const permissions = await controllers.getDeniedProductGroups(userId);
      res.json(permissions);
    } catch (error) {
      console.error(`Error in /api/admin/users/${userId}/product-groups:`, error);
      res.status(500).json({ message: 'Error al obtener los permisos del usuario.' });
    }
  });
  
  router.put('/admin/users/:userId/product-groups', authenticateToken, requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const { groups } = req.body;
  
    if (!Array.isArray(groups)) {
      return res.status(400).json({ message: 'El cuerpo de la petición debe contener un array de "groups".' });
    }
  
    console.log(`PUT /api/admin/users/${userId}/product-groups -> Admin ${req.userId} updating permissions...`);
    try {
      const result = await controllers.updateUserGroupPermissions(userId, groups);
      res.json(result);
    } catch (error) {
      console.error(`Error in PUT /api/admin/users/${userId}/product-groups:`, error);
      res.status(500).json({ message: 'Error al actualizar los permisos del usuario.' });
    }
  });
  
  
  // --- Pedidos ---
  router.get('/orders', authenticateToken, async (req, res) => {
    console.log('GET /api/orders -> Consultando pedidos en DB...');
    try {
      const orders = await controllers.fetchProtheusOrders(req.userId);
      res.json(orders);
    } catch (error) {
      console.error('Error en /api/orders:', error);
      res.status(500).json({ message: 'Error al obtener pedidos.' });
    }
  });
  
  router.get('/orders/:id', authenticateToken, async (req, res) => {
    console.log(`GET /api/orders/${req.params.id} -> Consultando detalles en DB...`);
    try {
      const orderId = req.params.id;
      const orderDetails = await controllers.fetchProtheusOrderDetails(orderId, req.userId);
      if (orderDetails) {
        res.json(orderDetails);
      } else {
        res.status(404).json({ message: 'Pedido no encontrado.' });
      }
    } catch (error) {
      console.error(`Error en /api/orders/${req.params.id}:`, error);
      res.status(500).json({ message: error.message || 'Error al obtener detalles del pedido.' });
    }
  });
  
  
  router.post('/orders', authenticateToken, async (req, res) => {
    console.log('POST /api/orders -> Guardando nuevo pedido/presupuesto en DB...');
    try {
      const { userId, ...orderData } = req.body;
      const result = await controllers.saveProtheusOrder(orderData, req.userId);
      res.json(result);
    } catch (error) {
      console.error('Error en POST /api/orders:', error);
      res.status(500).json({ message: 'Error al guardar el pedido.' });
    }
  });
  
  // --- Productos y Ofertas ---
  router.get('/products', optionalAuthenticateToken, async (req, res) => {
    console.log('GET /api/products -> Consultando productos en DB (paginado)...');
    try {
      const { page = 1, limit = 20, search = '', brand = '', moneda = '0' } = req.query;
      const data = await controllers.fetchProtheusProducts(page, limit, search, brand, moneda, req.userId);
      res.json(data);
    } catch (error) {
      console.error('Error en /api/products:', error);
      res.status(500).json({ message: 'Error al obtener productos.' });
    }
  });
  
  router.get('/accessories', optionalAuthenticateToken, async (req, res) => {
    console.log('GET /api/accessories -> Consultando productos accesorios...');
    try {
      const accessories = await controllers.getAccessories(req.userId);
      res.json(accessories);
    } catch (error) {
      console.error('Error en /api/accessories:', error);
      res.status(500).json({ message: 'Error al obtener accesorios.' });
    }
  });

  router.get('/product-groups-details', optionalAuthenticateToken, async (req, res) => {
    console.log('GET /api/product-groups-details -> Consultando detalles de grupos...');
    try {
      const groupDetails = await controllers.getProductGroupsDetails(req.userId);
      res.json(groupDetails);
    } catch (error) {
      console.error('Error en /api/product-groups-details:', error);
      res.status(500).json({ message: 'Error al obtener detalles de los grupos.' });
    }
  });

  router.get('/products/group/:groupCode', optionalAuthenticateToken, async (req, res) => {
    console.log(`GET /api/products/group/${req.params.groupCode} -> Consultando productos por grupo...`);
    try {
      const { groupCode } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const data = await controllers.fetchProductsByGroup(groupCode, page, limit, req.userId);
      res.json(data);
    } catch (error) {
      console.error(`Error en /api/products/group/${req.params.groupCode}:`, error);
      res.status(500).json({ message: 'Error al obtener productos por grupo.' });
    }
  });

  router.get('/products/:id', optionalAuthenticateToken, async (req, res) => {
    const productId = req.params.id;
    console.log(`GET /api/products/${productId} -> Consultando producto individual...`);
    try {
      const product = await controllers.fetchProductDetails(productId, req.userId);
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ message: 'Producto no encontrado.' });
      }
    } catch (error) {
      console.error(`Error en /api/products/${productId}:`, error);
      res.status(500).json({ message: 'Error al obtener el producto.' });
    }
  });
  
  
  router.get('/brands', optionalAuthenticateToken, async (req, res) => {
    console.log('GET /api/brands -> Consultando lista de marcas...');
    try {
      const brands = await controllers.fetchProtheusBrands(req.userId);
      res.json(brands);
    } catch (error) {
      console.error('Error en /api/brands:', error);
      res.status(500).json({ message: 'Error al obtener marcas.' });
    }
  });
  
  router.get('/offers', optionalAuthenticateToken, async (req, res) => {
    console.log('GET /api/offers -> Consultando ofertas en DB...');
    try {
      const offers = await controllers.fetchProtheusOffers(req.userId);
      res.json(offers);
    } catch (error) {
      console.error('Error en /api/offers:', error);
      res.status(500).json({ message: 'Error al obtener ofertas.' });
    }
  });
  
  router.put('/products/:id/toggle-offer', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`PUT /api/products/${id}/toggle-offer -> Admin ${req.userId} cambiando estado de oferta...`);
    try {
      const updatedProduct = await controllers.toggleProductOfferStatus(id);
      res.json({ success: true, product: updatedProduct });
    } catch (error) {
      console.error(`Error en /api/products/${id}/toggle-offer:`, error);
      res.status(500).json({ message: error.message || 'Error al actualizar el estado de la oferta.' });
    }
  });
  
  router.get('/exchange-rates', async (req, res) => {
    console.log('GET /api/exchange-rates -> Consultando cotizaciones del dólar...');
    try {
      const rates = await controllers.getExchangeRatesController();
      res.json(rates);
    } catch (error) {
      console.error('Error en /api/exchange-rates:', error);
      res.status(500).json({ message: 'Error al obtener las cotizaciones.' });
    }
  });
  
  // --- Consultas y Carga de Archivos ---
  router.post('/queries', authenticateToken, async (req, res) => {
    console.log('POST /api/queries -> Guardando consulta en DB...');
    try {
      const { userId, ...queryData } = req.body;
      const result = await controllers.saveProtheusQuery(queryData, req.userId);
      res.json(result);
    } catch (error) {
      console.error('Error en /api/queries:', error);
      res.status(500).json({ message: 'Error al enviar la consulta.' });
    }
  });
  
  router.post('/upload-voucher', upload.single('voucherFile'), authenticateToken, async (req, res) => {
    console.log('POST /api/upload-voucher -> Archivo recibido, guardando en DB...');
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún archivo.' });
      }
      
      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype, 
        size: req.file.size
      };
      
      const result = await controllers.saveProtheusVoucher(fileInfo, req.userId);
      res.json({ success: true, fileInfo: result });
  
    } catch (error) {
      console.error('Error en /api/upload-voucher:', error);
      res.status(500).json({ message: 'Error al procesar el archivo.' });
    }
  });
  
  
  // --- (NUEVO) Dashboard Panels ---
  router.get('/dashboard-panels', optionalAuthenticateToken, async (req, res) => {
    console.log('GET /api/dashboard-panels -> Consultando paneles visibles...');
    try {
      const panels = await controllers.getDashboardPanels(req.userId);
      res.json(panels);
    } catch (error) {
      console.error('Error en /api/dashboard-panels:', error);
      res.status(500).json({ message: 'Error al obtener los paneles del dashboard.' });
    }
  });
  
  router.get('/admin/dashboard-panels', authenticateToken, requireAdmin, async (req, res) => {
    console.log('GET /api/admin/dashboard-panels -> Admin consultando todos los paneles...');
    try {
      const panels = await controllers.getAdminDashboardPanels();
      res.json(panels);
    } catch (error) {
      console.error('Error en /api/admin/dashboard-panels:', error);
      res.status(500).json({ message: 'Error al obtener los paneles del dashboard para admin.' });
    }
  });
  
  router.put('/admin/dashboard-panels/:id', authenticateToken, requireAdmin, async (req, res) => {
    const panelId = req.params.id;
    const { is_visible } = req.body;
    console.log(`PUT /api/admin/dashboard-panels/${panelId} -> Admin actualizando visibilidad...`);
    try {
      if (typeof is_visible !== 'boolean') {
        return res.status(400).json({ message: 'El campo is_visible es obligatorio y debe ser un booleano.' });
      }
      const result = await controllers.updateDashboardPanel(panelId, is_visible);
      res.json(result);
    } catch (error) {
      console.error(`Error en /api/admin/dashboard-panels/${panelId}:`, error);
      res.status(500).json({ message: 'Error al actualizar el panel del dashboard.' });
    }
  });
  
  module.exports = router;
