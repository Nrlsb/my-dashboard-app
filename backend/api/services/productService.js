const productModel = require('../models/productModel');
const { enrichProductsWithImages } = require('../utils/productHelpers');

const { getExchangeRates } = require('../utils/exchangeRateService');
const { formatCurrency } = require('../utils/helpers');
const { pool, pool2 } = require('../db'); // Solo para verificar si el usuario es admin
const userModel = require('../models/userModel'); // Import userModel
const geminiService = require('./geminiService');
const protheusService = require('./protheusService');

// Global variable to track batch generation progress
let batchProgress = {
  total: 0,
  current: 0,
  status: 'idle', // idle, processing, completed, error
  startTime: null,
  endTime: null
};

const getBatchProgress = () => {
  return batchProgress;
};


// enrichProductsWithImages removed - imported from utils/productHelpers.js

/**
 * Servicio para manejar la lógica de negocio de productos.
 * @param {object} options - Opciones para obtener productos.
 * @param {number} [options.page=1] - Número de página.
 * @param {number} [options.limit=20] - Límite de productos por página.
 * @param {string} [options.search=''] - Término de búsqueda.
 * @param {string} [options.brand=''] - Marcas para filtrar (separadas por coma).
 * @param {number|null} [options.userId=null] - ID del usuario para verificar permisos.
 * @returns {Promise<{products: object[], totalProducts: number}>} - Productos procesados y el conteo total.
 */
const { getUserFilters, calculateFinalPrice } = require('../utils/productUtils');

const fetchProducts = async ({
  page = 1,
  limit = 20,
  search = '',
  brand = '',
  userId = null,
  user = null,
  bypassCache = false,
  hasImage = '',
  isExport = false,
  onlyNewReleasesCandidates = false,
  onlyModifiedPrices = false,
  dateFilterType = '',
  category = '',
}) => {
  try {
    // 1. Obtener cotizaciones
    let exchangeRates;
    try {
      exchangeRates = await getExchangeRates();
    } catch (error) {
      console.error(
        '[WARNING] Failed to fetch exchange rates. Using default values.',
        error
      );
      exchangeRates = { venta_billete: 1, venta_divisa: 1 };
    }

    // 2. Determinar permisos usando utilidad
    const effectiveUser = user || userId;
    const { deniedGroups, allowedProductCodes, isRestrictedUser } = await getUserFilters(effectiveUser);

    // 3. Preparar filtros para el modelo
    let finalLimit = limit;
    const offset = (page - 1) * limit;
    const brands = brand ? brand.split(',') : [];

    const filters = {
      limit: finalLimit,
      offset,
      search,
      brands,
      deniedGroups,
      bypassCache,
      onlyNewReleasesCandidates,
      onlyModifiedPrices,
      dateFilterType, // Pass to model
      categories: category ? category.split(',') : [],
    };

    // Filtro por imagen
    if (isRestrictedUser) {
      if (allowedProductCodes.length === 0 || hasImage === 'false') {
        return { products: [], totalProducts: 0 };
      }
      filters.allowedIds = allowedProductCodes;
    } else {
      if (hasImage === 'true') {
        if (allowedProductCodes.length === 0) {
          return { products: [], totalProducts: 0 };
        }
        filters.allowedIds = allowedProductCodes;
      } else if (hasImage === 'false' && allowedProductCodes.length > 0) {
        filters.excludedIds = allowedProductCodes;
      }
    }

    // 4. Obtener datos crudos del modelo
    const { products: rawProducts, totalProducts } = await productModel.findProducts(filters);

    // 5. Aplicar lógica de negocio
    // 5. Aplicar lógica de negocio
    // recentlyChanged logic removed


    const products = rawProducts.map((prod) => {
      const { finalPrice, cotizacionUsed, formattedPrice } = calculateFinalPrice(prod, exchangeRates);
      const discountedPrice = prod.discount_percentage != null
        ? finalPrice * (1 - prod.discount_percentage / 100)
        : null;

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formattedPrice,
        brand: prod.brand,
        imageUrl: null,
        thumbnailUrl: null,
        capacityDesc: prod.capacity_description,
        capacityValue: null,
        moneda: prod.moneda,
        cotizacion: cotizacionUsed,
        originalPrice: prod.price,
        product_group: prod.product_group,
        oferta: prod.oferta,
        is_on_offer: prod.is_on_offer,
        offer_start_date: prod.offer_start_date ?? null,
        offer_end_date: prod.offer_end_date ?? null,
        recentlyChanged: false, // Legacy support, logic removed
        stock_disponible: prod.stock_disponible,
        stock_de_seguridad: prod.stock_de_seguridad,
        indicator_description: prod.indicator_description,
        pack_quantity: prod.pack_quantity,
        isPriceModified: prod.is_price_modified,
        inclusion_date: prod.inclusion_date, // Map from DB
        modification_date: prod.modification_date, // Map from DB
        discount_percentage: prod.discount_percentage ?? null,
        offer_price: prod.offer_price ?? null,
        min_quantity: prod.min_quantity ?? 0,
        min_quantity_unit: prod.min_quantity_unit ?? 'unidades',
        min_quantity_cumulative: prod.min_quantity_cumulative ?? false,
        min_quantity_group_all: prod.min_quantity_group_all ?? false,
        total_group_products: prod.total_group_products ?? 1,
        discountedPrice,

      };
    });

    if (isExport) {
      return { products: products, totalProducts };
    }

    const productsWithImages = await enrichProductsWithImages(products);
    return { products: productsWithImages, totalProducts };
  } catch (error) {
    console.error('[DEBUG] Error in productService.fetchProducts:', error);
    throw error;
  }
};

