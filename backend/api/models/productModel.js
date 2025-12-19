const { pool, pool2 } = require('../db');
const { redisClient, isRedisReady } = require('../redisClient');

/**
 * Función interna para obtener los datos de productos en oferta.
 * Centraliza el acceso a la caché de ofertas.
 * @returns {Promise<object[]>} - Una promesa que se resuelve con un array de objetos de oferta.
 */
const getOnOfferData = async (bypassCache = false) => {
  const cacheKey = 'products:on_offer';

  if (!bypassCache && isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in getOnOfferData:', err);
    }
  }

  try {
    // Updated to select product_code if available, but for now we keep ID for compatibility with internal logic if needed,
    // BUT we should prefer code.
    // The table product_offer_status now has product_code.
    // Let's select both.
    const result = await pool2.query(
      'SELECT product_id, product_code, custom_title, custom_description, custom_image_url FROM product_offer_status WHERE is_on_offer = true'
    );

    if (isRedisReady()) {
      // Cache for 10 minutes
      await redisClient.set(cacheKey, JSON.stringify(result.rows), { EX: 600 });
    }

    return result.rows;
  } catch (error) {
    console.error('Error fetching on-offer data:', error);
    return [];
  }
};

/**
 * Función interna para obtener solo los IDs de productos en oferta.
 * Wrapper sobre getOnOfferData para compatibilidad.
 * @returns {Promise<number[]>} - Una promesa que se resuelve con un array de IDs de productos.
 */
const getOnOfferProductIds = async (bypassCache = false) => {
  const data = await getOnOfferData(bypassCache);
  return data.map(item => item.product_id);
};

/**
 * Función interna para obtener solo los Códigos de productos en oferta.
 * @returns {Promise<string[]>}
 */
const getOnOfferProductCodes = async (bypassCache = false) => {
  const data = await getOnOfferData(bypassCache);
  return data.map(item => item.product_code).filter(code => code != null);
};

/**
 * Obtiene los grupos de productos denegados para un usuario específico.
 * Utiliza una caché en memoria para evitar consultas repetidas a la base de datos.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<string[]>} - Una promesa que se resuelve con un array de códigos de grupo de productos denegados.
 */
const getDeniedProductGroups = async (userId) => {
  try {
    // 1. Get user_code first
    const userQuery = 'SELECT a1_cod FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    const userCode = userResult.rows.length > 0 ? userResult.rows[0].a1_cod : null;

    if (!userCode) return [];

    const cacheKey = `user:denied_groups:code:${userCode}`;

    if (isRedisReady()) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      } catch (err) {
        console.error('Redis error in getDeniedProductGroups:', err);
      }
    }

    const query = `
      SELECT product_group 
      FROM user_product_group_permissions 
      WHERE user_code = $1;
    `;
    const result = await pool2.query(query, [userCode]);
    const deniedGroups = result.rows
      .map((row) => row.product_group)
      .filter((g) => g != null && g !== '');

    if (isRedisReady()) {
      await redisClient.set(cacheKey, JSON.stringify(deniedGroups), { EX: 3600 });
    }

    return deniedGroups;
  } catch (error) {
    console.error(`Error in getDeniedProductGroups for user ${userId}:`, error);
    if (error.code === '42P01') {
      console.warn('[WARNING] Table user_product_group_permissions does not exist.');
      return [];
    }
    throw error;
  }
};

const invalidatePermissionsCache = async (userId) => {
  if (!isRedisReady()) return;

  try {
    const userQuery = 'SELECT a1_cod FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    const userCode = userResult.rows.length > 0 ? userResult.rows[0].a1_cod : null;

    if (userCode) {
      const cacheKey = `user:denied_groups:code:${userCode}`;
      await redisClient.del(cacheKey);
      console.log(`Invalidated permissions cache for user ${userId} (Code: ${userCode})`);
    }
  } catch (err) {
    console.error(`Error invalidating permissions cache for user ${userId}:`, err);
  }
};

