const { pool2 } = require('../db');

const checkSchema = async () => {
    try {
        const res = await pool2.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'product_images';
    `);
        console.log('Columns in product_images:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool2.end();
    }
};

checkSchema();
