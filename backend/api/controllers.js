// (NUEVO) Se añaden los imports que faltaban en el diff
const pool = require('./db');
const bcrypt = require('bcryptjs');
const { formatCurrency } = require('./utils/helpers'); // (NUEVO) Importar helper
// (IMPORTADO) Módulos para manejo de archivos CSV
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

// =================================================================
// --- Autenticación y Registro ---
// =================================================================

const authenticateProtheusUser = async (email, password) => {
  const result = await pool.query(
    // (MODIFICADO) Seleccionamos el nuevo campo is_admin
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    // Usuario no encontrado
    throw new Error('Credenciales inválidas');
  }

  const user = result.rows[0];

  // Asumiendo que el campo de la BD es 'a1_password_hash' o 'password_hash'
  const isPasswordValid = await bcrypt.compare(password, user.a1_password_hash || user.password_hash); 

  if (isPasswordValid) {
    return { 
      success: true, 
      user: {
        name: user.a1_nombre || user.full_name, // Mapeado desde el campo de nombre que exista
        code: user.a1_cod,   
        email: user.a1_email || user.email,
        id: user.id,
        is_admin: user.is_admin 
      } 
    };
  }

  throw new Error('Credenciales inválidas');
};

// (ACTUALIZADO) --- Registro de Usuario ---
const registerProtheusUser = async (userData) => {
  const {
    nombre, 
    email, 
    password
  } = userData;

  // 1. Verificar si el email ya existe
  const existingUser = await pool.query(
    'SELECT * FROM users WHERE a1_email = $1 OR email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('El email ya está registrado.');
  }

  // 2. Hashear la contraseña
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Insertar el nuevo usuario
  // Se usan los campos 'compatibles' con setup.sql
  const queryText = `
    INSERT INTO users (
      a1_nombre, a1_email, a1_password_hash, a1_cod, a1_loja
    ) VALUES (
      $1, $2, $3, $4, $5
    ) RETURNING id, a1_email AS email, a1_nombre AS full_name, is_admin
  `;
  
  // Usamos un código de cliente y loja por defecto para la simulación
  const defaultCod = '000101'; // Debería ser autogenerado o validado
  const defaultLoja = '01'; 

  const queryParams = [
    nombre, email, passwordHash, defaultCod, defaultLoja
  ];

  const result = await pool.query(queryText, queryParams);
  return result.rows[0];
};

