require('./backend/api/node_modules/dotenv').config({ path: './backend/api/.env' });
const { toggleProductOfferStatus } = require('./backend/api/services/productService');
const { findOffers } = require('./backend/api/models/productModel');
const { pool, pool2 } = require('./backend/api/db');

async function verifyCacheFix() {
    const testProductId = 101; // Replace with a valid product ID for testing

    console.log('--- Starting Cache Verification ---');

    try {
        // 1. Initial State
        console.log('\n1. Fetching initial offers...');
        let offers = await findOffers();
        const initialCount = offers.length;
        const isInitiallyOnOffer = offers.some(o => o.id === testProductId);
        console.log(`Initial offers count: ${initialCount}`);
        console.log(`Product ${testProductId} is initially on offer: ${isInitiallyOnOffer}`);

        // 2. Toggle Offer Status
        console.log(`\n2. Toggling offer status for product ${testProductId}...`);
        const toggleResult = await toggleProductOfferStatus(testProductId);
        console.log(`Toggle result: Product ${testProductId} offer status is now ${toggleResult.oferta}`);

        // 3. Verify Cache Invalidation (Immediate Fetch)
        console.log('\n3. Fetching offers immediately after toggle...');
        offers = await findOffers();
        const newCount = offers.length;
        const isNowOnOffer = offers.some(o => o.id === testProductId);
        console.log(`New offers count: ${newCount}`);
        console.log(`Product ${testProductId} is now on offer: ${isNowOnOffer}`);

        if (isNowOnOffer !== toggleResult.oferta) {
            console.error('\n[FAIL] Cache mismatch! The fetched offer status does not match the toggled status.');
        } else {
            console.log('\n[SUCCESS] Cache appears to be invalidated correctly.');
        }

        // 4. Restore Original State (Optional, but good practice)
        console.log(`\n4. Restoring original state for product ${testProductId}...`);
        await toggleProductOfferStatus(testProductId);
        console.log('State restored.');

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await pool.end();
        await pool2.end();
    }
}

verifyCacheFix();
