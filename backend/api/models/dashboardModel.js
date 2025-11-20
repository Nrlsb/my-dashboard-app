// backend/api/models/dashboardModel.js

const { pool, pool2 } = require('../db');

/**
 * Obtiene los paneles del dashboard desde la base de datos.
 * @param {boolean} isAdmin - Si el usuario es administrador.
 * @returns {Promise<Array<object>>} - Una promesa que se resuelve con la lista de paneles.
 */
const findDashboardPanels = async (isAdmin) => {
  let query = 'SELECT * FROM dashboard_panels';
  if (!isAdmin) {
    query += ' WHERE is_visible = true';
  }
  query += ' ORDER BY id';

  const result = await pool2.query(query);
  return result.rows;
};

/**
 * Verifica si un usuario es administrador.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<boolean>} - True si es admin, false en caso contrario.
 */
const isUserAdmin = async (userId) => {
  if (!userId) return false;
  const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return userResult.rows.length > 0 && userResult.rows[0].is_admin;
};

module.exports = {
  findDashboardPanels,
  isUserAdmin,
};
