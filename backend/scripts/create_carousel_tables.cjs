const path = require('path');
require('../api/node_modules/dotenv').config({ path: path.resolve(__dirname, '../api/.env') });
const { pool2 } = require('../api/db');

const createTables = async () => {
  try {
    console.log('Creating carousel_accessories table...');
    await pool2.query(`
      CREATE TABLE IF NOT EXISTS carousel_accessories (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating carousel_product_groups table...');
    await pool2.query(`
      CREATE TABLE IF NOT EXISTS carousel_product_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image_url TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('static_group', 'custom_collection')),
        reference_id VARCHAR(255), -- Can be group code or null for custom
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating carousel_custom_group_items table...');
    await pool2.query(`
      CREATE TABLE IF NOT EXISTS carousel_custom_group_items (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES carousel_product_groups(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, product_id)
      );
    `);

    console.log('Tables created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
};

createTables();
