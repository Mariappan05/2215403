const express = require('express');
const { logger } = require('../middleware/logger');
const UrlController = require('../controller/urlController');

class UrlRoutes {
    constructor(urlService) {
        this.router = express.Router();
        this.urlController = new UrlController(urlService);
        
        this.initializeRoutes();
        logger.info('URL routes initialized');
    }

    initializeRoutes() {
        // Create short URL endpoint
        this.router.post('/shorturls', 
            this.urlController.validateCreateShortUrl(),
            this.urlController.createShortUrl.bind(this.urlController)
        );

        // Get short URL statistics endpoint
        this.router.get('/shorturls/:shortcode',
            this.urlController.validateShortcode(),
            this.urlController.getShortUrlStats.bind(this.urlController)
        );

        // Redirect to original URL endpoint (catch-all for shortcodes)
        this.router.get('/:shortcode',
            this.urlController.validateShortcode(),
            this.urlController.redirectToOriginalUrl.bind(this.urlController)
        );

        // Health check endpoint
        this.router.get('/health',
            this.urlController.healthCheck.bind(this.urlController)
        );

        // Error handling middleware
        this.router.use(this.urlController.errorHandler.bind(this.urlController));

        logger.debug('Routes configured', {
            routes: [
                'POST /shorturls',
                'GET /shorturls/:shortcode',
                'GET /:shortcode',
                'GET /health'
            ]
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = UrlRoutes;
