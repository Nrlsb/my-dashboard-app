const orderService = require('../services/orderService');
const catchAsync = require('../utils/catchAsync');
const path = require('path');
const fs = require('fs');
const orderModel = require('../models/orderModel'); // Direct access for update for now, or move to service
const googleDriveService = require('../services/googleDriveService');


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
    console.log(`POST /api/orders/${req.params.id}/invoice -> Subiendo factura a Google Drive...`);
    const orderId = req.params.id;
    const user = req.user;

    if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún archivo.' });
    }

    if (user.role !== 'vendedor' && user.role !== 'admin') {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'No tiene permisos para subir facturas.' });
    }

    try {
        // Upload to Google Drive (Invoices folder)
        // googleDriveService.uploadFile cleans up the local file automatically
        const INVOICES_FOLDER_ID = '1XFMgc3IkS8XuahJDroW4nnxTlkyRoO3g';
        const result = await googleDriveService.uploadFile(req.file, INVOICES_FOLDER_ID);

        // Save SECURE URL (webViewLink) to database
        const invoiceUrl = result.webViewLink;
        await orderModel.updateOrderInvoice(orderId, invoiceUrl);

        // --- NOTIFICAR CLIENTE ---
        // Obtener detalles del pedido para saber de quién es
        // Como 'user' es el quien SUBE (vendedor/admin), necesitamos el user_id del DUEÑO del pedido
        const orderDetails = await orderService.fetchOrderDetails(orderId, user);

        if (orderDetails && orderDetails.user_id) {
            try {
                // Importar dinámicamente o usar userModel si ya está importado (lo añadiremos arriba)
                const usedUserModel = require('../models/userModel');
                const clientUser = await usedUserModel.findUserById(orderDetails.user_id);

                if (clientUser && clientUser.email) {
                    // Verificamos si el panel de Histórico de Pedidos está activo
                    const dashboardService = require('../services/dashboardService');
                    const isHistoryVisible = await dashboardService.checkPanelVisibility('order-history');

                    if (isHistoryVisible) {
                        const emailService = require('../emailService');
                        await emailService.sendInvoiceAvailableEmail(
                            clientUser.email,
                            clientUser.full_name,
                            orderId,
                            invoiceUrl
                        );
                    } else {
                        console.log(`[Order #${orderId}] Email de factura NO enviado porque el panel 'Historico' está oculto.`);
                    }
                }
            } catch (emailErr) {
                console.error("Error al enviar email de factura:", emailErr);
                // No fallamos la request si el email falla
            }
        }

        res.json({ message: 'Factura subida exitosamente a Google Drive.', path: invoiceUrl });

    } catch (error) {
        console.error("Error subiendo factura:", error);
        // Try to remove local file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: 'Error interno al subir la factura.' });
    }
});



exports.downloadOrderInvoiceController = catchAsync(async (req, res) => {
    console.log(`GET /api/orders/${req.params.id}/invoice -> Descargando factura...`);
    const orderId = req.params.id;
    const user = req.user;

    const order = await orderService.fetchOrderDetails(orderId, user);

    if (!order || !order.invoice_url) {
        return res.status(404).json({ message: 'Factura no encontrada.' });
    }

    const invoiceUrl = order.invoice_url;

    // Check if it is a URL (Cloudinary or Google Drive)
    if (invoiceUrl.startsWith('http://') || invoiceUrl.startsWith('https://')) {
        return res.redirect(invoiceUrl);
    }

    // FALLBACK for legacy local files
    let filePath = invoiceUrl;
    if (!path.isAbsolute(filePath)) {
        filePath = path.join(__dirname, '..', filePath);
    }

    if (fs.existsSync(filePath)) {
        res.download(filePath, `Factura_Pedido_${orderId}.pdf`);
    } else {
        res.status(404).json({ message: 'Archivo físico no encontrado (migre a la nube resubiendo).' });
    }
});
