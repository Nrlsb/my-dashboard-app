const { z } = require('zod');
const logger = require('../utils/logger');

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001'),

    // Database 1 (Legacy or required?)
    DB_HOST: z.string().min(1, "DB_HOST is required"),
    DB_USER: z.string().min(1, "DB_USER is required"),
    DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
    DB_DATABASE: z.string().min(1, "DB_DATABASE is required"),

    // Database 2 (Primary)
    DB2_HOST: z.string().min(1, "DB2_HOST is required"),
    DB2_USER: z.string().min(1, "DB2_USER is required"),
    DB2_PASSWORD: z.string().min(1, "DB2_PASSWORD is required"),
    DB2_DATABASE: z.string().min(1, "DB2_DATABASE is required"),

    // Redis
    REDIS_URL: z.string().optional(), // Optional if logic handles it, but good to validate if present

    // Security
    JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 chars"),
});

const validateEnv = () => {
    try {
        const parsed = envSchema.parse(process.env);
        logger.info('✅ Environment variables validated successfully.');
        return parsed;
    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.error('❌ Invalid environment variables:', error.format());
            console.error('❌ Invalid environment variables:', JSON.stringify(error.format(), null, 2));
            process.exit(1); // Fail fast
        }
        throw error;
    }
};

module.exports = validateEnv;
