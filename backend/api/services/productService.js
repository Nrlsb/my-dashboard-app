const productModel = require('../models/productModel');
const { getProductImages } = require('../models/productModel');
const { getExchangeRates } = require('../utils/exchangeRateService');
const { formatCurrency } = require('../utils/helpers');
const { pool, pool2 } = require('../db'); // Solo para verificar si el usuario es admin
const { getImageUrl } = require('./cloudinaryService');
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


/**
 * Helper function to merge DB2 images into products list
 */
const enrichProductsWithImages = async (products) => {
  if (!products || products.length === 0) return products;

  const productCodes = products.map(p => p.code).filter(c => c != null);
  const dbImages = await getProductImages(productCodes);

  const imageMap = new Map();
  dbImages.forEach(img => {
    imageMap.set(img.product_code, img.image_url);
  });

  return products.map(p => {
    const dbImage = imageMap.get(p.code);
    if (dbImage) {
      let thumb = dbImage;
      let full = dbImage;

      // Optimización para imágenes de Google Drive (lh3)
      if (dbImage.includes('lh3.googleusercontent.com')) {
        // Remover parámetros existentes si los hay para evitar conflictos
        const baseUrl = dbImage.split('=')[0];
        thumb = `${baseUrl}=w300`;
        full = `${baseUrl}=w800`;
      }

      return { ...p, imageUrl: full, thumbnailUrl: thumb };
    }
    return p;
  });
};

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
const fetchProducts = async ({
  page = 1,
  limit = 20,
  search = '',
  brand = '',
  userId = null,
  bypassCache = false,
  hasImage = '',
  isExport = false,
}) => {
  try {
    console.log('[DEBUG] productService.fetchProducts called with:', { page, limit, search, brand, userId, isExport });

    // 1. Obtener cotizaciones
    let exchangeRates;
    try {
      exchangeRates = await getExchangeRates();
    } catch (error) {
      console.error(
        '[WARNING] Failed to fetch exchange rates. Using default values.',
        error
      );
      exchangeRates = { venta_billete: 1, venta_divisa: 1 }; // Fallback
    }
    const ventaBillete = exchangeRates.venta_billete || 1; // Ensure not null
    const ventaDivisa = exchangeRates.venta_divisa || 1; // Ensure not null

    // 2. Determinar permisos
    let deniedGroups = [];
    if (userId) {
      // Verificar si el usuario es admin
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      const isUserAdmin =
        userResult.rows.length > 0 && userResult.rows[0].is_admin;

      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);
      }
    }

    // 3. Preparar filtros para el modelo
    let finalLimit = limit;
    if (isExport) {
      // En exportación, permitimos límites más altos o ignoramos paginación estricta si se requiere
      // Pero el frontend envía limit=9999, así que respetamos eso.
    }

    const offset = (page - 1) * limit;
    const brands = brand ? brand.split(',') : [];

    const filters = {
      limit: finalLimit,
      offset,
      search,
      brands,
      deniedGroups,
      bypassCache,
    };

    // Filtro por imagen (cross-database)
    // Check if user is restricted (not admin and not marketing)
    let isRestrictedUser = false;
    if (userId) {
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      const isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;

      if (!isUserAdmin) {
        const roleData = await userModel.getUserRoleFromDB2(userId);
        const userRole = roleData ? roleData.role : 'cliente';
        if (userRole !== 'marketing') {
          isRestrictedUser = true;
        }
      }
    } else {
      // No user logged in, treat as restricted
      isRestrictedUser = true;
    }

    if (isRestrictedUser) {
      // Enforce image filtering
      const imageCodes = await productModel.getAllProductImageCodes();
      if (imageCodes.length === 0) {
        return { products: [], totalProducts: 0 };
      }

      // If user requested NO images (hasImage='false'), but they are restricted, they get nothing.
      if (hasImage === 'false') {
        return { products: [], totalProducts: 0 };
      }

      // If user requested images (hasImage='true'), we use imageCodes.
      // If user didn't specify (hasImage=''), we ALSO use imageCodes to hide non-image products.
      filters.allowedIds = imageCodes;
    } else {
      // Standard logic for non-restricted users
      if (hasImage === 'true') {
        const imageCodes = await productModel.getAllProductImageCodes();
        if (imageCodes.length === 0) {
          return { products: [], totalProducts: 0 };
        }
        filters.allowedIds = imageCodes;
      } else if (hasImage === 'false') {
        const imageCodes = await productModel.getAllProductImageCodes();
        if (imageCodes.length > 0) {
          filters.excludedIds = imageCodes;
        }
      }
    }

    // 4. Obtener datos crudos del modelo
    const { products: rawProducts, totalProducts } =
      await productModel.findProducts(filters);

    // 5. Aplicar lógica de negocio (cálculo de precios, formato)
    // Obtener IDs de productos que cambiaron de precio recientemente

    // OPTIMIZACIÓN: Si es exportación, saltamos la verificación de cambios recientes
    let recentlyChangedSet = new Set();
    if (!isExport) {
      const productIds = rawProducts.map(p => p.id);
      // console.log('[DEBUG] Checking changes for product IDs:', productIds);
      const recentlyChangedIds = await productModel.getRecentlyChangedProducts(productIds);
      // console.log('[DEBUG] Recently changed IDs found:', recentlyChangedIds);
      recentlyChangedSet = new Set(recentlyChangedIds);
    }

    const products = rawProducts.map((prod) => {
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      // Ensure proper type conversion for comparison
      const moneda = Number(prod.moneda);

      // DEBUG LOG (Unconditional for now)
      console.log(`[DEBUG] Product ${prod.code}: Moneda=${prod.moneda} (Type: ${typeof prod.moneda}) -> Parsed=${moneda}. Rates: Billete=${ventaBillete}, Divisa=${ventaDivisa}`);

      if (moneda === 2) {
        // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (moneda === 3) {
        // Dólar Divisa
        finalPrice = originalPrice * ventaDivisa;
      }

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formatCurrency(finalPrice),
        brand: prod.brand,
        // En exportación a veces no se necesita imageUrl, pero es ligero
        imageUrl: getImageUrl(prod.code, 'products', 800),
        thumbnailUrl: getImageUrl(prod.code, 'products', 300),
        capacityDesc: prod.capacity_description,
        capacityValue: null,
        moneda: prod.moneda,
        cotizacion:
          prod.moneda === 2
            ? ventaBillete
            : prod.moneda === 3
              ? ventaDivisa
              : 1,
        originalPrice: originalPrice,
        product_group: prod.product_group,
        oferta: prod.oferta, // El estado de la oferta ya viene del modelo
        recentlyChanged: recentlyChangedSet.has(prod.id), // Nueva bandera
        stock_disponible: prod.stock_disponible,
        stock_de_seguridad: prod.stock_de_seguridad,
      };
    });

    // OPTIMIZACIÓN: Si es exportación, saltamos el enriquecimiento de imágenes DB2
    if (isExport) {
      return {
        products: products,
        totalProducts,
      };
    }

    const productsWithImages = await enrichProductsWithImages(products);

    return {
      products: productsWithImages,
      totalProducts,
    };
  } catch (error) {
    console.error('[DEBUG] Error in productService.fetchProducts:', error);
    throw error;
  }
};