const getAccessories = async (user) => {
  try {
    const dbAccessories = await productModel.findCarouselAccessories();

    if (dbAccessories.length > 0) {
      const { deniedGroups } = await getUserFilters(user);

      let filteredAccessories = dbAccessories;
      if (deniedGroups.length > 0) {
        filteredAccessories = dbAccessories.filter(acc => !deniedGroups.includes(acc.product_group));
      }

      const mappedAccessories = filteredAccessories.map((prod) => ({
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: prod.price,
        formattedPrice: formatCurrency(prod.price),
        imageUrl: null,
        thumbnailUrl: null,
        group_code: prod.product_group,
      }));

      return await enrichProductsWithImages(mappedAccessories);
    }
    return [];
  } catch (error) {
    console.error('Error en getAccessories (service):', error);
    throw error;
  }
};

const getDiscontinuedProducts = async (user) => {
  try {
    const dbDiscontinued = await productModel.findDiscontinuedProducts();

    if (dbDiscontinued.length > 0) {
      const { deniedGroups } = await getUserFilters(user);

      let filtered = dbDiscontinued;
      if (deniedGroups && deniedGroups.length > 0) {
        filtered = dbDiscontinued.filter(p => !deniedGroups.includes(p.product_group));
      }

      const exchangeRates = await getExchangeRates();

      const mapped = filtered.map((prod) => {
        const { finalPrice, formattedPrice } = calculateFinalPrice(prod, exchangeRates);
        return {
          id: prod.id,
          code: prod.code,
          name: prod.description,
          price: finalPrice,
          formattedPrice: formattedPrice,
          imageUrl: null,
          thumbnailUrl: null,
          group_code: prod.product_group,
          brand: prod.brand,
          stock_disponible: prod.stock_disponible,
          indicator_description: prod.indicator_description,
          product_group: prod.product_group // (NUEVO) Para consistencia con el frontend
        };
      });

      return await enrichProductsWithImages(mapped);
    }
    return [];
  } catch (error) {
    console.error('Error en getDiscontinuedProducts (service):', error);
    throw error;
  }
};

