const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireAdmin, optionalAuthenticateToken } = require('../middleware/auth');

router.post('/visit', optionalAuthenticateToken, analyticsController.recordVisit);
router.get('/stats', authenticateToken, requireAdmin, analyticsController.getAnalytics);

module.exports = router;
