import apiClient from '../core/client';

export const adminService = {
    getAdminSellers() {
        return apiClient.get('/admin/sellers');
    },

    updateVendorGroupPermissions(vendedorCode, deniedGroups) {
        return apiClient.put(`/admin/sellers/${vendedorCode}/product-groups`, { groups: deniedGroups });
    },

    resetUserPassword(userId, password) {
        if (!userId) throw new Error('ID de usuario requerido');
        if (!password) throw new Error('Contraseña requerida');
        return apiClient.put(`/admin/users/${userId}/password`, { password });
    },

    assignClientPassword({ a1_cod, password, email }) {
        return apiClient.post('/admin/users/assign-password', { a1_cod, password, email });
    },

    fetchAdminOrderDetailApi({ orderId }) {
        if (!orderId) throw new Error('ID de pedido requerido');
        return apiClient.get(`/admin/order-details/${orderId}`);
    },

    getAdminDashboardPanels() {
        return apiClient.get('/admin/dashboard-panels');
    },

    updateDashboardPanel(panelId, is_visible) {
        if (!panelId) throw new Error('ID de panel requerido');
        return apiClient.put(`/admin/dashboard-panels/${panelId}`, { is_visible });
    },

    getAdminUsers() {
        return apiClient.get('/admin/users');
    },

    getAdminProductGroups() {
        return apiClient.get('/admin/product-groups');
    },

    getDeniedProductGroups(targetUserId) {
        if (!targetUserId) throw new Error('ID de usuario objetivo requerido');
        return apiClient.get(`/admin/users/${targetUserId}/product-groups`);
    },

    updateUserGroupPermissions(targetUserId, groups) {
        if (!targetUserId) throw new Error('ID de usuario objetivo requerido');
        return apiClient.put(`/admin/users/${targetUserId}/product-groups`, { groups });
    },

    getDeniedProducts(targetUserId) {
        if (!targetUserId) throw new Error('ID de usuario objetivo requerido');
        return apiClient.get(`/admin/users/${targetUserId}/denied-products`);
    },

    updateUserProductPermissions(targetUserId, productIds) {
        if (!targetUserId) throw new Error('ID de usuario objetivo requerido');
        return apiClient.put(`/admin/users/${targetUserId}/denied-products`, { productIds });
    },

    getGlobalDeniedProducts() {
        return apiClient.get('/admin/global-restrictions');
    },

    updateGlobalProductPermissions(productIds) {
        return apiClient.put('/admin/global-restrictions', { productIds });
    },

    getAdmins() {
        return apiClient.get('/admin/management/admins');
    },

    addAdmin(userId, role) {
        if (!userId) throw new Error('ID de usuario requerido');
        return apiClient.post('/admin/management/admins', { userId, role });
    },

    removeAdmin(userId) {
        if (!userId) throw new Error('ID de usuario requerido');
        return apiClient.delete(`/admin/management/admins/${userId}`);
    },

    // Role Management
    getRoles() {
        return apiClient.get('/admin/roles');
    },

    createRole(roleData) {
        return apiClient.post('/admin/roles', roleData);
    },

    updateRole(id, roleData) {
        return apiClient.put(`/admin/roles/${id}`, roleData);
    },

    deleteRole(id) {
        return apiClient.delete(`/admin/roles/${id}`);
    },

    // Admin Content Management
    getCarouselGroups() {
        return apiClient.get('/admin/carousel-groups');
    },

    createCarouselGroup(data) {
        return apiClient.post('/admin/carousel-groups', data);
    },

    updateCarouselGroup(id, data) {
        return apiClient.put(`/admin/carousel-groups/${id}`, data);
    },

    deleteCarouselGroup(id) {
        return apiClient.delete(`/admin/carousel-groups/${id}`);
    },

    addAccessory(productId) {
        return apiClient.post('/admin/accessories', { productId });
    },

    removeAccessory(productId) {
        return apiClient.delete(`/admin/accessories/${productId}`);
    },

    addCustomGroupItem(groupId, productId) {
        return apiClient.post(`/admin/custom-collection/${groupId}/items`, { productId });
    },

    removeCustomGroupItem(groupId, productId) {
        return apiClient.delete(`/admin/custom-collection/${groupId}/items/${productId}`);
    },

    triggerManualSync() {
        return apiClient.post('/admin/sync-products');
    },
};