const getProductGroupsDetails = async (user) => {
  try {
    const dbGroups = await productModel.findCarouselGroups();

    if (dbGroups.length > 0) {
      const staticGroups = dbGroups.filter(g => g.type === 'static_group');
      const staticGroupCodes = staticGroups.map(g => g.reference_id);

      let groupDetailsMap = new Map();
      if (staticGroupCodes.length > 0) {
        const details = await productModel.findProductGroupsDetails(staticGroupCodes);
        groupDetailsMap = new Map(details.map(g => [g.product_group, g]));
      }

      let finalGroups = dbGroups.map(group => {
        if (group.type === 'static_group') {
          const detail = groupDetailsMap.get(group.reference_id);
          let name = group.name || (detail ? detail.brand : `Grupo ${group.reference_id}`);
          let imageUrl = group.image_url;

          if (!imageUrl) {
            const imageName = detail ? (detail.description || detail.brand) : group.reference_id;
            imageUrl = `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(imageName.split(' ')[0])}`;
          }

          return {
            group_code: group.reference_id,
            name: name,
            imageUrl: imageUrl,
            description: group.description,
            type: 'static_group',
            id: group.id
          };
        } else {
          return {
            group_code: null,
            collection_id: group.id,
            name: group.name,
            imageUrl: group.image_url || `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(group.name)}`,
            description: group.description,
            type: 'custom_collection',
            id: group.id,
            is_launch_group: group.is_launch_group
          };
        }
      });

      // Filter denied groups for static groups
      const { deniedGroups } = await getUserFilters(user);
      if (deniedGroups.length > 0) {
        finalGroups = finalGroups.filter(g => {
          if (g.type === 'static_group') {
            return !deniedGroups.includes(g.group_code);
          }
          return true;
        });
      }

      return finalGroups;
    }
    return [];
  } catch (error) {
    console.error('Error en getProductGroupsDetails (service):', error);
    throw error;
  }
};

const fetchProductDetails = async (productId, user = null) => {
  try {
    const { deniedGroups } = await getUserFilters(user);
    const prod = await productModel.findProductById(productId, deniedGroups);

    if (!prod) {
      return null;
    }

    // --- REAL TIME SYNC REMOVED (Relies on background scheduler) ---

    // Currency Conversion
    let exchangeRates = { venta_billete: 1, venta_divisa: 1 };
    try { exchangeRates = await getExchangeRates(); } catch (e) { console.error('Error fetching rates', e); }

    const { finalPrice, formattedPrice } = calculateFinalPrice(prod, exchangeRates);

    // Offer details
    let offerDetails = null;
    try {
      const onOfferData = await productModel.getOnOfferData();
      offerDetails = onOfferData.find(item => item.product_code === prod.code) || null;
    } catch (e) { console.error('Error fetching offer data for product detail', e); }

    const now = new Date();
    const startOk = !offerDetails?.offer_start_date || new Date(offerDetails.offer_start_date) <= now;
    const endOk = !offerDetails?.offer_end_date || new Date(offerDetails.offer_end_date) >= now;
    const isOfferActive = !!offerDetails && startOk && endOk;

    const discountedPrice = isOfferActive && offerDetails?.discount_percentage != null
      ? finalPrice * (1 - offerDetails.discount_percentage / 100)
      : null;

    const productDetails = {
      id: prod.id,
      code: prod.code,
      name: prod.description,
      price: finalPrice,
      formattedPrice: formattedPrice,
      brand: prod.brand,
      imageUrl: null,
      thumbnailUrl: null,
      capacityDesc: prod.capacity_description,
      capacityValue: null,
      additionalInfo: {},
      product_group: prod.product_group,
      ai_description: prod.ai_description,
      stock_disponible: prod.stock_disponible,
      stock_de_seguridad: prod.stock_de_seguridad,
      indicator_description: prod.indicator_description,
      pack_quantity: prod.pack_quantity,
      oferta: isOfferActive,
      discount_percentage: isOfferActive ? (offerDetails?.discount_percentage ?? null) : null,
      offer_price: isOfferActive ? (offerDetails?.offer_price ?? null) : null,
      min_quantity: isOfferActive ? (offerDetails?.min_quantity ?? 0) : 0,
      min_quantity_unit: isOfferActive ? (offerDetails?.min_quantity_unit ?? 'unidades') : 'unidades',
      min_quantity_cumulative: isOfferActive ? (offerDetails?.min_quantity_cumulative ?? false) : false,
      min_quantity_group_all: isOfferActive ? (offerDetails?.min_quantity_group_all ?? false) : false,
      total_group_products: isOfferActive ? (offerDetails?.total_group_products ?? 1) : 1,
      discountedPrice,
    };

    const [enrichedProduct] = await enrichProductsWithImages([productDetails]);
    return enrichedProduct;
  } catch (error) {
    console.error(
      `Error in fetchProductDetails (service) for ID ${productId}:`,
      error
    );
    throw error;
  }
};

