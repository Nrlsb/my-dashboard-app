import apiClient from '../core/client';

export const orderService = {
    fetchAccountBalance() {
        return apiClient.get('/balance');
    },

    fetchAccountMovements() {
        return apiClient.get('/movements');
    },

    fetchOrderHistory() {
        return apiClient.get('/orders');
    },

    fetchOrderDetail(orderId) {
        if (!orderId) throw new Error('ID de pedido requerido');
        return apiClient.get(`/orders/${orderId}`);
    },

    async downloadOrderPDF(orderId) {
        if (!orderId) throw new Error('ID de pedido requerido');
        // Important: responseType blob for file downloads
        return apiClient.get(`/orders/${orderId}/pdf`, { responseType: 'blob' });
    },

    async downloadOrderCSV(orderId) {
        if (!orderId) throw new Error('ID de pedido requerido');
        return apiClient.get(`/orders/${orderId}/csv`, { responseType: 'blob' });
    },

    updateOrderDetails(updatedOrders) {
        return apiClient.put('/orders/update-details', { updatedOrders });
    },

    uploadOrderInvoice(orderId, formData) {
        if (!orderId) throw new Error('ID de pedido requerido');
        return apiClient.post(`/orders/${orderId}/invoice`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    async downloadOrderInvoice(orderId) {
        if (!orderId) throw new Error('ID de pedido requerido');

        // Axios response handling for mixed content types (Blob or JSON)
        // We request blob by default, but we might need to check headers manually if possible.
        // However, Axios with responseType: 'blob' forces the data to be a Blob.
        // If the server returns JSON (error or link), we need to read that Blob as text.

        const response = await apiClient.get(`/orders/${orderId}/invoice`, {
            responseType: 'blob',
            // We need the full response object to check headers
            skipResponseInterceptor: true
        }).catch(async (error) => {
            // If the interceptor threw an error (non-2xx status), it's already handled.
            // But if we bypassed the interceptor or it's a blob issue:
            if (error.response && error.response.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.message || 'Error descargando factura');
                } catch (e) {
                    throw error;
                }
            }
            throw error;
        });

        // NOTE: My simple core client doesn't support 'skipResponseInterceptor' yet. 
        // And standard axios interception returns `response.data`.
        // The previous implementation checked `response.headers.get('content-type')`.
        // Since my client returns data directly, I lose access to headers in the success case.

        // WORKAROUND: For this specific method, we might want to use the raw axios instance 
        // or return the full response object from the client if configured.
        // For now, I'll rely on the backend sending a Blob. If it's a JSON link, 
        // the backend currently sends JSON.
        // Let's rely on checking if the returned data is a Blob.

        if (response.type === 'application/json') {
            const text = await response.text();
            return JSON.parse(text);
        }
        return response;
    },

    createOrder(orderData) {
        return apiClient.post('/orders', orderData);
    },

    createCreditNoteApi({ targetUserCod, reason, items, invoiceRefId }) {
        return apiClient.post('/credit-note', { targetUserCod, reason, items, invoiceRefId });
    },

    fetchCustomerInvoicesApi({ customerCod }) {
        if (!customerCod) throw new Error('Cód. de Cliente es requerido.');
        return apiClient.get(`/customer-invoices/${customerCod}`);
    },
};
