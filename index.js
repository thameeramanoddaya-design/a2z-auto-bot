const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const COOKIE_FILE = './cookies.json';

// Site URLs
const LOGIN_URL = 'https://a2ztraders.lk/index.php/Dash';
const DASHBOARD_URL = 'https://a2ztraders.lk/Drop_dash';

// Login Credentials
const USER_EMAIL = process.env.SITE_EMAIL || 'thameeramanoddaya@gmail.ocm';
const USER_PASS = process.env.SITE_PASSWORD || '123456';

(async () => {
  console.log("🚀 Anti-Bot Bypass Auto-Login ආරම්භ වේ...");

  const browser = await puppeteer.launch({
    headless: true, // GitHub Actions සහ PC දෙකටම සුදුසුයි
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ]
  });

  const page = (await browser.pages())[0];

  try {
    // 1. User Agent mask කිරීම
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // 2. Saved Cookie එකක් තිබේ නම් Inject කිරීම
    if (fs.existsSync(COOKIE_FILE)) {
      console.log("🍪 Saved Cookies සොයාගන්නා ලදී. Cookies Inject කරයි...");
      const savedCookies = JSON.parse(fs.readFileSync(COOKIE_FILE));
      await page.setCookie(...savedCookies);
    }

    console.log("🚀 Dashboard පිටුවට යාමට උත්සාහ කරයි...");
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(3000);

    // 3. Login වී නැත්නම් (හෝ Cookie expire වී Login page එකට redirect වුණොත්)
    if (page.url().includes('Dash') || page.url().includes('login')) {
      console.log("⚠️ Cookie Expire වී ඇත (හෝ මුල්ම Login එකයි). Fresh Login එකක් සිදු කරයි...");
      
      if (!page.url().includes('Dash')) {
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
        await delay(2000);
      }

      // Input Selectors (Generic A2Z Traders Selectors)
      const emailSelector = 'input[type="email"], input[name="email"], input[name="username"], input[type="text"]';
      const passSelector = 'input[type="password"], input[name="password"]';

      await page.waitForSelector(emailSelector, { timeout: 10000 });

      console.log("✍️ Email & Password Type කරයි...");
      await page.type(emailSelector, USER_EMAIL, { delay: 100 });
      await delay(500);
      await page.type(passSelector, USER_PASS, { delay: 120 });
      await delay(800);

      console.log("🔘 Keyboard Enter මගින් Submit කරයි...");
      await page.focus(passSelector);
      
      // Real Keyboard Enter එකක් මගින් Submit කිරීම (White-screen වීම වළක්වයි)
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
        page.keyboard.press('Enter')
      ]);

      await delay(4000);

      // යම් හෙයකින් auto-redirect වුණේ නැත්නම් direct Dashboard එකට යාම
      if (!page.url().includes('Drop_dash')) {
        await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2' });
        await delay(2000);
      }

      // 4. අලුත් Session Cookie එක Save කරගැනීම
      const newCookies = await page.cookies();
      fs.writeFileSync(COOKIE_FILE, JSON.stringify(newCookies, null, 2));
      console.log("✅ අලුත් Cookie එක සාර්ථකව cookies.json එකට Save විය!");
    } else {
      console.log("🎉 Session Cookie එක Active! කෙලින්ම Dashboard එකට පිවිසුණි.");
    }

    console.log("📍 Current URL:", page.url());
    console.log("🎉 Page Title:", await page.title());

    // Screenshot එකක් අරන් Confirm කරගැනීම
    await page.screenshot({ path: 'login_status.png' });
    console.log("📸 Screenshot saved as login_status.png");

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Task Complete! Browser එක වසයි.");
    await browser.close();
  }
})();
