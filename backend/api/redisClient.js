const { createClient } = require('redis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        tls: process.env.REDIS_URL.startsWith('rediss://'),
        rejectUnauthorized: false // Required for some providers like Render/Heroku if using self-signed certs
    }
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

const connectRedis = async () => {
    if (!redisClient.isOpen) {
        try {
            await redisClient.connect();
            console.log('Redis connected successfully');
        } catch (err) {
            console.error('Could not connect to Redis:', err);
        }
    }
};

const clearCacheByPattern = async (pattern) => {
    if (!redisClient.isOpen) return;
    try {
        const { keys } = await redisClient.scan(0, {
            MATCH: pattern,
            COUNT: 100
        });

        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
        }
    } catch (err) {
        console.error(`Error clearing cache for pattern ${pattern}:`, err);
    }
};

module.exports = {
    redisClient,
    connectRedis,
    isRedisReady: () => redisClient.isOpen,
    clearCacheByPattern
};