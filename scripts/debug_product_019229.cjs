require('../backend/api/node_modules/dotenv').config({ path: require('path').resolve(__dirname, '../backend/api/.env') });
const { pool, pool2 } = require('../backend/api/db');

async function checkProduct() {
    try {
        const query = `
      SELECT 
        p.id,
        p.b1_cod AS code, 
        pps.last_change_timestamp,
        NOW() as server_now,
        NOW() - INTERVAL '24 hours' as threshold,
        pps.last_change_timestamp >= NOW() - INTERVAL '24 hours' as is_recent
      FROM products p
      LEFT JOIN product_price_snapshots pps ON p.id = pps.product_id
      WHERE p.b1_cod = '019229'
    `;

        // Using pool2 as seen in model file
        const result = await pool2.query(query);
        console.log('Product Check Result:', result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProduct();
