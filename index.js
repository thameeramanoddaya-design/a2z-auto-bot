const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
  console.log("🚀 Cookie Auto-Refresh Mode එකෙන් Launch කරයි...");

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
    // 1. Direct Login Page එකට යාම (Dashboard එක වෙනුවට)
    const LOGIN_URL = 'https://a2ztraders.lk/login'; // හෝ https://a2ztraders.lk
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 2. Cookie Inject කිරීම
    if (fs.existsSync('cookies.json')) {
      const cookiesString = fs.readFileSync('cookies.json', 'utf8');
      const cookies = JSON.parse(cookiesString);
      
      for (let cookie of cookies) {
        delete cookie.hostOnly;
        delete cookie.session;
        delete cookie.storeId;
        delete cookie.id;
        if (cookie.sameSite === "unspecified" || !cookie.sameSite) cookie.sameSite = "Lax";
        
        await page.setCookie(cookie);
      }
      console.log("🍪 Cookie Inject විය!");
    }

    // 3. Cookie එක Set වූ පසු Dashboard එක Reload කිරීම
    console.log("🎯 Redirecting to Dashboard...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2', timeout: 60000 });

    // 4. යම් හෙයකින් ආයේ Login පිටුවට ආවොත්, අලුත් Cookie එක Save කරගැනීම
    if (page.url().includes('login')) {
      console.log("⚠️ Old Cookie expired! Please login manually once.");
    } else {
      console.log("✅ Successfully Logged In! Current URL:", page.url());
      
      // Active Session Cookie එක ආයේ Auto-Update කරගැනීම (ඊළඟ පාරට පාවිච්චි කිරීමට)
      const updatedCookies = await page.cookies();
      fs.writeFileSync('cookies.json', JSON.stringify(updatedCookies, null, 2));
      console.log("🔄 Updated fresh cookies saved to 'cookies.json'!");
    }

    await new Promise(() => {});

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  }
})();
