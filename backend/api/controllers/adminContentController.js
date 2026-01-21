const productService = require('../services/productService');
const catchAsync = require('../utils/catchAsync');

exports.getCarouselGroups = catchAsync(async (req, res) => {
    const groups = await productService.getCarouselGroups();
    res.json(groups);
});

exports.createCarouselGroup = catchAsync(async (req, res) => {
    const group = await productService.createCarouselGroup(req.body);
    res.json(group);
});

exports.updateCarouselGroup = catchAsync(async (req, res) => {
    const group = await productService.updateCarouselGroup(req.params.id, req.body);
    res.json(group);
});

exports.deleteCarouselGroup = catchAsync(async (req, res) => {
    await productService.deleteCarouselGroup(req.params.id);
    res.json({ success: true });
});

exports.addAccessory = catchAsync(async (req, res) => {
    const { productId } = req.body;
    await productService.addCarouselAccessory(productId);
    res.json({ success: true });
});

exports.removeAccessory = catchAsync(async (req, res) => {
    await productService.removeCarouselAccessory(req.params.productId);
    res.json({ success: true });
});

exports.getCustomCollectionProducts = catchAsync(async (req, res) => {
    const products = await productService.getCustomCollectionProducts(req.params.collectionId);
    res.json(products);
});

exports.addCustomGroupItem = catchAsync(async (req, res) => {
    const { productId } = req.body;
    await productService.addCustomGroupItem(req.params.groupId, productId);
    res.json({ success: true });
});

exports.removeCustomGroupItem = catchAsync(async (req, res) => {
    await productService.removeCustomGroupItem(req.params.groupId, req.params.productId);
    res.json({ success: true });
});

exports.getGlobalSetting = catchAsync(async (req, res) => {
    const adminService = require('../services/adminService'); // Lazy require to avoid circular dependency
    const value = await adminService.getGlobalSetting(req.params.key);
    res.json({ value });
});

exports.updateGlobalSetting = catchAsync(async (req, res) => {
    const adminService = require('../services/adminService');
    const { key, value } = req.body;
    const result = await adminService.setGlobalSetting(key, value);
    res.json(result);
});
