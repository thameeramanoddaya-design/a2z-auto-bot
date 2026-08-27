const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Chrome Profile 43 හරහා Browser එක Open වේ...");

  try {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Root Chrome Data Folder එක ලබාදීම:
        '--user-data-dir=/Users/kaveeshavadanu/Library/Application Support/Google/Chrome',
        // Exact Profile Folder එක ස සඳහන් කිරීම:
        '--profile-directory=Profile 43'
      ]
    });

    const page = (await browser.pages())[0];

    console.log("🔑 Dashboard පිටුවට යනවා...");
    await page.goto('https://a2ztraders.lk/Drop_dash', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    await delay(3000);

    console.log("🎉 සාර්ථකයි! Current URL:", page.url());

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  }
})();
