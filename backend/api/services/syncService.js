const { pool2 } = require('../db');
const protheusService = require('./protheusService');
const logger = require('../utils/logger');
const EventEmitter = require('events');

class SyncEmitter extends EventEmitter { }
const syncEvents = new SyncEmitter();

// Helper to emit progress
const emitProgress = (message, percent = null, status = 'processing') => {
    syncEvents.emit('progress', { message, percent, status });
};

// Optimized Sync Service
// Helper to fetch and build map
const fetchDictionaryMap = async (fetchFunction, codeField, filters = []) => {
    try {
        const items = await fetchFunction();
        const map = new Map();
        for (const item of items) {
            map.set(item[codeField].trim(), item);
        }
        return map;
    } catch (error) {
        logger.error(`Error fetching dictionary for ${codeField}:`, error);
        return new Map();
    }
};

// Sync Products (SB1)
const syncProducts = async (emitCompletion = true) => {
    try {
        logger.info('Starting Product Sync...');
        emitProgress('Iniciando sincronización de productos...', 0);

        // 1. Fetch Dictionaries first
        logger.info('Fetching auxiliary data (Groups, Indicators, Capacities)...');
        emitProgress('Obteniendo datos auxiliares (Grupos, Indicadores)...', 5);

        // Groups: sbm_grupo -> sbm_desc
        const groupMap = await fetchDictionaryMap(protheusService.getProductGroups, 'sbm_grupo');
        // Capacities: z02_cod -> z02_descri
        const capacityMap = await fetchDictionaryMap(protheusService.getCapacities, 'z02_cod');

        // Indicators: bz_cod -> bz_estseg
        // Filter by filial '010100' client-side using streaming callback to save memory
        const indicatorMap = new Map();

        await protheusService.getIndicators(
            {}, // No server-side params since they are ignored
            (pageObjects) => {
                for (const item of pageObjects) {
                    indicatorMap.set(item.bz_cod.trim(), item);
                }
            }
        );

        logger.info(`Fetched Dictionaries: Groups=${groupMap.size}, Capacities=${capacityMap.size}, Indicators=${indicatorMap.size}`);

        // 2. Fetch Products
        emitProgress('Obteniendo productos desde Protheus...', 10);
        const products = await protheusService.getProducts();

        if (products.length === 0) {
            logger.warn('No products fetched from API.');
            emitProgress('No se encontraron productos.', 100, 'completed');
            return;
        }

        const client = await pool2.connect();
        try {
            await client.query('BEGIN');

            const BATCH_SIZE = 500;
            let processedCount = 0;
            const totalProducts = products.length;

            // Helper to process a batch
            const processBatch = async (batch) => {
                if (batch.length === 0) return;

                const values = [];
                const placeholders = [];
                let paramIndex = 1;

                // Parse Protheus date format "dd/mm/yyyy" or "  /  /  " to ISO or null
                // Parse Protheus date format "dd/mm/yyyy" or "dd/mm/yy" or "  /  /  " to ISO or null
                // Also handles "yyyy-mm-dd" and "yyyymmdd"
                const parseProtheusDate = (dateStr) => {
                    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '' || dateStr.includes('/  /')) return null;

                    const trimmed = dateStr.trim();

                    // Handle yyyymmdd (8 digits)
                    if (/^\d{8}$/.test(trimmed)) {
                        const year = trimmed.substring(0, 4);
                        const month = trimmed.substring(4, 6);
                        const day = trimmed.substring(6, 8);
                        return `${year}-${month}-${day}`;
                    }

                    // Handle yyyy-mm-dd
                    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                        return trimmed;
                    }

                    const parts = trimmed.split('/');
                    if (parts.length === 3) {
                        let year = parts[2];
                        if (year.length === 2) {
                            year = '20' + year;
                        }
                        // dd/mm/yyyy -> yyyy-mm-dd
                        return `${year}-${parts[1]}-${parts[0]}`;
                    }
                    return null;
                };

                for (const p of batch) {
                    // Prepare descriptions
                    let groupObj = groupMap.get((p.b1_grupo || '').trim());
                    let capObj = capacityMap.get((p.b1_xcapa || '').trim());

                    // Fallback
                    const groupDesc = groupObj ? groupObj.sbm_desc : (p.b1_grupo || '').trim();
                    const capacityDesc = capObj ? capObj.z02_descri : (p.b1_xcapa || '').trim();

                    // Indicators
                    const indicatorObj = indicatorMap.get((p.b1_cod || '').trim());
                    const indicatorDesc = indicatorObj ? indicatorObj.bz_estseg : null;

                    const inclusionDate = parseProtheusDate(p.b1_xdtincl);
                    const modificationDate = parseProtheusDate(p.b1_xdtmodi);

                    values.push(
                        p.b1_cod.trim(),
                        (p.b1_desc || '').trim(),
                        capacityDesc,
                        (p.b1_grupo || '').trim(),
                        groupDesc,
                        p.b1_ts ? p.b1_ts.trim() : null,
                        parseFloat(p.stock_disp || 0),
                        parseFloat(p.stock_prev || 0),
                        indicatorDesc,
                        p.b1_um ? p.b1_um.trim() : null,
                        p.b1_qe,
                        inclusionDate,
                        modificationDate
                    );

                    // $1, ... $13
                    const productPlaceholders = [];
                    for (let i = 0; i < 13; i++) {
                        productPlaceholders.push(`$${paramIndex++}`);
                    }
                    placeholders.push(`(${productPlaceholders.join(', ')}, NOW())`);
                }

                const query = `
                    INSERT INTO products (
                        b1_cod, b1_desc, z02_descri, b1_grupo, sbm_desc,
                        b1_ts, stock_disp, stock_prev, sbz_desc, b1_um, b1_qe,
                        inclusion_date, modification_date, last_synced_at
                    ) VALUES ${placeholders.join(', ')}
                    ON CONFLICT (b1_cod) DO UPDATE SET
                        b1_desc = EXCLUDED.b1_desc,
                        z02_descri = EXCLUDED.z02_descri,
                        b1_grupo = EXCLUDED.b1_grupo,
                        sbm_desc = EXCLUDED.sbm_desc,
                        b1_ts = EXCLUDED.b1_ts,
                        stock_disp = EXCLUDED.stock_disp,
                        stock_prev = EXCLUDED.stock_prev,
                        sbz_desc = EXCLUDED.sbz_desc,
                        b1_um = EXCLUDED.b1_um,
                        b1_qe = EXCLUDED.b1_qe,
                        inclusion_date = EXCLUDED.inclusion_date,
                        modification_date = EXCLUDED.modification_date,
                        last_synced_at = NOW()
                    WHERE
                        products.b1_desc IS DISTINCT FROM EXCLUDED.b1_desc OR
                        products.z02_descri IS DISTINCT FROM EXCLUDED.z02_descri OR
                        products.b1_grupo IS DISTINCT FROM EXCLUDED.b1_grupo OR
                        products.sbm_desc IS DISTINCT FROM EXCLUDED.sbm_desc OR
                        products.b1_ts IS DISTINCT FROM EXCLUDED.b1_ts OR
                        products.stock_disp IS DISTINCT FROM EXCLUDED.stock_disp OR
                        products.stock_prev IS DISTINCT FROM EXCLUDED.stock_prev OR
                        products.sbz_desc IS DISTINCT FROM EXCLUDED.sbz_desc OR
                        products.b1_um IS DISTINCT FROM EXCLUDED.b1_um OR
                        products.b1_qe IS DISTINCT FROM EXCLUDED.b1_qe OR
                        products.inclusion_date IS DISTINCT FROM EXCLUDED.inclusion_date OR
                        products.modification_date IS DISTINCT FROM EXCLUDED.modification_date
                `;

                await client.query(query, values);
            };

            // Chunk loop
            emitProgress('Guardando productos en base de datos...', 20);
            for (let i = 0; i < totalProducts; i += BATCH_SIZE) {
                const batch = products.slice(i, i + BATCH_SIZE);
                await processBatch(batch);
                processedCount += batch.length;

                // Calculate detailed progress 20-50%
                const progress = 20 + Math.round((processedCount / totalProducts) * 30);
                emitProgress(`Procesando productos... ${processedCount}/${totalProducts}`, progress);

                logger.info(`[SyncProducts] Upserted ${processedCount}/${totalProducts} products...`);
            }

            // 3. Delete products that are not in the fetched list (Cleanup)
            const syncedCodes = products.map(p => p.b1_cod.trim());
            if (syncedCodes.length > 0) {
                emitProgress('Limpiando productos obsoletos...', 50);
                // Optimization: Passing a huge array to ANY($1) is efficient.
                const deleteRes = await client.query(
                    'DELETE FROM products WHERE NOT (b1_cod = ANY($1))',
                    [syncedCodes]
                );
                if (deleteRes.rowCount > 0) {
                    logger.info(`Deleted ${deleteRes.rowCount} obsolete products from DB2.`);
                }
            }

            await client.query('COMMIT');
            logger.info(`Synced ${products.length} products (Basic Data + Descriptions).`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        // NOW FETCH PRICES (DA1)
        await syncPrices(emitCompletion);

    } catch (error) {
        logger.error('Error syncing products:', error);
        console.error('CRITICAL ERROR during syncProducts:', error); // Ensuring visibility
        emitProgress('Error en la sincronización de productos.', null, 'error');
    }
};

