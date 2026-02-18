// ─────────────────────────────────────────────
//  index.js
//  Entry point for AutoGPT.
//  Loads environment variables, runs the bot,
//  and prints the ChatGPT response to the terminal.
// ─────────────────────────────────────────────

// Load .env variables (CHATGPT_EMAIL, CHATGPT_PASSWORD)
import 'dotenv/config';
import { runAutoGPT } from './bot.js';
import { CHAT_CONFIG } from './config.js';

// ─── Format elapsed time helper ───────────────
function formatElapsed(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  if (m > 0) return `${m}m ${s}s ${milli}ms`;
  if (s > 0) return `${s}s ${milli}ms`;
  return `${milli}ms`;
}

// ─── Run AutoGPT ─────────────────────────────
(async () => {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('         🤖  AutoGPT  v1.0.0                           ');
  console.log('══════════════════════════════════════════════════════');
  console.log(`📌 Conversation href : "${CHAT_CONFIG.CONVERSATION_HREF}"`);
  console.log(`❓ Query             : "${CHAT_CONFIG.QUERY}"`);
  console.log('──────────────────────────────────────────────────────\n');

  const start = Date.now();
  console.log(`⏱️  [Timer] Started at  : ${new Date(start).toLocaleTimeString()}\n`);

  try {
    // Run the main bot automation flow
    const answer = await runAutoGPT();
    const elapsed = Date.now() - start;

    if (!answer) {
      console.error('\n❌ [AutoGPT] Could not extract a response from ChatGPT.');
      console.log(`⏱️  [Timer] Total elapsed : ${formatElapsed(elapsed)}\n`);
      process.exit(1);
    }

    // Print the extracted answer in a clearly formatted box
    console.log('\n══════════════════════════════════════════════════════');
    console.log('         💬  ChatGPT Response                          ');
    console.log('══════════════════════════════════════════════════════');
    console.log(answer);
    console.log('══════════════════════════════════════════════════════');
    console.log('\n──────────────────────────────────────────────────────');
    console.log(`⏱️  [Timer] Finished at : ${new Date().toLocaleTimeString()}`);
    console.log(`⏱️  [Timer] Total elapsed: ${formatElapsed(elapsed)}`);
    console.log('──────────────────────────────────────────────────────\n');

  } catch (err) {
    // Handle any errors (login failure, conversation not found, timeout, etc.)
    const elapsed = Date.now() - start;
    console.error(`\n❌ [AutoGPT] Error:\n   ${err.message}`);
    console.log(`⏱️  [Timer] Failed after : ${formatElapsed(elapsed)}\n`);
    process.exit(1);
  }
})();
