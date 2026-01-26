const productService = require('../services/productService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger'); // (NUEVO) Importar logger

exports.getProductsController = catchAsync(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search = '',
        brand = '',
        moneda = '0',
        bypassCache = 'false',
        hasImage = '',
        isExport = 'false',
        onlyNewReleasesCandidates = 'false',
        onlyModifiedPrices = 'false',
        dateFilterType = '', // 'included' | 'modified'
    } = req.query;
    if (bypassCache === 'true' || isExport === 'true') {
        logger.debug(`getProductsController - bypassCache: ${bypassCache}, isExport: ${isExport}`);
    }

    const shouldBypass = String(bypassCache).toLowerCase() === 'true';
    const shouldExport = String(isExport).toLowerCase() === 'true';

    const data = await productService.fetchProducts({
        page,
        limit,
        search,
        brand,
        moneda,
        user: req.user,
        bypassCache: shouldBypass,
        hasImage,
        isExport: shouldExport,
        onlyNewReleasesCandidates: String(onlyNewReleasesCandidates).toLowerCase() === 'true',
        onlyModifiedPrices: String(onlyModifiedPrices).toLowerCase() === 'true',
        dateFilterType,
    });
    res.set('Cache-Control', 'no-store');
    res.json(data);
});

exports.getProductsByGroupController = catchAsync(async (req, res) => {
    const { groupCode } = req.params;
    logger.info(
        `GET /api/products/group/${groupCode} -> Consultando productos por grupo...`
    );
    const { page = 1, limit = 20 } = req.query;
    const data = await productService.fetchProductsByGroup(
        groupCode,
        page,
        limit,
        req.user
    );
    res.json(data);
});

exports.getBrandsController = catchAsync(async (req, res) => {
    const brands = await productService.fetchProtheusBrands(req.user);
    res.json(brands);
});

exports.getOffersController = catchAsync(async (req, res) => {
    logger.info('GET /api/offers -> Consultando ofertas en DB...');
    const offers = await productService.fetchProtheusOffers(req.user);
    res.set('Cache-Control', 'no-store');
    res.json(offers);
});

exports.getProductsByIdController = catchAsync(async (req, res) => {
    const productId = req.params.id;
    logger.debug(
        `GET /api/products/${productId} -> Consultando producto individual...`
    );
    const product = await productService.fetchProductDetails(
        productId,
        req.user
    );
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Producto no encontrado.' });
    }
});

exports.getProductsByCodeController = catchAsync(async (req, res) => {
    const productCode = req.params.code;
    logger.debug(
        `GET /api/products/code/${productCode} -> Consultando producto por código...`
    );
    const product = await productService.fetchProductDetailsByCode(
        productCode,
        req.user
    );
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Producto no encontrado.' });
    }
});

exports.getProductsOrdersController = catchAsync(async (req, res) => {
    logger.warn('GET /api/products/orders -> Endpoint para /api/products/orders alcanzado. No implementado.');
    res.status(404).json({ message: 'Endpoint /api/products/orders no implementado o no válido para productos.' });
});

exports.getAccessories = catchAsync(async (req, res) => {
    const user = req.user;
    const accessories = await productService.getAccessories(user);
    res.json(accessories);
});

exports.getProductGroupsDetails = catchAsync(async (req, res) => {
    const user = req.user;
    const groupDetails = await productService.getProductGroupsDetails(user);
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

exports.getCustomCollectionProducts = catchAsync(async (req, res) => {
    const { collectionId } = req.params;
    logger.info(`GET /api/products/collection/${collectionId} -> Fetching custom collection products...`);

    try {
        const products = await productService.getCustomCollectionProducts(collectionId, req.user);
        logger.info(`Collection ${collectionId} returned ${products.length} products`);
        res.json(products);
    } catch (error) {
        logger.error(`Error fetching collection ${collectionId}: ${error.message}`);
        throw error;
    }
});

exports.generateAiDescription = catchAsync(async (req, res) => {
    const { id } = req.params;
    const product = await productService.fetchProductDetails(id, req.user);
    if (!product) {
        return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const geminiService = require('../services/geminiService');
    const description = await geminiService.generateProductDescription(product.name, {
        brand: product.brand,
        formattedPrice: product.formattedPrice
    });

    res.json({ description });
});

exports.saveAiDescription = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { description } = req.body;

    const updatedProduct = await productService.updateProductAiDescription(id, description);
    res.json(updatedProduct);
});
exports.batchGenerateAiDescriptions = catchAsync(async (req, res) => {
    const results = await productService.batchGenerateAiDescriptions();
    res.json(results);
});

exports.getBatchGenerationProgress = catchAsync(async (req, res) => {
    const progress = productService.getBatchProgress();
    res.json(progress);
});

exports.getNewReleasesController = catchAsync(async (req, res) => {
    const releases = await productService.fetchNewReleases(req.user);
    res.set('Cache-Control', 'no-store');
    res.json(releases);
});

exports.toggleProductNewRelease = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await productService.toggleProductNewRelease(id);
    res.json(result);
});

exports.updateProductNewReleaseDetails = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { custom_title, custom_description, custom_image_url } = req.body;
    const result = await productService.updateProductNewReleaseDetails(id, {
        custom_title,
        custom_description,
        custom_image_url,
    });
    res.json(result);
});

exports.triggerSyncPrices = catchAsync(async (req, res) => {
    logger.info('POST /api/products/sync-prices -> Triggering manual price sync...');
    const syncService = require('../services/syncService');

    const start = Date.now();
    await syncService.syncPrices();
    const end = Date.now();

    res.json({ message: 'Sync completed', duration: ((end - start) / 1000) + 's' });
});
