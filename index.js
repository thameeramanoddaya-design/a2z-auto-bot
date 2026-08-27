const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting Cookie Saver...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log("🔑 Navigating to Login Page...");
    await page.goto('https://a2ztraders.lk/index.php/Login', { waitUntil: 'networkidle2' });

    console.log("✍️ Entering credentials...");
    await page.waitForSelector('input[name="email"], input[type="text"]', { visible: true });
    await page.type('input[name="email"], input[type="text"]', 'thameeramanoddaya@gmail.com', { delay: 50 });
    await page.type('input[name="password"], input[type="password"]', '123456', { delay: 50 });

    await delay(1000);

    console.log("🔘 Logging In...");
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // Login වූ පසු Cookies extract කර Save කිරීම
    const cookies = await page.cookies();
    fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

    console.log("✅ Cookies saved successfully to 'cookies.json'!");

  } catch (err) {
    console.error("❌ Error saving cookies:", err.message);
  } finally {
    await browser.close();
  }
})();
