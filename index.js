const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting Chrome Browser on your PC...");

  const email = "thameeramanoddaya@gmail.com";
  const password = "123456";

  const browser = await puppeteer.launch({
    headless: false, // PC එකේ Window එක පෙනෙන ලෙස
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

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

    console.log("✅ Logged In! Now Navigating to Dashboard...");
    
    // Direct Dashboard Link එකට යාම
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("🎯 Currently on Dashboard:", page.url());

    // Dashboard එක බලාගැනීමට තත්පර 10ක් Open තබයි
    await delay(10000);

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Task Finished!");
    await browser.close();
  }
})();
