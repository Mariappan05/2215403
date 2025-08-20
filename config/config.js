const { logger } = require('../middleware/logger');

const config = {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development',
    
    // URL shortening settings
    defaultValidity: 30, // minutes
    shortcodeLength: 6,
    maxShortcodeLength: 20,
    
    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    
    // Cache settings
    cache: {
        ttl: 60 * 60 * 1000, // 1 hour in milliseconds
        maxSize: 1000
    }
};

logger.info('Configuration loaded', { config });

module.exports = config;
