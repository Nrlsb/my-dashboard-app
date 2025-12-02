const adminService = require('../services/adminService');
const userService = require('../services/userService');
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

exports.getAdmins = catchAsync(async (req, res) => {
    const admins = await adminService.getAdmins();
    res.json(admins);
});

exports.addAdmin = catchAsync(async (req, res) => {
    const { userId } = req.body;
    const result = await adminService.addAdmin(userId);
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