const fetchProductDetailsByCode = async (productCode, user = null) => {
  try {
    const { deniedGroups } = await getUserFilters(user);
    const prod = await productModel.findProductByCode(productCode, deniedGroups);

    if (!prod) {
      return null;
    }

    // --- REAL TIME SYNC REMOVED (Relies on background scheduler) ---

    // Currency Conversion
    let exchangeRates = { venta_billete: 1, venta_divisa: 1 };
    try { exchangeRates = await getExchangeRates(); } catch (e) { console.error('Error fetching rates', e); }

    const { finalPrice, formattedPrice } = calculateFinalPrice(prod, exchangeRates);

    // Offer details
    let offerDetails = null;
    try {
      const onOfferData = await productModel.getOnOfferData();
      offerDetails = onOfferData.find(item => item.product_code === prod.code) || null;
    } catch (e) { console.error('Error fetching offer data for product detail by code', e); }

    const now = new Date();
    const startOk = !offerDetails?.offer_start_date || new Date(offerDetails.offer_start_date) <= now;
    const endOk = !offerDetails?.offer_end_date || new Date(offerDetails.offer_end_date) >= now;
    const isOfferActive = !!offerDetails && startOk && endOk;

    const discountedPrice = isOfferActive && offerDetails?.discount_percentage != null
      ? finalPrice * (1 - offerDetails.discount_percentage / 100)
      : null;

    const productDetails = {
      id: prod.id,
      code: prod.code,
      name: prod.description,
      price: finalPrice,
      formattedPrice: formattedPrice,
      brand: prod.brand,
      imageUrl: null,
      thumbnailUrl: null,
      capacityDesc: prod.capacity_description,
      capacityValue: null,
      additionalInfo: {},
      product_group: prod.product_group,
      ai_description: prod.ai_description,
      stock_disponible: prod.stock_disponible,
      stock_de_seguridad: prod.stock_de_seguridad,
      indicator_description: prod.indicator_description,
      pack_quantity: prod.pack_quantity,
      oferta: isOfferActive,
      discount_percentage: isOfferActive ? (offerDetails?.discount_percentage ?? null) : null,
      offer_price: isOfferActive ? (offerDetails?.offer_price ?? null) : null,
      min_quantity: isOfferActive ? (offerDetails?.min_quantity ?? 0) : 0,
      min_quantity_unit: isOfferActive ? (offerDetails?.min_quantity_unit ?? 'unidades') : 'unidades',
      min_quantity_cumulative: isOfferActive ? (offerDetails?.min_quantity_cumulative ?? false) : false,
      min_quantity_group_all: isOfferActive ? (offerDetails?.min_quantity_group_all ?? false) : false,
      total_group_products: isOfferActive ? (offerDetails?.total_group_products ?? 1) : 1,
      discountedPrice,
    };

    const [enrichedProduct] = await enrichProductsWithImages([productDetails]);
    return enrichedProduct;
  } catch (error) {
    console.error(
      `Error in fetchProductDetailsByCode (service) for Code ${productCode}:`,
      error
    );
    throw error;
  }
};

