const productModel = require('../models/productModel');
const { getExchangeRates } = require('../utils/exchangeRateService');
const { formatCurrency } = require('../utils/helpers');
const { pool, pool2 } = require('../db'); // Solo para verificar si el usuario es admin
const { clearCacheByPattern } = require('../redisClient'); // Importar el nuevo invalidador de caché

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
        imageUrl: null,
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
    // 1. Try to fetch from DB configuration
    const dbAccessories = await productModel.findCarouselAccessories();

    if (dbAccessories.length > 0) {
      return dbAccessories.map((prod) => ({
        id: prod.id,
        code: prod.code,
        name: prod.description,
        price: prod.price,
        formattedPrice: formatCurrency(prod.price),
        image_url: `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(prod.description.split(' ')[0])}`,
        group_code: prod.product_group,
      }));
    }

    let accessoryGroups = [
      '0102',
      '0103',
      '0114',
      '0120',
      '0121',
      '0125',
      '0128',
      '0136',
      '0140',
      '0143',
      '0144',
      '0148',
      '0149',
      '0166',
      '0177',
      '0186',
      '0187',
    ];

    if (userId) {
      const deniedGroups = await productModel.getDeniedProductGroups(userId);
      if (deniedGroups.length > 0) {
        accessoryGroups = accessoryGroups.filter(
          (group) => !deniedGroups.includes(group)
        );
      }
    }

    if (accessoryGroups.length === 0) {
      return []; // No hay grupos de accesorios para mostrar
    }

    const rawAccessories = await productModel.findAccessories(accessoryGroups);

    const accessories = rawAccessories.map((prod) => ({
      id: prod.id,
      code: prod.code,
      name: prod.description,
      price: prod.price,
      formattedPrice: formatCurrency(prod.price),
      image_url: `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(prod.description.split(' ')[0])}`,
      group_code: prod.product_group,
    }));

    return accessories;
  } catch (error) {
    console.error('Error en getAccessories (service):', error);
    throw error;
  }
};

const getProductGroupsDetails = async (userId) => {
  try {
    // 1. Try to fetch from DB configuration
    const dbGroups = await productModel.findCarouselGroups();

    if (dbGroups.length > 0) {
      const staticGroups = dbGroups.filter(g => g.type === 'static_group');
      const staticGroupCodes = staticGroups.map(g => g.reference_id);

      let groupDetailsMap = new Map();
      if (staticGroupCodes.length > 0) {
        const details = await productModel.findProductGroupsDetails(staticGroupCodes);
        groupDetailsMap = new Map(details.map(g => [g.product_group, g]));
      }

      return dbGroups.map(group => {
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
    }

    let groupCodes = [
      '0102',
      '0103',
      '0114',
      '0120',
      '0121',
      '0125',
      '0128',
      '0136',
      '0140',
      '0143',
      '0144',
      '0148',
      '0149',
      '0166',
      '0177',
      '0186',
      '0187',
    ];

    try {
      if (userId) {
        const deniedGroups = await productModel.getDeniedProductGroups(userId);
        if (deniedGroups.length > 0) {
          groupCodes = groupCodes.filter((code) => !deniedGroups.includes(code));
        }
      }

      if (groupCodes.length === 0) {
        return [];
      }

      const groupDetailsFromDb =
        await productModel.findProductGroupsDetails(groupCodes);
      const groupDetailsMap = new Map(
        groupDetailsFromDb.map((g) => [g.product_group, g])
      );

      const groupDetails = groupCodes.map((code) => {
        const detail = groupDetailsMap.get(code);
        let imageUrl = `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(code)}`;
        let name = `Grupo ${code}`;

        if (detail) {
          name = detail.brand;
          const imageName = detail.description || name;
          imageUrl = `https://placehold.co/150/2D3748/FFFFFF?text=${encodeURIComponent(imageName.split(' ')[0])}`;
        }

        return {
          group_code: code,
          name: name,
          image_url: imageUrl,
          type: 'static_group'
        };
      });

      return groupDetails;
    } catch (error) {
      console.error('Error en getProductGroupsDetails (service):', error);
      throw error;
    }
  } catch (error) {
    console.error('Error en getProductGroupsDetails (service):', error);
    throw error;
  }
};

// ... (rest of the file content until exports)

// Admin Services
const addCarouselAccessory = async (productId) => {
  return productModel.addCarouselAccessory(productId);
};

const removeCarouselAccessory = async (productId) => {
  return productModel.removeCarouselAccessory(productId);
};

const getCarouselGroups = async () => {
  return productModel.findCarouselGroups();
};

const createCarouselGroup = async (data) => {
  return productModel.createCarouselGroup(data);
};

const updateCarouselGroup = async (id, data) => {
  return productModel.updateCarouselGroup(id, data);
};

const deleteCarouselGroup = async (id) => {
  return productModel.deleteCarouselGroup(id);
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
      imageUrl: null,
      capacityDesc: prod.capacity_description,
    };
  });
};

const addCustomGroupItem = async (groupId, productId) => {
  return productModel.addCustomGroupItem(groupId, productId);
};

const removeCustomGroupItem = async (groupId, productId) => {
  return productModel.removeCustomGroupItem(groupId, productId);
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
