import WebSocket from 'ws';
import { CAPITAL_CONFIG } from './config.js';

// This module connects to Capital.com's streaming API and emits tick events.

export function createMarketStream({ onTick }) {
  const url = CAPITAL_CONFIG.streamUrl;

  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('[WS] Connected to Capital streaming');

    // Subscribe to top-of-book L1 prices for each epic
    for (const [symbol, epic] of Object.entries(CAPITAL_CONFIG.epics)) {
      const subMsg = {
        op: 'subscribe',
        // This is a placeholder; actual Capital.com WS format may differ and
        // you should adapt based on their official websocket docs or your
        // working ingest-node script.
        // Example channel name pattern: "PRICE.TICK." + epic
        // Here we'll use a generic topic field.
        args: [`PRICE.TICK.${epic}`]
      };
      ws.send(JSON.stringify(subMsg));
      console.log('[WS] Subscribed to', symbol, epic);
    }
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // This part must be aligned with the actual message format from Capital.com.
      // As a generic example, we assume messages like:
      // { epic, bid, ask, lastTraded, bidVolume, askVolume, updateTime }.

      if (msg.epic && typeof msg.bid === 'number' && typeof msg.ask === 'number') {
        const epic = msg.epic;
        const symbol = Object.keys(CAPITAL_CONFIG.epics).find((s) => CAPITAL_CONFIG.epics[s] === epic) || epic;

        const bid = msg.bid;
        const ask = msg.ask;
        const last = msg.lastTraded || (bid + ask) / 2;
        const bidVol = msg.bidVolume || 0;
        const askVol = msg.askVolume || 0;
        const spread = ask - bid;
        const srcTsMs = msg.snapshotTimeUTC ? Date.parse(msg.snapshotTimeUTC) : Date.now();

        onTick({
          symbol,
          epic,
          bid,
          ask,
          last,
          bidVol,
          askVol,
          spread,
          tsMs: Date.now(),
          srcTsMs
        });
      }
    } catch (e) {
      // ignore malformed messages
    }
  });

  ws.on('close', () => {
    console.log('[WS] Connection closed');
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message || err);
  });

  return ws;
}
