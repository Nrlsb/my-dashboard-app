// backend/api/models/movementModel.js

/**
 * Este archivo puede contener funciones para interactuar con la capa de datos
 * de los movimientos de cuenta corriente.
 */

const { pool } = require('../db');

// En el futuro, podrían agregarse aquí funciones como:
/**
 * Busca un movimiento específico por su ID con validaciones adicionales.
 * @param {number} movementId - El ID del movimiento.
 * @param {number} userId - El ID del usuario para seguridad.
 * @returns {Promise<object|null>}
 */
const findMovementById = async (movementId, userId) => {
  // Ejemplo de consulta más compleja que podría vivir en un modelo.
  const query = `
    SELECT * FROM account_movements 
    WHERE id = $1 AND user_id = $2;
  `;
  const result = await pool.query(query, [movementId, userId]);
  return result.rows[0] || null;
};

module.exports = {
  findMovementById,
};
