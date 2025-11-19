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
export const fetchProducts = async (page, searchTerm, brands, userId) => {
  const params = new URLSearchParams({
    page: page,
    limit: PRODUCTS_PER_PAGE,
    search: searchTerm,
  });
  if (brands && brands.length > 0) {
    params.append('brand', brands.join(','));
  }
  if (userId) {
    params.append('userId', userId);
  }

  const response = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
  return handleResponse(response); // Devuelve el objeto { products, totalProducts }
};

/**
 * (NUEVA FUNCIÓN) Obtiene TODOS los productos que coinciden con el filtro para el PDF
 * @param {string} searchTerm - Término de búsqueda
 * @param {string} brand - Marca a filtrar
 * @returns {Promise<Array<object>>} - Array de productos
 */
export const fetchAllProductsForPDF = async (searchTerm, brands, userId) => {
  const params = new URLSearchParams({
    page: 1,
    limit: 9999, // Un límite muy alto para traer todos los productos
    search: searchTerm,
  });
  if (brands && brands.length > 0) {
    params.append('brand', brands.join(','));
  }
  if (userId) {
    params.append('userId', userId);
  }

  const response = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
  const data = await handleResponse(response);
  return data.products; // Solo devolvemos el array de productos
};


/**
 * (NUEVA FUNCIÓN) Obtiene un solo producto por su ID
 * @param {string} productId - El ID del producto
 * @returns {Promise<object>} - El objeto del producto
 */
export const fetchProductById = async (productId, userId) => {
  if (!productId) {
    throw new Error("El ID de producto es requerido");
  }
  const params = new URLSearchParams();
  if (userId) {
    params.append('userId', userId);
  }
  const response = await fetch(`${API_BASE_URL}/products/${productId}?${params.toString()}`);
  return handleResponse(response);
};

// --- (NUEVA FUNCIÓN AÑADIDA) ---
/**
 * Obtiene la lista de todas las marcas de productos
 * @returns {Promise<Array<string>>} - Un array de strings de marcas
 */
export const fetchProtheusBrands = async (userId) => {
  const params = new URLSearchParams();
  if (userId) {
    params.append('userId', userId);
  }
  const response = await fetch(`${API_BASE_URL}/brands?${params.toString()}`);
  return handleResponse(response);
};
// --- (FIN NUEVA FUNCIÓN AÑADIDA) ---


/**
 * (NUEVO) Obtiene la lista de productos accesorios
 * @returns {Promise<Array<object>>} - Lista de accesorios
 */
export const getAccessories = async () => {
  const response = await fetch(`${API_BASE_URL}/accessories`);
  return handleResponse(response);
};

/**
 * (NUEVO) Obtiene detalles de los grupos de productos.
 * @returns {Promise<Array<object>>} - Lista de detalles de grupos.
 */
