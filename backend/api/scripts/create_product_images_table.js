const { pool2 } = require('../db');
const logger = require('../utils/logger');

const createTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER,
      image_url TEXT NOT NULL,
      public_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

    try {
        await pool2.query(query);
        console.log('Table "product_images" created or already exists in DB2.');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        pool2.end();
    }
};

createTable();
