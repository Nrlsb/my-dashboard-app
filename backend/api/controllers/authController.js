const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { addToBlacklist } = require('../utils/tokenBlacklist');
const { getTokenFromRequest } = require('../middleware/auth');

exports.loginController = catchAsync(async (req, res, next) => {
    logger.info('POST /api/login -> Autenticando contra DB...');
    const { email, password } = req.body;

    const result = await userService.authenticateUser(email, password);
    if (result.success) {
        const user = result.user;

        const payload = {
            userId: user.id,
            name: user.full_name,
            isAdmin: user.is_admin,
            codCliente: user.a1_cod,
            role: user.role || 'cliente',
            permissions: user.permissions || [],
            codigo: user.codigo || null,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });

        const userWithRole = { ...user, role: payload.role };

        logger.info(`Usuario autenticado exitosamente: ${email}`);

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        });

        res.json({
            success: true,
            user: userWithRole,
            token: token,
            first_login: result.first_login,
        });
    } else {
        logger.warn(`Intento de login fallido para: ${email} - Razón: ${result.message}`);
        if (result.isExpired) {
            logger.warn(`Test User expirado: ${email}`);
            return res.status(401).json({
                success: false,
                message: result.message,
                isExpired: true,
                vendor: result.vendor
            });
        }
        logger.warn(`Intento de login fallido para: ${email} - Razón: ${result.message}`);
        return next(new AppError(result.message, 401));
    }
});

exports.registerController = catchAsync(async (req, res, next) => {
    logger.info('POST /api/register -> Registrando nuevo usuario en DB...');
    const { nombre, email, password } = req.body;

    try {
        const newUser = await userService.registerUser(req.body);
        logger.info(`Nuevo usuario registrado: ${email}`);
        res.status(201).json({ success: true, user: newUser });
    } catch (error) {
        logger.error('Error en /api/register:', error);
        if (error.message.includes('email ya está registrado')) {
            return next(new AppError(error.message, 409));
        }
        if (error.code === '23505') {
            return next(new AppError('El email ya está registrado.', 409));
        }
        return next(error); // Pass to global error handler
    }
});

exports.authenticateProtheusUser = catchAsync(async (req, res, next) => {
    logger.info('POST /api/protheus-login -> Autenticando contra Protheus...');
    // Lógica de autenticación Protheus
    // Por ahora, solo un placeholder
    return next(new AppError('Funcionalidad de autenticación Protheus no implementada.', 501));
});

exports.logoutController = async (req, res) => {
    const token = getTokenFromRequest(req);
    if (token) await addToBlacklist(token);

    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
    });
    res.json({ success: true, message: 'Sesión cerrada.' });
};

exports.registerProtheusUser = catchAsync(async (req, res, next) => {
    logger.info('POST /api/protheus-register -> Registrando usuario en Protheus...');
    // Lógica de registro Protheus
    // Por ahora, solo un placeholder
    return next(new AppError('Funcionalidad de registro Protheus no implementada.', 501));
});
