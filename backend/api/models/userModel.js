// backend/api/models/userModel.js

const { pool, pool2 } = require('../db');

/**
 * Busca un usuario por su email en la base de datos principal.
 * @param {string} email - El email del usuario.
 * @returns {Promise<object|null>}
 */
const findUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

/**
 * Busca un usuario por su ID.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object|null>}
 */
const findUserById = async (userId) => {
  const result = await pool.query('SELECT id, full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, a1_endereco, is_admin FROM users WHERE id = $1', [userId]);
  return result.rows[0] || null;
};

/**
 * Crea un nuevo usuario en la base de datos.
 * @param {object} userData - Datos del usuario.
 * @param {string} passwordHash - El hash de la contraseña.
 * @returns {Promise<object>}
 */
const createUser = async (userData, passwordHash) => {
  const { nombre, email, a1_cod, a1_loja, a1_cgc, a1_tel } = userData;
  const query = `
    INSERT INTO users 
      (full_name, email, password_hash, a1_cod, a1_loja, a1_cgc, a1_tel, is_admin)
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const values = [nombre, email, passwordHash, a1_cod, a1_loja, a1_cgc, a1_tel, false];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Verifica si un usuario es administrador.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<boolean>}
 */
const isUserAdmin = async (userId) => {
  try {
    const adminCheck = await pool2.query('SELECT 1 FROM admins WHERE user_id = $1', [userId]);
    return adminCheck.rows.length > 0;
  } catch (adminDbError) {
    console.error('Error al consultar la tabla de administradores en DB2:', adminDbError);
    // Es más seguro asumir que no es admin si la DB2 falla.
    return false;
  }
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  isUserAdmin,
};
