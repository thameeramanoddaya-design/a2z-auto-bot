const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Anti-Bot Stealth Mode එකෙන් Auto-Login ආරම්භ වේ...");

  const browser = await puppeteer.launch({
    headless: true, // GitHub Runner එකට සහ PC එකට වඩාත්ම ස්ථායී වේ
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ]
  });

  const page = (await browser.pages())[0];

  try {
    // 1. User Agent එක සහ Webdriver Flag එක Mask කිරීම
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete navigator.__proto__.webdriver;
    });

    console.log("🔑 Login පිටුවට යනවා...");
    await page.goto('https://a2ztraders.lk/login', { waitUntil: 'networkidle2', timeout: 60000 });

    await delay(3000);

    const USER_EMAIL = process.env.SITE_EMAIL || "ඔයාගේ_EMAIL_එක";
    const USER_PASS = process.env.SITE_PASSWORD || "ඔයාගේ_PASSWORD_එක";

    console.log("✍️ Human Typing Simulation...");

    // Input fields පෙනෙන තෙක් සිටීම
    await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 10000 });

    // Human Typing Delay (එක පාර Paste නොවී ටයිප් වෙන ලෙස)
    await page.type('input[name="email"], input[type="email"]', USER_EMAIL, { delay: 100 });
    await delay(800);
    await page.type('input[name="password"], input[type="password"]', USER_PASS, { delay: 120 });
    await delay(1000);

    console.log("🔘 Keyboard Enter මගින් Submit කරයි...");

    // JS Form Submit වෙනුවට Password input එක උඩදී Real Keyboard Enter එකක් ඔබයි
    await page.focus('input[name="password"], input[type="password"]');
    
    // Form navigation එක සිදු වන තෙක් රඳී සිටීම
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
      page.keyboard.press('Enter')
    ]);

    await delay(4000);

    console.log("📍 Current URL:", page.url());

    // Dashboard එකට Direct Jump කිරීම (යම් හෙයකින් Login වී Dashboard එකට auto-redirect වුණේ නැත්නම්)
    if (!page.url().includes('dash')) {
      console.log("🔄 Navigating to Dashboard...");
      await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2' });
      await delay(2000);
    }

    console.log("🎉 Dashboard Page Title:", await page.title());

    // Confirm කරගැනීමට Screenshot එකක් සුරැකීම
    await page.screenshot({ path: 'dashboard_result.png' });
    console.log("📸 Screenshot saved as dashboard_result.png");

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Task Complete! Browser එක වසයි.");
    await browser.close();
  }
})();
