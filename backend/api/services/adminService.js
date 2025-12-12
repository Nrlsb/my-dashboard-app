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
const getAdmins = async () => {
  try {
    // Fetch admins
    const adminsResult = await pool2.query(
      'SELECT user_id, created_at FROM admins'
    );
    // Fetch marketing users
    const marketingResult = await pool2.query(
      'SELECT user_id, created_at FROM marketing_users'
    );

    const privilegedUsers = [
      ...adminsResult.rows.map(r => ({ ...r, role: 'admin' })),
      ...marketingResult.rows.map(r => ({ ...r, role: 'marketing' }))
    ];

    if (privilegedUsers.length === 0) {
      return [];
    }

    const userIds = privilegedUsers.map((row) => row.user_id);
    // Busca la información de los usuarios en la DB1
    const usersResult = await pool.query(
      'SELECT id, full_name, email FROM users WHERE id = ANY($1::int[])',
      [userIds]
    );

    // Merge user details with role info
    const usersMap = new Map(usersResult.rows.map(u => [u.id, u]));

    return privilegedUsers.map(p => {
      const userDetails = usersMap.get(p.user_id);
      return userDetails ? { ...userDetails, role: p.role, assigned_at: p.created_at } : null;
    }).filter(u => u !== null).sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));

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
const addAdmin = async (userId, role = 'admin') => {
  try {
    // 1. Verificar que el usuario existe en la DB1
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [
      userId,
    ]);
    if (userResult.rows.length === 0) {
      throw new Error('El usuario no existe en la base de datos principal.');
    }

    // 2. Insertar en la tabla correspondiente en DB2
    if (role === 'marketing') {
      await pool2.query(
        'INSERT INTO marketing_users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [userId]
      );
    } else {
      // Default to admin
      await pool2.query(
        'INSERT INTO admins (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [userId]
      );
    }

    return { success: true, message: `Usuario añadido como ${role}.` };
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
const removeAdmin = async (userId) => {
  try {
    // Try removing from admins
    const adminResult = await pool2.query('DELETE FROM admins WHERE user_id = $1', [
      userId,
    ]);

    // Try removing from marketing_users
    const marketingResult = await pool2.query('DELETE FROM marketing_users WHERE user_id = $1', [
      userId,
    ]);

    if (adminResult.rowCount === 0 && marketingResult.rowCount === 0) {
      return { success: false, message: 'El usuario no tenía roles asignados.' };
    }
    return { success: true, message: 'Rol eliminado correctamente.' };
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

