const cron = require('node-cron');
const syncPrices = require('../scripts/syncPrices');

const initScheduler = () => {
    console.log('Initializing Scheduler...');

    // Schedule price sync every hour
    // Cron format: Minute Hour DayOfMonth Month DayOfWeek
    // '0 8,12 * * *' = At minute 0 of hour 8 and 12
    cron.schedule('0 8,12 * * *', async () => {
        console.log('[Scheduler] Running scheduled price synchronization...');
        try {
            await syncPrices();
            console.log('[Scheduler] Price synchronization completed successfully.');
        } catch (error) {
            console.error('[Scheduler] Error during scheduled price synchronization:', error);
        }
    });

    console.log('Scheduler initialized. Price sync set to run every hour.');
};

module.exports = {
    initScheduler,
};
