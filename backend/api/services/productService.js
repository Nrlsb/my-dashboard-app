const productModel = require('../models/productModel');
const { getExchangeRates } = require('../utils/exchangeRateService');
const { formatCurrency } = require('../utils/helpers');
const { pool } = require('../db'); // Solo para verificar si el usuario es admin

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
const fetchProducts = async ({ page = 1, limit = 20, search = '', brand = '', userId = null }) => {
  try {
    // 1. Obtener cotizaciones
    const exchangeRates = await getExchangeRates();
    const ventaBillete = exchangeRates.venta_billete;
    const ventaDivisa = exchangeRates.venta_divisa;

    // 2. Determinar permisos
    let deniedGroups = [];
    if (userId) {
      // Verificar si el usuario es admin
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      const isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;

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
    };

    // 4. Obtener datos crudos del modelo
    const { products: rawProducts, totalProducts } = await productModel.findProducts(filters);

    // 5. Aplicar lógica de negocio (cálculo de precios, formato)
    const products = rawProducts.map(prod => {
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      if (prod.moneda === 2) { // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) { // Dólar Divisa
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
        cotizacion: prod.moneda === 2 ? ventaBillete : (prod.moneda === 3 ? ventaDivisa : 1),
        originalPrice: originalPrice,
        product_group: prod.product_group,
        oferta: prod.oferta, // El estado de la oferta ya viene del modelo
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
    let accessoryGroups = ['0102', '0103', '0114', '0120', '0121', '0125', '0128', '0136', '0140', '0143', '0144', '0148', '0149', '0166', '0177', '0186', '0187'];

    if (userId) {
      const deniedGroups = await productModel.getDeniedProductGroups(userId);
      if (deniedGroups.length > 0) {
        accessoryGroups = accessoryGroups.filter(group => !deniedGroups.includes(group));
      }
    }

    if (accessoryGroups.length === 0) {
      return []; // No hay grupos de accesorios para mostrar
    }

    const rawAccessories = await productModel.findAccessories(accessoryGroups);
    
    const accessories = rawAccessories.map(prod => ({
      id: prod.id,
      code: prod.code,
      name: prod.description,
      price: prod.price,
      formattedPrice: formatCurrency(prod.price),
      image_url: `https://via.placeholder.com/150/2D3748/FFFFFF?text=${encodeURIComponent(prod.description.split(' ')[0])}`,
      group_code: prod.product_group,
    }));
    
    return accessories;
    
  } catch (error) {
    console.error('Error en getAccessories (service):', error);
    throw error;
  }
};

const getProductGroupsDetails = async (userId) => {
  let groupCodes = ['0102', '0103', '0114', '0120', '0121', '0125', '0128', '0136', '0140', '0143', '0144', '0148', '0149', '0166', '0177', '0186', '0187'];
  
  try {
    if (userId) {
      const deniedGroups = await productModel.getDeniedProductGroups(userId);
      if (deniedGroups.length > 0) {
        groupCodes = groupCodes.filter(code => !deniedGroups.includes(code));
      }
    }

    if (groupCodes.length === 0) {
      return [];
    }

    const groupDetailsFromDb = await productModel.findProductGroupsDetails(groupCodes);
    const groupDetailsMap = new Map(groupDetailsFromDb.map(g => [g.product_group, g]));

    const groupDetails = groupCodes.map(code => {
      const detail = groupDetailsMap.get(code);
      let imageUrl = `https://via.placeholder.com/150/2D3748/FFFFFF?text=${encodeURIComponent(code)}`;
      let name = `Grupo ${code}`;

      if (detail) {
        name = detail.brand; 
        const imageName = detail.description || name;
        imageUrl = `https://via.placeholder.com/150/2D3748/FFFFFF?text=${encodeURIComponent(imageName.split(' ')[0])}`;
      }
      
      return {
        group_code: code,
        name: name, 
        image_url: imageUrl,
      };
    });
    
    return groupDetails;
    
  } catch (error) {
    console.error('Error en getProductGroupsDetails (service):', error);
    throw error;
  }
};

const fetchProductDetails = async (productId, userId = null) => {
  try {
    let deniedGroups = [];
    if (userId) {
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      const isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;
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
      imageUrl: null, 
      capacityDesc: prod.capacity_description,
      capacityValue: null, 
      additionalInfo: {},
      product_group: prod.product_group
    };
    
    return productDetails;

  } catch (error) {
    console.error(`Error in fetchProductDetails (service) for ID ${productId}:`, error);
    throw error;
  }
};

const fetchProtheusBrands = async (userId = null) => {
  try {
    let deniedGroups = [];
    if (userId) {
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      const isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;
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
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      const isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;
      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);
      }
    }

    const rawOffers = await productModel.findOffers(deniedGroups);

    if (rawOffers.length === 0) {
      return [];
    }

    const exchangeRates = await getExchangeRates();
    const ventaBillete = exchangeRates.venta_billete;
    const ventaDivisa = exchangeRates.venta_divisa;

    const offers = rawOffers.map(prod => {
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      if (prod.moneda === 2) { // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) { // Dólar Divisa
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
        moneda: prod.moneda,
        cotizacion: prod.moneda === 2 ? ventaBillete : (prod.moneda === 3 ? ventaDivisa : 1),
        originalPrice: originalPrice,
        product_group: prod.product_group,
        oferta: true
      };
    });

    return offers;

  } catch (error) {
    console.error('Error in fetchProtheusOffers (service):', error);
    throw error;
  }
};

const fetchProductsByGroup = async (groupCode, page = 1, limit = 20, userId = null) => {
  try {
    const exchangeRates = await getExchangeRates();
    const ventaBillete = exchangeRates.venta_billete;
    const ventaDivisa = exchangeRates.venta_divisa;

    const offset = (page - 1) * limit;
    let deniedGroups = [];
    if (userId) {
      const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
      const isUserAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin;
      if (!isUserAdmin) {
        deniedGroups = await productModel.getDeniedProductGroups(userId);
      }
    }

    const { products: rawProducts, totalProducts, groupName } = await productModel.findProductsByGroup(groupCode, limit, offset, deniedGroups);

    const products = rawProducts.map(prod => {
      let originalPrice = prod.price;
      let finalPrice = prod.price;

      if (prod.moneda === 2) { // Dólar Billete
        finalPrice = originalPrice * ventaBillete;
      } else if (prod.moneda === 3) { // Dólar Divisa
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

module.exports = {
  fetchProducts,
  getAccessories,
  getProductGroupsDetails,
  fetchProductDetails,
  fetchProtheusBrands,
  fetchProtheusOffers,
  fetchProductsByGroup,
};
