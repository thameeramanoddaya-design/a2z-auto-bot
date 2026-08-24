const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if (!fs.existsSync('./videos')) fs.mkdirSync('./videos');
if (!fs.existsSync('./debug')) fs.mkdirSync('./debug');

let stepCounter = 0;
async function debugStep(page, label) {
  stepCounter++;
  const safeLabel = label.replace(/[^a-z0-9_-]/gi, '_');
  const filename = `./debug/${String(stepCounter).padStart(2, '0')}_${safeLabel}.png`;
  try {
    await page.screenshot({ path: filename, fullPage: true });
  } catch (e) {
    console.log(`   (screenshot failed for ${label}: ${e.message})`);
  }
  console.log(`🖼️  [${label}] URL: ${page.url()}`);
}

async function pickFromSearchableDropdown(page, placeholderText, searchValue) {
  if (!searchValue) return false;

  const opened = await page.evaluate((text) => {
    const candidates = Array.from(document.querySelectorAll('span, div, li, a'));
    const el = candidates.find(
      (e) => e.children.length === 0 && e.textContent.trim() === text
    );
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, placeholderText);

  if (!opened) {
    console.log(`   ⚠️ Could not find dropdown labeled "${placeholderText}"`);
    return false;
  }

  await delay(400);

  const searchInput = await page.$(
    '.select2-container--open .select2-search__field, .select2-search--dropdown .select2-search__field, input.select2-search__field'
  );

  if (!searchInput) {
    console.log(`   ⚠️ Dropdown "${placeholderText}" opened but no search box found`);
    return false;
  }

  await searchInput.type(String(searchValue), { delay: 50 });

  try {
    await page.waitForSelector('.select2-results__option', { timeout: 8000 });
  } catch (e) {
    console.log(`   ⚠️ No dropdown results appeared for "${searchValue}" within 8s`);
  }

  const picked = await page.evaluate(() => {
    const opt =
      document.querySelector('.select2-results__option--highlighted') ||
      document.querySelector('.select2-results__option');
    if (opt) {
      opt.click();
      return true;
    }
    return false;
  });

  if (!picked) {
    await page.keyboard.press('Enter');
  }

  await delay(400);
  return true;
}

async function pickProduct(page, productId) {
  if (!productId) return false;

  const prodInput = await page.$('input[placeholder*="Select a product"]');
  if (!prodInput) {
    console.log('   ⚠️ Product search input not found');
    return false;
  }

  await prodInput.click();
  await prodInput.type(String(productId), { delay: 50 });

  try {
    await page.waitForSelector('.select2-results__option', { timeout: 8000 });
  } catch (e) {
    console.log(`   ⚠️ No product result appeared for "${productId}" within 8s`);
  }

  const picked = await page.evaluate(() => {
    const opt =
      document.querySelector('.select2-results__option--highlighted') ||
      document.querySelector('.select2-results__option');
    if (opt) {
      opt.click();
      return true;
    }
    return false;
  });

  if (!picked) {
    await page.keyboard.press('Enter');
  }

  try {
    await page.waitForFunction(() => {
      const el = document.querySelector('input[placeholder*="Total Price"]');
      return el && el.value && el.value.trim() !== '';
    }, { timeout: 6000 });
  } catch (e) {
    console.log(`   ⚠️ Retail/sale price did not auto-fill within 6s for "${productId}"`);
  }

  return true;
}

(async () => {
  console.log("🚀 Starting A2Z Bot with Screen Recording...");

  let creds;
  try {
    creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } catch (e) {
    console.error("❌ GOOGLE_CREDENTIALS secret is missing or not valid JSON:", e.message);
    process.exit(1);
  }

  if (!process.env.A2Z_EMAIL || !process.env.A2Z_PASSWORD) {
    console.error("❌ A2Z_EMAIL or A2Z_PASSWORD secret is missing.");
    process.exit(1);
  }

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
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1366,768',
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1366, height: 768 });

  page.on('console', msg => console.log('   [browser console]', msg.text()));
  page.on('pageerror', err => console.log('   [browser page error]', err.message));
  page.on('requestfailed', req =>
    console.log('   [request failed]', req.url(), req.failure()?.errorText)
  );
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`   [http ${res.status()}]`, res.url());
    }
  });

  await debugStep(page, 'session_start_blank');

  async function safeGoto(url, options) {
    try {
      return await page.goto(url, options);
    } catch (e) {
      if (/context|protocol error/i.test(e.message)) {
        console.log(`   ⚠️ Transient CDP error on goto(${url}), retrying...`);
        await delay(2000);
        try {
          return await page.goto(url, options);
        } catch (e2) {
          console.log(`   ⚠️ Retry also failed: ${e2.message}`);
          await delay(2000);
          return await page.goto(url, options);
        }
      }
      throw e;
    }
  }

  const recorder = new PuppeteerScreenRecorder(page, { fps: 15, aspectRatio: '16:9' });
  let recording = false;
  let loginSucceeded = false;

  try {
    console.log("🔑 Navigating to Login Page...");
    const loginResponse = await safeGoto('https://a2ztraders.lk/index.php/Dash', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    console.log(`   Login page HTTP status: ${loginResponse ? loginResponse.status() : 'unknown'}`);

    // Page එක load වුණාට පසුව Recording එක Start කිරීම
    try {
      await recorder.start('./videos/bot_live_action.mp4');
      recording = true;
      console.log("🎥 Screen Recording Started...");
    } catch (e) {
      console.log(`   ⚠️ Screen recorder failed to start: ${e.message}`);
    }

    await debugStep(page, 'after_goto_login');

    const htmlSnippet = (await page.content()).slice(0, 800);
    fs.writeFileSync('./debug/login_page_snippet.html', htmlSnippet);

    await page.waitForSelector('input[type="text"], input[name="email"], input[type="email"]', {
      visible: true,
      timeout: 30000,
    });

    const emailInput = await page.$('input[name="email"], input[type="email"], input[type="text"]');
    const passwordInput = await page.$('input[name="password"], input[type="password"]');

    if (!emailInput || !passwordInput) {
      throw new Error('Login form fields not found on the page (selectors may not match the real site).');
    }

    await emailInput.click({ clickCount: 3 });
    await emailInput.type(process.env.A2Z_EMAIL, { delay: 100 });
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(process.env.A2Z_PASSWORD, { delay: 100 });

    await debugStep(page, 'after_typing_credentials');

    const submitButton = await page.$('button[type="submit"], input[type="submit"], .btn');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
      submitButton
        ? submitButton.click()
        : page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) form.submit();
          }),
    ]);

    await delay(2000);
    await debugStep(page, 'after_login_submit');

    const currentUrl = page.url();
    const hasPasswordField = await page.$('input[type="password"]');

    if (hasPasswordField || currentUrl.toLowerCase().includes('login')) {
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log("   Page text after submit:", bodyText);
      throw new Error(`Login appears to have FAILED. Still on: ${currentUrl}`);
    }

    loginSucceeded = true;
    console.log(`✅ Logged in successfully! Now at: ${currentUrl}`);

    for (let row of pendingRows) {
      const name = (row.get('Customer Name') || row.get('B') || '').trim();
      const address = (row.get('Address') || row.get('C') || '').trim();
      const city = (row.get('City') || row.get('D') || '').trim();
      const district = (row.get('District') || row.get('E') || '').trim();
      const phone = (row.get('Contact Number One') || row.get('F') || '').trim();
      const phone2 = (row.get('Contact Number Two') || row.get('G') || '').trim();
      const orderSource = (row.get('Order Source') || row.get('H') || '').trim();
      const prodId = (row.get('Product ID') || row.get('I') || '').trim();
      const price = (row.get('Price') || row.get('J') || '').trim();

      if (!name || !phone) continue;

      console.log(`⏳ Processing order for: ${name}`);

      try {
        await safeGoto('https://a2ztraders.lk/Customer', { waitUntil: 'networkidle2', timeout: 60000 });

        await page.waitForSelector('input[placeholder*="Customer Name"]', { timeout: 30000 });
        await debugStep(page, `order_${name}_customer_page`);

        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 1) await textInputs[0].type(name, { delay: 50 });
        if (textInputs.length >= 2) await textInputs[1].type(address, { delay: 50 });

        await debugStep(page, `order_${name}_before_city`);

        if (city) {
          const ok = await pickFromSearchableDropdown(page, 'Select City...', city);
          if (!ok) console.log(`   ⚠️ Could not set City to "${city}" for ${name}`);
        }

        if (district) {
          const ok = await pickFromSearchableDropdown(page, 'Select District...', district);
          if (!ok) console.log(`   ⚠️ Could not set District to "${district}" for ${name}`);
        }

        const textInputs2 = await page.$$('input[type="text"]');
        if (textInputs2.length >= 3) await textInputs2[2].type(phone, { delay: 50 });
        if (textInputs2.length >= 4 && phone2) await textInputs2[3].type(phone2, { delay: 50 });

        if (orderSource) {
          const ok = await pickFromSearchableDropdown(page, 'Select Order Source...', orderSource);
          if (!ok) {
            await page.evaluate((val) => {
              const selects = Array.from(document.querySelectorAll('select'));
              for (const sel of selects) {
                for (const opt of sel.options) {
                  if (opt.text.toLowerCase().includes(val.toLowerCase())) {
                    sel.value = opt.value;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                  }
                }
              }
            }, orderSource);
          }
        }

        await debugStep(page, `order_${name}_before_product`);

        if (prodId) {
          const ok = await pickProduct(page, prodId);
          if (!ok) console.log(`   ⚠️ Could not select product "${prodId}" for ${name}`);
        }

        await delay(600);

        if (price) {
          const saleAmountInput = await page.$('input[placeholder*="Total Price"]');
          if (saleAmountInput) {
            await saleAmountInput.click({ clickCount: 3 });
            await saleAmountInput.type(String(price), { delay: 50 });
          }
        }

        await debugStep(page, `order_${name}_before_add_product`);

        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const addBtn = btns.find(b => b.textContent.includes('Add Product'));
          if (addBtn) addBtn.click();
        });

        await delay(1500);
        await debugStep(page, `order_${name}_after_add_product`);

        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
          const submitBtn = btns.find(b => b.textContent.includes('Add Order'));
          if (submitBtn) submitBtn.click();
        });

        await delay(2500);
        await debugStep(page, `order_${name}_after_submit`);

        row.set('Status', 'Order Placed Successfully');
        await row.save();
        console.log(`✅ Order for ${name} completed!`);

      } catch (orderError) {
        console.error(`❌ Order Error for ${name}:`, orderError.message);
        await debugStep(page, `order_${name}_ERROR`);
        row.set('Status', `Failed: ${orderError.message}`);
        await row.save();
      }
    }

  } catch (err) {
    console.error("❌ Fatal Error:", err.message);
    await debugStep(page, 'FATAL_ERROR');
    if (!loginSucceeded) {
      console.error("   ⚠️ The bot never got past login. Check ./debug/login_page_snippet.html");
      console.error("   and the numbered screenshots in ./debug to see what the site actually returned.");
    }
  } finally {
    if (recording) {
      try {
        await recorder.stop();
        console.log("🎬 Recording finished and saved.");
      } catch (e) {
        console.log(`   ⚠️ Recorder failed to stop cleanly: ${e.message}`);
      }
    }
    await browser.close();
  }
})();
