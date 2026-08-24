const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log("🚀 Launching Browser with Saved Session...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    // මෙන්න මේ පේළියෙන් ඔයාගේ Data/Cookies ඔක්කොම Mac එකේ 'my_chrome_data' කියන folder එකේ Save වෙනවා
    userDataDir: path.join(__dirname, 'my_chrome_data'),
    args: ['--start-maximized']
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  console.log("🔑 Navigating to A2Z Site...");
  await page.goto('https://a2ztraders.lk/index.php/Dash', { 
    waitUntil: 'networkidle2' 
  });

  console.log("✅ Ready! දැන් ඔයා Manual එක පාරක් Log වෙලා Form එක Fill කරන්න.");
  console.log("ඊළඟ පාර Run කරද්දී මෙතැනින්ම Auto Log වී තියෙයි.");
})();
