const ShortUrl = require('../models/shortUrl');
const Logger = require('../logger/logger');

// Validate URL format
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const createShortUrl = async (req, res) => {
    try {
        const { url, validity, shortcode } = req.body;
        await Logger.log('info', 'controller', 'Creating new short URL');

        // Validate input URL
        if (!url || !isValidUrl(url)) {
            await Logger.log('error', 'controller', 'Invalid URL provided');
            return res.status(400).json({ error: 'Valid URL is required' });
        }

        // Validate validity period
        const validityHours = validity || 24;
        if (validityHours < 1 || validityHours > 720) {
            await Logger.log('error', 'controller', 'Invalid validity period');
            return res.status(400).json({ error: 'Validity must be between 1 and 720 hours' });
        }

        // Generate or validate shortcode
        const urlCode = shortcode || Math.random().toString(36).substring(2, 8);
        if (!/^[a-zA-Z0-9]{4,}$/.test(urlCode)) {
            await Logger.log('error', 'controller', 'Invalid shortcode format');
            return res.status(400).json({ error: 'Shortcode must be alphanumeric and at least 4 characters' });
        }

        const shortUrl = new ShortUrl({
            originalUrl: url,
            shortcode: urlCode,
            validity: validityHours,
            createdAt: new Date()
        });

        const saved = await shortUrl.save();
        await Logger.log('info', 'controller', `URL created with code: ${urlCode}`);
        
        return res.status(201).json({
            originalUrl: saved.originalUrl,
            shortUrl: `${req.protocol}://${req.get('host')}/${urlCode}`,
            shortcode: saved.shortcode,
            validity: saved.validity,
            expiresAt: new Date(saved.createdAt.getTime() + saved.validity * 60 * 60 * 1000)
        });

    } catch (error) {
        if (error.code === 11000) {
            await Logger.log('error', 'controller', 'Duplicate shortcode');
            return res.status(409).json({ error: 'Shortcode already exists' });
        }
        await Logger.log('error', 'controller', error.message);
        return res.status(500).json({ error: 'Error creating short URL' });
    }
};

const redirectToUrl = async (req, res) => {
    try {
        const { shortcode } = req.params;
        const shortUrl = await ShortUrl.findOne({ shortcode });

        if (!shortUrl) {
            await Logger.log('error', 'controller', 'URL not found');
            return res.status(404).json({ error: 'URL not found' });
        }

        // Check expiration
        const expirationTime = new Date(shortUrl.createdAt.getTime() + shortUrl.validity * 60 * 60 * 1000);
        if (expirationTime < new Date()) {
            await Logger.log('error', 'controller', 'URL expired');
            return res.status(410).json({ error: 'URL has expired' });
        }

        // Update click count
        shortUrl.clicks += 1;
        await shortUrl.save();
        
        await Logger.log('info', 'controller', `Redirecting ${shortcode}`);
        return res.redirect(shortUrl.originalUrl);

    } catch (error) {
        await Logger.log('error', 'controller', error.message);
        return res.status(500).json({ error: 'Error redirecting to URL' });
    }
};

const getUrlStats = async (req, res) => {
    try {
        const { shortcode } = req.params;
        const shortUrl = await ShortUrl.findOne({ shortcode });

        if (!shortUrl) {
            await Logger.log('error', 'controller', 'URL not found');
            return res.status(404).json({ error: 'URL not found' });
        }

        const expirationTime = new Date(shortUrl.createdAt.getTime() + shortUrl.validity * 60 * 60 * 1000);
        await Logger.log('info', 'controller', `Stats retrieved for ${shortcode}`);

        return res.status(200).json({
            originalUrl: shortUrl.originalUrl,
            shortcode: shortUrl.shortcode,
            clicks: shortUrl.clicks,
            createdAt: shortUrl.createdAt,
            expiresAt: expirationTime,
            isExpired: expirationTime < new Date()
        });

    } catch (error) {
        await Logger.log('error', 'controller', error.message);
        return res.status(500).json({ error: 'Error retrieving URL stats' });
    }
};

module.exports = {
    createShortUrl,
    redirectToUrl,
    getUrlStats
};