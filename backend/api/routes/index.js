const express = require('express');
const router = express.Router();

// Este archivo es el punto de entrada para todas las rutas de la API.
// Simplemente registra todos los enrutadores modulares, los cuales
// ya contienen sus propias rutas y middlewares de seguridad.

router.use('/', require('./auth.routes'));
router.use('/', require('./user.routes'));
router.use('/', require('./accounting.routes'));
router.use('/', require('./misc.routes'));
router.use('/', require('./product.routes')); // Contiene /products, /brands, /offers, etc.

router.use('/vendedor', require('./vendedor.routes'));
router.use('/orders', require('./order.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
