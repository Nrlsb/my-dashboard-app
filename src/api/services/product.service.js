import apiClient from '../core/client';

export const productService = {
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
        return apiClient.get('/products', { params });
    },

    fetchAllProductsForPDF(searchTerm, brands) {
        const params = {
            page: 1,
            limit: 9999,
            search: searchTerm,
            isExport: 'true',
        };
        if (brands && brands.length > 0) {
            params.brand = brands.join(',');
        }
        return apiClient.get('/products', { params }).then((data) => data.products);
    },

    fetchProductById(productId) {
        if (!productId) throw new Error('El ID de producto es requerido');
        return apiClient.get(`/products/${productId}`);
    },

    fetchProductByCode(productCode) {
        if (!productCode) throw new Error('El código de producto es requerido');
        return apiClient.get(`/products/code/${productCode}`);
    },

    fetchProtheusBrands() {
        return apiClient.get('/products/brands');
    },

    getAccessories() {
        return apiClient.get('/products/accessories');
    },

    getProductGroupsDetails() {
        return apiClient.get('/products/product-groups-details');
    },

    fetchProductsByGroup(groupCode, page) {
        const params = { page, limit: 20 };
        return apiClient.get(`/products/group/${groupCode}`, { params });
    },

    fetchOffers() {
        return apiClient.get('/products/offers');
    },

    fetchNewReleases() {
        return apiClient.get('/products/new-releases');
    },

    toggleProductOffer(productId) {
        if (!productId) throw new Error('ID de producto requerido');
        return apiClient.put(`/products/${productId}/toggle-offer`);
    },

    updateProductOfferDetails(productId, details) {
        if (!productId) throw new Error('ID de producto requerido');
        return apiClient.put(`/products/${productId}/offer-details`, details);
    },

    toggleProductNewRelease(productId) {
        if (!productId) throw new Error('ID de producto requerido');
        return apiClient.put(`/products/${productId}/toggle-new-release`);
    },

    updateProductNewReleaseDetails(productId, details) {
        if (!productId) throw new Error('ID de producto requerido');
        return apiClient.put(`/products/${productId}/new-release-details`, details);
    },

    getCustomCollectionProducts(collectionId) {
        return apiClient.get(`/products/collection/${collectionId}`);
    },

    generateAiDescription(productId, productData) {
        if (!productId) throw new Error('ID de producto requerido');
        return apiClient.post(`/products/${productId}/ai-description/generate`, productData);
    },

    saveAiDescription(productId, description) {
        if (!productId) throw new Error('ID de producto requerido');
        return apiClient.put(`/products/${productId}/ai-description`, { description });
    },

    batchGenerateAiDescriptions() {
        return apiClient.post('/products/batch-generate-descriptions');
    },

    getBatchGenerationProgress() {
        return apiClient.get('/products/batch-generate-descriptions/progress');
    },

    getExchangeRates() {
        return apiClient.get('/exchange-rates');
    },
};
