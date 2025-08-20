const { logger } = require('../middleware/logger');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const geoip = require('geoip-lite');
const ShortUrl = require('../domain/ShortUrl');
const config = require('../config/config');

class UrlService {
    constructor(urlRepository) {
        this.urlRepository = urlRepository;
        logger.info('URL service initialized');
    }

    generateShortcode() {
        try {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let shortcode = '';
            
            for (let i = 0; i < config.shortcodeLength; i++) {
                shortcode += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            logger.debug('Generated shortcode', { shortcode });
            return shortcode;
        } catch (error) {
            logger.error('Error generating shortcode', { error: error.message });
            throw error;
        }
    }

    async generateUniqueShortcode() {
        try {
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
                const shortcode = this.generateShortcode();
                
                // Check if shortcode already exists
                const existing = await this.urlRepository.findByShortcode(shortcode);
                if (!existing) {
                    logger.debug('Unique shortcode generated', { shortcode, attempts });
                    return shortcode;
                }
                
                attempts++;
                logger.debug('Shortcode collision, retrying', { shortcode, attempts });
            }
            
            throw new Error('Unable to generate unique shortcode after maximum attempts');
        } catch (error) {
            logger.error('Error generating unique shortcode', { error: error.message });
            throw error;
        }
    }

    calculateExpiryTime(validityMinutes) {
        try {
            const validity = validityMinutes || config.defaultValidity;
            const expiryTime = moment().add(validity, 'minutes').toDate();
            
            logger.debug('Calculated expiry time', { validityMinutes, expiryTime });
            return expiryTime;
        } catch (error) {
            logger.error('Error calculating expiry time', { error: error.message, validityMinutes });
            throw error;
        }
    }

    async createShortUrl(urlData) {
        try {
            logger.info('Creating short URL', { originalUrl: urlData.url, validity: urlData.validity });
            
            // Validate input
            const urlValidation = ShortUrl.validateUrl(urlData.url);
            if (!urlValidation.isValid) {
                throw new Error(urlValidation.error);
            }

            let shortcode = urlData.shortcode;
            
            // Generate shortcode if not provided
            if (!shortcode) {
                shortcode = await this.generateUniqueShortcode();
                logger.info('No shortcode provided, generated new one', { shortcode });
            } else {
                // Validate custom shortcode
                const shortcodeValidation = ShortUrl.validateShortcode(shortcode);
                if (!shortcodeValidation.isValid) {
                    throw new Error(shortcodeValidation.error);
                }
                
                // Check if custom shortcode is available
                const existing = await this.urlRepository.findByShortcode(shortcode);
                if (existing) {
                    throw new Error('Custom shortcode already exists');
                }
                
                logger.info('Using custom shortcode', { shortcode });
            }

            // Calculate expiry time
            const expiresAt = this.calculateExpiryTime(urlData.validity);
            
            // Create short URL
            const shortUrlData = {
                originalUrl: urlData.url,
                shortcode,
                expiresAt
            };
            
            const shortUrl = await this.urlRepository.create(shortUrlData);
            
            logger.info('Short URL created successfully', { 
                id: shortUrl.id, 
                shortcode: shortUrl.shortcode,
                expiresAt: shortUrl.expiresAt 
            });
            
            return shortUrl;
        } catch (error) {
            logger.error('Error creating short URL', { error: error.message, urlData });
            throw error;
        }
    }

