const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

async function run() {
  let browser;
  try {
    const executablePath = await chromium.executablePath;
    if (!executablePath) {
      console.log("No executable path found for chromium.");
      return;
    }
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: chromium.args
    });
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err));

    console.log("Navigating to admin page...");
    const response = await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' });
    console.log("Page status:", response.status());

    // Wait for the login form
    await page.waitForSelector('input[type="email"]');
    console.log("Found email input.");
    
    await page.type('input[type="email"]', 'mohamedfazilpasha156@gmail.com');
    await page.type('input[type="password"]', 'TGVINCENZO');
    console.log("Credentials entered. Clicking submit...");
    
    await page.click('button[type="submit"]');
    
    // Wait for something to change
    await page.waitForTimeout(2000);
    
    // Check if we are logged in (look for a dashboard element)
    const dashboardExists = await page.$('div:contains("System Overview")') || await page.$('h2');
    if (dashboardExists) {
      const text = await page.evaluate(el => el.textContent, dashboardExists);
      console.log("Dashboard element found:", text);
    } else {
      console.log("Dashboard element NOT found. Login might have failed.");
    }
  } catch (err) {
    console.error("Puppeteer script error:", err);
  } finally {
    if (browser) await browser.close();
  }
}
run();
