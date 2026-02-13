const express = require('express');
const router = express.Router();
const testUserController = require('../controllers/testUserController');
const { authenticateToken } = require('../middleware/auth');

const restrictTo = (...roles) => {
    return (req, res, next) => {
        // Check both role and 'isAdmin' flag for flexibility
        if (roles.includes(req.user.role) || (roles.includes('admin') && req.user.isAdmin)) {
            return next();
        }
        return res.status(403).json({
            status: 'fail',
            message: 'No tienes permisos para realizar esta acción'
        });
    };
};

// Proteger todas las rutas
router.use(authenticateToken);

const analyticsController = require('../controllers/analyticsController');

// Rutas generales de gestión (solo vendedor y admin)
router
    .route('/')
    .get(restrictTo('vendedor', 'admin', 'marketing'), testUserController.getMyTestUsers)
    .post(restrictTo('vendedor', 'admin'), testUserController.createTestUser);

// Analíticas: Permitir a vendedor, admin, marketing y al propio test_user
router.get('/:id/analytics', (req, res, next) => {
    const { id } = req.params;
    const { user } = req;

    // Permitir si es admin, vendedor, marketing
    if (user.isAdmin || user.role === 'admin' || user.role === 'vendedor' || user.role === 'marketing') {
        return next();
    }

    // Permitir si es el propio usuario de prueba
    if (user.role === 'test_user' && String(user.userId) === String(id)) {
        return next();
    }

    return res.status(403).json({
        status: 'fail',
        message: 'No tienes permisos para ver estas analíticas'
    });
}, analyticsController.getTestUserAnalytics);

router
    .route('/:id')
    .delete(restrictTo('vendedor', 'admin'), testUserController.deleteTestUser);

module.exports = router;
