import { CandleStick } from '../types';

export type H4TrendBias = 'BUY_ONLY' | 'SELL_ONLY' | 'NO_TRADE';

export interface H4EmaFilterResult {
  ok: boolean;
  status: 'BUY_ONLY' | 'SELL_ONLY' | 'NO_TRADE' | 'NO_CANDLES';
  bias: H4TrendBias;
  allowBuy: boolean;
  allowSell: boolean;
  price: number;
  ema50: number | null;
  ema9: number | null;
  candleCount: number;
  lastCandleTime?: number;
  reason: string;
}

/**
 * Standard institutional EMA calculation seeded by the initial period SMA.
 * Returns null if fewer than `period` data points are available.
 */
export function calculateEMA(closes: number[], period: number): number | null {
  if (!Array.isArray(closes) || closes.length < period || period <= 0) {
    return null;
  }

  let smaSum = 0;
  for (let i = 0; i < period; i++) {
    const val = closes[i];
    if (!Number.isFinite(val)) return null;
    smaSum += val;
  }

  let ema = smaSum / period;
  const k = 2 / (period + 1);

  for (let i = period; i < closes.length; i++) {
    const val = closes[i];
    if (!Number.isFinite(val)) return null;
    ema = val * k + ema * (1 - k);
  }

  return ema;
}

/**
 * Computes full EMA series aligned 1:1 with `closes` (null until index period - 1).
 */
export function calculateEMASeries(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (!Array.isArray(closes) || closes.length < period || period <= 0) {
    return result;
  }

  let smaSum = 0;
  for (let i = 0; i < period; i++) {
    smaSum += closes[i];
  }
  let ema = smaSum / period;
  result[period - 1] = ema;

  const k = 2 / (period + 1);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result[i] = ema;
  }

  return result;
}

/**
 * Mandatory H4 Trend Filter executed before ANY signal can be generated:
 * - Fetches / requires >= 50 real H4 candles
 * - Computes real H4 50 EMA and 9 EMA from candle closes
 * - Price < 50 EMA AND Price < 9 EMA => SELL_ONLY (Block ALL BUY)
 * - Price > 50 EMA AND Price > 9 EMA => BUY_ONLY (Block ALL SELL)
 * - Mixed / Neutral => NO_TRADE (Block both BUY & SELL)
 * - Missing candles (< 50) => NO_CANDLES ("NO CANDLES - NO SIGNAL")
 */
export function evaluateH4EmaFilter(
  candles: CandleStick[] | null | undefined,
  livePrice?: number
): H4EmaFilterResult {
  if (!Array.isArray(candles) || candles.length < 50) {
    return {
      ok: false,
      status: 'NO_CANDLES',
      bias: 'NO_TRADE',
      allowBuy: false,
      allowSell: false,
      price: livePrice && livePrice > 0 ? livePrice : 0,
      ema50: null,
      ema9: null,
      candleCount: Array.isArray(candles) ? candles.length : 0,
      reason: 'NO CANDLES - NO SIGNAL'
    };
  }

  // Ensure chronological ascending order
  const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
  const closes = sorted.map(c => c.close).filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);

  if (closes.length < 50) {
    return {
      ok: false,
      status: 'NO_CANDLES',
      bias: 'NO_TRADE',
      allowBuy: false,
      allowSell: false,
      price: livePrice && livePrice > 0 ? livePrice : 0,
      ema50: null,
      ema9: null,
      candleCount: closes.length,
      reason: 'NO CANDLES - NO SIGNAL'
    };
  }

  const ema50 = calculateEMA(closes, 50);
  const ema9 = calculateEMA(closes, 9);

  if (ema50 === null || ema9 === null) {
    return {
      ok: false,
      status: 'NO_CANDLES',
      bias: 'NO_TRADE',
      allowBuy: false,
      allowSell: false,
      price: livePrice && livePrice > 0 ? livePrice : closes[closes.length - 1],
      ema50: null,
      ema9: null,
      candleCount: closes.length,
      reason: 'NO CANDLES - NO SIGNAL'
    };
  }

  const lastCandle = sorted[sorted.length - 1];
  const price = livePrice && Number.isFinite(livePrice) && livePrice > 0 ? livePrice : lastCandle.close;

  if (price < ema50 && price < ema9) {
    return {
      ok: true,
      status: 'SELL_ONLY',
      bias: 'SELL_ONLY',
      allowBuy: false,
      allowSell: true,
      price,
      ema50,
      ema9,
      candleCount: sorted.length,
      lastCandleTime: lastCandle.timestamp,
      reason: `H4 Trend Filter: Price (${price}) < H4 50 EMA (${ema50.toFixed(4)}) & 9 EMA (${ema9.toFixed(4)}) => SELL ONLY (All BUY blocked)`
    };
  }

  if (price > ema50 && price > ema9) {
    return {
      ok: true,
      status: 'BUY_ONLY',
      bias: 'BUY_ONLY',
      allowBuy: true,
      allowSell: false,
      price,
      ema50,
      ema9,
      candleCount: sorted.length,
      lastCandleTime: lastCandle.timestamp,
      reason: `H4 Trend Filter: Price (${price}) > H4 50 EMA (${ema50.toFixed(4)}) & 9 EMA (${ema9.toFixed(4)}) => BUY ONLY (All SELL blocked)`
    };
  }

  return {
    ok: true,
    status: 'NO_TRADE',
    bias: 'NO_TRADE',
    allowBuy: false,
    allowSell: false,
    price,
    ema50,
    ema9,
    candleCount: sorted.length,
    lastCandleTime: lastCandle.timestamp,
    reason: `H4 Trend Filter: Price (${price}) mixed between 9 EMA (${ema9.toFixed(4)}) and 50 EMA (${ema50.toFixed(4)}) => NO TRADE`
  };
}
