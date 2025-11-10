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
// FIX 1: Importar { pool } correctamente
const { pool } = require('./db'); // Importa nuestro GESTOR DE CONEXIÓN
const bcrypt = require('bcryptjs'); // Para hashear contraseñas

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
// --- LÓGICA DE BASE DE DATOS (Sincronizada con setup.sql) ---
// =================================================================

// --- Autenticación ---
const authenticateProtheusUser = async (email, password) => {
  // (ACTUALIZADO) Usa 'pool' y busca por 'email'
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    // Usuario no encontrado
    return { success: false, message: 'Email o contraseña incorrectos.' };
  }
  
  const user = result.rows[0];

  // (ACTUALIZADO) Compara la contraseña enviada con el hash en la BD
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (isPasswordValid) {
    // (ACTUALIZADO) Devuelve 'full_name' de tu nueva tabla
    return { 
      success: true, 
      user: { 
        name: user.full_name, // Mapeado desde 'full_name'
        code: user.a1_cod,   // Mapeado desde 'a1_cod'
        email: user.email,
        id: user.id 
      } 
    };
  }
  
  return { success: false, message: 'Email o contraseña incorrectos.' };
};

// (ACTUALIZADO) --- Registro de Usuario ---
const registerProtheusUser = async (userData) => {
  const {
    nombre, // El frontend debe enviar 'nombre'
    email, 
    password
  } = userData;

  // 1. Verificar si el email ya existe
  const existingUser = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  
  if (existingUser.rows.length > 0) {
    throw new Error('El email ya está registrado.');
  }

  // 2. Hashear la contraseña
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Insertar el nuevo usuario (alineado con setup.sql)
  const queryText = `
    INSERT INTO users (
      full_name, email, password_hash
    ) VALUES (
      $1, $2, $3
    ) RETURNING id, email, full_name
  `;
  
  const queryParams = [
    nombre, email, passwordHash
  ];

  const result = await pool.query(queryText, queryParams);

  return result.rows[0];
};


// --- Cuenta Corriente ---
const fetchProtheusBalance = async (userId) => {
  // (ACTUALIZADO) Usa 'pool'. La lógica SQL era correcta.
  const result = await pool.query(
    'SELECT SUM(credit) - SUM(debit) as total FROM account_movements WHERE user_id = $1',
    [userId]
  );
  const balance = result.rows[0].total || 0;

  // Simulación de disponible y pendiente
  return {
    total: formatCurrency(balance),
    available: formatCurrency(balance * 0.33), // Simulación
    pending: formatCurrency(balance * 0.67)  // Simulación
  };
};

const fetchProtheusMovements = async (userId) => {
  // (ACTUALIZADO) Usa 'pool' y la columna 'date' de setup.sql
  const result = await pool.query(
    'SELECT id, date, description, debit, credit FROM account_movements WHERE user_id = $1 ORDER BY date DESC',
    [userId]
  );
  // Formatear datos para el frontend
  return result.rows.map(row => ({
    id: row.id,
    date: new Date(row.date).toLocaleDateString('es-AR'), // 'date' en lugar de 'move_date'
    description: row.description,
    debit: row.debit > 0 ? formatCurrency(row.debit) : '',
    credit: row.credit > 0 ? formatCurrency(row.credit) : ''
  }));
};

// --- Pedidos ---
const fetchProtheusOrders = async (userId) => {
  // (ACTUALIZADO) Usa 'pool' y columnas 'created_at', 'total'
  const result = await pool.query(
    'SELECT id, created_at, total, status FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows.map(row => ({
    id: row.id,
    date: new Date(row.created_at).toLocaleDateString('es-AR'), // 'created_at' en lugar de 'order_date'
    total: formatCurrency(row.total), // 'total' en lugar de 'total_amount'
    status: row.status
  }));
};

