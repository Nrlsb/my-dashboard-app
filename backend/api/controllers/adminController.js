const adminService = require('../services/adminService');
const userService = require('../services/userService');
const { getDeniedProductGroups, getDeniedProducts, getGlobalDeniedProducts } = require('../models/productModel');
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
    const users = await adminService.getUsersForAdmin();
    res.json(users);
});

exports.getProductGroupsForAdmin = catchAsync(async (req, res) => {
    const result = await adminService.getProductGroupsForAdmin();
    res.json(result);
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

exports.getDeniedProductsByUserController = catchAsync(async (req, res) => {
    const { userId } = req.params;
    console.log(
        `GET /api/admin/users/${userId}/denied-products -> Admin ${req.userId} fetching permissions...`
    );
    const permissions = await getDeniedProducts(userId);
    res.json(permissions);
});

exports.updateUserProductPermissionsController = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { productIds } = req.body;
    const result = await adminService.updateUserProductPermissions(
        userId,
        productIds
    );
    res.json(result);
});

exports.getGlobalDeniedProductsController = catchAsync(async (req, res) => {
    console.log(`GET /api/admin/global-restrictions -> Admin ${req.userId} fetching global restrictions...`);
    const permissions = await getGlobalDeniedProducts();
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
    console.log('GET /api/admin/clients -> Admin consultando todos los clientes...');
    // No se filtra por vendedor_codigo, se obtienen todos.
    const clients = await userService.getAllClients();
    res.json(clients);
});
