const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the parent directory (backend/api)
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const { runFullSync } = require('../services/syncService');
const { pool } = require('../db');

(async () => {
    try {
        console.log('--- Starting Manual Full Sync ---');
        await runFullSync();
        console.log('--- Manual Full Sync Completed ---');
    } catch (error) {
        console.error('Error during manual sync:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
