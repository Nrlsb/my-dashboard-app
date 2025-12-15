// backend/api/middleware/roleAuth.js

const requirePermission = (permission) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(403).json({ message: 'Acceso denegado. Usuario no autenticado.' });
            }

            // Admin always  has access
            if (user.isAdmin || (user.permissions && user.permissions.includes('all'))) {
                return next();
            }

            if (user.permissions && user.permissions.includes(permission)) {
                return next();
            }

            return res.status(403).json({
                message: `Acceso denegado. Requiere el permiso: ${permission}.`,
            });
        } catch (error) {
            console.error('Error en middleware requirePermission:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    };
};

const requireMarketingOrAdmin = async (req, res, next) => {
    try {
        // Check if user exists and has appropriate role or permissions
        // Access allowed if:
        // 1. User is an admin (isAdmin = true)
        // 2. User has role 'marketing' (legacy)
        // 3. User has 'manage_content' OR 'manage_offers' permission

        if (req.user && (
            req.user.isAdmin ||
            req.user.role === 'marketing' ||
            (req.user.permissions && (req.user.permissions.includes('manage_content') || req.user.permissions.includes('manage_offers')))
        )) {
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
    requireMarketingOrAdmin,
    requirePermission
};
