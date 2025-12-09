const productModel = require('../models/productModel');
const { getExchangeRates } = require('../utils/exchangeRateService');
const { formatCurrency } = require('../utils/helpers');
const { pool, pool2 } = require('../db'); // Solo para verificar si el usuario es admin
const { getImageUrl } = require('./cloudinaryService');

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
    const offset = (page - 1) * limit;
    const brands = brand ? brand.split(',') : [];

    const filters = {
      limit,
      offset,
      search,
      brands,
      deniedGroups,
      bypassCache,
    };

    // 4. Obtener datos crudos del modelo
    const { products: rawProducts, totalProducts } =
      await productModel.findProducts(filters);

    // 5. Aplicar lógica de negocio (cálculo de precios, formato)
    // Obtener IDs de productos que cambiaron de precio recientemente
    const productIds = rawProducts.map(p => p.id);
    console.log('[DEBUG] Checking changes for product IDs:', productIds);
    const recentlyChangedIds = await productModel.getRecentlyChangedProducts(productIds);
    console.log('[DEBUG] Recently changed IDs found:', recentlyChangedIds);
    const recentlyChangedSet = new Set(recentlyChangedIds);

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
        imageUrl: getImageUrl(prod.code),
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
      };
    });

    return {
      products,
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
      // Filter by denied groups if user is restricted
      let filteredAccessories = dbAccessories;
      if (userId) {
        const deniedGroups = await productModel.getDeniedProductGroups(userId);
        if (deniedGroups.length > 0) {
          filteredAccessories = dbAccessories.filter(acc => !deniedGroups.includes(acc.product_group));
        }
      }

      return filteredAccessories.map((prod) => ({
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: prod.price,
        formattedPrice: formatCurrency(prod.price),
        image_url: getImageUrl(prod.code) || `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(prod.description.split(' ')[0])}`,
        group_code: prod.product_group,
      }));
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
            image_url: imageUrl,
            type: 'static_group',
            id: group.id
          };
        } else {
          return {
            group_code: null,
            collection_id: group.id,
            name: group.name,
            image_url: group.image_url || `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(group.name)}`,
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

    const productDetails = {
      id: prod.id,
      code: prod.code,
      name: prod.description,
      price: prod.price,
      formattedPrice: formatCurrency(prod.price),
      brand: prod.brand,
      imageUrl: getImageUrl(prod.code),
      capacityDesc: prod.capacity_description,
      capacityValue: null,
      additionalInfo: {},
      product_group: prod.product_group,
    };

    return productDetails;
  } catch (error) {
    console.error(
      `Error in fetchProductDetails (service) for ID ${productId}:`,
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

    const rawOffers = await productModel.findOffers(deniedGroups);

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
        oferta: true,
        custom_title: prod.custom_title,
        custom_description: prod.custom_description,
        custom_image_url: prod.custom_image_url,
      };
    });

    return offers;
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

    const {
      products: rawProducts,
      totalProducts,
      groupName,
    } = await productModel.findProductsByGroup(
      groupCode,
      limit,
      offset,
      deniedGroups
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
        imageUrl: getImageUrl(prod.code),
        capacityDesc: prod.capacity_description,
      };
    });

    return {
      products,
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
    // 1. Verificar si el producto existe en DB1 (solo lectura)
    const productResult = await pool.query(
      'SELECT id, description, code, price FROM products WHERE id = $1',
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
        'UPDATE product_offer_status SET is_on_offer = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
        [newOfferStatus, productId]
      );
    } else {
      // Si no existe, insertar un nuevo registro con is_on_offer = true
      newOfferStatus = true;
      await pool2.query(
        'INSERT INTO product_offer_status (product_id, is_on_offer) VALUES ($1, $2)',
        [productId, newOfferStatus]
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

const getCustomCollectionProducts = async (collectionId) => {
  const rawProducts = await productModel.findCustomCollectionProducts(collectionId);
  let exchangeRates;
  try {
    exchangeRates = await getExchangeRates();
  } catch (error) {
    exchangeRates = { venta_billete: 1, venta_divisa: 1 };
  }
  const ventaBillete = exchangeRates.venta_billete || 1;
  const ventaDivisa = exchangeRates.venta_divisa || 1;

  return rawProducts.map((prod) => {
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
    };
  });
};

const addCustomGroupItem = async (groupId, productId) => {
  const result = await productModel.addCustomGroupItem(groupId, productId);
  return result;
};

const removeCustomGroupItem = async (groupId, productId) => {
  const result = await productModel.removeCustomGroupItem(groupId, productId);
  return result;
};

module.exports = {
  fetchProducts,
  getAccessories,
  getProductGroupsDetails,
  fetchProductDetails,
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
};
