const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Anti-Bot Bypass Mode එකෙන් Auto-Login ආරම්භ වේ...");

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // Bot Detection Disable කිරීම
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ]
  });

  const page = (await browser.pages())[0];

  try {
    // 1. Real Browser Header Masks (Bot කෙනෙක් නෙවෙයි කියා පෙන්නීමට)
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    // 2. Navigation override flags
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log("🔑 Login පිටුවට යනවා...");
    await page.goto('https://a2ztraders.lk/login', { waitUntil: 'networkidle2', timeout: 60000 });

    await delay(3000);

    const USER_EMAIL = process.env.SITE_EMAIL || "ඔයාගේ_EMAIL_එක";
    const USER_PASS = process.env.SITE_PASSWORD || "ඔයාගේ_PASSWORD_එක";

    console.log("✍️ Human Typing Simulation (මිනිසෙක් ටයිප් කරන ලෙසට)...");
    
    // Human Typing Delay (එක පාර Paste නොවී ටයිප් වෙන ලෙස)
    await page.type('input[type="email"], input[name="email"]', USER_EMAIL, { delay: 120 });
    await delay(800);
    await page.type('input[type="password"], input[name="password"]', USER_PASS, { delay: 150 });
    await delay(1000);

    console.log("🔘 Submit Request යවයි...");

    // Form Submit කිරීම (Button Click වෙනුවට Form Submit Trigger කිරීම වඩාත් සාර්ථකයි)
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.submit();
    });

    // Page එක Redirect වන තෙක් රඳී සිටීම
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await delay(3000);

    console.log("📍 Redirected URL:", page.url());

    // Dashboard එකට Direct Jump කිරීම (යම් හෙයකින් Redirect නොවුනොත්)
    if (!page.url().includes('dash')) {
      console.log("🔄 Force navigating to Dashboard...");
      await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2' });
    }

    console.log("🎉 Dashboard Page Title:", await page.title());

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Task Complete! Browser එක වසයි.");
    await browser.close();
  }
})();
