// backend/api/models/vendedorModel.js

const { pool2 } = require('../db');
const protheusService = require('../services/protheusService');

/**
 * Busca un vendedor por su email en la base de datos local.
 * @param {string} email - El email del vendedor.
 * @returns {Promise<object|null>}
 */
const findVendedorByEmail = async (email) => {
  try {
    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Buscar en la tabla local de vendedores
    const query = `
      SELECT codigo, nombre, email, telefono
      FROM vendedores
      WHERE LOWER(email) = $1
    `;
    const result = await pool2.query(query, [cleanEmail]);
    const seller = result.rows[0];

    if (!seller) {
      return null;
    }

    // 2. Buscar credenciales en DB2 (user_credentials)
    // Usamos el código (a1_cod) para mayor robustez, o el email como fallback
    const credsResult = await pool2.query(
      'SELECT user_id, password_hash, temp_password_hash FROM user_credentials WHERE a1_cod = $1 OR email = $2',
      [seller.codigo, cleanEmail]
    );

    const credentials = credsResult.rows[0] || {};

    // 3. Construir objeto combinado
    return {
      codigo: seller.codigo.trim(),
      nombre: seller.nombre.trim(),
      email: seller.email.trim(),
      telefono: seller.telefono ? seller.telefono.trim() : null,
      password_hash: credentials.password_hash || null,
      temp_password_hash: credentials.temp_password_hash || null,
      password: credentials.password_hash || null,
      user_id: credentials.user_id || null,
      a1_cod: seller.codigo.trim(),
      role: 'vendedor'
    };

  } catch (error) {
    console.error('[vendedorModel] Error en findVendedorByEmail:', error);
    return null;
  }
};

/**
 * Busca un vendedor por su código en la base de datos local.
 * @param {string} codigo - El código del vendedor.
 * @returns {Promise<object|null>}
 */
const findVendedorByCodigo = async (codigo) => {
  try {
    const cleanCode = String(codigo).trim();

    const query = `
      SELECT codigo, nombre, email, telefono
      FROM vendedores
      WHERE codigo = $1
    `;
    const result = await pool2.query(query, [cleanCode]);
    const seller = result.rows[0];

    if (!seller) {
      return null;
    }

    return {
      codigo: seller.codigo.trim(),
      nombre: seller.nombre.trim(),
      email: seller.email.trim(),
      telefono: seller.telefono ? seller.telefono.trim() : null
    };

  } catch (error) {
    console.error('[vendedorModel] Error en findVendedorByCodigo:', error);
    return null;
  }
};

/**
 * Limpia (pone a NULL) el hash de la contraseña temporal.
 * Ahora actualiza la tabla user_credentials buscando por email.
 * IMPORTANTE: Requiere el email del vendedor o buscarlo primero por código.
 * Dado que el servicio pasa el código, buscaremos el email primero.
 * @param {string} vendedorCodigo - El código del vendedor.
 * @returns {Promise<boolean>}
 */
const clearTempPasswordHash = async (vendedorCodigo) => {
  try {
    // Necesitamos el email para ubicar el registro en user_credentials
    // Opción A: Buscar el vendedor por código para obtener el email
    const seller = await findVendedorByCodigo(vendedorCodigo);
    if (!seller || !seller.email) {
      console.error('[vendedorModel] No se pudo encontrar email para el codigo:', vendedorCodigo);
      return false;
    }

    const cleanEmail = seller.email.trim().toLowerCase();

    const result = await pool2.query(
      'UPDATE user_credentials SET temp_password_hash = NULL WHERE email = $1',
      [cleanEmail]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('[vendedorModel] Error en clearTempPasswordHash:', error);
    return false;
  }
};

/**
 * Actualiza la contraseña de un vendedor.
 * @param {string} vendedorCodigo - El código del vendedor.
 * @param {string} passwordHash - El nuevo hash de la contraseña.
 * @returns {Promise<boolean>}
 */
const updatePassword = async (vendedorCodigo, passwordHash) => {
  try {
    // Buscar email primero
    const seller = await findVendedorByCodigo(vendedorCodigo);
    if (!seller || !seller.email) {
      return false;
    }

    const cleanEmail = seller.email.trim().toLowerCase();

    const query = `
       UPDATE user_credentials
       SET 
         password_hash = $1, 
         temp_password_hash = NULL
       WHERE email = $2
     `;
    // Nota: Si el registro no existe en user_credentials, esto no insertará nada.
    // Se asume que el registro existe. Si no, debería crearse.
    const result = await pool2.query(query, [passwordHash, cleanEmail]);

    return result.rowCount > 0;
  } catch (error) {
    console.error('[vendedorModel] Error en updatePassword:', error);
    return false;
  }
};

module.exports = {
  findVendedorByEmail,
  clearTempPasswordHash,
  updatePassword,
  findVendedorByCodigo,
};
