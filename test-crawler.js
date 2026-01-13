const { CrawlerService } = require('./apps/api/src/app/crawler.service');
const { CrawlerConfigService } = require('./apps/api/src/app/crawler.config');
const { DbService } = require('./apps/api/src/app/db/db.service');

console.log('Testing crawler service...');

// For a simple test, we'll just check if the services can be instantiated
try {
    const dbService = new DbService();
    console.log('✓ DbService created');

    const configService = new CrawlerConfigService();
    console.log('✓ CrawlerConfigService created');

    const crawlerService = new CrawlerService(dbService, configService);
    console.log('✓ CrawlerService created');

    console.log('All services initialized successfully!');
    console.log('Note: To actually run crawling, you need to:');
    console.log('1. Start the database: npm run docker:up');
    console.log('2. Start the backend: npm run start:backend');
    console.log('3. Use the API endpoints to trigger crawling');

} catch (error) {
    console.error('Error initializing services:', error.message);
}