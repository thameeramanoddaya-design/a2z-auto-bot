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

  // Pending Rows තෝරා ගැනීම
  const pendingRows = rows.filter(row => {
    const status = row.get('Status') || row.get('Order Status') || '';
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

  try {
    console.log("🔑 Navigating to A2Z Login Page...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'domcontentloaded' });

    // Email Input Box එක Load වන තෙක් තත්පර 10ක් Wait කිරීම
    await page.waitForSelector('input[type="email"], input[name="email"], input[name="username"]', { visible: true, timeout: 10000 });

    console.log("✍️ Entering Login Credentials...");
    
    // Login Details Fill කිරීම
    const emailInput = await page.$('input[type="email"], input[name="email"], input[name="username"]');
    await emailInput.type(process.env.A2Z_EMAIL);

    const passInput = await page.$('input[type="password"], input[name="password"]');
    await passInput.type(process.env.A2Z_PASSWORD);
    
    // Submit Button Click කිරීම
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
    await Promise.all([
      submitBtn.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
    ]);

    console.log("✅ Logged in successfully!");

    // Orders Submit කරන කොටස
    for (let row of pendingRows) {
      const name = row.get('Name') || row.get('B') || '';
      const address = row.get('Address') || row.get('C') || '';
      const city = row.get('City') || row.get('D') || '';
      const phone = row.get('Phone') || row.get('F') || '';
      const phone2 = row.get('Phone2') || row.get('G') || '';

      if (!name || !phone) continue;

      console.log(`⏳ Processing order for: ${name}`);
      
      await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[name="cust_name"]', { visible: true, timeout: 10000 });

      await page.type('input[name="cust_name"]', name);
      await page.type('textarea[name="address"]', address);
      await page.type('input[name="city"]', city);
      await page.type('input[name="contact_1"]', phone);
      if (phone2) await page.type('input[name="contact_2"]', phone2);

      const formSubmit = await page.$('button[type="submit"], input[type="submit"]');
      if (formSubmit) await formSubmit.click();

      // Pause for saving
      await new Promise(r => setTimeout(r, 3000));

      row.set('Status', 'Order Placed Successfully');
      await row.save();
      console.log(`✅ Order for ${name} submitted!`);
    }

  } catch (err) {
    console.error("❌ Error during execution:", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Browser closed.");
  }
})();
