import { getWriter } from '@questdb/nodejs-client';
import { QUESTDB_CONFIG } from './config.js';

let writer;

export async function initDb() {
  writer = await getWriter({
    host: QUESTDB_CONFIG.host,
    port: QUESTDB_CONFIG.port,
    username: QUESTDB_CONFIG.username,
    password: QUESTDB_CONFIG.password,
    tls: QUESTDB_CONFIG.tls
  });
  console.log('[DB] QuestDB writer ready.');
}

export async function writeTick(tick) {
  if (!writer) return;
  const { ts, symbol, bid, ask, last, spread, bidVol, askVol, srcTs } = tick;

  writer
    .table('ticks')
    .symbol('symbol', symbol)
    .timestamp('ts', ts)
    .float('bid', bid)
    .float('ask', ask)
    .float('last', last)
    .float('spread', spread)
    .float('bidVol', bidVol)
    .float('askVol', askVol)
    .timestamp('srcTs', srcTs);
}

export async function writeCandle(c) {
  if (!writer) return;
  const { ts, symbol, tf, open, high, low, close, volume } = c;

  writer
    .table('candles')
    .symbol('symbol', symbol)
    .symbol('tf', tf)
    .timestamp('ts', ts)
    .float('open', open)
    .float('high', high)
    .float('low', low)
    .float('close', close)
    .float('volume', volume);
}

export async function flushDb() {
  if (!writer) return;
  await writer.flush();
}
