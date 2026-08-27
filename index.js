const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting Stealth Browser on GitHub Actions...");

  const email = "thameeramanoddaya@gmail.com";
  const password = "123456";

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    console.log("🔑 Navigating to Login Page...");
    await page.goto('https://a2ztraders.lk/index.php/Login', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("✍️ Entering Credentials...");
    await page.waitForSelector('input[name="email"], input[type="text"]', { visible: true });

    await page.type('input[name="email"], input[type="text"]', email, { delay: 100 });
    await page.type('input[name="password"], input[type="password"]', password, { delay: 100 });

    await delay(1000);

    console.log("🔘 Logging In...");
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);

    console.log("✅ Successfully Logged In!");
    console.log("Current Page URL:", page.url());

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Task Finished!");
    await browser.close();
  }
})();
