// Este archivo centraliza todas las llamadas a la API.
// Utiliza un interceptor para adjuntar el token JWT a las peticiones.

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Función genérica para manejar respuestas de la API.
 * @param {Response} response - La respuesta de fetch.
 * @returns {Promise<any>} - Los datos JSON de la respuesta.
 * @throws {Error} - Si la respuesta de la red no es 'ok'.
 */
const handleResponse = async (response) => {
  const data = await response.json().catch(() => {
    // Si el cuerpo no es JSON, devuelve un error genérico.
    return { message: response.statusText };
  });

  if (!response.ok) {
    throw new Error(data.message || 'Error en la solicitud a la red');
  }
  return data;
};

// --- Objeto apiService ---
// Encapsula la lógica de la API, incluyendo el manejo del token.

const apiService = {
  /**
   * @private
   * El token de autenticación JWT. Se gestiona con setAuthToken.
   */
  authToken: null,

  /**
   * Establece o limpia el token de autenticación.
   * @param {string | null} token - El token JWT o null para limpiarlo.
   */
  setAuthToken(token) {
    this.authToken = token;
  },

  /**
   * @private
   * Realiza una petición a la API, adjuntando el token si está disponible.
   * @param {string} endpoint - El endpoint de la API (ej. '/products').
   * @param {object} options - Opciones de configuración para fetch.
   * @returns {Promise<any>} - La respuesta de la API.
   */
  async request(endpoint, options = {}) {
    const { method = 'GET', body = null, params = null, ...customConfig } = options;

    const headers = {
      'Content-Type': 'application/json',
    };

    // Adjuntar el token de autenticación si existe.
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config = {
      method,
      headers,
      ...customConfig,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      url += `?${new URLSearchParams(params)}`;
    }

    const response = await fetch(url, config);
    return handleResponse(response);
  },

  // --- Métodos de la API ---

  /**
   * Autentica a un usuario.
   * @param {{email, password}} credentials - Credenciales del usuario.
   * @returns {Promise<object>} - { success, user, token }
   */
  login(credentials) {
    // Esta es una petición especial que no usa el `request` genérico
    // porque es la que obtiene el token en primer lugar.
    return fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then(handleResponse);
  },

  /**
   * Obtiene productos con paginación y filtros.
   */
  fetchProducts(page, searchTerm, brands) {
    const params = {
      page,
      limit: 20,
      search: searchTerm,
    };
    if (brands && brands.length > 0) {
      params.brand = brands.join(',');
    }
    return this.request('/products', { params });
  },

  /**
   * Obtiene TODOS los productos para la generación de PDF.
   */
  fetchAllProductsForPDF(searchTerm, brands) {
    const params = {
      page: 1,
      limit: 9999,
      search: searchTerm,
    };
    if (brands && brands.length > 0) {
      params.brand = brands.join(',');
    }
    // Devuelve solo el array de productos
    return this.request('/products', { params }).then(data => data.products);
  },

  /**
   * Obtiene un producto por su ID.
   */
  fetchProductById(productId) {
    if (!productId) throw new Error("El ID de producto es requerido");
    return this.request(`/products/${productId}`);
  },

  /**
   * Obtiene la lista de marcas.
   */
  fetchProtheusBrands() {
    return this.request('/brands');
  },

  /**
   * Obtiene la lista de accesorios.
   */
  getAccessories() {
    return this.request('/accessories');
  },

  /**
   * Obtiene detalles de los grupos de productos.
   */
  getProductGroupsDetails() {
    return this.request('/product-groups-details');
  },

  /**
   * Obtiene productos por grupo.
   */
  fetchProductsByGroup(groupCode, page) {
    const params = { page, limit: 20 };
    return this.request(`/products/group/${groupCode}`, { params });
  },

  /**
   * Obtiene el balance de la cuenta del usuario logueado.
   */
  fetchAccountBalance() {
    return this.request('/balance');
  },

  /**
   * Obtiene los movimientos de la cuenta del usuario logueado.
   */
  fetchAccountMovements() {
    return this.request('/movements');
  },

  /**
   * Obtiene el historial de pedidos del usuario logueado.
   */
  fetchOrderHistory() {
    return this.request('/orders');
  },

  /**
   * Obtiene el detalle de un pedido específico del usuario logueado.
   */
  fetchOrderDetail(orderId) {
    if (!orderId) throw new Error("ID de pedido requerido");
    return this.request(`/orders/${orderId}`);
  },

  /**
   * Descarga el PDF de un pedido.
   */
  async downloadOrderPDF(orderId) {
    if (!orderId) throw new Error("ID de pedido requerido");

    const headers = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/pdf`, { headers });

    if (!response.ok) {
      // Intenta leer el error como JSON
      const errorData = await response.json().catch(() => ({ message: 'Error al descargar el PDF.' }));
      throw new Error(errorData.message || 'Error en la solicitud de descarga.');
    }

    return response.blob();
  },

  /**
   * Obtiene las ofertas activas.
   */
  fetchOffers() {
    return this.request('/offers');
  },

  /**
   * Obtiene el perfil del usuario logueado.
   */
  fetchUserProfile() {
    return this.request('/profile');
  },

  /**
   * Actualiza el perfil del usuario logueado.
   */
  updateUserProfile(profileData) {
    return this.request('/profile', { method: 'PUT', body: profileData });
  },

  /**
   * Crea un nuevo pedido o presupuesto.
   */
  createOrder(orderData) {
    return this.request('/orders', { method: 'POST', body: orderData });
  },

  // --- Métodos de Administrador ---

  createCreditNoteApi({ targetUserCod, reason, items, invoiceRefId }) {
    const body = { targetUserCod, reason, items, invoiceRefId };
    return this.request('/credit-note', { method: 'POST', body });
  },

  fetchCustomerInvoicesApi({ customerCod }) {
    if (!customerCod) throw new Error("Cód. de Cliente es requerido.");
    return this.request(`/customer-invoices/${customerCod}`);
  },

  fetchAdminOrderDetailApi({ orderId }) {
    if (!orderId) throw new Error("ID de pedido requerido");
    return this.request(`/admin/order-details/${orderId}`);
  },

  getAdminDashboardPanels() {
    return this.request('/admin/dashboard-panels');
  },

  updateDashboardPanel(panelId, is_visible) {
    if (!panelId) throw new Error("ID de panel requerido");
    return this.request(`/admin/dashboard-panels/${panelId}`, {
      method: 'PUT',
      body: { is_visible },
    });
  },
  
  getDashboardPanels() {
    return this.request('/dashboard-panels');
  },

  toggleProductOffer(productId) {
    if (!productId) throw new Error("ID de producto requerido");
    return this.request(`/products/${productId}/toggle-offer`, { method: 'PUT' });
  },

  getAdminUsers() {
    return this.request('/admin/users');
  },

  getAdminProductGroups() {
    return this.request('/admin/product-groups');
  },

  getDeniedProductGroups(targetUserId) {
    if (!targetUserId) throw new Error("ID de usuario objetivo requerido");
    return this.request(`/admin/users/${targetUserId}/product-groups`);
  },

  updateUserGroupPermissions(targetUserId, groups) {
    if (!targetUserId) throw new Error("ID de usuario objetivo requerido");
    return this.request(`/admin/users/${targetUserId}/product-groups`, {
      method: 'PUT',
      body: { groups },
    });
  },

  // (NUEVO) Obtiene la lista de administradores
  getAdmins() {
    return this.request('/admin/management/admins');
  },

  // (NUEVO) Añade un nuevo administrador
  addAdmin(userId) {
    if (!userId) throw new Error("ID de usuario requerido");
    return this.request('/admin/management/admins', {
      method: 'POST',
      body: { userId },
    });
  },

  // (NUEVO) Elimina a un administrador
  removeAdmin(userId) {
    if (!userId) throw new Error("ID de usuario requerido");
    return this.request(`/admin/management/admins/${userId}`, {
      method: 'DELETE',
    });
  },
};

export default apiService;
