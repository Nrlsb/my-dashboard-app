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

    // Fallback: Check if it's a virtual ID from user_credentials (decoupled client/vendor)
    const credResult = await pool2.query(
      'SELECT a1_cod FROM user_credentials WHERE user_id = $1',
      [numericUserId]
    );
    if (credResult.rows.length > 0) {
      const { a1_cod } = credResult.rows[0];
      // Use our robust findUserByCode to resolve full profile from API (Client or Vendor)
      if (a1_cod) {
        return await findUserByCode(a1_cod);
      }

      // If for some reason a1_cod is missing in credentials?
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
  try {
    // 1. Fetch all clients from Protheus API
    const clients = await protheusService.getClients();

    // 2. Filter by vendor code (a1_vend)
    const normalizedVendorCode = String(vendedorCodigo).trim();

    const filteredClients = clients.filter(client => {
      return client.a1_vend && client.a1_vend.trim() === normalizedVendorCode;
    });

    // 3. Map to expected format
    // Note: We need to see if these clients have passwords/credentials in our DB for completeness?
    // For the list view, usually just basic info is enough.
    // If we want to show if they have a password, we would need to batch query credentials.
    // For now, let's return the basic info.

    return filteredClients.map(c => ({
      id: parseInt(c.a1_cod) + 100000, // Virtual ID gen logic (same as findUserById if we used it) or just use code
      // Better to use code as ID if possible but frontend might expect number.
      // Let's stick to the virtual ID convention we saw in sync scripts just in case: starting 100000
      // Actually, let's look at how we generate IDs for virtual users. 
      // In findUserByCode we generate it dynamically? No, we simply fetch credentials by code.
      // We don't really have a stable numeric ID for them unless we hash the code or something.
      // Let's use the numeric part if possible, or just a placeholder.
      // But wait, the frontend uses `client.id` for keys.
      // Let's try to parse a1_cod to int + offset.

      full_name: c.a1_nome.trim(),
      email: c.a1_email ? c.a1_email.trim() : null,
      a1_cod: c.a1_cod.trim(),
      a1_loja: c.a1_loja,
      a1_cgc: c.a1_cgc ? c.a1_cgc.trim() : null,
      a1_tel: c.a1_xtel1 ? c.a1_xtel1.trim() : null,
      a1_endereco: c.a1_end ? c.a1_end.trim() : null,
      vendedor_codigo: c.a1_vend ? c.a1_vend.trim() : null
    }));

  } catch (error) {
    console.error('[userModel] Error fetching clients for vendor:', error);
    return [];
  }
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
    // Try to find in Clients first
    const clients = await protheusService.getClients();
    let apiClient = clients.find(c => c.a1_cod && c.a1_cod.trim() === cleanCode);
    let isVendor = false;

    // If not found in Clients, try Vendors (Sellers)
    if (!apiClient) {
      const sellers = await protheusService.getSellers();
      const apiSeller = sellers.find(s => s.a3_cod && s.a3_cod.trim() === cleanCode);

      if (apiSeller) {
        isVendor = true;
        // Normalize seller data to look like client to share structure or flag it
        apiClient = {
          a1_nome: apiSeller.a3_nome,
          a1_email: apiSeller.a3_email,
          a1_cod: apiSeller.a3_cod,
          a1_loja: '00', // Default
          a1_cgc: null, // Vendedores might not have CUIT exposed here
          a1_xtel1: apiSeller.a3_cel,
          a1_end: null, // Address not typical for vendor object here
          a1_mun: null,
          a1_est: null
        };
      }
    }

    if (!apiClient) {
      console.log(`[userModel] User code ${cleanCode} not found in API (Neither Client nor Vendor).`);
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
      console.log(`[userModel] Code ${cleanCode} has NO credentials in DB.`);
      // If no credentials, we might still want to return the profile for read-only purposes?
      // But typically we need an ID. If it's just a lookup by code, maybe we return what we have.
      // But findUserByCode is mostly used for Auth or resolving users with IDs.
      // Let's return null if no credentials because we can't map to a system User ID.
      // EXCEPTION: If we are just resolving profile data and don't care about ID? 
      // But the function signature implies returning a User object which usually has an ID.
      return null;
    }

    // 5. Fetch Vendor Details (Client only)
    // If it's a vendor (isVendor=true), "vendedor" field doesn't make sense (they ARE the vendor).
    let vendorDetails = null;
    let vendorCode = null;

    if (!isVendor) {
      vendorCode = apiClient.a1_vend ? apiClient.a1_vend.trim() : null;
      if (vendorCode) {
        const sellers = await protheusService.getSellers();
        const seller = sellers.find(s => s.a3_cod && s.a3_cod.trim() === vendorCode);
        if (seller) {
          vendorDetails = {
            codigo: seller.a3_cod.trim(),
            nombre: seller.a3_nome.trim(),
            email: seller.a3_email ? seller.a3_email.trim() : null,
            telefono: seller.a3_cel ? seller.a3_cel.trim() : null
          };
        }
      }
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
      role: roleData ? roleData.role : (isVendor ? 'vendedor' : 'cliente'), // Use detected type as fallback
      permissions: roleData ? roleData.permissions : [],

      // Metadata extra
      a1_mun: apiClient.a1_mun ? apiClient.a1_mun.trim() : null,
      a1_est: apiClient.a1_est,
      vendedor_codigo: vendorCode,
      vendedor: vendorDetails
    };

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
      vendedor_codigo: vendorCode, // Keep for backward compat
      vendedor: vendorDetails // New detailed object
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
