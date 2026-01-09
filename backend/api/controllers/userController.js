const userService = require('../services/userService');
const catchAsync = require('../utils/catchAsync');

exports.getVendedorClientsController = catchAsync(async (req, res) => {
    // El middleware de autenticación debería haber puesto `user` en `req`.
    // Asumimos que el objeto `user` para un vendedor tiene su `codigo`.
    const { user } = req;

    if (!user || user.role !== 'vendedor' || !user.codigo) {
        return res
            .status(403)
            .json({ message: 'Acceso denegado. Se requiere rol de vendedor.' });
    }

    const clients = await userService.getVendedorClients(user.codigo);
    res.json(clients);
});

exports.getProfileController = catchAsync(async (req, res) => {
    console.log('GET /api/profile -> Consultando perfil de usuario en DB...');

    // Validar si es usuario de prueba
    if (req.user && req.user.role === 'test_user') {
        // Para usuario de prueba, devolvemos los datos básicos disponibles en req.user
        // o podríamos consultar DB2 si necesitamos más detalles
        return res.json({
            A1_NOME: req.user.full_name, // Mapeamos al formato esperado por el frontend
            A1_EMAIL: req.user.email || req.user.name,
            A1_COD: 'TEST-' + req.user.id,
            A1_LOJA: '00',
            A1_CGC: '',
            A1_NUMBER: '',
            A1_END: '',
            role: 'test_user'
        });
    }

    // req.userId es añadido por el middleware authenticateToken
    const profileData = await userService.getUserProfile(req.userId);

    if (!profileData) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json(profileData);
});

exports.updateProfileController = catchAsync(async (req, res) => {
    console.log('PUT /api/profile -> Actualizando perfil en DB...');
    const result = await userService.updateUserProfile(req.userId, req.body);
    res.json(result);
});

exports.changePasswordController = catchAsync(async (req, res) => {
    const userId = req.user.userId; // ID del usuario autenticado
    const userRole = req.user.role; // Rol del usuario autenticado
    const { newPassword } = req.body;

    if (!newPassword) {
        return res
            .status(400)
            .json({ message: 'La nueva contraseña es obligatoria.' });
    }

    const result = await userService.changePassword(
        userId,
        newPassword,
        userRole
    );
    res.json(result);
});
