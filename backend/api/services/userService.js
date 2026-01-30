// backend/api/services/userService.js

const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const vendedorModel = require('../models/vendedorModel'); // Importar el modelo de vendedor
const testUserModel = require('../models/testUserModel');
const cartModel = require('../models/cartModel');
const analyticsModel = require('../models/analyticsModel');

/**
 * Autentica a un usuario, sea cliente o vendedor, usando contraseña temporal o principal.
 * @param {string} email - El email del usuario.
 * @param {string} password - La contraseña del usuario.
 * @returns {Promise<object>}
 */
const authenticateUser = async (email, password) => {
  // 'email' parameter acts as a generic identifier (email, client code, or username)
  const identifier = email;

  try {
    console.log(`[AUTH] Iniciando autenticación. Identificador: ${identifier}`);
    let userType = 'cliente';
    let user = null;

    // 1. Intentar buscar como Cliente Normal usando Número de Cliente (A1_COD)
    // Se asume que el identificador es el código de cliente.
    console.log(`[AUTH] Buscando usuario por Código de Cliente: ${identifier}`);
    let userRecord = await userModel.findUserByCode(identifier);

    if (userRecord) {
      console.log('[AUTH] Usuario encontrado por Código de Cliente.');
      // Fetch role from DB2
      const roleData = await userModel.getUserRoleFromDB2(userRecord.id);
      user = {
        ...userRecord,
        role: roleData ? roleData.role : 'cliente',
        permissions: roleData ? roleData.permissions : [],
        is_admin: roleData ? roleData.role === 'admin' : false
      };
    } else {
      // 2. Si no es cliente, buscar como Usuario de Prueba (Test User) por Nombre
      console.log('[AUTH] No es cliente. Buscando como Test User por Nombre...');
      const testUserRecord = await testUserModel.getTestUserByName(identifier);

      if (testUserRecord) {
        // [NUEVO] Verificación de usuario eliminado (soft-delete)
        if (testUserRecord.deleted_at) {
          if (testUserRecord.deletion_reason === 'EXPIRED') {
            console.log('[AUTH] Test User encontrado pero marcado como EXPIRADO (Soft Delete).');
            let vendorInfo = null;
            if (testUserRecord.vendedor_code) {
              const vendor = await vendedorModel.findVendedorByCodigo(testUserRecord.vendedor_code);
              if (vendor) {
                vendorInfo = {
                  name: vendor.nombre,
                  email: vendor.email,
                  phone: vendor.telefono
                };
              }
            }
            return {
              success: false,
              isExpired: true,
              message: 'El acceso ha expirado. Su cuenta de prueba ha caducado.',
              vendor: vendorInfo
            };
          } else {
            // Eliminado manualmente ("Baja por Vendedor")
            console.log('[AUTH] Test User eliminado manualmente. Devolviendo error específico.');
            let vendorInfo = null;
            if (testUserRecord.vendedor_code) {
              const vendor = await vendedorModel.findVendedorByCodigo(testUserRecord.vendedor_code);
              if (vendor) {
                vendorInfo = {
                  name: vendor.nombre,
                  email: vendor.email,
                  phone: vendor.telefono
                };
              }
            }
            return {
              success: false,
              isExpired: true, // Reutilizamos isExpired para redirigir a la pantalla de bloqueo
              message: 'Su acceso ha sido revocado por el vendedor.',
              vendor: vendorInfo
            };
          }
        }

        // Calcular si el usuario ha  expirado (1 semana = 7 días) - Lógica de respaldo si no se corrió el cron
        const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
        const createdAt = new Date(testUserRecord.created_at).getTime();
        const now = new Date().getTime();

        if (now - createdAt > ONE_WEEK_IN_MS) {
          console.log('[AUTH] Test User expirado due to > 1 week (Check dinámico).');

          let vendorInfo = null;
          if (testUserRecord.vendedor_code) {
            const vendor = await vendedorModel.findVendedorByCodigo(testUserRecord.vendedor_code);
            if (vendor) {
              vendorInfo = {
                name: vendor.nombre,
                email: vendor.email,
                phone: vendor.telefono
              };
            }
          }

          return {
            success: false,
            isExpired: true,
            message: 'El acceso ha expirado. Su cuenta de prueba solo era válida por 1 semana.',
            vendor: vendorInfo
          };
        }

        // Chequeo directo de contraseña para test users
        if (testUserRecord.password === password) {
          console.log('[DEBUG AUTH] Autenticado EXITOSAMENTE como TEST USER:', testUserRecord.name);
          return {
            success: true,
            user: {
              id: testUserRecord.id,
              full_name: testUserRecord.name,
              role: 'test_user',
              is_admin: false,
              vendedor_code: testUserRecord.vendedor_code
            },
            first_login: false
          };
        } else {
          console.log('Contraseña incorrecta para test user.');
          return { success: false, message: 'Usuario o contraseña incorrectos.' };
        }
      }

      // 3. (Fallback) Intentar buscar por Email (Vendedores o Clientes legacy)
      // Solo si el identificador parece un email
      if (identifier.includes('@')) {
        console.log('[AUTH] No es Test User. El identificador parece email, buscando legacy/vendedor...');

        // Primero buscar vendedor
        const vendedorRecord = await vendedorModel.findVendedorByEmail(identifier);

        if (vendedorRecord) {
          user = {
            id: vendedorRecord.user_id || vendedorRecord.codigo, // Prefer DB ID if available
            password_hash: vendedorRecord.password,
            temp_password_hash: vendedorRecord.temp_password_hash,
            full_name: vendedorRecord.nombre,
            email: vendedorRecord.email,
            a1_cod: vendedorRecord.codigo,
            is_admin: false,
            role: 'vendedor',
            codigo: vendedorRecord.codigo,
            must_change_password: vendedorRecord.must_change_password,
          };
          userType = 'vendedor';
          console.log('[DEBUG AUTH] Usuario identificado como VENDEDOR:', JSON.stringify(user, null, 2));
        } else {
          // Por último, intentar buscar cliente por email (legacy)
          userRecord = await userModel.findUserByEmail(identifier);
          if (userRecord) {
            const roleData = await userModel.getUserRoleFromDB2(userRecord.id);
            user = {
              ...userRecord,
              role: roleData ? roleData.role : 'cliente',
              permissions: roleData ? roleData.permissions : [],
              is_admin: roleData ? roleData.role === 'admin' : false
            };
            console.log('[AUTH] Cliente encontrado por Email (Legacy).');
          }
        }
      }
    }

    if (!user) {
      console.log('[AUTH] Usuario NO encontrado en ningún registro.');
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }

    console.log(
      '[DEBUG] Objeto de usuario/vendedor recuperado:',
      JSON.stringify(user, null, 2)
    );

    // [NUEVO] Verificar si el usuario está activo (solo para usuarios que tienen este flag, principalmente clientes)
    if (user.is_active === false) {
      console.log(`[AUTH] Usuario ${user.email || identifier} está desactivado por inactividad.`);
      return {
        success: false,
        message: 'Su cuenta ha sido desactivada por inactividad (más de un mes sin realizar pedidos). Contacte a soporte.'
      };
    }

    // Verificación de credenciales (Hash) para Clientes y Vendedores
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

    if (userType === 'vendedor') {
      userWithoutPassword.is_admin = false;
    }
    console.log('[DEBUG AUTH] Valor FINAL de userWithoutPassword.is_admin:', userWithoutPassword.is_admin, 'para userType:', userType);

    return { success: true, user: userWithoutPassword, first_login: !!user.must_change_password };
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

    // [NUEVO] Obtener contadores del carrito para estos clientes
    const clientIds = clients.map(c => c.id).filter(id => id); // Filtrar IDs nulos por seguridad
    const cartCounts = await cartModel.getCartItemCountsByUserIds(clientIds);

    // Fusionar datos
    const clientsWithActivity = clients.map(client => ({
      ...client,
      cart_item_count: cartCounts[client.id] || 0
    }));

    console.log(
      `[userService] getVendedorClients -> Encontrados ${clients.length} clientes para vendedorCodigo: ${vendedorCodigo}`
    );
    return clientsWithActivity;
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
const changePassword = async (userId, newPassword, userRole, mustChangePassword = false) => {
  try {
    // Validar la nueva contraseña (ej. longitud mínima)
    if (!newPassword || newPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    let success = false;
    if (userRole === 'vendedor') {
      // Intentar primero por ID (user_id en user_credentials)
      // Esto cubre el caso donde "userId" es el ID numérico real.
      try {
        success = await userModel.updatePassword(userId, passwordHash, mustChangePassword);
      } catch (e) {
        console.warn(`[userService] Falló updatePassword por ID para vendedor (posiblemente userId es un Código): ${e.message}`);
      }

      // Si no tuvo éxito (0 filas o error de tipo), intentar como Código de Vendedor
      if (!success) {
        console.log(`[userService] Intentando actualizar password de vendedor usando userId como Código: ${userId}`);
        success = await vendedorModel.updatePassword(userId, passwordHash, mustChangePassword);
      }
    } else {
      success = await userModel.updatePassword(userId, passwordHash, mustChangePassword);
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

/**
 * Obtiene las estadísticas de un cliente específico de un vendedor.
 * @param {string} vendedorCodigo - El código del vendedor.
 * @param {number} clientId - El ID del cliente.
 * @returns {Promise<object>}
 */
const getVendedorClientAnalytics = async (vendedorCodigo, clientId) => {
  try {
    // 1. Verify Client belongs to Seller
    const client = await userModel.findUserById(clientId);
    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    // Normalize codes for comparison
    const clientVendorCode = String(client.vendedor_codigo || '').trim();
    const sellerCode = String(vendedorCodigo || '').trim();

    if (clientVendorCode !== sellerCode) {
      throw new Error('Acceso denegado: El cliente no pertenece a este vendedor');
    }

    // 2. Fetch Analytics
    return await analyticsModel.getUserStats(clientId);
  } catch (error) {
    console.error('Error en getVendedorClientAnalytics (service):', error);
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
  getAllClients,
  getVendedorClientAnalytics,
};
