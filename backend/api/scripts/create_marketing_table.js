const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool2 } = require('../db');

const createTable = async () => {
    try {
        console.log('Creating marketing_users table in DB2...');
        const query = `
      CREATE TABLE IF NOT EXISTS marketing_users (
        user_id INTEGER PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
        await pool2.query(query);
        console.log('Table marketing_users created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
};

createTable();
