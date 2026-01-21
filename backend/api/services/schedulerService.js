const cron = require('node-cron');
const { runFullSync, syncProducts } = require('./syncService');
const { updateStoredExchangeRates } = require('../utils/exchangeRateService');
const testUserModel = require('../models/testUserModel');
const userModel = require('../models/userModel');

const initScheduler = () => {
    console.log('Initializing Scheduler...');

    // 0. Exchange Rates Schedules (08:00 and 12:30 Argentina Time)
    const timezone = "America/Argentina/Buenos_Aires";

    // 08:00 AM
    cron.schedule('0 8 * * *', async () => {
        console.log('[Scheduler] Running scheduled Dollar Rate Update (08:00)...');
        try {
            await updateStoredExchangeRates();
            console.log('[Scheduler] Dollar Rate Update (08:00) completed.');
        } catch (error) {
            console.error('[Scheduler] Error updating dollar rate:', error);
        }
    }, { timezone });

    // 12:30 PM
    cron.schedule('30 12 * * *', async () => {
        console.log('[Scheduler] Running scheduled Dollar Rate Update (12:30)...');
        try {
            await updateStoredExchangeRates();
            console.log('[Scheduler] Dollar Rate Update (12:30) completed.');
        } catch (error) {
            console.error('[Scheduler] Error updating dollar rate:', error);
        }
    }, { timezone });

    // 1. Hourly Sync: Products (Stock) & Prices
    // '0 * * * *' = Every hour
    cron.schedule('0 * * * *', async () => {
        console.log('[Scheduler] Running scheduled Hourly Sync (Products & Prices)...');
        try {
            await syncProducts();
            console.log('[Scheduler] Hourly Sync completed successfully.');
        } catch (error) {
            console.error('[Scheduler] Error during Hourly Sync:', error);
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

    // Schedule inactive client deactivation check every day at 01:00 AM
    cron.schedule('0 1 * * *', async () => {
        console.log('[Scheduler] Running scheduled inactive client deactivation check...');
        try {
            const count = await userModel.deactivateInactiveClients();
            console.log(`[Scheduler] Deactivated ${count} inactive clients.`);
        } catch (error) {
            console.error('[Scheduler] Error during inactive client deactivation check:', error);
        }
    });

    console.log('Scheduler initialized with Argentina Time jobs (Dollar: 08:00, 12:30).');
};

module.exports = {
    initScheduler,
};
