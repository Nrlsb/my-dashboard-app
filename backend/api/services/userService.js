// backend/api/services/userService.js

const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const vendedorModel = require('../models/vendedorModel'); // Importar el modelo de vendedor

/**
 * Autentica a un usuario, sea cliente o vendedor, usando contraseña temporal o principal.
 * @param {string} email - El email del usuario.
 * @param {string} password - La contraseña del usuario.
 * @returns {Promise<object>}
 */
const authenticateUser = async (email, password) => {
  try {
    console.log(`Buscando usuario con email: ${email}`);
    let userRecord = await userModel.findUserByEmail(email);
    console.log('[DEBUG AUTH] userRecord desde userModel.findUserByEmail:', userRecord);
    let userType = 'cliente';
    let user;

    if (userRecord) {
      // Fetch role from DB2
      const roleData = await userModel.getUserRoleFromDB2(userRecord.id);
      user = {
        ...userRecord,
        role: roleData ? roleData.role : 'cliente',
        permissions: roleData ? roleData.permissions : [],
        is_admin: roleData ? roleData.role === 'admin' : false
      };
      console.log('[DEBUG AUTH] Usuario identificado como CLIENTE/ADMIN/MARKETING:', JSON.stringify(user, null, 2));
    } else {
      console.log(
        'Usuario no encontrado en la tabla de clientes, buscando en vendedores...'
      );
      const vendedorRecord = await vendedorModel.findVendedorByEmail(email);
      if (!vendedorRecord) {
        console.log('Usuario no encontrado tampoco en vendedores.');
        return { success: false, message: 'Usuario o contraseña incorrectos.' };
      }

      user = {
        id: vendedorRecord.codigo,
        password_hash: vendedorRecord.password,
        temp_password_hash: vendedorRecord.temp_password_hash, // Incluir la nueva columna
        full_name: vendedorRecord.nombre,
        email: vendedorRecord.email,
        a1_cod: vendedorRecord.codigo,
        is_admin: false,
        role: 'vendedor',
        codigo: vendedorRecord.codigo,
      };
      userType = 'vendedor';
      console.log('[DEBUG AUTH] Usuario identificado como VENDEDOR:', JSON.stringify(user, null, 2));
    }

    console.log(
      '[DEBUG] Objeto de usuario/vendedor recuperado:',
      JSON.stringify(user, null, 2)
    );

    // 1. Intentar con la contraseña temporal
    if (user.temp_password_hash) {
      console.log('[DEBUG] Intentando con la contraseña temporal...');
      const isTempMatch = await bcrypt.compare(
        password,
        user.temp_password_hash
      );
      console.log('[DEBUG] ¿La contraseña temporal coincide?:', isTempMatch);
      if (isTempMatch) {
        console.log(
          `Usuario ${user.id} (${userType}) autenticado con contraseña temporal.`
        );

        // Limpiar la contraseña temporal
        if (userType === 'cliente') {
          await userModel.clearTempPasswordHash(user.id);
        } else {
          await vendedorModel.clearTempPasswordHash(user.codigo);
        }

        const { password_hash, temp_password_hash, ...userWithoutPassword } =
          user;
        return { success: true, user: userWithoutPassword, first_login: true };
      }
    }

    // 2. Si no hay contraseña temporal o no coincide, intentar con la principal
    console.log('[DEBUG] Intentando con la contraseña principal...');
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('[DEBUG] ¿La contraseña principal coincide?:', isMatch);
    if (!isMatch) {
      console.log('Contraseña incorrecta.');
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }

    console.log(
      `Usuario ${user.id} (${userType}) autenticado con contraseña principal.`
    );
    const { password_hash, temp_password_hash, ...userWithoutPassword } = user;

    // Asegurarse de que is_admin se establezca correctamente para todos los usuarios autenticados
    if (userType === 'vendedor') {
      userWithoutPassword.is_admin = false;
    } else {
      // Role and is_admin are already set above
      // userWithoutPassword.is_admin = await userModel.isUserAdmin(user.id);
    }
    console.log('[DEBUG AUTH] Valor FINAL de userWithoutPassword.is_admin:', userWithoutPassword.is_admin, 'para userType:', userType);
    console.log(
      `El usuario ${user.id} ${userWithoutPassword.is_admin ? 'ES' : 'NO ES'} administrador.`
    );

    return { success: true, user: userWithoutPassword, first_login: false };
  } catch (error) {
    console.error('Error en authenticateUser (service):', error);
    throw error;
  }
};

