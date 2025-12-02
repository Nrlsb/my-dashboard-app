const express = require('express');
const router = express.Router();
const {
  getProductsController,
  getAccessories,
  getProductGroupsDetails,
  getProductsByGroupController,
  getBrandsController,
  getOffersController,
  getProductsByIdController, // Nombre corregido
  getProductsOrdersController, // Nuevo controlador importado
  toggleProductOfferStatus,
} = require('../controllers/productController');
const {
  optionalAuthenticateToken,
  authenticateToken,
  requireAdmin,
} = require('../middleware/auth');
const cache = require('../middleware/cache');

// La mayoría de las rutas GET aquí son públicas o con autenticación opcional.
router.use(optionalAuthenticateToken);

// Cachear listado general por 5 minutos (300s)
router.get('/', cache(300), getProductsController);

// Cachear accesorios por 10 minutos (600s)
router.get('/accessories', cache(600), getAccessories);

// Cachear detalles de grupos por 1 hora (3600s) - Cambia muy poco
router.get('/product-groups-details', cache(3600), getProductGroupsDetails);

// Cachear productos por grupo por 10 minutos (600s)
router.get('/group/:groupCode', cache(600), getProductsByGroupController);

// Cachear marcas por 1 hora (3600s)
router.get('/brands', cache(3600), getBrandsController);

// Cachear ofertas por 5 minutos (300s)
router.get('/offers', cache(300), getOffersController);

router.get('/orders', getProductsOrdersController); // Nueva ruta para /api/products/orders

// Cachear producto individual por 5 minutos (300s)
router.get('/:id', cache(300), getProductsByIdController);

// Esta ruta requiere permisos de administrador.
router.put(
  '/:id/toggle-offer',
  authenticateToken,
  requireAdmin,
  toggleProductOfferStatus
);

module.exports = router;
