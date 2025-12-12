const roleService = require('../services/roleService');
const catchAsync = require('../utils/catchAsync');

exports.getRoles = catchAsync(async (req, res) => {
    const roles = await roleService.getRoles();
    res.json(roles);
});

exports.createRole = catchAsync(async (req, res) => {
    const { name, permissions } = req.body;
    const role = await roleService.createRole(name, permissions);
    res.status(201).json(role);
});

exports.updateRole = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, permissions } = req.body;
    const role = await roleService.updateRole(id, name, permissions);
    res.json(role);
});

exports.deleteRole = catchAsync(async (req, res) => {
    const { id } = req.params;
    const role = await roleService.deleteRole(id);
    res.json(role);
});
