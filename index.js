const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger, loggingMiddleware } = require('./middleware/logger');
const config = require('./config/config');
const UrlRepository = require('./repository/urlRepository');
const UrlService = require('./service/urlService');
const UrlRoutes = require('./route/urlRoutes');
const CleanupJob = require('./cron_job/cleanupJob');

class UrlShortenerApp {
    constructor() {
        this.app = express();
        this.server = null;
        this.cleanupJob = null;
        
        logger.info('URL Shortener application initializing');
    }

    async initialize() {
        try {
            // Initialize dependencies
            await this.initializeDependencies();
            
            // Setup middleware
            this.setupMiddleware();
            
            // Setup routes
            this.setupRoutes();
            
            // Setup cleanup job
            this.setupCleanupJob();
            
            // Setup error handling
            this.setupErrorHandling();
            
            logger.info('URL Shortener application initialized successfully');
        } catch (error) {
            logger.fatal('Failed to initialize application', { error: error.message });
            throw error;
        }
    }

    async initializeDependencies() {
        try {
            // Initialize repository
            this.urlRepository = new UrlRepository();
            
            // Initialize service
            this.urlService = new UrlService(this.urlRepository);
            
            logger.info('Dependencies initialized successfully');
        } catch (error) {
            logger.error('Error initializing dependencies', { error: error.message });
            throw error;
        }
    }

    setupMiddleware() {
        try {
            // Security middleware
            this.app.use(helmet());
            
            // CORS middleware
            this.app.use(cors({
                origin: process.env.NODE_ENV === 'production' ? false : true,
                credentials: true
            }));
            
            // Rate limiting
            const limiter = rateLimit(config.rateLimit);
            this.app.use(limiter);
            
            // Body parsing middleware
            this.app.use(express.json({ limit: '10mb' }));
            this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
            
            // Custom logging middleware (MUST be used extensively as per requirements)
            this.app.use(loggingMiddleware);
            
            // Trust proxy for accurate IP addresses
            this.app.set('trust proxy', 1);
            
            logger.info('Middleware setup completed');
        } catch (error) {
            logger.error('Error setting up middleware', { error: error.message });
            throw error;
        }
    }

    setupRoutes() {
        try {
            // Health check route (before main routes)
            this.app.get('/health', (req, res) => {
                res.json({ 
                    status: 'healthy', 
                    timestamp: new Date().toISOString(),
                    service: 'URL Shortener Microservice'
                });
            });
            
            // Main API routes
            const urlRoutes = new UrlRoutes(this.urlService);
            this.app.use('/', urlRoutes.getRouter());
            
            // 404 handler for unmatched routes
            this.app.use('*', (req, res) => {
                logger.warn('Route not found', { method: req.method, url: req.url });
                res.status(404).json({
                    success: false,
                    error: 'Not found',
                    message: 'The requested endpoint does not exist'
                });
            });
            
            logger.info('Routes setup completed');
        } catch (error) {
            logger.error('Error setting up routes', { error: error.message });
            throw error;
        }
    }

    setupCleanupJob() {
        try {
            this.cleanupJob = new CleanupJob(this.urlService);
            this.cleanupJob.start();
            
            logger.info('Cleanup job setup completed');
        } catch (error) {
            logger.error('Error setting up cleanup job', { error: error.message });
            // Don't throw error as cleanup job is not critical for app startup
        }
    }

    setupErrorHandling() {
        try {
            // Global error handler
            this.app.use((err, req, res, next) => {
                logger.error('Unhandled application error', {
                    error: err.message,
                    stack: err.stack,
                    url: req.url,
                    method: req.method,
                    ip: req.ip
                });
                
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'An unexpected error occurred'
                });
            });
            
            // Graceful shutdown handler
            process.on('SIGTERM', () => this.gracefulShutdown());
            process.on('SIGINT', () => this.gracefulShutdown());
            
            logger.info('Error handling setup completed');
        } catch (error) {
            logger.error('Error setting up error handling', { error: error.message });
            throw error;
        }
    }

    async start() {
        try {
            const port = config.port;
            const host = config.host;
            
            this.server = this.app.listen(port, host, () => {
                logger.info('URL Shortener Microservice started successfully', {
                    host,
                    port,
                    environment: config.environment,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`🚀 URL Shortener Microservice running at http://${host}:${port}`);
                console.log(`📊 Health check: http://${host}:${port}/health`);
                console.log(`📝 API Documentation: http://${host}:${port}/shorturls`);
            });
            
            // Handle server errors
            this.server.on('error', (error) => {
                logger.error('Server error', { error: error.message });
                throw error;
            });
            
        } catch (error) {
            logger.fatal('Failed to start server', { error: error.message });
            throw error;
        }
    }

    async gracefulShutdown() {
        try {
            logger.info('Graceful shutdown initiated');
            
            // Stop cleanup job
            if (this.cleanupJob) {
                this.cleanupJob.destroy();
            }
            
            // Close server
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
            }
            
            logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown', { error: error.message });
            process.exit(1);
        }
    }

    getApp() {
        return this.app;
    }

    getServer() {
        return this.server;
    }
}

// Start the application
async function main() {
    try {
        const app = new UrlShortenerApp();
        await app.initialize();
        await app.start();
    } catch (error) {
        logger.fatal('Application startup failed', { error: error.message });
        process.exit(1);
    }
}

// Run the application if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = UrlShortenerApp;