const fetchProtheusBrands = async (user = null) => {
  try {
    const { deniedGroups } = await getUserFilters(user);
    const brands = await productModel.findUniqueBrands(deniedGroups);
    return brands;
  } catch (error) {
    console.error('Error in fetchProtheusBrands (service):', error);
    throw error;
  }
};

const fetchProtheusCategories = async (user = null) => {
  try {
    const { deniedGroups } = await getUserFilters(user);
    const categories = await productModel.findUniqueCategories(deniedGroups);
    return categories;
  } catch (error) {
    console.error('Error in fetchProtheusCategories (service):', error);
    throw error;
  }
};

const fetchProtheusOffers = async (user = null) => {
  try {
    const { deniedGroups } = await getUserFilters(user);
    const offerData = await productModel.getOnOfferData();

    // Filter to only currently active offers (respects scheduled start/end dates)
    const now = new Date();
    const activeOfferData = offerData.filter(o => {
      const startOk = !o.offer_start_date || new Date(o.offer_start_date) <= now;
      const endOk = !o.offer_end_date || new Date(o.offer_end_date) >= now;
      return startOk && endOk;
    });

    const rawOffers = await productModel.findOffers(activeOfferData, deniedGroups);

    if (rawOffers.length === 0) {
      return [];
    }

    let exchangeRates;
    try {
      exchangeRates = await getExchangeRates();
    } catch (error) {
      console.error(
        '[WARNING] Failed to fetch exchange rates for offers. Using default values.',
        error
      );
      exchangeRates = { venta_billete: 1, venta_divisa: 1 };
    }

    const offers = rawOffers.map((prod) => {
      const { finalPrice, cotizacionUsed, formattedPrice } = calculateFinalPrice(prod, exchangeRates);

      const discountedPrice = prod.discount_percentage != null
        ? finalPrice * (1 - prod.discount_percentage / 100)
        : null;

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formattedPrice,
        brand: prod.brand,
        imageUrl: null,
        thumbnailUrl: null,
        capacityDesc: prod.capacity_description,
        moneda: prod.moneda,
        cotizacion: cotizacionUsed,
        originalPrice: prod.price,
        product_group: prod.product_group,
        oferta: true,
        custom_title: prod.custom_title,
        custom_description: prod.custom_description,
        custom_image_url: prod.custom_image_url,
        discount_percentage: prod.discount_percentage ?? null,
        offer_price: prod.offer_price ?? null,
        min_quantity: prod.min_quantity ?? 0,
        min_quantity_unit: prod.min_quantity_unit ?? 'unidades',
        min_quantity_cumulative: prod.min_quantity_cumulative ?? false,
        min_quantity_group_all: prod.min_quantity_group_all ?? false,
        total_group_products: prod.total_group_products ?? 1,
        discountedPrice: prod.offer_price ?? discountedPrice,

      };
    });

    return await enrichProductsWithImages(offers);
  } catch (error) {
    console.error('Error in fetchProtheusOffers (service):', error);
    throw error;
  }
};

