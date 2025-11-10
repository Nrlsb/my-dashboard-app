// (NUEVO) Se añaden los imports que faltaban en el diff
const pool = require('./db');
const bcrypt = require('bcryptjs');
const { formatCurrency } = require('./utils/helpers'); // (NUEVO) Importar helper

// =================================================================
// --- Autenticación y Registro ---
// =================================================================

const authenticateProtheusUser = async (email, password) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    // Usuario no encontrado
    throw new Error('Credenciales inválidas');
  }
  
  const user = result.rows[0];

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (isPasswordValid) {
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
  
  throw new Error('Credenciales inválidas');
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

// (NUEVO) --- Perfil de Usuario ---
const getProfile = async (userId) => {
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
      FROM users WHERE id = $1`, 
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Perfil de usuario no encontrado.');
    }
    
    return result.rows[0];
};

const updateProfile = async (userId, profileData) => {
    const {
      A1_NOME, // -> full_name
      A1_COD,  // -> a1_cod
      A1_LOJA, // -> a1_loja
      A1_CGC,  // -> a1_cgc
      A1_NUMBER, // -> a1_tel
      A1_END,  // -> a1_endereco
      A1_EMAIL // -> email
    } = profileData;

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
    
    const queryParams = [
      A1_NOME, A1_COD, A1_LOJA, A1_CGC, A1_NUMBER, 
      A1_END, A1_EMAIL,
      userId // El ID del usuario a actualizar
    ];

    await pool.query(queryText, queryParams);
    
    return { success: true, message: 'Perfil actualizado correctamente.' };
};


// (MODIFICADO) Esta función debe estar ANTES de fetchProtheusBalance
const fetchProtheusMovements = async (userId) => {
  // (ACTUALIZADO) Usa 'pool' y la columna 'date' de setup.sql
  const result = await pool.query(
    'SELECT id, date, description, debit, credit FROM account_movements WHERE user_id = $1 ORDER BY date DESC',
    [userId]
  );
  // Formatear datos para el frontend
  return result.rows.map(row => ({
    id: row.id,
    fecha: row.date, // (Corregido) Devolvemos la fecha sin formatear
    tipo: row.description.includes('Pedido') ? 'Factura' : 'Pago', // Simulación de tipo
    comprobante: row.description,
    importe: row.credit > 0 ? row.credit : -row.debit // (Corregido) Devolvemos el número
  }));
};

// --- Cuenta Corriente ---
// (MODIFICADO) Ahora esta función busca balance Y movimientos
const fetchProtheusBalance = async (userId) => {
  
  // 1. Obtener el balance (lógica existente)
  const balanceResult = await pool.query(
    'SELECT SUM(credit) - SUM(debit) as total FROM account_movements WHERE user_id = $1',
    [userId]
  );
  const totalBalance = balanceResult.rows[0].total || 0;

  const balance = {
    total: Number(totalBalance),
    available: Number(totalBalance) * 0.33, // Simulación
    pending: Number(totalBalance) * 0.67  // Simulación
  };

  // 2. Obtener los movimientos (llamando a la otra función)
  const movements = await fetchProtheusMovements(userId);
  
  // 3. Devolver el objeto combinado que espera el frontend
  return {
    balance: balance,
    movements: movements
  };
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
    nro_pedido: row.id, // (NUEVO) Mapeo para el frontend
    fecha: row.created_at, // (NUEVO) Devolvemos la fecha real
    total: row.total, // (NUEVO) Devolvemos el número real
    estado: row.status, // (NUEVO) Mapeo para el frontend
    // 'date' y 'status' son para la versión anterior
    date: new Date(row.created_at).toLocaleDateString('es-AR'), // 'created_at' en lugar de 'order_date'
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
    
    // (NUEVO) 3. Si es un pedido de venta (no un presupuesto), reflejar en la cuenta corriente
    if (orderData.type === 'order') {
      console.log(`Reflejando Pedido #${newOrderId} en Cta. Cte. (Débito: ${orderData.total})`);
      
      const movementQuery = `
        INSERT INTO account_movements (user_id, date, description, debit, credit, order_ref)
        VALUES ($1, CURRENT_TIMESTAMP, $2, $3, 0, $4)
      `;
      const movementParams = [
        userId,
        `Pedido de Venta #${newOrderId}`, // Descripción del movimiento
        orderData.total, // El total del pedido va como un débito
        newOrderId       // Referencia al pedido que lo generó
      ];
      
      await client.query(movementQuery, movementParams);
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
  
  // (CORREGIDO) Se añaden capacity y capacity_description
  const queryText = `
    SELECT id, code, description, product_group, price, brand, capacity, capacity_description
    FROM products 
    WHERE ${whereString} 
    ORDER BY description
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await pool.query(queryText, params);

  // (CORREGIDO) Mapeo para el frontend
  const products = result.rows.map(row => ({ 
    id: row.id,
    code: row.code,
    name: row.description,
    brand: row.brand,
    product_group: row.product_group,
    price: Number(row.price),
    capacity: row.capacity, // (NUEVO)
    capacity_description: row.capacity_description, // (NUEVO)
    stock: 999 // MOCK
  }));
  
  // Devolvemos tanto los productos de esta página como el total
  return { products, totalProducts };
};

// --- (NUEVA FUNCIÓN) ---
// Obtiene los detalles de un solo producto por su ID
const fetchProductDetails = async (productId) => {
  // Asegurarnos de que el ID es un número para evitar inyección SQL
  const id = parseInt(productId, 10);
  if (isNaN(id)) {
    throw new Error('ID de producto inválido.');
  }

  const queryText = `
    SELECT id, code, description, product_group, price, brand, capacity, capacity_description
    FROM products 
    WHERE id = $1
  `;
  const result = await pool.query(queryText, [id]);

  if (result.rows.length === 0) {
    return null; // Opcionalmente: throw new Error('Producto no encontrado');
  }
  
  // Mapeamos los nombres de columna a los nombres que espera el frontend
  const row = result.rows[0];
  return {
    id: row.id,
    code: row.code,
    name: row.description,
    brand: row.brand,
    product_group: row.product_group,
    price: Number(row.price),
    capacity: row.capacity,
    capacity_description: row.capacity_description,
    stock: 999 // MOCK
  };
};
// --- (FIN NUEVA FUNCIÓN) ---


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

// (NUEVO) Exportar todas las funciones
module.exports = {
  authenticateProtheusUser,
  registerProtheusUser,
  getProfile,
  updateProfile,
  fetchProtheusBalance,
  fetchProtheusMovements,
  fetchProtheusOrders,
  fetchProtheusOrderDetails,
  saveProtheusOrder,
  fetchProtheusProducts,
  fetchProductDetails, // <-- Exportar la nueva función
  fetchProtheusBrands,
  fetchProtheusOffers,
  saveProtheusQuery,
  saveProtheusVoucher
};