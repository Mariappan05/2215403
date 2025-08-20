const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class ShortUrl {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.originalUrl = data.originalUrl;
        this.shortcode = data.shortcode;
        this.createdAt = data.createdAt || new Date();
        this.expiresAt = data.expiresAt;
        this.isActive = data.isActive !== false;
        this.clicks = data.clicks || [];
        
        // Validate required fields
        if (!this.originalUrl) {
            throw new Error('Original URL is required');
        }
        
        if (!this.shortcode) {
            throw new Error('Shortcode is required');
        }
    }

    addClick(clickData) {
        const click = {
            id: uuidv4(),
            timestamp: new Date(),
            ip: clickData.ip,
            userAgent: clickData.userAgent,
            referer: clickData.referer,
            location: clickData.location
        };
        
        this.clicks.push(click);
        return click;
    }

    getClickCount() {
        return this.clicks.length;
    }

    isExpired() {
        if (!this.expiresAt) return false;
        return moment().isAfter(this.expiresAt);
    }

    getTimeUntilExpiry() {
        if (!this.expiresAt) return null;
        const now = moment();
        const expiry = moment(this.expiresAt);
        return expiry.diff(now, 'minutes');
    }

    toJSON() {
        return {
            id: this.id,
            originalUrl: this.originalUrl,
            shortcode: this.shortcode,
            createdAt: this.createdAt,
            expiresAt: this.expiresAt,
            isActive: this.isActive,
            clickCount: this.getClickCount(),
            clicks: this.clicks
        };
    }

    static validateShortcode(shortcode) {
        if (!shortcode || typeof shortcode !== 'string') {
            return { isValid: false, error: 'Shortcode must be a non-empty string' };
        }
        
        if (shortcode.length > 20) {
            return { isValid: false, error: 'Shortcode must be 20 characters or less' };
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(shortcode)) {
            return { isValid: false, error: 'Shortcode must contain only alphanumeric characters, hyphens, and underscores' };
        }
        
        return { isValid: true };
    }

    static validateUrl(url) {
        try {
            new URL(url);
            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: 'Invalid URL format' };
        }
    }
}

module.exports = ShortUrl;
