import apiClient from '../core/client';

export const commonService = {
    sendQuery(queryData) {
        return apiClient.post('/queries', queryData);
    },

    uploadVoucher(formData) {
        return apiClient.post('/upload-voucher', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    getDashboardPanels() {
        return apiClient.get('/dashboard-panels');
    },

    uploadImages(formData) {
        return apiClient.post('/images/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    uploadToDrive(formData) {
        return apiClient.post('/upload/drive', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    assignImageToProducts(imageUrl, products, replace = false) {
        return apiClient.post('/images/assign', { imageUrl, products, replace });
    },

    recordVisit(path) {
        return apiClient.post('/analytics/visit', { path });
    },

    getAnalytics(params) {
        return apiClient.get('/analytics/stats', { params });
    },

    async downloadMissingImagesReport() {
        // IMPORTANT: responseType blob
        return apiClient.get('/reports/missing-images', { responseType: 'blob' });
    },
};
