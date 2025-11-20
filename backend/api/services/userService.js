// backend/api/services/userService.js

const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

/**
 * Autentica a un usuario.
 * @param {string} email - El email del usuario.
 * @param {string} password - La contraseña del usuario.
 * @returns {Promise<object>}
 */
const authenticateUser = async (email, password) => {
  try {
    console.log(`Buscando usuario con email: ${email}`);
    const user = await userModel.findUserByEmail(email);

    if (!user) {
      console.log('Usuario no encontrado.');
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      console.log('Contraseña incorrecta.');
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }

    console.log(`Usuario ${user.id} autenticado. Verificando permisos de admin...`);
    const { password_hash, ...userWithoutPassword } = user;

    userWithoutPassword.is_admin = await userModel.isUserAdmin(user.id);
    console.log(`El usuario ${user.id} ${userWithoutPassword.is_admin ? 'ES' : 'NO ES'} administrador.`);

    return { success: true, user: userWithoutPassword };

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
      "A1_NOME": user.full_name,
      "A1_EMAIL": user.email,
      "A1_COD": user.a1_cod,
      "A1_LOJA": user.a1_loja,
      "A1_CGC": user.a1_cgc,
      "A1_NUMBER": user.a1_tel,
      "A1_END": user.a1_endereco
    };

  } catch (error) {
    console.error('Error en getUserProfile (service):', error);
    throw error;
  }
};

module.exports = {
  authenticateUser,
  registerUser,
  getUserProfile,
};
