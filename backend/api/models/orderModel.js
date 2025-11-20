// backend/api/models/orderModel.js

const { pool, pool2 } = require('../db');

/**
 * Busca el historial de pedidos de un usuario en la base de datos.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<Array<object>>} - Una promesa que se resuelve con la lista de pedidos.
 */
const findOrdersByUserId = async (userId) => {
  const query = `
    SELECT id, total, status, 
           TO_CHAR(created_at, 'DD/MM/YYYY') as formatted_date,
           (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count
    FROM orders
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await pool2.query(query, [userId]);
  return result.rows;
};

/**
 * Busca los detalles completos de un pedido específico para un usuario.
 * @param {number} orderId - El ID del pedido.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object|null>} - Una promesa que se resuelve con los detalles del pedido o null si no se encuentra.
 */
const findOrderDetailsById = async (orderId, userId) => {
  // 1. Obtener datos del pedido y verificar pertenencia
  const orderQuery = `
    SELECT *, TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as formatted_date
    FROM orders
    WHERE id = $1 AND user_id = $2;
  `;
  const orderResult = await pool2.query(orderQuery, [orderId, userId]);
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

module.exports = {
  validateOrderItems,
  findOrdersByUserId,
  findOrderDetailsById,
};
