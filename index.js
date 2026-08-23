const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

(async () => {
  console.log("🚀 Starting A2Z Complete Precise UI Automation Bot...");

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
    // 1. Login
    console.log("🔑 Logging into A2Z Account...");
    await page.goto('https://a2ztraders.lk/index.php/Dash', { waitUntil: 'networkidle2' });

    await page.type('input[type="text"], input[name="email"]', process.env.A2Z_EMAIL);
    await page.type('input[type="password"], input[name="password"]', process.env.A2Z_PASSWORD);

    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    console.log("✅ Logged in successfully!");

    for (let row of pendingRows) {
      // Fetch data based on Sheet headers (B, C, D, E, F, G, I, J)
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

      // Go to Customer Order Page
      await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);

      // --- Left Form Fill ---
      const textInputs = await page.$$('input[type="text"]');
      if (textInputs.length >= 1) await textInputs[0].type(name);      // Customer Name
      if (textInputs.length >= 2) await textInputs[1].type(address);   // Address

      const selects = await page.$$('select');

      // Select City Dropdown
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
        await page.waitForTimeout(500);
      }

      // Select District Dropdown
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
        await page.waitForTimeout(500);
      }

      if (textInputs.length >= 3) await textInputs[2].type(phone);     // Phone 1
      if (textInputs.length >= 4 && phone2) await textInputs[3].type(phone2); // Phone 2

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

      // --- Right Form: Product Search, Load & Select ---
      if (prodId) {
        console.log(`🔍 Searching Product ID: ${prodId}`);
        const prodSearchInput = await page.$('input[placeholder*="Select a product"], .select2-search__field');
        
        if (prodSearchInput) {
          await prodSearchInput.click();
          await prodSearchInput.type(prodId, { delay: 100 });
          await page.waitForTimeout(1500); // Wait for list to search & show
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
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

      // Sale Amount Auto-Fill
      const saleAmountInput = await page.$('input[placeholder*="Sale Amount"]');
      if (saleAmountInput) {
        await saleAmountInput.click({ clickCount: 3 });
        await saleAmountInput.type(String(price));
      } else if (textInputs.length >= 6) {
        await textInputs[5].click({ clickCount: 3 });
        await textInputs[5].type(String(price));
      }

      await page.waitForTimeout(1000);

      // Click "+ Add Product" Button
      console.log("➕ Adding Product to Order Table...");
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
        const addBtn = btns.find(b => b.textContent.includes('Add Product'));
        if (addBtn) addBtn.click();
      });

      await page.waitForTimeout(2000);

      // Click "Add Order" Final Submission
      console.log("💾 Clicking Add Order Button...");
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
        const submitBtn = btns.find(b => b.textContent.includes('Add Order'));
        if (submitBtn) submitBtn.click();
      });

      await page.waitForTimeout(4000);

      row.set('Status', 'Order Placed Successfully');
      await row.save();
      console.log(`✅ Order for ${name} completed successfully!`);
    }

  } catch (err) {
    console.error("❌ Error during execution:", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Browser closed.");
  }
})();
