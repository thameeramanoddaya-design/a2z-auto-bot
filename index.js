const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://a2ztraders.lk/index.php/Login', { waitUntil: 'networkidle2' });

    // Login Form එකේ HTML කොටස අරගෙන Terminal එකට පෙන්නයි
    const formHTML = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.innerHTML : 'Form element not found!';
    });

    console.log("\n==================== LOGIN FORM HTML ====================");
    console.log(formHTML);
    console.log("=========================================================\n");

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
})();
