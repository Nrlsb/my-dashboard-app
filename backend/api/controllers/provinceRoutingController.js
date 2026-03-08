const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const provinceRoutingModel = require('../models/provinceRoutingModel');

const PROVINCIAS_VALIDAS = [
    'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
    'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
    'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
    'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
    'Tierra del Fuego', 'Tucumán',
];

exports.getRouting = catchAsync(async (req, res) => {
    const rows = await provinceRoutingModel.getAll();
    res.json({ success: true, data: rows });
});

exports.upsertRouting = catchAsync(async (req, res, next) => {
    const provincia = decodeURIComponent(req.params.provincia);
    const { seller_name, seller_email } = req.body;

    if (!PROVINCIAS_VALIDAS.includes(provincia)) {
        return next(new AppError('Provincia no válida.', 400));
    }
    if (!seller_email) {
        return next(new AppError('El email del vendedor es obligatorio.', 400));
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(seller_email)) {
        return next(new AppError('El email no tiene formato válido.', 400));
    }

    const row = await provinceRoutingModel.upsert(provincia, seller_name || null, seller_email);
    res.json({ success: true, data: row });
});

exports.deleteRouting = catchAsync(async (req, res, next) => {
    const provincia = decodeURIComponent(req.params.provincia);

    if (!PROVINCIAS_VALIDAS.includes(provincia)) {
        return next(new AppError('Provincia no válida.', 400));
    }

    await provinceRoutingModel.deleteByProvincia(provincia);
    res.json({ success: true });
});
