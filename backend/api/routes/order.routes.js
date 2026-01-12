const express = require('express');
const router = express.Router();
const {
  getOrdersController,
  createOrderController,
  updateOrderDetailsController,
  getOrderByIdController,
  downloadOrderPdfController,
  downloadOrderCsvController,
  uploadOrderInvoiceController,
  downloadOrderInvoiceController,
} = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Todas las rutas de pedidos requieren autenticación
router.use(authenticateToken);

router.get('/', getOrdersController);

router.post('/', createOrderController);

router.put('/update-details', updateOrderDetailsController);

router.get('/:id', getOrderByIdController);

router.get('/:id/pdf', downloadOrderPdfController);

router.get('/:id/csv', downloadOrderCsvController);

router.post('/:id/invoice', upload.single('invoiceFile'), uploadOrderInvoiceController);
router.get('/:id/invoice', downloadOrderInvoiceController);

module.exports = router;
