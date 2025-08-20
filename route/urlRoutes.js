const express = require('express');
const router = express.Router();
const UrlController = require('../controller/urlController');

// Define routes
router.post('/shorturls', UrlController.createShortUrl);
router.get('/shorturls/:shortcode', UrlController.getUrlStats);
router.get('/:shortcode', UrlController.redirectToUrl);

module.exports = router;
