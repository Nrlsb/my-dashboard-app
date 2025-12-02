const movementService = require('../services/movementService');
const catchAsync = require('../utils/catchAsync');

exports.getBalanceController = catchAsync(async (req, res) => {
    console.log('GET /api/balance -> Consultando saldo en DB...');
    const balanceData = await movementService.getBalance(req.userId);
    res.json(balanceData);
});

exports.getMovementsController = catchAsync(async (req, res) => {
    console.log('GET /api/movements -> Consultando movimientos en DB...');
    const movementsData = await movementService.getMovements(req.userId);
    res.json(movementsData);
});

exports.fetchProtheusBalance = catchAsync(async (req, res) => {
    console.log('GET /api/protheus-balance -> Consultando saldo Protheus...');
    // Lógica para obtener saldo Protheus
    // Por ahora, solo un placeholder
    res.status(501).json({ message: 'Funcionalidad de obtener saldo Protheus no implementada.' });
});
