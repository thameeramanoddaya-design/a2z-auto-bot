const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if (!fs.existsSync('./videos')) {
  fs.mkdirSync('./videos');
}

(async () => {
  console.log("🚀 Starting A2Z Bot with Screen Recording...");

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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1366, height: 768 });

  // Start Video Recording
  const recorder = new PuppeteerScreenRecorder(page, { fps: 15, aspectRatio: '16:9' });
  await recorder.start('./videos/bot_live_action.mp4');
  console.log("🎥 Screen Recording Started...");

  try {
    console.log("🔑 Navigating to Login Page...");
    await page.goto('https://a2ztraders.lk/index.php/Dash', { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[type="text"], input[name="email"], input[type="email"]', { visible: true, timeout: 30000 });

    const emailInput = await page.$('input[type="text"], input[name="email"], input[type="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');

    if (emailInput && passwordInput) {
      await emailInput.type(process.env.A2Z_EMAIL, { delay: 100 });
      await passwordInput.type(process.env.A2Z_PASSWORD, { delay: 100 });

      await Promise.all([
        page.evaluate(() => {
          const form = document.querySelector('form');
          if (form) form.submit();
          else {
            const btn = document.querySelector('button[type="submit"], input[type="submit"], .btn');
            if (btn) btn.click();
          }
        }),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
      ]);

      await delay(2000);
      console.log("✅ Logged in successfully!");
    }

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
        await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'domcontentloaded', timeout: 60000 });
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
    console.error("❌ Fatal Error:", err.message);
  } finally {
    await recorder.stop();
    console.log("🎬 Recording finished and saved.");
    await browser.close();
  }
})();
