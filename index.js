const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Runner Browser එක PC එකේ Open කරමින් පවතී...");

  const browser = await puppeteer.launch({
    headless: false, // PC එකේ Window එක පෙනෙන ලෙස
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = (await browser.pages())[0];

  try {
    console.log("🔑 Login Page එකට යනවා...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2' });

    console.log("\n=======================================================");
    console.log("👉 PC එකේ Open වුණු Browser එකෙන් Manual Log වෙන්න!");
    console.log("⏳ Session එක Auto-Save වීමට තත්පර 60ක් ලබා දී ඇත...");
    console.log("=======================================================\n");

    // ඔයාට Manual Log වෙන්න තත්පර 60ක් ලබා දෙයි
    await delay(60000);

    // Dashboard එකේ ඉද්දී Session Cookies Auto-Save කරගැනීම
    const cookies = await page.cookies();
    fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

    console.log("✅ Session Cookies සාර්ථකව 'cookies.json' එකට Save විය!");
    console.log("📍 Wrote cookies to local directory successfully.");

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Step Complete! Browser එක වසනවා...");
    await browser.close();
  }
})();
