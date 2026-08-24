console.log("🔑 Navigating to Login Page...");
    await page.goto('https://a2ztraders.lk/index.php/Dash', { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[type="text"], input[name="email"], input[type="email"]', { visible: true, timeout: 30000 });

    const emailInput = await page.$('input[type="text"], input[name="email"], input[type="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');

    if (emailInput && passwordInput) {
      console.log("✍️ Typing Email & Password...");
      await emailInput.type(process.env.A2Z_EMAIL, { delay: 100 });
      await passwordInput.type(process.env.A2Z_PASSWORD, { delay: 100 });
      await delay(1000);

      console.log("🔘 Clicking Login Button...");
      
      // Login Button එක Click කර Page එක Load වන තෙක් Wait කිරීම
      await Promise.all([
        page.evaluate(() => {
          const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], .btn-primary, .btn');
          if (submitBtn) {
            submitBtn.click();
          } else {
            const form = document.querySelector('form');
            if (form) form.submit();
          }
        }),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log("Navigation wait timed out, continuing..."))
      ]);

      await delay(3000);
      console.log("✅ Logged in successfully!");
    }
