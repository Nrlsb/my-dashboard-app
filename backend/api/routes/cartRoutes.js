const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticateToken = require('../middleware/auth'); // Asegúrate de que la ruta al middleware sea correcta

// Todas las rutas de carrito requieren autenticación
router.use(authenticateToken);

router.get('/', cartController.getCart);
router.post('/', cartController.updateCart);

module.exports = router;
