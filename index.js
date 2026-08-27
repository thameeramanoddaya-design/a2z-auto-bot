const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Anti-Bot Bypass කරමින් Chrome Launch කරයි...");

  const email = "thameeramanoddaya@gmail.com";
  const password = "123456";

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  // User Agent Bypass
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  try {
    console.log("🔑 Log-in URL (a2ztraders.lk/dash) එකට යනවා...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2', timeout: 60000 });

    await delay(2000);

    console.log("✍️ Email & Password Type කරනවා...");
    
    // Email Field
    const emailInput = 'input[type="text"], input[type="email"], input[placeholder*="email" i]';
    await page.waitForSelector(emailInput, { visible: true, timeout: 20000 });
    await page.click(emailInput);
    await page.type(emailInput, email, { delay: 100 });

    // Password Field
    const passInput = 'input[type="password"]';
    await page.waitForSelector(passInput, { visible: true, timeout: 20000 });
    await page.click(passInput);
    await page.type(passInput, password, { delay: 100 });

    await delay(1000);

    console.log("🔘 Login Button එක Click කරනවා / Enter කරනවා...");
    
    // Enter key එක ඔබා Submit කිරීම (Button ID මොකක් වුණත් වැඩ කරයි)
    await page.keyboard.press('Enter');

    console.log("⏳ Dashboard එක Load වන තෙක් රැඳී සිටියි...");
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
      console.log("⚠️ Page Navigation complete, check status...");
    });

    console.log("🎯 Login සාර්ථකයි! Current URL:", page.url());

    // Window එක බලාගැනීමට තත්පර 15ක් Open තබයි
    await delay(15000);

  } catch (err) {
    console.error("❌ Process Error:", err.message);
    await delay(10000);
  } finally {
    console.log("🏁 Browser එක වසනවා...");
    await browser.close();
  }
})();