const fetchProductsByGroup = async (
  groupCode,
  page = 1,
  limit = 20,
  user = null
) => {
  try {
    let exchangeRates;
    try {
      exchangeRates = await getExchangeRates();
    } catch (error) {
      console.error(
        '[WARNING] Failed to fetch exchange rates for group. Using default values.',
        error
      );
      exchangeRates = { venta_billete: 1, venta_divisa: 1 };
    }

    const offset = (page - 1) * limit;

    // Use helper to get permissions and restricted products
    const { deniedGroups, allowedProductCodes, isRestrictedUser, role } = await getUserFilters(user);

    let effectiveAllowedCodes = [];
    // Guests (unauthenticated) can browse all products in a category (prices are stripped in controller)
    // Only apply image-code restriction to logged-in restricted users (e.g. test_user)
    if (isRestrictedUser && role !== 'guest') {
      if (allowedProductCodes.length === 0) {
        return { products: [], totalProducts: 0, groupName: '' };
      }
      effectiveAllowedCodes = allowedProductCodes;
    }

    const {
      products: rawProducts,
      totalProducts,
      groupName,
    } = await productModel.findProductsByGroup(
      groupCode,
      limit,
      offset,
      deniedGroups,
      effectiveAllowedCodes
    );

    const products = rawProducts.map((prod) => {
      const { finalPrice, formattedPrice } = calculateFinalPrice(prod, exchangeRates);

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formattedPrice,
        brand: prod.brand,
        imageUrl: null,
        thumbnailUrl: null,
        capacityDesc: prod.capacity_description,
        oferta: prod.oferta,
        is_on_offer: prod.is_on_offer,
        discount_percentage: prod.discount_percentage,
        offer_price: prod.offer_price,
        min_quantity: prod.min_quantity,
        min_quantity_unit: prod.min_quantity_unit,
        min_quantity_cumulative: prod.min_quantity_cumulative,
        min_quantity_group_all: prod.min_quantity_group_all,
        total_group_products: prod.total_group_products,
        product_group: prod.product_group, // (NUEVO)
      };
    });

    const productsWithImages = await enrichProductsWithImages(products);

    return {
      products: productsWithImages,
      totalProducts,
      groupName,
    };
  } catch (error) {
    console.error('[DEBUG] Error in fetchProductsByGroup (service):', error);
    throw error;
  }
};

/**
 * (Admin) Cambia el estado de 'oferta' de un producto.
 */
const toggleProductOfferStatus = async (productId) => {
  try {
    return await productModel.toggleProductOfferStatus(productId);
  } catch (error) {
    console.error(
      `Error en toggleProductOfferStatus para producto ${productId}:`,
      error
    );
    throw error;
  }
};

/**
 * (Admin) Obtiene la lista de grupos de productos únicos
 */
const getProductGroupsForAdmin = async () => {
  try {
    const query = `
      SELECT DISTINCT product_group, brand
      FROM products
      WHERE product_group IS NOT NULL AND product_group != '' AND brand IS NOT NULL AND brand != ''
      ORDER BY product_group ASC;
    `;
    const result = await pool.query(query);
    // Return an array of objects { product_group, brand }
    return result.rows;
  } catch (error) {
    console.error('Error in getProductGroupsForAdmin:', error);
    throw error;
  }
};

/**
 * (Admin) Actualiza los detalles personalizados de una oferta.
 */
const updateProductOfferDetails = async (productId, details) => {
  try {
    const updatedProduct = await productModel.updateProductOfferDetails(productId, details);

    return updatedProduct;
  } catch (error) {
    console.error('Error in updateProductOfferDetails (service):', error);
    throw error;
  }
};

// Admin Services
const addCarouselAccessory = async (productId) => {
  const result = await productModel.addCarouselAccessory(productId);
  return result;
};

const removeCarouselAccessory = async (productId) => {
  const result = await productModel.removeCarouselAccessory(productId);
  return result;
};

const getCarouselGroups = async () => {
  return productModel.findCarouselGroups();
};

const createCarouselGroup = async (data) => {
  const result = await productModel.createCarouselGroup(data);
  return result;
};

const updateCarouselGroup = async (id, data) => {
  const result = await productModel.updateCarouselGroup(id, data);
  return result;
};

const deleteCarouselGroup = async (id) => {
  const result = await productModel.deleteCarouselGroup(id);
  return result;
};

