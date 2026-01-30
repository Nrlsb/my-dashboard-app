import apiClient from '../core/client';

export const cartService = {
    getCart: async () => {
        const response = await apiClient.get('/cart');
        return response; // Response is already data due to interceptor
    },

    updateCart: async (items) => {
        const response = await apiClient.post('/cart', { items });
        return response; // Response is already data due to interceptor
    }
};
