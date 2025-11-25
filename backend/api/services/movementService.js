// backend/api/services/movementService.js

const { pool } = require('../db');
const { formatCurrency } = require('../utils/helpers');

/**
 * Obtiene el saldo total (SUMA) de los movimientos de un usuario.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object>}
 */
const getBalance = async (userId) => {
  try {
    const query = `
      SELECT 
        COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) AS total_balance
      FROM account_movements
      WHERE user_id = $1;
    `;
    const result = await pool.query(query, [userId]);

    const balance = parseFloat(result.rows[0].total_balance);

    return {
      balance: balance,
      formattedBalance: formatCurrency(balance),
    };
  } catch (error) {
    console.error('Error en getBalance (service):', error);
    throw error;
  }
};

/**
 * Obtiene el historial de movimientos de un usuario.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<Array>}
 */
const getMovements = async (userId) => {
  try {
    const query = `
      SELECT *, 
             TO_CHAR(date, 'DD/MM/YYYY') as formatted_date,
             TO_CHAR(fecha_vencimiento, 'DD/MM/YYYY') as formatted_fecha_vencimiento
      FROM account_movements
      WHERE user_id = $1
      ORDER BY date DESC, created_at DESC;
    `;
    const result = await pool.query(query, [userId]);

    const formattedMovements = result.rows.map((mov) => {
      const amount = mov.credit - mov.debit;
      return {
        ...mov,
        amount: amount,
        formattedAmount: formatCurrency(amount),
      };
    });

    return formattedMovements;
  } catch (error) {
    console.error('Error en getMovements (service):', error);
    throw error;
  }
};

module.exports = {
  getBalance,
  getMovements,
};
