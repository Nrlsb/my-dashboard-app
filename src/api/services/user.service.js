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

    getTestUserAnalytics(userId, brands = []) {
        const params = brands.length > 0 ? { brands: brands.join(',') } : null;
        return apiClient.get(`/test-users/${userId}/analytics`, { params });
    },

    getVendedorClientAnalytics(userId, brands = []) {
        const params = brands.length > 0 ? { brands: brands.join(',') } : null;
        return apiClient.get(`/vendedor/clientes/${userId}/analytics`, { params });
    },

    getUserAnalytics(userId, brands = []) {
        const params = brands.length > 0 ? { brands: brands.join(',') } : null;
        return apiClient.get(`/admin/users/${userId}/analytics`, { params });
    },

    getUserOrderedBrands(userId) {
        return apiClient.get(`/analytics/user/${userId}/brands`);
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
