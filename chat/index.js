import 'dotenv/config';
import { runAutoGPT } from './bot.js';
import { CHAT_CONFIG } from './config.js';

function formatElapsed(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  if (m > 0) return `${m}m ${s}s ${milli}ms`;
  if (s > 0) return `${s}s ${milli}ms`;
  return `${milli}ms`;
}

(async () => {
  console.log('
══════════════════════════════════════════════════════');
  console.log('               🤖  AutoGPT  v1.0.0                    ');
  console.log('══════════════════════════════════════════════════════');
  console.log(`📌 Conversation href : "${CHAT_CONFIG.CONVERSATION_HREF}"`);
  console.log(`❓ Query             : "${CHAT_CONFIG.QUERY}"`);
  console.log('──────────────────────────────────────────────────────
');

  const start = Date.now();
  console.log(`⏱️  [Timer] Started at : ${new Date(start).toLocaleTimeString()}
`);

  try {
    const answer = await runAutoGPT();
    const elapsed = Date.now() - start;

    if (!answer) {
      console.error('
❌[AutoGPT] Could not extract a response from ChatGPT.');
      console.log(`⏱️  [Timer] Total elapsed : ${formatElapsed(elapsed)}
`);
      process.exit(1);
    }

    console.log('
══════════════════════════════════════════════════════');
    console.log('               💬  ChatGPT Response                   ');
    console.log('══════════════════════════════════════════════════════');
    console.log(answer);
    console.log('══════════════════════════════════════════════════════');

    console.log('
──────────────────────────────────────────────────────');
    console.log(`⏱️  [Timer] Finished at   : ${new Date().toLocaleTimeString()}`);
    console.log(`⏱️  [Timer] Total elapsed : ${formatElapsed(elapsed)}`);
    console.log('──────────────────────────────────────────────────────
');
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`
❌ [AutoGPT] Error:
   ${err.message}`);
    console.log(`⏱️  [Timer] Failed after  : ${formatElapsed(elapsed)}
`);
    process.exit(1);
  }
})();
