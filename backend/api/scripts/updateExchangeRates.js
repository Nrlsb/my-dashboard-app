const { updateStoredExchangeRates } = require('../utils/exchangeRateService');

/**
 * Script para actualizar y mostrar las cotizaciones del dólar.
 * Ejecutar con `node backend/api/scripts/updateExchangeRates.js`
 */
const runUpdate = async () => {
  try {
    const rates = await updateStoredExchangeRates();
    console.log('Cotizaciones del Dólar BNA actualizadas:');
    console.log(rates);
  } catch (error) {
    console.error(
      'Error al ejecutar el script de actualización de cotizaciones:',
      error.message
    );
  }
};

runUpdate();
