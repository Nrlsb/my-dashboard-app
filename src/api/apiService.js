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
 * Obtiene el balance y movimientos de la cuenta de un usuario
 * @param {string} userId - El ID del usuario
 * @returns {Promise<object>} - Objeto con balance y movimientos
 * @throws {Error} - Si no se proporciona userId
 */
export const fetchAccountBalance = async (userId) => {
  if (!userId) {
    throw new Error("El ID de usuario es requerido para obtener el balance");
  }

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error("No autenticado");
  }

  // (CORREGIDO) La ruta es /balance?userId=...
  const response = await fetch(`${API_BASE_URL}/balance?userId=${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

// --- Agrega aquí otras funciones de API ---
// Por ejemplo:

/**
 * Obtiene el historial de pedidos de un usuario
 * @param {string} userId - El ID del usuario
 * @returns {Promise<Array<object>>} - Lista de pedidos
 */
export const fetchOrderHistory = async (userId) => {
  if (!userId) throw new Error("ID de usuario requerido");
  
  const token = localStorage.getItem('token');
  if (!token) throw new Error("No autenticado");

  // (CORREGIDO) La ruta es /orders?userId=...
  const response = await fetch(`${API_BASE_URL}/orders?userId=${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
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

    const token = localStorage.getItem('token');
    if (!token) throw new Error("No autenticado");

    // (CORREGIDO) La ruta es /profile?userId=...
    const response = await fetch(`${API_BASE_URL}/profile?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
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

  const token = localStorage.getItem('token');
  if (!token) throw new Error("No autenticado");

  // (CORREGIDO) La ruta es /profile?userId=...
  const response = await fetch(`${API_BASE_URL}/profile?userId=${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  return handleResponse(response);
};