# AutoGPT Full

This project combines two modules:

- `chat/`  → AutoGPT: navigates ChatGPT web UI, opens a fixed conversation by href, sends a static query, prints the answer and timing.
- `market/` → Capital.com + QuestDB: streams tick data for ETHUSD, GOLD, SILVER, builds OHLCV candles for 1m/5m/15m/1h, stores everything in QuestDB, and prints live status.

## 1. Prerequisites

- Node.js 18+
- A Capital.com account with API key enabled
- QuestDB running locally (simple Docker or binary)

### Run QuestDB quickly (Docker)

```bash
docker run -p 9000:9000 -p 9009:9009 questdb/questdb:latest
```

- Web console: http://localhost:9000
- ILP TCP port: 9009 (used by this project)

In the QuestDB web console, create two tables:

```sql
CREATE TABLE IF NOT EXISTS ticks (
  ts      TIMESTAMP,
  symbol  SYMBOL,
  bid     DOUBLE,
  ask     DOUBLE,
  last    DOUBLE,
  spread  DOUBLE,
  bidVol  DOUBLE,
  askVol  DOUBLE,
  srcTs   TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;

CREATE TABLE IF NOT EXISTS candles (
  ts      TIMESTAMP,
  symbol  SYMBOL,
  tf      SYMBOL,
  open    DOUBLE,
  high    DOUBLE,
  low     DOUBLE,
  close   DOUBLE,
  volume  DOUBLE
) TIMESTAMP(ts) PARTITION BY DAY;
```

## 2. Install dependencies

```bash
cd AutoGPT
npm install
```

## 3. Configure environment

Copy `.env.example` → `.env` and fill in:

- ChatGPT email/password (for `chat/` module) if you want auto-login.
- Capital.com API key, username, password, account ID.
- Epics for ETHUSD/GOLD/SILVER (replace from Capital.com UI or docs).
- QuestDB connection (localhost:9009 by default).

## 4. Chat module (ChatGPT AutoGPT)

Configuration file: `chat/config.js`.

Run:

```bash
npm run chat
```

On first run set `HEADLESS: false` in `chat/config.js`, log in manually; Chrome profile is saved in `chrome-profile/`. After that you can use `HEADLESS: true`.

## 5. Market module (Capital.com + QuestDB)

Configuration: `market/config.js` and `.env`.

Run:

```bash
npm run market
```

Every few seconds the program prints, for each instrument:

- Current bid/ask/last, spread, bid/ask volumes.
- Latest OHLCV per timeframe (1m/5m/15m/1h).
- Candle count per timeframe fetched so far.

Data is written continuously into QuestDB `ticks` and `candles` tables.

Stop with Ctrl + C.


git config --global user.name "MohammadAbwini98"
git config --global user.email "mohammad.abwini98@gmail.com"


git remote add origin https://github.com/MohammadAbwini98/AutoGPT.git
git branch -M main
git push -u origin main


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