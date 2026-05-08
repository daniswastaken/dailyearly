const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('Testing Puppeteer...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Browser launched successfully!');
        const page = await browser.newPage();
        await page.goto('https://www.google.com');
        console.log('Page loaded:', await page.title());
        await browser.close();
        console.log('Test completed successfully!');
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
})();
