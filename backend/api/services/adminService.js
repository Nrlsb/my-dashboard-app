const { pool, pool2 } = require('../db');
const { formatCurrency } = require('../utils/helpers');
const productModel = require('../models/productModel');

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

      // 5. Obtener las descripciones de los productos desde BD1
      const productsQuery = `SELECT id, description FROM products WHERE id = ANY($1::int[]);`;
      const productsResult = await pool.query(productsQuery, [productIds]);
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
const getUsersForAdmin = async () => {
  try {
    const query = `
      SELECT id, full_name, email, a1_cod 
      FROM users 
      WHERE is_admin = false 
      ORDER BY full_name ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error in getUsersForAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Actualiza los permisos de grupo para un usuario específico
 */
const updateUserGroupPermissions = async (userId, groups) => {
  const client = await pool2.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete old permissions
    await client.query(
      'DELETE FROM user_product_group_permissions WHERE user_id = $1',
      [userId]
    );

    // 2. Insert new permissions if any
    if (groups && groups.length > 0) {
      const insertQuery =
        'INSERT INTO user_product_group_permissions (user_id, product_group) VALUES ($1, $2)';
      for (const group of groups) {
        await client.query(insertQuery, [userId, group]);
      }
    }

    await client.query('COMMIT');
    console.log(`Denied product group permissions updated for user ${userId}`);

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
 * (Admin) Actualiza los permisos de productos para un usuario específico
 */
const updateUserProductPermissions = async (userId, productIds) => {
  const client = await pool2.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete old permissions
    await client.query(
      'DELETE FROM user_product_permissions WHERE user_id = $1',
      [userId]
    );

    // 2. Insert new permissions if any
    if (productIds && productIds.length > 0) {
      const insertQuery =
        'INSERT INTO user_product_permissions (user_id, product_id) VALUES ($1, $2)';
      for (const productId of productIds) {
        await client.query(insertQuery, [userId, productId]);
      }
    }

    await client.query('COMMIT');
    console.log(`Denied product permissions updated for user ${userId}`);

    return { success: true, message: 'Permisos de productos actualizados correctamente.' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      `Error in updateUserProductPermissions for user ${userId}:`,
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
const updateGlobalProductPermissions = async (productIds) => {
  const client = await pool2.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete old permissions
    await client.query('DELETE FROM global_product_permissions');

    // 2. Insert new permissions if any
    if (productIds && productIds.length > 0) {
      const insertQuery =
        'INSERT INTO global_product_permissions (product_id) VALUES ($1)';
      for (const productId of productIds) {
        await client.query(insertQuery, [productId]);
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
    // 1. Fetch all users with roles from DB2
    const query = `
      SELECT ur.user_id, ur.assigned_at, r.name as role_name, r.permissions
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      ORDER BY ur.assigned_at DESC
    `;
    const result = await pool2.query(query);

    if (result.rows.length === 0) {
      return [];
    }

    const privilegedUsers = result.rows;
    const userIds = privilegedUsers.map((row) => row.user_id);

    // 2. Fetch user details from DB1
    const usersResult = await pool.query(
      'SELECT id, full_name, email FROM users WHERE id = ANY($1::int[])',
      [userIds]
    );

    // 3. Merge data
    const usersMap = new Map(usersResult.rows.map(u => [u.id, u]));

    return privilegedUsers.map(p => {
      const userDetails = usersMap.get(p.user_id);
      return userDetails ? {
        ...userDetails,
        role: p.role_name,
        permissions: p.permissions,
        assigned_at: p.assigned_at
      } : null;
    }).filter(u => u !== null);

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
  updateUserGroupPermissions,
  updateUserProductPermissions,
  getAdmins,
  addAdmin,
  removeAdmin,
  getProductGroupsForAdmin,
  updateGlobalProductPermissions,
};

