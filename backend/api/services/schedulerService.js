const cron = require('node-cron');
const { runFullSync, syncProducts } = require('./syncService');
const testUserModel = require('../models/testUserModel');

const initScheduler = () => {
    console.log('Initializing Scheduler...');

    // 1. 30-Minute Sync: Products (Stock) & Prices
    // '*/30 * * * *' = Every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('[Scheduler] Running scheduled 30-Minute Sync (Products & Prices)...');
        try {
            await syncProducts();
            console.log('[Scheduler] 30-Minute Sync completed successfully.');
        } catch (error) {
            console.error('[Scheduler] Error during 30-Minute Sync:', error);
        }
    });

    // 2. Daily Full Sync: Everything (including Clients and Sellers)
    // '0 4 * * *' = At 04:00 AM every day
    cron.schedule('0 4 * * *', async () => {
        console.log('[Scheduler] Running scheduled Daily Full Sync...');
        try {
            await runFullSync();
            console.log('[Scheduler] Daily Full Sync completed successfully.');
        } catch (error) {
            console.error('[Scheduler] Error during Daily Full Sync:', error);
        }
    });

    // Schedule test user expiration check every day at midnight
    // '0 0 * * *' = At minute 0 of hour 0
    cron.schedule('0 0 * * *', async () => {
        console.log('[Scheduler] Running scheduled test user expiration check...');
        try {
            const count = await testUserModel.softDeleteExpiredTestUsers();
            console.log(`[Scheduler] Expired ${count} test users.`);
        } catch (error) {
            console.error('[Scheduler] Error during test user expiration check:', error);
        }
    });

    console.log('Scheduler initialized. Price sync set to run every 30 minutes.');
};

module.exports = {
    initScheduler,
};