/**
 * Busca y cuenta productos en la base de datos con filtros y paginación.
 * @param {object} filters - Los filtros para la búsqueda.
 * @param {number} filters.limit - Límite de productos por página.
 * @param {number} filters.offset - Desplazamiento para la paginación.
 * @param {string} [filters.search] - Término de búsqueda para descripción o código.
 * @param {string[]} [filters.brands] - Array de marcas para filtrar.
 * @param {string[]} [filters.deniedGroups] - Array de grupos de productos a excluir.
 * @returns {Promise<{products: object[], totalProducts: number}>} - Una promesa que se resuelve con los productos y el conteo total.
 */
const findProducts = async ({
  limit,
  offset,
  search,
  brands,
  deniedGroups,
  allowedIds = [],
  excludedIds = [],
  bypassCache = false,
}) => {
  const cacheKey = `products:search:${JSON.stringify({
    limit,
    offset,
    search: search ? search.trim() : '',
    brands: brands ? brands.sort() : [],
    deniedGroups: deniedGroups ? deniedGroups.filter(g => g != null && g !== '').sort() : [],
    allowedIds: allowedIds ? allowedIds.sort() : [],
    excludedIds: excludedIds ? excludedIds.sort() : []
  })}`;

  if (!bypassCache && isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in findProducts:', err);
    }
  }
  let queryParams = [];
  let paramIndex = 1;

  let countQuery =
    'SELECT COUNT(*) FROM products WHERE price > 0 AND description IS NOT NULL';
  let dataQuery = `
      SELECT
      id, code, description, price, brand,
        capacity_description, moneda, cotizacion, product_group,
        stock_disponible, stock_de_seguridad
    FROM products
    WHERE price > 0 AND description IS NOT NULL
  `;

  if (deniedGroups && deniedGroups.length > 0) {
    const groupQuery = ` product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
    countQuery += ` AND ${groupQuery} `;
    dataQuery += ` AND ${groupQuery} `;
    queryParams.push(deniedGroups);
    paramIndex++;
  }

  const searchTerms = search ? search.trim().split(/\s+/).filter(term => term.length > 0) : [];

  if (searchTerms.length > 0) {
    const termConditions = searchTerms.map(() => {
      const currentParamIndex = paramIndex;
      paramIndex++;
      return `(description ILIKE $${currentParamIndex} OR code ILIKE $${currentParamIndex})`;
    });

    const finalSearchQuery = ` (${termConditions.join(' AND ')}) `;

    countQuery += ` AND ${finalSearchQuery} `;
    dataQuery += ` AND ${finalSearchQuery} `;

    searchTerms.forEach(term => {
      queryParams.push(`%${term}%`);
    });
  }


  if (brands && brands.length > 0) {
    const brandQuery = ` brand = ANY($${paramIndex}::varchar[])`;
    countQuery += ` AND ${brandQuery} `;
    dataQuery += ` AND ${brandQuery} `;
    queryParams.push(brands);
    paramIndex++;
  }

  if (allowedIds && allowedIds.length > 0) {
    const allowedQuery = ` code = ANY($${paramIndex}::varchar[])`;
    countQuery += ` AND ${allowedQuery} `;
    dataQuery += ` AND ${allowedQuery} `;
    queryParams.push(allowedIds);
    paramIndex++;
  }

  if (excludedIds && excludedIds.length > 0) {
    const excludedQuery = ` code != ALL($${paramIndex}::varchar[])`;
    countQuery += ` AND ${excludedQuery} `;
    dataQuery += ` AND ${excludedQuery} `;
    queryParams.push(excludedIds);
    paramIndex++;
  }

  dataQuery += ` ORDER BY description ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1} `;

  try {
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, queryParams),
      pool.query(dataQuery, [...queryParams, limit, offset])
    ]);

    const totalProducts = parseInt(countResult.rows[0].count, 10);
    const products = dataResult.rows;

    const onOfferProductCodes = await getOnOfferProductCodes(bypassCache);
    const onOfferCodesSet = new Set(onOfferProductCodes);

    const productsWithOfferStatus = products.map((product) => ({
      ...product,
      oferta: onOfferCodesSet.has(product.code),
    }));

    const resultToReturn = {
      products: productsWithOfferStatus,
      totalProducts,
    };

    if (isRedisReady()) {
      await redisClient.set(cacheKey, JSON.stringify(resultToReturn), { EX: 60 });
    }

    return resultToReturn;
  } catch (error) {
    console.error('[DEBUG] Error in productModel.findProducts:', error);
    throw error;
  }
};

const findAccessories = async (accessoryGroups) => {
  try {
    const query = `
      WITH RandomSample AS (
          SELECT id, code, description, price, product_group
        FROM products
        WHERE product_group = ANY($1) 
          AND price > 0 
          AND description IS NOT NULL
        )
      SELECT * FROM RandomSample
      ORDER BY random()
      LIMIT 20;
      `;

    const result = await pool.query(query, [accessoryGroups]);
    return result.rows;
  } catch (error) {
    console.error('Error in findAccessories:', error);
    throw error;
  }
};

const findProductGroupsDetails = async (groupCodes) => {
  try {
    const query = `
      SELECT DISTINCT ON (product_group)
      product_group,
        brand,
        description
      FROM products
      WHERE product_group = ANY($1::varchar[])
        AND brand IS NOT NULL AND brand != ''
        `;
    const result = await pool.query(query, [groupCodes]);
    return result.rows;
  } catch (error) {
    console.error('Error in findProductGroupsDetails:', error);
    throw error;
  }
};

const findProductById = async (productId, deniedGroups = []) => {
  try {
    let query = `
      SELECT
      id, code, description, price, brand,
        capacity_description, product_group,
        stock_disponible, stock_de_seguridad
      FROM products
      WHERE id = $1 AND price > 0 AND description IS NOT NULL
    `;
    let queryParams = [productId];
    let paramIndex = 2;

    if (deniedGroups.length > 0) {
      query += ` AND product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
      queryParams.push(deniedGroups);
    }

    const result = await pool.query(query, queryParams);
    const product = result.rows[0];

    return product;
  } catch (error) {
    console.error(`Error in findProductById for ID ${productId}: `, error);
    throw error;
  }
};

