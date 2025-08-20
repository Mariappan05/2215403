const { logger } = require('../middleware/logger');
const UrlRepository = require('../repository/urlRepository');
const UrlService = require('../service/urlService');

// Simple test to demonstrate functionality
async function runTests() {
    try {
        logger.info('Starting URL Shortener tests');
        
        // Initialize services
        const urlRepository = new UrlRepository();
        const urlService = new UrlService(urlRepository);
        
        // Test 1: Create short URL without custom shortcode
        logger.info('Test 1: Creating short URL without custom shortcode');
        const shortUrl1 = await urlService.createShortUrl({
            url: 'https://example.com/very-long-url-with-many-parameters',
            validity: 60
        });
        
        logger.info('Short URL 1 created', { 
            shortcode: shortUrl1.shortcode, 
            originalUrl: shortUrl1.originalUrl,
            expiresAt: shortUrl1.expiresAt 
        });
        
        // Test 2: Create short URL with custom shortcode
        logger.info('Test 2: Creating short URL with custom shortcode');
        const shortUrl2 = await urlService.createShortUrl({
            url: 'https://google.com/search?q=nodejs+url+shortener',
            validity: 120,
            shortcode: 'google'
        });
        
        logger.info('Short URL 2 created', { 
            shortcode: shortUrl2.shortcode, 
            originalUrl: shortUrl2.originalUrl,
            expiresAt: shortUrl2.expiresAt 
        });
        
        // Test 3: Simulate clicks and get statistics
        logger.info('Test 3: Simulating clicks and getting statistics');
        
        // Simulate some clicks
        await urlService.redirectToOriginalUrl(shortUrl1.shortcode, {
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            referer: 'https://google.com'
        });
        
        await urlService.redirectToOriginalUrl(shortUrl1.shortcode, {
            ip: '192.168.1.101',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            referer: 'https://facebook.com'
        });
        
        // Get statistics
        const stats1 = await urlService.getShortUrlStats(shortUrl1.shortcode);
        logger.info('Statistics for Short URL 1', { 
            shortcode: stats1.shortcode,
            totalClicks: stats1.totalClicks,
            clicks: stats1.clicks.length 
        });
        
        // Test 4: Get service statistics
        logger.info('Test 4: Getting service statistics');
        const serviceStats = await urlService.getServiceStats();
        logger.info('Service statistics', serviceStats);
        
        // Test 5: Test cleanup
        logger.info('Test 5: Testing cleanup functionality');
        const cleanupResult = await urlService.cleanupExpiredUrls();
        logger.info('Cleanup completed', { cleanedCount: cleanupResult });
        
        logger.info('All tests completed successfully!');
        
        // Display summary
        console.log('\n=== TEST SUMMARY ===');
        console.log(`✅ Created ${shortUrl1.shortcode} -> ${shortUrl1.originalUrl}`);
        console.log(`✅ Created ${shortUrl2.shortcode} -> ${shortUrl2.originalUrl}`);
        console.log(`✅ Simulated ${stats1.totalClicks} clicks on ${shortUrl1.shortcode}`);
        console.log(`✅ Service has ${serviceStats.totalUrls} total URLs`);
        console.log(`✅ Cleanup removed ${cleanupResult} expired URLs`);
        console.log('\n🎉 All tests passed!');
        
    } catch (error) {
        logger.error('Test failed', { error: error.message, stack: error.stack });
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { runTests };