// (NUEVO) --- Perfil de Usuario ---
const getProfile = async (userId) => {
  const result = await pool.query(
      `SELECT 
        id, a1_email AS email, a1_nombre AS full_name,
        a1_cod AS "A1_COD",
        a1_loja AS "A1_LOJA",
        a1_nombre AS "A1_NOME",
        a1_cuit AS "A1_CGC",
        a1_tel AS "A1_NUMBER",
        a1_end AS "A1_END",
        a1_email AS "A1_EMAIL",
        is_admin
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
      A1_NOME, 
      A1_COD,  
      A1_LOJA, 
      A1_CGC,  
      A1_NUMBER, 
      A1_END,  
      A1_EMAIL 
    } = profileData;

    const queryText = `
      UPDATE users SET
        a1_nombre = $1,
        a1_cod = $2,
        a1_loja = $3,
        a1_cuit = $4,
        a1_tel = $5,
        a1_end = $6,
        a1_email = $7
      WHERE id = $8
      RETURNING *
    `;

    const queryParams = [
      A1_NOME, A1_COD, A1_LOJA, A1_CGC, A1_NUMBER, 
      A1_END, A1_EMAIL,
      userId
    ];

    await pool.query(queryText, queryParams);

    return { success: true, message: 'Perfil actualizado correctamente.' };
};


// (EXISTENTE) --- Cuenta Corriente: Movimientos ---
const fetchProtheusMovements = async (userId) => {
  const result = await pool.query(
    'SELECT id, movement_date, document_type, document_number, debe, haber, pending_balance FROM account_movements WHERE user_id = $1 ORDER BY movement_date DESC',
    [userId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    fecha: row.movement_date, 
    tipo: row.document_type,
    comprobante: row.document_number,
    // (CORREGIDO): importe se calcula como haber - debe para reflejar saldo
    importe: row.haber > 0 ? row.haber : -row.debe 
  }));
};

// (EXISTENTE) --- Cuenta Corriente: Balance y Movimientos ---
const fetchProtheusBalance = async (userId) => {
  
  const balanceResult = await pool.query(
    'SELECT SUM(haber) - SUM(debe) as total FROM account_movements WHERE user_id = $1',
    [userId]
  );
  const totalBalance = balanceResult.rows[0].total || 0;

  // Simulación: disponible es el total si es positivo. Pendiente es el débito sin pagar.
  const balance = {
    total: Number(totalBalance),
    disponible: Number(totalBalance) > 0 ? Number(totalBalance) : 0, 
    pendiente: Number(totalBalance) < 0 ? -Number(totalBalance) : 0 
  };

  const movements = await fetchProtheusMovements(userId);
  
  return {
    balance: balance,
    movements: movements
  };
};

// (EXISTENTE) --- Buscar Facturas de Cliente por A1_COD ---
const fetchCustomerInvoices = async (customerCod) => {
  const userResult = await pool.query('SELECT id FROM users WHERE a1_cod = $1', [customerCod]);
  if (userResult.rows.length === 0) {
    throw new Error('El Nº de Cliente (A1_COD) no existe.');
  }
  const userId = userResult.rows[0].id;

  const result = await pool.query(
    `SELECT 
        id, 
        movement_date AS date, 
        document_number AS comprobante, 
        debe AS importe, 
        (SELECT order_id FROM orders WHERE orders.order_ref = account_movements.document_number LIMIT 1) AS order_ref
     FROM account_movements 
     WHERE user_id = $1 AND document_type = 'FC'
     ORDER BY movement_date DESC`,
    [userId]
  );
  
  return result.rows.map(row => ({
    ...row,
    importe: Number(row.importe),
    order_ref: row.order_ref
  }));
};


// (EXISTENTE) --- Controlador para crear la nota de crédito ---
const createCreditNote = async (targetUserCod, reason, items, invoiceRefId, adminUserId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT id FROM users WHERE a1_cod = $1', [targetUserCod]);
    if (userResult.rows.length === 0) {
      throw new Error('El Nº de Cliente (A1_COD) especificado no existe.');
    }
    const targetUserId = userResult.rows[0].id;

    let totalAmount = 0;
    if (!items || items.length === 0) {
      throw new Error('No se seleccionaron productos para la nota de crédito.');
    }
    
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.unit_price) {
        throw new Error('Datos de items incompletos.');
      }
      totalAmount += parseFloat(item.quantity) * parseFloat(item.unit_price);
    }

    if (totalAmount <= 0) {
      throw new Error('El monto de la nota de crédito debe ser positivo.');
    }
    
    // 1. Crear el movimiento de CRÉDITO (haber) para el cliente
    const creditQuery = `
      INSERT INTO account_movements (user_id, movement_date, document_type, document_number, debe, haber)
      VALUES ($1, CURRENT_DATE, 'NC', $2, 0, $3)
      RETURNING id
    `;
    const creditParams = [targetUserId, `NC-${invoiceRefId}`, totalAmount];
    await client.query(creditQuery, creditParams);

    // 2. (Opcional) Crear un movimiento de DÉBITO (debe) para el admin (cuenta interna)
    const debitQuery = `
      INSERT INTO account_movements (user_id, movement_date, document_type, document_number, debe, haber)
      VALUES ($1, CURRENT_DATE, 'RE', $2, $3, 0)
    `;
    const debitParams = [adminUserId, `NC a Cliente ${targetUserCod}`, totalAmount];
    await client.query(debitQuery, debitParams);
    
    // 3. (OPCIONAL) Insertar los items de la NC en una tabla separada si fuera necesario.

    await client.query('COMMIT');
    
    return { success: true, message: 'Nota de crédito creada exitosamente.' };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en transacción de Nota de Crédito:', error.message);
    throw new Error(error.message || 'Error al crear la nota de crédito.');
  } finally {
    client.release();
  }
};


// --- Pedidos ---

const fetchProtheusOrders = async (userId) => {
  const result = await pool.query(
    'SELECT id, order_date, total_amount, status FROM orders WHERE user_id = $1 ORDER BY order_date DESC',
    [userId]
  );
  return result.rows.map(row => ({
    id: row.id,
    nro_pedido: row.id, 
    fecha: row.order_date, 
    total: row.total_amount, 
    estado: row.status, 
    date: new Date(row.order_date).toLocaleDateString('es-AR'), 
    status: row.status
  }));
};

const fetchProtheusOrderDetails = async (orderId, userId) => {
  const orderResult = await pool.query(
    'SELECT id, order_date, total_amount, status, notes FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, userId]
  );

  if (orderResult.rows.length === 0) {
    throw new Error('Pedido no encontrado o no pertenece al usuario.');
  }

  const order = orderResult.rows[0];

  const itemsQuery = `
    SELECT 
      oi.quantity, 
      oi.unit_price, 
      p.id AS product_id, 
      p.code AS product_code,
      p.description AS product_name,
      p.brand AS product_brand
    FROM order_details oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
    ORDER BY p.description;
  `;
  const itemsResult = await pool.query(itemsQuery, [orderId]);

  return {
    ...order,
    total_amount: order.total_amount, 
    date: new Date(order.order_date).toLocaleDateString('es-AR'), 
    items: itemsResult.rows.map(item => ({
      ...item,
      price: Number(item.unit_price), 
      quantity: Number(item.quantity)
    }))
  };
};

const fetchAdminOrderDetails = async (orderId) => {
  const orderResult = await pool.query(
    'SELECT id, order_date, total_amount, status, notes FROM orders WHERE id = $1',
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    throw new Error('Pedido no encontrado.');
  }

  const order = orderResult.rows[0];

  const itemsQuery = `
    SELECT 
      oi.quantity, 
      oi.unit_price, 
      p.id AS product_id, 
      p.code AS product_code,
      p.description AS product_name,
      p.brand AS product_brand
    FROM order_details oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
    ORDER BY p.description;
  `;
  const itemsResult = await pool.query(itemsQuery, [orderId]);

  return {
    ...order,
    total_amount: order.total_amount,
    date: new Date(order.order_date).toLocaleDateString('es-AR'),
    items: itemsResult.rows.map(item => ({
      ...item,
      product_name: item.product_name || 'Producto no encontrado',
      product_code: item.product_code || 'N/A',
      product_brand: item.product_brand || 'N/A',
      unit_price: Number(item.unit_price), 
      quantity: Number(item.quantity)
    }))
  };
};


const saveProtheusOrder = async (orderData, userId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const orderStatus = orderData.type === 'quote' ? 'Cotizado' : 'Pendiente';

    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total_amount, status, notes) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, orderData.total, orderStatus, orderData.notes || '']
    );
    const newOrderId = orderResult.rows[0].id;

    for (const item of orderData.items) {
      await client.query(
        'INSERT INTO order_details (order_id, product_id, product_code, product_name, product_capacity, quantity, unit_price) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          newOrderId, 
          item.id, 
          item.code, 
          item.name, 
          item.capacity_desc, // Asumiendo que el frontend pasa estos datos para el historial
          item.quantity, 
          item.price
        ]
      );
    }
    
    if (orderData.type === 'order') {
      console.log(`Reflejando Pedido #${newOrderId} en Cta. Cte. (Débito: ${orderData.total})`);
      
      // La tabla account_movements tiene document_number como NOT NULL.
      // Usaremos el ID del pedido como número de documento simulado
      const documentNumber = `PEDIDO-${newOrderId}`; 
      
      const movementQuery = `
        INSERT INTO account_movements (user_id, movement_date, document_type, document_number, debe, haber)
        VALUES ($1, CURRENT_DATE, 'FC', $2, $3, 0)
      `;
      
      const movementParams = [
        userId,
        documentNumber, 
        orderData.total
      ];
      
      await client.query(movementQuery, movementParams);
    }
    
    await client.query('COMMIT');
    return { success: true, orderId: newOrderId };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};


