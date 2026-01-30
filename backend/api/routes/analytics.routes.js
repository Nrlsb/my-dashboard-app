const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireAdmin, optionalAuthenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/roleAuth');

router.post('/visit', optionalAuthenticateToken, analyticsController.recordVisit);
router.post('/download', optionalAuthenticateToken, analyticsController.recordDownload);
router.get('/stats', authenticateToken, requirePermission('view_analytics'), analyticsController.getAnalytics);

module.exports = router;
