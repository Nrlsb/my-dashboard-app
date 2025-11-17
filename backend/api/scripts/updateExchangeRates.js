const { pool } = require('../db');
const fetch = require('node-fetch'); // Using node-fetch for API calls

// Hypothetical API URL - REPLACE WITH ACTUAL API ENDPOINT
const EXCHANGE_RATE_API_URL = 'https://api.example.com/exchange-rates'; 

async function updateExchangeRates() {
  let client;
  try {
    console.log('Iniciando actualización de cotizaciones de dólar...');
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Fetch exchange rates from a hypothetical API
    console.log(`Fetching exchange rates from: ${EXCHANGE_RATE_API_URL}`);
    const response = await fetch(EXCHANGE_RATE_API_URL);
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    const data = await response.json();

    // Assuming the API returns data like:
    // {
    //   "dolarBillete": { "venta": 1000.00 },
    //   "dolarDivisa": { "venta": 1010.00 }
    // }
    const dolarBilleteRate = data.dolarBillete?.venta;
    const dolarDivisaRate = data.dolarDivisa?.venta;

    if (!dolarBilleteRate || !dolarDivisaRate) {
      throw new Error('Could not retrieve valid exchange rates from the API.');
    }

    console.log(`Cotización USD Billete (venta): ${dolarBilleteRate}`);
    console.log(`Cotización USD Divisa (venta): ${dolarDivisaRate}`);

    // 2. Update products with moneda = 2 (USD Billete)
    const updateBilleteQuery = `
      UPDATE products
      SET cotizacion = $1
      WHERE moneda = 2;
    `;
    const billeteResult = await client.query(updateBilleteQuery, [dolarBilleteRate]);
    console.log(`Actualizados ${billeteResult.rowCount} productos con USD Billete.`);

    // 3. Update products with moneda = 3 (USD Divisa)
    const updateDivisaQuery = `
      UPDATE products
      SET cotizacion = $1
      WHERE moneda = 3;
    `;
    const divisaResult = await client.query(updateDivisaQuery, [dolarDivisaRate]);
    console.log(`Actualizados ${divisaResult.rowCount} productos con USD Divisa.`);

    await client.query('COMMIT');
    console.log('Actualización de cotizaciones de dólar completada exitosamente.');

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error durante la actualización de cotizaciones de dólar:', error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    pool.end(); // End the pool connection after script execution
  }
}

updateExchangeRates().catch(console.error);
