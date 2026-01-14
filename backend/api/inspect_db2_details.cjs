
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Pool } = require('pg');

const pool2Config = {
    user: process.env.DB2_USER,
    host: process.env.DB2_HOST,
    database: process.env.DB2_DATABASE,
    password: process.env.DB2_PASSWORD,
    port: process.env.DB2_PORT,
    ssl: { rejectUnauthorized: false }
};

const pool2 = new Pool(pool2Config);

async function inspect() {
    try {
        console.log('--- Inspecting user_roles constraints ---');
        const resConstraints = await pool2.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'user_roles'::regclass
    `);
        console.log('user_roles Constraints:', resConstraints.rows);

        console.log('\n--- Inspecting user_credentials columns ---');
        const resCreds = await pool2.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_credentials' AND table_schema = 'public'
    `);
        console.log('user_credentials columns:', resCreds.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool2.end();
    }
}

inspect();
