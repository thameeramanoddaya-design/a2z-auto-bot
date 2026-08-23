const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

(async () => {
  console.log("🚀 Starting A2Z Automation Bot...");

  // 1. Google Sheet Connect කිරීම
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

  // Status Column එක 'Success' නොවන Pending Orders පෙරා ගැනීම
  const pendingRows = rows.filter(row => row.get('Status') !== 'Success');

  if (pendingRows.length === 0) {
    console.log("✅ No pending orders found. Exiting...");
    return;
  }

  console.log(`📦 Found ${pendingRows.length} pending orders. Launching Browser...`);

  // 2. Headless Chrome Browser Launch කිරීම
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 3. A2Z Login Process
    console.log("🔑 Logging into A2Z Account...");
    await page.goto('https://a2ztraders.lk/dash', { waitUntil: 'networkidle2' });

    await page.type('input[name="email"]', process.env.A2Z_EMAIL);
    await page.type('input[name="password"]', process.env.A2Z_PASSWORD);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    console.log("✅ Logged in successfully!");

    // 4. Submit Pending Orders
    for (let row of pendingRows) {
      console.log(`⏳ Processing order for: ${row.get('Name')}`);
      
      await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'networkidle2' });

      // Form Elements Load වන තෙක් Pause වේ
      await page.waitForSelector('input[name="cust_name"]', { visible: true });

      // Form Fill කිරීම
      await page.type('input[name="cust_name"]', row.get('Name') || '');
      await page.type('textarea[name="address"]', row.get('Address') || '');
      await page.type('input[name="city"]', row.get('City') || '');
      await page.type('input[name="contact_1"]', row.get('Phone') || '');
      
      if (row.get('Phone2')) {
        await page.type('input[name="contact_2"]', row.get('Phone2'));
      }

      if (row.get('District')) {
        await page.select('select[name="district"]', row.get('District'));
      }

      // Submit Button එක Click කිරීම
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);

      // Sheet එක Update කිරීම
      row.set('Status', 'Success');
      await row.save();
      console.log(`✅ Order for ${row.get('Name')} submitted successfully!`);
    }

  } catch (err) {
    console.error("❌ Error during execution:", err.message);
  } finally {
    await browser.close();
    console.log("🔒 Browser closed.");
  }
})();
