import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CHAT_CONFIG } from './config.js';

puppeteerExtra.use(StealthPlugin());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForAnySelector(page, selectors, timeout = 30000) {
  const start = Date.now();
  for (const selector of selectors) {
    const handle = await page.$(selector);
    if (handle) return selector;
  }
  while (Date.now() - start < timeout) {
    for (const selector of selectors) {
      const handle = await page.$(selector);
      if (handle) return selector;
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for any selector: ${selectors.join(', ')}`);
}

async function clickAnySelector(page, selectors, timeout = 30000) {
  const selector = await waitForAnySelector(page, selectors, timeout);
  await page.click(selector);
  return selector;
}

export async function runAutoGPT() {
  const { CONVERSATION_HREF, QUERY, RESPONSE_TIMEOUT_MS, HEADLESS, CHROME_PROFILE_DIR, LOGIN_TIMEOUT_MS = 90000 } = CHAT_CONFIG;

  console.log("🚀 [AutoGPT] Launching Chromium browser...");
  console.log(`   Session profile : ${CHROME_PROFILE_DIR}`);
  console.log(`   Target href     : ${CONVERSATION_HREF}`);

  const browser = await puppeteerExtra.launch({
    headless: HEADLESS,
    userDataDir: CHROME_PROFILE_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1280, height: 900 }
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/122.0.0.0 Safari/537.36'
  );

  console.log('🌐 [AutoGPT] Navigating to https://chat.openai.com ...');
  await page.goto('https://chat.openai.com', { waitUntil: 'networkidle2', timeout: 60000 });

  const isLoginPage = await page.$('button[data-testid="login-button"], a[href*="login"]');

  if (isLoginPage) {
    console.log('🔐 [AutoGPT] No saved session found. Attempting login...');

    if (!process.env.CHATGPT_EMAIL || !process.env.CHATGPT_PASSWORD) {
      await browser.close();

      const missingCredentialsMessage = [
        'No saved session and no credentials found in .env.',
        'Option A: Set HEADLESS: false in chat/config.js, run once, log in manually.',
        'Option B: Add CHATGPT_EMAIL and CHATGPT_PASSWORD to your .env file.'
      ].join('\n');

      throw new Error(missingCredentialsMessage);
    }

    await clickAnySelector(page, ['button[data-testid="login-button"]', 'a[href*="login"]'], 30000);

    const authStartSelector = await waitForAnySelector(
      page,
      ['#email-input', 'input[type="email"]', 'input[name="username"]', 'button[data-provider]'],
      LOGIN_TIMEOUT_MS
    );

    if (authStartSelector === 'button[data-provider]') {
      await browser.close();
      throw new Error('Login halted: social-provider button detected. Use email/password login or set HEADLESS: false and sign in manually once to save session.');
    }

    const emailSelector = authStartSelector;
    await page.type(emailSelector, process.env.CHATGPT_EMAIL, { delay: 60 });
    await page.click('button[type="submit"]');

    const passwordSelector = await waitForAnySelector(
      page,
      ['#password', 'input[type="password"]'],
      LOGIN_TIMEOUT_MS
    );

    await page.type(passwordSelector, process.env.CHATGPT_PASSWORD, { delay: 60 });
    await page.click('button[type="submit"]');

    console.log('⏳ [AutoGPT] Waiting for ChatGPT to load after login...');
    await waitForAnySelector(
      page,
      ['#prompt-textarea', 'div[contenteditable="true"][data-testid*="prompt"]', 'nav[aria-label="Chat history"]'],
      LOGIN_TIMEOUT_MS
    );

    console.log('✅ [AutoGPT] Login successful. Session saved to:', CHROME_PROFILE_DIR);
  } else {
    console.log('✅ [AutoGPT] Session restored from profile. No login needed.');
  }

  console.log('📋 [AutoGPT] Waiting for conversation sidebar to load...');
  await page.waitForSelector('nav[aria-label="Chat history"], ol[data-testid], nav li, [data-sidebar-item="true"]', {
    timeout: 30000
  });
  await sleep(2000);

  const conversationSelector = `a[href="${CONVERSATION_HREF}"]`;
  const conversationLink = await page.$(conversationSelector);

  if (!conversationLink) {
    await browser.close();
    throw new Error(
      `Conversation with href "${CONVERSATION_HREF}" was not found in the sidebar.
` +
      '   Make sure CONVERSATION_HREF in chat/config.js is correct and the conversation exists.'
    );
  }

  await conversationLink.click();
  console.log('✅ [AutoGPT] Conversation found and opened.');

  await page.waitForSelector('[data-testid^="conversation-turn"], [class*="message"], [data-message-id]', {
    timeout: 20000
  });
  await sleep(1500);

  console.log('✏️  [AutoGPT] Typing query into input box...');

  const inputSelector =
    '#prompt-textarea, ' +
    'div[contenteditable="true"][data-testid*="prompt"], ' +
    'textarea[data-id="prompt-textarea"]';

  await page.waitForSelector(inputSelector, { timeout: 20000 });

  await page.click(inputSelector);
  await sleep(300);

  await page.waitForSelector(inputSelector, { timeout: 20000 });
  // Clear input using focus and keyboard (simpler than evaluate)
  await page.click(inputSelector);
  await sleep(300);
  // Try triple-click to select all (more reliable)
  await page.click(inputSelector, { clickCount: 3 });
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(200);



  await page.keyboard.type(QUERY, { delay: 40 });

  console.log('📤 [AutoGPT] Submitting query (pressing Enter)...');
  await page.keyboard.press('Enter');

  console.log('⏳ [AutoGPT] Waiting for ChatGPT to start generating...');
  try {
    await page.waitForSelector(
      'button[aria-label*="Stop" i], button[data-testid*="stop"], [class*="stop-button"]',
      { timeout: 15000 }
    );
  } catch (e) {
    console.log('ℹ️  [AutoGPT] Stop button not detected — response may be instant.');
  }

  console.log('⏳ [AutoGPT] Waiting for full response to be generated...');
  await page.waitForFunction(
    () => {
      const stopBtn = document.querySelector(
        'button[aria-label*="Stop" i], button[data-testid*="stop"], [class*="stop-button"]'
      );
      return !stopBtn;
    },
    { timeout: RESPONSE_TIMEOUT_MS, polling: 1000 }
  );

  await sleep(1500);

  console.log('📥 [AutoGPT] Extracting response from the page...');

  const response = await page.evaluate(() => {
    try {
    const nodes = document.querySelectorAll(
      '[data-message-author-role="assistant"], ' +
      '[class*="agent-turn"], ' +
      '[data-testid*="conversation-turn-"] .markdown'
    );
    if (!nodes.length) return null;
    const lastNode = nodes[nodes.length - 1];
    return lastNode?.innerText?.trim() || null;
  } catch (err) {
    console.error('Error extracting response:', err);
    return null;
  }
});

  await browser.close();
  console.log('🔒 [AutoGPT] Browser closed cleanly.');

  return response;
}