// (ACTUALIZADO) --- Lógica para buscar detalles de UN pedido ---
const fetchProtheusOrderDetails = async (orderId, userId) => {
  // 1. Obtener la orden principal
  const orderResult = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, userId]
  );

  if (orderResult.rows.length === 0) {
    throw new Error('Pedido no encontrado o no pertenece al usuario.');
  }
  
  const order = orderResult.rows[0];

  // 2. Obtener los items del pedido (uniendo con products para obtener el nombre)
  const itemsQuery = `
    SELECT 
      oi.quantity, 
      oi.unit_price, 
      p.id AS product_id, 
      p.code AS product_code,
      p.description AS product_name,
      p.brand AS product_brand
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
    ORDER BY p.description;
  `;
  const itemsResult = await pool.query(itemsQuery, [orderId]);

  // 3. Formatear y devolver
  return {
    ...order,
    total_amount: order.total, // Asegurarnos de que el frontend reciba lo que espera
    date: new Date(order.created_at).toLocaleDateString('es-AR'), // 'created_at'
    items: itemsResult.rows.map(item => ({
      ...item,
      price: Number(item.unit_price), // 'unit_price'
      quantity: Number(item.quantity)
    }))
  };
};


const saveProtheusOrder = async (orderData, userId) => {
  // (ACTUALIZADO) Esta función ahora debe ser una TRANSACCIÓN
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // (ACTUALIZADO) Determinar el estado basado en el tipo de solicitud
    const orderStatus = orderData.type === 'quote' ? 'Cotizado' : 'Pendiente';

    // 1. Insertar en 'orders' (usando 'total')
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id',
      [userId, orderData.total, orderStatus]
    );
    const newOrderId = orderResult.rows[0].id;

    // 2. Insertar cada item en 'order_items' (usando 'unit_price' y 'product_code')
    for (const item of orderData.items) {
      // Asumimos que el frontend envía 'id', 'code', 'quantity' y 'price'
      await client.query(
        'INSERT INTO order_items (order_id, product_id, product_code, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
        [newOrderId, item.id, item.code, item.quantity, item.price]
      );
    }
    
    await client.query('COMMIT');
    return { success: true, orderId: newOrderId };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error; // Propagar el error
  } finally {
    client.release();
  }
};


