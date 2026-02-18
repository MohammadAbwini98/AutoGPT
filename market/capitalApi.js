import fetch from 'node-fetch';
import { CAPITAL_CONFIG } from './config.js';

let sessionTokens = { cst: null, securityToken: null };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getSessionHeaders(extra = {}) {
  const headers = {
    'X-API-KEY': CAPITAL_CONFIG.apiKey,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra
  };
  if (sessionTokens.cst && sessionTokens.securityToken) {
    headers['CST'] = sessionTokens.cst;
    headers['X-SECURITY-TOKEN'] = sessionTokens.securityToken;
  }
  return headers;
}

export async function createSession() {
  const url = `${CAPITAL_CONFIG.baseUrl}/session`;
  const body = {
    identifier: CAPITAL_CONFIG.username,
    password: CAPITAL_CONFIG.password
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Capital session login failed: ${res.status} ${text}`);
  }

  const cst = res.headers.get('CST');
  const sec = res.headers.get('X-SECURITY-TOKEN');
  sessionTokens.cst = cst;
  sessionTokens.securityToken = sec;

  const json = await res.json();
  console.log('[CAPITAL] Session created, accountId:', json.currentAccountId || CAPITAL_CONFIG.accountId);
  return json;
}

// Basic historical candles fetch (if you want to backfill)
export async function fetchHistoricalCandles(epic, resolution = 'MINUTE', max = 100, from = undefined, to = undefined) {
  // Capital.com uses /prices/{epic}?resolution=MINUTE&max=100 etc.
  const params = new URLSearchParams();
  params.set('resolution', resolution);
  params.set('max', String(max));
  if (from) params.set('from', String(from));
  if (to) params.set('to', String(to));

  const url = `${CAPITAL_CONFIG.baseUrl}/prices/${encodeURIComponent(epic)}?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: getSessionHeaders()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchHistoricalCandles failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}