const getCustomCollectionProducts = async (collectionId, user = null) => {
  // 1. Get group details to check type
  const group = await productModel.findGroupById(collectionId);

  let rawProducts = [];
  // [MODIFIED] Treat launch groups as normal custom collections to allow manual add/remove
  // if (group && group.is_launch_group) { ... } logic removed.
  rawProducts = await productModel.findCustomCollectionProducts(collectionId);

  let filteredProducts = rawProducts;
  if (user) {
    const { deniedGroups, allowedProductCodes, isRestrictedUser } = await getUserFilters(user);
    filteredProducts = rawProducts.filter(prod => !deniedGroups.includes(prod.product_group));

    if (isRestrictedUser) {
      filteredProducts = filteredProducts.filter(prod => allowedProductCodes.includes(prod.code));
    }
  } else {
    const globalDeniedCodes = await productModel.getGlobalDeniedProducts();
    const allowedImageCodes = await productModel.getAllProductImageCodes();

    filteredProducts = rawProducts.filter(prod =>
      !globalDeniedCodes.includes(prod.code) && allowedImageCodes.includes(prod.code)
    );
  }

  let exchangeRates;
  try {
    exchangeRates = await getExchangeRates();
  } catch (error) {
    exchangeRates = { venta_billete: 1, venta_divisa: 1 };
  }
  const ventaBillete = exchangeRates.venta_billete || 1;
  const ventaDivisa = exchangeRates.venta_divisa || 1;

  const mappedProducts = filteredProducts.map((prod) => {
    const { finalPrice, formattedPrice } = calculateFinalPrice(prod, exchangeRates);

    // [DEBUG] Log conversion for verification
    if (prod.moneda === 2 || prod.moneda === 3) {
      console.log(`[DEBUG] Product ${prod.code} (Moneda ${prod.moneda}): Original ${prod.price} -> Final ${finalPrice} (Rate: ${exchangeRates.venta_billete}/${exchangeRates.venta_divisa})`);
    }

    return {
      ...prod,
      name: prod.description,
      price: finalPrice,
      formattedPrice: formattedPrice
    };
  });
  return await enrichProductsWithImages(mappedProducts);
};

const updateProductAiDescription = async (productId, description) => {
  // Fetch product code first
  const productResult = await pool.query('SELECT b1_cod AS code FROM products WHERE id = $1', [productId]);
  if (productResult.rows.length === 0) {
    throw new Error('Product not found');
  }
  const productCode = productResult.rows[0].code;

  const result = await productModel.updateProductAiDescription(productCode, description);
  return result;
};

const batchGenerateAiDescriptions = async () => {
  try {
    const productsToProcess = await productModel.findProductsWithImagesNoDescription(50);

    // Reset progress
    batchProgress = {
      total: productsToProcess.length,
      current: 0,
      status: 'processing',
      startTime: new Date(),
      endTime: null
    };

    const results = {
      total: productsToProcess.length,
      success: 0,
      failed: 0,
      details: []
    };

    // Process in parallel with a limit or sequentially to avoid rate limits?
    // Gemini Flash is fast, but let's do chunks or sequential to be safe.
    // Sequential for now to monitor progress easier if we were streaming, but here we just return result.
    // Let's do Promise.all with a small concurrency or just sequential for simplicity and safety.

    for (const product of productsToProcess) {
      try {
        const description = await geminiService.generateProductDescription(product.name, {
          brand: product.brand,
          formattedPrice: formatCurrency(product.price)
        }, product.imageUrl);

        await productModel.updateProductAiDescription(product.code, description);
        results.success++;
        results.details.push({ id: product.id, code: product.code, status: 'success' });
      } catch (err) {
        console.error(`Error generating description for product ${product.code}:`, err);
        results.failed++;
        results.details.push({ id: product.id, code: product.code, status: 'failed', error: err.message });
      } finally {
        // Update progress
        batchProgress.current++;
      }
    }

    batchProgress.status = 'completed';
    batchProgress.endTime = new Date();

    return results;
  } catch (error) {
    console.error('Error in batchGenerateAiDescriptions:', error);
    throw error;
  }
};

const addCustomGroupItem = async (groupId, productId) => {
  const result = await productModel.addCustomGroupItem(groupId, productId);
  return result;
};

const removeCustomGroupItem = async (groupId, productId) => {
  const result = await productModel.removeCustomGroupItem(groupId, productId);
  return result;
};