const getAccessories = async (userId) => {
  try {
    // 1. Fetch from DB configuration
    const dbAccessories = await productModel.findCarouselAccessories();

    if (dbAccessories.length > 0) {
      // Filter by denied groups and products if user is restricted
      let filteredAccessories = dbAccessories;
      if (userId) {
        const userResult = await pool.query(
          'SELECT is_admin FROM users WHERE id = $1',
          [userId]
        );
        const isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;

        if (!isUserAdmin) {
          const deniedGroups = await productModel.getDeniedProductGroups(userId);
          filteredAccessories = dbAccessories.filter(acc => {
            const isGroupDenied = deniedGroups.includes(acc.product_group);
            return !isGroupDenied;
          });
        }
      }

      const mappedAccessories = filteredAccessories.map((prod) => ({
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: prod.price,
        formattedPrice: formatCurrency(prod.price),
        imageUrl: getImageUrl(prod.code, 'products', 800) || `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(prod.description.split(' ')[0])}`,
        thumbnailUrl: getImageUrl(prod.code, 'products', 300) || `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(prod.description.split(' ')[0])}`,
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

const getProductGroupsDetails = async (userId) => {
  try {
    // 1. Fetch from DB configuration
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
            id: group.id
          };
        }
      });

      // Filter denied groups for static groups
      if (userId) {
        const deniedGroups = await productModel.getDeniedProductGroups(userId);
        if (deniedGroups.length > 0) {
          finalGroups = finalGroups.filter(g => {
            if (g.type === 'static_group') {
              return !deniedGroups.includes(g.group_code);
            }
            return true; // Custom collections might need their own permission logic, but for now allow them
          });
        }
      }

      return finalGroups;
    }

    return [];
  } catch (error) {
    console.error('Error en getProductGroupsDetails (service):', error);
    throw error;
  }
};

const fetchProductDetails = async (productId, userId = null) => {
  try {
    let deniedGroups = [];
    if (userId) {
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      const isUserAdmin =
        userResult.rows.length > 0 && userResult.rows[0].is_admin;
      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);
      }
    }

    const prod = await productModel.findProductById(productId, deniedGroups);

    if (!prod) {
      return null;
    }

    // --- REAL TIME SYNC START ---
    try {
      const [liveProduct, livePrice] = await Promise.all([
        protheusService.getProductByCode(prod.code),
        protheusService.getPriceByCode(prod.code)
      ]);

      if (liveProduct && liveProduct.stock_disp !== undefined) {
        prod.stock_disponible = parseFloat(liveProduct.stock_disp || 0);
        prod.stock_de_seguridad = parseFloat(liveProduct.stock_prev || 0);
      }
      if (livePrice && livePrice.da1_prcven !== undefined) {
        prod.price = parseFloat(livePrice.da1_prcven || 0);
        prod.moneda = parseInt(livePrice.da1_moeda || 1);
      }
    } catch (err) {
      console.error(`[RealTime] Failed to fetch live data for ${prod.code}`, err);
    }
    // --- REAL TIME SYNC END ---

    // Currency Conversion
    let exchangeRates = { venta_billete: 1, venta_divisa: 1 };
    try { exchangeRates = await getExchangeRates(); } catch (e) { console.error('Error fetching rates', e); }
    const ventaBillete = exchangeRates.venta_billete || 1;
    const ventaDivisa = exchangeRates.venta_divisa || 1;

    let finalPrice = prod.price;
    if (prod.moneda === 2) finalPrice = prod.price * ventaBillete;
    if (prod.moneda === 3) finalPrice = prod.price * ventaDivisa;

    const productDetails = {
      id: prod.id,
      code: prod.code,
      name: prod.description,
      price: finalPrice,
      formattedPrice: formatCurrency(finalPrice),
      brand: prod.brand,
      brand: prod.brand,
      imageUrl: getImageUrl(prod.code, 'products', 800),
      thumbnailUrl: getImageUrl(prod.code, 'products', 300),
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

const fetchProductDetailsByCode = async (productCode, userId = null) => {
  try {
    let deniedGroups = [];
    if (userId) {
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      const isUserAdmin =
        userResult.rows.length > 0 && userResult.rows[0].is_admin;
      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);
      }
    }

    const prod = await productModel.findProductByCode(productCode, deniedGroups);

    if (!prod) {
      return null;
    }

    // --- REAL TIME SYNC START ---
    try {
      const [liveProduct, livePrice] = await Promise.all([
        protheusService.getProductByCode(prod.code),
        protheusService.getPriceByCode(prod.code)
      ]);

      if (liveProduct && liveProduct.stock_disp !== undefined) {
        prod.stock_disponible = parseFloat(liveProduct.stock_disp || 0);
        prod.stock_de_seguridad = parseFloat(liveProduct.stock_prev || 0);
      }
      if (livePrice && livePrice.da1_prcven !== undefined) {
        prod.price = parseFloat(livePrice.da1_prcven || 0);
        prod.moneda = parseInt(livePrice.da1_moeda || 1);
      }
    } catch (err) {
      console.error(`[RealTime] Failed to fetch live data for ${prod.code}`, err);
    }
    // --- REAL TIME SYNC END ---

    // Currency Conversion
    let exchangeRates = { venta_billete: 1, venta_divisa: 1 };
    try { exchangeRates = await getExchangeRates(); } catch (e) { console.error('Error fetching rates', e); }
    const ventaBillete = exchangeRates.venta_billete || 1;
    const ventaDivisa = exchangeRates.venta_divisa || 1;

    let finalPrice = prod.price;
    if (prod.moneda === 2) finalPrice = prod.price * ventaBillete;
    if (prod.moneda === 3) finalPrice = prod.price * ventaDivisa;

    const productDetails = {
      id: prod.id,
      code: prod.code,
      name: prod.description,
      price: finalPrice,
      formattedPrice: formatCurrency(finalPrice),
      brand: prod.brand,
      brand: prod.brand,
      imageUrl: getImageUrl(prod.code, 'products', 800),
      thumbnailUrl: getImageUrl(prod.code, 'products', 300),
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

const fetchProtheusBrands = async (userId = null) => {
  try {
    let deniedGroups = [];
    if (userId) {
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      const isUserAdmin =
        userResult.rows.length > 0 && userResult.rows[0].is_admin;
      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);
      }
    }

    const brands = await productModel.findUniqueBrands(deniedGroups);
    return brands;
  } catch (error) {
    console.error('Error in fetchProtheusBrands (service):', error);
    throw error;
  }
};

const fetchProtheusOffers = async (userId = null) => {
  try {
    let deniedGroups = [];
    if (userId) {
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      const isUserAdmin =
        userResult.rows.length > 0 && userResult.rows[0].is_admin;
      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);
      }
    }

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
      exchangeRates = { venta_billete: 1, venta_divisa: 1 }; // Fallback
    }
    const ventaBillete = exchangeRates.venta_billete || 1; // Ensure not null
    const ventaDivisa = exchangeRates.venta_divisa || 1; // Ensure not null

    const offers = rawOffers.map((prod) => {
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      if (prod.moneda === 2) {
        // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) {
        // Dólar Divisa
        finalPrice = originalPrice * ventaDivisa;
      }

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formatCurrency(finalPrice),
        brand: prod.brand,
        brand: prod.brand,
        imageUrl: getImageUrl(prod.code, 'products', 800),
        thumbnailUrl: getImageUrl(prod.code, 'products', 300),
        capacityDesc: prod.capacity_description,
        moneda: prod.moneda,
        cotizacion:
          prod.moneda === 2
            ? ventaBillete
            : prod.moneda === 3
              ? ventaDivisa
              : 1,
        originalPrice: originalPrice,
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
  userId = null
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
      exchangeRates = { venta_billete: 1, venta_divisa: 1 }; // Fallback
    }
    const ventaBillete = exchangeRates.venta_billete || 1;
    const ventaDivisa = exchangeRates.venta_divisa || 1;

    const offset = (page - 1) * limit;
    let deniedGroups = [];
    let allowedProductCodes = [];
    if (userId) {
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      const isUserAdmin =
        userResult.rows.length > 0 && userResult.rows[0].is_admin;
      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);

        // Check for marketing role
        const roleData = await userModel.getUserRoleFromDB2(userId);
        const userRole = roleData ? roleData.role : 'cliente';

        if (userRole !== 'marketing') {
          // Restrict to products with images
          allowedProductCodes = await productModel.getAllProductImageCodes();
          if (allowedProductCodes.length === 0) {
            return { products: [], totalProducts: 0, groupName: '' };
          }
        }
      }
    } else {
      // No user, restrict
      allowedProductCodes = await productModel.getAllProductImageCodes();
      if (allowedProductCodes.length === 0) {
        return { products: [], totalProducts: 0, groupName: '' };
      }
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
      [], // deniedProductCodes (empty here as we handle it via deniedGroups usually, but could be passed)
      allowedProductCodes // New parameter
    );

    const products = rawProducts.map((prod) => {
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      if (prod.moneda === 2) {
        // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) {
        // Dólar Divisa
        finalPrice = originalPrice * ventaDivisa;
      }

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formatCurrency(finalPrice),
        brand: prod.brand,
        brand: prod.brand,
        imageUrl: getImageUrl(prod.code, 'products', 800),
        thumbnailUrl: getImageUrl(prod.code, 'products', 300),
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

const getCustomCollectionProducts = async (collectionId, userId = null) => {
  const rawProducts = await productModel.findCustomCollectionProducts(collectionId);

  let filteredProducts = rawProducts;
  if (userId) {
    const userResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId]
    );
    const isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;

    if (!isUserAdmin) {
      const deniedGroups = await productModel.getDeniedProductGroups(userId);

      // Check for marketing role to decide on image restrictions
      const roleData = await userModel.getUserRoleFromDB2(userId);
      const userRole = roleData ? roleData.role : 'cliente';

      let allowedImageCodes = null;
      if (userRole !== 'marketing') {
        allowedImageCodes = await productModel.getAllProductImageCodes();
      }

      filteredProducts = rawProducts.filter(prod => {
        const isGroupDenied = deniedGroups.includes(prod.product_group);

        let isAllowedByImage = true;
        if (allowedImageCodes !== null) {
          isAllowedByImage = allowedImageCodes.includes(prod.code);
        }

        return !isGroupDenied && isAllowedByImage;
      });
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
      price: finalPrice
    };
  });
  return await enrichProductsWithImages(mappedProducts);
};

