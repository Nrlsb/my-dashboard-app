// backend/api/models/vendedorModel.js

const { pool2 } = require('../db');

/**
 * Busca un vendedor por su email.
 * @param {string} email - El email del vendedor.
 * @returns {Promise<object|null>}
 */
const findVendedorByEmail = async (email) => {
  const query =
    'SELECT codigo, nombre, email, telefono, password, temp_password_hash FROM vendedores WHERE email = $1';
  const result = await pool2.query(query, [email]);
  return result.rows[0] || null;
};

/**
 * Busca un vendedor por su código.
 * @param {string} codigo - El código del vendedor.
 * @returns {Promise<object|null>}
 */
const findVendedorByCodigo = async (codigo) => {
  const query =
    'SELECT codigo, nombre, email, telefono FROM vendedores WHERE codigo = $1';
  const result = await pool2.query(query, [codigo]);
  return result.rows[0] || null;
};

/**
 * Limpia (pone a NULL) el hash de la contraseña temporal de un vendedor.
 * @param {string} vendedorCodigo - El código del vendedor.
 * @returns {Promise<boolean>}
 */
const clearTempPasswordHash = async (vendedorCodigo) => {
  const result = await pool2.query(
    'UPDATE vendedores SET temp_password_hash = NULL WHERE codigo = $1',
    [vendedorCodigo.trim()]
  );
  return result.rowCount > 0;
};

/**
 * Actualiza la contraseña de un vendedor y limpia los campos de contraseña temporal.
 * @param {string} vendedorCodigo - El código del vendedor.
 * @param {string} passwordHash - El nuevo hash de la contraseña.
 * @returns {Promise<boolean>}
 */
const updatePassword = async (vendedorCodigo, passwordHash) => {
  const query = `
     UPDATE vendedores 
     SET 
       password = $1, 
       temp_password_hash = NULL
     WHERE codigo = $2
   `;
  const result = await pool2.query(query, [passwordHash, vendedorCodigo.trim()]);
  return result.rowCount > 0;
};

module.exports = {
  findVendedorByEmail,
  clearTempPasswordHash,
  updatePassword,
  findVendedorByCodigo,
};