const fetchNewReleases = async (user = null) => {
  try {
    const { deniedGroups } = await getUserFilters(user);

    const newReleasesData = await productModel.getNewReleasesData();
    const rawOffers = await productModel.findOffers(newReleasesData, deniedGroups);

    if (rawOffers.length === 0) {
      return [];
    }

    let exchangeRates;
    try {
      exchangeRates = await getExchangeRates();
    } catch (error) {
      exchangeRates = { venta_billete: 1, venta_divisa: 1 };
    }
    const ventaBillete = exchangeRates.venta_billete || 1;
    const ventaDivisa = exchangeRates.venta_divisa || 1;

    const releases = rawOffers.map((prod) => {
      const { finalPrice, cotizacionUsed, formattedPrice } = calculateFinalPrice(prod, exchangeRates);

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formattedPrice,
        brand: prod.brand,
        imageUrl: null,
        capacityDesc: prod.capacity_description,
        moneda: prod.moneda,
        cotizacion: cotizacionUsed,
        originalPrice: prod.price,
        product_group: prod.product_group,
        is_new_release: true,
        custom_title: prod.custom_title,
        custom_description: prod.custom_description,
        custom_image_url: prod.custom_image_url,
        created_at: prod.created_at,
        updated_at: prod.updated_at,
      };
    });

    return await enrichProductsWithImages(releases);
  } catch (error) {
    console.error('Error in fetchNewReleases (service):', error);
    throw error;
  }
};

const toggleProductNewRelease = async (productId) => {
  try {
    const productResult = await pool.query(
      'SELECT id, b1_desc AS description, b1_cod AS code, da1_prcven AS price FROM products WHERE id = $1',
      [productId]
    );
    if (productResult.rows.length === 0) {
      throw new Error('Producto no encontrado en la base de datos principal.');
    }
    const productDetails = productResult.rows[0];

    const existingEntry = await pool2.query(
      'SELECT is_new_release FROM product_new_release_status WHERE product_code = $1',
      [productDetails.code]
    );

    let newStatus = true;
    if (existingEntry.rows.length > 0) {
      newStatus = !existingEntry.rows[0].is_new_release;
    }

    await productModel.toggleProductNewReleaseStatus(productId, productDetails.code, newStatus);

    return {
      id: productDetails.id,
      is_new_release: newStatus,
    };
  } catch (error) {
    console.error('Error in toggleProductNewRelease:', error);
    throw error;
  }
};

const updateProductNewReleaseDetails = async (productId, details) => {
  try {
    const productResult = await pool.query('SELECT b1_cod AS code FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) throw new Error('Product not found');
    const productCode = productResult.rows[0].code;

    const updatedProduct = await productModel.updateProductNewReleaseDetails(productCode, details);
    return updatedProduct;
  } catch (error) {
    console.error('Error in updateProductNewReleaseDetails (service):', error);
    throw error;
  }
};



/**
 * (Admin) Desactiva múltiples ofertas por lote.
 */
const batchDeactivateOffers = async (productIds) => {
  try {
    return await productModel.batchDeactivateOffers(productIds);
  } catch (error) {
    console.error('Error in batchDeactivateOffers (service):', error);
    throw error;
  }
};

module.exports = {
  fetchProducts,
  getAccessories,
  getProductGroupsDetails,
  fetchProductDetails,
  fetchProductDetailsByCode,
  fetchProtheusBrands,
  fetchProtheusCategories,
  fetchProtheusOffers,
  fetchProductsByGroup,
  toggleProductOfferStatus,
  updateProductOfferDetails,
  batchDeactivateOffers, // [NEW]
  getProductGroupsForAdmin,
  addCarouselAccessory,
  removeCarouselAccessory,
  getCarouselGroups,
  createCarouselGroup,
  updateCarouselGroup,
  deleteCarouselGroup,
  getCustomCollectionProducts,
  addCustomGroupItem,
  removeCustomGroupItem,
  updateProductAiDescription,
  batchGenerateAiDescriptions,
  getBatchProgress,
  fetchNewReleases,
  toggleProductNewRelease,
  updateProductNewReleaseDetails,
  getDiscontinuedProducts,
};
