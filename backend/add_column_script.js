const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });
const { pool2 } = require('./api/db');

const up = async () => {
    try {
        console.log('Connect to DB2...');
        const client = await pool2.connect();
        try {
            console.log('Adding must_change_password column to user_credentials...');
            await client.query(`
                ALTER TABLE user_credentials 
                ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
            `);
            console.log('Column added successfully (or already exists).');
        } finally {
            client.release();
        }
        process.exit(0);
    } catch (error) {
        console.error('Error adding column:', error);
        process.exit(1);
    }
};

up();
