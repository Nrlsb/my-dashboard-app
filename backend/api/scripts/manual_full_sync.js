const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend/api/ directory
// script is in backend/api/scripts/
const envPath = path.join(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const { runFullSync } = require('../services/syncService');
const { pool2 } = require('../db');

const run = async () => {
    console.log('--- Starting Manual Full Sync (Simulating 4 AM Schedule) ---');
    try {
        await runFullSync();
        console.log('--- Manual Full Sync Completed Successfully ---');
    } catch (error) {
        console.error('--- Manual Full Sync Failed:', error);
    } finally {
        // Ensure connection pool is closed so script exits
        await pool2.end();
    }
};

run();
