const accountingService = require('../services/accountingService');
const catchAsync = require('../utils/catchAsync');

exports.createCreditNoteController = catchAsync(async (req, res) => {
    console.log(`POST /api/credit-note -> Admin ${req.userId} creando NC...`);
    const { targetUserCod, reason, items, invoiceRefId } = req.body;
    const adminUserId = req.userId;

    if (
        !targetUserCod ||
        !reason ||
        !items ||
        !invoiceRefId ||
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return res
            .status(400)
            .json({
                message:
                    'Faltan campos: targetUserCod, reason, invoiceRefId, y un array de items son obligatorios.',
            });
    }

    const result = await accountingService.createCreditNote(
        targetUserCod,
        reason,
        items,
        invoiceRefId,
        adminUserId
    );
    res.json(result);
});

exports.getCustomerInvoicesController = catchAsync(async (req, res) => {
    console.log(
        `GET /api/customer-invoices/${req.params.cod} -> Buscando facturas...`
    );
    const customerCod = req.params.cod;
    const invoices = await accountingService.fetchCustomerInvoices(customerCod);
    res.json(invoices);
});
