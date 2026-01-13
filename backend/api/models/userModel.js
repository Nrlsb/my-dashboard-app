// backend/api/models/userModel.js

const { pool, pool2 } = require('../db');

/**
 * Busca un usuario por su email en la base de datos principal.
 * @param {string} email - El email del usuario.
 * @returns {Promise<object|null>}
 */
const findUserByEmail = async (email) => {
  try {
    // 1. Try to find user in DB2 (New Source for Admins/Marketing)
    const db2Result = await pool2.query(
      `SELECT u.*, uc.password_hash, uc.temp_password_hash 
       FROM users u
       LEFT JOIN user_credentials uc ON u.id = uc.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (db2Result.rows.length > 0) {
      const user = db2Result.rows[0];
      console.log(`[userModel] User found in DB2: ${email}`);

      // Determine role from DB2
      const roleData = await getUserRoleFromDB2(user.id);
      user.role = roleData ? roleData.role : 'cliente'; // Should be admin/marketing usually
      user.permissions = roleData ? roleData.permissions : [];
      user.is_admin = user.role === 'admin';

      return user;
    }
  } catch (err) {
    console.error('[userModel] Error checking DB2 for user:', err);
    // Fallback to DB1 on error
  }

  // 2. Fallback to DB1 (Legacy/Clients)
  const result = await pool.query(
    `SELECT u.*, v.nombre as vendedor_nombre, v.telefono as vendedor_telefono, v.email as vendedor_email 
     FROM users u 
     LEFT JOIN vendedores v ON u.vendedor_codigo = v.codigo 
     WHERE u.email = $1`,
    [email]
  );

  const user = result.rows[0] || null;

  if (user) {
    try {
      const credsResult = await pool2.query(
        'SELECT password_hash, temp_password_hash FROM user_credentials WHERE user_id = $1',
        [user.id]
      );
      if (credsResult.rows.length > 0) {
        user.password_hash = credsResult.rows[0].password_hash;
        user.temp_password_hash = credsResult.rows[0].temp_password_hash;
      } else {
        user.password_hash = null;
        user.temp_password_hash = null;
      }
    } catch (err) {
      console.error('[userModel] Error fetching credentials from DB2:', err);
      user.password_hash = null;
    }
  }

  return user;
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

  try {
    // 1. Try to find user in DB2
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
      user.role = roleData ? roleData.role : 'cliente';
      user.permissions = roleData ? roleData.permissions : [];
      user.is_admin = user.role === 'admin';

      return user;
    }
  } catch (err) {
    console.error('[userModel] Error checking DB2 by ID:', err);
  }

  // 2. Fallback to DB1
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.a1_cod, u.a1_loja, u.a1_cgc, u.a1_tel, u.a1_endereco, u.is_admin, u.vendedor_codigo, v.nombre as vendedor_nombre, v.telefono as vendedor_telefono, v.email as vendedor_email 
     FROM users u 
     LEFT JOIN vendedores v ON u.vendedor_codigo = v.codigo 
     WHERE u.id = $1`,
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
      const roleData = await getUserRoleFromDB2(user.id);
      user.role = roleData ? roleData.role : 'cliente';
      user.permissions = roleData ? roleData.permissions : [];
      user.is_admin = user.role === 'admin';

      // [NUEVO] Obtener credenciales desde DB2 user_credentials
      try {
        const credsResult = await pool2.query(
          'SELECT password_hash, temp_password_hash FROM user_credentials WHERE user_id = $1',
          [user.id]
        );
        if (credsResult.rows.length > 0) {
          user.password_hash = credsResult.rows[0].password_hash;
          user.temp_password_hash = credsResult.rows[0].temp_password_hash;
        }
      } catch (err) {
        console.error('[userModel] Error fetching credentials by ID from DB2:', err);
      }
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

  // Placeholder para DB1
  const passwordPlaceholder = 'MOVED_TO_DB2';

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
    passwordPlaceholder,
    a1_cod,
    a1_loja,
    a1_cgc,
    a1_tel,
    false,
  ];

  const result = await pool.query(query, values);
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
    // Query user_roles and roles
    // We assume a user has one role for now, or we pick the first one.
    // If we want to support multiple roles, we might need to aggregate permissions.
    // For now, let's pick the one with most permissions or just the first one.
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
  const roleData = await getUserRoleFromDB2(userId);
  return roleData && roleData.role === 'admin';
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

/**
 * Busca un usuario por su código de cliente (a1_cod) en la base de datos principal.
 * @param {string} code - El código del cliente.
 * @returns {Promise<object|null>}
 */
const findUserByCode = async (code) => {
  // Aseguramos que el código sea tratado como string y sin espacios extra, 
  // aunque a1_cod en DB suele ser varchar.
  const cleanCode = String(code).trim();

  const result = await pool.query(
    `SELECT u.*, v.nombre as vendedor_nombre, v.telefono as vendedor_telefono, v.email as vendedor_email 
     FROM users u 
     LEFT JOIN vendedores v ON u.vendedor_codigo = v.codigo 
     WHERE u.a1_cod = $1`,
    [cleanCode]
  );

  const user = result.rows[0] || null;

  if (user) {
    try {
      const credsResult = await pool2.query(
        'SELECT password_hash, temp_password_hash FROM user_credentials WHERE user_id = $1',
        [user.id]
      );
      if (credsResult.rows.length > 0) {
        user.password_hash = credsResult.rows[0].password_hash;
        user.temp_password_hash = credsResult.rows[0].temp_password_hash;
      } else {
        user.password_hash = null;
        user.temp_password_hash = null;
      }
    } catch (err) {
      console.error('[userModel] Error fetching credentials from DB2:', err);
      user.password_hash = null;
    }
  }

  return user;
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
