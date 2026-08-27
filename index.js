const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Project Profile එකෙන් Browser එක Open වේ...");

  try {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      // වෙනත් Profile වලට නොගොස් Project Folder එකේ Profile එක පමණක් Load කරයි:
      userDataDir: path.join(__dirname, 'my_chrome_session'),
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });

    const page = (await browser.pages())[0];

    console.log("🔑 Dashboard පිටුවට යනවා...");
    await page.goto('https://a2ztraders.lk/Drop_dash', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    await delay(3000);

    // පළමු පාර Log වී නැත්නම් Manual Log වීමට කාලය ලබාදෙයි
    if (page.url().includes('Dash') || page.url().includes('login')) {
      console.log("⚠️ Log වී නැත. කරුණාකර Open වුණු Window එකෙන් එක පාරක් Log වන්න!");
      console.log("⏳ තත්පර 60ක් ඇතුළත Log වන්න...");
      await delay(60000);
      console.log("✅ Session එක ස්ථිරවම Save විය!");
    } else {
      console.log("🎉 Saved Session එකෙන් කෙලින්ම Dashboard එකට පිවිසුණි!");
    }

    console.log("📍 Current URL:", page.url());

  } catch (err) {
    console.error("❌ Process Error:", err.message);
  }
})();
