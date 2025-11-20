const { pool, pool2 } = require('../db');
const { formatCurrency } = require('../utils/helpers');

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
    const user = userResult.rows[0] || { user_nombre: 'N/A', user_email: 'N/A' };
    
    // 3. Obtener items del pedido desde BD2
    const itemsQuery = `SELECT * FROM order_items WHERE order_id = $1;`;
    const itemsResult = await pool2.query(itemsQuery, [orderId]);
    const items = itemsResult.rows;

    if (items.length > 0) {
        // 4. Obtener los IDs de los productos
        const productIds = items.map(item => item.product_id);

        // 5. Obtener las descripciones de los productos desde BD1
        const productsQuery = `SELECT id, description FROM products WHERE id = ANY($1::int[]);`;
        const productsResult = await pool.query(productsQuery, [productIds]);
        const productMap = new Map(productsResult.rows.map(p => [p.id, p.description]));

        // 6. Enriquecer los items con la descripción del producto
        items.forEach(item => {
            item.product_name = productMap.get(item.product_id) || 'Descripción no disponible';
        });
    }
    
    // 7. Combinar y formatear
    const orderDetails = {
      ...order,
      ...user,
      items: items.map(item => ({
        ...item,
        product_name: item.product_name,
        formattedPrice: formatCurrency(item.unit_price)
      })),
      formattedTotal: formatCurrency(order.total)
    };
    
    return orderDetails;
    
  } catch (error)
 {
    console.error(`Error en fetchAdminOrderDetails (Admin) para ID ${orderId}:`, error);
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
    await client.query('DELETE FROM user_product_group_permissions WHERE user_id = $1', [userId]);

    // 2. Insert new permissions if any
    if (groups && groups.length > 0) {
      const insertQuery = 'INSERT INTO user_product_group_permissions (user_id, product_group) VALUES ($1, $2)';
      for (const group of groups) {
        await client.query(insertQuery, [userId, group]);
      }
    }

    await client.query('COMMIT');
    console.log(`Denied product group permissions updated for user ${userId}`);
    return { success: true, message: 'Permisos actualizados correctamente.' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error in updateUserGroupPermissions for user ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * (Admin) Obtiene la lista de todos los administradores.
 */
const getAdmins = async () => {
  try {
    const adminIdsResult = await pool2.query('SELECT user_id FROM admins ORDER BY created_at DESC');
    if (adminIdsResult.rows.length === 0) {
      return [];
    }
    const adminIds = adminIdsResult.rows.map(row => row.user_id);
    // Busca la información de los usuarios en la DB1
    const usersResult = await pool.query('SELECT id, full_name, email FROM users WHERE id = ANY($1::int[])', [adminIds]);
    return usersResult.rows;
  } catch (error) {
    console.error('Error en getAdmins:', error);
    throw error;
  }
};

/**
 * (Admin) Añade un nuevo administrador.
 */
const addAdmin = async (userId) => {
  try {
    // 1. Verificar que el usuario existe en la DB1
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('El usuario no existe en la base de datos principal.');
    }
    // 2. Insertar en la tabla admins en DB2. ON CONFLICT evita duplicados.
    await pool2.query('INSERT INTO admins (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    return { success: true, message: 'Usuario añadido como administrador.' };
  } catch (error) {
    console.error('Error en addAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Elimina a un administrador.
 */
const removeAdmin = async (userId) => {
  try {
    const result = await pool2.query('DELETE FROM admins WHERE user_id = $1', [userId]);
    if (result.rowCount === 0) {
      // Esto puede pasar si el usuario ya no era admin, no es necesariamente un error.
      return { success: false, message: 'El usuario no era administrador.' };
    }
    return { success: true, message: 'Administrador eliminado correctamente.' };
  } catch (error) {
    console.error('Error en removeAdmin:', error);
    throw error;
  }
};

module.exports = {
  fetchAdminOrderDetails,
  getUsersForAdmin,
  updateUserGroupPermissions,
  getAdmins,
  addAdmin,
  removeAdmin,
};
