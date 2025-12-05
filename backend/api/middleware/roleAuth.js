// backend/api/middleware/roleAuth.js

const requireMarketingOrAdmin = async (req, res, next) => {
    try {
        // Check if user exists and has appropriate role
        // Access allowed if:
        // 1. User is an admin (isAdmin = true)
        // 2. User has role 'marketing'

        if (req.user && (req.user.isAdmin || req.user.role === 'marketing')) {
            next();
        } else {
            return res
                .status(403)
                .json({
                    message: 'Acceso denegado. Requiere permisos de marketing o administrador.',
                });
        }
    } catch (error) {
        console.error('Error en middleware requireMarketingOrAdmin:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

module.exports = {
    requireMarketingOrAdmin
};