/**
 * Registra un nuevo usuario.
 * @param {object} userData - Los datos para el registro.
 * @returns {Promise<object>}
 */
const registerUser = async (userData) => {
  const { email, password } = userData;
  try {
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      throw new Error('El email ya está registrado.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await userModel.createUser(userData, passwordHash);

    const { password_hash, ...userToReturn } = newUser;
    console.log(`Nuevo usuario registrado: ${userToReturn.email}`);

    return userToReturn;
  } catch (error) {
    console.error('Error en registerUser (service):', error);
    throw error;
  }
};

/**
 * Obtiene el perfil de un usuario.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<object|null>}
 */
const getUserProfile = async (userId) => {
  try {
    const user = await userModel.findUserById(userId);
    if (!user) {
      return null;
    }

    // Mapear nombres de columnas a los esperados por el frontend si es necesario
    return {
      A1_NOME: user.full_name,
      A1_EMAIL: user.email,
      A1_COD: user.a1_cod,
      A1_LOJA: user.a1_loja,
      A1_CGC: user.a1_cgc,
      A1_NUMBER: user.a1_tel,
      A1_END: user.a1_endereco,
    };
  } catch (error) {
    console.error('Error en getUserProfile (service):', error);
    throw error;
  }
};

/**
 * Actualiza el perfil de un usuario.
 * @param {number} userId - El ID del usuario.
 * @param {object} profileData - Los datos del perfil a actualizar.
 * @returns {Promise<object>}
 */
const updateUserProfile = async (userId, profileData) => {
  try {
    const updatedUserWithHash = await userModel.updateUser(userId, profileData);

    if (!updatedUserWithHash) {
      throw new Error('Usuario no encontrado al actualizar.');
    }

    const { password_hash, ...updatedUser } = updatedUserWithHash;
    console.log(`Perfil actualizado para usuario: ${updatedUser.email}`);

    return { success: true, message: 'Perfil actualizado.', user: updatedUser };
  } catch (error) {
    console.error('Error en updateUserProfile (service):', error);
    throw error;
  }
};

/**
 * Obtiene los clientes asignados a un vendedor.
 * @param {string} vendedorCodigo - El código del vendedor.
 * @returns {Promise<Array<object>>}
 */
const getVendedorClients = async (vendedorCodigo) => {
  try {
    console.log(
      `[userService] getVendedorClients -> Buscando clientes para vendedorCodigo: ${vendedorCodigo}`
    );
    const clients = await userModel.findUsersByVendedorCodigo(vendedorCodigo);
    console.log(
      `[userService] getVendedorClients -> Encontrados ${clients.length} clientes para vendedorCodigo: ${vendedorCodigo}`
    );
    return clients;
  } catch (error) {
    console.error('Error en getVendedorClients (service):', error);
    throw error;
  }
};

/**
 * Cambia la contraseña de un usuario.
 * @param {number} userId - El ID del usuario.
 * @param {string} newPassword - La nueva contraseña.
 * @returns {Promise<object>}
 */
const changePassword = async (userId, newPassword, userRole) => {
  try {
    // Validar la nueva contraseña (ej. longitud mínima)
    if (!newPassword || newPassword.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    let success = false;
    if (userRole === 'vendedor') {
      success = await vendedorModel.updatePassword(userId, passwordHash);
    } else {
      success = await userModel.updatePassword(userId, passwordHash);
    }

    if (!success) {
      throw new Error('No se pudo actualizar la contraseña.');
    }

    console.log(`Contraseña actualizada para el usuario: ${userId}`);
    return { success: true, message: 'Contraseña actualizada correctamente.' };
  } catch (error) {
    console.error('Error en changePassword (service):', error);
    throw error;
  }
};


/**
 * Obtiene todos los clientes registrados en el sistema.
 * @returns {Promise<Array<object>>} Una lista de todos los usuarios con rol de cliente.
 */
const getAllClients = async () => {
  try {
    console.log('[userService] getAllClients -> Buscando todos los clientes...');
    const clients = await userModel.findAllClients(); // Asume que esta función existe en userModel
    console.log(
      `[userService] getAllClients -> Encontrados ${clients.length} clientes.`
    );
    return clients;
  } catch (error) {
    console.error('Error en getAllClients (service):', error);
    throw error;
  }
};

module.exports = {
  authenticateUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  getVendedorClients,
  changePassword,
  getAllClients, // Add the new function to the export
};
