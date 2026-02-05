const adminService = require('../services/adminService');
const userService = require('../services/userService');
const productModel = require('../models/productModel');
const { getDeniedProductGroups } = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');

exports.fetchAdminOrderDetails = catchAsync(async (req, res) => {
    const { id } = req.params; // Extraemos el ID del request
    const order = await adminService.fetchAdminOrderDetails(id);
    if (!order) {
        return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    res.json(order); // Enviamos la respuesta HTTP
});

exports.getUsersForAdmin = catchAsync(async (req, res) => {
    const { search } = req.query; // Capture 'search' query param
    const users = await adminService.getUsersForAdmin(search);
    res.json(users);
});

exports.getProductGroupsForAdmin = catchAsync(async (req, res) => {
    const { onlyWithModifications } = req.query;
    const result = await adminService.getProductGroupsForAdmin({
        onlyWithModifications: onlyWithModifications === 'true'
    });
    res.json(result);
});

exports.getPriceChangedProductsController = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    // brands might come as 'brands' or 'brands[]'
    const brands = req.query.brands || req.query['brands[]'];

    let brandsArray = brands;
    if (typeof brands === 'string') {
        brandsArray = [brands];
    }

    const result = await adminService.getPriceChangedProducts({ startDate, endDate, brands: brandsArray });
    res.json(result);
});

exports.downloadPriceChangesExcelController = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const brands = req.query.brands || req.query['brands[]'];

    let brandsArray = brands;
    if (typeof brands === 'string') {
        brandsArray = [brands];
    }

    const buffer = await adminService.generatePriceChangesExcel({ startDate, endDate, brands: brandsArray });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=price_changes_${startDate}.xlsx`);
    res.send(buffer);
});

exports.getDeniedProductGroupsByUserController = catchAsync(async (req, res) => {
    const { userId } = req.params;
    console.log(
        `GET /api/admin/users/${userId}/product-groups -> Admin ${req.userId} fetching permissions...`
    );
    const permissions = await getDeniedProductGroups(userId);
    res.json(permissions);
});

exports.updateUserGroupPermissions = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { groups } = req.body;
    const result = await adminService.updateUserGroupPermissions(
        userId,
        groups
    );
    res.json(result);
});





exports.getGlobalDeniedProductsController = catchAsync(async (req, res) => {
    console.log(`GET /api/admin/global-restrictions -> Admin ${req.userId} fetching global restrictions...`);
    // Use the new method that returns full details
    const permissions = await productModel.getGlobalDeniedProductsWithDetails();
    res.json(permissions);
});

exports.updateGlobalProductPermissionsController = catchAsync(async (req, res) => {
    const { productIds } = req.body; // Frontend sends productIds (which are codes in this context)
    // We can rename it to productCodes for clarity in service, but let's keep it compatible if frontend sends "productIds"
    // Actually, frontend sends "deniedProductCodes" as the body?
    // Let's check frontend again.
    // Frontend: await apiService.updateGlobalProductPermissions(deniedProductCodes);
    // apiService: updateGlobalProductPermissions(productIds) -> body: { productIds }

    // So frontend sends { productIds: [...] } where the array contains CODES.
    // So we just pass it to service.
    const result = await adminService.updateGlobalProductPermissions(productIds);
    res.json(result);
});

exports.getAdmins = catchAsync(async (req, res) => {
    const admins = await adminService.getAdmins();
    res.json(admins);
});

exports.addAdmin = catchAsync(async (req, res) => {
    const { userId, role } = req.body;
    const result = await adminService.addAdmin(userId, role);
    res.json(result);
});

exports.removeAdmin = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await adminService.removeAdmin(userId);
    res.json(result);
});

exports.getAllClientsController = catchAsync(async (req, res) => {
    // Redirecting to the new service that handles search + API + DB
    // We reuse the logic from getUsersForAdmin
    const { search } = req.query;
    const users = await adminService.getUsersForAdmin(search);
    res.json(users);
});

exports.resetUserPassword = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'La contraseña es requerida.' });
    }

    const result = await adminService.resetUserPassword(userId, password);
    res.json(result);
});



exports.assignClientPassword = catchAsync(async (req, res) => {
    const { a1_cod, password, email, is_vendedor } = req.body;
    const codeColumn = is_vendedor ? 'a3_cod' : 'a1_cod';

    if (!a1_cod || !password) {
        return res.status(400).json({ message: 'Código de cliente/vendedor y contraseña son requeridos.' });
    }

    const result = await adminService.assignClientPassword(a1_cod, password, email, codeColumn);
    res.json(result);
});

const { syncEvents } = require('../services/syncService');

exports.getSyncEvents = (req, res) => {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevent Nginx/Proxy buffering
    res.flushHeaders();

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Initial connection event
    sendEvent({ type: 'connected', message: 'Conexión establecida para eventos de sincronización.' });

    // Listener
    const onProgress = (data) => {
        sendEvent({ type: 'progress', ...data });
    };

    syncEvents.on('progress', onProgress);

    // Clean up when client disconnects
    req.on('close', () => {
        syncEvents.off('progress', onProgress);
        res.end();
    });
};

exports.triggerProductSync = catchAsync(async (req, res) => {
    // Fire and forget, frontend will listen to events
    console.log(`Manual Product Sync triggered by Admin ${req.userId}`);
    require('../services/syncService').syncProducts().catch(err => console.error(err));
    res.json({ message: 'Sincronización de productos iniciada.' });
});

exports.triggerFullSync = catchAsync(async (req, res) => {
    console.log(`Manual FULL Sync triggered by Admin ${req.userId}`);
    require('../services/syncService').runFullSync().catch(err => console.error(err));
    res.json({ message: 'Sincronización TOTAL iniciada.' });
});

exports.getAllSellers = catchAsync(async (req, res) => {
    const sellers = await adminService.getAllSellers();
    res.json(sellers);
});

exports.getVendorDeniedGroups = catchAsync(async (req, res) => {
    const { vendedorCode } = req.params;
    const permissions = await adminService.getVendorDeniedGroups(vendedorCode);
    res.json(permissions);
});

exports.updateVendorClientsGroupPermissions = catchAsync(async (req, res) => {
    const { vendedorCode } = req.params;
    const { groups } = req.body; // Array of denied groups
    const result = await adminService.updateVendorClientsGroupPermissions(
        vendedorCode,
        groups
    );
    res.json(result);
});

exports.deleteUserController = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await adminService.deleteUser(userId);
    res.json(result);
});

