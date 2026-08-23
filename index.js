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

  // Status එක Empty හෝ 'Pending' වන Rows පමණක් තෝරා ගැනීම
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
    console.log("🔑 Logging into A2Z Account...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2' });

    await page.type('input[name="email"]', process.env.A2Z_EMAIL);
    await page.type('input[name="password"]', process.env.A2Z_PASSWORD);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    console.log("✅ Logged in successfully!");

    for (let row of pendingRows) {
      console.log(`⏳ Processing order for: ${row.get('Name') || row.get('B')}`);
      
      await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[name="cust_name"]', { visible: true });

      // Clean Data Extraction
      const name = row.get('Name') || row.get('B') || '';
      const address = row.get('Address') || row.get('C') || '';
      const city = row.get('City') || row.get('D') || '';
      const phone = row.get('Phone') || row.get('F') || '';
      const phone2 = row.get('Phone2') || row.get('G') || '';

      if (!name || !phone) {
        console.log("⚠️ Skipping row: Missing Name or Phone number.");
        continue;
      }

      await page.type('input[name="cust_name"]', name);
      await page.type('textarea[name="address"]', address);
      await page.type('input[name="city"]', city);
      await page.type('input[name="contact_1"]', phone);
      
      if (phone2) {
        await page.type('input[name="contact_2"]', phone2);
      }

      // Submit Form
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000); // Form එක Save වීමට කාලය ලබා දීම

      // Sheet එක Update කිරීම
      row.set('Status', 'Order Placed Successfully');
      await row.save();
      console.log(`✅ Order for ${name} submitted and updated in Sheet!`);
    }

  } catch (err) {
    console.error("❌ Error during execution:", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Browser closed.");
  }
})();
