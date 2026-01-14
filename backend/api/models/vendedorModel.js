// backend/api/models/vendedorModel.js

const { pool2 } = require('../db');
const protheusService = require('../services/protheusService');

/**
 * Busca un vendedor por su email.
 * Ahora consulta la API de Protheus para los datos del perfil y 
 * la tabla user_credentials en DB2 para la contraseña.
 * @param {string} email - El email del vendedor.
 * @returns {Promise<object|null>}
 */
const findVendedorByEmail = async (email) => {
  try {
    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Obtener la lista de vendedores de la API
    const sellers = await protheusService.getSellers();

    // 2. Buscar el vendedor correspondiente en la lista
    // La API devuelve: a3_cod, a3_nome, a3_email, a3_cel
    const seller = sellers.find(s =>
      s && s.a3_email && s.a3_email.trim().toLowerCase() === cleanEmail
    );

    if (!seller) {
      return null;
    }

    // 3. Buscar credenciales en DB2 (user_credentials) usando el email
    const credsResult = await pool2.query(
      'SELECT password_hash, temp_password_hash FROM user_credentials WHERE email = $1',
      [cleanEmail]
    );

    const credentials = credsResult.rows[0] || {};

    // 4. Construir y retornar el objeto combinado
    return {
      codigo: seller.a3_cod.trim(),
      nombre: seller.a3_nome.trim(),
      email: seller.a3_email.trim(),
      telefono: seller.a3_cel ? seller.a3_cel.trim() : null,
      password_hash: credentials.password_hash || null,
      temp_password_hash: credentials.temp_password_hash || null,
      // Mapear password_hash a password para compatibilidad si userService lo usa así
      password: credentials.password_hash || null,
      // Internal fields for auth logic
      a1_cod: seller.a3_cod.trim(),
      role: 'vendedor'
    };

  } catch (error) {
    console.error('[vendedorModel] Error en findVendedorByEmail:', error);
    return null;
  }
};

/**
 * Busca un vendedor por su código.
 * @param {string} codigo - El código del vendedor.
 * @returns {Promise<object|null>}
 */
const findVendedorByCodigo = async (codigo) => {
  try {
    const cleanCode = String(codigo).trim();

    // 1. Obtener la lista de vendedores de la API
    const sellers = await protheusService.getSellers();

    // 2. Buscar por código
    const seller = sellers.find(s =>
      s && s.a3_cod && s.a3_cod.trim() === cleanCode
    );

    if (!seller) {
      return null;
    }

    return {
      codigo: seller.a3_cod.trim(),
      nombre: seller.a3_nome.trim(),
      email: seller.a3_email.trim(),
      telefono: seller.a3_cel ? seller.a3_cel.trim() : null
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
