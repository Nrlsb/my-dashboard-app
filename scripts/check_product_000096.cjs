require('../backend/api/node_modules/dotenv').config({ path: require('path').resolve(__dirname, '../backend/api/.env') });
const { pool } = require('../backend/api/db');

async function checkProduct() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b1_cod AS code, 
        b1_desc AS name, 
        stock_disp AS stock, 
        b1_qe AS pack_quantity, 
        sbz_desc AS indicator,
        da1_prcven AS price
      FROM products 
      WHERE b1_cod = '000096'
    `);
    console.log('Product Data:', rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkProduct();
