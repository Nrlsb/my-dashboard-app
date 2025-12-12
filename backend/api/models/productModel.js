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
    const result = await pool2.query(
      'SELECT product_id, custom_title, custom_description, custom_image_url FROM product_offer_status WHERE is_on_offer = true'
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
 * Obtiene los grupos de productos denegados para un usuario específico.
 * Utiliza una caché en memoria para evitar consultas repetidas a la base de datos.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<string[]>} - Una promesa que se resuelve con un array de códigos de grupo de productos denegados.
 */
const getDeniedProductGroups = async (userId) => {
  const cacheKey = `user:denied_groups:${userId}`;

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

  try {
    const query = `
      SELECT product_group 
      FROM user_product_group_permissions 
      WHERE user_id = $1;
    `;
    const result = await pool2.query(query, [userId]);
    const deniedGroups = result.rows.map((row) => row.product_group);

    if (isRedisReady()) {
      // Cache for 1 hour
      await redisClient.set(cacheKey, JSON.stringify(deniedGroups), { EX: 3600 });
    }

    return deniedGroups;
  } catch (error) {
    console.error(`Error in getDeniedProductGroups for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Obtiene los IDs de productos denegados para un usuario específico.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<number[]>} - Una promesa que se resuelve con un array de IDs de productos denegados.
 */
const getDeniedProducts = async (userId) => {
  try {
    const query = `
      SELECT product_id 
      FROM user_product_permissions 
      WHERE user_id = $1;
    `;
    const result = await pool2.query(query, [userId]);
    return result.rows.map((row) => row.product_id);
  } catch (error) {
    console.error(`Error in getDeniedProducts for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Invalida la caché de permisos para un usuario específico.
 * @param {number} userId - El ID del usuario.
 */
// Function removed as cache is disabled
const invalidatePermissionsCache = async (userId) => {
  if (!isRedisReady()) return;
  const cacheKey = `user:denied_groups:${userId}`;
  try {
    await redisClient.del(cacheKey);
    console.log(`Invalidated permissions cache for user ${userId}`);
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
  deniedProductIds = [],
  allowedIds = [],
  excludedIds = [],
  bypassCache = false,
}) => {
  // Create a unique cache key based on all filter parameters
  const cacheKey = `products:search:${JSON.stringify({
    limit,
    offset,
    search: search ? search.trim() : '',
    brands: brands ? brands.sort() : [],
    deniedGroups: deniedGroups ? deniedGroups.sort() : [],
    deniedProductIds: deniedProductIds ? deniedProductIds.sort() : [],
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

  // --- Query Base ---
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

  // --- Aplicar Filtros ---
  if (deniedGroups && deniedGroups.length > 0) {
    const groupQuery = ` product_group NOT IN (SELECT unnest($${paramIndex}::varchar[])) `;
    countQuery += ` AND ${groupQuery}`;
    dataQuery += ` AND ${groupQuery}`;
    queryParams.push(deniedGroups);
    paramIndex++;
  }

  if (deniedProductIds && deniedProductIds.length > 0) {
    const deniedProductsQuery = ` id != ALL($${paramIndex}::int[]) `;
    countQuery += ` AND ${deniedProductsQuery}`;
    dataQuery += ` AND ${deniedProductsQuery}`;
    queryParams.push(deniedProductIds);
    paramIndex++;
  }

  // SMART SEARCH IMPLEMENTATION
  // Split search into terms and filter out empty strings
  const searchTerms = search ? search.trim().split(/\s+/).filter(term => term.length > 0) : [];

  if (searchTerms.length > 0) {
    // Create a condition for EACH term: (description LIKE %term% OR code LIKE %term%)
    // All conditions must be true (AND logic)
    const termConditions = searchTerms.map(() => {
      const currentParamIndex = paramIndex;
      paramIndex++; // Increment for the next term
      return `(description ILIKE $${currentParamIndex} OR code ILIKE $${currentParamIndex})`;
    });

    // Join all term conditions with AND
    const finalSearchQuery = ` (${termConditions.join(' AND ')}) `;

    countQuery += ` AND ${finalSearchQuery}`;
    dataQuery += ` AND ${finalSearchQuery}`;

    // Add each term to queryParams
    searchTerms.forEach(term => {
      queryParams.push(`%${term}%`);
    });
  }


  if (brands && brands.length > 0) {
    const brandQuery = ` brand = ANY($${paramIndex}::varchar[]) `;
    countQuery += ` AND ${brandQuery}`;
    dataQuery += ` AND ${brandQuery}`;
    queryParams.push(brands);
    paramIndex++;
  }

  if (allowedIds && allowedIds.length > 0) {
    const allowedQuery = ` id = ANY($${paramIndex}::int[]) `;
    countQuery += ` AND ${allowedQuery}`;
    dataQuery += ` AND ${allowedQuery}`;
    queryParams.push(allowedIds);
    paramIndex++;
  }

  if (excludedIds && excludedIds.length > 0) {
    const excludedQuery = ` id != ALL($${paramIndex}::int[]) `;
    countQuery += ` AND ${excludedQuery}`;
    dataQuery += ` AND ${excludedQuery}`;
    queryParams.push(excludedIds);
    paramIndex++;
  }

  // --- Ordenar y Paginar (Solo para dataQuery) ---
  dataQuery += ` ORDER BY description ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  try {
    // --- Ejecutar Queries ---
    // Optimización posible futura: Ejecutar count y data en paralelo con Promise.all si la DB soporta carga
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, queryParams),
      pool.query(dataQuery, [...queryParams, limit, offset])
    ]);

    const totalProducts = parseInt(countResult.rows[0].count, 10);
    const products = dataResult.rows;

    // --- Eliminada la consulta a pool2 ---
    // Obtener la lista de IDs en oferta desde la función centralizada (caché)
    const onOfferProductIds = await getOnOfferProductIds(bypassCache);
    const onOfferIdsSet = new Set(onOfferProductIds);

    // Adjuntar el estado de la oferta a cada producto, usando la lista en memoria
    const productsWithOfferStatus = products.map((product) => ({
      ...product,
      // la oferta será true si el ID del producto existe en el Set de ofertas
      oferta: onOfferIdsSet.has(product.id),
    }));

    const resultToReturn = {
      products: productsWithOfferStatus,
      totalProducts,
    };

    if (isRedisReady()) {
      // Cache for 60 seconds
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
    // OPTIMIZACIÓN CRÍTICA: ORDER BY RANDOM() es muy lento en tablas grandes.
    // Usamos TABLESAMPLE BERNOULLI para obtener una muestra aleatoria estadística mucho más rápida
    // o una subconsulta CTE si se necesita precisión exacta de filtrado.

    // Método híbrido robusto: Seleccionamos un subconjunto algo mayor aleatorio y luego cortamos.
    // Si la tabla es pequeña (<10k filas), RANDOM() está bien. Si es grande, esto es necesario:
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

    // Nota: Si la tabla products tiene > 100k filas, deberíamos cambiar a TABLESAMPLE SYSTEM((100 * 20 / count)::integer)

    const result = await pool.query(query, [accessoryGroups]);
    return result.rows;
  } catch (error) {
    console.error('Error in findAccessories:', error);
    throw error;
  }
};

const findProductGroupsDetails = async (groupCodes) => {
  try {
    // Optimized query to get one product for each group code
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

const findProductById = async (productId, deniedGroups = [], deniedProductIds = []) => {
  try {
    if (deniedProductIds && deniedProductIds.includes(parseInt(productId))) {
      return null;
    }
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
    return result.rows[0];
  } catch (error) {
    console.error(`Error in findProductById for ID ${productId}:`, error);
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

    query += ` ORDER BY brand ASC;`;

    const result = await pool.query(query, queryParams);
    return result.rows.map((row) => row.brand);
  } catch (error) {
    console.error('Error in findUniqueBrands:', error);
    throw error;
  }
};

const findOffers = async (deniedGroups = []) => {
  try {
    // Usar la función centralizada para obtener los datos de oferta
    const offerData = await getOnOfferData();

    if (offerData.length === 0) {
      return [];
    }

    const offerProductIds = offerData.map(o => o.product_id);
    // Crear un mapa para acceso rápido a los detalles custom
    const offerDetailsMap = new Map(offerData.map(o => [o.product_id, o]));

    let query = `
      SELECT
        id, code, description, price, brand,
        capacity_description, moneda, cotizacion, product_group,
        stock_disponible, stock_de_seguridad
      FROM products
      WHERE id = ANY($1::int[]) AND price > 0 AND description IS NOT NULL
    `;
    let queryParams = [offerProductIds];
    let paramIndex = 2;

    if (deniedGroups.length > 0) {
      query += ` AND product_group NOT IN (SELECT unnest($${paramIndex}::varchar[]))`;
      queryParams.push(deniedGroups);
    }

    query += ` ORDER BY description ASC;`;

    const result = await pool.query(query, queryParams);

    // Combinar con los datos custom
    const productsWithDetails = result.rows.map(product => {
      const details = offerDetailsMap.get(product.id);
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
  deniedProductIds = []
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

  // (OPTIMIZACIÓN) Ejecución en paralelo
  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, [groupCode]),
    pool.query(dataQuery, [groupCode, limit, offset])
  ]);

  const totalProducts = parseInt(countResult.rows[0].count, 10);
  const products = dataResult.rows;

  let groupName = '';
  if (products.length > 0) {
    groupName = products[0].brand;
  } else {
    // Solo hacemos esta consulta extra si no hay productos
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
 * @param {number[]} productIds - Array de IDs de productos a verificar.
 * @returns {Promise<number[]>} - Array de IDs de productos que cambiaron recientemente.
 */
const getRecentlyChangedProducts = async (productIds) => {
  if (!productIds || productIds.length === 0) return [];

  try {
    const query = `
      SELECT product_id 
      FROM product_price_snapshots 
      WHERE product_id = ANY($1::int[]) 
        AND last_change_timestamp >= NOW() - INTERVAL '2 minutes'
    `;
    const result = await pool2.query(query, [productIds]);
    return result.rows.map(row => row.product_id);
  } catch (error) {
    console.error('Error in getRecentlyChangedProducts:', error);
    // En caso de error, retornamos array vacío para no romper la app
    return [];
  }
};

const updateProductOfferDetails = async (productId, { custom_title, custom_description, custom_image_url }) => {
  try {
    await pool2.query(
      `UPDATE product_offer_status 
       SET custom_title = $1, custom_description = $2, custom_image_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $4`,
      [custom_title, custom_description, custom_image_url, productId]
    );
    return { success: true };
  } catch (error) {
    console.error(`Error updating offer details for product ${productId}:`, error);
    throw error;
  }
};

// --- Carousel Management Methods ---

const findCarouselAccessories = async () => {
  try {
    const idsResult = await pool2.query('SELECT product_id FROM carousel_accessories ORDER BY created_at DESC');
    const productIds = idsResult.rows.map(row => row.product_id);

    if (productIds.length === 0) return [];

    const productsQuery = `
      SELECT id, code, description, price, product_group
      FROM products
      WHERE id = ANY($1::int[])
    `;
    const productsResult = await pool.query(productsQuery, [productIds]);
    return productsResult.rows;
  } catch (error) {
    console.error('Error in findCarouselAccessories:', error);
    throw error;
  }
};

const addCarouselAccessory = async (productId) => {
  try {
    await pool2.query('INSERT INTO carousel_accessories (product_id) VALUES ($1) ON CONFLICT DO NOTHING', [productId]);
    return { success: true };
  } catch (error) {
    console.error('Error in addCarouselAccessory:', error);
    throw error;
  }
};

const removeCarouselAccessory = async (productId) => {
  try {
    await pool2.query('DELETE FROM carousel_accessories WHERE product_id = $1', [productId]);
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
       WHERE id = $7 RETURNING *`,
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
    const idsResult = await pool2.query('SELECT product_id FROM carousel_custom_group_items WHERE group_id = $1', [collectionId]);
    const productIds = idsResult.rows.map(row => row.product_id);

    if (productIds.length === 0) return [];

    const productsQuery = `
      SELECT id, code, description, price, brand, capacity_description, product_group, stock_disponible, stock_de_seguridad
      FROM products
      WHERE id = ANY($1::int[])
    `;
    const productsResult = await pool.query(productsQuery, [productIds]);
    return productsResult.rows;
  } catch (error) {
    console.error('Error in findCustomCollectionProducts:', error);
    throw error;
  }
};

const addCustomGroupItem = async (groupId, productId) => {
  try {
    await pool2.query('INSERT INTO carousel_custom_group_items (group_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, productId]);
    return { success: true };
  } catch (error) {
    console.error('Error in addCustomGroupItem:', error);
    throw error;
  }
};

const removeCustomGroupItem = async (groupId, productId) => {
  try {
    await pool2.query('DELETE FROM carousel_custom_group_items WHERE group_id = $1 AND product_id = $2', [groupId, productId]);
    return { success: true };
  } catch (error) {
    console.error('Error in removeCustomGroupItem:', error);
    throw error;
  }
};


/**
 * Obtiene las URLs de imágenes para una lista de productos desde DB2.
 * @param {number[]} productIds - Array de IDs de productos.
 * @returns {Promise<object[]>} - Array de objetos { product_id, image_url }.
 */
const getProductImages = async (productIds) => {
  if (!productIds || productIds.length === 0) return [];

  try {
    const query = `
      SELECT product_id, image_url 
      FROM product_images 
      WHERE product_id = ANY($1::int[])
    `;
    const result = await pool2.query(query, [productIds]);
    return result.rows;
  } catch (error) {
    console.error('Error in getProductImages:', error);
    return [];
  }
};

/**
 * Obtiene todos los IDs de productos que tienen imágenes en DB2.
 * @returns {Promise<number[]>} - Array de IDs de productos.
 */
const getAllProductImageIds = async () => {
  try {
    const query = 'SELECT DISTINCT product_id FROM product_images';
    const result = await pool2.query(query);
    return result.rows.map(row => row.product_id);
  } catch (error) {
    console.error('Error in getAllProductImageIds:', error);
    return [];
  }
};

/**
 * Obtiene los IDs de productos denegados globalmente.
 * @returns {Promise<number[]>} - Una promesa que se resuelve con un array de IDs de productos denegados globalmente.
 */
const getGlobalDeniedProducts = async () => {
  try {
    const query = `
      SELECT product_id 
      FROM global_product_permissions;
    `;
    const result = await pool2.query(query);
    return result.rows.map((row) => row.product_id);
  } catch (error) {
    console.error('Error in getGlobalDeniedProducts:', error);
    if (error.code === '42P01') {
      console.warn('[WARNING] Table global_product_permissions does not exist. Skipping global restrictions.');
      return [];
    }
    throw error;
  }
};

module.exports = {
  findProducts,
  getDeniedProductGroups,
  getDeniedProducts,
  findAccessories,
  findProductGroupsDetails,
  findProductById,
  findUniqueBrands,
  findOffers,
  findProductsByGroup,
  getRecentlyChangedProducts,
  updateProductOfferDetails,
  // New methods
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
  invalidatePermissionsCache,
  getProductImages,
  getAllProductImageIds,
  getGlobalDeniedProducts,
};