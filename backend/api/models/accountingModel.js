// backend/api/models/accountingModel.js

const { pool } = require('../db');
const { formatCurrency } = require('../utils/helpers');

/**
 * Busca un usuario por su código de cliente (a1_cod).
 * @param {string} customerCod - El código de cliente.
 * @returns {Promise<object|null>} El usuario encontrado o null.
 */
const findUserByCustomerCode = async (customerCod) => {
  const result = await pool.query('SELECT id FROM users WHERE a1_cod = $1', [
    customerCod,
  ]);
  return result.rows[0] || null;
};

/**
 * Inserta un movimiento de nota de crédito en la base de datos.
 * @param {number} userId - El ID del usuario al que se le aplica la nota de crédito.
 * @param {number} amount - El monto total del crédito.
 * @param {string} description - La descripción del movimiento.
 * @returns {Promise<object>} El movimiento creado.
 */
const insertCreditNoteMovement = async (userId, amount, description) => {
  const query = `
    INSERT INTO account_movements 
      (user_id, credit, description, date)
    VALUES 
      ($1, $2, $3, CURRENT_DATE)
    RETURNING *;
  `;
  const values = [userId, amount, description];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Obtiene las facturas (movimientos de débito) de un cliente.
 * @param {string} customerCod - El código de cliente.
 * @returns {Promise<Array<object>>} Una lista de facturas.
 */
const findInvoicesByCustomerCode = async (customerCod) => {
  const query = `
    SELECT 
      am.id, am.date, am.debit, am.description, am.order_ref,
      TO_CHAR(am.date, 'DD/MM/YYYY') as formatted_date
    FROM account_movements am
    JOIN users u ON am.user_id = u.id
    WHERE u.a1_cod = $1 
      AND am.debit > 0
      AND am.order_ref IS NOT NULL
    ORDER BY am.date DESC;
  `;
  const result = await pool.query(query, [customerCod]);

  // Formatear para que coincida con lo que el frontend podría esperar
  return result.rows.map((inv) => ({
    id: inv.id,
    created_at: inv.date,
    amount: -inv.debit,
    formattedAmount: formatCurrency(-inv.debit),
    description: inv.description,
    formatted_date: inv.formatted_date,
    invoiceId: inv.order_ref,
  }));
};

module.exports = {
  findUserByCustomerCode,
  insertCreditNoteMovement,
  findInvoicesByCustomerCode,
};
