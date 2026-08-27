const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Real Chrome Profile 43 හරහා Browser එක Open වේ...");

  try {
    const browser = await puppeteer.launch({
      headless: false, // Browser එක ඇහැට පෙනෙන ලෙස Open වේ
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/kaveeshavadanu/Library/Application Support/Google/Chrome',
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--profile-directory=Profile 43' // Saved Session එක ඇති Profile එක
      ]
    });

    const page = (await browser.pages())[0];

    console.log("🔑 කෙලින්ම Dashboard පිටුවට යනවා...");
    // Password / Form fill කරන්නේ නැත. Direct Dashboard එකට යයි.
    await page.goto('https://a2ztraders.lk/Drop_dash', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    await delay(3000);

    console.log("🎉 සාර්ථකව පිවිසුණි!");
    console.log("📍 Current URL:", page.url());
    console.log("📌 Page Title:", await page.title());

    // Dashboard එක Open වුණු බවට Screenshot එකක් සුරැකීම
    await page.screenshot({ path: 'dashboard_direct.png' });
    console.log("📸 Screenshot saved as dashboard_direct.png");

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  }
})();
