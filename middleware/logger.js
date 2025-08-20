const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            fatal: 4
        };
        
        this.currentLevel = process.env.LOG_LEVEL || 'info';
        this.logDir = path.join(__dirname, '../logs');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    _getTimestamp() {
        return new Date().toISOString();
    }

    _writeLog(level, message, meta = {}) {
        const timestamp = this._getTimestamp();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta
        };

        const logString = JSON.stringify(logEntry) + '\n';
        const logFile = path.join(this.logDir, `${level}.log`);
        
        fs.appendFileSync(logFile, logString);
        
        // Also log to console for development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
        }
    }

    _shouldLog(level) {
        return this.logLevels[level] >= this.logLevels[this.currentLevel];
    }

    debug(message, meta = {}) {
        if (this._shouldLog('debug')) {
            this._writeLog('debug', message, meta);
        }
    }

    info(message, meta = {}) {
        if (this._shouldLog('info')) {
            this._writeLog('info', message, meta);
        }
    }

    warn(message, meta = {}) {
        if (this._shouldLog('warn')) {
            this._writeLog('warn', message, meta);
        }
    }

    error(message, meta = {}) {
        if (this._shouldLog('error')) {
            this._writeLog('error', message, meta);
        }
    }

    fatal(message, meta = {}) {
        if (this._shouldLog('fatal')) {
            this._writeLog('fatal', message, meta);
        }
    }
}

// Create logger instance
const logger = new Logger();

// Middleware function for Express
const loggingMiddleware = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - start;
        
        logger.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length') || 0
        });
        
        originalEnd.call(this, chunk, encoding);
    };

    next();
};

module.exports = { logger, loggingMiddleware };
