// Este archivo centraliza todas las llamadas a la API.
// Utiliza un interceptor para adjuntar el token  JWT a las peticiones.

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({
    message: response.statusText,
  }));
  if (!response.ok) {
    throw new Error(data.message || 'Error en la solicitud a la red');
  }
  return data;
};

const apiService = {
  authToken: null,

  setAuthToken(token) {
    this.authToken = token;
  },

  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      params = null,
      isFormData = false,
      ...customConfig
    } = options;

    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config = {
      method,
      headers,
      ...customConfig,
    };

    if (body) {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      url += `?${new URLSearchParams(params)}`;
    }

    const response = await fetch(url, config);
    return handleResponse(response);
  },

  login(credentials) {
    return fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then(handleResponse);
  },

  register(userData) {
    return fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }).then(handleResponse);
  },

  sendQuery(queryData) {
    return this.request('/queries', { method: 'POST', body: queryData });
  },

  uploadVoucher(formData) {
    return this.request('/upload-voucher', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  fetchProducts(page, searchTerm, brands, bypassCache = false, limit = 20, hasImage = '') {
    const params = {
      page,
      limit,
      search: searchTerm,
      bypassCache: String(bypassCache),
    };

    if (hasImage !== '') {
      params.hasImage = hasImage;
    }

    if (brands && brands.length > 0) {
      params.brand = brands.join(',');
    }
    return this.request('/products', { params });
  },

  fetchAllProductsForPDF(searchTerm, brands) {
    const params = {
      page: 1,
      limit: 9999,
      search: searchTerm,
    };
    if (brands && brands.length > 0) {
      params.brand = brands.join(',');
    }
    return this.request('/products', { params }).then((data) => data.products);
  },

  fetchProductById(productId) {
    if (!productId) throw new Error('El ID de producto es requerido');
    return this.request(`/products/${productId}`);
  },

  fetchProductByCode(productCode) {
    if (!productCode) throw new Error('El código de producto es requerido');
    return this.request(`/products/code/${productCode}`);
  },

  fetchProtheusBrands() {
    return this.request('/products/brands');
  },

  getAccessories() {
    return this.request('/products/accessories');
  },

  getProductGroupsDetails() {
    return this.request('/products/product-groups-details');
  },

  fetchProductsByGroup(groupCode, page) {
    const params = { page, limit: 20 };
    return this.request(`/products/group/${groupCode}`, { params });
  },

  fetchAccountBalance() {
    return this.request('/balance');
  },

  fetchAccountMovements() {
    return this.request('/movements');
  },

  fetchOrderHistory() {
    return this.request('/orders');
  },

  fetchOrderDetail(orderId) {
    if (!orderId) throw new Error('ID de pedido requerido');
    return this.request(`/orders/${orderId}`);
  },

  async downloadOrderPDF(orderId) {
    if (!orderId) throw new Error('ID de pedido requerido');

    const headers = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/pdf`, {
      headers,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Error al descargar el PDF.' }));
      throw new Error(
        errorData.message || 'Error en la solicitud de descarga.'
      );
    }

    return response.blob();
  },

  async downloadOrderCSV(orderId) {
    if (!orderId) throw new Error('ID de pedido requerido');

    const headers = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/csv`, {
      headers,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Error al descargar el CSV.' }));
      throw new Error(
        errorData.message || 'Error en la solicitud de descarga.'
      );
    }

    return response.blob();
  },

  updateOrderDetails(updatedOrders) {
    return this.request('/orders/update-details', {
      method: 'PUT',
      body: { updatedOrders },
    });
  },

  fetchOffers() {
    return this.request('/products/offers');
  },

  fetchUserProfile() {
    return this.request('/profile');
  },

  updateUserProfile(profileData) {
    return this.request('/profile', { method: 'PUT', body: profileData });
  },

  changePassword(newPassword) {
    return this.request('/change-password', {
      method: 'PUT',
      body: { newPassword },
    });
  },

  createOrder(orderData) {
    return this.request('/orders', { method: 'POST', body: orderData });
  },

  getVendedorClients() {
    return this.request('/vendedor/clientes');
  },

  // (NUEVO) Método para obtener todos los clientes (para administradores)
  getAllClients() {
    return this.request('/admin/clients');
  },

  createCreditNoteApi({ targetUserCod, reason, items, invoiceRefId }) {
    const body = { targetUserCod, reason, items, invoiceRefId };
    return this.request('/credit-note', { method: 'POST', body });
  },

  fetchCustomerInvoicesApi({ customerCod }) {
    if (!customerCod) throw new Error('Cód. de Cliente es requerido.');
    return this.request(`/customer-invoices/${customerCod}`);
  },

  fetchAdminOrderDetailApi({ orderId }) {
    if (!orderId) throw new Error('ID de pedido requerido');
    return this.request(`/admin/order-details/${orderId}`);
  },

  getAdminDashboardPanels() {
    return this.request('/admin/dashboard-panels');
  },

  updateDashboardPanel(panelId, is_visible) {
    if (!panelId) throw new Error('ID de panel requerido');
    return this.request(`/admin/dashboard-panels/${panelId}`, {
      method: 'PUT',
      body: { is_visible },
    });
  },

  getDashboardPanels() {
    return this.request('/dashboard-panels');
  },

  toggleProductOffer(productId) {
    if (!productId) throw new Error('ID de producto requerido');
    return this.request(`/products/${productId}/toggle-offer`, {
      method: 'PUT',
    });
  },

  updateProductOfferDetails(productId, details) {
    if (!productId) throw new Error('ID de producto requerido');
    return this.request(`/products/${productId}/offer-details`, {
      method: 'PUT',
      body: details,
    });
  },

  getAdminUsers() {
    return this.request('/admin/users');
  },

  getAdminProductGroups() {
    return this.request('/admin/product-groups');
  },

  getDeniedProductGroups(targetUserId) {
    if (!targetUserId) throw new Error('ID de usuario objetivo requerido');
    return this.request(`/admin/users/${targetUserId}/product-groups`);
  },

  updateUserGroupPermissions(targetUserId, groups) {
    if (!targetUserId) throw new Error('ID de usuario objetivo requerido');
    return this.request(`/admin/users/${targetUserId}/product-groups`, {
      method: 'PUT',
      body: { groups },
    });
  },

  getDeniedProducts(targetUserId) {
    if (!targetUserId) throw new Error('ID de usuario objetivo requerido');
    return this.request(`/admin/users/${targetUserId}/denied-products`);
  },

  updateUserProductPermissions(targetUserId, productIds) {
    if (!targetUserId) throw new Error('ID de usuario objetivo requerido');
    return this.request(`/admin/users/${targetUserId}/denied-products`, {
      method: 'PUT',
      body: { productIds },
    });
  },

  getGlobalDeniedProducts() {
    return this.request('/admin/global-restrictions');
  },

  updateGlobalProductPermissions(productIds) {
    return this.request('/admin/global-restrictions', {
      method: 'PUT',
      body: { productIds },
    });
  },

  getAdmins() {
    return this.request('/admin/management/admins');
  },

  addAdmin(userId, role) {
    if (!userId) throw new Error('ID de usuario requerido');
    return this.request('/admin/management/admins', {
      method: 'POST',
      body: { userId, role },
    });
  },

  removeAdmin(userId) {
    if (!userId) throw new Error('ID de usuario requerido');
    return this.request(`/admin/management/admins/${userId}`, {
      method: 'DELETE',
    });
  },

  // Role Management
  getRoles() {
    return this.request('/admin/roles');
  },

  createRole(roleData) {
    return this.request('/admin/roles', {
      method: 'POST',
      body: roleData,
    });
  },

  updateRole(id, roleData) {
    return this.request(`/admin/roles/${id}`, {
      method: 'PUT',
      body: roleData,
    });
  },

  deleteRole(id) {
    return this.request(`/admin/roles/${id}`, {
      method: 'DELETE',
    });
  },

  // Admin Content Management
  getCarouselGroups() {
    return this.request('/admin/carousel-groups');
  },

  createCarouselGroup(data) {
    return this.request('/admin/carousel-groups', {
      method: 'POST',
      body: data,
    });
  },

  updateCarouselGroup(id, data) {
    return this.request(`/admin/carousel-groups/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  deleteCarouselGroup(id) {
    return this.request(`/admin/carousel-groups/${id}`, {
      method: 'DELETE',
    });
  },

  addAccessory(productId) {
    return this.request('/admin/accessories', {
      method: 'POST',
      body: { productId },
    });
  },

  removeAccessory(productId) {
    return this.request(`/admin/accessories/${productId}`, {
      method: 'DELETE',
    });
  },

  getCustomCollectionProducts(collectionId) {
    return this.request(`/products/collection/${collectionId}`);
  },

  addCustomGroupItem(groupId, productId) {
    return this.request(`/admin/custom-collection/${groupId}/items`, {
      method: 'POST',
      body: { productId },
    });
  },

  removeCustomGroupItem(groupId, productId) {
    return this.request(`/admin/custom-collection/${groupId}/items/${productId}`, {
      method: 'DELETE',
    });
  },

  uploadImages(formData) {
    return this.request('/images/upload', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  assignImageToProducts(imageUrl, products, replace = false) {
    return this.request('/images/assign', {
      method: 'POST',
      body: { imageUrl, products, replace },
    });
  },

  recordVisit(path) {
    return this.request('/analytics/visit', {
      method: 'POST',
      body: { path },
    });
  },

  getAnalytics(params) {
    return this.request('/analytics/stats', {
      params,
    });
  },

  async downloadMissingImagesReport() {
    const headers = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/reports/missing-images`, {
      headers,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Error al descargar el reporte.' }));
      throw new Error(
        errorData.message || 'Error en la solicitud de descarga.'
      );
    }

    return response.blob();
  },

  generateAiDescription(productId, productData) {
    if (!productId) throw new Error('ID de producto requerido');
    return this.request(`/products/${productId}/ai-description/generate`, {
      method: 'POST',
      body: productData,
    });
  },

  saveAiDescription(productId, description) {
    if (!productId) throw new Error('ID de producto requerido');
    return this.request(`/products/${productId}/ai-description`, {
      method: 'PUT',
      body: { description },
    });
  },

  batchGenerateAiDescriptions() {
    return this.request('/products/batch-generate-descriptions', {
      method: 'POST',
    });
  },

  getBatchGenerationProgress() {
    return this.request('/products/batch-generate-descriptions/progress');
  },
};

export default apiService;