const updateProductAiDescription = async (productId, description) => {
  // Fetch product code first
  const productResult = await pool.query('SELECT code FROM products WHERE id = $1', [productId]);
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

const fetchNewReleases = async (userId = null) => {
  try {
    let deniedGroups = [];
    if (userId) {
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      const isUserAdmin =
        userResult.rows.length > 0 && userResult.rows[0].is_admin;
      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);
      }
    }

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
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      if (prod.moneda === 2) {
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) {
        finalPrice = originalPrice * ventaDivisa;
      }

      return {
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: finalPrice,
        formattedPrice: formatCurrency(finalPrice),
        brand: prod.brand,
        imageUrl: getImageUrl(prod.code),
        capacityDesc: prod.capacity_description,
        moneda: prod.moneda,
        cotizacion:
          prod.moneda === 2
            ? ventaBillete
            : prod.moneda === 3
              ? ventaDivisa
              : 1,
        originalPrice: originalPrice,
        product_group: prod.product_group,
        is_new_release: true,
        custom_title: prod.custom_title,
        custom_description: prod.custom_description,
        custom_image_url: prod.custom_image_url,
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
      'SELECT id, description, code, price FROM products WHERE id = $1',
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
    const productResult = await pool.query('SELECT code FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) throw new Error('Product not found');
    const productCode = productResult.rows[0].code;

    const updatedProduct = await productModel.updateProductNewReleaseDetails(productCode, details);
    return updatedProduct;
  } catch (error) {
    console.error('Error in updateProductNewReleaseDetails (service):', error);
    throw error;
  }
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