export const getProductGroupsDetails = async () => {
  const response = await fetch(`${API_BASE_URL}/product-groups-details`);
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

// --- (FUNCIÓN MODIFICADA) ---
/**
 * Crea una nota de crédito (solo para Admins)
 * @param {object} data - { targetUserCod, reason, items, invoiceRefId, adminUserId }
 * @returns {Promise<object>} - Respuesta de éxito/error
 */
export const createCreditNoteApi = async ({ targetUserCod, reason, items, invoiceRefId, adminUserId }) => {
  if (!adminUserId) {
    throw new Error("El ID del administrador es requerido para esta acción.");
  }
  
  // El adminUserId se envía como query param para los middlewares 'requireUserId' y 'requireAdmin'
  const response = await fetch(`${API_BASE_URL}/credit-note?userId=${adminUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // (MODIFICADO) El body ahora envía los items en lugar de un 'amount' total
    body: JSON.stringify({ targetUserCod, reason, items, invoiceRefId }),
  });
  return handleResponse(response);
};
// --- (FIN MODIFICACIÓN) ---

// --- (FUNCIÓN MODIFICADA) ---
/**
 * Busca las facturas (movimientos de débito) de un cliente por su A1_COD
 * @param {object} data - { customerCod, adminUserId }
 * @returns {Promise<Array<object>>} - Lista de facturas (ahora con order_ref)
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
// --- (FIN MODIFICACIÓN) ---

// --- (NUEVA FUNCIÓN) ---
/**
 * (Admin) Obtiene el detalle de UN pedido específico (incluyendo items)
 * @param {string} orderId - El ID del pedido (de orders.id)
 * @param {string} adminUserId - El ID del admin que solicita
 * @returns {Promise<object>} - Detalles del pedido con su lista de items
 */
export const fetchAdminOrderDetailApi = async ({ orderId, adminUserId }) => {
  if (!orderId || !adminUserId) throw new Error("ID de pedido y de admin requeridos");
  
  // Llama a la nueva ruta de admin
  const response = await fetch(`${API_BASE_URL}/admin/order-details/${orderId}?userId=${adminUserId}`);
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
export const fetchOffers = async (userId) => {
  const params = new URLSearchParams();
  if (userId) {
    params.append('userId', userId);
  }
  const response = await fetch(`${API_BASE_URL}/offers?${params.toString()}`);
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
 * Actualiza el perfil de un usuario
 * @param {object} data - Un objeto que contiene userId y profileData
 * @param {string} data.userId - El ID del usuario a actualizar
 * @param {object} data.profileData - Los nuevos datos del perfil
 * @returns {Promise<object>} - Los datos del perfil actualizados
 */
export const updateUserProfile = async ({ userId, profileData }) => {
  if (!userId) {
    throw new Error("El ID de usuario es requerido para actualizar el perfil.");
  }

  const response = await fetch(`${API_BASE_URL}/profile?userId=${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  return handleResponse(response);
};

/**
 * (NUEVO) Obtiene productos por grupo (paginado)
 * @param {string} groupCode - El código del grupo de productos
 * @param {number} page - Número de página
 * @param {string} userId - (Opcional) El ID del usuario para verificar permisos
 * @returns {Promise<object>} - Objeto con { products: [], totalProducts: 0, groupName: '' }
 */
export const fetchProductsByGroup = async (groupCode, page, userId) => {
  const params = new URLSearchParams({
    page: page,
    limit: PRODUCTS_PER_PAGE,
  });
  if (userId) {
    params.append('userId', userId);
  }

  const response = await fetch(`${API_BASE_URL}/products/group/${groupCode}?${params.toString()}`);
  return handleResponse(response);
};

export const apiService = {
  fetchProducts,
  fetchAllProductsForPDF,
  fetchProductById,
  fetchProtheusBrands,
  getAccessories,
  getProductGroupsDetails,
  fetchProductsByGroup,
  fetchAccountBalance,
  createCreditNoteApi,
  fetchCustomerInvoicesApi,
  fetchAdminOrderDetailApi,
  fetchOrderHistory,
  fetchOrderDetail,
  fetchOffers,
  fetchUserProfile,

  /**
   * (Admin) Obtiene todos los paneles del dashboard para configuración
   * @param {string} adminUserId - El ID del admin que solicita
   * @returns {Promise<Array<object>>} - Lista de todos los paneles
   */
  getAdminDashboardPanels: async (adminUserId) => {
    if (!adminUserId) throw new Error("ID de admin requerido");
    const response = await fetch(`${API_BASE_URL}/admin/dashboard-panels?userId=${adminUserId}`);
    return handleResponse(response);
  },

  /**
   * (Admin) Actualiza la visibilidad de un panel
   * @param {string} adminUserId - El ID del admin que solicita
   * @param {number} panelId - El ID del panel a actualizar
   * @param {boolean} is_visible - El nuevo estado de visibilidad
   * @returns {Promise<object>} - El panel actualizado
   */
  updateDashboardPanel: async (adminUserId, panelId, is_visible) => {
    if (!adminUserId || !panelId) throw new Error("ID de admin y de panel requeridos");
    const response = await fetch(`${API_BASE_URL}/admin/dashboard-panels/${panelId}?userId=${adminUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_visible }),
    });
    return handleResponse(response);
  },

  /**
   * (Público) Obtiene los paneles del dashboard visibles
   * @returns {Promise<Array<object>>} - Lista de paneles visibles
   */
  getDashboardPanels: async (userId) => {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    const response = await fetch(`${API_BASE_URL}/dashboard-panels?${params.toString()}`);
    return handleResponse(response);
  },

  /**
   * (Admin) Cambia el estado de oferta de un producto
   * @param {string} productId - El ID del producto
   * @param {string} adminUserId - El ID del admin que solicita
   * @returns {Promise<object>} - El producto actualizado
   */
  toggleProductOffer: async (productId, adminUserId) => {
    if (!productId || !adminUserId) throw new Error("ID de producto y de admin requeridos");
    const response = await fetch(`${API_BASE_URL}/products/${productId}/toggle-offer?userId=${adminUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },

  /**
   * (Admin) Obtiene la lista de clientes (no-admins)
   * @param {string} adminUserId - El ID del admin que solicita
   * @returns {Promise<Array<object>>} - Lista de usuarios
   */
  getAdminUsers: async (adminUserId) => {
    if (!adminUserId) throw new Error("ID de admin requerido");
    const response = await fetch(`${API_BASE_URL}/admin/users?userId=${adminUserId}`);
    return handleResponse(response);
  },

  /**
   * (Admin) Obtiene la lista de grupos de productos
   * @param {string} adminUserId - El ID del admin que solicita
   * @returns {Promise<Array<string>>} - Lista de grupos
   */
  getAdminProductGroups: async (adminUserId) => {
    if (!adminUserId) throw new Error("ID de admin requerido");
    const response = await fetch(`${API_BASE_URL}/admin/product-groups?userId=${adminUserId}`);
    return handleResponse(response);
  },

  /**
   * (Admin) Obtiene los grupos de productos denegados para un usuario
   * @param {string} targetUserId - El ID del usuario a consultar
   * @param {string} adminUserId - El ID del admin que solicita
   * @returns {Promise<Array<string>>} - Lista de grupos denegados
   */
  getDeniedProductGroups: async (targetUserId, adminUserId) => {
    if (!targetUserId || !adminUserId) throw new Error("ID de admin y de usuario objetivo requeridos");
    const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}/product-groups?userId=${adminUserId}`);
    return handleResponse(response);
  },

  /**
   * (Admin) Actualiza los permisos de grupo de un usuario
   * @param {string} targetUserId - El ID del usuario a actualizar
   * @param {Array<string>} groups - El array de grupos permitidos
   * @param {string} adminUserId - El ID del admin que solicita
   * @returns {Promise<object>} - Respuesta de éxito
   */
  updateUserGroupPermissions: async (targetUserId, groups, adminUserId) => {
    if (!targetUserId || !adminUserId) throw new Error("ID de admin y de usuario objetivo requeridos");
    const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}/product-groups?userId=${adminUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groups }),
    });
    return handleResponse(response);
  },
};