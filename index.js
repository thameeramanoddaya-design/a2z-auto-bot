const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Launching using existing Chrome Profile...");

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // Mac Chrome Path
    userDataDir: './user_data', // Profile Session Data save වෙන තැන
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = (await browser.pages())[0];

  try {
    console.log("🔑 Page එකට යනවා...");
    await page.goto('https://a2ztraders.lk/index.php/Login', { waitUntil: 'networkidle2', timeout: 60000 });

    await delay(3000);

    // Human Typing behavior (එකපාර type නොකර හෙමින් type කිරීම)
    console.log("✍️ Form එක Fill කරයි...");
    await page.type('#t1', 'Harsha', { delay: 150 });
    await page.type('#t2', 'thameeramanoddaya@gmail.com', { delay: 150 });
    await page.type('#t3', '0771234567', { delay: 150 });

    await delay(1000);

    console.log("🔘 Button Click කරයි...");
    await page.click('#b1');

    await delay(10000);

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await browser.close();
  }
})();
