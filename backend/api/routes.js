const express = require('express');
const router = express.Router();
const { upload } = require('./middleware/upload'); // Importar config de Multer
const controllers = require('./controllers'); // Importar todos los controladores
const pool = require('./db'); // (NUEVO) Importamos pool para la db

// (NUEVO) Middleware simple para verificar userId
// El frontend ahora debe enviar 'userId' en todas las peticiones protegidas
const requireUserId = (req, res, next) => {
  // Buscamos el userId en query params (para GET) o en el body (para POST/PUT)
  // (MODIFICADO) Damos prioridad a query params, luego body.
  const userId = req.query.userId || req.body.userId;
  
  if (!userId) {
    // Si no hay userId, devolvemos un error de "Bad Request"
    return res.status(400).json({ message: 'Falta el ID de usuario (userId).' });
  }
  
  // Si existe, lo adjuntamos a 'req' para que los controladores lo usen
  req.userId = userId;
  next(); // Continúa a la siguiente función (el controlador)
};

// --- (NUEVO) Middleware de Administrador ---
// Verifica si el 'userId' proporcionado en la request corresponde a un admin
// DEBE usarse SIEMPRE DESPUÉS de 'requireUserId'
const requireAdmin = async (req, res, next) => {
  try {
    // req.userId fue establecido por el middleware 'requireUserId'
    const userId = req.userId; 
    
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no autenticado.' });
    }
    
    const user = result.rows[0];
    
    if (user.is_admin) {
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
  
  // --- (NUEVO) Middleware Opcional para userId ---
  const optionalUserId = (req, res, next) => {
    // Buscamos el userId en query params o en el body
    const userId = req.query.userId || req.body.userId;
    if (userId) {
      // Si existe, lo adjuntamos a 'req' para que los controladores lo usen
      req.userId = userId;
    }
    next(); // Siempre continúa, haya o no userId
  };
  
  // --- (FIN NUEVO Middleware) ---
  
  
  // =================================================================
  // --- ENDPOINTS DE TU API ---
  // =================================================================
  
  // --- Autenticación ---
  // Estas rutas no usan 'requireUserId' porque el usuario aún no está logueado
  router.post('/login', async (req, res) => {
    console.log('POST /api/login -> Autenticando contra DB...');
    try {
      const { email, password } = req.body;
      const result = await controllers.authenticateProtheusUser(email, password);
      if (result.success) {
        // Devuelve el objeto { success: true, user: {...} }
        res.json(result); 
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
        return res.status(409).json({ message: error.message }); // 409 Conflict
      }
      if (error.code === '23505') { // Error de 'unique constraint' de PostgreSQL
         return res.status(409).json({ message: 'El email ya está registrado.' });
      }
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  
  // --- Endpoints de Perfil ---
  // (MODIFICADO) Usamos el middleware 'requireUserId'
  router.get('/profile', requireUserId, async (req, res) => {
    console.log('GET /api/profile -> Consultando perfil de usuario en DB...');
    try {
      // (MODIFICADO) Obtenemos userId de req.userId (puesto por el middleware)
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
  
  // (MODIFICADO) Usamos el middleware 'requireUserId'
  router.put('/profile', requireUserId, async (req, res) => {
    console.log('PUT /api/profile -> Actualizando perfil en DB...');
    try {
      // (MODIFICADO) Obtenemos userId de req.userId
      const result = await controllers.updateProfile(req.userId, req.body);
      res.json(result);
  
    } catch (error) {
      console.error('Error en /api/profile (PUT):', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  
  // --- Cuenta Corriente ---
  // (MODIFICADO) Usamos el middleware 'requireUserId'
  router.get('/balance', requireUserId, async (req, res) => {
    console.log('GET /api/balance -> Consultando saldo en DB...');
    try {
      // (MODIFICADO) Obtenemos userId de req.userId
      const balanceData = await controllers.fetchProtheusBalance(req.userId);
      res.json(balanceData);
    } catch (error) {
      console.error('Error en /api/balance:', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  // (MODIFICADO) Usamos el middleware 'requireUserId'
  router.get('/movements', requireUserId, async (req, res) => {
    console.log('GET /api/movements -> Consultando movimientos en DB...');
    try {
      // (MODIFICADO) Obtenemos userId de req.userId
      const movementsData = await controllers.fetchProtheusMovements(req.userId);
      res.json(movementsData);
    } catch (error) {
      console.error('Error en /api/movements:', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
  
  // --- (ENDPOINT MODIFICADO) Nota de Crédito ---
  // Protegido por requireUserId (para saber qué admin lo hace)
  // y requireAdmin (para asegurar que SÓLO un admin pueda hacerlo)
  router.post('/credit-note', requireUserId, requireAdmin, async (req, res) => {
    console.log(`POST /api/credit-note -> Admin ${req.userId} creando NC...`);
    try {
      // (MODIFICADO) Ahora recibe 'items' y 'invoiceRefId' en lugar de 'amount'
      const { targetUserCod, reason, items, invoiceRefId } = req.body; 
      const adminUserId = req.userId; // El admin que está haciendo la solicitud
  
      if (!targetUserCod || !reason || !items || !invoiceRefId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Faltan campos: targetUserCod, reason, invoiceRefId, y un array de items son obligatorios.' });
      }
      
      // (MODIFICADO) Pasar los nuevos argumentos al controlador
      const result = await controllers.createCreditNote(targetUserCod, reason, items, invoiceRefId, adminUserId);
      res.json(result); // Devuelve { success: true, message: '...' }
  
    } catch (error) {
      console.error('Error en /api/credit-note:', error);
      // Devolvemos el mensaje de error específico del controlador (ej. "Usuario no existe")
      res.status(500).json({ message: error.message || 'Error interno del servidor.' });
    }
  });
  
  // --- (NUEVO ENDPOINT) Buscar Facturas de Cliente por A1_COD ---
  // Protegido por requireUserId (para saber qué admin lo hace)
  // y requireAdmin (para asegurar que SÓLO un admin pueda hacerlo)
  router.get('/customer-invoices/:cod', requireUserId, requireAdmin, async (req, res) => {
    console.log(`GET /api/customer-invoices/${req.params.cod} -> Buscando facturas...`);
    try {
      const customerCod = req.params.cod;
      const invoices = await controllers.fetchCustomerInvoices(customerCod);
      res.json(invoices); // Devuelve un array de facturas
    } catch (error) {
      console.error('Error en /api/customer-invoices:', error);
      // Si el error es "no existe", devolvemos 404. Si no, 500.
      res.status(error.message.includes('no existe') ? 404 : 500).json({ message: error.message });
    }
  });
  
  // --- (NUEVO ENDPOINT) Obtener detalles de un pedido (para Admin) ---
  // Esta ruta permite a un admin ver los items de CUALQUIER pedido
  router.get('/admin/order-details/:id', requireUserId, requireAdmin, async (req, res) => {
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
  
  // --- (NUEVO ENDPOINT ADMIN) Listar todos los clientes ---
  router.get('/admin/users', requireUserId, requireAdmin, async (req, res) => {
    console.log(`GET /api/admin/users -> Admin ${req.userId} fetching user list...`);
    try {
      const users = await controllers.getUsersForAdmin();
      res.json(users);
    } catch (error) {
      console.error('Error in /api/admin/users:', error);
      res.status(500).json({ message: 'Error al obtener la lista de usuarios.' });
    }
  });
  
  // --- (NUEVO ENDPOINT ADMIN) Listar todos los grupos de productos ---
  router.get('/admin/product-groups', requireUserId, requireAdmin, async (req, res) => {
    console.log(`GET /api/admin/product-groups -> Admin ${req.userId} fetching product groups...`);
    try {
      const groups = await controllers.getProductGroupsForAdmin();
      res.json(groups);
    } catch (error) {
      console.error('Error in /api/admin/product-groups:', error);
      res.status(500).json({ message: 'Error al obtener los grupos de productos.' });
    }
  });
  
  // --- (NUEVO ENDPOINT ADMIN) Obtener permisos de grupo para un usuario ---
  router.get('/admin/users/:userId/product-groups', requireUserId, requireAdmin, async (req, res) => {
    const { userId } = req.params;
    console.log(`GET /api/admin/users/${userId}/product-groups -> Admin ${req.userId} fetching permissions...`);
    try {
      const permissions = await controllers.getUserGroupPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error(`Error in /api/admin/users/${userId}/product-groups:`, error);
      res.status(500).json({ message: 'Error al obtener los permisos del usuario.' });
    }
  });
  
  // --- (NUEVO ENDPOINT ADMIN) Actualizar permisos de grupo para un usuario ---
  router.put('/admin/users/:userId/product-groups', requireUserId, requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const { groups } = req.body; // Expect an array of group strings
  
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
  // (MODIFICADO) Usamos el middleware 'requireUserId'
  router.get('/orders', requireUserId, async (req, res) => {
    console.log('GET /api/orders -> Consultando pedidos en DB...');
    try {
      // (MODIFICADO) Obtenemos userId de req.userId
      const orders = await controllers.fetchProtheusOrders(req.userId);
      res.json(orders);
    } catch (error) {
      console.error('Error en /api/orders:', error);
      res.status(500).json({ message: 'Error al obtener pedidos.' });
    }
  });
  
  // (MODIFICADO) Usamos el middleware 'requireUserId'
  router.get('/orders/:id', requireUserId, async (req, res) => {
    console.log(`GET /api/orders/${req.params.id} -> Consultando detalles en DB...`);
    try {
      const orderId = req.params.id;
      // (MODIFICADO) Obtenemos userId de req.userId
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
  
  
  // (MODIFICADO) Usamos el middleware 'requireUserId'
  router.post('/orders', requireUserId, async (req, res) => {
    console.log('POST /api/orders -> Guardando nuevo pedido/presupuesto en DB...');
    try {
      // (MODIFICADO) Extraemos userId del body (ya no es necesario, usamos req.userId)
      const { userId, ...orderData } = req.body;
      // Usamos req.userId (del middleware) y el resto de req.body (orderData)
      const result = await controllers.saveProtheusOrder(orderData, req.userId);
      res.json(result);
    } catch (error) {
      console.error('Error en POST /api/orders:', error);
      res.status(500).json({ message: 'Error al guardar el pedido.' });
    }
  });
  
  // --- Productos y Ofertas ---
  // (MODIFICADO) Esta ruta ahora usa el middleware opcional de userId
  router.get('/products', optionalUserId, async (req, res) => {
    console.log('GET /api/products -> Consultando productos en DB (paginado)...');
    try {
      const { page = 1, limit = 20, search = '', brand = '', moneda = '0' } = req.query;
      // Pasamos el userId (puede ser null) al controlador
      const data = await controllers.fetchProtheusProducts(page, limit, search, brand, moneda, req.userId);
      res.json(data); // Devuelve { products: [...], totalProducts: X }
    } catch (error) {
      console.error('Error en /api/products:', error);
      res.status(500).json({ message: 'Error al obtener productos.' });
    }
  });
  
  // --- (NUEVA RUTA) ---
  // Obtiene un producto específico por su ID
  // Es pública, no necesita requireUserId
  router.get('/products/:id', async (req, res) => {
    const productId = req.params.id;
    console.log(`GET /api/products/${productId} -> Consultando producto individual...`);
    try {
      const product = await controllers.fetchProductDetails(productId);
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
  // --- (FIN NUEVA RUTA) ---
  
  
  router.get('/brands', async (req, res) => {
    console.log('GET /api/brands -> Consultando lista de marcas...');
    try {
      const brands = await controllers.fetchProtheusBrands();
      res.json(brands);
    } catch (error) {
      console.error('Error en /api/brands:', error);
      res.status(500).json({ message: 'Error al obtener marcas.' });
    }
  });
  
  router.get('/offers', async (req, res) => {
    console.log('GET /api/offers -> Consultando ofertas en DB...');
    try {
      const offers = await controllers.fetchProtheusOffers();
      res.json(offers);
    } catch (error) {
      console.error('Error en /api/offers:', error);
      res.status(500).json({ message: 'Error al obtener ofertas.' });
    }
  });
  
  // (NUEVA RUTA ADMIN) Activar/desactivar oferta de un producto
  router.put('/products/:id/toggle-offer', requireUserId, requireAdmin, async (req, res) => {
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
  
  // (NUEVA RUTA) Obtiene las cotizaciones del dólar (pública)
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
  // (MODIFICADO) Usamos el middleware 'requireUserId'
  router.post('/queries', requireUserId, async (req, res) => {
    console.log('POST /api/queries -> Guardando consulta en DB...');
    try {
      // (MODIFICADO) Extraemos userId del body (ya no es necesario)
      const { userId, ...queryData } = req.body;
      const result = await controllers.saveProtheusQuery(queryData, req.userId); // Usamos req.userId
      res.json(result);
    } catch (error) {
      console.error('Error en /api/queries:', error);
      res.status(500).json({ message: 'Error al enviar la consulta.' });
    }
  });
  
  // (MODIFICADO) Usamos el middleware 'upload' y 'requireUserId'
  // Nota: 'requireUserId' debe ir DESPUÉS de 'upload.single'
  // porque el 'userId' viene en el FormData (multipart/form-data)
  router.post('/upload-voucher', upload.single('voucherFile'), requireUserId, async (req, res) => {
    console.log('POST /api/upload-voucher -> Archivo recibido, guardando en DB...');
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún archivo.' });
      }
      
      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path, // 'uploads/filename.jpg'
        mimeType: req.file.mimetype, 
        size: req.file.size
      };
      
      // (MODIFICADO) Obtenemos userId de req.userId (que el middleware 'requireUserId' extrajo del body)
      const result = await controllers.saveProtheusVoucher(fileInfo, req.userId);
      res.json({ success: true, fileInfo: result });
  
    } catch (error) {
      console.error('Error en /api/upload-voucher:', error);
      res.status(500).json({ message: 'Error al procesar el archivo.' });
    }
  });
  
  
  // --- (NUEVO) Dashboard Panels ---
  router.get('/dashboard-panels', async (req, res) => {
    console.log('GET /api/dashboard-panels -> Consultando paneles visibles...');
    try {
      const panels = await controllers.getDashboardPanels();
      res.json(panels);
    } catch (error) {
      console.error('Error en /api/dashboard-panels:', error);
      res.status(500).json({ message: 'Error al obtener los paneles del dashboard.' });
    }
  });
  
  router.get('/admin/dashboard-panels', requireUserId, requireAdmin, async (req, res) => {
    console.log('GET /api/admin/dashboard-panels -> Admin consultando todos los paneles...');
    try {
      const panels = await controllers.getAdminDashboardPanels();
      res.json(panels);
    } catch (error) {
      console.error('Error en /api/admin/dashboard-panels:', error);
      res.status(500).json({ message: 'Error al obtener los paneles del dashboard para admin.' });
    }
  });
  
  router.put('/admin/dashboard-panels/:id', requireUserId, requireAdmin, async (req, res) => {
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