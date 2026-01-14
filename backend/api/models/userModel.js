// backend/api/models/userModel.js

const { pool, pool2 } = require('../db');
const protheusService = require('../services/protheusService');

/**
 * Busca un usuario por su email.
 */
const findUserByEmail = async (email) => {
  try {
    const db2Result = await pool2.query(
      `SELECT u.*, uc.password_hash, uc.temp_password_hash 
       FROM users u
       LEFT JOIN user_credentials uc ON u.id = uc.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (db2Result.rows.length > 0) {
      const user = db2Result.rows[0];

      const roleData = await getUserRoleFromDB2(user.id);
      user.role = roleData ? roleData.role : (user.vendedor_codigo ? 'vendedor' : 'cliente');

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

    // Fallback: Check if it's a virtual ID from user_credentials (decoupled client)
    const credResult = await pool2.query(
      'SELECT * FROM user_credentials WHERE user_id = $1',
      [numericUserId]
    );
    if (credResult.rows.length > 0) {
      // It's a virtual user (Client or Decoupled Vendor)
      // We lack profile data here as it lives in API, but for basic ID check it exists.
      return {
        id: numericUserId,
        role: 'cliente', // Default
        permissions: []
      };
    }

  } catch (err) {
    console.error('[userModel] Error checking DB2 by ID:', err);
  }
  return null;
};

const createUser = async (userData, passwordHash) => {
  const { nombre, email, a1_cod, a1_loja, a1_cgc, a1_tel } = userData;
  const query = `
    INSERT INTO users 
      (full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, is_admin)
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [nombre, email, a1_cod || null, a1_loja || null, a1_cgc || null, a1_tel || null, false];

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

const isUserAdmin = async (userId) => {
  const user = await findUserById(userId);
  return user && user.role === 'admin';
};

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

const findUsersByVendedorCodigo = async (vendedorCodigo) => {
  const result = await pool2.query(
    'SELECT id, full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, a1_endereco FROM users WHERE vendedor_codigo = $1',
    [vendedorCodigo]
  );
  return result.rows;
};

const clearTempPasswordHash = async (userId) => {
  const result = await pool2.query(
    'UPDATE user_credentials SET temp_password_hash = NULL WHERE user_id = $1',
    [userId]
  );
  return result.rowCount > 0;
};

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

const findAllClients = async () => {
  const result = await pool2.query(
    'SELECT id, full_name, email, a1_cod, a1_loja, a1_cgc, a1_tel, a1_endereco FROM users WHERE is_admin = FALSE'
  );
  return result.rows;
};


/**
 * Busca un usuario por su código de cliente (a1_cod).
 * VERSIÓN DECOUPLED: Prioriza API + user_credentials.
 * No requiere registro en tabla 'users'.
 */
const findUserByCode = async (code) => {
  const cleanCode = String(code).trim();

  try {
    // 1. PRIMERO: Buscar en base de datos local (users)
    // Esto cubre Vendedores y Admins que tienen a1_cod asignado en la BD
    const dbResult = await pool2.query(
      `SELECT u.*, uc.password_hash, uc.temp_password_hash 
         FROM users u
         LEFT JOIN user_credentials uc ON (u.id = uc.user_id OR u.a1_cod = uc.a1_cod)
         WHERE u.a1_cod = $1`,
      [cleanCode]
    );

    if (dbResult.rows.length > 0) {
      const user = dbResult.rows[0];
      const roleData = await getUserRoleFromDB2(user.id);

      user.role = roleData ? roleData.role : (user.is_admin ? 'admin' : 'vendedor'); // Defaulting to vendedor/admin if in DB
      user.permissions = roleData ? roleData.permissions : [];
      console.log(`[userModel] User ${cleanCode} found in LOCAL DB (Role: ${user.role}).`);
      return user;
    }

    // 2. SEGUNDO: Si no está en BD local, buscar en API (Flujo Cliente Desacoplado)
    const clients = await protheusService.getClients();
    const apiClient = clients.find(c => c.a1_cod && c.a1_cod.trim() === cleanCode);

    if (!apiClient) {
      console.log(`[userModel] Client ${cleanCode} not found in API.`);
      return null;
    }

    // 3. Buscar Credenciales DIRECTAMENTE en user_credentials
    // Usamos a1_cod como llave de enlace
    const credsResult = await pool2.query(
      `SELECT user_id, password_hash, temp_password_hash, email 
       FROM user_credentials 
       WHERE a1_cod = $1`,
      [cleanCode]
    );

    let credentials = {};
    let roleData = null;
    let userId = null;

    if (credsResult.rows.length > 0) {
      credentials = credsResult.rows[0];
      userId = credentials.user_id;

      roleData = await getUserRoleFromDB2(userId);
    } else {
      console.log(`[userModel] Client ${cleanCode} has NO credentials in DB.`);
      return null;
    }

    // 4. Combinar datos
    return {
      id: userId,
      full_name: apiClient.a1_nome.trim(),
      email: apiClient.a1_email ? apiClient.a1_email.trim() : (credentials.email || null),
      a1_cod: apiClient.a1_cod.trim(),
      a1_loja: apiClient.a1_loja,
      a1_cgc: apiClient.a1_cgc ? apiClient.a1_cgc.trim() : null,
      a1_tel: apiClient.a1_xtel1 ? apiClient.a1_xtel1.trim() : null,
      a1_endereco: apiClient.a1_end ? apiClient.a1_end.trim() : null,

      // Credenciales
      password_hash: credentials.password_hash,
      temp_password_hash: credentials.temp_password_hash,

      // Roles
      is_admin: false,
      role: roleData ? roleData.role : 'cliente',
      permissions: roleData ? roleData.permissions : [],

      // Metadata extra
      a1_mun: apiClient.a1_mun ? apiClient.a1_mun.trim() : null,
      a1_est: apiClient.a1_est,
      vendedor_codigo: apiClient.a1_vend ? apiClient.a1_vend.trim() : null
    };

  } catch (err) {
    console.error('[userModel] Error checking API/DB by Code:', err);
    return null;
  }
};

const getVendedoresByCodes = async (codes) => {
  if (!codes || codes.length === 0) return [];
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
  findUserByCode,
  getVendedoresByCodes,
};
