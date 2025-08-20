const { logger } = require('../middleware/logger');
const { body, param, validationResult } = require('express-validator');
const moment = require('moment');

class UrlController {
    constructor(urlService) {
        this.urlService = urlService;
        logger.info('URL controller initialized');
    }

    // Validation middleware
    validateCreateShortUrl() {
        return [
            body('url')
                .isURL()
                .withMessage('URL must be a valid URL format')
                .notEmpty()
                .withMessage('URL is required'),
            body('validity')
                .optional()
                .isInt({ min: 1, max: 1440 }) // Max 24 hours
                .withMessage('Validity must be an integer between 1 and 1440 minutes'),
            body('shortcode')
                .optional()
                .isLength({ min: 1, max: 20 })
                .withMessage('Shortcode must be between 1 and 20 characters')
                .matches(/^[a-zA-Z0-9_-]+$/)
                .withMessage('Shortcode must contain only alphanumeric characters, hyphens, and underscores')
        ];
    }

    validateShortcode() {
        return [
            param('shortcode')
                .isLength({ min: 1, max: 20 })
                .withMessage('Shortcode must be between 1 and 20 characters')
                .matches(/^[a-zA-Z0-9_-]+$/)
                .withMessage('Shortcode must contain only alphanumeric characters, hyphens, and underscores')
        ];
    }

    // Create short URL endpoint
    async createShortUrl(req, res) {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Validation failed for create short URL', { errors: errors.array() });
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { url, validity, shortcode } = req.body;
            
            logger.info('Creating short URL request received', { url, validity, shortcode });
            
            // Create short URL
            const shortUrl = await this.urlService.createShortUrl({
                url,
                validity,
                shortcode
            });

            // Build response
            const shortLink = `${req.protocol}://${req.get('host')}/${shortUrl.shortcode}`;
            const response = {
                shortLink,
                expiry: shortUrl.expiresAt.toISOString()
            };

            logger.info('Short URL created successfully', { 
                shortcode: shortUrl.shortcode, 
                shortLink,
                expiry: response.expiry 
            });

            res.status(201).json(response);
        } catch (error) {
            logger.error('Error in createShortUrl controller', { error: error.message });
            
            if (error.message === 'Custom shortcode already exists') {
                return res.status(409).json({
                    success: false,
                    error: 'Shortcode already exists',
                    message: 'The requested custom shortcode is already in use'
                });
            }

            if (error.message === 'Invalid URL format') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid URL format',
                    message: 'Please provide a valid URL'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'An error occurred while creating the short URL'
            });
        }
    }

    // Redirect to original URL endpoint
    async redirectToOriginalUrl(req, res) {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Validation failed for redirect', { errors: errors.array() });
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { shortcode } = req.params;
            
            logger.info('Redirect request received', { shortcode });
            
            // Prepare request data for analytics
            const requestData = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                referer: req.get('Referer')
            };

            // Get original URL and redirect
            const originalUrl = await this.urlService.redirectToOriginalUrl(shortcode, requestData);
            
            logger.info('Redirecting to original URL', { shortcode, originalUrl });
            
            res.redirect(originalUrl);
        } catch (error) {
            logger.error('Error in redirectToOriginalUrl controller', { 
                shortcode: req.params.shortcode, 
                error: error.message 
            });
            
            if (error.message === 'Short URL not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'The requested short URL does not exist'
                });
            }

            if (error.message === 'Short URL has expired') {
                return res.status(410).json({
                    success: false,
                    error: 'Gone',
                    message: 'The requested short URL has expired'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'An error occurred while processing the redirect'
            });
        }
    }

    // Get short URL statistics endpoint
    async getShortUrlStats(req, res) {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Validation failed for get stats', { errors: errors.array() });
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { shortcode } = req.params;
            
            logger.info('Statistics request received', { shortcode });
            
            // Get statistics
            const stats = await this.urlService.getShortUrlStats(shortcode);
            
            logger.info('Statistics retrieved successfully', { shortcode });
            
            res.json(stats);
        } catch (error) {
            logger.error('Error in getShortUrlStats controller', { 
                shortcode: req.params.shortcode, 
                error: error.message 
            });
            
            if (error.message === 'Short URL not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'The requested short URL does not exist'
                });
            }

            if (error.message === 'Short URL has expired') {
                return res.status(410).json({
                    success: false,
                    error: 'Gone',
                    message: 'The requested short URL has expired'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'An error occurred while retrieving statistics'
            });
        }
    }

    // Health check endpoint
    async healthCheck(req, res) {
        try {
            logger.debug('Health check request received');
            
            const stats = await this.urlService.getServiceStats();
            
            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                stats
            };
            
            logger.debug('Health check completed', { status: healthStatus.status });
            
            res.json(healthStatus);
        } catch (error) {
            logger.error('Error in health check', { error: error.message });
            
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }

    // Error handler middleware
    errorHandler(err, req, res, next) {
        logger.error('Unhandled error in controller', { 
            error: err.message, 
            stack: err.stack,
            url: req.url,
            method: req.method
        });

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred'
        });
    }
}

module.exports = UrlController;
