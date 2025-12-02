const NodeCache = require('node-cache');

// Inicializar caché estándar
// stdTTL: tiempo de vida por defecto en segundos (300s = 5 minutos)
// checkperiod: intervalo de limpieza en segundos (60s = 1 minuto)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Middleware de caché.
 * @param {number} duration - Duración del caché en segundos.
 * @returns {function} - Middleware de Express.
 */
const cacheMiddleware = (duration) => (req, res, next) => {
    // Solo cachear peticiones GET
    if (req.method !== 'GET') {
        return next();
    }

    // Generar key única basada en URL y Usuario (para respetar permisos/precios)
    // Si req.userId no existe (público), usar 'public'
    const userId = req.userId || 'public';
    const key = `__express__${req.originalUrl || req.url}__user_${userId}`;

    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        // console.log(`[Cache HIT] ${key}`);
        return res.json(cachedResponse);
    }

    // console.log(`[Cache MISS] ${key}`);

    // Interceptar res.json para guardar en caché antes de enviar
    const originalSend = res.json;
    res.json = (body) => {
        originalSend.call(res, body);
        cache.set(key, body, duration);
    };

    next();
};

module.exports = cacheMiddleware;
