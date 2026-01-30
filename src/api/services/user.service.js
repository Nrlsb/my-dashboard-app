import apiClient from '../core/client';

export const userService = {
    getVendedorClients() {
        return apiClient.get('/vendedor/clientes');
    },

    // Test Users
    getTestUsers() {
        return apiClient.get('/test-users');
    },

    createTestUser(userData) {
        return apiClient.post('/test-users', userData);
    },

    deleteTestUser(userId) {
        return apiClient.delete(`/test-users/${userId}`);
    },

    getTestUserAnalytics(userId) {
        return apiClient.get(`/test-users/${userId}/analytics`);
    },

    getVendedorClientAnalytics(userId) {
        return apiClient.get(`/vendedor/clientes/${userId}/analytics`);
    },

    getUserAnalytics(userId) {
        return apiClient.get(`/admin/users/${userId}/analytics`);
    },

    getAllClients(search = '') {
        const params = search ? { search } : null;
        return apiClient.get('/admin/clients', { params });
    },

    getClientPermissions(userId) {
        return apiClient.get(`/vendedor/clientes/${userId}/permissions`);
    },

    updateClientPermissions(userId, groups) {
        return apiClient.put(`/vendedor/clientes/${userId}/permissions`, { groups });
    },

    getProductGroups() {
        return apiClient.get('/vendedor/product-groups');
    },
};
