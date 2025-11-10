// Este archivo centralizará todas las funciones de fetching
// para que sean fáciles de reutilizar con React Query.

const API_BASE_URL = 'http://localhost:3001/api';
const PRODUCTS_PER_PAGE = 20; // Asegurarse que coincida con el frontend

/**
 * Función genérica para manejar respuestas fetch
 * @param {Response} response - La respuesta de fetch
 * @returns {Promise<any>} - Los datos JSON
 * @throws {Error} - Si la respuesta no es ok
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || 'Error en la solicitud a la red');
  }
  return response.json();
};

/**
 * (ACTUALIZADO) Obtiene productos con paginación y filtros
 * @param {number} page - Número de página
 * @param {string} searchTerm - Término de búsqueda
 * @param {string} brand - Marca a filtrar
 * @returns {Promise<object>} - Objeto con { products: [], totalProducts: 0 }
 */
export const fetchProducts = async (page, searchTerm, brand) => {
  const params = new URLSearchParams({
    page: page,
    limit: PRODUCTS_PER_PAGE,
    search: searchTerm,
    brand: brand,
  });

  const response = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
  return handleResponse(response); // Devuelve el objeto { products, totalProducts }
};

/**
 * (NUEVA FUNCIÓN) Obtiene un solo producto por su ID
 * @param {string} productId - El ID del producto
 * @returns {Promise<object>} - El objeto del producto
 */
export const fetchProductById = async (productId) => {
  if (!productId) {
    throw new Error("El ID de producto es requerido");
  }
  const response = await fetch(`${API_BASE_URL}/products/${productId}`);
  return handleResponse(response);
};


/**
 * Obtiene el balance y movimientos de la cuenta de un usuario
 * @param {string} userId - El ID del usuario
 * @returns {Promise<object>} - Objeto con balance y movimientos
 * @throws {Error} - Si no se proporciona userId
 */
export const fetchAccountBalance = async (userId) => {
  if (!userId) {
    throw new Error("El ID de usuario es requerido para obtener el balance");
  }

  // (CORREGIDO) Se elimina la verificación de 'token' que no existe.
  // La autenticación se maneja enviando el 'userId' en la query.

  // (CORREGIDO) La ruta es /balance?userId=...
  const response = await fetch(`${API_BASE_URL}/balance?userId=${userId}`, {
    // (CORREGIDO) Se elimina el header de 'Authorization'
  });
  return handleResponse(response);
};

// --- (NUEVA FUNCIÓN) ---
/**
 * Crea una nota de crédito (solo para Admins)
 * @param {object} data - { targetUserCod, amount, reason, adminUserId }
 * @returns {Promise<object>} - Respuesta de éxito/error
 */
export const createCreditNoteApi = async ({ targetUserCod, amount, reason, adminUserId }) => {
  if (!adminUserId) {
    throw new Error("El ID del administrador es requerido para esta acción.");
  }
  
  // El adminUserId se envía como query param para los middlewares 'requireUserId' y 'requireAdmin'
  const response = await fetch(`${API_BASE_URL}/credit-note?userId=${adminUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // (MODIFICADO) El targetUserCod, amount y reason van en el body
    body: JSON.stringify({ targetUserCod, amount, reason }),
  });
  return handleResponse(response);
};
// --- (FIN NUEVA FUNCIÓN) ---

// --- (NUEVA FUNCIÓN) ---
/**
 * Busca las facturas (movimientos de débito) de un cliente por su A1_COD
 * @param {object} data - { customerCod, adminUserId }
 * @returns {Promise<Array<object>>} - Lista de facturas
 */
export const fetchCustomerInvoicesApi = async ({ customerCod, adminUserId }) => {
  if (!adminUserId || !customerCod) {
    throw new Error("El ID de admin y el Cód. de Cliente son requeridos.");
  }
  
  // El adminUserId va en la query para la autenticación
  // El customerCod va en la URL (parámetro de ruta)
  const response = await fetch(`${API_BASE_URL}/customer-invoices/${customerCod}?userId=${adminUserId}`);
  return handleResponse(response);
};
// --- (FIN NUEVA FUNCIÓN) ---


// --- Agrega aquí otras funciones de API ---
// Por ejemplo:

/**
 * Obtiene el historial de pedidos de un usuario
 * @param {string} userId - El ID del usuario
 * @returns {Promise<Array<object>>} - Lista de pedidos
 */
export const fetchOrderHistory = async (userId) => {
  if (!userId) throw new Error("ID de usuario requerido");
  
  // (CORREGIDO) Se elimina la verificación de 'token' que no existe.

  // (CORREGIDO) La ruta es /orders?userId=...
  const response = await fetch(`${API_BASE_URL}/orders?userId=${userId}`, {
    // (CORREGIDO) Se elimina el header de 'Authorization'
  });
  return handleResponse(response);
};

/**
 * (NUEVO) Obtiene el detalle de UN pedido específico
 * @param {string} orderId - El ID del pedido
 * @param {string} userId - El ID del usuario
 * @returns {Promise<object>} - Detalles del pedido
 */
export const fetchOrderDetail = async (orderId, userId) => {
  if (!orderId || !userId) throw new Error("ID de pedido y de usuario requeridos");
  
  // La ruta es /orders/:id?userId=...
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}?userId=${userId}`, {
    // No se necesita token, el middleware requireUserId usa el userId
  });
  return handleResponse(response);
};


/**
 * Obtiene las ofertas activas
 * @returns {Promise<Array<object>>} - Lista de ofertas
 */
export const fetchOffers = async () => {
  const response = await fetch(`${API_BASE_URL}/offers`);
  return handleResponse(response);
};

/**
 * Obtiene los datos del perfil de un usuario
 * @param {string} userId - El ID del usuario
 * @returns {Promise<object>} - Datos del perfil
 */
export const fetchUserProfile = async (userId) => {
    if (!userId) throw new Error("ID de usuario requerido");

    // (CORREGIDO) Se elimina la verificación de 'token' que no existe.

    // (CORREGIDO) La ruta es /profile?userId=...
    const response = await fetch(`${API_BASE_URL}/profile?userId=${userId}`, {
        // (CORREGIDO) Se elimina el header de 'Authorization'
    });
    return handleResponse(response);
};

/**
 * (NUEVO) Actualiza el perfil de un usuario
 * @param {object} data - Objeto con { userId, profileData }
 * @returns {Promise<object>} - Respuesta del servidor
 */
export const updateUserProfile = async ({ userId, profileData }) => {
  if (!userId) throw new Error("ID de usuario requerido para actualizar");

  // (CORREGIDO) Se elimina la verificación de 'token' que no existe.

  // (CORREGIDO) La ruta es /profile?userId=...
  const response = await fetch(`${API_BASE_URL}/profile?userId=${userId}`, {
    method: 'PUT',
    headers: {
      // (CORREGIDO) Se elimina el header de 'Authorization'
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  return handleResponse(response);
};