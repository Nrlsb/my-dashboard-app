const { pool, pool2 } = require('../db');
const { redisClient, isRedisReady } = require('../redisClient');

/**
 * FunciÃ³n interna para obtener los datos de productos en oferta.
 * Centraliza el acceso a la cachÃ© de ofertas.
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
 * FunciÃ³n interna para obtener solo los IDs de productos en oferta.
 * Wrapper sobre getOnOfferData para compatibilidad.
 * @returns {Promise<number[]>} - Una promesa que se resuelve con un array de IDs de productos.
 */
const getOnOfferProductIds = async (bypassCache = false) => {
  const data = await getOnOfferData(bypassCache);
  return data.map(item => item.product_id);
};

/**
 * FunciÃ³n interna para obtener solo los CÃ³digos de productos en oferta.
 * @returns {Promise<string[]>}
 */
const getOnOfferProductCodes = async (bypassCache = false) => {
  const data = await getOnOfferData(bypassCache);
  return data.map(item => item.product_code).filter(code => code != null);
};

// --- NEW RELEASES METHODS ---

const getNewReleasesData = async () => {
  try {
    const result = await pool2.query(
      'SELECT product_id, product_code, custom_title, custom_description, custom_image_url FROM product_new_release_status WHERE is_new_release = true'
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching new releases data:', error);
    return [];
  }
};

const getNewReleasesProductCodes = async () => {
  const data = await getNewReleasesData();
  return data.map(item => item.product_code).filter(code => code != null);
};

/**
 * Obtiene los grupos de productos denegados para un usuario especÃ­fico.
 * Utiliza una cachÃ© en memoria para evitar consultas repetidas a la base de datos.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<string[]>} - Una promesa que se resuelve con un array de cÃ³digos de grupo de productos denegados.
 */
const getDeniedProductGroups = async (userId) => {
  try {
    // 1. Get user_code first from users OR user_credentials
    let userQuery = 'SELECT a1_cod FROM users WHERE id = $1';
    let userResult = await pool2.query(userQuery, [userId]);
    let userCode = userResult.rows.length > 0 ? userResult.rows[0].a1_cod : null;

    if (!userCode) {
      // Fallback for decoupled users
      const credResult = await pool2.query('SELECT a1_cod FROM user_credentials WHERE user_id = $1', [userId]);
      userCode = credResult.rows.length > 0 ? credResult.rows[0].a1_cod : null;
    }

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
    let userQuery = 'SELECT a1_cod FROM users WHERE id = $1';
    let userResult = await pool2.query(userQuery, [userId]);
    let userCode = userResult.rows.length > 0 ? userResult.rows[0].a1_cod : null;

    if (!userCode) {
      const credResult = await pool2.query('SELECT a1_cod FROM user_credentials WHERE user_id = $1', [userId]);
      userCode = credResult.rows.length > 0 ? credResult.rows[0].a1_cod : null;
    }

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
 * Busca y cuenta productos en la base de datos con filtros y paginaciÃ³n.
 * @param {object} filters - Los filtros para la bÃºsqueda.
 * @param {number} filters.limit - LÃ­mite de productos por pÃ¡gina.
 * @param {number} filters.offset - Desplazamiento para la paginaciÃ³n.
 * @param {string} [filters.search] - TÃ©rmino de bÃºsqueda para descripciÃ³n o cÃ³digo.
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
  const cacheKey = `products:search:v3:${JSON.stringify({
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
    'SELECT COUNT(*) FROM products WHERE da1_prcven > 0 AND b1_desc IS NOT NULL';
  let dataQuery = `
      SELECT
        id, b1_cod AS code, b1_desc AS description, da1_prcven AS price, sbm_desc AS brand, b1_grupo AS product_group, sbm_desc AS group_description,
        z02_descri AS capacity_description, da1_moeda AS moneda, cotizacion,
        stock_disp AS stock_disponible, stock_prev AS stock_de_seguridad, sbz_desc AS indicator_description, 
        b1_um AS unit_type, b1_qe AS pack_quantity
    FROM products
    WHERE da1_prcven > 0 AND b1_desc IS NOT NULL
  `;

  if (deniedGroups && deniedGroups.length > 0) {
    const groupQuery = ` b1_grupo NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
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
      return `(b1_desc ILIKE $${currentParamIndex} OR b1_cod ILIKE $${currentParamIndex})`;
    });

    const finalSearchQuery = ` (${termConditions.join(' AND ')}) `;

    countQuery += ` AND ${finalSearchQuery} `;
    dataQuery += ` AND ${finalSearchQuery} `;

    searchTerms.forEach(term => {
      queryParams.push(`%${term}%`);
    });
  }


  if (brands && brands.length > 0) {
    const brandQuery = ` TRIM(sbm_desc) = ANY($${paramIndex}::varchar[])`;
    countQuery += ` AND ${brandQuery} `;
    dataQuery += ` AND ${brandQuery} `;
    queryParams.push(brands);
    paramIndex++;
  }

  if (allowedIds && allowedIds.length > 0) {
    const allowedQuery = ` b1_cod = ANY($${paramIndex}::varchar[])`;
    countQuery += ` AND ${allowedQuery} `;
    dataQuery += ` AND ${allowedQuery} `;
    queryParams.push(allowedIds);
    paramIndex++;
  }

  if (excludedIds && excludedIds.length > 0) {
    const excludedQuery = ` b1_cod != ALL($${paramIndex}::varchar[])`;
    countQuery += ` AND ${excludedQuery} `;
    dataQuery += ` AND ${excludedQuery} `;
    queryParams.push(excludedIds);
    paramIndex++;
  }

  dataQuery += ` ORDER BY b1_desc ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1} `;

  try {
    const [countResult, dataResult] = await Promise.all([
      pool2.query(countQuery, queryParams),
      pool2.query(dataQuery, [...queryParams, limit, offset])
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
          SELECT id, b1_cod AS code, b1_desc AS description, da1_prcven AS price, b1_grupo AS product_group
        FROM products
        WHERE b1_grupo = ANY($1) 
          AND da1_prcven > 0 
          AND b1_desc IS NOT NULL
        )
      SELECT * FROM RandomSample
      ORDER BY random()
      LIMIT 20;
      `;

    const result = await pool2.query(query, [accessoryGroups]);
    return result.rows;
  } catch (error) {
    console.error('Error in findAccessories:', error);
    throw error;
  }
};

const findProductGroupsDetails = async (groupCodes) => {
  try {
    const query = `
      SELECT DISTINCT ON(b1_grupo)
          b1_grupo AS product_group,
          b1_grupo AS brand,
          sbm_desc AS description
      FROM products
      WHERE b1_grupo = ANY($1:: varchar[])
        AND b1_grupo IS NOT NULL AND b1_grupo != ''
  `;
    const result = await pool2.query(query, [groupCodes]);
    return result.rows;
  } catch (error) {
    console.error('Error in findProductGroupsDetails:', error);
    throw error;
  }
};

const findProductById = async (productId, deniedGroups = []) => {
  const cacheKey = `product:id:${productId}:denied:${JSON.stringify(deniedGroups.sort())}`;

  if (isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in findProductById:', err);
    }
  }

  try {
    let query = `
SELECT
id, b1_cod AS code, b1_desc AS description, da1_prcven AS price, sbm_desc AS brand,
  z02_descri AS capacity_description, b1_grupo AS product_group,
  stock_disp AS stock_disponible, stock_prev AS stock_de_seguridad, da1_moeda AS moneda,
  sbz_desc AS indicator_description, b1_qe AS pack_quantity
      FROM products
      WHERE id = $1 AND da1_prcven > 0 AND b1_desc IS NOT NULL
    `;
    let queryParams = [productId];
    let paramIndex = 2;

    if (deniedGroups.length > 0) {
      query += ` AND b1_grupo NOT IN(SELECT unnest($${paramIndex}:: varchar[])) `;
      queryParams.push(deniedGroups);
    }

    const result = await pool2.query(query, queryParams);
    const product = result.rows[0];

    // Fetch AI description from DB2 (description table)
    if (product) {
      try {
        const aiResult = await pool2.query(
          'SELECT description FROM description WHERE product_code = $1',
          [product.code]
        );
        if (aiResult.rows.length > 0) {
          product.ai_description = aiResult.rows[0].description;
        }
      } catch (err) {
        console.error('Error fetching AI description:', err);
      }
    }

    if (isRedisReady() && product) {
      try {
        // Cache for 5 minutes
        await redisClient.set(cacheKey, JSON.stringify(product), { EX: 300 });
      } catch (err) {
        console.error('Redis error setting cache in findProductById:', err);
      }
    }

    return product;
  } catch (error) {
    console.error(`Error in findProductById for ID ${productId}: `, error);
    throw error;
  }
};

const findProductByCode = async (productCode, deniedGroups = []) => {
  const cacheKey = `product:code:${productCode}:denied:${JSON.stringify(deniedGroups.sort())}`;

  if (isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in findProductByCode:', err);
    }
  }

  try {
    let query = `
SELECT
id, b1_cod AS code, b1_desc AS description, da1_prcven AS price, sbm_desc AS brand,
  z02_descri AS capacity_description, b1_grupo AS product_group,
  stock_disp AS stock_disponible, stock_prev AS stock_de_seguridad, da1_moeda AS moneda,
  sbz_desc AS indicator_description, b1_qe AS pack_quantity
      FROM products
      WHERE b1_cod = $1 AND da1_prcven > 0 AND b1_desc IS NOT NULL
    `;
    let queryParams = [productCode];
    let paramIndex = 2;

    if (deniedGroups.length > 0) {
      query += ` AND b1_grupo NOT IN(SELECT unnest($${paramIndex}:: varchar[])) `;
      queryParams.push(deniedGroups);
    }

    const result = await pool2.query(query, queryParams);
    const product = result.rows[0];

    // Fetch AI description from DB2 (description table)
    if (product) {
      try {
        const aiResult = await pool2.query(
          'SELECT description FROM description WHERE product_code = $1',
          [product.code]
        );
        if (aiResult.rows.length > 0) {
          product.ai_description = aiResult.rows[0].description;
        }
      } catch (err) {
        console.error('Error fetching AI description:', err);
      }
    }

    if (isRedisReady() && product) {
      try {
        // Cache for 5 minutes
        await redisClient.set(cacheKey, JSON.stringify(product), { EX: 300 });
      } catch (err) {
        console.error('Redis error setting cache in findProductByCode:', err);
      }
    }

    return product;
  } catch (error) {
    console.error(`Error in findProductByCode for Code ${productCode}: `, error);
    throw error;
  }
};

const findOffers = async (offerData, deniedGroups = []) => {
  try {
    if (offerData.length === 0) {
      return [];
    }

    // Use codes
    const offerProductCodes = offerData.map(o => o.product_code).filter(c => c != null);
    const offerDetailsMap = new Map(offerData.map(o => [o.product_code, o]));

    let query = `
SELECT
id, b1_cod AS code, b1_desc AS description, da1_prcven AS price, sbm_desc AS brand,
  z02_descri AS capacity_description, da1_moeda AS moneda, cotizacion, b1_grupo AS product_group,
  stock_disp AS stock_disponible, stock_prev AS stock_de_seguridad,
  sbz_desc AS indicator_description, b1_qe AS pack_quantity
      FROM products
      WHERE b1_cod = ANY($1:: varchar[]) AND da1_prcven > 0 AND b1_desc IS NOT NULL
    `;
    let queryParams = [offerProductCodes];
    let paramIndex = 2;

    if (deniedGroups.length > 0) {
      query += ` AND b1_grupo NOT IN(SELECT unnest($${paramIndex}:: varchar[]))`;
      queryParams.push(deniedGroups);
    }

    query += ` ORDER BY b1_desc ASC; `;

    const result = await pool2.query(query, queryParams);

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
    'SELECT COUNT(*) FROM products WHERE b1_grupo = $1 AND da1_prcven > 0 AND b1_desc IS NOT NULL';
  let dataQuery = `
SELECT
id, b1_cod AS code, b1_desc AS description, da1_prcven AS price, b1_grupo AS brand,
  z02_descri AS capacity_description, da1_moeda AS moneda, cotizacion, b1_grupo AS product_group,
  stock_disp AS stock_disponible, stock_prev AS stock_de_seguridad,
  sbz_desc AS indicator_description, b1_qe AS pack_quantity
    FROM products
    WHERE b1_grupo = $1 AND da1_prcven > 0 AND b1_desc IS NOT NULL
  `;

  // Add deniedProductCodes filter
  let queryParams = [groupCode];
  let paramIndex = 2;

  // Add allowedProductCodes filter
  if (allowedProductCodes && allowedProductCodes.length > 0) {
    const allowedQuery = ` AND b1_cod = ANY($${paramIndex}:: varchar[])`;
    countQuery += allowedQuery;
    dataQuery += allowedQuery;
    queryParams.push(allowedProductCodes);
    paramIndex++;
  }

  // (OPTIMIZACIÃ“N) EjecuciÃ³n en paralelo
  const [countResult, dataResult] = await Promise.all([
    pool2.query(countQuery, queryParams),
    pool2.query(dataQuery + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1} `, [...queryParams, limit, offset])
  ]);

  const totalProducts = parseInt(countResult.rows[0].count, 10);
  const products = dataResult.rows;

  let groupName = '';
  if (products.length > 0) {
    groupName = products[0].brand;
  } else {
    const groupNameResult = await pool2.query(
      'SELECT b1_grupo AS brand FROM products WHERE b1_grupo = $1 LIMIT 1',
      [groupCode]
    );
    if (groupNameResult.rows.length > 0) {
      groupName = groupNameResult.rows[0].brand;
    }
  }

  return { products, totalProducts, groupName };
};

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
    const codesResult = await pool2.query('SELECT b1_cod AS code, id FROM products WHERE id = ANY($1::int[])', [productIds]);
    const codes = codesResult.rows.map(r => r.code);
    const codeToIdMap = new Map(codesResult.rows.map(r => [r.code, r.id]));

    const query = `
      SELECT product_code 
      FROM product_price_snapshots 
      WHERE product_code = ANY($1:: varchar[]) 
        AND last_change_timestamp >= NOW() - INTERVAL '7 days'
    `;
    const result = await pool2.query(query, [codes]);

    // Map back to IDs
    return result.rows.map(row => codeToIdMap.get(row.product_code)).filter(id => id != null);
  } catch (error) {
    console.error('Error in getRecentlyChangedProducts:', error);
    return [];
  }
};

