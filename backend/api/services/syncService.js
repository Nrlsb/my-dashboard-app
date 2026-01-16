const { pool2 } = require('../db');
const protheusService = require('./protheusService');
const logger = require('../utils/logger');

// Helper to fetch and build map
const fetchDictionaryMap = async (fetchFunction, codeField, filters = []) => {
    try {
        const items = await fetchFunction();
        const map = new Map();
        for (const item of items) {
            // If we need to filter or map more complex objects
            map.set(item[codeField].trim(), item);
        }
        return map;
    } catch (error) {
        logger.error(`Error fetching dictionary for ${codeField}:`, error);
        return new Map();
    }
};

// Sync Products (SB1)
const syncProducts = async () => {
    try {
        logger.info('Starting Product Sync...');

        // 1. Fetch Dictionaries first
        logger.info('Fetching auxiliary data (Groups, Indicators, Capacities)...');
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
        const products = await protheusService.getProducts();

        if (products.length === 0) {
            logger.warn('No products fetched from API.');
            return;
        }

        const client = await pool2.connect();
        try {
            await client.query('BEGIN');

            let missCount = 0;
            let batchCount = 0;
            const BATCH_SIZE = 50;

            for (const p of products) {
                // Prepare descriptions
                let groupObj = groupMap.get((p.b1_grupo || '').trim());
                let capObj = capacityMap.get((p.b1_xcapa || '').trim());

                // Fallback: If description not found, use the code itself so we don't have empty fields
                const groupDesc = groupObj ? groupObj.sbm_desc : (p.b1_grupo || '').trim();
                const capacityDesc = capObj ? capObj.z02_descri : (p.b1_xcapa || '').trim();

                // Indicators: bz_cod maps to b1_cod
                const indicatorObj = indicatorMap.get((p.b1_cod || '').trim());
                const indicatorDesc = indicatorObj ? indicatorObj.bz_estseg : null;

                // Debug logging for misses (only first 5 to avoid spam)
                if (!groupObj && p.b1_grupo && missCount < 5) {
                    logger.warn(`Group Map Miss: Code '${p.b1_grupo}' not found in map.`);
                    missCount++;
                }

                await client.query(
                    `INSERT INTO products (
            b1_cod, b1_desc, z02_descri, b1_grupo, sbm_desc,
            b1_ts, stock_disp, stock_prev, sbz_desc, b1_um, b1_qe, last_synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
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
            last_synced_at = NOW();`,
                    [
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
                        p.b1_qe
                    ]
                );

                batchCount++;
                if (batchCount % BATCH_SIZE === 0) {
                    await client.query('COMMIT');
                    await client.query('BEGIN');
                }
            }

            // 3. Delete products that are not in the fetched list (Cleanup)
            const syncedCodes = products.map(p => p.b1_cod.trim());
            if (syncedCodes.length > 0) {
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
        await syncPrices();

    } catch (error) {
        logger.error('Error syncing products:', error);
    }
};

// Sync Prices (DA1)
const syncPrices = async () => {
    try {
        logger.info('Starting Price Sync...');
        const prices = await protheusService.getPrices();

        if (prices.length === 0) {
            logger.warn('No prices fetched from API.');
            return;
        }

        const client = await pool2.connect();
        try {
            await client.query('BEGIN');

            // 1. Fetch current snapshots to compare
            // We use product_code as the key because that matches our API data
            const snapshotRes = await client.query('SELECT product_code, price FROM product_price_snapshots');
            const snapshotMap = new Map();
            snapshotRes.rows.forEach(r => {
                if (r.product_code) snapshotMap.set(r.product_code.trim(), Number(r.price));
            });

            let updates = 0;
            let inserts = 0;

            for (const p of prices) {
                const code = p.da1_codpro.trim();
                const newPrice = Number(p.da1_prcven);
                const oldPrice = snapshotMap.get(code);

                // 2. Update History if changed or new
                if (oldPrice === undefined) {
                    // New snapshot
                    // We try to resolve product_id from the products table
                    await client.query(
                        `INSERT INTO product_price_snapshots (product_code, price, last_change_timestamp, product_id)
                         VALUES ($1::text, $2, NOW(), (SELECT id FROM products WHERE b1_cod = $1::text LIMIT 1))
                         ON CONFLICT (product_id) DO UPDATE SET
                            price = EXCLUDED.price,
                            last_change_timestamp = NOW(),
                            product_code = EXCLUDED.product_code`,
                        [code, newPrice]
                    );
                    inserts++;
                } else if (Math.abs(newPrice - oldPrice) > 0.01) {
                    // Price changed
                    await client.query(
                        `UPDATE product_price_snapshots
                         SET price = $1, last_change_timestamp = NOW()
                         WHERE product_code = $2`,
                        [newPrice, code]
                    );
                    updates++;
                }

                // 3. Update Product Table (Current Price)
                await client.query(
                    `UPDATE products 
                     SET da1_prcven = $1, da1_moeda = $2, last_synced_at = NOW()
                     WHERE b1_cod = $3`,
                    [p.da1_prcven, p.da1_moeda, code]
                );
            }

            await client.query('COMMIT');
            logger.info(`Synced prices for ${prices.length} products. Snapshots: ${inserts} new, ${updates} updated.`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error syncing prices:', error);
    }
};

// Sync Clients (SA1)
const syncClients = async () => {
    try {
        logger.info('Starting Client Sync...');
        const clients = await protheusService.getClients();

        if (clients.length === 0) return;

        const client = await pool2.connect();
        try {
            await client.query('BEGIN');
            for (const c of clients) {
                const existingRes = await client.query('SELECT id FROM users WHERE a1_cod = $1', [c.a1_cod]);
                if (existingRes.rows.length > 0) {
                    await client.query(
                        `UPDATE users SET 
                    full_name = $1, email = $2, vendedor_codigo = $3, 
                    a1_cgc = $4, a1_tel = $5, a1_endereco = $6, last_synced_at = NOW()
                 WHERE a1_cod = $7`,
                        [c.a1_nome, c.a1_email, c.a1_vend ? c.a1_vend.trim() : null, c.a1_cgc, c.a1_xtel1, `${c.a1_end}, ${c.a1_mun}, ${c.a1_est}`, c.a1_cod.trim()]
                    );
                } else {
                    await client.query(
                        `INSERT INTO users (
                    a1_cod, a1_loja, full_name, email, 
                    vendedor_codigo, a1_cgc, a1_tel, a1_endereco, last_synced_at, is_admin
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), false)`,
                        [c.a1_cod.trim(), c.a1_loja, c.a1_nome, c.a1_email, c.a1_vend ? c.a1_vend.trim() : null, c.a1_cgc, c.a1_xtel1, `${c.a1_end}, ${c.a1_mun}, ${c.a1_est}`]
                    );
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
    }
};

// Sync Sellers (SA3)
const syncSellers = async () => {
    try {
        logger.info('Starting Seller Sync...');
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
                    [s.a3_cod.trim(), s.a3_nome, s.a3_email, s.a3_cel]
                );
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
    }
};

const runFullSync = async () => {
    logger.info('=== Starting Full Sync with Unified Product Data ===');
    await syncProducts();
    // await syncClients();
    // await syncSellers();
    logger.info('=== Full Sync Completed ===');
};

module.exports = { runFullSync, syncProducts };
