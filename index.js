const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Launching Anti-Detection Browser...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--no-sandbox'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  // JavaScript DevTools Blocker එක (F12 back වෙන එක) Disable කිරීම
  await page.evaluateOnNewDocument(() => {
    // Overwrite navigator flags
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    
    // DevTools & Key Blockers Bypass
    window.addEventListener('keydown', (e) => e.stopPropagation(), true);
    window.oncontextmenu = null;
    window.onkeydown = null;
  });

  // Real Mac Browser User Agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    console.log("🔑 Navigating to Login Page...");
    
    // about:blank නොවී Direct Site එකට යාම
    await page.goto('https://a2ztraders.lk/index.php/Login', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    console.log("⏳ Waiting for Cloudflare/Protection to pass...");
    await delay(5000);

    console.log("🔍 Extracting Form & Page HTML...\n");

    // Page එකේ තියෙන Form HTML ටික Grab කිරීම
    const pageHTML = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      if (forms.length > 0) {
        return Array.from(forms).map(f => f.outerHTML).join('\n---\n');
      }
      return document.body.innerHTML;
    });

    console.log("==================== GRABBED HTML ====================");
    console.log(pageHTML);
    console.log("======================================================\n");

    await delay(5000);

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    console.log("🏁 Closing Browser...");
    await browser.close();
  }
})();
