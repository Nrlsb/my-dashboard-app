const express = require('express');
const router = express.Router();
const {
  getCustomerInvoicesController,
} = require('../controllers/accountingController');
const {
  getBalanceController,
  getMovementsController,
} = require('../controllers/movementController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de contabilidad requieren autenticación
router.use(authenticateToken);

router.get('/balance', getBalanceController);

router.get('/movements', getMovementsController);

module.exports = router;
