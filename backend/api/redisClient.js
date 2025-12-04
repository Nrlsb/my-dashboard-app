const redis = require('redis');
require('dotenv').config();

let isRedisReady = false;

// Crear cliente de Redis.
// Usará process.env.REDIS_URL si está disponible, si no, intentará conectar a localhost.
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});

// Manejo de eventos de conexión
redisClient.on('error', (err) => {
    console.error('Error en el cliente de Redis:', err.message || err);
    isRedisReady = false;
});

redisClient.on('ready', () => {
    console.log('Cliente de Redis conectado y listo.');
    isRedisReady = true;
});

redisClient.on('end', () => {
    console.log('Conexión con Redis cerrada.');
    isRedisReady = false;
});

// Función para conectar a Redis
const connectRedis = async () => {
    if (!redisClient.isOpen) {
        try {
            await redisClient.connect();
        } catch (err) {
            console.warn('No se pudo establecer la conexión inicial con Redis. La app funcionará sin caché.');
        }
    }
};

/**
 * Limpia las claves de caché en Redis que coinciden con un patrón.
 * Utiliza el comando SCAN para encontrar claves de forma segura sin bloquear el servidor.
 * @param {string} pattern - El patrón que deben seguir las claves a eliminar (ej. '*__express__/api/products*').
 */
const clearCacheByPattern = async (pattern) => {
    if (!isRedisReady) {
        console.warn('Intento de limpiar caché, pero Redis no está listo.');
        return;
    }

    try {
        let cursor = 0;
        do {
            const reply = await redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 100 // Escanear 100 claves a la vez
            });

            cursor = reply.cursor;
            const keys = reply.keys;

            if (keys.length > 0) {
                console.log(`Eliminando ${keys.length} claves de caché con el patrón: ${pattern}`);
                await redisClient.del(keys);
            }
        } while (cursor !== 0);

    } catch (err) {
        console.error(`Error al limpiar caché con el patrón "${pattern}":`, err);
    }
};

module.exports = {
    redisClient,
    connectRedis,
    isRedisReady: () => isRedisReady, // Exportar como función para obtener el estado actual
    clearCacheByPattern
};