// --- Sequenced Price Sync Logic ---

// Phase 1: Update Products Table
const updateProductsTable = async (prices) => {
    logger.info('Phase 1: Updating Products Table with new prices...');
    emitProgress('Actualizando precios en productos...', 60);
    const client = await pool2.connect();
    try {
        await client.query('BEGIN');

        // Fetch current products state
        const productRes = await client.query('SELECT b1_cod, da1_prcven, da1_moeda FROM products');
        const productMap = new Map();
        productRes.rows.forEach(r => {
            const code = r.b1_cod.trim();
            productMap.set(code, {
                price: Number(r.da1_prcven || 0),
                moeda: Number(r.da1_moeda || 1)
            });
        });

        let productUpdates = 0;
        let unchangedCount = 0;
        const unchangedCodes = [];
        const BATCH_SIZE = 500;
        let processedCount = 0;
        const totalPrices = prices.length;

        for (const p of prices) {
            const code = p.da1_codpro.trim();
            const newPrice = Number(p.da1_prcven);
            const newMoeda = Number(p.da1_moeda);

            const currentProduct = productMap.get(code);
            let needsUpdate = false;

            if (!currentProduct) {
                needsUpdate = true;
            } else {
                const priceDiff = Math.abs(newPrice - currentProduct.price);
                const moedaDiff = newMoeda !== currentProduct.moeda;
                if (priceDiff > 0.01 || moedaDiff) {
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await client.query(
                    `UPDATE products 
                        SET da1_prcven = $1, da1_moeda = $2, last_synced_at = NOW()
                        WHERE b1_cod = $3`,
                    [newPrice, newMoeda, code]
                );
                productUpdates++;
            } else {
                unchangedCodes.push(code);
                unchangedCount++;
            }

            processedCount++;
            if (processedCount % BATCH_SIZE === 0) {
                await client.query('COMMIT');
                await client.query('BEGIN');

                // Progress 60-80%
                const progress = 60 + Math.round((processedCount / totalPrices) * 20);
                emitProgress(`Actualizando precios... ${processedCount}/${totalPrices}`, progress);
            }
        }

        // Bulk Touch Unchanged
        if (unchangedCodes.length > 0) {
            logger.info(`Touching ${unchangedCodes.length} unchanged products...`);
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < unchangedCodes.length; i += CHUNK_SIZE) {
                const chunk = unchangedCodes.slice(i, i + CHUNK_SIZE);
                await client.query(
                    'UPDATE products SET last_synced_at = NOW() WHERE b1_cod = ANY($1)',
                    [chunk]
                );
            }
        }

        await client.query('COMMIT');
        logger.info(`Phase 1 Complete: ${productUpdates} updates, ${unchangedCount} unchanged.`);

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// Phase 2: Update Price History
const updatePriceHistory = async (prices) => {
    logger.info('Phase 2: Updating Price History (Smart Comparison)...');
    emitProgress('Guardando historial de precios...', 80);
    const client = await pool2.connect();
    try {
        await client.query('BEGIN');

        // Fetch current snapshots
        const snapshotRes = await client.query('SELECT product_code, price FROM product_price_snapshots');
        const snapshotMap = new Map();
        snapshotRes.rows.forEach(r => {
            if (r.product_code) snapshotMap.set(r.product_code.trim(), Number(r.price));
        });

        let historyUpdates = 0;
        let historyInserts = 0;
        const BATCH_SIZE = 500;
        let processedCount = 0;
        const totalPrices = prices.length;

        for (const p of prices) {
            const code = p.da1_codpro.trim();
            const newPrice = Number(p.da1_prcven);
            const oldPriceSnapshot = snapshotMap.get(code);

            if (oldPriceSnapshot === undefined) {
                // New snapshot
                await client.query(
                    `INSERT INTO product_price_snapshots (product_code, price, last_change_timestamp, product_id)
                        VALUES ($1::text, $2, NOW(), (SELECT id FROM products WHERE b1_cod = $1::text LIMIT 1))
                        ON CONFLICT (product_id) DO UPDATE SET
                        price = EXCLUDED.price,
                        last_change_timestamp = NOW(),
                        product_code = EXCLUDED.product_code`,
                    [code, newPrice]
                );
                historyInserts++;
            } else if (Math.abs(newPrice - oldPriceSnapshot) > 0.01) {
                // Price changed
                await client.query(
                    `UPDATE product_price_snapshots
                        SET price = $1, last_change_timestamp = NOW()
                        WHERE product_code = $2`,
                    [newPrice, code]
                );
                historyUpdates++;
            }

            processedCount++;
            if (processedCount % BATCH_SIZE === 0) {
                await client.query('COMMIT');
                await client.query('BEGIN');

                // Progress 80-95%
                const progress = 80 + Math.round((processedCount / totalPrices) * 15);
                emitProgress(`Historial de precios... ${processedCount}/${totalPrices}`, progress);
            }
        }

        await client.query('COMMIT');
        logger.info(`Phase 2 Complete: ${historyInserts} new snapshots, ${historyUpdates} snapshot updates.`);

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// Sync Prices (DA1) - Coordinator
const syncPrices = async (emitCompletion = true) => {
    try {
        logger.info('Starting Price Sync...');
        emitProgress('Iniciando sincronización de precios...', 55);
        const prices = await protheusService.getPrices();

        if (prices.length === 0) {
            logger.warn('No prices fetched from API.');
            if (emitCompletion) {
                emitProgress('No se encontraron precios para actualizar.', 100, 'completed');
            }
            return;
        }

        // 1. Update Products Table first (The "Real Time" data)
        await updateProductsTable(prices);

        // 2. Then, perform History Update
        await updatePriceHistory(prices);

        logger.info(`Synced prices for ${prices.length} products successfully.`);
        if (emitCompletion) {
            emitProgress('Sincronización de productos y precios completada.', 100, 'completed');
        }

    } catch (error) {
        logger.error('Error syncing prices:', error);
        emitProgress('Error en sincronización de precios.', null, 'error');
    }
};

// Sync Clients (SA1)
const syncClients = async () => {
    try {
        logger.info('Starting Client Sync...');
        emitProgress('Obteniendo clientes...', 10);
        const clients = await protheusService.getClients();

        if (clients.length === 0) return;

        const client = await pool2.connect();
        try {
            await client.query('BEGIN');

            let processedCount = 0;
            const total = clients.length;

            for (const c of clients) {
                const existingRes = await client.query('SELECT id, vendedor_codigo FROM users WHERE a1_cod = $1', [c.a1_cod]);
                const newVendorCode = c.a1_vend ? c.a1_vend.trim() : null;

                // Helper to apply permissions
                const applyVendorPermissions = async (userId, vendorCode) => {
                    if (!vendorCode) return;
                    const vendorPerms = await client.query(
                        'SELECT product_group FROM vendor_product_group_permissions WHERE vendedor_code = $1',
                        [vendorCode]
                    );

                    if (vendorPerms.rows.length > 0) {
                        const values = [];
                        let placeholderIndex = 1;
                        vendorPerms.rows.forEach(row => {
                            values.push(userId, row.product_group);
                        });

                        // Construct bulk insert ( ($1, $2), ($3, $4) ... )
                        const placeholders = [];
                        for (let i = 0; i < vendorPerms.rows.length; i++) {
                            placeholders.push(`($${placeholderIndex++}, $${placeholderIndex++})`);
                        }

                        await client.query(
                            `INSERT INTO user_product_group_permissions (user_id, product_group) 
                              VALUES ${placeholders.join(', ')} 
                              ON CONFLICT (user_id, product_group) DO NOTHING`,
                            values
                        );
                        logger.info(`Applied ${vendorPerms.rows.length} vendor permissions to user ${userId}`);
                    }
                };

                if (existingRes.rows.length > 0) {
                    const existingUser = existingRes.rows[0];
                    const oldVendorCode = existingUser.vendedor_codigo ? existingUser.vendedor_codigo.trim() : null;

                    await client.query(
                        `UPDATE users SET 
                    full_name = $1, email = $2, vendedor_codigo = $3, 
                    a1_cgc = $4, a1_tel = $5, a1_endereco = $6, last_synced_at = NOW()
                 WHERE a1_cod = $7`,
                        [
                            (c.a1_nome || '').trim(),
                            (c.a1_email || '').trim(),
                            newVendorCode,
                            (c.a1_cgc || '').trim(),
                            (c.a1_xtel1 || '').trim(),
                            `${(c.a1_end || '').trim()}, ${(c.a1_mun || '').trim()}, ${(c.a1_est || '').trim()}`,
                            c.a1_cod.trim()
                        ]
                    );

                    // If vendor changed, apply new vendor's permissions (Additive only to avoid data loss?)
                    // Requirement: "Ensure... updated clients also inherit".
                    // If I assume "inherit" means "GET defaults", then yes.
                    if (newVendorCode && newVendorCode !== oldVendorCode) {
                        logger.info(`Vendor changed for user ${existingUser.id} (${oldVendorCode} -> ${newVendorCode}). Applying new permissions.`);
                        await applyVendorPermissions(existingUser.id, newVendorCode);
                    }

                } else {
                    const insertRes = await client.query(
                        `INSERT INTO users (
                    a1_cod, a1_loja, full_name, email, 
                    vendedor_codigo, a1_cgc, a1_tel, a1_endereco, last_synced_at, is_admin
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), false) RETURNING id`,
                        [
                            c.a1_cod.trim(),
                            c.a1_loja,
                            (c.a1_nome || '').trim(),
                            (c.a1_email || '').trim(),
                            newVendorCode,
                            (c.a1_cgc || '').trim(),
                            (c.a1_xtel1 || '').trim(),
                            `${(c.a1_end || '').trim()}, ${(c.a1_mun || '').trim()}, ${(c.a1_est || '').trim()}`
                        ]
                    );

                    const newUserId = insertRes.rows[0].id;
                    if (newVendorCode) {
                        await applyVendorPermissions(newUserId, newVendorCode);
                    }
                }

                processedCount++;
                if (processedCount % 50 === 0) {
                    emitProgress(`Sincronizando clientes... ${processedCount}/${total}`, null);
                }
            }

            // 3. Delete clients that are NOT in the fetched list (Cleanup)
            const syncedClientCodes = clients.map(c => c.a1_cod.trim());
            if (syncedClientCodes.length > 0) {
                emitProgress('Limpiando clientes obsoletos...', 80);
                const deleteRes = await client.query(
                    'DELETE FROM users WHERE a1_cod IS NOT NULL AND is_admin = false AND NOT (a1_cod = ANY($1))',
                    [syncedClientCodes]
                );
                if (deleteRes.rowCount > 0) {
                    logger.info(`Deleted ${deleteRes.rowCount} obsolete clients from DB.`);
                }
            }

            await client.query('COMMIT');
            logger.info(`Synced ${clients.length} clients.`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error syncing clients:', error);
        emitProgress('Error sincronizando clientes', null, 'error');
    }
};

// Sync Sellers (SA3)
const syncSellers = async () => {
    try {
        logger.info('Starting Seller Sync...');
        emitProgress('Obteniendo vendedores...', 85);
        const sellers = await protheusService.getSellers();

        if (sellers.length === 0) return;

        const client = await pool2.connect();
        try {
            await client.query('BEGIN');
            for (const s of sellers) {
                await client.query(
                    `INSERT INTO vendedores (
            codigo, nombre, email, telefono, last_synced_at
          ) VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            email = EXCLUDED.email,
            telefono = EXCLUDED.telefono,
            last_synced_at = NOW();`,
                    [
                        s.a3_cod.trim(),
                        (s.a3_nome || '').trim(),
                        (s.a3_email || '').trim(),
                        (s.a3_cel || '').trim()
                    ]
                );
            }

            // 3. Delete sellers that are NOT in the fetched list (Cleanup)
            const syncedSellerCodes = sellers.map(s => s.a3_cod.trim());
            if (syncedSellerCodes.length > 0) {
                emitProgress('Limpiando vendedores obsoletos...', 95);
                const deleteRes = await client.query(
                    'DELETE FROM vendedores WHERE NOT (codigo = ANY($1))',
                    [syncedSellerCodes]
                );
                if (deleteRes.rowCount > 0) {
                    logger.info(`Deleted ${deleteRes.rowCount} obsolete sellers from DB.`);
                }
            }

            await client.query('COMMIT');
            logger.info(`Synced ${sellers.length} sellers.`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error syncing sellers:', error);
        emitProgress('Error sincronizando vendedores', null, 'error');
    }
};

const runFullSync = async () => {
    logger.info('=== Starting Full Sync with Unified Product Data ===');
    emitProgress('Iniciando Sincronización Total...', 0);

    // Total steps ~ 4 (Products, Prices, Clients, Sellers)
    // Distributed percentage manually roughly

    await syncProducts(false); // Goes 0 -> 100 inside, but we suppress completion

    // Logic for Full Sync needs to handle progress differently or reused components need to know context.
    // Simplifying: we will trust the messages, but the percentage might jump. 
    // Ideally pass a callback/offset, but simplistic emission is fine for now.

    // Products & Prices take the longest, so let's say they are 70% of the work.
    // Clients 20%, Sellers 10%.

    // NOTE: syncProducts calls syncPrices internally at the end. 
    // I need to decouple or handle it. syncProducts emits 0-100.

    // For now, let's just let it emit. The user will see "Products... 10%" then "Prices... 100%".
    // Then "Clients...".
    // I will just add specific messages here.

    emitProgress('Iniciando sincronización de Clientes...', 0);
    await syncClients();

    emitProgress('Iniciando sincronización de Vendedores...', 0);
    await syncSellers();

    logger.info('=== Full Sync Completed ===');
    emitProgress('Sincronización Total Completada.', 100, 'completed');
};

module.exports = { runFullSync, syncProducts, syncEvents };
