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

// Solo permitir a vendedores y admin
router.use(restrictTo('vendedor', 'admin'));

const analyticsController = require('../controllers/analyticsController');

// ... (previous code)

router
    .route('/')
    .get(testUserController.getMyTestUsers)
    .post(testUserController.createTestUser);

router.get('/:id/analytics', analyticsController.getTestUserAnalytics);

router
    .route('/:id')
    .delete(testUserController.deleteTestUser);

module.exports = router;
