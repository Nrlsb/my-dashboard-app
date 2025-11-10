const express = require('express');
const router = express.Router();
const { upload } = require('./middleware/upload'); // (NUEVO) Importar config de Multer
const controllers = require('./controllers'); // (NUEVO) Importar todos los controladores

// NOTA: En una app real, el userId vendría de un Token (JWT)
// Por ahora, simulamos que es el 'user_id = 1'
const MOCK_USER_ID = 1;

// =================================================================
// --- ENDPOINTS DE TU API ---
// =================================================================

// --- Autenticación ---
router.post('/login', async (req, res) => {
  console.log('POST /api/login -> Autenticando contra DB...');
  try {
    const { email, password } = req.body;
    const result = await controllers.authenticateProtheusUser(email, password);
    if (result.success) {
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

    // Validación simple de campos obligatorios
    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
    }

    const newUser = await controllers.registerProtheusUser(req.body);
    res.status(201).json({ success: true, user: newUser });

  } catch (error) {
    console.error('Error en /api/register:', error);
    // Manejar error de usuario duplicado
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
router.get('/profile', async (req, res) => {
  console.log('GET /api/profile -> Consultando perfil de usuario en DB...');
  try {
    // NOTA: Usamos MOCK_USER_ID (1)
    const profileData = await controllers.getProfile(MOCK_USER_ID);
    
    if (!profileData) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    
    res.json(profileData);
    
  } catch (error) {
    console.error('Error en /api/profile (GET):', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

router.put('/profile', async (req, res) => {
  console.log('PUT /api/profile -> Actualizando perfil en DB...');
  try {
    // NOTA: Usamos MOCK_USER_ID (1)
    const result = await controllers.updateProfile(MOCK_USER_ID, req.body);
    res.json(result);

  } catch (error) {
    console.error('Error en /api/profile (PUT):', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});


// --- Cuenta Corriente ---
router.get('/balance', async (req, res) => {
  console.log('GET /api/balance -> Consultando saldo en DB...');
  try {
    const balanceData = await controllers.fetchProtheusBalance(MOCK_USER_ID);
    res.json(balanceData);
  } catch (error) {
    console.error('Error en /api/balance:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

router.get('/movements', async (req, res) => {
  console.log('GET /api/movements -> Consultando movimientos en DB...');
  try {
    const movementsData = await controllers.fetchProtheusMovements(MOCK_USER_ID);
    res.json(movementsData);
  } catch (error) {
    console.error('Error en /api/movements:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// --- Pedidos ---
router.get('/orders', async (req, res) => {
  console.log('GET /api/orders -> Consultando pedidos en DB...');
  try {
    const orders = await controllers.fetchProtheusOrders(MOCK_USER_ID);
    res.json(orders);
  } catch (error) {
    console.error('Error en /api/orders:', error);
    res.status(500).json({ message: 'Error al obtener pedidos.' });
  }
});

router.get('/orders/:id', async (req, res) => {
  console.log(`GET /api/orders/${req.params.id} -> Consultando detalles en DB...`);
  try {
    const orderId = req.params.id;
    const orderDetails = await controllers.fetchProtheusOrderDetails(orderId, MOCK_USER_ID);
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


router.post('/orders', async (req, res) => {
  console.log('POST /api/orders -> Guardando nuevo pedido/presupuesto en DB...');
  try {
    const orderData = req.body; // Esto ahora incluye { items, total, type }
    const result = await controllers.saveProtheusOrder(orderData, MOCK_USER_ID);
    res.json(result);
  } catch (error) {
    console.error('Error en POST /api/orders:', error);
    res.status(500).json({ message: 'Error al guardar el pedido.' });
  }
});

// --- Productos y Ofertas ---
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

// ======================================================
// --- INICIO DE CORRECCIÓN ---
// Se eliminó el prefijo duplicado '/api'
// ======================================================
router.get('/brands', async (req, res) => {
  console.log('GET /api/brands -> Consultando lista de marcas...');
// ======================================================
// --- FIN DE CORRECCIÓN ---
// ======================================================
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
router.post('/queries', async (req, res) => {
  console.log('POST /api/queries -> Guardando consulta en DB...');
  try {
    const queryData = req.body;
    const result = await controllers.saveProtheusQuery(queryData, MOCK_USER_ID);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/queries:', error);
    res.status(500).json({ message: 'Error al enviar la consulta.' });
  }
});

// (NUEVO) Usamos el middleware 'upload' importado
router.post('/upload-voucher', upload.single('voucherFile'), async (req, res) => {
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
    
    const result = await controllers.saveProtheusVoucher(fileInfo, MOCK_USER_ID);
    res.json({ success: true, fileInfo: result });

  } catch (error) {
    console.error('Error en /api/upload-voucher:', error);
    res.status(500).json({ message: 'Error al procesar el archivo.' });
  }
});

module.exports = router;