// backend/api/redisClient.js
// Redis disabled by user request.
// Exporting dummy functions to maintain compatibility.

const redisClient = {
    isOpen: false,
    connect: async () => { },
    on: () => { },
    get: async () => null,
    set: async () => { },
    del: async () => { },
    scan: async () => ({ cursor: 0, keys: [] }),
};

const connectRedis = async () => {
    console.log('Redis connection disabled.');
};

const clearCacheByPattern = async (pattern) => {
    // No-op
    // console.log(`[Cache Disabled] Skipping clearCacheByPattern for: ${pattern}`);
};

module.exports = {
    redisClient,
    connectRedis,
    isRedisReady: () => false,
    clearCacheByPattern
};