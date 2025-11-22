// backend/api/models/orderModel.js

const { pool, pool2 } = require('../db');

/**
 * Busca el historial de pedidos de uno o varios usuarios en la base de datos.
 * @param {number|Array<number>} userIds - El ID de un usuario o un array de IDs de usuarios.
 * @returns {Promise<Array<object>>} - Una promesa que se resuelve con la lista de pedidos.
 */
const findOrders = async (userIds) => {
  console.log(`[orderModel] findOrders llamado con userIds:`, userIds);
  let query;
  let values;

  if (Array.isArray(userIds)) {
    query = `
      SELECT id, total, status, 
             TO_CHAR(created_at, 'DD/MM/YYYY') as formatted_date,
             (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count,
             vendor_sales_order_number,
             is_confirmed
      FROM orders
      WHERE user_id = ANY($1::int[])
      ORDER BY created_at DESC;
    `;
    values = [userIds];
  } else {
    query = `
      SELECT id, total, status, 
             TO_CHAR(created_at, 'DD/MM/YYYY') as formatted_date,
             (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count,
             vendor_sales_order_number,
             is_confirmed
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    values = [userIds];
  }

  console.log(`[orderModel] Ejecutando query: ${query} con valores:`, values);
  const result = await pool2.query(query, values);
  console.log(`[orderModel] Query result rows: ${result.rows.length}`);
  return result.rows;
};

/**
 * Busca los detalles completos de un pedido específico para un usuario.
 * @param {number} orderId - El ID del pedido.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object|null>} - Una promesa que se resuelve con los detalles del pedido o null si no se encuentra.
 */
const findOrderDetailsById = async (orderId, allowedUserIds) => {
  // 1. Obtener datos del pedido y verificar pertenencia
  let orderQuery;
  let values;

  if (Array.isArray(allowedUserIds)) {
    orderQuery = `
      SELECT *, TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted_date,
             vendor_sales_order_number, is_confirmed
      FROM orders
      WHERE id = $1 AND user_id = ANY($2::int[]);
    `;
    values = [orderId, allowedUserIds];
  } else {
    orderQuery = `
      SELECT *, TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted_date,
             vendor_sales_order_number, is_confirmed
      FROM orders
      WHERE id = $1 AND user_id = $2;
    `;
    values = [orderId, allowedUserIds];
  }

  const orderResult = await pool2.query(orderQuery, values);
  if (orderResult.rows.length === 0) {
    return null; // No encontrado o no pertenece al usuario
  }
  const orderDetails = orderResult.rows[0];

  // 2. Obtener items del pedido
  const itemsQuery = `SELECT * FROM order_items WHERE order_id = $1;`;
  const itemsResult = await pool2.query(itemsQuery, [orderId]);
  const items = itemsResult.rows;

  // 3. Enriquecer items con descripción de productos de la otra DB
  if (items.length > 0) {
    const productIds = items.map(item => item.product_id);
    const productsQuery = `SELECT id, description FROM products WHERE id = ANY($1::int[]);`;
    const productsResult = await pool.query(productsQuery, [productIds]);
    const productMap = new Map(productsResult.rows.map(p => [p.id, p.description]));

    items.forEach(item => {
      item.product_name = productMap.get(item.product_id) || 'Descripción no disponible';
    });
  }

  orderDetails.items = items;
  return orderDetails;
};

/**
 * Este archivo puede contener funciones para interactuar con la capa de datos
 * de los pedidos, como validaciones complejas o consultas específicas
 * que no son de negocio puro.
 *
 * Por ahora, lo mantenemos simple como un placeholder para la estructura.
 */

// Ejemplo de una función que podría vivir aquí en el futuro:
/**
 * Verifica si un conjunto de productos en un pedido son válidos.
 * @param {Array} items - Array de items del pedido.
 * @returns {Promise<boolean>}
 */
const validateOrderItems = async (items) => {
  if (!items || items.length === 0) {
    return false;
  }
  // Lógica para validar que los productos existen, tienen stock, etc.
  // Por ahora, simplemente retornamos true.
  return true;
};

/**
 * Actualiza el número de pedido de venta del vendedor y el estado de confirmación para múltiples pedidos.
 * @param {Array<object>} updates - Un array de objetos, cada uno con { id, vendorSalesOrderNumber, isConfirmed }.
 * @returns {Promise<void>}
 */
const updateOrderDetails = async (updates) => {
  const client = await pool2.connect();
  try {
    await client.query('BEGIN');
    for (const update of updates) {
      const { id, vendorSalesOrderNumber, isConfirmed, status } = update;
      const query = `
        UPDATE orders
        SET vendor_sales_order_number = $1,
            is_confirmed = $2,
            status = COALESCE($4, status)
        WHERE id = $3;
      `;
      await client.query(query, [vendorSalesOrderNumber, isConfirmed, id, status]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  validateOrderItems,
  findOrders,
  findOrderDetailsById,
  updateOrderDetails,
};
