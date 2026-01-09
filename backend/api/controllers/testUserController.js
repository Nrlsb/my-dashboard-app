const testUserModel = require('../models/testUserModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createTestUser = catchAsync(async (req, res, next) => {
    // Asumimos que el código del vendedor viene en req.user.codigo o req.user.vendedor_codigo
    // Ajustar según cómo se guarde la info del vendedor en el token/request
    const vendedorCode = req.user.role === 'vendedor' ? req.user.codigo : req.user.vendedor_codigo;

    if (!vendedorCode) {
        return next(new AppError('No se pudo identificar el código del vendedor.', 400));
    }

    const { name, password, cellphone } = req.body;

    if (!name || !password) {
        return next(new AppError('Nombre y contraseña son obligatorios.', 400));
    }

    const newUser = await testUserModel.createTestUser(vendedorCode, { name, password, cellphone });

    res.status(201).json({
        status: 'success',
        data: {
            user: newUser
        }
    });
});

exports.getMyTestUsers = catchAsync(async (req, res, next) => {
    const vendedorCode = req.user.role === 'vendedor' ? req.user.codigo : req.user.vendedor_codigo;

    if (!vendedorCode) {
        return next(new AppError('No se pudo identificar el código del vendedor.', 400));
    }

    const users = await testUserModel.getTestUsersByVendor(vendedorCode);

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
});

exports.deleteTestUser = catchAsync(async (req, res, next) => {
    const vendedorCode = req.user.role === 'vendedor' ? req.user.codigo : req.user.vendedor_codigo;
    const { id } = req.params;

    if (!vendedorCode) {
        return next(new AppError('No se pudo identificar el código del vendedor.', 400));
    }

    const success = await testUserModel.deleteTestUser(id, vendedorCode);

    if (!success) {
        return next(new AppError('No se encontró el usuario o no tienes permiso para eliminarlo.', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
