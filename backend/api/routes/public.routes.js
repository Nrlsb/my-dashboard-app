const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const productService = require('../services/productService');
const { submitContactRequest } = require('../controllers/contactRequestController');

/**
 * Helper: elimina campos de precios de un array de productos/items.
 */
const stripPrices = (items) => {
    if (!Array.isArray(items)) return items;
    return items.map((item) => {
        const { price, formattedPrice, unit_price, ...rest } = item;
        return rest;
    });
};

/**
 * GET /api/public/product-groups
 * Devuelve los grupos de productos (categorías) sin precios.
 */
router.get(
    '/product-groups',
    catchAsync(async (req, res) => {
        const groupDetails = await productService.getProductGroupsDetails(null);
        res.json(stripPrices(groupDetails));
    })
);

/**
 * GET /api/public/accessories
 * Devuelve los accesorios sin precios.
 */
router.get(
    '/accessories',
    catchAsync(async (req, res) => {
        const accessories = await productService.getAccessories(null);
        res.json(stripPrices(accessories));
    })
);

/**
 * GET /api/public/new-releases
 * Devuelve los nuevos lanzamientos sin precios.
 */
router.get(
    '/new-releases',
    catchAsync(async (req, res) => {
        const releases = await productService.fetchNewReleases(null);
        res.json(stripPrices(releases));
    })
);

/**
 * POST /api/public/contact-request
 * Recibe una solicitud de registro/contacto.
 */
router.post('/contact-request', submitContactRequest);

module.exports = router;
