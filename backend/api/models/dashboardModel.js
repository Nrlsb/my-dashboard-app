// backend/api/models/dashboardModel.js

const { pool, pool2 } = require('../db');

/**
 * Obtiene los paneles del dashboard desde la base de datos.
 * @param {boolean} isAdmin - Si el usuario es administrador.
 * @returns {Promise<Array<object>>} - Una promesa que se resuelve con la lista de paneles.
 */
const findDashboardPanels = async (isAdmin, isVendedor) => {
  let query = 'SELECT * FROM dashboard_panels';
  const params = [];
  let whereClauses = [];

  if (isVendedor) {
    whereClauses.push(`tag = 'vendedor'`);
    whereClauses.push(`is_visible = true`);
  } else {
    whereClauses.push(`(tag IS NULL OR tag != 'vendedor')`);
    if(!isAdmin){
        whereClauses.push(`is_visible = true`);
    }
  }

  if (whereClauses.length) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY id';

  const result = await pool2.query(query, params);
  return result.rows;
};

module.exports = {
  findDashboardPanels,
};
