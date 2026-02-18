import 'dotenv/config';

export const CAPITAL_CONFIG = {
  apiKey: process.env.CAPITAL_API_KEY,
  baseUrl: process.env.CAPITAL_API_BASE_URL || 'https://api-capital.backend-capital.com',
  streamUrl: process.env.CAPITAL_STREAM_URL || 'wss://api-streaming-capital.backend-capital.com/connect',
  accountId: process.env.CAPITAL_ACCOUNT_ID,
  username: process.env.CAPITAL_USERNAME,
  password: process.env.CAPITAL_PASSWORD,
  timeframes: ['1MINUTE', '5MINUTE', '15MINUTE', 'HOUR'],
  epics: {
    ETHUSD: process.env.CAPITAL_EPIC_ETHUSD || 'ETHUSD',
    GOLD: process.env.CAPITAL_EPIC_GOLD || 'GOLD',
    SILVER: process.env.CAPITAL_EPIC_SILVER || 'SILVER'
  }
};

export const QUESTDB_CONFIG = {
  host: process.env.QUESTDB_HOST || 'localhost',
  port: Number(process.env.QUESTDB_PORT || 9009),
  username: process.env.QUESTDB_USER || 'admin',
  password: process.env.QUESTDB_PASSWORD || 'admin',
  tls: String(process.env.QUESTDB_TLS || 'false') === 'true'
};

export const STATUS_INTERVAL_MS = 5000;
export const TICK_EXPECTED_INTERVAL_MS = 1000;
