const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de carrito requieren autenticación
router.use(authenticateToken);

router.get('/', cartController.getCart);
router.post('/', cartController.updateCart);

module.exports = router;
