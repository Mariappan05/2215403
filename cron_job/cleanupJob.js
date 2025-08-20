const cron = require('node-cron');
const { logger } = require('../middleware/logger');

class CleanupJob {
    constructor(urlService) {
        this.urlService = urlService;
        this.isRunning = false;
        this.lastRun = null;
        this.nextRun = null;
        
        logger.info('Cleanup job initialized');
    }

    start() {
        try {
            // Schedule cleanup every 30 minutes
            this.task = cron.schedule('*/30 * * * *', async () => {
                await this.runCleanup();
            }, {
                scheduled: true,
                timezone: 'UTC'
            });

            // Calculate next run time
            this.calculateNextRun();
            
            this.isRunning = true;
            logger.info('Cleanup job started successfully', { 
                schedule: 'Every 30 minutes',
                nextRun: this.nextRun 
            });
        } catch (error) {
            logger.error('Error starting cleanup job', { error: error.message });
            throw error;
        }
    }

    stop() {
        try {
            if (this.task) {
                this.task.stop();
                this.isRunning = false;
                logger.info('Cleanup job stopped');
            }
        } catch (error) {
            logger.error('Error stopping cleanup job', { error: error.message });
        }
    }

    async runCleanup() {
        if (this.isRunning) {
            logger.warn('Cleanup job already running, skipping this iteration');
            return;
        }

        try {
            this.isRunning = true;
            const startTime = Date.now();
            
            logger.info('Starting scheduled cleanup of expired URLs');
            
            const cleanedCount = await this.urlService.cleanupExpiredUrls();
            
            const duration = Date.now() - startTime;
            this.lastRun = new Date();
            this.calculateNextRun();
            
            logger.info('Scheduled cleanup completed', {
                cleanedCount,
                duration: `${duration}ms`,
                lastRun: this.lastRun,
                nextRun: this.nextRun
            });
        } catch (error) {
            logger.error('Error during scheduled cleanup', { error: error.message });
        } finally {
            this.isRunning = false;
        }
    }

    async runManualCleanup() {
        try {
            logger.info('Manual cleanup requested');
            
            const startTime = Date.now();
            const cleanedCount = await this.urlService.cleanupExpiredUrls();
            const duration = Date.now() - startTime;
            
            logger.info('Manual cleanup completed', {
                cleanedCount,
                duration: `${duration}ms`
            });
            
            return { cleanedCount, duration };
        } catch (error) {
            logger.error('Error during manual cleanup', { error: error.message });
            throw error;
        }
    }

    calculateNextRun() {
        try {
            // Calculate next run time (30 minutes from now)
            const now = new Date();
            this.nextRun = new Date(now.getTime() + 30 * 60 * 1000);
            
            logger.debug('Next cleanup run calculated', { nextRun: this.nextRun });
        } catch (error) {
            logger.error('Error calculating next run time', { error: error.message });
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            nextRun: this.nextRun,
            schedule: 'Every 30 minutes'
        };
    }

    destroy() {
        this.stop();
        logger.info('Cleanup job destroyed');
    }
}

module.exports = CleanupJob;
