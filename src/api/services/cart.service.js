import apiClient from '../core/client';

export const cartService = {
    getCart: async () => {
        const response = await apiClient.get('/cart');
        return response.data;
    },

    updateCart: async (items) => {
        const response = await apiClient.post('/cart', { items });
        return response.data;
    }
};
