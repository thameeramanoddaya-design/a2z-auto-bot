const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting A2Z Automation Bot...");

  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
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
    console.log("✅ No pending orders to process. Exiting...");
    return;
  }

  console.log(`📦 Found ${pendingRows.length} pending orders. Launching Browser...`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    console.log("🔑 [LIVE LOG] Logging into A2Z Account...");
    await page.goto('https://a2ztraders.lk/index.php/Dash', { waitUntil: 'networkidle2' });

    await page.type('input[type="text"], input[name="email"]', process.env.A2Z_EMAIL);
    await page.type('input[type="password"], input[name="password"]', process.env.A2Z_PASSWORD);

    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    console.log("✅ [LIVE LOG] Logged in successfully!");

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

      console.log(`⏳ [LIVE LOG] Navigating to Customer Form for: ${name}`);

      try {
        await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'networkidle2' });
        await delay(1500);

        console.log(`📝 [LIVE LOG] Filling Name: ${name} & Address: ${address}`);
        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 1) await textInputs[0].type(name);
        if (textInputs.length >= 2) await textInputs[1].type(address);

        const selects = await page.$$('select');

        if (selects.length >= 1 && city) {
          console.log(`🌆 [LIVE LOG] Selecting City: ${city}`);
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
          console.log(`📍 [LIVE LOG] Selecting District: ${district}`);
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

        if (textInputs.length >= 3) await textInputs[2].type(phone);
        if (textInputs.length >= 4 && phone2) await textInputs[3].type(phone2);

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
          console.log(`📦 [LIVE LOG] Typing Product ID: ${prodId}`);
          const prodSearchInput = await page.$('input[placeholder*="Select a product"], .select2-search__field');
          if (prodSearchInput) {
            await prodSearchInput.click();
            await prodSearchInput.type(prodId);
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
          await saleAmountInput.type(String(price));
        } else if (textInputs.length >= 6) {
          await textInputs[5].click({ clickCount: 3 });
          await textInputs[5].type(String(price));
        }

        await delay(500);

        console.log("➕ [LIVE LOG] Clicking Add Product...");
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const addBtn = btns.find(b => b.textContent.includes('Add Product'));
          if (addBtn) addBtn.click();
        });

        await delay(1500);

        console.log("💾 [LIVE LOG] Submitting Final Order...");
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const submitBtn = btns.find(b => b.textContent.includes('Add Order'));
          if (submitBtn) submitBtn.click();
        });

        await delay(2000);

        const pageError = await page.evaluate(() => {
          const alert = document.querySelector('.alert, .toast, .swal-text, .error-msg, .invalid-feedback');
          return alert ? alert.innerText.trim() : null;
        });

        if (pageError) {
          console.error(`⚠️ [LIVE LOG] UI Error detected: ${pageError}`);
          await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
          row.set('Status', `Failed: ${pageError}`);
          await row.save();
        } else {
          row.set('Status', 'Order Placed Successfully');
          await row.save();
          console.log(`✅ [LIVE LOG] Order for ${name} completed successfully!`);
        }

      } catch (orderError) {
        console.error(`❌ [LIVE LOG] Order Exception for ${name}:`, orderError.message);
        try {
          await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
        } catch (e) {}
        row.set('Status', `Failed: ${orderError.message}`);
        await row.save();
      }
    }

  } catch (err) {
    console.error("❌ Fatal Error:", err.message);
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    } catch (e) {}
  } finally {
    await browser.close();
    console.log("🔒 [LIVE LOG] Browser closed.");
  }
})();
