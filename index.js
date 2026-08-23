const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

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
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();

  // Cloudflare bypass - Real User Agent & Custom Headers
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9'
  });

  try {
    console.log("🔑 Navigating to A2Z Login Page...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2', timeout: 30000 });

    // Page එක සම්පූර්ණයෙන් Load වීමට තත්පර 3ක Pause එකක්
    await new Promise(r => setTimeout(r, 3000));

    // Any Input Box load වන තෙක් Wait කිරීම
    await page.waitForSelector('input', { visible: true, timeout: 20000 });

    console.log("✍️ Entering Credentials...");

    // Email Input හොයා ගැනීම
    const emailInput = await page.$('input[type="email"], input[name="email"], input[name="username"]');
    if (emailInput) {
      await emailInput.type(process.env.A2Z_EMAIL, { delay: 100 });
    }

    // Password Input හොයා ගැනීම
    const passInput = await page.$('input[type="password"], input[name="password"]');
    if (passInput) {
      await passInput.type(process.env.A2Z_PASSWORD, { delay: 100 });
    }

    // Login Submit කිරීම
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        submitBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
      ]);
    }

    console.log("✅ Logged in successfully!");

    // Customer Order Processing
    for (let row of pendingRows) {
      const name = row.get('Name') || row.get('B') || '';
      const address = row.get('Address') || row.get('C') || '';
      const city = row.get('City') || row.get('D') || '';
      const phone = row.get('Phone') || row.get('F') || '';
      const phone2 = row.get('Phone2') || row.get('G') || '';

      if (!name || !phone) continue;

      console.log(`⏳ Processing order for: ${name}`);
      
      await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'networkidle2', timeout: 20000 });
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
