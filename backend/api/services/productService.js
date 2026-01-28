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
        recentlyChanged: false, // Legacy support, logic removed
        stock_disponible: prod.stock_disponible,
        stock_de_seguridad: prod.stock_de_seguridad,
        indicator_description: prod.indicator_description,
        pack_quantity: prod.pack_quantity,
        isPriceModified: prod.is_price_modified,
        inclusion_date: prod.inclusion_date, // Map from DB
        modification_date: prod.modification_date, // Map from DB
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
            type: 'static_group',
            id: group.id
          };
        } else {
          return {
            group_code: null,
            collection_id: group.id,
            name: group.name,
            imageUrl: group.image_url || `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(group.name)}`,
            type: 'custom_collection',
            id: group.id,
            is_launch_group: group.is_launch_group // [FIX] Include flag
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

const fetchProtheusOffers = async (user = null) => {
  try {
    const { deniedGroups } = await getUserFilters(user);
    const offerData = await productModel.getOnOfferData();
    const rawOffers = await productModel.findOffers(offerData, deniedGroups);

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
    const { deniedGroups, allowedProductCodes, isRestrictedUser } = await getUserFilters(user);

    let effectiveAllowedCodes = [];
    if (isRestrictedUser) {
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
      [],
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
    // 1. Verificar si el producto existe en DB2
    const productResult = await pool2.query(
      'SELECT id, b1_desc as description, b1_cod as code, da1_prcven as price FROM products WHERE id = $1',
      [productId]
    );
    if (productResult.rows.length === 0) {
      throw new Error('Producto no encontrado en la base de datos principal.');
    }
    const productDetails = productResult.rows[0];

    // 2. Intentar obtener el estado de oferta del producto desde DB2
    const existingOffer = await pool2.query(
      'SELECT is_on_offer FROM product_offer_status WHERE product_id = $1',
      [productId]
    );

    let newOfferStatus;
    if (existingOffer.rows.length > 0) {
      // Si existe, alternar el estado
      newOfferStatus = !existingOffer.rows[0].is_on_offer;
      await pool2.query(
        'UPDATE product_offer_status SET is_on_offer = $1, product_code = $2, updated_at = CURRENT_TIMESTAMP WHERE product_id = $3',
        [newOfferStatus, productDetails.code, productId]
      );
    } else {
      // Si no existe, insertar un nuevo registro con is_on_offer = true
      newOfferStatus = true;
      await pool2.query(
        'INSERT INTO product_offer_status (product_id, product_code, is_on_offer) VALUES ($1, $2, $3)',
        [productId, productDetails.code, newOfferStatus]
      );
    }

    console.log(
      `Estado de oferta para producto ${productId} cambiado a ${newOfferStatus} en DB2.`
    );

    // Devolver la información del producto combinada con el nuevo estado de oferta
    return {
      id: productDetails.id,
      description: productDetails.description,
      code: productDetails.code,
      price: productDetails.price,
      oferta: newOfferStatus, // Usamos 'oferta' para compatibilidad con el frontend
    };
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

const getCustomCollectionProducts_Duplicate = async (collectionId, user = null) => {
  // 1. Get group details to check type
  const group = await productModel.findGroupById(collectionId);

  let rawProducts = [];
  if (group && group.is_launch_group) {
    console.log(`[DEBUG] Collection ${collectionId} is a Launch Group. Fetching new releases...`);
    // Reuse fetchNewReleases logic but we need raw products here to filter later or reuse filtering logic.
    // fetchNewReleases returns enriched products directly.
    // Ideally we should get raw data first.
    // Let's call a helper or getNewReleasesData directly.
    const newReleasesData = await productModel.getNewReleasesData();
    // findOffers is used in fetchNewReleases to get full details matching newReleasesData codes
    // But findOffers already filters by denied groups if passed.
    // Let's rely on fetchNewReleases implementation which handles everything including enrichment.
    // BUT getCustomCollectionProducts usually expects to do filtering itself?
    // Let's look at how getCustomCollectionProducts works: it gets raw, filters, then enriches.

    // We can call fetchNewReleases(user) and return immediately because it handles permissions.
    return await fetchNewReleases(user);
  } else {
    rawProducts = await productModel.findCustomCollectionProducts(collectionId);
  }

  let filteredProducts = rawProducts;
  if (user) {
    // Check permissions using helper (handles admins and test users internally now)
    const { deniedGroups, allowedProductCodes, isRestrictedUser } = await getUserFilters(user);

    // If getUserFilters returned "no restrictions" (empty denied, no restricted flag) but user MIGHT be allowed, we need to apply logic.
    // Actually optimize: REUSE getUserFilters logic rather than reimplementing.

    // However, getUserFilters calls DB for admin check if only ID passed.
    // Here we might have duplicates. 
    // Let's rely on getUserFilters.

    // Legacy logic here was checking is_admin manually.
    // getUserFilters handles is_admin.

    // Check for marketing role (legacy logic preserved?)
    // getUserFilters doesn't check marketing role explicitly for images.
    // Let's keep marketing logic but use getUserFilters for groups.

    // Re-implementation using getUserFilters for consistency:

    // 1. Filter by denied groups
    filteredProducts = rawProducts.filter(prod => !deniedGroups.includes(prod.product_group));

    // 2. Filter by images/marketing
    // Logic from legacy:
    // Check for marketing role to decide on image restrictions
    // If not marketing, filter by allowedImageCodes.
    // This is "isRestrictedUser" logic mostly.

    // Since we don't return "userRole" from getUserFilters, we might need to fetch it or rely on isRestrictedUser.
    // isRestrictedUser in getUserFilters is true if NOT admin and NOT marketing.

    if (isRestrictedUser) {
      filteredProducts = filteredProducts.filter(prod => allowedProductCodes.includes(prod.code));
    }
  } else {
    // If no user, apply global restrictions AND image restriction
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
    let originalPrice = prod.price;
    let finalPrice = prod.price;

    if (prod.moneda === 2) {
      finalPrice = originalPrice * ventaBillete;
    } else if (prod.moneda === 3) {
      finalPrice = originalPrice * ventaDivisa;
    }

    return {
      ...prod,
      name: prod.description,
      price: finalPrice
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
    let originalPrice = prod.price;
    let finalPrice = prod.price;

    if (prod.moneda === 2) {
      finalPrice = originalPrice * ventaBillete;
    } else if (prod.moneda === 3) {
      finalPrice = originalPrice * ventaDivisa;
    }

    return {
      ...prod,
      name: prod.description,
      price: finalPrice
    };
  });
  return await enrichProductsWithImages(mappedProducts);
};

module.exports = {
  fetchProducts,
  getAccessories,
  getProductGroupsDetails,
  getProductGroupsDetails,
  fetchProductDetails,
  fetchProductDetailsByCode,
  fetchProtheusBrands,
  fetchProtheusOffers,
  fetchProductsByGroup,
  toggleProductOfferStatus,
  updateProductOfferDetails,
  getProductGroupsForAdmin,
  // New exports
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
  updateProductAiDescription,
  batchGenerateAiDescriptions,
  getBatchProgress,
  // New Release Exports
  fetchNewReleases,
  toggleProductNewRelease,
  updateProductNewReleaseDetails,
};
