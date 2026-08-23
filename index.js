const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

(async () => {
  console.log("🚀 Starting A2Z Direct API Automation Bot...");

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

  console.log(`📦 Found ${pendingRows.length} pending orders. Connecting to A2Z API...`);

  let sessionCookie = '';

  const axiosInstance = axios.create({
    baseURL: 'https://a2ztraders.lk',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    maxRedirects: 5
  });

  try {
    console.log("🔑 Logging into A2Z Account...");
    
    const loginParams = new URLSearchParams();
    loginParams.append('email', process.env.A2Z_EMAIL);
    loginParams.append('password', process.env.A2Z_PASSWORD);

    const loginRes = await axiosInstance.post('/login', loginParams.toString());

    if (loginRes.headers['set-cookie']) {
      sessionCookie = loginRes.headers['set-cookie'].join('; ');
      axiosInstance.defaults.headers.common['Cookie'] = sessionCookie;
    }

    console.log("✅ Logged in successfully!");

    for (let row of pendingRows) {
      const name = row.get('Name') || row.get('B') || '';
      const address = row.get('Address') || row.get('C') || '';
      const city = row.get('City') || row.get('D') || '';
      const phone = row.get('Phone') || row.get('F') || '';
      const phone2 = row.get('Phone2') || row.get('G') || '';

      if (!name || !phone) continue;

      console.log(`⏳ Submitting order for: ${name}`);

      const orderData = new URLSearchParams();
      orderData.append('cust_name', name);
      orderData.append('address', address);
      orderData.append('city', city);
      orderData.append('contact_1', phone);
      orderData.append('contact_2', phone2 || '');

      try {
        const orderRes = await axiosInstance.post('/Customer', orderData.toString(), {
          headers: { 'Referer': 'https://a2ztraders.lk/Customer' }
        });

        if (orderRes.status === 200 || orderRes.status === 302) {
          row.set('Status', 'Order Placed Successfully');
          await row.save();
          console.log(`✅ Order for ${name} submitted successfully!`);
        } else {
          row.set('Status', `Failed - Status ${orderRes.status}`);
          await row.save();
        }
      } catch (orderErr) {
        console.error(`❌ Failed for ${name}:`, orderErr.message);
        row.set('Status', `Failed - ${orderErr.message}`);
        await row.save();
      }
    }

  } catch (err) {
    console.error("❌ Error during execution:", err.message);
  }
})();
