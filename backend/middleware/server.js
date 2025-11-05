/*
* =================================================================
* SERVIDOR MIDDLEWARE (Conectado a PostgreSQL)
* =================================================================
*
* Requisitos:
* 1. npm install express cors multer pg dotenv bcryptjs
* 2. Crear archivo ".env" con las credenciales de la BD.
* 3. Haber ejecutado "setup.sql" (la nueva versión) en la DB.
*
* Para ejecutar:
* 1. node server.js
* =================================================================
*/

require('dotenv').config(); // Cargar variables de .env
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const db = require('./db'); // Importa nuestro gestor de conexión
const bcrypt = require('bcryptjs'); // (NUEVO) Para hashear contraseñas

const app = express();
const PORT = 3001;

// --- Configuración ---
app.use(cors());
app.use(express.json());

// Configuración de Multer (sin cambios)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// =================================================================
// --- LÓGICA DE BASE DE DATOS (Reemplaza las simulaciones) ---
// =================================================================

// --- Autenticación ---
const authenticateProtheusUser = async (username, password) => {
  // (ACTUALIZADO) Ahora busca por username
  const result = await db.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) {
    // Usuario no encontrado
    return { success: false, message: 'Usuario o contraseña incorrectos.' };
  }
  
  const user = result.rows[0];

  // (ACTUALIZADO) Compara la contraseña enviada con el hash en la BD
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (isPasswordValid) {
    return { success: true, user: { name: user.company_name, code: user.username, id: user.id } };
  }
  
  return { success: false, message: 'Usuario o contraseña incorrectos.' };
};

// (NUEVO) --- Registro de Usuario ---
const registerProtheusUser = async (username, password, companyName) => {
  // 1. Verificar si el usuario ya existe
  const existingUser = await db.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  
  if (existingUser.rows.length > 0) {
    throw new Error('El nombre de usuario ya está registrado.');
  }

  // 2. Hashear la contraseña
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Insertar el nuevo usuario
  const result = await db.query(
    'INSERT INTO users (username, password_hash, company_name) VALUES ($1, $2, $3) RETURNING id, username, company_name',
    [username, passwordHash, companyName]
  );

  return result.rows[0];
};


// --- Cuenta Corriente ---
const fetchProtheusBalance = async (userId) => {
  // Calculamos el balance sumando débitos y restando créditos
  // NOTA: Esto asume que el saldo es (CREDITOS - DEBITOS). Ajusta la lógica a tu necesidad.
  const result = await db.query(
    'SELECT SUM(credit) - SUM(debit) as total FROM account_movements WHERE user_id = $1',
    [userId]
  );
  const balance = result.rows[0].total || 0;

  // Simulación de disponible y pendiente (requeriría lógica más compleja)
  return {
    total: formatCurrency(balance),
    available: formatCurrency(balance * 0.33), // Simulación
    pending: formatCurrency(balance * 0.67)  // Simulación
  };
};

const fetchProtheusMovements = async (userId) => {
  const result = await db.query(
    'SELECT id, move_date, description, debit, credit FROM account_movements WHERE user_id = $1 ORDER BY move_date DESC',
    [userId]
  );
  // Formatear datos para el frontend
  return result.rows.map(row => ({
    id: row.id,
    date: new Date(row.move_date).toLocaleDateString('es-AR'),
    description: row.description,
    debit: row.debit > 0 ? formatCurrency(row.debit) : '',
    credit: row.credit > 0 ? formatCurrency(row.credit) : ''
  }));
};

// --- Pedidos ---
const fetchProtheusOrders = async (userId) => {
  const result = await db.query(
    'SELECT id, order_date, total_amount, status FROM orders WHERE user_id = $1 ORDER BY order_date DESC',
    [userId]
  );
  return result.rows.map(row => ({
    id: row.id,
    date: new Date(row.order_date).toLocaleDateString('es-AR'),
    total: formatCurrency(row.total_amount),
    status: row.status
  }));
};

const saveProtheusOrder = async (orderData, userId) => {
  // En un proyecto real, esto debe ser una TRANSACCIÓN
  // 1. Insertar en 'orders'
  const orderResult = await db.query(
    'INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id',
    [userId, orderData.total, 'Pendiente']
  );
  const newOrderId = orderResult.rows[0].id;

  // 2. Insertar cada item en 'order_items'
  for (const item of orderData.items) {
    await db.query(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
      [newOrderId, item.id, item.quantity, item.price]
    );
    // (Opcional) Actualizar stock en la tabla 'products'
    // await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.id]);
  }
  
  return { success: true, orderId: newOrderId };
};


// --- Productos y Ofertas ---
const fetchProtheusProducts = async () => {
  const result = await db.query('SELECT id, name, brand, price, stock FROM products ORDER BY name');
  // Devuelve los datos crudos, el frontend (NewOrderPage) ya sabe formatearlos
  return result.rows.map(row => ({ ...row, price: Number(row.price), stock: Number(row.stock) }));
};

const fetchProtheusOffers = async () => {
  const result = await db.query('SELECT * FROM offers ORDER BY id');
  return result.rows;
};