const findProductByCode = async (productCode, deniedGroups = []) => {
  try {
    let query = `
      SELECT
      id, code, description, price, brand,
        capacity_description, product_group,
        stock_disponible, stock_de_seguridad
      FROM products
      WHERE code = $1 AND price > 0 AND description IS NOT NULL
    `;
    let queryParams = [productCode];
    let paramIndex = 2;

    if (deniedGroups.length > 0) {
      query += ` AND product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
      queryParams.push(deniedGroups);
    }

    const result = await pool.query(query, queryParams);
    return result.rows[0];
  } catch (error) {
    console.error(`Error in findProductByCode for Code ${productCode}: `, error);
    throw error;
  }
};

const findUniqueBrands = async (deniedGroups = []) => {
  try {
    let query = `
      SELECT DISTINCT brand 
      FROM products 
      WHERE brand IS NOT NULL AND brand != ''
        `;
    let queryParams = [];
    let paramIndex = 1;

    if (deniedGroups.length > 0) {
      query += ` AND product_group NOT IN (SELECT unnest($${paramIndex}::varchar[]))`;
      queryParams.push(deniedGroups);
    }

    query += ` ORDER BY brand ASC; `;

    const result = await pool.query(query, queryParams);
    return result.rows.map((row) => row.brand);
  } catch (error) {
    console.error('Error in findUniqueBrands:', error);
    throw error;
  }
};

const findOffers = async (deniedGroups = []) => {
  try {
    const offerData = await getOnOfferData();

    if (offerData.length === 0) {
      return [];
    }

    // Use codes
    const offerProductCodes = offerData.map(o => o.product_code).filter(c => c != null);
    const offerDetailsMap = new Map(offerData.map(o => [o.product_code, o]));

    let query = `
      SELECT
      id, code, description, price, brand,
        capacity_description, moneda, cotizacion, product_group,
        stock_disponible, stock_de_seguridad
      FROM products
      WHERE code = ANY($1::varchar[]) AND price > 0 AND description IS NOT NULL
    `;
    let queryParams = [offerProductCodes];
    let paramIndex = 2;

    if (deniedGroups.length > 0) {
      query += ` AND product_group NOT IN (SELECT unnest($${paramIndex}::varchar[]))`;
      queryParams.push(deniedGroups);
    }

    query += ` ORDER BY description ASC; `;

    const result = await pool.query(query, queryParams);

    const productsWithDetails = result.rows.map(product => {
      const details = offerDetailsMap.get(product.code);
      return {
        ...product,
        custom_title: details?.custom_title || null,
        custom_description: details?.custom_description || null,
        custom_image_url: details?.custom_image_url || null
      };
    });

    return productsWithDetails;
  } catch (error) {
    console.error('Error in findOffers:', error);
    throw error;
  }
};

const findProductsByGroup = async (
  groupCode,
  limit,
  offset,
  deniedGroups = [],
  allowedProductCodes = []
) => {
  if (deniedGroups.includes(groupCode)) {
    console.log(`[DEBUG] Acceso denegado al grupo ${groupCode}.`);
    return { products: [], totalProducts: 0, groupName: '' };
  }

  let countQuery =
    'SELECT COUNT(*) FROM products WHERE product_group = $1 AND price > 0 AND description IS NOT NULL';
  let dataQuery = `
      SELECT
      id, code, description, price, brand,
        capacity_description, moneda, cotizacion, product_group,
        stock_disponible, stock_de_seguridad
    FROM products
    WHERE product_group = $1 AND price > 0 AND description IS NOT NULL
  `;

  // Add deniedProductCodes filter
  let queryParams = [groupCode];
  let paramIndex = 2;

  // Add allowedProductCodes filter
  if (allowedProductCodes && allowedProductCodes.length > 0) {
    const allowedQuery = ` AND code = ANY($${paramIndex}::varchar[])`;
    countQuery += allowedQuery;
    dataQuery += allowedQuery;
    queryParams.push(allowedProductCodes);
    paramIndex++;
  }

  // (OPTIMIZACIÓN) Ejecución en paralelo
  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, queryParams),
    pool.query(dataQuery + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1} `, [...queryParams, limit, offset])
  ]);

  const totalProducts = parseInt(countResult.rows[0].count, 10);
  const products = dataResult.rows;

  let groupName = '';
  if (products.length > 0) {
    groupName = products[0].brand;
  } else {
    const groupNameResult = await pool.query(
      'SELECT brand FROM products WHERE product_group = $1 AND brand IS NOT NULL LIMIT 1',
      [groupCode]
    );
    if (groupNameResult.rows.length > 0) {
      groupName = groupNameResult.rows[0].brand;
    }
  }

  return { products, totalProducts, groupName };
};

