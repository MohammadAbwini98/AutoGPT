import 'dotenv/config';
import { CAPITAL_CONFIG, STATUS_INTERVAL_MS } from './config.js';
import { createSession } from './capitalApi.js';
import { createMarketStream } from './wsClient.js';
import { initDb, writeTick, writeCandle, flushDb } from './db.js';
import { initSymbol, onTickForOhlc, getLatestCandle, candlesCount } from './ohlcEngine.js';

const symbols = Object.keys(CAPITAL_CONFIG.epics);

const lastTickBySymbol = {};

function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Number(n).toFixed(2);
}

function printStatus() {
  console.clear();
  console.log('══════════ REAL-TIME MARKET STATUS ══════════');
  for (const symbol of symbols) {
    const t = lastTickBySymbol[symbol];
    console.log(`
[${symbol}]`);
    if (!t) {
      console.log('  No ticks yet.');
      continue;
    }
    console.log(`  Bid:    ${formatNumber(t.bid)}  Ask: ${formatNumber(t.ask)}  Last: ${formatNumber(t.last)}  Spread: ${formatNumber(t.spread)}`);
    console.log(`  BidVol: ${formatNumber(t.bidVol)}  AskVol: ${formatNumber(t.askVol)}`);

    for (const tf of CAPITAL_CONFIG.timeframes) {
      const latest = getLatestCandle(symbol, tf);
      const count = candlesCount[symbol]?.[tf] || 0;
      if (!latest) {
        console.log(`  [${tf}] candles: ${count} (no current candle)`);
        continue;
      }
      console.log(
        `  [${tf}] candles: ${count} | O: ${formatNumber(latest.open)} H: ${formatNumber(latest.high)} ` +
        `L: ${formatNumber(latest.low)} C: ${formatNumber(latest.close)} V: ${formatNumber(latest.volume)}`
      );
    }
  }
}

(async () => {
  console.log('Starting market module...');
  if (!CAPITAL_CONFIG.apiKey) {
    console.error('Missing CAPITAL_API_KEY in .env');
    process.exit(1);
  }

  await initDb();
  await createSession();

  for (const symbol of symbols) {
    initSymbol(symbol, CAPITAL_CONFIG.timeframes);
  }

  createMarketStream({
    onTick: async (tick) => {
      const { symbol, last, tsMs } = tick;
      lastTickBySymbol[symbol] = tick;

      await writeTick({
        ts: new Date(tsMs),
        symbol,
        bid: tick.bid,
        ask: tick.ask,
        last: tick.last,
        spread: tick.spread,
        bidVol: tick.bidVol,
        askVol: tick.askVol,
        srcTs: new Date(tick.srcTsMs)
      });

      const newCandles = onTickForOhlc({
        symbol,
        price: last,
        volume: tick.bidVol + tick.askVol,
        tsMs,
        timeframes: CAPITAL_CONFIG.timeframes
      });

      for (const c of newCandles) {
        await writeCandle(c);
      }

      await flushDb();
    }
  });

  setInterval(printStatus, STATUS_INTERVAL_MS);
})();
