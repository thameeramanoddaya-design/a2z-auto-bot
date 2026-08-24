const puppeteer = require('puppeteer');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting Login Test...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: path.join(__dirname, 'my_chrome_data'),
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    console.log("🔑 Navigating to Login Page...");
    await page.goto('https://a2ztraders.lk/index.php/Login', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    console.log("⏳ Waiting for input fields...");
    await page.waitForSelector('input[type="text"], input[name="email"], input[type="email"]', { visible: true, timeout: 30000 });

    const emailInput = await page.$('input[type="text"], input[name="email"], input[type="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');

    if (emailInput && passwordInput) {
      console.log("✍️ Typing Email: thameeramanoddaya@gmail.com ...");
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('thameeramanoddaya@gmail.com', { delay: 100 });

      await delay(500);

      console.log("✍️ Typing Password: ***** ...");
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type('123456', { delay: 100 });

      await delay(1000);

      console.log("🔘 Clicking Login Button...");
      await Promise.all([
        page.evaluate(() => {
          const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], .btn-primary, .btn');
          if (submitBtn) {
            submitBtn.click();
          } else {
            const form = document.querySelector('form');
            if (form) form.submit();
          }
        }),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log("Navigation timeout, continuing..."))
      ]);

      await delay(3000);
      console.log("✅ Login attempt finished!");
    } else {
      console.log("❌ Email or Password input fields not found.");
    }

  } catch (err) {
    console.error("❌ Test Error:", err.message);
  }
})();
