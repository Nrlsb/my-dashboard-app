const supportService = require('../services/supportService');
const catchAsync = require('../utils/catchAsync');

exports.createProtheusQueryController = catchAsync(async (req, res) => {
    console.log('POST /api/queries -> Guardando consulta en DB...');
    const { userId, ...queryData } = req.body;
    const result = await supportService.saveProtheusQuery(queryData, req.userId);
    res.json(result);
});

exports.uploadVoucherController = catchAsync(async (req, res) => {
    console.log(
        'POST /api/upload-voucher -> Archivo recibido, guardando en DB...'
    );
    if (!req.file) {
        return res
            .status(400)
            .json({ message: 'No se recibió ningún archivo.' });
    }

    const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
    };

    const result = await supportService.saveProtheusVoucher(
        fileInfo,
        req.userId
    );
    res.json({ success: true, fileInfo: result });
});

exports.getExchangeRatesController = catchAsync(async (req, res) => {
    console.log(
        'GET /api/exchange-rates -> Consultando cotizaciones del dólar...'
    );
    const rates = await require('../utils/exchangeRateService').getExchangeRates();
    res.json(rates);
});
