// backend/api/models/userModel.js

const { pool, pool2 } = require('../db');

/**
 * Busca un usuario por su email en la base de datos principal.
 * @param {string} email - El email del usuario.
 * @returns {Promise<object|null>}
 */
const findUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [
    email,
  ]);
  return result.rows[0] || null;
};

/**
 * Busca un usuario por su ID.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object|null>}
 */
const findUserById = async (userId) => {
  // Convertir userId a entero para asegurar la comparación correcta con la columna ID numérica
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    console.error(
      `[userModel] Invalid userId provided to findUserById: ${userId}`
    );
    return null;
  }

  const result = await pool.query(
    'SELECT id, full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, a1_endereco, is_admin, vendedor_codigo FROM users WHERE id = $1',
    [numericUserId]
  );
  const user = result.rows[0] || null;

  if (user) {
    if (user.vendedor_codigo) {
      user.role = 'vendedor';
      user.codigo = user.vendedor_codigo;
      user.is_admin = false;
    } else {
      // Check role in DB2
      const role = await getUserRoleFromDB2(user.id);
      user.role = role || 'cliente';
      user.is_admin = role === 'admin';
    }
  }
  console.log(
    `[userModel] findUserById(${userId}) -> user:`,
    user
      ? {
        id: user.id,
        role: user.role,
        codigo: user.codigo,
        vendedor_codigo: user.vendedor_codigo,
      }
      : 'null'
  );
  return user;
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
  const values = [
    nombre,
    email,
    passwordHash,
    a1_cod,
    a1_loja,
    a1_cgc,
    a1_tel,
    false,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Verifica el rol del usuario consultando las tablas de admins y marketing_users en DB2.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<string|null>} - 'admin', 'marketing', o null.
 */
const getUserRoleFromDB2 = async (userId) => {
  try {
    // Check admin
    const adminCheck = await pool2.query(
      'SELECT 1 FROM admins WHERE user_id = $1',
      [userId]
    );
    if (adminCheck.rows.length > 0) return 'admin';

    // Check marketing
    const marketingCheck = await pool2.query(
      'SELECT 1 FROM marketing_users WHERE user_id = $1',
      [userId]
    );
    if (marketingCheck.rows.length > 0) return 'marketing';

    return null;
  } catch (error) {
    console.error('Error checking user role in DB2:', error);
    return null;
  }
};

/**
 * Verifica si un usuario es administrador.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<boolean>}
 */
const isUserAdmin = async (userId) => {
  const role = await getUserRoleFromDB2(userId);
  return role === 'admin';
};

/**
 * Actualiza los datos de un usuario en la base de datos.
 * @param {number} userId - El ID del usuario a actualizar.
 * @param {object} profileData - Los nuevos datos del perfil.
 * @returns {Promise<object|null>}
 */
const updateUser = async (userId, profileData) => {
  const { A1_NOME, A1_NUMBER, A1_EMAIL, A1_END, A1_CGC } = profileData;
  const query = `
    UPDATE users
    SET full_name = $1, a1_tel = $2, email = $3, a1_endereco = $4, a1_cgc = $5
    WHERE id = $6
    RETURNING *;
  `;
  const values = [A1_NOME, A1_NUMBER, A1_EMAIL, A1_END || null, A1_CGC, userId];

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Busca todos los usuarios (clientes) asignados a un código de vendedor.
 * @param {string} vendedorCodigo - El código del vendedor.
 * @returns {Promise<Array<object>>}
 */
const findUsersByVendedorCodigo = async (vendedorCodigo) => {
  const result = await pool.query(
    'SELECT id, full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, a1_endereco FROM users WHERE vendedor_codigo = $1',
    [vendedorCodigo]
  );
  console.log(
    `[userModel] findUsersByVendedorCodigo(${vendedorCodigo}) -> found ${result.rows.length} clients. IDs:`,
    result.rows.map((r) => r.id)
  );
  return result.rows;
};

/**
 * Limpia (pone a NULL) el hash de la contraseña temporal de un usuario.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<boolean>}
 */
const clearTempPasswordHash = async (userId) => {
  const result = await pool.query(
    'UPDATE users SET temp_password_hash = NULL WHERE id = $1',
    [userId]
  );
  return result.rowCount > 0;
};

/**
 * Actualiza la contraseña de un usuario y limpia los campos de contraseña temporal.
 * @param {number} userId - El ID del usuario.
 * @param {string} passwordHash - El nuevo hash de la contraseña.
 * @returns {Promise<boolean>}
 */
const updatePassword = async (userId, passwordHash) => {
  const query = `
    UPDATE users 
    SET 
      password_hash = $1, 
      temp_password_hash = NULL
    WHERE id = $2
  `;
  const result = await pool.query(query, [passwordHash, userId]);
  return result.rowCount > 0;
};


/**
 * Busca todos los usuarios con rol de cliente en la base de datos.
 * Excluye a los que tienen 'vendedor_codigo' establecido o 'is_admin' en true (si queremos separar roles).
 * Para este caso, solo buscaremos todos los usuarios en la tabla 'users' que no sean administradores.
 * @returns {Promise<Array<object>>}
 */
const findAllClients = async () => {
  const result = await pool.query(
    'SELECT id, full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, a1_endereco FROM users WHERE is_admin = FALSE'
  );
  console.log(
    `[userModel] findAllClients -> found ${result.rows.length} clients.`
  );
  return result.rows;
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  isUserAdmin,
  updateUser,
  findUsersByVendedorCodigo,
  clearTempPasswordHash,
  updatePassword,
  findAllClients,
  getUserRoleFromDB2, // Export new function
};