// --- Productos y Ofertas ---
// (NUEVO) fetchProtheusProducts ahora acepta paginación y filtros
const fetchProtheusProducts = async (page = 1, limit = 20, search = '', brand = '') => {
  // Convertir a números para seguridad
  const numLimit = parseInt(limit, 10);
  const numPage = parseInt(page, 10);
  const offset = (numPage - 1) * numLimit;

  // --- 1. Construir consulta dinámica ---
  let whereClauses = ["price IS NOT NULL", "price >= $1"];
  let params = [400]; // Empezamos con el precio base

  // Añadir filtro de marca (brand) si existe
  if (brand) {
    params.push(brand);
    whereClauses.push(`brand = $${params.length}`);
  }

  // Añadir filtro de búsqueda (search) si existe
  if (search) {
    const searchTerms = search.toLowerCase().split(' ').filter(t => t);
    if (searchTerms.length > 0) {
      const searchClauses = searchTerms.map(term => {
        params.push(`%${term}%`);
        const paramIndex = params.length;
        // Buscamos en 'description' (nombre) y 'code' (código)
        // Usamos ILIKE para que sea insensible a mayúsculas/minúsculas
        return `(description ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      });
      whereClauses.push(`(${searchClauses.join(' AND ')})`);
    }
  }

  const whereString = whereClauses.join(' AND ');

  // --- 2. Consulta para obtener el TOTAL de productos (para paginación) ---
  const totalQueryText = `SELECT COUNT(*) FROM products WHERE ${whereString}`;
  const totalResult = await pool.query(totalQueryText, params);
  const totalProducts = parseInt(totalResult.rows[0].count, 10);

  // --- 3. Consulta para obtener los productos de la PÁGINA actual ---
  params.push(numLimit);
  params.push(offset);
  
  const queryText = `
    SELECT id, code, description, product_group, price, brand 
    FROM products 
    WHERE ${whereString} 
    ORDER BY description
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await pool.query(queryText, params);

  // (ACTUALIZADO) Mapeo para el frontend
  const products = result.rows.map(row => ({ 
    id: row.id,
    code: row.code,
    name: row.description,
    brand: row.brand, // <-- FIX: Ahora usamos la columna 'brand' (el nombre)
    product_group: row.product_group, // Enviamos el código de grupo también
    price: Number(row.price),
    stock: 999 // MOCK
  }));
  
  // Devolvemos tanto los productos de esta página como el total
  return { products, totalProducts };
};

// (NUEVO) Endpoint para obtener solo las marcas (para el dropdown)
const fetchProtheusBrands = async () => {
  const queryText = `
    SELECT DISTINCT brand 
    FROM products 
    WHERE brand IS NOT NULL AND brand != '' 
    ORDER BY brand ASC
  `;
  const result = await pool.query(queryText);
  return result.rows.map(row => row.brand); // Devuelve un array de strings, ej: ['ALBA', 'NORTON', 'TERSUAVE']
};


const fetchProtheusOffers = async () => {
  // (ACTUALIZADO) MOCK: setup.sql no tiene tabla 'offers'
  console.warn("fetchProtheusOffers: No hay tabla 'offers' en setup.sql. Devolviendo array vacío.");
  return []; 
};

// --- Consultas y Carga de Archivos ---
const saveProtheusQuery = async (queryData, userId) => {
  // (ACTUALIZADO) Usa 'pool'. La consulta es correcta.
  const result = await pool.query(
    'INSERT INTO queries (user_id, subject, message) VALUES ($1, $2, $3) RETURNING id',
    [userId, queryData.subject, queryData.message]
  );
  return { success: true, ticketId: result.rows[0].id };
};

const saveProtheusVoucher = async (fileInfo, userId) => {
  // (ACTUALIZADO) Usa 'pool' e inserta todos los datos de setup.sql
  const queryText = `
    INSERT INTO vouchers (user_id, file_path, original_name, mime_type, file_size) 
    VALUES ($1, $2, $3, $4, $5) RETURNING id
  `;
  const queryParams = [
    userId, 
    fileInfo.path, 
    fileInfo.originalName, 
    fileInfo.mimeType, // Nuevo
    fileInfo.size      // Nuevo
  ];
  const result = await pool.query(queryText, queryParams);
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
// --- ENDPOINTS DE TU API (Ahora usan 'pool' y SQL corregido) ---
// =================================================================
// NOTA: En una app real, el userId vendría de un Token (JWT)
// Por ahora, simulamos que es el 'user_id = 1'
const MOCK_USER_ID = 1;

// --- Autenticación ---
app.post('/api/login', async (req, res) => {
  console.log('POST /api/login -> Autenticando contra DB...');
  try {
    const { email, password } = req.body;
    const result = await authenticateProtheusUser(email, password);
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

// (ACTUALIZADO) --- Registro ---
app.post('/api/register', async (req, res) => {
  console.log('POST /api/register -> Registrando nuevo usuario en DB...');
  try {
    // (ACTUALIZADO) El frontend debe enviar 'nombre'
    const { nombre, email, password } = req.body;

    // Validación simple de campos obligatorios
    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
    }

    const newUser = await registerProtheusUser(req.body);
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


// (ACTUALIZADO) --- Endpoints de Perfil (Alineados con setup.sql) ---
// GET: Obtener los datos actuales del perfil
app.get('/api/profile', async (req, res) => {
  console.log('GET /api/profile -> Consultando perfil de usuario en DB...');
  try {
    // NOTA: Usamos MOCK_USER_ID (1)
    // (ACTUALIZADO) Se usan alias (AS) para enviar las claves A1_... al frontend
    // Se mapean las columnas que SÍ existen en setup.sql
    const result = await pool.query(
      `SELECT 
        id, email, full_name,
        a1_cod AS "A1_COD",
        a1_loja AS "A1_LOJA",
        full_name AS "A1_NOME",
        a1_cgc AS "A1_CGC",
        a1_tel AS "A1_NUMBER",
        a1_endereco AS "A1_END",
        email AS "A1_EMAIL"
        -- Campos del frontend que NO ESTÁN en setup.sql:
        -- A1_PESSOA, A1_NREDUZ, A1_MUN, A1_EST, A1_TIPO, A1_AFIP, estatus, di
      FROM users WHERE id = $1`, 
      [MOCK_USER_ID]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error en /api/profile (GET):', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// PUT: Actualizar los datos del perfil
app.put('/api/profile', async (req, res) => {
  console.log('PUT /api/profile -> Actualizando perfil en DB...');
  try {
    // NOTA: Usamos MOCK_USER_ID (1)
    // (ACTUALIZADO) Se destructuran las claves A1_... que SÍ existen en setup.sql
    const {
      A1_NOME, // -> full_name
      A1_COD,  // -> a1_cod
      A1_LOJA, // -> a1_loja
      A1_CGC,  // -> a1_cgc
      A1_NUMBER, // -> a1_tel
      A1_END,  // -> a1_endereco
      A1_EMAIL // -> email
      // Ignoramos las otras claves (A1_PESSOA, A1_MUN, etc.) ya que no hay columna
    } = req.body;

    // (ACTUALIZADO) El query usa los nombres de columna de setup.sql
    const queryText = `
      UPDATE users SET
        full_name = $1,
        a1_cod = $2,
        a1_loja = $3,
        a1_cgc = $4,
        a1_tel = $5,
        a1_endereco = $6,
        email = $7
      WHERE id = $8
    `;
    
    // (ACTUALIZADO) Se pasan las variables A1_... en el orden correcto
    const queryParams = [
      A1_NOME, A1_COD, A1_LOJA, A1_CGC, A1_NUMBER, 
      A1_END, A1_EMAIL,
      MOCK_USER_ID // El ID del usuario a actualizar
    ];

    await pool.query(queryText, queryParams);
    
    res.json({ success: true, message: 'Perfil actualizado correctamente.' });

  } catch (error) {
    console.error('Error en /api/profile (PUT):', error);
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

// (ACTUALIZADO) --- Endpoint para UN pedido específico ---
app.get('/api/orders/:id', async (req, res) => {
  console.log(`GET /api/orders/${req.params.id} -> Consultando detalles en DB...`);
  try {
    const orderId = req.params.id;
    const orderDetails = await fetchProtheusOrderDetails(orderId, MOCK_USER_ID);
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


app.post('/api/orders', async (req, res) => {
  console.log('POST /api/orders -> Guardando nuevo pedido/presupuesto en DB...');
  try {
    const orderData = req.body; // Esto ahora incluye { items, total, type }
    const result = await saveProtheusOrder(orderData, MOCK_USER_ID);
    res.json(result);
  } catch (error) {
    console.error('Error en POST /api/orders:', error);
    res.status(500).json({ message: 'Error al guardar el pedido.' });
  }
});

// --- Productos y Ofertas ---
// (ACTUALIZADO) Endpoint de Productos: ahora acepta paginación y filtros
app.get('/api/products', async (req, res) => {
  console.log('GET /api/products -> Consultando productos en DB (paginado)...');
  try {
    const { page = 1, limit = 20, search = '', brand = '' } = req.query;
    // Pasamos los filtros del query a la función de lógica
    const data = await fetchProtheusProducts(page, limit, search, brand);
    res.json(data); // Devuelve { products: [...], totalProducts: X }
  } catch (error) {
    console.error('Error en /api/products:', error);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
});

// (NUEVO) Endpoint de Marcas
app.get('/api/brands', async (req, res) => {
  console.log('GET /api/brands -> Consultando lista de marcas...');
  try {
    const brands = await fetchProtheusBrands();
    res.json(brands);
  } catch (error) {
    console.error('Error en /api/brands:', error);
    res.status(500).json({ message: 'Error al obtener marcas.' });
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
    
    // (ACTUALIZADO) Capturamos todos los datos del archivo
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimeType: req.file.mimetype, // Nuevo
      size: req.file.size         // Nuevo
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
  console.log(`   Servidor Middleware (Conectado a PostgreSQL)`);
  console.log(`   Escuchando en http://localhost:${PORT}`);
  console.log(`=======================================================`);
});