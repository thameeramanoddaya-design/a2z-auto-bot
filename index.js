const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

(async () => {
  console.log("🚀 Starting A2Z Automation Bot with Stealth...");

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
    const status = row.get('Status') || row.get('Order Status') || '';
    return !status.includes('Successfully') && !status.includes('Success') && !status.includes('Added');
  });

  if (pendingRows.length === 0) {
    console.log("✅ No pending orders to process. Exiting...");
    return;
  }

  console.log(`📦 Found ${pendingRows.length} pending orders. Launching Stealth Browser...`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();

  try {
    console.log("🔑 Navigating to A2Z Login Page...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await new Promise(r => setTimeout(r, 4000));

    await page.waitForSelector('input[name="email"], input[type="email"]', { visible: true, timeout: 20000 });

    console.log("✍️ Entering Credentials...");
    await page.type('input[name="email"], input[type="email"]', process.env.A2Z_EMAIL, { delay: 100 });
    await page.type('input[name="password"], input[type="password"]', process.env.A2Z_PASSWORD, { delay: 100 });

    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        submitBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
      ]);
    }

    console.log("✅ Logged in successfully!");

    for (let row of pendingRows) {
      const name = row.get('Name') || row.get('B') || '';
      const address = row.get('Address') || row.get('C') || '';
      const city = row.get('City') || row.get('D') || '';
      const phone = row.get('Phone') || row.get('F') || '';
      const phone2 = row.get('Phone2') || row.get('G') || '';

      if (!name || !phone) continue;

      console.log(`⏳ Processing order for: ${name}`);
      
      await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForSelector('input[name="cust_name"]', { visible: true, timeout: 15000 });

      await page.type('input[name="cust_name"]', name, { delay: 50 });
      await page.type('textarea[name="address"]', address, { delay: 50 });
      await page.type('input[name="city"]', city, { delay: 50 });
      await page.type('input[name="contact_1"]', phone, { delay: 50 });
      if (phone2) await page.type('input[name="contact_2"]', phone2, { delay: 50 });

      const formSubmit = await page.$('button[type="submit"], input[type="submit"]');
      if (formSubmit) await formSubmit.click();

      await new Promise(r => setTimeout(r, 3000));

      row.set('Status', 'Order Placed Successfully');
      await row.save();
      console.log(`✅ Order for ${name} submitted successfully!`);
    }

  } catch (err) {
    console.error("❌ Error during execution:", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Browser closed.");
  }
})();
