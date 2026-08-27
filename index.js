const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Advanced Anti-Bot Bypass Mode එකෙන් Chrome Open කරයි...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled', // Puppeteer බව සඟවයි
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox'
    ]
  });

  const page = (await browser.pages())[0];

  // JavaScript වල Anti-Bot & Back Redirect Scripts Disabled කිරීම
  await page.evaluateOnNewDocument(() => {
    // 1. Overwrite navigator.webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // 2. Disable History/Back Navigation Blockers
    window.onbeforeunload = null;
    window.onunload = null;
    
    // 3. Disable Chrome Automation indicators
    window.chrome = { runtime: {} };
  });

  // Normal Mac User Agent එකක් ලෙස පෙන්වීම
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    console.log("🔑 Page එකට යනවා...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log("\n=======================================================");
    console.log("👉 දැන් PC එකේ Open වුණු Browser එකෙන් Normal විදිහට Log වෙන්න!");
    console.log("⏳ Session එක Auto-Save වීමට තත්පර 90ක කාලයක් ඇත...");
    console.log("=======================================================\n");

    // ඔයාට Log වෙන්න තත්පර 90ක් දෙනවා (කාලය මදි නම් මේ 90000 වැඩි කරන්න පුළුවන්)
    await delay(90000);

    // Dashboard එකට ගිය පසු Cookies Save කරගැනීම
    const cookies = await page.cookies();
    fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

    console.log("✅ Cookies සාර්ථකව 'cookies.json' එකට Save විය!");

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Browser එක වසනවා...");
    await browser.close();
  }
})();
