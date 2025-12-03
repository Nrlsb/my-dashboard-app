const redis = require('redis');
require('dotenv').config(); // Cargar variables de entorno para obtener REDIS_URL

// =================================================================
// CONFIGURACIÓN DE REDIS (Compatible con Local y Render)
// =================================================================

// Variable para controlar si Redis está disponible
let isRedisReady = false;

// Crear cliente de Redis
// Detectará automáticamente si la URL es 'rediss://' (segura/externa) o 'redis://' (interna)
// Si no existe process.env.REDIS_URL, intentará conectarse a localhost:6379
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});

// Manejo de eventos de conexión para evitar caídas de la app
redisClient.on('error', (err) => {
    // Si es un error de conexión, solo lo logueamos y marcamos Redis como no disponible
    // Esto evita que la app se rompa si Redis se cae o no está configurado localmente
    console.error('Redis Client Error:', err.message || err);
    isRedisReady = false;
});

redisClient.on('ready', () => {
    console.log('Redis está listo y conectado (Cache activado).');
    isRedisReady = true;
});

redisClient.on('end', () => {
    console.log('Conexión con Redis cerrada.');
    isRedisReady = false;
});

// Conectar asíncronamente
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        // El error se maneja en el evento 'error' de arriba, pero prevenimos crash inicial
        console.warn('No se pudo establecer conexión inicial con Redis. La app funcionará sin caché.');
    }
})();

// =================================================================
// MIDDLEWARE
// =================================================================

/**
 * Middleware de caché dinámico.
 * Almacena respuestas en Redis para acelerar tiempos de respuesta.
 * @param {number} duration - Duración del caché en segundos.
 * @returns {function} - Middleware de Express.
 */
const cacheMiddleware = (duration) => async (req, res, next) => {
    // 1. Si el método no es GET, no cacheamos (solo lecturas)
    if (req.method !== 'GET') {
        return next();
    }

    // 2. Si Redis no está listo/conectado, pasamos directo (Fail-safe)
    if (!isRedisReady) {
        return next();
    }

    // 3. Generar key única basada en URL y Usuario
    // Esto asegura que un usuario no vea precios/datos de otro usuario
    const userId = req.userId || 'public';
    const key = `__express__${req.originalUrl || req.url}__user_${userId}`;

    try {
        // 4. Intentar obtener datos de Redis
        const cachedResponse = await redisClient.get(key);

        if (cachedResponse) {
            // [HIT] Encontrado en caché: devolver respuesta y terminar request
            // console.log(`[Redis HIT] ${key}`);
            return res.json(JSON.parse(cachedResponse));
        }
    } catch (err) {
        console.error('Error leyendo de Redis (continuando sin caché):', err);
        // Si falla la lectura, continuamos normalmente
    }

    // [MISS] No encontrado: Interceptar res.json para guardar en caché
    // console.log(`[Redis MISS] ${key}`);

    const originalSend = res.json;
    res.json = (body) => {
        // Enviar respuesta original al cliente
        originalSend.call(res, body);
        
        // Guardar en Redis en segundo plano (si está disponible)
        if (isRedisReady) {
            try {
                redisClient.set(key, JSON.stringify(body), {
                    EX: duration // Expira en 'duration' segundos
                });
            } catch (err) {
                console.error('Error guardando en Redis:', err);
            }
        }
    };

    next();
};

module.exports = cacheMiddleware;