const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireMarketingOrAdmin } = require('../middleware/roleAuth');

router.get('/missing-images', authenticateToken, requireMarketingOrAdmin, reportController.getMissingImagesReport);

module.exports = router;
