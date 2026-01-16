require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
console.log('Requiring syncService...');
const { syncPrices } = require('../services/syncService');
console.log('syncService required.');

const run = async () => {
    try {
        console.log('Manually triggering syncPrices...');
        await syncPrices();
        console.log('Manual sync completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error running manual sync:', error);
        process.exit(1);
    }
};

run();
