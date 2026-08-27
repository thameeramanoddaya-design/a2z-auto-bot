const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

// Bot Detection වැළැක්වීම සඳහා Stealth Plugin එක භාවිතය
puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting Stealth Browser...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: path.join(__dirname, 'my_chrome_data'),
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  try {
    console.log("🔑 Opening Login Page...");
    
    // 1. කෙලින්ම Login Page එකට යාම
    await page.goto('https://a2ztraders.lk/index.php/Login', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    console.log("✍️ Auto filling credentials...");
    
    // Input Fields එනකන් Wait කිරීම
    await page.waitForSelector('input[name="email"], input[type="text"]', { visible: true });

    // Email & Password Type කිරීම
    await page.type('input[name="email"], input[type="text"]', 'thameeramanoddaya@gmail.com', { delay: 100 });
    await page.type('input[name="password"], input[type="password"]', '123456', { delay: 100 });

    await delay(1000);

    console.log("🔘 Submitting Form...");

    // Submit කර Navigation එක සාර්ථක වන තෙක් Wait කිරීම (Auto-back වීම වැළැක්වීමට)
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 })
    ]);

    console.log("✅ Successfully Logged In & Session Saved!");
    console.log("Current URL:", page.url());

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  }
})();
