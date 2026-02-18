// Simple in-memory OHLCV builder per symbol + timeframe

const tfToMs = {
  '1MINUTE': 60_000,
  '5MINUTE': 5 * 60_000,
  '15MINUTE': 15 * 60_000,
  'HOUR': 60 * 60_000
};

// state[symbol][tf] = { open, high, low, close, volume, startMs }
const state = {};

// candlesCount[symbol][tf] = number of completed candles
export const candlesCount = {};

export function initSymbol(symbol, timeframes) {
  if (!state[symbol]) state[symbol] = {};
  if (!candlesCount[symbol]) candlesCount[symbol] = {};
  for (const tf of timeframes) {
    if (!state[symbol][tf]) state[symbol][tf] = null;
    if (!candlesCount[symbol][tf]) candlesCount[symbol][tf] = 0;
  }
}

export function onTickForOhlc({ symbol, price, volume, tsMs, timeframes }) {
  if (!state[symbol]) state[symbol] = {};
  if (!candlesCount[symbol]) candlesCount[symbol] = {};

  const out = [];

  for (const tf of timeframes) {
    const frameMs = tfToMs[tf];
    if (!frameMs) continue;

    let candle = state[symbol][tf];
    const bucketStart = Math.floor(tsMs / frameMs) * frameMs;

    if (!candle || candle.startMs !== bucketStart) {
      if (candle) {
        out.push({
          symbol,
          tf,
          ts: new Date(candle.startMs),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        });
        candlesCount[symbol][tf] = (candlesCount[symbol][tf] || 0) + 1;
      }

      candle = {
        startMs: bucketStart,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume || 0
      };
      state[symbol][tf] = candle;
    } else {
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      candle.volume += volume || 0;
    }
  }

  return out;
}

export function getLatestCandle(symbol, tf) {
  const s = state[symbol]?.[tf];
  if (!s) return null;
  return {
    symbol,
    tf,
    ts: new Date(s.startMs),
    open: s.open,
    high: s.high,
    low: s.low,
    close: s.close,
    volume: s.volume
  };
}
