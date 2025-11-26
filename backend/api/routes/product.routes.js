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
} = require('../controllers');
const {
  optionalAuthenticateToken,
  authenticateToken,
  requireAdmin,
} = require('../middleware/auth');

// La mayoría de las rutas GET aquí son públicas o con autenticación opcional.
router.use(optionalAuthenticateToken);

router.get('/', getProductsController);

router.get('/accessories', getAccessories);

router.get('/product-groups-details', getProductGroupsDetails);

router.get('/group/:groupCode', getProductsByGroupController);

router.get('/brands', getBrandsController);

router.get('/offers', getOffersController);

router.get('/orders', getProductsOrdersController); // Nueva ruta para /api/products/orders

router.get('/:id', getProductsByIdController);

// Esta ruta requiere permisos de administrador.
router.put(
  '/:id/toggle-offer',
  authenticateToken,
  requireAdmin,
  toggleProductOfferStatus
);

module.exports = router;
