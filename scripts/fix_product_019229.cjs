require('../backend/api/node_modules/dotenv').config({ path: require('path').resolve(__dirname, '../backend/api/.env') });
const { pool2 } = require('../backend/api/db');

async function fixProduct() {
    try {
        const productCode = '019229';
        console.log(`Fixing timestamp for product ${productCode}...`);

        // Set to 2 days ago
        const result = await pool2.query(`
      UPDATE product_price_snapshots
      SET last_change_timestamp = NOW() - INTERVAL '2 days'
      WHERE product_code = $1
      RETURNING *
    `, [productCode]);

        if (result.rowCount > 0) {
            console.log('Update successful:', result.rows[0]);
        } else {
            console.log('Product not found in snapshots.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixProduct();
