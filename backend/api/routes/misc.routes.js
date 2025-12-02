const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const {
  getExchangeRatesController,
  createProtheusQueryController,
  uploadVoucherController,
} = require('../controllers/supportController');
const {
  getDashboardPanelsController,
} = require('../controllers/dashboardController');
const {
  authenticateToken,
  optionalAuthenticateToken,
} = require('../middleware/auth'); // Import middleware

// Public route
router.get('/exchange-rates', getExchangeRatesController);

// Authenticated routes
router.post('/queries', authenticateToken, createProtheusQueryController);

router.post(
  '/upload-voucher',
  authenticateToken, // Apply auth before upload
  upload.single('voucherFile'),
  uploadVoucherController
);

// Optional authentication route
router.get(
  '/dashboard-panels',
  optionalAuthenticateToken,
  getDashboardPanelsController
);

module.exports = router;