/**
 * Obtiene los IDs de productos que han cambiado de precio en los últimos 7 días.
 * @param {string[]} productCodes - Array de códigos de productos a verificar.
 * @returns {Promise<number[]>} - Array de IDs de productos que cambiaron recientemente (mapped back from codes if needed, or just return IDs if we have them).
 * Actually, let's accept IDs for now as fetchProducts has IDs.
 * But we should query using codes if possible.
 */
const getRecentlyChangedProducts = async (productIds) => {
  if (!productIds || productIds.length === 0) return [];

  try {
    // Map IDs to codes first?
    // Or just use product_id if the table still has it (it does).
    // But we should try to use code.
    // Let's stick to ID for this one as it's internal history and table has both.
    // Wait, the requirement is "siempre tomen como referencia el parametro code".
    // So I should use code.

    // Get codes for these IDs
    const codesResult = await pool.query('SELECT code, id FROM products WHERE id = ANY($1::int[])', [productIds]);
    const codes = codesResult.rows.map(r => r.code);
    const codeToIdMap = new Map(codesResult.rows.map(r => [r.code, r.id]));

    const query = `
      SELECT product_code 
      FROM product_price_snapshots 
      WHERE product_code = ANY($1::varchar[]) 
        AND last_change_timestamp >= NOW() - INTERVAL '2 minutes'
    `;
    const result = await pool2.query(query, [codes]);

    // Map back to IDs
    return result.rows.map(row => codeToIdMap.get(row.product_code)).filter(id => id != null);
  } catch (error) {
    console.error('Error in getRecentlyChangedProducts:', error);
    return [];
  }
};

