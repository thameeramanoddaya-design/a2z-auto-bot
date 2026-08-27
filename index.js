const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Cookie Session හරහා Automation එක ආරම්භ වේ...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = (await browser.pages())[0];

  try {
    // Domain එක Load කර Cookie එක set කිරීම
    await page.goto('https://a2ztraders.lk', { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (fs.existsSync('cookies.json')) {
      const cookiesString = fs.readFileSync('cookies.json', 'utf8');
      const cookies = JSON.parse(cookiesString);
      
      for (let cookie of cookies) {
        delete cookie.hostOnly;
        delete cookie.session;
        delete cookie.storeId;
        delete cookie.id;
        if (cookie.sameSite === "unspecified") cookie.sameSite = "Lax";
        
        await page.setCookie(cookie);
      }
      console.log("🍪 Session Cookie එක සාර්ථකව Inject විය!");
    } else {
      console.log("⚠️ cookies.json File එක හමු වුණේ නැත!");
    }

    // Direct Login Bypass වී Dashboard එකට යාම
    console.log("🎯 Direct Dashboard එකට යනවා...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("✅ සාර්ථකව Dashboard එකට Log විය! Title:", await page.title());
    console.log("📍 Current URL:", page.url());

    await delay(15000);

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Task Complete! Browser එක වසනවා...");
    await browser.close();
  }
})();
