const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if (!fs.existsSync('./videos')) fs.mkdirSync('./videos');
if (!fs.existsSync('./debug')) fs.mkdirSync('./debug');
if (!fs.existsSync('./frames')) fs.mkdirSync('./frames');

// ---------------------------------------------------------------------
// Custom screenshot-based recorder.
// We stopped using `puppeteer-screen-recorder` because it uses a CDP
// screencast stream internally, and that stream races with page
// navigations and throws:
//   "Protocol error (DOM.describeNode): Cannot find context with specified id"
// This custom version just calls page.screenshot() on an interval (a
// plain, one-shot CDP call -- no background stream), and stitches the
// PNGs into an mp4 with ffmpeg when we're done. Much more stable.
// ---------------------------------------------------------------------
class SimpleRecorder {
  constructor(page, { intervalMs = 400, dir = './frames' } = {}) {
    this.page = page;
    this.intervalMs = intervalMs;
    this.dir = dir;
    this.frameCount = 0;
    this.running = false;
  }

  start() {
    this.running = true;
    this._loop();
  }

  async _loop() {
    while (this.running) {
      try {
        const filename = path.join(this.dir, `frame_${String(this.frameCount).padStart(5, '0')}.png`);
        await this.page.screenshot({ path: filename });
        this.frameCount++;
      } catch (e) {
        // Page mid-navigation or briefly unavailable -- just skip this frame.
      }
      await delay(this.intervalMs);
    }
  }

  async stop(outputPath) {
    this.running = false;
    await delay(this.intervalMs + 150); // let the in-flight loop iteration finish

    if (this.frameCount === 0) {
      console.log("⚠️ No frames were captured, skipping video encode.");
      return;
    }

    const fps = Math.max(1, Math.round(1000 / this.intervalMs));
    try {
      execSync(
        `ffmpeg -y -framerate ${fps} -i "${this.dir}/frame_%05d.png" -vf "scale=1366:768,format=yuv420p" "${outputPath}"`,
        { stdio: 'inherit' }
      );
      console.log(`🎬 Video encoded from ${this.frameCount} frames -> ${outputPath}`);
    } catch (e) {
      console.error("⚠️ ffmpeg encode failed (frames are still available in ./frames):", e.message);
    }
  }
}

// Helper: save a labeled debug screenshot + log the current URL.
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
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1366,768',
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1366, height: 768 });

  // Log browser console + failed requests -- this is what tells us WHY a
  // page went blank (JS error, blocked request, 403 from Cloudflare, etc.)
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

  // Start Video Recording (custom, screenshot-based)
  const recorder = new SimpleRecorder(page, { intervalMs: 400 });
  recorder.start();
  console.log("🎥 Screen Recording Started...");

  let loginSucceeded = false;

  try {
    console.log("🔑 Navigating to Login Page...");
    const loginResponse = await page.goto('https://a2ztraders.lk/index.php/Dash', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    console.log(`   Login page HTTP status: ${loginResponse ? loginResponse.status() : 'unknown'}`);
    await debugStep(page, 'after_goto_login');

    // Dump a slice of the HTML so we can see what actually came back
    // (login form? a Cloudflare challenge? a blank error page?)
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

    // ---- VERIFY login actually worked instead of assuming it did ----
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
      const prodId = (row.get('Product ID') || row.get('I') || '').trim();
      const price = (row.get('Price') || row.get('J') || '500').trim();

      if (!name || !phone) continue;

      console.log(`⏳ Processing order for: ${name}`);

      try {
        await page.goto('https://a2ztraders.lk/Customer', { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(2000);
        await debugStep(page, `order_${name}_customer_page`);

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

        await debugStep(page, `order_${name}_before_add_product`);

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
    await recorder.stop('./videos/bot_live_action.mp4');
    await browser.close();
  }
})();