// --- Productos y Ofertas ---

// (MODIFICADO) Lógica para obtener productos con nuevas columnas
const fetchProtheusProducts = async (page = 1, limit = 20, search = '', brand = '') => {
  const numLimit = parseInt(limit, 10);
  const numPage = parseInt(page, 10);
  const offset = (numPage - 1) * numLimit;

  // --- 1. Construir consulta dinámica ---
  let whereClauses = ["price IS NOT NULL"];
  let params = [];

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
  
  // (*** MODIFICACIÓN CLAVE: Se añaden las 3 nuevas columnas ***)
  const queryText = `
    SELECT 
      id, code, description, brand, capacity_desc, price, stock,
      moneda AS currency, 
      cotizacion AS quote, 
      product_group 
    FROM products 
    WHERE ${whereString} 
    ORDER BY description
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await pool.query(queryText, params);

  // Mapeo para el frontend
  const products = result.rows.map(row => ({ 
    id: row.id,
    code: row.code,
    name: row.description,
    brand: row.brand,
    product_group: row.product_group,
    price: Number(row.price),
    capacity_desc: row.capacity_desc,
    stock: row.stock, // Usamos el stock real si existe, sino mock
    // (NUEVAS COLUMNAS MAPPEADAS)
    currency: row.currency,
    quote: row.quote,
  }));
  
  return { products, totalProducts };
};

// (NUEVO) Obtiene los detalles de un solo producto por su ID
const fetchProductDetails = async (productId) => {
  const id = parseInt(productId, 10);
  if (isNaN(id)) {
    throw new Error('ID de producto inválido.');
  }

  // (*** MODIFICACIÓN CLAVE: Se añaden las 3 nuevas columnas ***)
  const queryText = `
    SELECT 
      id, code, description, brand, capacity_desc, price, stock, 
      moneda AS currency, cotizacion AS quote, product_group 
    FROM products 
    WHERE id = $1
  `;
  const result = await pool.query(queryText, [id]);

  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    code: row.code,
    name: row.description,
    brand: row.brand,
    product_group: row.product_group,
    price: Number(row.price),
    capacity_desc: row.capacity_desc,
    stock: row.stock,
    currency: row.currency,
    quote: row.quote,
  };
};

// (EXISTENTE) Endpoint para obtener solo las marcas (para el dropdown)
const fetchProtheusBrands = async () => {
  const queryText = `
    SELECT DISTINCT brand 
    FROM products 
    WHERE brand IS NOT NULL AND brand != '' 
    ORDER BY brand ASC
  `;
  const result = await pool.query(queryText);
  return result.rows.map(row => row.brand);
};

const fetchProtheusOffers = async () => {
  // Simulación de ofertas
  return [
    {
      id: 1,
      titulo: 'Promo Verano 2025',
      descripcion: '30% OFF en todos los Látex de Exterior.',
      valido_hasta: new Date(Date.now() + 86400000 * 30), // Válido por 30 días
      min_compra: 50000
    },
    {
      id: 2,
      titulo: 'Esmaltes 2x1',
      descripcion: 'Compra 2 Esmaltes Sintéticos de 1Lt y paga 1.',
      valido_hasta: new Date(Date.now() + 86400000 * 15),
      min_compra: 0
    },
  ];
};

// --- Manejo de Archivos y Consultas ---

// (MODIFICADO) Lógica para la carga de CSV de lista de precios
const uploadPriceList = async (req, res) => {
  if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
  }

  const filePath = req.file.path;
  const results = [];

  try {
      fs.createReadStream(filePath)
          .pipe(csv({ 
              separator: ';',
              bom: true,
              trim: true,
              quote: '\b', 
              mapHeaders: ({ header }) => header.trim().replace(/"/g, ''),
              mapValues: ({ value }) => value.trim().replace(/"/g, '')
          }))
          .on('data', (data) => results.push(data))
          .on('end', async () => {
              const client = await pool.connect();
              try {
                  await client.query('BEGIN');
                  
                  for (const row of results) {
                      // (*** MODIFICACIÓN CLAVE: Extraer nuevas columnas ***)
                      const code = row['Cod.Producto'] || row['Codigo']; // Manejar posibles nombres de columna
                      const unit_price = row['Precio Venta'];
                      const quote = row['cotizacion'] || 1.00; // Asume el nombre de columna del CSV es 'cotizacion'
                      const currency = row['Moneda'] || 1; // Asume el nombre de columna del CSV es 'Moneda'
                      const product_group = row['product_group'] || row['Grupo']; // Asume el nombre de columna del CSV es 'product_group' o 'Grupo'

                      if (!code || !unit_price) continue; // Omitir filas sin código o precio

                      // Asegúrate de que el unit_price sea un número (reemplazando coma por punto)
                      const price = parseFloat(String(unit_price).replace(',', '.'));
                      
                      if (isNaN(price)) continue; // Omitir si no es un número válido

                      // (*** MODIFICACIÓN CLAVE: Actualizar el producto con los nuevos campos ***)
                      const updateQuery = `
                          UPDATE products 
                          SET 
                              price = $1, 
                              cotizacion = $2, 
                              moneda = $3, 
                              product_group = $4,
                              last_updated = NOW()
                          WHERE code = $5
                      `;
                      await client.query(
                          updateQuery,
                          [price, quote, currency, product_group, code]
                      );
                  }
                  
                  await client.query('COMMIT');
                  res.json({ message: 'Lista de precios y datos de productos actualizados con éxito' });
              } catch (dbErr) {
                  await client.query('ROLLBACK');
                  console.error('Error en la transacción de la base de datos:', dbErr);
                  res.status(500).json({ error: 'Error en la base de datos al actualizar precios.' });
              } finally {
                  client.release();
                  fs.unlinkSync(filePath); // Elimina el archivo después de procesarlo
              }
          });
  } catch (err) {
      console.error('Error al procesar el archivo CSV:', err);
      res.status(500).json({ error: 'Error al procesar el archivo.' });
  }
};


const saveProtheusQuery = async (queryData, userId) => {
  const result = await pool.query(
    'INSERT INTO queries (user_id, subject, message) VALUES ($1, $2, $3) RETURNING id',
    [userId, queryData.subject, queryData.message]
  );
  return { success: true, ticketId: result.rows[0].id };
};

const saveProtheusVoucher = async (fileInfo, userId) => {
  const queryText = `
    INSERT INTO vouchers (user_id, file_path, file_name, file_type, description) 
    VALUES ($1, $2, $3, $4, $5) RETURNING id
  `;
  const queryParams = [
    userId, 
    fileInfo.path, 
    fileInfo.originalName, 
    fileInfo.mimeType, 
    fileInfo.description || 'Comprobante subido por cliente' 
  ];
  const result = await pool.query(queryText, queryParams);
  return { success: true, fileRef: result.rows[0].id };
};

// --- Scripts de Mantenimiento ---
const updateProductBrand = async (req, res) => {
  res.status(501).json({ error: 'Esta función debe ser ejecutada como script de consola.' });
};

const updateProductCapacity = async (req, res) => {
  res.status(501).json({ error: 'Esta función debe ser ejecutada como script de consola.' });
};

const updateProductPrices = async (req, res) => {
  res.status(501).json({ error: 'Esta función debe ser ejecutada como script de consola.' });
};


// (NUEVO) Exportar todas las funciones
module.exports = {
  authenticateProtheusUser,
  registerProtheusUser,
  getProfile,
  updateProfile,
  fetchProtheusBalance,
  fetchProtheusMovements,
  createCreditNote,
  fetchCustomerInvoices,
  fetchProtheusOrders,
  fetchProtheusOrderDetails,
  fetchAdminOrderDetails,
  saveProtheusOrder,
  fetchProtheusProducts, // <-- Modificada
  fetchProductDetails,   // <-- Modificada
  fetchProtheusBrands,
  fetchProtheusOffers,
  uploadPriceList,      // <-- Modificada
  saveProtheusQuery,
  saveProtheusVoucher,
  updateProductBrand,
  updateProductCapacity,
  updateProductPrices
};