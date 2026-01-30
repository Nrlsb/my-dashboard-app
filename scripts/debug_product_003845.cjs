require('../backend/api/node_modules/dotenv').config({ path: require('path').resolve(__dirname, '../backend/api/.env') });
const { pool2 } = require('../backend/api/db');

async function checkProduct() {
    try {
        const productCode = '003845';
        const query = `
      SELECT 
        p.id,
        p.b1_cod AS code, 
        pps.last_change_timestamp,
        NOW() as server_now,
        NOW() - INTERVAL '30 minutes' as threshold,
        CASE
            WHEN pps.last_change_timestamp >= NOW() - INTERVAL '30 minutes' THEN true
            ELSE false
        END AS is_recent_30m,
         CASE
            WHEN pps.last_change_timestamp >= NOW() - INTERVAL '24 hours' THEN true
            ELSE false
        END AS is_recent_24h
      FROM products p
      LEFT JOIN product_price_snapshots pps ON p.id = pps.product_id
      WHERE p.b1_cod = $1
    `;

        // Using pool2 as seen in model file
        const result = await pool2.query(query, [productCode]);
        console.log('Product Check Result:', result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProduct();
