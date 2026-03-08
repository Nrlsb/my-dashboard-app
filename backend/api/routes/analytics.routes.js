const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireAdmin, optionalAuthenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/roleAuth');

const canViewAnalyticsOrVendor = (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'No autenticado' });
    if (user.isAdmin || user.role === 'vendedor' || (user.permissions && user.permissions.includes('view_analytics'))) {
        return next();
    }
    return res.status(403).json({ message: 'Acceso denegado. Requiere permisos correspondientes.' });
};

router.post('/visit', optionalAuthenticateToken, analyticsController.recordVisit);
router.post('/download', optionalAuthenticateToken, analyticsController.recordDownload);
router.get('/stats', authenticateToken, requirePermission('view_analytics'), analyticsController.getAnalytics);
router.get('/user/:userId', authenticateToken, canViewAnalyticsOrVendor, analyticsController.getUserAnalytics);
router.get('/user/:userId/brands', authenticateToken, canViewAnalyticsOrVendor, analyticsController.getUserOrderedBrands);
router.get('/seller/:sellerCode', authenticateToken, requirePermission('view_analytics'), analyticsController.getSellerAnalytics);

module.exports = router;
