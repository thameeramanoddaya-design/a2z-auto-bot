const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Stealth Browser Launch කරමින් පවතී...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  // User-Agent & WebDriver Bypass
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  try {
    console.log("🔑 Page එකට යනවා...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2', timeout: 60000 });

    await delay(3000); // Page එක load වෙනකම් පොඩි delay එකක්

    console.log("🔍 Input Fields සහ Buttons වල HTML Grab කරමින් පවතී...\n");

    const elementsHTML = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, button, form'));
      return inputs.map(el => el.outerHTML).join('\n\n');
    });

    console.log("==================== GRABBED HTML ELEMENTS ====================");
    console.log(elementsHTML || "කිසිම Element එකක් හමු වුණේ නැත!");
    console.log("===============================================================\n");

    await delay(5000);

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  } finally {
    console.log("🏁 Browser එක වසනවා...");
    await browser.close();
  }
})();
