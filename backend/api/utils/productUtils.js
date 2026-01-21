const { pool } = require('../db');
const productModel = require('../models/productModel');
const userModel = require('../models/userModel');
const { formatCurrency } = require('./helpers');

/**
 * Obtiene los filtros y permisos de productos para un usuario dado.
 * Centraliza la lógica de usuarios admin, restringidos y de marketing.
 * @param {object|number|null} userOrId 
 * @returns {Promise<{
 *   isUserAdmin: boolean, 
 *   deniedGroups: string[], 
 *   allowedProductCodes: string[], 
 *   isRestrictedUser: boolean,
 *   role: string
 * }>}
 */
const getUserFilters = async (userOrId) => {
    let isUserAdmin = false;
    let deniedGroups = [];
    let allowedProductCodes = [];
    let isRestrictedUser = false;
    let role = 'cliente';

    let userId = null;
    let userObj = null;

    if (userOrId && typeof userOrId === 'object') {
        userObj = userOrId;
        userId = userObj.id;
    } else {
        userId = userOrId;
    }

    if (userId || userObj) {
        // Special Handling for Test Users (Must be passed as object with role 'test_user')
        if (userObj && userObj.role === 'test_user') {
            isUserAdmin = false; // Security: Test users are NEVER admins
            role = 'test_user';

            // Inherit denied groups from Vendor
            const vendorCode = userObj.vendedor_code || userObj.vendedorCode;
            if (vendorCode) {
                deniedGroups = await productModel.getVendorDeniedProductGroups(vendorCode);
            }

            // Test users are restricted
            isRestrictedUser = true;
            allowedProductCodes = await productModel.getAllProductImageCodes();

            console.log(`[DEBUG] getUserFilters -> Test User: ${userId}, Vendor: ${vendorCode}, DeniedGroups: ${deniedGroups.length}`);
        } else {
            // Normal User Logic
            // Check admin status
            if (userObj && userObj.is_admin !== undefined) {
                isUserAdmin = userObj.is_admin;
            } else if (userId) {
                const userResult = await pool.query(
                    'SELECT is_admin FROM users WHERE id = $1',
                    [userId]
                );
                isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;
            }

            if (!isUserAdmin) {
                // Obtener grupos denegados (User specific)
                deniedGroups = await productModel.getDeniedProductGroups(userId);

                // Obtener rol (Prefer DB for freshness, or token if available)
                const roleData = await userModel.getUserRoleFromDB2(userId);
                role = roleData ? roleData.role : 'cliente';

                // Si no es marketing, es usuario restringido (necesita verificación de imagen)
                if (role !== 'marketing') {
                    isRestrictedUser = true;
                    // Obtener códigos de productos con imágenes para filtrar
                    allowedProductCodes = await productModel.getAllProductImageCodes();
                }
            }
        }
    } else {
        // Sin usuario logueado -> tratado como restringido
        isRestrictedUser = true;
        role = 'guest';
        allowedProductCodes = await productModel.getAllProductImageCodes();
    }

    console.log(`[DEBUG] getUserFilters -> User: ${userId}, Role: ${role}, AllowedCodes: ${allowedProductCodes.length}`);

    return {
        isUserAdmin,
        deniedGroups,
        allowedProductCodes,
        isRestrictedUser,
        role
    };
};

/**
 * Calcula el precio final de un producto basado en su moneda y cotización.
 * @param {object} product - Objeto producto con properties price y moneda.
 * @param {object} exchangeRates - Objeto con ventas_billete y venta_divisa.
 * @returns {object} - { finalPrice, cotizacionUsed, formattedPrice }
 */
const calculateFinalPrice = (product, exchangeRates) => {
    const ventaBillete = exchangeRates.venta_billete || 1;
    const ventaDivisa = exchangeRates.venta_divisa || 1;

    let originalPrice = product.price;
    let finalPrice = product.price;
    let cotizacionUsed = 1;

    // Asegurar conversión a número para comparación segura
    const moneda = Number(product.moneda);

    if (moneda === 2) {
        // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
        cotizacionUsed = ventaBillete;
    } else if (moneda === 3) {
        // Dólar Divisa
        finalPrice = originalPrice * ventaDivisa;
        cotizacionUsed = ventaDivisa;
    }

    return {
        finalPrice,
        cotizacionUsed,
        formattedPrice: formatCurrency(finalPrice)
    };
};

module.exports = {
    getUserFilters,
    calculateFinalPrice
};
