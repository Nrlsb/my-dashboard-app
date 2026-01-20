const axios = require('axios');

// Configuration based on PDF
const BASE_URL = 'https://qrmp.pintureriasmercurio.com.ar/rest/MERWS03B';

// Create axios instance with default config
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000, // 30s timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Generic fetcher with pagination support
 * @param {string} endpoint - The API endpoint (e.g., '/get_sb1')
 * @param {object} params - Query parameters
 * @returns {Promise<Array>} - All records from all pages
 */
const fetchAllPages = async (endpoint, params = {}, onPageData = null) => {
    let allObjects = [];
    let page = 1;
    let totalPages = 1;
    const pageSize = 100;

    try {
        do {
            console.log(`[ProtheusService] Fetching ${endpoint} - Page ${page}...`);

            const response = await api.get(endpoint, {
                params: {
                    ...params,
                    page,
                    pageSize,
                },
            });

            const { meta, objects } = response.data;

            if (objects && Array.isArray(objects)) {
                if (onPageData) {
                    // Process data immediately and don't store in memory
                    await onPageData(objects);
                } else {
                    allObjects = allObjects.concat(objects);
                }
            }

            // Safety check for infinite loops if meta is missing specific fields
            totalPages = meta.total_pages || 1;
            page++;

        } while (page <= totalPages);

        if (onPageData) {
            console.log(`[ProtheusService] Finished ${endpoint}. Processed via callback.`);
            return []; // Return empty to indicate data was consumed
        } else {
            console.log(`[ProtheusService] Finished ${endpoint}. Total records: ${allObjects.length}`);
            return allObjects;
        }

    } catch (error) {
        console.error(`[ProtheusService] Error fetching ${endpoint}:`, error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

const getProducts = async () => {
    return fetchAllPages('/get_sb1');
};

const getClients = async () => {
    return fetchAllPages('/get_sa1');
};

const getSellers = async () => {
    return fetchAllPages('/get_sa3');
};

const getPrices = async () => {
    return fetchAllPages('/get_da1');
};

const getProductGroups = async () => {
    return fetchAllPages('/get_sbm');
};

const getIndicators = async (params = {}, onPageData = null) => {
    return fetchAllPages('/get_sbz', params, onPageData);
};

const getCapacities = async () => {
    return fetchAllPages('/get_z02');
};

/**
 * Fetch a single product by code directly from Protheus API
 * Warning: This endpoint might return a single object instead of `{ objects: [] }` structure
 * based on user provided examples.
 */
const getProductByCode = async (code) => {
    try {
        const response = await api.get('/get_sb1', { params: { cod: code } });
        // The API returns { objects: [ { ... } ] }
        if (response.data && response.data.objects && response.data.objects.length > 0) {
            // console.log(`[ProtheusService] Fetched product ${code}:`, response.data.objects[0]);
            return response.data.objects[0];
        }
        return null;
    } catch (error) {
        console.error(`[ProtheusService] Error fetching product by code ${code}:`, error.message);
        return null;
    }
};

/**
 * Fetch a single price by code directly from Protheus API
 */
const getPriceByCode = async (code) => {
    try {
        const response = await api.get('/get_da1', { params: { cod: code } });
        // The API returns { objects: [ { ... } ] }
        if (response.data && response.data.objects && response.data.objects.length > 0) {
            // console.log(`[ProtheusService] Fetched price ${code}:`, response.data.objects[0]);
            return response.data.objects[0];
        }
        return null;
    } catch (error) {
        console.error(`[ProtheusService] Error fetching price by code ${code}:`, error.message);
        return null;
    }
};

module.exports = {
    getProducts,
    getClients,
    getSellers,
    getPrices,
    getProductGroups,
    getIndicators,
    getCapacities,
    getProductByCode,
    getPriceByCode,
};
