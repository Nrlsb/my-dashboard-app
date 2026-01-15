const axios = require('axios');
const cheerio = require('cheerio');

// URL ÚNICA de BNA
const URL_BNA = 'https://www.bna.com.ar/Personas';

// --- CONFIGURACIÓN DEL CACHÉ ---
let cache = {
  data: null,
  timestamp: null,
};
// Duración del caché: 30 minutos en milisegundos
const CACHE_DURATION_MS = 30 * 60 * 1000;

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
 * Obtiene las cotizaciones del dólar (billete y divisa) del BNA.
 * Utiliza caché para evitar peticiones excesivas.
 * @returns {Promise<Object>} Objeto con las cotizaciones de venta del dólar.
 */
const getExchangeRates = async () => {
  const now = Date.now();

  // 1. Revisar si hay datos en caché y si aún son válidos
  if (cache.data && now - cache.timestamp < CACHE_DURATION_MS) {
    // console.log('Sirviendo cotizaciones desde el caché...');
    return cache.data;
  }

  console.log(
    'Caché de cotizaciones expirado o vacío. Obteniendo nuevos datos del BNA...'
  );

  try {
    // 2. Si el caché no es válido, buscar los datos
    const { data: html } = await axios.get(URL_BNA, {
      timeout: 5000, // (NUEVO) Timeout de 5 segundos para evitar que se cuelgue
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    console.log('[DEBUG-BNA] HTML recibido, longitud:', html.length);

    const $ = cheerio.load(html);

    // --- LÓGICA PARA BILLETES (Solo Venta) ---
    const tablaBilletes = $('#billetes');
    const filaDolarBillete = tablaBilletes.find('tbody tr').first();
    const billeteVenta = limpiarTexto(filaDolarBillete.find('td').eq(2).text());

    // --- LÓGICA PARA DIVISAS (Solo Venta) ---
    const tablaDivisas = $('#divisas');
    const filaDolarDivisa = tablaDivisas.find('tbody tr').first();
    const divisaVenta = limpiarTexto(filaDolarDivisa.find('td').eq(2).text());

    console.log(`[DEBUG-BNA] Extracted RAW: Billete=${billeteVenta}, Divisa=${divisaVenta}`);

    // 3. Crear la nueva respuesta simplificada
    const nuevaRespuesta = {
      status: 'ok',
      fecha_actualizacion: new Date(now).toISOString(),
      banco: 'Banco de la Nación Argentina',
      // Aplicamos el parser correcto a cada valor
      venta_billete: parsearFormatoBillete(billeteVenta),
      venta_divisa: parsearFormatoDivisa(divisaVenta),
    };

    console.log(`[DEBUG-BNA] Parsed: Billete=${nuevaRespuesta.venta_billete}, Divisa=${nuevaRespuesta.venta_divisa}`);

    // 4. Guardar la nueva respuesta en el caché
    cache.data = nuevaRespuesta;
    cache.timestamp = now;

    return nuevaRespuesta;
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error.message);
    throw new Error('No se pudo obtener la cotización del BNA');
  }
};

module.exports = {
  getExchangeRates,
};
