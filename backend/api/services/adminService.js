const { pool, pool2 } = require('../db');
const { formatCurrency } = require('../utils/helpers');
const productModel = require('../models/productModel');
const userService = require('./userService');
const protheusService = require('./protheusService');
const bcrypt = require('bcryptjs');

/**
 * (Admin) Obtiene detalles de CUALQUIER pedido (para NC)
 */
const fetchAdminOrderDetails = async (orderId) => {
  try {
    // 1. Obtener datos del pedido desde BD2
    const orderQuery = `
      SELECT *, TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted_date
      FROM orders
      WHERE id = $1;
    `;
    const orderResult = await pool2.query(orderQuery, [orderId]);

    if (orderResult.rows.length === 0) {
      return null; // Pedido no encontrado
    }
    const order = orderResult.rows[0];

    // 2. Obtener datos del usuario desde BD1
    const userQuery = `SELECT full_name as user_nombre, email as user_email FROM users WHERE id = $1;`;
    const userResult = await pool.query(userQuery, [order.user_id]);
    const user = userResult.rows[0] || {
      user_nombre: 'N/A',
      user_email: 'N/A',
    };

    // 3. Obtener items del pedido desde BD2
    const itemsQuery = `SELECT * FROM order_items WHERE order_id = $1;`;
    const itemsResult = await pool2.query(itemsQuery, [orderId]);
    const items = itemsResult.rows;

    if (items.length > 0) {
      // 4. Obtener los IDs de los productos
      const productIds = items.map((item) => item.product_id);

      // 5. Obtener las descripciones de los productos desde BD2
      const productsQuery = `SELECT id, b1_desc as description FROM products WHERE id = ANY($1::int[]);`;
      const productsResult = await pool2.query(productsQuery, [productIds]);
      const productMap = new Map(
        productsResult.rows.map((p) => [p.id, p.description])
      );

      // 6. Enriquecer los items con la descripción del producto
      items.forEach((item) => {
        item.product_name =
          productMap.get(item.product_id) || 'Descripción no disponible';
      });
    }

    // 7. Combinar y formatear
    const orderDetails = {
      ...order,
      ...user,
      items: items.map((item) => ({
        ...item,
        product_name: item.product_name,
        formattedPrice: formatCurrency(item.unit_price),
      })),
      formattedTotal: formatCurrency(order.total),
    };

    return orderDetails;
  } catch (error) {
    console.error(
      `Error en fetchAdminOrderDetails (Admin) para ID ${orderId}:`,
      error
    );
    throw error;
  }
};

/**
 * (Admin) Obtiene la lista de clientes (no-admins)
 */
/**
 * (Admin) Obtiene la lista de usuarios combinando DB y API.
 * Soporta búsqueda y paginación (simulada).
 */
