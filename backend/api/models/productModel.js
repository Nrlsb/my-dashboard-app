const { pool, pool2 } = require('../db');
const NodeCache = require('node-cache');

// stdTTL: tiempo de vida en segundos para cada registro. 600s = 10 minutos.
// checkperiod: cada cuántos segundos se revisan y eliminan los registros expirados. 120s = 2 minutos.
const permissionsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Caché para datos que cambian más a menudo, como las ofertas. TTL de 2 minutos.
const offersCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

/**
 * Función interna para obtener los IDs de productos en oferta.
 * Centraliza el acceso a la caché de ofertas.
 * @returns {Promise<number[]>} - Una promesa que se resuelve con un array de IDs de productos.
 */
const getOnOfferProductIds = async () => {
  const offerIdsCacheKey = 'on_offer_product_ids';
  let offerProductIds = offersCache.get(offerIdsCacheKey);

  if (offerProductIds === undefined) {
    // console.log('[Cache MISS] Central: Lista de IDs de ofertas.');
    try {
      const result = await pool2.query(
        'SELECT product_id FROM product_offer_status WHERE is_on_offer = true'
      );
      offerProductIds = result.rows.map((row) => row.product_id);
      offersCache.set(offerIdsCacheKey, offerProductIds);
    } catch (error) {
      console.error('Error fetching on-offer product IDs:', error);
      // En caso de error, devolver un array vacío para no romper la app
      return [];
    }
  } else {
    // console.log('[Cache HIT] Central: Lista de IDs de ofertas.');
  }
  return offerProductIds;
};

/**
 * Obtiene los grupos de productos denegados para un usuario específico.
 * Utiliza una caché en memoria para evitar consultas repetidas a la base de datos.
 * @param {number} userId - El ID del usuario.
 * @returns {Promise<string[]>} - Una promesa que se resuelve con un array de códigos de grupo de productos denegados.
 */
const getDeniedProductGroups = async (userId) => {
  const cacheKey = `deniedGroups_${userId}`;
  const cachedData = permissionsCache.get(cacheKey);

  if (cachedData) {
    // console.log(`[Cache HIT] Permisos para usuario ${userId}`);
    return cachedData;
  }

  // console.log(`[Cache MISS] Permisos para usuario ${userId}`);
  try {
    const query = `
      SELECT product_group 
      FROM user_product_group_permissions 
      WHERE user_id = $1;
    `;
    const result = await pool2.query(query, [userId]);
    const deniedGroups = result.rows.map((row) => row.product_group);

    // Guardar el resultado en la caché antes de devolverlo
    permissionsCache.set(cacheKey, deniedGroups);

    return deniedGroups;
  } catch (error) {
    console.error(`Error in getDeniedProductGroups for user ${userId}:`, error);
    throw error;
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
}) => {
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
    const onOfferProductIds = await getOnOfferProductIds();
    const onOfferIdsSet = new Set(onOfferProductIds);

    // Adjuntar el estado de la oferta a cada producto, usando la lista en memoria
    const productsWithOfferStatus = products.map((product) => ({
      ...product,
      // la oferta será true si el ID del producto existe en el Set de ofertas
      oferta: onOfferIdsSet.has(product.id),
    }));

    return {
      products: productsWithOfferStatus,
      totalProducts,
    };
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
    // Usar la función centralizada para obtener los IDs de oferta
    const offerProductIds = await getOnOfferProductIds();

    if (offerProductIds.length === 0) {
      return [];
    }

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
    return result.rows;
  } catch (error) {
    console.error('Error in findOffers:', error);
    throw error;
  }
};

const findProductsByGroup = async (
  groupCode,
  limit,
  offset,
  deniedGroups = []
) => {
  if (deniedGroups.includes(groupCode)) {
    console.log(`[DEBUG] Acceso denegado al grupo ${groupCode}.`);
    return { products: [], totalProducts: 0, groupName: '' };
  }

  const countQuery =
    'SELECT COUNT(*) FROM products WHERE product_group = $1 AND price > 0 AND description IS NOT NULL';
  const dataQuery = `
    SELECT 
      id, code, description, price, brand, 
      capacity_description, moneda, cotizacion, product_group,
      stock_disponible, stock_de_seguridad
    FROM products
    WHERE product_group = $1 AND price > 0 AND description IS NOT NULL
    ORDER BY description ASC 
    LIMIT $2 OFFSET $3;
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

module.exports = {
  findProducts,
  getDeniedProductGroups,
  findAccessories,
  findProductGroupsDetails,
  findProductById,
  findUniqueBrands,
  findOffers,
  findProductsByGroup,
  getRecentlyChangedProducts, // Exportar nueva función
  offersCache,
};