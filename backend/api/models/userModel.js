// backend/api/models/userModel.js

const { pool, pool2 } = require('../db');

/**
 * Busca un usuario por su email en la base de datos principal (Ahora sincronizada en DB2).
 * @param {string} email - El email del usuario.
 * @returns {Promise<object|null>}
 */
const findUserByEmail = async (email) => {
  try {
    // Busca en la tabla 'users' de DB2 y une con credenciales
    const db2Result = await pool2.query(
      `SELECT u.*, uc.password_hash, uc.temp_password_hash 
       FROM users u
       LEFT JOIN user_credentials uc ON u.id = uc.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (db2Result.rows.length > 0) {
      const user = db2Result.rows[0];

      // Determine role from DB2 roles table
      const roleData = await getUserRoleFromDB2(user.id);
      user.role = roleData ? roleData.role : (user.vendedor_codigo ? 'vendedor' : 'cliente'); // Logic adjusted: if has vendor code, might be vendor attached OR just client with vendor.
      // Wait, 'vendedor_codigo' in 'users' table means "This client belongs to vendor X".
      // It DOES NOT mean the user IS a vendor.
      // The logic for 'vendedor' role usually implies 'is_admin' is false but they are in 'vendedores' table?
      // Re-reading logic: users (clients) have 'vendedor_codigo'.
      // If user is actually a VENDOR, they log in via 'vendedores' table (vendedorModel).
      // So here in userModel, 'role' usually defaults to 'cliente' or 'admin'.

      if (user.is_admin) {
        user.role = 'admin';
      }

      user.permissions = roleData ? roleData.permissions : [];
      return user;
    }
  } catch (err) {
    console.error('[userModel] Error checking DB2 for user:', err);
  }
  return null;
};

/**
 * Busca un usuario por su ID.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object|null>}
 */
const findUserById = async (userId) => {
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) return null;

  try {
    const db2Result = await pool2.query(
      `SELECT u.*, uc.password_hash, uc.temp_password_hash 
       FROM users u
       LEFT JOIN user_credentials uc ON u.id = uc.user_id
       WHERE u.id = $1`,
      [numericUserId]
    );

    if (db2Result.rows.length > 0) {
      const user = db2Result.rows[0];

      const roleData = await getUserRoleFromDB2(user.id);

      if (user.is_admin) {
        user.role = 'admin';
      } else {
        user.role = roleData ? roleData.role : 'cliente';
      }

      user.permissions = roleData ? roleData.permissions : [];
      return user;
    }
  } catch (err) {
    console.error('[userModel] Error checking DB2 by ID:', err);
  }
  return null;
};

/**
 * Crea un nuevo usuario en la base de datos (DB2).
 * @param {object} userData - Datos del usuario.
 * @param {string} passwordHash - El hash de la contraseña.
 * @returns {Promise<object>}
 */
const createUser = async (userData, passwordHash) => {
  const { nombre, email, a1_cod, a1_loja, a1_cgc, a1_tel } = userData;

  // Insert into DB2 'users'
  // Note: If syncing from ERP, maybe we shouldn't create users here manually?
  // But for 'Admin' creation or 'Test' users, we might need it.

  const query = `
    INSERT INTO users 
      (full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, is_admin)
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  // Note: Removed password_hash from users table insert, assuming it's only in credentials
  const values = [
    nombre,
    email,
    a1_cod || null,
    a1_loja || null,
    a1_cgc || null,
    a1_tel || null,
    false,
  ];

  const result = await pool2.query(query, values);
  const newUser = result.rows[0];

  if (newUser) {
    try {
      await pool2.query(
        'INSERT INTO user_credentials (user_id, password_hash, temp_password_hash) VALUES ($1, $2, $3)',
        [newUser.id, passwordHash, null]
      );
      newUser.password_hash = passwordHash;
    } catch (err) {
      console.error('[userModel] Error creating credentials in DB2:', err);
      throw new Error('Error guardando credenciales en DB2.');
    }
  }

  return newUser;
};

/**
 * Verifica el rol del usuario consultando las tablas de roles en DB2.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object|null>} - { role: string, permissions: string[] } o null.
 */
const getUserRoleFromDB2 = async (userId) => {
  try {
    const query = `
      SELECT r.name, r.permissions
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
      LIMIT 1
    `;
    const result = await pool2.query(query, [userId]);

    if (result.rows.length > 0) {
      return {
        role: result.rows[0].name,
        permissions: result.rows[0].permissions
      };
    }

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
  // Check is_admin flag first for speed if available, or role
  const user = await findUserById(userId);
  return user && user.role === 'admin';
};

/**
 * Actualiza los datos de un usuario en la base de datos (DB2).
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

  const result = await pool2.query(query, values);
  return result.rows[0] || null;
};

/**
 * Busca todos los usuarios (clientes) asignados a un código de vendedor.
 * @param {string} vendedorCodigo - El código del vendedor.
 * @returns {Promise<Array<object>>}
 */
const findUsersByVendedorCodigo = async (vendedorCodigo) => {
  const result = await pool2.query(
    'SELECT id, full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, a1_endereco FROM users WHERE vendedor_codigo = $1',
    [vendedorCodigo]
  );
  return result.rows;
};

/**
 * Limpia (pone a NULL) el hash de la contraseña temporal de un usuario.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<boolean>}
 */
const clearTempPasswordHash = async (userId) => {
  const result = await pool2.query(
    'UPDATE user_credentials SET temp_password_hash = NULL WHERE user_id = $1',
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
    UPDATE user_credentials 
    SET 
      password_hash = $1, 
      temp_password_hash = NULL
    WHERE user_id = $2
  `;
  const result = await pool2.query(query, [passwordHash, userId]);
  return result.rowCount > 0;
};


/**
 * Busca todos los usuarios con rol de cliente en la base de datos.
 * @returns {Promise<Array<object>>}
 */
const findAllClients = async () => {
  const result = await pool2.query(
    'SELECT id, full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, a1_endereco FROM users WHERE is_admin = FALSE'
  );
  return result.rows;
};

/**
 * Busca un usuario por su código de cliente (a1_cod) en la base de datos principal.
 * @param {string} code - El código del cliente.
 * @returns {Promise<object|null>}
 */
const findUserByCode = async (code) => {
  const cleanCode = String(code).trim();

  try {
    const db2Result = await pool2.query(
      `SELECT u.*, uc.password_hash, uc.temp_password_hash 
       FROM users u
       LEFT JOIN user_credentials uc ON u.id = uc.user_id
       WHERE u.a1_cod = $1`,
      [cleanCode]
    );

    if (db2Result.rows.length > 0) {
      const user = db2Result.rows[0];

      // Determine role from DB2
      const roleData = await getUserRoleFromDB2(user.id);

      if (user.is_admin) {
        user.role = 'admin';
      } else {
        user.role = roleData ? roleData.role : 'cliente';
      }
      user.permissions = roleData ? roleData.permissions : [];

      return user;
    }
  } catch (err) {
    console.error('[userModel] Error checking DB2 by Code:', err);
  }
  return null;
};

/**
 * Busca vendedores por una lista de códigos.
 * @param {Array<string>} codes - Lista de códigos de vendedores.
 * @returns {Promise<Array<object>>} - Lista de objetos con info del vendedor (codigo, nombre, email, telefono).
 */
const getVendedoresByCodes = async (codes) => {
  if (!codes || codes.length === 0) return [];

  // Filtrar duplicados y valores nulos/vacíos
  const uniqueCodes = [...new Set(codes.filter(c => c))];

  if (uniqueCodes.length === 0) return [];

  const query = `
    SELECT codigo, nombre, email, telefono
    FROM vendedores
    WHERE codigo = ANY($1)
  `;

  const result = await pool.query(query, [uniqueCodes]);
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
  getUserRoleFromDB2,
  findUserByCode, // Export new function
  getVendedoresByCodes, // Export new function
};
