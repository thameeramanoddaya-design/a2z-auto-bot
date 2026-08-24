const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log("🚀 Launching Browser for Manual Setup...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: path.join(__dirname, 'my_chrome_data'), // Data සහ Session Save වන Folder එක
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
    console.log("🔑 Navigating to Site...");
    await page.goto('https://a2ztraders.lk/index.php/Login', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    console.log("✅ Ready! දැන් Browser එකේ ඔයා කරන්න ඕන දේවල් Manual කරන්න. (Browser එක Auto Close වෙන්නේ නැත)");

  } catch (err) {
    console.error("❌ Error loading page:", err.message);
  }
  
  // browser.close() නොමැති බැවින් Browser එක වැහෙන්නේ නැත.
})();
