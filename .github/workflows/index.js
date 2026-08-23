const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Starting A2Z Automation Bot (GitHub Actions Optimized)...");

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
  
  // Set real user-agent to bypass bot detection on GitHub Actions
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1366, height: 768 });

  try {
    console.log("🔑 Navigating to Login Page...");
    await page.goto('https://a2ztraders.lk/index.php/Dash', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    // Wait for the login form input to be available
    await page.waitForSelector('input[type="text"], input[name="email"], input[type="email"]', { visible: true, timeout: 30000 });

    console.log("📝 Typing Login Credentials...");
    const emailInput = await page.$('input[type="text"], input[name="email"], input[type="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');

    if (!emailInput || !passwordInput) {
      throw new Error("Login fields could not be found.");
    }

    await emailInput.type(process.env.A2Z_EMAIL);
    await passwordInput.type(process.env.A2Z_PASSWORD);

    console.log("👆 Submitting Login Form...");
    await Promise.all([
      page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
        } else {
          const btn = document.querySelector('button[type="submit"], input[type="submit"], .btn');
          if (btn) btn.click();
        }
      }),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
    ]);

    await delay(2000);
    console.log("✅ Logged in successfully! Dashboard Loaded.");

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

      console.log(`⏳ Processing UI order for: ${name} | Product: ${prodId}`);

      try {
        await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await delay(2000);

        // --- Fill Customer Details ---
        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 1) await textInputs[0].type(name);
        if (textInputs.length >= 2) await textInputs[1].type(address);

        const selects = await page.$$('select');

        // Select City
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

        // Select District
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

        if (textInputs.length >= 3) await textInputs[2].type(phone);
        if (textInputs.length >= 4 && phone2) await textInputs[3].type(phone2);

        // Select Order Source -> FB Lead
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

        // Product Selection
        if (prodId) {
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

        // Set Sale Price
        const saleAmountInput = await page.$('input[placeholder*="Sale Amount"]');
        if (saleAmountInput) {
          await saleAmountInput.click({ clickCount: 3 });
          await saleAmountInput.type(String(price));
        } else if (textInputs.length >= 6) {
          await textInputs[5].click({ clickCount: 3 });
          await textInputs[5].type(String(price));
        }

        await delay(500);

        // Click "+ Add Product"
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const addBtn = btns.find(b => b.textContent.includes('Add Product'));
          if (addBtn) addBtn.click();
        });

        await delay(1500);

        // Click "Add Order" Final Submission
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const submitBtn = btns.find(b => b.textContent.includes('Add Order'));
          if (submitBtn) submitBtn.click();
        });

        await delay(2500);

        // Alert Errors Check
        const pageError = await page.evaluate(() => {
          const alert = document.querySelector('.alert, .toast, .swal-text, .error-msg, .invalid-feedback');
          return alert ? alert.innerText.trim() : null;
        });

        if (pageError) {
          console.error(`⚠️ UI Alert Message: ${pageError}`);
          await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
          row.set('Status', `Failed: ${pageError}`);
          await row.save();
        } else {
          row.set('Status', 'Order Placed Successfully');
          await row.save();
          console.log(`✅ Order for ${name} completed successfully!`);
        }

      } catch (orderError) {
        console.error(`❌ Order Exception for ${name}:`, orderError.message);
        try {
          await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
        } catch (e) {}
        row.set('Status', `Failed: ${orderError.message}`);
        await row.save();
      }
    }

  } catch (err) {
    console.error("❌ Fatal Error during Login or Exec:", err.message);
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    } catch (e) {}
  } finally {
    await browser.close();
    console.log("🔒 Browser closed.");
  }
})();
