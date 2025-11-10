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

// --- (NUEVO ENDPOINT) Nota de Crédito ---
// Protegido por requireUserId (para saber qué admin lo hace)
// y requireAdmin (para asegurar que SÓLO un admin pueda hacerlo)
router.post('/credit-note', requireUserId, requireAdmin, async (req, res) => {
  console.log(`POST /api/credit-note -> Admin ${req.userId} creando NC...`);
  try {
    const { targetUserId, amount, reason } = req.body;
    const adminUserId = req.userId; // El admin que está haciendo la solicitud

    if (!targetUserId || !amount || !reason) {
      return res.status(400).json({ message: 'Faltan campos: targetUserId, amount, y reason son obligatorios.' });
    }
    
    if (parseFloat(amount) <= 0) {
       return res.status(400).json({ message: 'El importe debe ser un número positivo.' });
    }

    const result = await controllers.createCreditNote(targetUserId, amount, reason, adminUserId);
    res.json(result); // Devuelve { success: true, message: '...' }

  } catch (error) {
    console.error('Error en /api/credit-note:', error);
    // Devolvemos el mensaje de error específico del controlador (ej. "Usuario no existe")
    res.status(500).json({ message: error.message || 'Error interno del servidor.' });
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
// (MODIFICADO) Estas rutas son públicas, no necesitan 'requireUserId'
router.get('/products', async (req, res) => {
  console.log('GET /api/products -> Consultando productos en DB (paginado)...');
  try {
    const { page = 1, limit = 20, search = '', brand = '' } = req.query;
    const data = await controllers.fetchProtheusProducts(page, limit, search, brand);
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

module.exports = router;