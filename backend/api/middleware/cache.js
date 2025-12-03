const redis = require('redis');
require('dotenv').config(); // Aseguramos cargar las variables de entorno

// Inicializar cliente de Redis usando la variable de entorno REDIS_URL
// Si no existe, intentará conectarse a localhost (por defecto)
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Conectar a Redis inmediatamente (Redis v4+ es asíncrono)
(async () => {
    try {
        await redisClient.connect();
        console.log('Conectado a Redis exitosamente');
    } catch (err) {
        console.error('Error conectando a Redis:', err);
    }
})();

/**
 * Middleware de caché (Versión Redis).
 * @param {number} duration - Duración del caché en segundos.
 * @returns {function} - Middleware de Express.
 */
const cacheMiddleware = (duration) => async (req, res, next) => {
    // Solo cachear peticiones GET
    if (req.method !== 'GET') {
        return next();
    }

    // Generar key única basada en URL y Usuario (para respetar permisos/precios)
    // Si req.userId no existe (público), usar 'public'
    const userId = req.userId || 'public';
    const key = `__express__${req.originalUrl || req.url}__user_${userId}`;

    try {
        // Intentar obtener datos de Redis
        // Nota: Redis devuelve null si no existe la clave
        const cachedResponse = await redisClient.get(key);

        if (cachedResponse) {
            // console.log(`[Redis HIT] ${key}`);
            // Redis guarda strings, necesitamos parsearlo a JSON para enviarlo
            return res.json(JSON.parse(cachedResponse));
        }
    } catch (err) {
        console.error('Error leyendo de Redis (continuando sin caché):', err);
        // Si falla Redis, continuamos para que la app no se rompa
    }

    // console.log(`[Redis MISS] ${key}`);

    // Interceptar res.json para guardar en caché antes de enviar
    const originalSend = res.json;
    res.json = (body) => {
        originalSend.call(res, body);
        
        // Guardar en Redis de forma asíncrona (fire-and-forget)
        // Necesitamos convertir el body (objeto) a string (JSON)
        try {
            redisClient.set(key, JSON.stringify(body), {
                EX: duration // 'EX' establece el tiempo de expiración en segundos
            });
        } catch (err) {
            console.error('Error guardando en Redis:', err);
        }
    };

    next();
};

module.exports = cacheMiddleware;