    async redirectToOriginalUrl(shortcode, requestData) {
        try {
            logger.info('Processing redirect request', { shortcode });
            
            // Find the short URL
            const shortUrl = await this.urlRepository.findByShortcode(shortcode);
            if (!shortUrl) {
                logger.warn('Short URL not found for redirect', { shortcode });
                throw new Error('Short URL not found');
            }

            // Check if expired
            if (shortUrl.isExpired()) {
                logger.info('Short URL expired, cannot redirect', { shortcode, expiry: shortUrl.expiresAt });
                throw new Error('Short URL has expired');
            }

            // Extract location information from IP
            const location = this.extractLocation(requestData.ip);
            
            // Prepare click data
            const clickData = {
                ip: requestData.ip,
                userAgent: requestData.userAgent,
                referer: requestData.referer,
                location
            };
            
            // Add click to statistics
            await this.urlRepository.addClick(shortcode, clickData);
            
            logger.info('Redirect processed successfully', { 
                shortcode, 
                originalUrl: shortUrl.originalUrl,
                clickCount: shortUrl.getClickCount() 
            });
            
            return shortUrl.originalUrl;
        } catch (error) {
            logger.error('Error processing redirect', { shortcode, error: error.message });
            throw error;
        }
    }

    async getShortUrlStats(shortcode) {
        try {
            logger.info('Retrieving short URL statistics', { shortcode });
            
            const shortUrl = await this.urlRepository.findByShortcode(shortcode);
            if (!shortUrl) {
                logger.warn('Short URL not found for statistics', { shortcode });
                throw new Error('Short URL not found');
            }

            // Check if expired
            if (shortUrl.isExpired()) {
                logger.info('Short URL expired, cannot retrieve statistics', { shortcode, expiry: shortUrl.expiresAt });
                throw new Error('Short URL has expired');
            }

            const stats = {
                shortcode: shortUrl.shortcode,
                originalUrl: shortUrl.originalUrl,
                createdAt: shortUrl.createdAt,
                expiresAt: shortUrl.expiresAt,
                totalClicks: shortUrl.getClickCount(),
                timeUntilExpiry: shortUrl.getTimeUntilExpiry(),
                clicks: shortUrl.clicks.map(click => ({
                    timestamp: click.timestamp,
                    ip: click.ip,
                    userAgent: click.userAgent,
                    referer: click.referer,
                    location: click.location
                }))
            };
            
            logger.info('Short URL statistics retrieved successfully', { 
                shortcode, 
                totalClicks: stats.totalClicks 
            });
            
            return stats;
        } catch (error) {
            logger.error('Error retrieving short URL statistics', { shortcode, error: error.message });
            throw error;
        }
    }

    extractLocation(ip) {
        try {
            if (!ip || ip === '::1' || ip === '127.0.0.1') {
                return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
            }
            
            const geo = geoip.lookup(ip);
            if (!geo) {
                return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
            }
            
            const location = {
                country: geo.country || 'Unknown',
                region: geo.region || 'Unknown',
                city: geo.city || 'Unknown'
            };
            
            logger.debug('Location extracted from IP', { ip, location });
            return location;
        } catch (error) {
            logger.error('Error extracting location from IP', { ip, error: error.message });
            return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
        }
    }

    async cleanupExpiredUrls() {
        try {
            logger.info('Starting cleanup of expired URLs');
            
            const cleanedCount = await this.urlRepository.cleanup();
            
            logger.info('Cleanup completed', { cleanedCount });
            return cleanedCount;
        } catch (error) {
            logger.error('Error during cleanup', { error: error.message });
            throw error;
        }
    }

    async getServiceStats() {
        try {
            logger.debug('Retrieving service statistics');
            
            const repoStats = await this.urlRepository.getStats();
            const cacheStats = repoStats.cacheStats;
            
            const serviceStats = {
                totalUrls: repoStats.totalUrls,
                activeUrls: repoStats.activeUrls,
                expiredUrls: repoStats.expiredUrls,
                cache: {
                    size: cacheStats.size,
                    maxSize: cacheStats.maxSize,
                    utilization: cacheStats.utilization,
                    ttl: cacheStats.ttl
                },
                timestamp: new Date()
            };
            
            logger.debug('Service statistics retrieved', serviceStats);
            return serviceStats;
        } catch (error) {
            logger.error('Error retrieving service statistics', { error: error.message });
            throw error;
        }
    }
}

module.exports = UrlService;
