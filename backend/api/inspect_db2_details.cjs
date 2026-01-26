
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
        console.log('--- Inspecting product_new_release_status columns ---');
        const resReleases = await pool2.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'product_new_release_status' AND table_schema = 'public'
    `);
        console.log('product_new_release_status columns:', resReleases.rows.map(r => r.column_name));

        console.log('\n--- Inspecting products columns (partial) ---');
        const resProducts = await pool2.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND table_schema = 'public'
        AND column_name IN ('code', 'b1_cod', 'product_code')
    `);
        console.log('products columns check:', resProducts.rows);

        console.log('\n--- Inspecting carousel_product_groups columns ---');
        const resGroups = await pool2.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'carousel_product_groups' AND table_schema = 'public'
    `);
        console.log('carousel_product_groups columns:', resGroups.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool2.end();
    }
}

inspect();
