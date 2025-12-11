const { pool2 } = require('./api/db');

const createTable = async () => {
    try {
        await pool2.query(`
      CREATE TABLE IF NOT EXISTS user_product_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );
    `);
        console.log('Table user_product_permissions created successfully');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        process.exit();
    }
};

createTable();
