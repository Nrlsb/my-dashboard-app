const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool2 } = require('../db');

async function runSchema() {
    const sqlPath = path.join(__dirname, 'create_protheus_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('Running SQL schema on DB2...');
        await pool2.query(sql);
        console.log('Schema created successfully in DB2.');
    } catch (err) {
        console.error('Error executing schema:', err);
    } finally {
        pool2.end(); // Make sure to close the pool? Or just exit.
        process.exit();
    }
}

runSchema();
