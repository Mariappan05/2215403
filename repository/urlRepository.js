const { logger } = require('../middleware/logger');
const ShortUrl = require('../domain/ShortUrl');
const UrlCache = require('../cache/urlCache');

class UrlRepository {
    constructor() {
        this.cache = new UrlCache();
        this.urls = new Map(); // In-memory storage for demo purposes
        this.shortcodeIndex = new Map(); // Index for quick shortcode lookups
        
        logger.info('URL repository initialized');
    }

    async create(shortUrlData) {
        try {
            const shortUrl = new ShortUrl(shortUrlData);
            
            // Check if shortcode already exists
            if (this.shortcodeIndex.has(shortUrl.shortcode)) {
                logger.warn('Shortcode collision detected', { shortcode: shortUrl.shortcode });
                throw new Error('Shortcode already exists');
            }

            // Store in memory
            this.urls.set(shortUrl.id, shortUrl);
            this.shortcodeIndex.set(shortUrl.shortcode, shortUrl.id);
            
            // Cache the shortcode for quick access
            this.cache.set(shortUrl.shortcode, shortUrl);
            
            logger.info('Short URL created successfully', { 
                id: shortUrl.id, 
                shortcode: shortUrl.shortcode,
                originalUrl: shortUrl.originalUrl 
            });
            
            return shortUrl;
        } catch (error) {
            logger.error('Error creating short URL', { error: error.message, data: shortUrlData });
            throw error;
        }
    }

    async findByShortcode(shortcode) {
        try {
            // Check cache first
            let shortUrl = this.cache.get(shortcode);
            
            if (shortUrl) {
                logger.debug('Short URL found in cache', { shortcode });
                return shortUrl;
            }

            // Check memory storage
            const urlId = this.shortcodeIndex.get(shortcode);
            if (!urlId) {
                logger.debug('Short URL not found', { shortcode });
                return null;
            }

            shortUrl = this.urls.get(urlId);
            if (!shortUrl) {
                logger.warn('Short URL ID found but URL object missing', { shortcode, urlId });
                return null;
            }

            // Check if expired
            if (shortUrl.isExpired()) {
                logger.info('Short URL expired', { shortcode, expiry: shortUrl.expiresAt });
                await this.delete(shortUrl.id);
                return null;
            }

            // Cache for future requests
            this.cache.set(shortcode, shortUrl);
            
            logger.debug('Short URL found in storage', { shortcode });
            return shortUrl;
        } catch (error) {
            logger.error('Error finding short URL by shortcode', { shortcode, error: error.message });
            throw error;
        }
    }

    async findById(id) {
        try {
            const shortUrl = this.urls.get(id);
            if (!shortUrl) {
                logger.debug('Short URL not found by ID', { id });
                return null;
            }

            // Check if expired
            if (shortUrl.isExpired()) {
                logger.info('Short URL expired', { id, expiry: shortUrl.expiresAt });
                await this.delete(id);
                return null;
            }

            logger.debug('Short URL found by ID', { id });
            return shortUrl;
        } catch (error) {
            logger.error('Error finding short URL by ID', { id, error: error.message });
            throw error;
        }
    }

    async update(id, updateData) {
        try {
            const shortUrl = await this.findById(id);
            if (!shortUrl) {
                throw new Error('Short URL not found');
            }

            // Update fields
            Object.assign(shortUrl, updateData);
            
            // Update cache if shortcode changed
            if (updateData.shortcode && updateData.shortcode !== shortUrl.shortcode) {
                this.cache.delete(shortUrl.shortcode);
                this.shortcodeIndex.delete(shortUrl.shortcode);
                this.shortcodeIndex.set(updateData.shortcode, id);
                this.cache.set(updateData.shortcode, shortUrl);
            }

            logger.info('Short URL updated successfully', { id, updateData });
            return shortUrl;
        } catch (error) {
            logger.error('Error updating short URL', { id, error: error.message, updateData });
            throw error;
        }
    }

    async delete(id) {
        try {
            const shortUrl = this.urls.get(id);
            if (!shortUrl) {
                logger.debug('Short URL not found for deletion', { id });
                return false;
            }

            // Remove from all storage locations
            this.urls.delete(id);
            this.shortcodeIndex.delete(shortUrl.shortcode);
            this.cache.delete(shortUrl.shortcode);
            
            logger.info('Short URL deleted successfully', { id, shortcode: shortUrl.shortcode });
            return true;
        } catch (error) {
            logger.error('Error deleting short URL', { id, error: error.message });
            throw error;
        }
    }

    async addClick(shortcode, clickData) {
        try {
            const shortUrl = await this.findByShortcode(shortcode);
            if (!shortUrl) {
                throw new Error('Short URL not found');
            }

            const click = shortUrl.addClick(clickData);
            
            // Update cache
            this.cache.set(shortcode, shortUrl);
            
            logger.info('Click added to short URL', { shortcode, clickId: click.id });
            return click;
        } catch (error) {
            logger.error('Error adding click to short URL', { shortcode, error: error.message });
            throw error;
        }
    }

    async getAll() {
        try {
            const allUrls = Array.from(this.urls.values());
            logger.debug('Retrieved all short URLs', { count: allUrls.length });
            return allUrls;
        } catch (error) {
            logger.error('Error retrieving all short URLs', { error: error.message });
            throw error;
        }
    }

    async getStats() {
        try {
            const totalUrls = this.urls.size;
            const activeUrls = Array.from(this.urls.values()).filter(url => !url.isExpired()).length;
            const expiredUrls = totalUrls - activeUrls;
            
            const stats = {
                totalUrls,
                activeUrls,
                expiredUrls,
                cacheStats: this.cache.getStats()
            };
            
            logger.debug('Repository stats retrieved', stats);
            return stats;
        } catch (error) {
            logger.error('Error retrieving repository stats', { error: error.message });
            throw error;
        }
    }

    async cleanup() {
        try {
            const now = new Date();
            let cleanedCount = 0;
            
            for (const [id, shortUrl] of this.urls.entries()) {
                if (shortUrl.isExpired()) {
                    await this.delete(id);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                logger.info('Repository cleanup completed', { cleanedCount });
            }
            
            return cleanedCount;
        } catch (error) {
            logger.error('Error during repository cleanup', { error: error.message });
            throw error;
        }
    }
}

module.exports = UrlRepository;
