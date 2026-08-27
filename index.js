const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Open කර තියෙන Real Chrome එකට Connect වෙනවා...");

  try {
    // Port 9222 හරහා Real Chrome එකට Connect වීම (Automation Detection 0% යි)
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    console.log("✅ Real Chrome එකට සාර්ථකව Connect වුණා!");

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    console.log("🔑 direct Dashboard පිටුවට යනවා...");
    await page.goto('https://a2ztraders.lk/Drop_dash', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    await delay(3000);

    console.log("🎉 සාර්ථකයි! Current URL:", page.url());
    console.log("📌 Page Title:", await page.title());

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  }
})();
