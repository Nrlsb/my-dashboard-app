const orderService = require('../services/orderService');
const catchAsync = require('../utils/catchAsync');

exports.updateOrderDetailsController = catchAsync(async (req, res) => {
    const { updatedOrders } = req.body;
    await orderService.updateOrderDetails(updatedOrders);
    res.status(200).json({ message: 'Pedidos actualizados exitosamente.' });
});

exports.getOrdersController = catchAsync(async (req, res) => {
    console.log('GET /api/orders -> Consultando pedidos en DB...');
    const orders = await orderService.fetchOrders(req.user);
    res.json(orders);
});

exports.createOrderController = catchAsync(async (req, res) => {
    console.log(
        'POST /api/orders -> Guardando nuevo pedido/presupuesto en DB...'
    );
    const { userId, ...orderData } = req.body;
    const result = await orderService.createOrder(orderData, req.userId);
    res.json(result);
});

exports.getOrderByIdController = catchAsync(async (req, res) => {
    console.log(
        `GET /api/orders/${req.params.id} -> Consultando detalles en DB...`
    );
    const orderId = req.params.id;
    const orderDetails = await orderService.fetchOrderDetails(
        orderId,
        req.user
    );
    if (orderDetails) {
        res.json(orderDetails);
    } else {
        res.status(404).json({ message: 'Pedido no encontrado.' });
    }
});

exports.downloadOrderPdfController = catchAsync(async (req, res) => {
    console.log(`GET /api/orders/${req.params.id}/pdf -> Generando PDF...`);
    const orderId = req.params.id;
    const pdfBuffer = await orderService.downloadOrderPdf(orderId, req.user);

    if (pdfBuffer) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Pedido_${orderId}.pdf`
        );
        res.send(pdfBuffer);
    } else {
        res
            .status(404)
            .json({ message: 'Pedido no encontrado o no le pertenece.' });
    }
});

exports.downloadOrderCsvController = catchAsync(async (req, res) => {
    const orderId = req.params.id;
    const user = req.user; // Usuario autenticado desde el token

    const csvBuffer = await orderService.downloadOrderCsv(orderId, user);

    if (csvBuffer) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Pedido_${orderId}.csv`
        );
        res.send(csvBuffer);
    } else {
        // La lógica de permisos ya está en el servicio, así que esto es un fallback.
        res
            .status(404)
            .json({ message: 'Pedido no encontrado o no le pertenece.' });
    }
});
