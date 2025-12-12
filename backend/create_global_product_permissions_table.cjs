const path = require('path');
require('./api/node_modules/dotenv').config({ path: path.resolve(__dirname, 'api/.env') });
const { pool2 } = require('./api/db');

const createTable = async () => {
    try {
        await pool2.query(`
      CREATE TABLE IF NOT EXISTS global_product_permissions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Table global_product_permissions created successfully');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        process.exit();
    }
};

createTable();
