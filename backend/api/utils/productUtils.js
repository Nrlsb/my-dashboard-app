const { pool } = require('../db');
const productModel = require('../models/productModel');
const userModel = require('../models/userModel');
const { formatCurrency } = require('./helpers');

/**
 * Obtiene los filtros y permisos de productos para un usuario dado.
 * Centraliza la lógica de usuarios admin, restringidos y de marketing.
 * @param {number|null} userId 
 * @returns {Promise<{
 *   isUserAdmin: boolean, 
 *   deniedGroups: string[], 
 *   allowedProductCodes: string[], 
 *   isRestrictedUser: boolean,
 *   role: string
 * }>}
 */
const getUserFilters = async (userId) => {
    let isUserAdmin = false;
    let deniedGroups = [];
    let allowedProductCodes = [];
    let isRestrictedUser = false;
    let role = 'cliente';

    if (userId) {
        // Verificar si el usuario es admin
        const userResult = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [userId]
        );
        isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;

        if (!isUserAdmin) {
            // Obtener grupos denegados
            deniedGroups = await productModel.getDeniedProductGroups(userId);

            // Obtener rol
            const roleData = await userModel.getUserRoleFromDB2(userId);
            role = roleData ? roleData.role : 'cliente';

            // Si no es marketing, es usuario restringido (necesita verificación de imagen)
            if (role !== 'marketing') {
                isRestrictedUser = true;
                // Obtener códigos de productos con imágenes para filtrar
                allowedProductCodes = await productModel.getAllProductImageCodes();
                console.log(`[DEBUG] userId: ${userId}, role: ${role}. Found ${allowedProductCodes.length} allowed product codes with images.`);
            }
        }
    } else {
        // Sin usuario logueado -> tratado como restringido
        isRestrictedUser = true;
        role = 'guest';
        allowedProductCodes = await productModel.getAllProductImageCodes();
    }

    console.log(`[DEBUG] getUserFilters -> User: ${userId}, Role: ${role}, Restricted: ${isRestrictedUser}, AllowedCodes: ${allowedProductCodes.length}`);

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
