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
    let queryParams = [];
    let whereClauseUsers = '';
    let whereClauseVendors = '';

    if (term) {
      whereClauseUsers = `WHERE (
            LOWER(u.full_name) LIKE $1 OR
            LOWER(u.email) LIKE $1 OR
            LOWER(u.a1_cod) LIKE $1
        )`;

      whereClauseVendors = `WHERE (
            LOWER(v.nombre) LIKE $1 OR
            LOWER(v.email) LIKE $1 OR
            LOWER(v.codigo) LIKE $1
        )`;

      queryParams.push(`%${term}%`);
    }

    const query = `
      SELECT 
        u.id::text, 
        u.full_name, 
        u.email, 
        u.a1_cod, 
        u.is_admin,
        CASE 
            WHEN u.is_admin THEN 'admin'
            WHEN u.a1_cod IS NOT NULL THEN 'cliente'
            ELSE 'usuario'
        END as role,
        (uc.password_hash IS NOT NULL) as has_password,
        'db' as source,
        u.vendedor_codigo as vendedor_codigo,
        v_linked.nombre as vendedor_nombre
      FROM users u
      LEFT JOIN user_credentials uc ON (u.id = uc.user_id OR (u.a1_cod IS NOT NULL AND u.a1_cod = uc.a1_cod))
      LEFT JOIN vendedores v_linked ON u.vendedor_codigo = v_linked.codigo
      ${whereClauseUsers}
      
      UNION ALL
      
      SELECT
        COALESCE(uc.user_id::text, 'v-' || v.codigo) as id,
        v.nombre as full_name,
        v.email,
        v.codigo as a1_cod,
        false as is_admin,
        'vendedor' as role,
        (uc.password_hash IS NOT NULL) as has_password,
        'vendor' as source,
        v.codigo as vendedor_codigo,
        v.nombre as vendedor_nombre
      FROM vendedores v
      LEFT JOIN user_credentials uc ON (v.codigo = uc.a1_cod)
      ${whereClauseVendors}
      
      ORDER BY full_name ASC;
    `;

    const result = await pool.query(query, queryParams);

    return result.rows.map(row => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      a1_cod: row.a1_cod,
      is_admin: row.is_admin,
      role: row.role,
      has_password: row.has_password,
      source: row.source,
      vendedor_codigo: row.vendedor_codigo,
      vendedor_nombre: row.vendedor_nombre
    }));

  } catch (error) {
    console.error('Error en getUsersForAdmin:', error);
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

    // 0. GENERATE HASH
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // 1. Check if a Real User exists in 'users' table
    const userRes = await client.query('SELECT id FROM users WHERE a1_cod = $1', [cleanCode]);
    const realUserId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

    // 2. Check if a Credential exists for this a1_cod
    const credRes = await client.query('SELECT user_id FROM user_credentials WHERE a1_cod = $1', [cleanCode]);
    const existingCredentialUserId = credRes.rows.length > 0 ? credRes.rows[0].user_id : null;

    let targetUserId = null;

    if (realUserId) {
      targetUserId = realUserId;
      // We have a real user. Ensure credentials point to THIS id.

      // AGGRESSIVE CLEANUP:
      // Delete ANY credential with this a1_cod that is NOT the realUserId.
      // This handles cases where multiple credentials exist (one correct, one detached), causing UI duplicates and login loops.
      await client.query(
        'DELETE FROM user_credentials WHERE a1_cod = $1 AND user_id != $2',
        [cleanCode, realUserId]
      );

      console.log(`[adminService] Enforced credential cleanup for user ${realUserId} (Code: ${cleanCode})`);

    } else {
      // No real user. 
      // If we have an existing credential, keep using its ID.
      // If not, generate a new Virtual ID.
      if (existingCredentialUserId) {
        targetUserId = existingCredentialUserId;
      } else {
        const MIN_CLIENT_ID = 100000;
        const maxRes = await client.query('SELECT GREATEST(MAX(user_id), $1) as max_id FROM user_credentials', [MIN_CLIENT_ID]);
        targetUserId = (parseInt(maxRes.rows[0].max_id) || MIN_CLIENT_ID) + 1;
      }
    }

    // 3. UPSERT the credential
    // We try UPDATE first, then INSERT.
    const updateRes = await client.query(
      'UPDATE user_credentials SET password_hash = $1, temp_password_hash = NULL, email = COALESCE($2, email), must_change_password = TRUE WHERE user_id = $3',
      [hash, email, targetUserId]
    );

    if (updateRes.rowCount === 0) {
      // Insert
      await client.query(
        'INSERT INTO user_credentials (user_id, email, a1_cod, password_hash, must_change_password) VALUES ($1, $2, $3, $4, TRUE)',
        [targetUserId, email, cleanCode, hash]
      );
    }

    await client.query('COMMIT');
    return { success: true, userId: targetUserId };
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

    // 1. Fetch user_code (a1_cod) from users OR user_credentials
    let userQuery = 'SELECT a1_cod FROM users WHERE id = $1';
    let userResult = await pool.query(userQuery, [userId]);
    let userCode = userResult.rows.length > 0 ? userResult.rows[0].a1_cod : null;

    if (!userCode) {
      // Fallback: Check user_credentials (for decoupled users)
      const credQuery = 'SELECT a1_cod FROM user_credentials WHERE user_id = $1';
      const credResult = await pool.query(credQuery, [userId]);
      userCode = credResult.rows.length > 0 ? credResult.rows[0].a1_cod : null;
    }

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
    const query = `
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
      `SELECT DISTINCT b1_grupo AS product_group, sbm_desc AS brand FROM products WHERE b1_grupo IS NOT NULL AND b1_grupo != '' ORDER BY b1_grupo ASC;`
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
      // [FIX] Detect if we are resetting a Vendor who might not have credentials yet (ID format: 'v-CODE')
      if (typeof userId === 'string' && userId.startsWith('v-')) {
        const vendorCode = userId.substring(2); // Remove 'v-'
        console.log(`[adminService] resetUserPassword -> Handling Vendor Code: ${vendorCode}`);

        // Fetch vendor email required for creating credentials
        const vendorRes = await pool2.query('SELECT email FROM vendedores WHERE codigo = $1', [vendorCode]);
        if (vendorRes.rows.length === 0) {
          throw new Error('Vendedor no encontrado.');
        }
        const email = vendorRes.rows[0].email;

        // Use assignClientPassword to Create or Update credentials using the Code
        return await assignClientPassword(vendorCode, newPassword, email);
      }

      // Default: Existing User with Numeric ID
      // Check if user has credentials first
      const credRes = await pool2.query('SELECT user_id FROM user_credentials WHERE user_id = $1', [userId]);

      if (credRes.rows.length === 0) {
        console.log(`[adminService] User ${userId} has NO credentials. Creating new credentials record (Upsert)...`);

        // Fetch user data needed for creation
        const userRes = await pool.query('SELECT email, a1_cod FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
          throw new Error('Usuario no encontrado en la tabla users.');
        }
        const { email, a1_cod } = userRes.rows[0];

        // Create credentials using assignClientPassword logic (reusing it or duplicating safe insert)
        // Since we have the ID, we can force the ID.
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await pool2.query(
          'INSERT INTO user_credentials (user_id, email, a1_cod, password_hash, must_change_password) VALUES ($1, $2, $3, $4, TRUE)',
          [userId, email, a1_cod, hash]
        );

        return { success: true, message: 'Credenciales creadas y contraseña asignada correctamente.' };

      } else {
        // Normal update
        return await userService.changePassword(userId, newPassword, 'cliente', true);
      }
    } catch (error) {
      console.error(`Error resetUserPassword for user ${userId}:`, error);
      throw error;
    }
  },

  getAllSellers: async () => {
    try {
      const result = await pool2.query(
        'SELECT codigo, nombre FROM vendedores ORDER BY nombre ASC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error in getAllSellers:', error);
      throw error;
    }
  },

  updateVendorClientsGroupPermissions: async (vendedorCodigo, groups) => {
    try {
      // 0. Update persistent vendor rules in DB2
      const client = await pool2.connect();
      try {
        await client.query('BEGIN');
        // Delete existing rules for this vendor
        await client.query(
          'DELETE FROM vendor_product_group_permissions WHERE vendedor_code = $1',
          [vendedorCodigo]
        );
        // Insert new rules
        if (groups && groups.length > 0) {
          const insertQuery =
            'INSERT INTO vendor_product_group_permissions (vendedor_code, product_group) VALUES ($1, $2)';
          for (const group of groups) {
            await client.query(insertQuery, [vendedorCodigo, group]);
          }
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating persistent vendor permissions:', err);
        throw err;
      } finally {
        client.release();
      }

      // 1. Get all clients for this vendor using DB1
      // Note: We only care about users in our local DB as restrictions apply to them
      const result = await pool.query(
        'SELECT id FROM users WHERE vendedor_codigo = $1',
        [vendedorCodigo]
      );

      const users = result.rows;
      console.log(`Updating permissions for ${users.length} clients of vendor ${vendedorCodigo}`);

      // 2. Iterate and update permissions for each
      // Using a loop for now. Could be optimized with a single transaction if needed.
      for (const user of users) {
        await module.exports.updateUserGroupPermissions(user.id, groups);
      }

      return { success: true, count: users.length };
    } catch (error) {
      console.error('Error in updateVendorClientsGroupPermissions:', error);
      throw error;
    }
  },

  /**
   * (Admin) Elimina un usuario y sus credenciales, evitando eliminar administradores.
   * @param {string|number} userId - ID del usuario a eliminar.
   */
  deleteUser: async (userId) => {
    const client = await pool2.connect();
    try {
      await client.query('BEGIN');

      // 1. Check if user exists and if they are an admin
      // Check is_admin flag in users table
      const userRes = await client.query('SELECT id, is_admin FROM users WHERE id = $1', [userId]);

      if (userRes.rows.length === 0) {
        // Might be a detached credential user check? Assuming strict user table check first.
        throw new Error('Usuario no encontrado.');
      }
      const user = userRes.rows[0];

      if (user.is_admin) {
        throw new Error('No se puede eliminar a un usuario marcado como Administrador (is_admin).');
      }

      // 2. Check user_roles table as requested
      const rolesRes = await client.query(
        `SELECT r.name 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = $1 AND r.name = 'admin'`,
        [userId]
      );

      if (rolesRes.rows.length > 0) {
        throw new Error('No se puede eliminar a un usuario con rol de Administrador.');
      }

      // 3. Proceed with deletion
      console.log(`[adminService] Deleting user ${userId} and associated data...`);

      // Delete credentials
      await client.query('DELETE FROM user_credentials WHERE user_id = $1', [userId]);

      // Delete permissions
      await client.query('DELETE FROM user_product_group_permissions WHERE user_id = $1', [userId]);

      // Delete roles (just in case they had non-admin roles)
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

      // Delete user record
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
      return { success: true, message: 'Usuario y credenciales eliminados correctamente.' };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  },
};
