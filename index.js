const puppeteer = require('puppeteer');

(async () => {
  console.log("🚀 Launching Browser...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  // අලුතෙන් වෙනම newPage() එකක් නොසාදා, open වන පළමු Tab එකම ලබා ගැනීම
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  try {
    console.log("🔑 Navigating to Login Page...");
    
    // Site එකට Navigate වීම
    await page.goto('https://a2ztraders.lk/index.php/Dash', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    console.log("✅ Successfully loaded Login Page!");

  } catch (err) {
    console.error("❌ Navigation Error:", err.message);
  }
})();
