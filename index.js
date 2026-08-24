const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting Browser and Navigating to Login Page...");

  // Browser එක Open කිරීම (Screen එකේ Live පෙන්වීමට headless: false)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    console.log("🔑 Navigating to Login Page...");
    await page.goto('https://a2ztraders.lk/index.php/Dash', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    console.log("✅ Successfully reached Login Page! Browser will stay open.");

  } catch (err) {
    console.error("❌ Error navigating to login page:", err.message);
  }
  
  // සටහන: browser.close() අයින් කර ඇති බැවින් Browser එක Auto Close වන්නේ නැත.
})();
