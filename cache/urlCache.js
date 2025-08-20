const { logger } = require('../middleware/logger');
const config = require('../config/config');

class UrlCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = config.cache.maxSize;
        this.ttl = config.cache.ttl;
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // Cleanup every 5 minutes
        
        logger.info('URL cache initialized', { maxSize: this.maxSize, ttl: this.ttl });
    }

    set(key, value) {
        try {
            // Remove oldest entries if cache is full
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
                logger.debug('Cache full, removed oldest entry', { removedKey: firstKey });
            }

            const entry = {
                value,
                timestamp: Date.now(),
                expiresAt: Date.now() + this.ttl
            };

            this.cache.set(key, entry);
            logger.debug('Cache entry set', { key, timestamp: entry.timestamp });
            
            return true;
        } catch (error) {
            logger.error('Error setting cache entry', { key, error: error.message });
            return false;
        }
    }

    get(key) {
        try {
            const entry = this.cache.get(key);
            
            if (!entry) {
                logger.debug('Cache miss', { key });
                return null;
            }

            // Check if entry has expired
            if (Date.now() > entry.expiresAt) {
                this.cache.delete(key);
                logger.debug('Cache entry expired and removed', { key });
                return null;
            }

            logger.debug('Cache hit', { key, age: Date.now() - entry.timestamp });
            return entry.value;
        } catch (error) {
            logger.error('Error getting cache entry', { key, error: error.message });
            return null;
        }
    }

    has(key) {
        try {
            const entry = this.cache.get(key);
            if (!entry) return false;
            
            if (Date.now() > entry.expiresAt) {
                this.cache.delete(key);
                return false;
            }
            
            return true;
        } catch (error) {
            logger.error('Error checking cache entry', { key, error: error.message });
            return false;
        }
    }

    delete(key) {
        try {
            const deleted = this.cache.delete(key);
            if (deleted) {
                logger.debug('Cache entry deleted', { key });
            }
            return deleted;
        } catch (error) {
            logger.error('Error deleting cache entry', { key, error: error.message });
            return false;
        }
    }

    clear() {
        try {
            const size = this.cache.size;
            this.cache.clear();
            logger.info('Cache cleared', { previousSize: size });
        } catch (error) {
            logger.error('Error clearing cache', { error: error.message });
        }
    }

    size() {
        return this.cache.size;
    }

    cleanup() {
        try {
            const now = Date.now();
            let cleanedCount = 0;
            
            for (const [key, entry] of this.cache.entries()) {
                if (now > entry.expiresAt) {
                    this.cache.delete(key);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                logger.info('Cache cleanup completed', { cleanedCount, remainingSize: this.cache.size });
            }
        } catch (error) {
            logger.error('Error during cache cleanup', { error: error.message });
        }
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
            utilization: (this.cache.size / this.maxSize) * 100
        };
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
        logger.info('Cache destroyed');
    }
}

module.exports = UrlCache;
