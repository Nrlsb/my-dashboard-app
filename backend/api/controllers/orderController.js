const orderService = require('../services/orderService');
const catchAsync = require('../utils/catchAsync');
const path = require('path');
const fs = require('fs');
const orderModel = require('../models/orderModel'); // Direct access for update for now, or move to service


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

exports.uploadOrderInvoiceController = catchAsync(async (req, res) => {
    console.log(`POST /api/orders/${req.params.id}/invoice -> Subiendo factura...`);
    const orderId = req.params.id;
    const user = req.user;

    if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún archivo.' });
    }

    // Verificar permisos (solo vendedor o admin deberían poder subir, o vendedor asignado)
    // Por simplicidad, asumimos que si es vendedor puede subir.
    // TODO: Verificar que el pedido 'pertenece' a la cartera del vendedor si es necesario una restricción más fuerte.
    if (user.role !== 'vendedor' && user.role !== 'admin') {
        // Eliminar archivo subido si no tiene permisos
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'No tiene permisos para subir facturas.' });
    }

    const invoiceUrl = req.file.path; // Guardamos el path relativo o absoluto según configuración de multer
    // Normalmente guardamos path relativo a la raíz pública o algo accesible.
    // Multer ya guarda en 'uploads/' (definido en middleware).

    // Mejor guardar solo el nombre del archivo o path relativo
    const savedPath = req.file.path;

    await orderModel.updateOrderInvoice(orderId, savedPath);

    res.json({ message: 'Factura subida exitosamente.', path: savedPath });
});

exports.downloadOrderInvoiceController = catchAsync(async (req, res) => {
    console.log(`GET /api/orders/${req.params.id}/invoice -> Descargando factura...`);
    const orderId = req.params.id;
    const user = req.user;

    // Obtener detalles del pedido para verificar acceso y obtener path
    const orderDetails = await orderModel.findOrderDetailsById(orderId, user.role === 'admin' || user.role === 'vendedor' ? [user.id] : user.id); // Esta lógica de userIds en findOrderDetailsById es compleja, mejor usar logic de service o refactorizar.
    // Simplificación: Si el usuario es cliente, solo puede ver SU pedido. Si es vendedor, puede ver pedidos de SUS clientes.
    // Reutilicemos orderService.fetchOrderDetails si es posible, pero ese devuelve objeto enriquecido.

    // Para simplificar y no romper encapsulamiento, hacemos una consulta directa o mejoramos orderService.
    // Usaremos orderModel.findOrderDetailsById con una lógica "laxa" para admin/vendedor por ahora, o verificamos después.

    // HACK: Para vendedores, pasamos el ID del dueño del pedido si lo supiéramos, pero findOrderDetailsById filtra por userId.
    // Si somos vendedor, necesitamos obtener el pedido sin filtrar por userId primero para ver de quien es?
    // O mejor, delegar al service la verificación.

    // Vamos a leer el pedido directamente para obtener el path.
    // Pero necesitamos seguridad. 
    // Si usuario es cliente: userId debe coincidir.
    // Si usuario es vendedor: debe ser vendedor del cliente (esto requiere lógica adicional).

    // Por ahora, implementaremos una verificación básica:
    // Si es cliente, user_id == user.id.
    // Si es vendedor, asumimos acceso (o implementaremos check de cartera si existiera function).

    // Usamos el servicio existente para buscar el pedido, eso ya maneja seguridad (fetchOrderDetails).
    const order = await orderService.fetchOrderDetails(orderId, user);

    if (!order || !order.invoice_url) {
        return res.status(404).json({ message: 'Factura no encontrada.' });
    }

    const filePath = path.resolve(order.invoice_url);
    if (fs.existsSync(filePath)) {
        res.download(filePath, `Factura_Pedido_${orderId}.pdf`);
    } else {
        res.status(404).json({ message: 'Archivo físico no encontrado.' });
    }
});
