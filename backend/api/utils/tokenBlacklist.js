const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { redisClient, isRedisReady } = require('../redisClient');

const client = process.env.REDIS_URL ? redisClient : null;

if (!process.env.REDIS_URL) {
  logger.warn('REDIS_URL not set — token blacklist disabled (fail-open).');
}

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const addToBlacklist = async (token) => {
  if (!client || !isRedisReady()) return;
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return; // already expired, no need to store
    await client.set(`blacklist:${hashToken(token)}`, '1', { EX: ttl });
    logger.info(`Token blacklisted. TTL: ${ttl}s`);
  } catch (err) {
    logger.error('Error adding token to blacklist:', err);
    // fail-open: do not throw
  }
};

const isBlacklisted = async (token) => {
  if (!client || !isRedisReady()) return false;
  try {
    const exists = await client.exists(`blacklist:${hashToken(token)}`);
    return exists === 1;
  } catch (err) {
    logger.error('Error checking token blacklist:', err);
    return false; // fail-open
  }
};

module.exports = { addToBlacklist, isBlacklisted };
