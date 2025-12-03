const { pool, pool2 } = require('../db');

const syncPrices = async () => {
    console.log('Starting price synchronization...');
    const client1 = await pool.connect();
    const client2 = await pool2.connect();

    try {
        // 1. Fetch all products from DB1 (Source of Truth)
        const res1 = await client1.query('SELECT id, price FROM products WHERE price > 0');
        const products = res1.rows;
        console.log(`Fetched ${products.length} products from DB1.`);

        // 2. Fetch all snapshots from DB2
        const res2 = await client2.query('SELECT product_id, price FROM product_price_snapshots');
        const snapshots = new Map(res2.rows.map(s => [s.product_id, s.price]));
        console.log(`Fetched ${snapshots.size} snapshots from DB2.`);

        let updates = 0;
        let inserts = 0;

        // 3. Compare and Update
        for (const product of products) {
            const { id, price } = product;
            const currentPrice = Number(price);

            if (snapshots.has(id)) {
                const lastPrice = Number(snapshots.get(id));
                // If price changed, update record and timestamp
                if (Math.abs(currentPrice - lastPrice) > 0.01) { // Float comparison tolerance
                    await client2.query(
                        `UPDATE product_price_snapshots 
             SET price = $1, last_change_timestamp = CURRENT_TIMESTAMP 
             WHERE product_id = $2`,
                        [currentPrice, id]
                    );
                    updates++;
                }
            } else {
                // New product, insert it
                await client2.query(
                    `INSERT INTO product_price_snapshots (product_id, price, last_change_timestamp) 
           VALUES ($1, $2, CURRENT_TIMESTAMP)`,
                    [id, currentPrice]
                );
                inserts++;
            }
        }

        console.log(`Sync complete. Inserts: ${inserts}, Updates: ${updates}`);

    } catch (error) {
        console.error('Error during price synchronization:', error);
    } finally {
        client1.release();
        client2.release();
        // Close pools if this is a standalone script run
        // pool.end(); 
        // pool2.end();
        // For now we just exit process if run directly
        if (require.main === module) {
            process.exit(0);
        }
    }
};

if (require.main === module) {
    syncPrices();
}

module.exports = syncPrices;
