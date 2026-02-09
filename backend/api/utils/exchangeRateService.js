const axios = require('axios');
const cheerio = require('cheerio');
const { redisClient, isRedisReady } = require('../redisClient');
const { pool2 } = require('../db');

// URL ÚNICA de BNA
const URL_BNA = 'https://www.bna.com.ar/Personas';

// Duración del caché: 24 horas (para cubrir los intervalos estáticos)
const CACHE_DURATION_SECONDS = 24 * 60 * 60;

// --- Funciones Auxiliares ---

const limpiarTexto = (texto) => {
  if (!texto) return null;
  return texto.replace(/\n/g, '').trim();
};

/**
 * Parsea valores de Billete.
 * Asume formato: "1.425,00" (punto de miles, coma de decimal) o "1425,00".
 */
const parsearFormatoBillete = (valor) => {
  if (!valor) return null;
  // Quitamos el punto de miles (si existe) y reemplazamos la coma decimal por punto
  return parseFloat(valor.replace(/\./g, '').replace(',', '.'));
};

/**
 * Parsea valores de Divisa.
 * Asume formato: "1,403.0000" (coma de miles, punto de decimal) o "1403.0000".
 * Esto corrige el bug donde "1403.0000" se convertía en "14030000".
 */
const parsearFormatoDivisa = (valor) => {
  if (!valor) return null;
  // Quitamos la coma de miles (si existe) y parseamos
  return parseFloat(valor.replace(/,/g, ''));
};

/**
 * Fuerza la actualización de las cotizaciones desde el BNA y actualiza el caché.
 * @returns {Promise<Object>} Nuevas cotizaciones.
 */
const updateStoredExchangeRates = async () => {
  const cacheKey = 'exchange_rates';
  console.log('Iniciando actualización forzada de cotizaciones del dólar (BNA)...');

  try {
    const { data: html } = await axios.get(URL_BNA, {
      timeout: 5000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const $ = cheerio.load(html);

    // --- LÓGICA PARA BILLETES (Solo Venta) ---
    const tablaBilletes = $('#billetes');
    const filaDolarBillete = tablaBilletes.find('tbody tr').first();
    const billeteVenta = limpiarTexto(filaDolarBillete.find('td').eq(2).text());

    // --- LÓGICA PARA DIVISAS (Solo Venta) ---
    const tablaDivisas = $('#divisas');
    const filaDolarDivisa = tablaDivisas.find('tbody tr').first();
    const divisaVenta = limpiarTexto(filaDolarDivisa.find('td').eq(2).text());

    const nuevaRespuesta = {
      status: 'ok',
      fecha_actualizacion: new Date().toISOString(),
      banco: 'Banco de la Nación Argentina',
      venta_billete: parsearFormatoBillete(billeteVenta),
      venta_divisa: parsearFormatoDivisa(divisaVenta),
    };

    // --- GUARDAR EN GLOBAL_SETTINGS (DB) ---
    // Guardamos 'venta_divisa' y 'venta_billete'
    const valuesToStore = [
      { key: 'dollar_divisa', value: nuevaRespuesta.venta_divisa },
      { key: 'dollar_billete', value: nuevaRespuesta.venta_billete }
    ];

    for (const item of valuesToStore) {
      if (item.value) {
        try {
          await pool2.query(
            `INSERT INTO global_settings (key, value, updated_at) 
                     VALUES ($1, $2, NOW()) 
                     ON CONFLICT (key) 
                     DO UPDATE SET value = $2, updated_at = NOW()`,
            [item.key, item.value.toString()]
          );
          console.log(`[ExchangeRate] Cotización guardada en global_settings (${item.key}): ${item.value}`);
        } catch (dbError) {
          console.error(`[ExchangeRate] Error al guardar ${item.key} en DB:`, dbError);
        }
      }
    }

    if (isRedisReady()) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(nuevaRespuesta), { EX: CACHE_DURATION_SECONDS });
        console.log('Cotizaciones actualizadas en Redis correctamente.');
      } catch (err) {
        console.error('Redis error in updateStoredExchangeRates (set):', err);
      }
    }

    return nuevaRespuesta;
  } catch (error) {
    console.error('Error al obtener cotizaciones del BNA:', error.message);
    throw new Error('No se pudo obtener la cotización del BNA');
  }
};

/**
 * Obtiene las cotizaciones del dólar.
 * Intenta devolver desde caché. Si no existe, fuerza una actualización.
 * @returns {Promise<Object>}
 */
const getExchangeRates = async () => {
  const cacheKey = 'exchange_rates';

  // 1. Intentar obtener del caché Redis
  if (isRedisReady()) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Redis error in getExchangeRates (get):', err);
    }
  }

  // 2. Intentar obtener de la Base de Datos (global_settings)
  try {
    const resDivisa = await pool2.query("SELECT value, updated_at FROM global_settings WHERE key = 'dollar_divisa'");
    const resBillete = await pool2.query("SELECT value FROM global_settings WHERE key = 'dollar_billete'");

    if (resDivisa.rows.length > 0 && resBillete.rows.length > 0) {
      const divisaVal = parseFloat(resDivisa.rows[0].value);
      const billeteVal = parseFloat(resBillete.rows[0].value);

      if (!isNaN(divisaVal) && !isNaN(billeteVal)) {
        console.log('[ExchangeRate] Recuperando cotizaciones desde global_settings (DB)...');
        const dbData = {
          status: 'ok',
          source: 'database',
          fecha_actualizacion: resDivisa.rows[0].updated_at,
          venta_divisa: divisaVal,
          venta_billete: billeteVal
        };

        // Refrescar caché
        if (isRedisReady()) {
          await redisClient.set(cacheKey, JSON.stringify(dbData), { EX: CACHE_DURATION_SECONDS });
        }

        return dbData;
      }
    }
  } catch (error) {
    console.error('[ExchangeRate] Error leyendo global_settings:', error);
  }

  console.log('Caché y DB vacíos (o inválidos). Solicitando actualización al BNA...');
  return updateStoredExchangeRates();
};

module.exports = {
  getExchangeRates,
  updateStoredExchangeRates
};