const toggleProductNewReleaseStatus = async (productId, productCode, status) => {
  try {
    const existingEntry = await pool2.query(
      'SELECT product_code FROM product_new_release_status WHERE product_code = $1',
      [productCode]
    );

    if (existingEntry.rows.length > 0) {
      await pool2.query(
        'UPDATE product_new_release_status SET is_new_release = $1, updated_at = CURRENT_TIMESTAMP WHERE product_code = $2',
        [status, productCode]
      );
    } else {
      await pool2.query(
        'INSERT INTO product_new_release_status (product_id, product_code, is_new_release) VALUES ($1, $2, $3)',
        [productId, productCode, status]
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Error in toggleProductNewReleaseStatus:', error);
    throw error;
  }
};

const updateProductNewReleaseDetails = async (productCode, details) => {
  const { custom_title, custom_description, custom_image_url } = details;
  try {
    const result = await pool2.query(
      `UPDATE product_new_release_status 
       SET custom_title = $1, custom_description = $2, custom_image_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE product_code = $4
       RETURNING *`,
      [custom_title, custom_description, custom_image_url, productCode]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateProductNewReleaseDetails:', error);
    throw error;
  }
};

const updateProductOfferDetails = async (productId, details) => {
  const { custom_title, custom_description, custom_image_url } = details;
  try {
    // 1. Get product code
    const productResult = await pool.query('SELECT b1_cod AS code FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) throw new Error('Product not found');
    const productCode = productResult.rows[0].code;

    // 2. Update in DB2
    const result = await pool2.query(
      `UPDATE product_offer_status 
       SET custom_title = $1, custom_description = $2, custom_image_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE product_code = $4
RETURNING * `,
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
  const cacheKey = 'carousel:accessories';

  if (isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in findCarouselAccessories:', err);
    }
  }

  try {
    const idsResult = await pool2.query('SELECT product_code FROM carousel_accessories');
    const productCodes = idsResult.rows.map(row => row.product_code);

    if (productCodes.length === 0) return [];

    const productsQuery = `
      SELECT id, b1_cod as code, b1_desc as description, da1_prcven as price, b1_grupo as brand, z02_descri as capacity_description, b1_grupo as product_group, stock_disp as stock_disponible, stock_prev as stock_de_seguridad
      FROM products
      WHERE b1_cod = ANY($1:: varchar[])
  `;
    const productsResult = await pool2.query(productsQuery, [productCodes]);
    const result = productsResult.rows;

    if (isRedisReady()) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 3600 }); // 1 hour TTL
      } catch (err) {
        console.error('Redis error setting cache in findCarouselAccessories:', err);
      }
    }

    return result;
  } catch (error) {
    console.error('Error in findCarouselAccessories:', error);
    throw error;
  }
};

const addCarouselAccessory = async (productId) => {
  try {
    const productResult = await pool2.query('SELECT b1_cod as code FROM products WHERE id = $1', [productId]);
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
    const productResult = await pool2.query('SELECT b1_cod as code FROM products WHERE id = $1', [productId]);
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
  const cacheKey = 'carousel:groups';

  if (isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in findCarouselGroups:', err);
    }
  }

  try {
    const result = await pool2.query('SELECT * FROM carousel_product_groups WHERE is_active = true ORDER BY display_order ASC');
    const rows = result.rows;

    if (isRedisReady()) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 3600 }); // 1 hour TTL
      } catch (err) {
        console.error('Redis error setting cache in findCarouselGroups:', err);
      }
    }

    return rows;
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
      SELECT id, b1_cod as code, b1_desc as description, da1_prcven as price, sbm_desc as brand, z02_descri as capacity_description, b1_grupo as product_group, stock_disp as stock_disponible, stock_prev as stock_de_seguridad
      FROM products
      WHERE b1_cod = ANY($1:: varchar[])
  `;
    const productsResult = await pool2.query(productsQuery, [productCodes]);
    return productsResult.rows;
  } catch (error) {
    console.error('Error in findCustomCollectionProducts:', error);
    throw error;
  }
};

const addCustomGroupItem = async (groupId, productId) => {
  try {
    const productResult = await pool2.query('SELECT b1_cod as code FROM products WHERE id = $1', [productId]);
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
    const productResult = await pool2.query('SELECT b1_cod as code FROM products WHERE id = $1', [productId]);
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
 * Obtiene las URLs de imÃ¡genes para una lista de productos desde DB2.
 * @param {string[]} productCodes - Array de cÃ³digos de productos.
 * @returns {Promise<object[]>} - Array de objetos { product_code, image_url }.
 */
const getProductImages = async (productCodes) => {
  if (!productCodes || productCodes.length === 0) return [];

  try {
    const query = `
      SELECT product_code, image_url 
      FROM product_images 
      WHERE product_code = ANY($1:: varchar[])
  `;
    const result = await pool2.query(query, [productCodes]);
    return result.rows;
  } catch (error) {
    console.error('Error in getProductImages:', error);
    return [];
  }
};

/**
 * Obtiene todos los CÃ³digos de productos que tienen imÃ¡genes en DB2.
 * @returns {Promise<string[]>} - Array de cÃ³digos de productos.
 */
const getAllProductImageCodes = async () => {
  const cacheKey = 'products:all_image_codes';

  if (isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in getAllProductImageCodes:', err);
    }
  }

  try {
    const query = 'SELECT DISTINCT product_code FROM product_images';
    const result = await pool2.query(query);
    const codes = result.rows.map(row => row.product_code);

    if (isRedisReady()) {
      // Cache for 1 hour (3600 seconds) - List of images changes infrequently
      await redisClient.set(cacheKey, JSON.stringify(codes), { EX: 3600 });
    }

    return codes;
  } catch (error) {
    console.error('Error in getAllProductImageCodes:', error);
    return [];
  }
};

const getGlobalDeniedProducts = async () => {
  const cacheKey = 'products:global_denied';

  if (isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in getGlobalDeniedProducts:', err);
    }
  }

  try {
    const query = 'SELECT product_code FROM global_product_permissions';
    const result = await pool2.query(query);
    const codes = result.rows.map(row => row.product_code);

    if (isRedisReady()) {
      // Cache for 1 hour
      await redisClient.set(cacheKey, JSON.stringify(codes), { EX: 3600 });
    }

    return codes;
  } catch (error) {
    console.error('Error in getGlobalDeniedProducts:', error);
    if (error.code === '42P01') {
      console.warn('[WARNING] Table global_product_permissions does not exist.');
      // Cache empty array to avoid repeated DB errors if table is missing
      if (isRedisReady()) {
        await redisClient.set(cacheKey, JSON.stringify([]), { EX: 600 });
      }
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
      WHERE code = ANY($1:: varchar[])
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

const updateProductAiDescription = async (productCode, description) => {
  try {
    // Check if record exists in description table
    const checkQuery = 'SELECT product_code FROM description WHERE product_code = $1';
    const checkResult = await pool2.query(checkQuery, [productCode]);

    if (checkResult.rows.length > 0) {
      // Update existing
      const updateQuery = `
          UPDATE description 
          SET description = $1, updated_at = CURRENT_TIMESTAMP
          WHERE product_code = $2
          RETURNING *;
        `;
      const result = await pool2.query(updateQuery, [description, productCode]);
      return result.rows[0];
    } else {
      // Insert new
      const insertQuery = `
          INSERT INTO description (product_code, description, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          RETURNING *;
        `;
      const result = await pool2.query(insertQuery, [productCode, description]);
      return result.rows[0];
    }
  } catch (error) {
    console.error('Error in updateProductAiDescription:', error);
    throw error;
  }
};

const findProductsWithImagesNoDescription = async (limit = 50) => {
  try {
    // 1. Get all product codes that already have a description (DB2)
    const descResult = await pool2.query('SELECT product_code FROM description');
    const existingDescCodes = new Set(descResult.rows.map(row => row.product_code));

    // 2. Get all product codes that have images (DB2)
    const imagesResult = await pool2.query(
      "SELECT DISTINCT product_code FROM product_images WHERE image_url IS NOT NULL AND image_url != ''"
    );
    const imageCodes = imagesResult.rows.map(row => row.product_code);

    // 3. Filter codes: Have Image AND No Description
    let codesToProcess = imageCodes.filter(code => !existingDescCodes.has(code));

    if (codesToProcess.length === 0) {
      return [];
    }

    // Apply limit
    if (limit > 0) {
      codesToProcess = codesToProcess.slice(0, limit);
    }

    // 4. Fetch product details from DB1 for these codes
    // We need to handle the IN clause dynamically
    const params = codesToProcess.map((_, index) => `$${index + 1}`);
    const productsQuery = `
      SELECT * FROM products 
      WHERE code IN (${params.join(',')})
    `;

    const productsResult = await pool.query(productsQuery, codesToProcess);
    const products = productsResult.rows;

    // 5. Fetch image URLs for these codes from DB2
    const imagesQuery = `
      SELECT product_code, image_url 
      FROM product_images 
      WHERE product_code = ANY($1::varchar[])
    `;
    const imagesData = await pool2.query(imagesQuery, [codesToProcess]);

    // Create a map for quick lookup
    const imageMap = new Map();
    imagesData.rows.forEach(row => {
      if (row.image_url) {
        imageMap.set(row.product_code, row.image_url);
      }
    });

    // Merge image URL into product objects
    return products.map(p => ({
      ...p,
      imageUrl: imageMap.get(p.code) || null
    }));
  } catch (error) {
    console.error('Error in findProductsWithImagesNoDescription:', error);
    throw error;
  }
};


const findUniqueBrands = async (deniedGroups = []) => {
  try {
    let query = `
      SELECT DISTINCT TRIM(sbm_desc) AS brand 
      FROM products 
      WHERE sbm_desc IS NOT NULL AND sbm_desc != ''
    `;
    let queryParams = [];
    let paramIndex = 1;

    if (deniedGroups.length > 0) {
      query += ` AND b1_grupo NOT IN(SELECT unnest($${paramIndex}::varchar[])) `;
      queryParams.push(deniedGroups);
      paramIndex++;
    }

    query += ' ORDER BY brand ASC';

    // Ensure we use pool2 for the new DB
    const result = await pool2.query(query, queryParams);
    return result.rows.map(row => row.brand);
  } catch (error) {
    console.error('Error in findUniqueBrands:', error);
    throw error;
  }
};

module.exports = {
  findProducts,
  findAccessories,
  findProductGroupsDetails,
  findProductById,
  findProductByCode,
  findUniqueBrands, // Exporting the actual function
  getOnOfferData,
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
  updateProductAiDescription,
  findProductsWithImagesNoDescription,
  invalidatePermissionsCache,
  // New Releases
  getNewReleasesData,
  getNewReleasesProductCodes,
  toggleProductNewReleaseStatus,
  updateProductNewReleaseDetails,
};
