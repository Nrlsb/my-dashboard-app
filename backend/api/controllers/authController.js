const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const catchAsync = require('../utils/catchAsync');

exports.loginController = catchAsync(async (req, res) => {
    console.log('POST /api/login -> Autenticando contra DB...');
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
            codigo: user.codigo || null,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        const userWithRole = { ...user, role: payload.role };

        res.json({
            success: true,
            user: userWithRole,
            token: token,
            first_login: result.first_login,
        });
    } else {
        res.status(401).json({ message: result.message });
    }
});

exports.registerController = catchAsync(async (req, res) => {
    console.log('POST /api/register -> Registrando nuevo usuario en DB...');
    const { nombre, email, password } = req.body;

    try {
        const newUser = await userService.registerUser(req.body);
        res.status(201).json({ success: true, user: newUser });
    } catch (error) {
        console.error('Error en /api/register:', error);
        if (error.message.includes('email ya está registrado')) {
            return res.status(409).json({ message: error.message });
        }
        if (error.code === '23505') {
            return res.status(409).json({ message: 'El email ya está registrado.' });
        }
        throw error; // Pass to global error handler
    }
});

exports.authenticateProtheusUser = catchAsync(async (req, res) => {
    console.log('POST /api/protheus-login -> Autenticando contra Protheus...');
    // Lógica de autenticación Protheus
    // Por ahora, solo un placeholder
    res.status(501).json({ message: 'Funcionalidad de autenticación Protheus no implementada.' });
});

exports.registerProtheusUser = catchAsync(async (req, res) => {
    console.log('POST /api/protheus-register -> Registrando usuario en Protheus...');
    // Lógica de registro Protheus
    // Por ahora, solo un placeholder
    res.status(501).json({ message: 'Funcionalidad de registro Protheus no implementada.' });
});