const updateProductOfferDetails = async (productId, details) => {
  const { custom_title, custom_description, custom_image_url } = details;
  try {
    // 1. Get product code
    const productResult = await pool.query('SELECT code FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) throw new Error('Product not found');
    const productCode = productResult.rows[0].code;

    // 2. Update in DB2
    const result = await pool2.query(
      `UPDATE product_offer_status 
       SET custom_title = $1, custom_description = $2, custom_image_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE product_code = $4
       RETURNING *`,
      [custom_title, custom_description, custom_image_url, productCode]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateProductOfferDetails:', error);
    throw error;
  }
};

// --- Carousel Content Methods ---

const findCarouselAccessories = async () => {
  try {
    const idsResult = await pool2.query('SELECT product_code FROM carousel_accessories');
    const productCodes = idsResult.rows.map(row => row.product_code);

    if (productCodes.length === 0) return [];

    const productsQuery = `
      SELECT id, code, description, price, brand, capacity_description, product_group, stock_disponible, stock_de_seguridad
      FROM products
      WHERE code = ANY($1::varchar[])
    `;
    const productsResult = await pool.query(productsQuery, [productCodes]);
    return productsResult.rows;
  } catch (error) {
    console.error('Error in findCarouselAccessories:', error);
    throw error;
  }
};

const addCarouselAccessory = async (productId) => {
  try {
    const productResult = await pool.query('SELECT code FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) throw new Error('Product not found');
    const productCode = productResult.rows[0].code;

    await pool2.query('INSERT INTO carousel_accessories (product_code, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [productCode, productId]);
    return { success: true };
  } catch (error) {
    console.error('Error in addCarouselAccessory:', error);
    throw error;
  }
};

const removeCarouselAccessory = async (productId) => {
  try {
    const productResult = await pool.query('SELECT code FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) throw new Error('Product not found');
    const productCode = productResult.rows[0].code;

    await pool2.query('DELETE FROM carousel_accessories WHERE product_code = $1', [productCode]);
    return { success: true };
  } catch (error) {
    console.error('Error in removeCarouselAccessory:', error);
    throw error;
  }
};

const findCarouselGroups = async () => {
  try {
    const result = await pool2.query('SELECT * FROM carousel_product_groups WHERE is_active = true ORDER BY display_order ASC');
    return result.rows;
  } catch (error) {
    console.error('Error in findCarouselGroups:', error);
    throw error;
  }
};

const createCarouselGroup = async (data) => {
  const { name, image_url, type, reference_id, display_order } = data;
  try {
    const result = await pool2.query(
      'INSERT INTO carousel_product_groups (name, image_url, type, reference_id, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, image_url, type, reference_id, display_order || 0]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in createCarouselGroup:', error);
    throw error;
  }
};

const updateCarouselGroup = async (id, data) => {
  const { name, image_url, type, reference_id, is_active, display_order } = data;
  try {
    const result = await pool2.query(
      `UPDATE carousel_product_groups 
       SET name = COALESCE($1, name),
        image_url = COALESCE($2, image_url),
        type = COALESCE($3, type),
        reference_id = COALESCE($4, reference_id),
        is_active = COALESCE($5, is_active),
        display_order = COALESCE($6, display_order)
       WHERE id = $7 RETURNING * `,
      [name, image_url, type, reference_id, is_active, display_order, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateCarouselGroup:', error);
    throw error;
  }
};

const deleteCarouselGroup = async (id) => {
  try {
    await pool2.query('DELETE FROM carousel_product_groups WHERE id = $1', [id]);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteCarouselGroup:', error);
    throw error;
  }
};

const findCustomCollectionProducts = async (collectionId) => {
  try {
    const idsResult = await pool2.query('SELECT product_code FROM carousel_custom_group_items WHERE group_id = $1', [collectionId]);
    const productCodes = idsResult.rows.map(row => row.product_code);

    if (productCodes.length === 0) return [];

    const productsQuery = `
      SELECT id, code, description, price, brand, capacity_description, product_group, stock_disponible, stock_de_seguridad
      FROM products
      WHERE code = ANY($1::varchar[])
        `;
    const productsResult = await pool.query(productsQuery, [productCodes]);
    return productsResult.rows;
  } catch (error) {
    console.error('Error in findCustomCollectionProducts:', error);
    throw error;
  }
};

const addCustomGroupItem = async (groupId, productId) => {
  try {
    const productResult = await pool.query('SELECT code FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) throw new Error('Product not found');
    const productCode = productResult.rows[0].code;

    await pool2.query('INSERT INTO carousel_custom_group_items (group_id, product_code, product_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [groupId, productCode, productId]);
    return { success: true };
  } catch (error) {
    console.error('Error in addCustomGroupItem:', error);
    throw error;
  }
};

const removeCustomGroupItem = async (groupId, productId) => {
  try {
    const productResult = await pool.query('SELECT code FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) throw new Error('Product not found');
    const productCode = productResult.rows[0].code;

    await pool2.query('DELETE FROM carousel_custom_group_items WHERE group_id = $1 AND product_code = $2', [groupId, productCode]);
    return { success: true };
  } catch (error) {
    console.error('Error in removeCustomGroupItem:', error);
    throw error;
  }
};


/**
 * Obtiene las URLs de imágenes para una lista de productos desde DB2.
 * @param {string[]} productCodes - Array de códigos de productos.
 * @returns {Promise<object[]>} - Array de objetos { product_code, image_url }.
 */
const getProductImages = async (productCodes) => {
  if (!productCodes || productCodes.length === 0) return [];

  try {
    const query = `
      SELECT product_code, image_url 
      FROM product_images 
      WHERE product_code = ANY($1::varchar[])
        `;
    const result = await pool2.query(query, [productCodes]);
    return result.rows;
  } catch (error) {
    console.error('Error in getProductImages:', error);
    return [];
  }
};

/**
 * Obtiene todos los Códigos de productos que tienen imágenes en DB2.
 * @returns {Promise<string[]>} - Array de códigos de productos.
 */
const getAllProductImageCodes = async () => {
  try {
    const query = 'SELECT DISTINCT product_code FROM product_images';
    const result = await pool2.query(query);
    return result.rows.map(row => row.product_code);
  } catch (error) {
    console.error('Error in getAllProductImageCodes:', error);
    return [];
  }
};

const getGlobalDeniedProducts = async () => {
  try {
    const query = 'SELECT product_code FROM global_product_permissions';
    const result = await pool2.query(query);
    return result.rows.map(row => row.product_code);
  } catch (error) {
    console.error('Error in getGlobalDeniedProducts:', error);
    if (error.code === '42P01') {
      console.warn('[WARNING] Table global_product_permissions does not exist.');
      return [];
    }
    throw error;
  }
};

const getGlobalDeniedProductsWithDetails = async () => {
  try {
    // 1. Get codes from DB2
    const query = 'SELECT product_code FROM global_product_permissions';
    const result = await pool2.query(query);
    const codes = result.rows.map(row => row.product_code);

    if (codes.length === 0) return [];

    // 2. Get details from DB1
    const productsQuery = `
      SELECT id, code, description, price 
      FROM products 
      WHERE code = ANY($1::varchar[])
    `;
    const productsResult = await pool.query(productsQuery, [codes]);

    return productsResult.rows.map(p => ({
      ...p,
      name: p.description,
      formattedPrice: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.price)
    }));

  } catch (error) {
    console.error('Error in getGlobalDeniedProductsWithDetails:', error);
    if (error.code === '42P01') {
      console.warn('[WARNING] Table global_product_permissions does not exist.');
      return [];
    }
    throw error;
  }
};

module.exports = {
  findProducts,
  findAccessories,
  findProductGroupsDetails,
  findProductById,
  findProductByCode,
  findUniqueBrands,
  findOffers,
  findProductsByGroup,
  getRecentlyChangedProducts,
  updateProductOfferDetails,
  // Carousel exports
  findCarouselAccessories,
  addCarouselAccessory,
  removeCarouselAccessory,
  findCarouselGroups,
  createCarouselGroup,
  updateCarouselGroup,
  deleteCarouselGroup,
  findCustomCollectionProducts,
  addCustomGroupItem,
  removeCustomGroupItem,
  getProductImages,
  getAllProductImageCodes,
  getDeniedProductGroups,

  getGlobalDeniedProducts,
  getGlobalDeniedProductsWithDetails,
  invalidatePermissionsCache,
};