const getUsersForAdmin = async (search = '') => {
  try {
    const term = search ? search.toLowerCase().trim() : '';

    // 1. Fetch Local Users (Admins, Vendors, synced Clients)
    const dbQuery = `
      SELECT id, full_name, email, a1_cod, is_admin 
      FROM users 
      ORDER BY full_name ASC;
    `;
    const dbUsersResult = await pool.query(dbQuery);
    const dbUsers = dbUsersResult.rows;

    // 2. Fetch All Credentials (to check who has password)
    // We fetch just the necessary fields to map
    const credsQuery = `SELECT user_id, a1_cod, email FROM user_credentials`;
    const credsResult = await pool2.query(credsQuery);
    const credsMapByCode = new Map();
    const credsMapById = new Map();

    credsResult.rows.forEach(c => {
      if (c.a1_cod) credsMapByCode.set(c.a1_cod.trim(), c);
      credsMapById.set(c.user_id, c);
    });

    // 3. Fetch API Clients
    // Note: getClients fetches ALL pages. Might be heavy if thousands of clients.
    // Optimization: If we had an API search endpoint, we'd use it.
    const apiClients = await protheusService.getClients();

    // 4. Merge & Filter
    const mergedUsers = [];
    const processedCodes = new Set();

    // Process DB Users first
    for (const user of dbUsers) {
      // Filter by search term
      const matches = !term ||
        (user.full_name && user.full_name.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.a1_cod && user.a1_cod.toLowerCase().includes(term));

      if (!matches) continue;

      const credential = credsMapById.get(user.id) || (user.a1_cod ? credsMapByCode.get(user.a1_cod.trim()) : null);

      mergedUsers.push({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        a1_cod: user.a1_cod,
        is_admin: user.is_admin,
        role: user.is_admin ? 'admin' : (user.a1_cod ? 'cliente/vendedor' : 'admin'), // Basic inference
        has_password: !!credential,
        source: 'db'
      });

      if (user.a1_cod) processedCodes.add(user.a1_cod.trim());
    }

    // Process API Clients (that are NOT in DB Users)
    for (const client of apiClients) {
      const code = client.a1_cod ? client.a1_cod.trim() : null;
      if (!code) continue; // Skip invalid

      // If already processed via DB user, skip
      if (processedCodes.has(code)) continue;

      // Check if it's a Decoupled Client (Has credential but no User record)
      const credential = credsMapByCode.get(code);

      // Filter by search term
      const matches = !term ||
        (client.a1_nome && client.a1_nome.toLowerCase().includes(term)) ||
        (client.a1_email && client.a1_email.toLowerCase().includes(term)) ||
        (code.toLowerCase().includes(term));

      if (!matches) continue;

      mergedUsers.push({
        id: credential ? credential.user_id : `virtual_${code}`, // Virtual ID for UI if no credential
        full_name: client.a1_nome.trim(),
        email: client.a1_email ? client.a1_email.trim() : null,
        a1_cod: code,
        is_admin: false,
        role: 'cliente',
        has_password: !!credential,
        source: credential ? 'decoupled_db' : 'api_only'
      });
    }

    // Sort by name
    return mergedUsers.sort((a, b) => a.full_name.localeCompare(b.full_name));

  } catch (error) {
    console.error('Error in getUsersForAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Asigna una contraseña a un cliente (Creando credencial desacoplada o vinculada).
 */
const assignClientPassword = async (a1_cod, password, email) => {
  const client = await pool2.connect();
  try {
    const cleanCode = a1_cod.trim();
    await client.query('BEGIN');

    // 1. Check if credential already exists
    const checkRes = await client.query('SELECT user_id FROM user_credentials WHERE a1_cod = $1', [cleanCode]);

    let userId;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    if (checkRes.rows.length > 0) {
      // Update existing
      userId = checkRes.rows[0].user_id;
      await client.query(
        'UPDATE user_credentials SET password_hash = $1, temp_password_hash = NULL, email = COALESCE($2, email) WHERE user_id = $3',
        [hash, email, userId]
      );
    } else {
      // Create New Virtual ID
      // Safe range start
      const MIN_CLIENT_ID = 100000;
      const maxRes = await client.query('SELECT GREATEST(MAX(user_id), $1) as max_id FROM user_credentials', [MIN_CLIENT_ID]);
      userId = (parseInt(maxRes.rows[0].max_id) || MIN_CLIENT_ID) + 1;

      await client.query(
        'INSERT INTO user_credentials (user_id, email, a1_cod, password_hash) VALUES ($1, $2, $3, $4)',
        [userId, email, cleanCode, hash]
      );
    }

    await client.query('COMMIT');
    return { success: true, userId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in assignClientPassword:', err);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * (Admin) Actualiza los permisos de grupo para un usuario específico
 */
const updateUserGroupPermissions = async (userId, groups) => {
  const client = await pool2.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch user_code (a1_cod) from DB1
    const userQuery = 'SELECT a1_cod FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    const userCode = userResult.rows.length > 0 ? userResult.rows[0].a1_cod : null;

    if (!userCode) {
      throw new Error(`El usuario ${userId} no tiene un código A1 asignado.`);
    }

    // 2. Delete old permissions using user_code
    await client.query(
      'DELETE FROM user_product_group_permissions WHERE user_code = $1',
      [userCode]
    );

    // 3. Insert new permissions if any
    if (groups && groups.length > 0) {
      const insertQuery =
        'INSERT INTO user_product_group_permissions (user_id, product_group, user_code) VALUES ($1, $2, $3)';
      for (const group of groups) {
        // Note: We still save userId for reference, but the logic relies on user_code
        await client.query(insertQuery, [userId, group, userCode]);
      }
    }

    await client.query('COMMIT');
    console.log(`Denied product group permissions updated for user ${userId} (Code: ${userCode})`);

    // Invalidate cache
    await productModel.invalidatePermissionsCache(userId);

    return { success: true, message: 'Permisos actualizados correctamente.' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      `Error in updateUserGroupPermissions for user ${userId}:`,
      error
    );
    throw error;
  } finally {
    client.release();
  }
};



/**
 * (Admin) Actualiza los permisos globales de productos
 */
/**
 * (Admin) Actualiza los permisos globales de productos
 */
const updateGlobalProductPermissions = async (productCodes) => {
  const client = await pool2.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete old permissions
    await client.query('DELETE FROM global_product_permissions');

    // 2. Insert new permissions if any
    if (productCodes && productCodes.length > 0) {
      // Resolve IDs from BD2
      const productsQuery = `SELECT id, b1_cod as code FROM products WHERE b1_cod = ANY($1::varchar[])`;
      const productsResult = await pool2.query(productsQuery, [productCodes]);

      // Create a map for quick lookup
      const productMap = new Map(productsResult.rows.map(p => [p.code, p.id]));

      const insertQuery =
        'INSERT INTO global_product_permissions (product_id, product_code) VALUES ($1, $2)';

      for (const productCode of productCodes) {
        const productId = productMap.get(productCode);
        if (productId) {
          await client.query(insertQuery, [productId, productCode]);
        } else {
          console.warn(`[WARNING] Product code ${productCode} not found in DB1. Skipping global restriction.`);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Global denied product permissions updated');

    return { success: true, message: 'Restricciones globales actualizadas correctamente.' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in updateGlobalProductPermissions:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * (Admin) Obtiene la lista de todos los administradores.
 */
/**
 * (Admin) Obtiene la lista de todos los usuarios con roles especiales (admin, marketing).
 */
/**
 * (Admin) Obtiene la lista de todos los usuarios con roles asignados.
 */
const getAdmins = async () => {
  try {
    // 1. Fetch all users with roles from DB2 (users table joined with user_roles)
    constquery = `
      SELECT u.id, u.full_name, u.email, u.created_at, ur.assigned_at, r.name as role_name, r.permissions
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      ORDER BY ur.assigned_at DESC
    `;
    const result = await pool2.query(query);

    return result.rows.map(row => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      role: row.role_name,
      permissions: row.permissions,
      assigned_at: row.assigned_at,
      created_at: row.created_at
    }));

  } catch (error) {
    console.error('Error en getAdmins:', error);
    throw error;
  }
};

/**
 * (Admin) Añade un nuevo administrador.
 */
/**
 * (Admin) Añade un nuevo usuario con rol (admin o marketing).
 */
/**
 * (Admin) Añade un rol a un usuario.
 */
const addAdmin = async (userId, roleName = 'admin') => {
  try {
    // 1. Get role ID
    const roleResult = await pool2.query('SELECT id FROM roles WHERE name = $1', [roleName]);
    if (roleResult.rows.length === 0) {
      throw new Error(`El rol '${roleName}' no existe.`);
    }
    const roleId = roleResult.rows[0].id;

    // 2. Assign role using roleService logic (duplicated here for simplicity or import roleService)
    // Let's just do it directly here to avoid circular dependencies if any, 
    // but ideally we should use roleService. 
    // Since adminService is higher level, it can use roleService if we import it.
    // But for now, direct DB access is fine and consistent with this file.

    // Check user existence in DB1
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('El usuario no existe en la base de datos principal.');
    }

    await pool2.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
      [userId, roleId]
    );

    return { success: true, message: `Usuario añadido con rol ${roleName}.` };
  } catch (error) {
    console.error('Error en addAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Elimina a un administrador.
 */
/**
 * (Admin) Elimina a un administrador o usuario de marketing.
 */
/**
 * (Admin) Elimina un rol de un usuario.
 * Nota: Esto elimina TODOS los roles del usuario si no se especifica rol, 
 * pero para mantener compatibilidad con el frontend actual que solo manda userId,
 * eliminaremos todos los roles o asumiremos que se quiere quitar el acceso.
 * El frontend actual solo tiene un botón "Quitar".
 */
const removeAdmin = async (userId) => {
  try {
    // Remove all roles for this user
    const result = await pool2.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

    if (result.rowCount === 0) {
      return { success: false, message: 'El usuario no tenía roles asignados.' };
    }
    return { success: true, message: 'Roles eliminados correctamente.' };
  } catch (error) {
    console.error('Error en removeAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Obtiene todos los grupos de productos y marcas de la tabla de productos.
 */
const getProductGroupsForAdmin = async () => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT product_group, brand FROM products WHERE product_group IS NOT NULL AND product_group != '' ORDER BY product_group ASC;`
    );
    return result.rows;
  } catch (error) {
    console.error('Error en getProductGroupsForAdmin (service):', error);
    throw error;
  }
};

module.exports = {
  fetchAdminOrderDetails,
  getUsersForAdmin,
  assignClientPassword,
  updateUserGroupPermissions,

  getAdmins,
  addAdmin,
  removeAdmin,
  getProductGroupsForAdmin,
  updateGlobalProductPermissions,

  /**
   * (Admin) Restablece la contraseña de un usuario.
   * @param {number} userId - ID del usuario.
   * @param {string} newPassword - Nueva contraseña.
   */
  resetUserPassword: async (userId, newPassword) => {
    try {
      // Por defecto asumimos que es un 'cliente' si estamos gestionando desde la tabla de usuarios
      // Si necesitamos soportar vendedores aquí, podríamos verificar primero el tipo de usuario.
      // Para esta implementación, usaremos 'cliente' ya que la tabla de admins suele gestionar la tabla 'users'.
      // userService.changePassword maneja el hashing.
      return await userService.changePassword(userId, newPassword, 'cliente');
    } catch (error) {
      console.error(`Error resetUserPassword for user ${userId}:`, error);
      throw error;
    }
  },
};

