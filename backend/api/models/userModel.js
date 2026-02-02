// backend/api/models/userModel.js

const { pool, pool2 } = require('../db');
const protheusService = require('../services/protheusService');

/**
 * Busca un usuario por su email.
 */
const findUserByEmail = async (email) => {
  try {
    const db2Result = await pool2.query(
      `SELECT u.*, uc.password_hash, uc.temp_password_hash, uc.must_change_password
       FROM users u
       LEFT JOIN user_credentials uc ON u.id = uc.user_id
       WHERE LOWER(TRIM(u.email)) = LOWER(TRIM($1))`,
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

      // [FIX] Fetch detailed Vendor info if available
      if (user.vendedor_codigo) {
        const vendorQuery = `
          SELECT codigo, nombre, email, telefono 
          FROM vendedores 
          WHERE 
            (codigo ~ '^[0-9]+$' AND $1 ~ '^[0-9]+$' AND CAST(codigo AS BIGINT) = CAST($1 AS BIGINT))
            OR TRIM(codigo) = TRIM($1)
        `;
        const vendorResult = await pool2.query(vendorQuery, [user.vendedor_codigo.trim()]);
        if (vendorResult.rows.length > 0) {
          user.vendedor = vendorResult.rows[0];
        }
      }

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
      `SELECT u.*, uc.password_hash, uc.temp_password_hash, uc.must_change_password
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

      // [FIX] Fetch detailed Vendor info if available
      if (user.vendedor_codigo) {
        const vendorQuery = `
          SELECT codigo, nombre, email, telefono 
          FROM vendedores 
          WHERE 
            (codigo ~ '^[0-9]+$' AND $1 ~ '^[0-9]+$' AND CAST(codigo AS BIGINT) = CAST($1 AS BIGINT))
            OR TRIM(codigo) = TRIM($1)
        `;
        const vendorResult = await pool2.query(vendorQuery, [user.vendedor_codigo.trim()]);
        if (vendorResult.rows.length > 0) {
          user.vendedor = vendorResult.rows[0];
        }
      }

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
    console.log(
      `[userService] getVendedorClients -> Buscando clientes para vendedorCodigo: ${vendedorCodigo} en DB Local`
    );

    const normalizedVendorCode = String(vendedorCodigo).trim();

    // Query local users table
    // Note: We select fields to match the previous structure as closely as possible
    const query = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.a1_cod, 
        u.a1_loja, 
        u.a1_cgc, 
        u.a1_tel, 
        u.a1_endereco, 
        u.vendedor_codigo,
        (
          SELECT TO_CHAR(MAX(o.created_at), 'DD/MM/YYYY')
          FROM orders o 
          WHERE o.user_id = u.id
        ) as last_order_date
      FROM users u
      WHERE u.vendedor_codigo = $1
      ORDER BY u.full_name ASC
    `;

    const result = await pool2.query(query, [normalizedVendorCode]);
    const clients = result.rows;

    console.log(
      `[userService] getVendedorClients -> Encontrados ${clients.length} clientes para vendedorCodigo: ${vendedorCodigo}`
    );

    return clients.map(c => ({
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      a1_cod: c.a1_cod,
      a1_loja: c.a1_loja,
      a1_cgc: c.a1_cgc,
      a1_tel: c.a1_tel,
      a1_endereco: c.a1_endereco,
      vendedor_codigo: c.vendedor_codigo,
      last_order_date: c.last_order_date
    }));

  } catch (error) {
    console.error('[userModel] Error fetching clients for vendor from DB:', error);
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

const updatePassword = async (userId, passwordHash, mustChangePassword = false) => {
  const query = `
    UPDATE user_credentials 
    SET 
      password_hash = $1, 
      temp_password_hash = NULL,
      must_change_password = $3
    WHERE user_id = $2
  `;
  const result = await pool2.query(query, [passwordHash, userId, mustChangePassword]);

  if (result.rowCount === 0) {
    // Fallback: If no credentials exist, create them (Upsert behavior)
    console.log(`[userModel] updatePassword: No credentials found for user ${userId}. Creating new record.`);
    const insertQuery = `
        INSERT INTO user_credentials (user_id, password_hash, must_change_password, temp_password_hash)
        VALUES ($1, $2, $3, NULL)
    `;
    const insertResult = await pool2.query(insertQuery, [userId, passwordHash, mustChangePassword]);
    return insertResult.rowCount > 0;
  }

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
      `SELECT u.*, uc.password_hash, uc.temp_password_hash, uc.must_change_password
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

      // [FIX] Fetch detailed Vendor info if available (Local DB)
      if (user.vendedor_codigo) {
        const vendorQuery = `
          SELECT codigo, nombre, email, telefono 
          FROM vendedores 
          WHERE 
            (codigo ~ '^[0-9]+$' AND $1 ~ '^[0-9]+$' AND CAST(codigo AS BIGINT) = CAST($1 AS BIGINT))
            OR TRIM(codigo) = TRIM($1)
        `;
        const vendorResult = await pool2.query(vendorQuery, [user.vendedor_codigo.trim()]);
        if (vendorResult.rows.length > 0) {
          user.vendedor = vendorResult.rows[0];
        }
      }

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
      // Intento final: Buscar en tabla local de Vendedores (DB2)
      // Puede que el vendedor esté sincronizado en DB pero no responda la API en este momento o sea un vendedor manual.
      const localVendorRes = await pool2.query('SELECT * FROM vendedores WHERE codigo = $1', [cleanCode]);

      if (localVendorRes.rows.length > 0) {
        const localVendor = localVendorRes.rows[0];
        isVendor = true;
        apiClient = {
          a1_nome: localVendor.nombre,
          a1_email: localVendor.email,
          a1_cod: localVendor.codigo,
          a1_loja: '00',
          a1_cgc: null,
          a1_xtel1: localVendor.telefono,
          a1_end: null,
          a1_mun: null,
          a1_est: null
        };
        console.log(`[userModel] Identificado como Vendedor Local (DB): ${cleanCode}`);
      }
    }

    if (!apiClient) {
      console.log(`[userModel] User code ${cleanCode} not found in API (Neither Client nor Vendor) and not in Local Vendors.`);
      return null;
    }

    // 3. Buscar Credenciales DIRECTAMENTE en user_credentials
    // Usamos a1_cod O a3_cod como llave de enlace
    const credsResult = await pool2.query(
      `SELECT user_id, password_hash, temp_password_hash, email, must_change_password
       FROM user_credentials 
       WHERE a1_cod = $1 OR a3_cod = $1`,
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
    let vendorDetails = null;
    let vendorCode = null;

    if (!isVendor) {
      // Logic to get vendor code from apiClient
      vendorCode = apiClient.a1_vend ? apiClient.a1_vend.trim() : null;

      if (vendorCode) {
        // Try local DB first (faster/reliable)
        const vendorQuery = `
          SELECT codigo, nombre, email, telefono 
          FROM vendedores 
          WHERE 
            (codigo ~ '^[0-9]+$' AND $1 ~ '^[0-9]+$' AND CAST(codigo AS BIGINT) = CAST($1 AS BIGINT))
            OR TRIM(codigo) = TRIM($1)
        `;
        const vendorResult = await pool2.query(vendorQuery, [vendorCode]);

        if (vendorResult.rows.length > 0) {
          vendorDetails = vendorResult.rows[0];
        } else {
          // Fallback to API if not in local DB (optional, or just leave null)
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
      must_change_password: credentials.must_change_password,

      // Roles
      is_admin: false,
      role: roleData ? roleData.role : (isVendor ? 'vendedor' : 'cliente'),
      permissions: roleData ? roleData.permissions : [],

      // Metadata extra
      a1_mun: apiClient.a1_mun ? apiClient.a1_mun.trim() : null,
      a1_est: apiClient.a1_est,
      vendedor_codigo: vendorCode,
      vendedor: vendorDetails
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

/**
 * Desactiva (is_active = FALSE) a los clientes que no hayan realizado pedidos en el último mes.
 * O que se hayan registrado hace más de un mes y nunca hayan hecho un pedido.
 */
const deactivateInactiveClients = async () => {
  try {
    console.log('[userModel] deactivateInactiveClients -> Iniciando verificación de inactividad...');

    // Consulta para identificar y actualizar usuarios inactivos
    const query = `
      UPDATE users
      SET is_active = FALSE
      WHERE id IN (
        SELECT u.id
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.is_active = TRUE
        AND u.is_admin = FALSE
        AND u.vendedor_codigo IS NULL -- Excluir vendedores si están en esta tabla
        AND u.id NOT IN (SELECT user_id FROM user_roles) -- Excluir usuarios con roles asignados (admin, marketing, etc.)
        GROUP BY u.id

        HAVING
          -- Tiene pedidos, pero el último es antiguo (> 1 mes)
          (MAX(o.created_at) < NOW() - INTERVAL '1 month')
          OR
          -- No tiene pedidos, y el usuario fue creado hace tiempo (> 1 mes)
          (MAX(o.created_at) IS NULL AND u.created_at < NOW() - INTERVAL '1 month')
      )
      RETURNING id, full_name, email;
    `;

    const result = await pool2.query(query);

    if (result.rows.length > 0) {
      console.log(`[userModel] deactivateInactiveClients -> Desactivados ${result.rows.length} usuarios.`);
      result.rows.forEach(u => console.log(` - Usuario desactivado: ID ${u.id} | ${u.full_name} (${u.email})`));
    } else {
      console.log('[userModel] deactivateInactiveClients -> No se encontraron usuarios inactivos para desactivar.');
    }

    return result.rowCount;
  } catch (error) {
    console.error('[userModel] Error desactivando usuarios inactivos:', error);
    return 0;
  }
};

const updateSellerPermissions = async (userId, groups) => {
  const client = await pool2.connect();
  try {
    await client.query('BEGIN');

    // 1. Get user_code
    let userQuery = 'SELECT a1_cod FROM users WHERE id = $1';
    let userResult = await client.query(userQuery, [userId]);
    let userCode = userResult.rows.length > 0 ? userResult.rows[0].a1_cod : null;

    if (!userCode) {
      const credResult = await client.query('SELECT a1_cod FROM user_credentials WHERE user_id = $1', [userId]);
      userCode = credResult.rows.length > 0 ? credResult.rows[0].a1_cod : null;
    }

    if (!userCode) {
      throw new Error('Usuario sin código A1 asignado');
    }

    // 2. Delete existing Seller permissions
    await client.query(
      "DELETE FROM user_product_group_permissions WHERE user_code = $1 AND assigned_by_role = 'vendedor'",
      [userCode]
    );

    // 3. Insert new Seller permissions
    if (groups && groups.length > 0) {
      const insertQuery =
        "INSERT INTO user_product_group_permissions (user_id, product_group, user_code, assigned_by_role) VALUES ($1, $2, $3, 'vendedor')";
      for (const group of groups) {
        await client.query(insertQuery, [userId, group, userCode]);
      }
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in updateSellerPermissions:', error);
    throw error;
  } finally {
    client.release();
  }
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
  deactivateInactiveClients,
  updateSellerPermissions, // [NEW]
};
