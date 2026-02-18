import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CHAT_CONFIG } from './config.js';

puppeteerExtra.use(StealthPlugin());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runAutoGPT() {
  const { CONVERSATION_HREF, QUERY, RESPONSE_TIMEOUT_MS, HEADLESS, CHROME_PROFILE_DIR } = CHAT_CONFIG;

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
      throw new Error(
        ''No saved session and no credentials found in .env.\n' +
' +
          ' ' Option A: Set HEADLESS: false in chat / config.js, run once, log in manually.\n' +
' +
          ' ' Option B: Add CHATGPT_EMAIL and CHATGPT_PASSWORD to your.env file.'
      );
      throw new Error(`No saved session and no credentials found in .env.
Option A: Set HEADLESS: false in chat/config.js, run once, log in manually.
Option B: Add CHATGPT_EMAIL and CHATGPT_PASSWORD to your .env file.`);
    }

    await page.click('button[data-testid="login-button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#email-input', { timeout: 20000 });
    await page.type('#email-input', process.env.CHATGPT_EMAIL, { delay: 60 });
    await page.click('button[type="submit"]');

    await page.waitForSelector('#password', { timeout: 20000 });
    await page.type('#password', process.env.CHATGPT_PASSWORD, { delay: 60 });
    await page.click('button[type="submit"]');

    console.log('⏳ [AutoGPT] Waiting for ChatGPT to load after login...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

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

  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
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
    const nodes = document.querySelectorAll(
      '[data-message-author-role="assistant"], ' +
        '[class*="agent-turn"], ' +
        '[data-testid*="conversation-turn-"] .markdown'
    );
    if (!nodes.length) return null;
    return nodes[nodes.length - 1].innerText.trim();
  });

  await browser.close();
  console.log('🔒 [AutoGPT] Browser closed cleanly.');

  return response;
}
