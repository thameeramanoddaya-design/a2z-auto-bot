const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting Automated Server Process...");

  // 1. Credentials ලබා ගැනීම
  const email = process.env.A2Z_EMAIL;
  const password = process.env.A2Z_PASSWORD;

  if (!email || !password) {
    console.error("❌ A2Z_EMAIL or A2Z_PASSWORD is missing in Environment Variables!");
    return;
  }

  // Google Sheet Auth
  let creds;
  try {
    creds = typeof process.env.GOOGLE_CREDENTIALS === 'string' 
      ? JSON.parse(process.env.GOOGLE_CREDENTIALS) 
      : process.env.GOOGLE_CREDENTIALS;
  } catch (e) {
    console.error("❌ GOOGLE_CREDENTIALS JSON Error");
    return;
  }

  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.SHEET_ID, auth);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  const pendingRows = rows.filter(row => {
    const status = row.get('Status') || '';
    return !status.includes('Successfully') && !status.includes('Success') && !status.includes('Added');
  });

  if (pendingRows.length === 0) {
    console.log("✅ No pending orders to process.");
    return;
  }

  console.log(`📦 Found ${pendingRows.length} pending orders. Launching Browser...`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
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
    // 2. Automated Login Process
    console.log("🔑 Navigating to Login Page...");
    await page.goto('https://a2ztraders.lk/index.php/Login', { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('input[name="email"], input[type="text"]', { visible: true });
    
    console.log("✍️ Entering Credentials...");
    await page.type('input[name="email"], input[type="text"]', email, { delay: 50 });
    await page.type('input[name="password"], input[type="password"]', password, { delay: 50 });

    await delay(1000);

    console.log("🔘 Logging In...");
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);

    console.log("✅ Logged In Successfully!");

    // 3. Process Orders
    for (let row of pendingRows) {
      const name = (row.get('Customer Name') || row.get('B') || '').trim();
      const address = (row.get('Address') || row.get('C') || '').trim();
      const city = (row.get('City') || row.get('D') || '').trim();
      const district = (row.get('District') || row.get('E') || '').trim();
      const phone = (row.get('Contact Number One') || row.get('F') || '').trim();
      const phone2 = (row.get('Contact Number Two') || row.get('G') || '').trim();
      const prodId = (row.get('Product ID') || row.get('I') || '').trim();
      const price = (row.get('Price') || row.get('J') || '500').trim();

      if (!name || !phone) continue;

      console.log(`⏳ Processing order for: ${name}`);

      try {
        await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(2000);

        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 1) await textInputs[0].type(name, { delay: 50 });
        if (textInputs.length >= 2) await textInputs[1].type(address, { delay: 50 });

        const selects = await page.$$('select');

        if (selects.length >= 1 && city) {
          await page.evaluate((sel, val) => {
            for (let opt of sel.options) {
              if (opt.text.toLowerCase().trim().includes(val.toLowerCase())) {
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                break;
              }
            }
          }, selects[0], city);
        }

        if (selects.length >= 2 && district) {
          await page.evaluate((sel, val) => {
            for (let opt of sel.options) {
              if (opt.text.toLowerCase().trim().includes(val.toLowerCase())) {
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                break;
              }
            }
          }, selects[1], district);
        }

        if (textInputs.length >= 3) await textInputs[2].type(phone, { delay: 50 });
        if (textInputs.length >= 4 && phone2) await textInputs[3].type(phone2, { delay: 50 });

        if (selects.length >= 3) {
          await page.evaluate((sel) => {
            for (let opt of sel.options) {
              if (opt.text.includes('FB Lead')) {
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                break;
              }
            }
          }, selects[2]);
        }

        if (prodId) {
          const prodSearchInput = await page.$('input[placeholder*="Select a product"], .select2-search__field');
          if (prodSearchInput) {
            await prodSearchInput.click();
            await prodSearchInput.type(prodId, { delay: 50 });
            await delay(500);
            await page.keyboard.press('Enter');
          } else if (selects.length >= 4) {
            await page.evaluate((sel, pId) => {
              for (let opt of sel.options) {
                if (opt.text.includes(pId)) {
                  sel.value = opt.value;
                  sel.dispatchEvent(new Event('change', { bubbles: true }));
                  break;
                }
              }
            }, selects[3], prodId);
          }
        }

        const saleAmountInput = await page.$('input[placeholder*="Sale Amount"]');
        if (saleAmountInput) {
          await saleAmountInput.click({ clickCount: 3 });
          await saleAmountInput.type(String(price), { delay: 50 });
        } else if (textInputs.length >= 6) {
          await textInputs[5].click({ clickCount: 3 });
          await textInputs[5].type(String(price), { delay: 50 });
        }

        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const addBtn = btns.find(b => b.textContent.includes('Add Product'));
          if (addBtn) addBtn.click();
        });

        await delay(1500);

        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const submitBtn = btns.find(b => b.textContent.includes('Add Order'));
          if (submitBtn) submitBtn.click();
        });

        await delay(2500);

        row.set('Status', 'Order Placed Successfully');
        await row.save();
        console.log(`✅ Order for ${name} completed!`);

      } catch (orderError) {
        console.error(`❌ Order Error for ${name}:`, orderError.message);
        row.set('Status', `Failed: ${orderError.message}`);
        await row.save();
      }
    }

  } catch (err) {
    console.error("❌ Server Login Error:", err.message);
  } finally {
    console.log("🏁 Task Finished!");
  }
})();