// --- Consultas y Carga de Archivos ---
const saveProtheusQuery = async (queryData, userId) => {
  const result = await db.query(
    'INSERT INTO queries (user_id, subject, message) VALUES ($1, $2, $3) RETURNING id',
    [userId, queryData.subject, queryData.message]
  );
  return { success: true, ticketId: result.rows[0].id };
};

const saveProtheusVoucher = async (fileInfo, userId) => {
  const result = await db.query(
    'INSERT INTO vouchers (user_id, filename, original_name, path) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, fileInfo.filename, fileInfo.originalName, fileInfo.path]
  );
  return { success: true, fileRef: result.rows[0].id };
};

// --- Helper ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount || 0);
};

// =================================================================
// --- ENDPOINTS DE TU API (Ahora usan la BD) ---
// =================================================================
// NOTA: En una app real, el userId vendría de un Token (JWT)
// Por ahora, simulamos que es el 'user_id = 1'
const MOCK_USER_ID = 1;

// --- Autenticación ---
app.post('/api/login', async (req, res) => {
  console.log('POST /api/login -> Autenticando contra DB...');
  try {
    const { username, password } = req.body;
    const result = await authenticateProtheusUser(username, password);
    if (result.success) {
      // En una app real, aquí se generaría un JWT
      res.json(result);
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error en /api/login:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// (NUEVO) --- Registro ---
app.post('/api/register', async (req, res) => {
  console.log('POST /api/register -> Registrando nuevo usuario en DB...');
  try {
    const { username, password, companyName } = req.body;

    if (!username || !password || !companyName) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    const newUser = await registerProtheusUser(username, password, companyName);
    res.status(201).json({ success: true, user: newUser });

  } catch (error) {
    console.error('Error en /api/register:', error);
    // Manejar error de usuario duplicado
    if (error.message.includes('ya está registrado')) {
      return res.status(409).json({ message: error.message }); // 409 Conflict
    }
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});


// --- Cuenta Corriente ---
app.get('/api/balance', async (req, res) => {
  console.log('GET /api/balance -> Consultando saldo en DB...');
  try {
    const balanceData = await fetchProtheusBalance(MOCK_USER_ID);
    res.json(balanceData);
  } catch (error) {
    console.error('Error en /api/balance:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

app.get('/api/movements', async (req, res) => {
  console.log('GET /api/movements -> Consultando movimientos en DB...');
  try {
    const movementsData = await fetchProtheusMovements(MOCK_USER_ID);
    res.json(movementsData);
  } catch (error) {
    console.error('Error en /api/movements:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// --- Pedidos ---
app.get('/api/orders', async (req, res) => {
  console.log('GET /api/orders -> Consultando pedidos en DB...');
  try {
    const orders = await fetchProtheusOrders(MOCK_USER_ID);
    res.json(orders);
  } catch (error) {
    console.error('Error en /api/orders:', error);
    res.status(500).json({ message: 'Error al obtener pedidos.' });
  }
});

app.post('/api/orders', async (req, res) => {
  console.log('POST /api/orders -> Guardando nuevo pedido en DB...');
  try {
    const orderData = req.body;
    const result = await saveProtheusOrder(orderData, MOCK_USER_ID);
    res.json(result);
  } catch (error) {
    console.error('Error en POST /api/orders:', error);
    res.status(500).json({ message: 'Error al guardar el pedido.' });
  }
});

// --- Productos y Ofertas ---
app.get('/api/products', async (req, res) => {
  console.log('GET /api/products -> Consultando productos en DB...');
  try {
    const products = await fetchProtheusProducts();
    res.json(products);
  } catch (error) {
    console.error('Error en /api/products:', error);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
});

app.get('/api/offers', async (req, res) => {
  console.log('GET /api/offers -> Consultando ofertas en DB...');
  try {
    const offers = await fetchProtheusOffers();
    res.json(offers);
  } catch (error) {
    console.error('Error en /api/offers:', error);
    res.status(500).json({ message: 'Error al obtener ofertas.' });
  }
});

// --- Consultas y Carga de Archivos ---
app.post('/api/queries', async (req, res) => {
  console.log('POST /api/queries -> Guardando consulta en DB...');
  try {
    const queryData = req.body;
    const result = await saveProtheusQuery(queryData, MOCK_USER_ID);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/queries:', error);
    res.status(500).json({ message: 'Error al enviar la consulta.' });
  }
});

app.post('/api/upload-voucher', upload.single('voucherFile'), async (req, res) => {
  console.log('POST /api/upload-voucher -> Archivo recibido, guardando en DB...');
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo.' });
    }
    
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
    };
    
    const result = await saveProtheusVoucher(fileInfo, MOCK_USER_ID);
    res.json({ success: true, fileInfo: result });

  } catch (error) {
    console.error('Error en /api/upload-voucher:', error);
    res.status(500).json({ message: 'Error al procesar el archivo.' });
  }
});

// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Servidor Middleware (Conectado a PostgreSQL)`);
  console.log(`  Escuchando en http://localhost:${PORT}`);
  console.log(`=======================================================`);
});