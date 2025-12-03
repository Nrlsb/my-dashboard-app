const productService = require('../services/productService');
const catchAsync = require('../utils/catchAsync');

exports.getProductsController = catchAsync(async (req, res) => {
    console.log('GET /api/products -> Consultando productos en DB (paginado)...');
    const {
        page = 1,
        limit = 20,
        search = '',
        brand = '',
        moneda = '0',
    } = req.query;
    const data = await productService.fetchProducts({
        page,
        limit,
        search,
        brand,
        moneda,
        userId: req.userId,
    });
    res.json(data);
});

exports.getProductsByGroupController = catchAsync(async (req, res) => {
    console.log(
        `GET /api/products/group/${req.params.groupCode} -> Consultando productos por grupo...`
    );
    const { groupCode } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const data = await productService.fetchProductsByGroup(
        groupCode,
        page,
        limit,
        req.userId
    );
    res.json(data);
});

exports.getBrandsController = catchAsync(async (req, res) => {
    console.log('GET /api/brands -> Consultando lista de marcas...');
    const brands = await productService.fetchProtheusBrands(req.userId);
    res.json(brands);
});

exports.getOffersController = catchAsync(async (req, res) => {
    console.log('GET /api/offers -> Consultando ofertas en DB...');
    const offers = await productService.fetchProtheusOffers(req.userId);
    res.json(offers);
});

exports.getProductsByIdController = catchAsync(async (req, res) => {
    const productId = req.params.id;
    console.log(
        `GET /api/products/${productId} -> Consultando producto individual...`
    );
    const product = await productService.fetchProductDetails(
        productId,
        req.userId
    );
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Producto no encontrado.' });
    }
});

exports.getProductsOrdersController = catchAsync(async (req, res) => {
    console.log('GET /api/products/orders -> Endpoint para /api/products/orders alcanzado.');
    res.status(404).json({ message: 'Endpoint /api/products/orders no implementado o no válido para productos.' });
});

exports.getAccessories = catchAsync(async (req, res) => {
    const userId = req.user ? req.user.id : null;
    const accessories = await productService.getAccessories(userId);
    res.json(accessories);
});

exports.getProductGroupsDetails = catchAsync(async (req, res) => {
    const userId = req.user ? req.user.id : null;
    const groupDetails = await productService.getProductGroupsDetails(userId);
    res.json(groupDetails);
});

exports.toggleProductOfferStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await productService.toggleProductOfferStatus(id);
    res.json(result);
});

exports.updateProductOfferDetails = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { custom_title, custom_description, custom_image_url } = req.body;
    const result = await productService.updateProductOfferDetails(id, {
        custom_title,
        custom_description,
        custom_image_url,
    });
    res.json(result);
});
