import {
  ForexPair,
  ForexSignal,
  SignalType,
  SignalStatus,
  Timeframe,
  CandleStick,
  TradingSession,
  EconomicEvent,
  CurrencyStrength,
  SmartMoneyZone,
  ImpactLevel
} from '../types';
import { PersistenceManager } from './persistence';
import { currencyStrengthService } from './currencyStrengthService';
import { economicCalendarService } from './economicCalendarService';

// --- 1. Traditional FX Majors (0.01 Lot Micro-Friendly: Margin ~$2 - $10 | 1 Pip = $0.10) ---
export const PAIR_EURUSD: ForexPair = { symbol: 'EUR/USD', name: 'Euro / US Dollar', basePrice: 1.1248, currentPrice: 1.1248, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.20, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_GBPUSD: ForexPair = { symbol: 'GBP/USD', name: 'British Pound / USD', basePrice: 1.3238, currentPrice: 1.3238, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.65, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_USDJPY: ForexPair = { symbol: 'USD/JPY', name: 'US Dollar / Yen', basePrice: 157.82, currentPrice: 157.82, pipDigits: 2, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.00, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_USDCHF: ForexPair = { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', basePrice: 0.8285, currentPrice: 0.8285, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.00, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_AUDUSD: ForexPair = { symbol: 'AUD/USD', name: 'Aussie / USD', basePrice: 0.6953, currentPrice: 0.6953, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 1.40, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_NZDUSD: ForexPair = { symbol: 'NZD/USD', name: 'Kiwi / USD', basePrice: 0.5611, currentPrice: 0.5611, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 1.15, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_USDCAD: ForexPair = { symbol: 'USD/CAD', name: 'US Dollar / CAD', basePrice: 1.4248, currentPrice: 1.4248, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.00, pipValue001: 0.08, isMicroAccountFriendly: true };

// --- 2. 21 Major Crosses (0.01 Lot Micro-Friendly: Margin ~$2 - $10 | 1 Pip = $0.08 - $0.12) ---
export const PAIR_EURGBP: ForexPair = { symbol: 'EUR/GBP', name: 'Euro / British Pound', basePrice: 0.8497, currentPrice: 0.8497, pipDigits: 4, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.13, isMicroAccountFriendly: true };
export const PAIR_EURJPY: ForexPair = { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', basePrice: 177.60, currentPrice: 177.60, pipDigits: 2, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_EURAUD: ForexPair = { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', basePrice: 1.6164, currentPrice: 1.6164, pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.07, isMicroAccountFriendly: true };
export const PAIR_EURCAD: ForexPair = { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', basePrice: 1.6025, currentPrice: 1.6025, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.08, isMicroAccountFriendly: true };
export const PAIR_EURCHF: ForexPair = { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', basePrice: 0.9323, currentPrice: 0.9323, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_EURNZD: ForexPair = { symbol: 'EUR/NZD', name: 'Euro / New Zealand Dollar', basePrice: 2.0029, currentPrice: 2.0029, pipDigits: 4, spreadPips: 0.5, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.06, isMicroAccountFriendly: true };

export const PAIR_GBPJPY: ForexPair = { symbol: 'GBP/JPY', name: 'Pound / Yen (The Dragon)', basePrice: 208.88, currentPrice: 208.88, pipDigits: 2, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_GBPAUD: ForexPair = { symbol: 'GBP/AUD', name: 'Pound / Australian Dollar', basePrice: 1.9016, currentPrice: 1.9016, pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.07, isMicroAccountFriendly: true };
export const PAIR_GBPCAD: ForexPair = { symbol: 'GBP/CAD', name: 'Pound / Canadian Dollar', basePrice: 1.8859, currentPrice: 1.8859, pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.08, isMicroAccountFriendly: true };
export const PAIR_GBPCHF: ForexPair = { symbol: 'GBP/CHF', name: 'Pound / Swiss Franc', basePrice: 1.0965, currentPrice: 1.0965, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_GBPNZD: ForexPair = { symbol: 'GBP/NZD', name: 'Pound / New Zealand Dollar', basePrice: 2.3569, currentPrice: 2.3569, pipDigits: 4, spreadPips: 0.6, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.06, isMicroAccountFriendly: true };

export const PAIR_AUDJPY: ForexPair = { symbol: 'AUD/JPY', name: 'Aussie / Japanese Yen', basePrice: 109.74, currentPrice: 109.74, pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.40, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_AUDCAD: ForexPair = { symbol: 'AUD/CAD', name: 'Aussie / Canadian Dollar', basePrice: 0.9908, currentPrice: 0.9908, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.40, pipValue001: 0.08, isMicroAccountFriendly: true };
export const PAIR_AUDCHF: ForexPair = { symbol: 'AUD/CHF', name: 'Aussie / Swiss Franc', basePrice: 0.5760, currentPrice: 0.5760, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.40, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_AUDNZD: ForexPair = { symbol: 'AUD/NZD', name: 'Aussie / New Zealand Dollar', basePrice: 1.2380, currentPrice: 1.2380, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.40, pipValue001: 0.06, isMicroAccountFriendly: true };

export const PAIR_CADJPY: ForexPair = { symbol: 'CAD/JPY', name: 'Canadian Dollar / Yen', basePrice: 110.71, currentPrice: 110.71, pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.50, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_CADCHF: ForexPair = { symbol: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc', basePrice: 0.5812, currentPrice: 0.5812, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.50, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_CHFJPY: ForexPair = { symbol: 'CHF/JPY', name: 'Swiss Franc / Yen', basePrice: 190.36, currentPrice: 190.36, pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.30, pipValue001: 0.09, isMicroAccountFriendly: true };

export const PAIR_NZDJPY: ForexPair = { symbol: 'NZD/JPY', name: 'Kiwi / Japanese Yen', basePrice: 88.56, currentPrice: 88.56, pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_NZDCAD: ForexPair = { symbol: 'NZD/CAD', name: 'Kiwi / Canadian Dollar', basePrice: 0.7995, currentPrice: 0.7995, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.08, isMicroAccountFriendly: true };
export const PAIR_NZDCHF: ForexPair = { symbol: 'NZD/CHF', name: 'Kiwi / Swiss Franc', basePrice: 0.4649, currentPrice: 0.4649, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.12, isMicroAccountFriendly: true };

// --- 3. Precious Metals (0.01 Micro-Lot Friendly: 1 oz Gold / 50 oz Silver) ---
export const PAIR_XAUUSD: ForexPair = { symbol: 'XAU/USD', name: 'Gold / US Dollar', basePrice: 4138.50, currentPrice: 4138.50, pipDigits: 2, isGoldOrCrypto: true, spreadPips: 1.2, category: 'METALS', minMargin001: 8.50, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_XAGUSD: ForexPair = { symbol: 'XAG/USD', name: 'Silver / US Dollar', basePrice: 60.37, currentPrice: 60.37, pipDigits: 2, isGoldOrCrypto: true, spreadPips: 0.8, category: 'METALS', minMargin001: 3.20, pipValue001: 0.50, isMicroAccountFriendly: true };

export const ALL_PAIRS: ForexPair[] = [
  // Core FX Majors (7 pairs)
  PAIR_EURUSD,
  PAIR_GBPUSD,
  PAIR_USDJPY,
  PAIR_USDCHF,
  PAIR_AUDUSD,
  PAIR_NZDUSD,
  PAIR_USDCAD,
  // High Liquidity Crosses (21 pairs)
  PAIR_EURGBP,
  PAIR_EURJPY,
  PAIR_EURAUD,
  PAIR_EURCAD,
  PAIR_EURCHF,
  PAIR_EURNZD,
  PAIR_GBPJPY,
  PAIR_GBPAUD,
  PAIR_GBPCAD,
  PAIR_GBPCHF,
  PAIR_GBPNZD,
  PAIR_AUDJPY,
  PAIR_AUDCAD,
  PAIR_AUDCHF,
  PAIR_AUDNZD,
  PAIR_CADJPY,
  PAIR_CADCHF,
  PAIR_CHFJPY,
  PAIR_NZDJPY,
  PAIR_NZDCAD,
  PAIR_NZDCHF,
  // Micro-Accessible Precious Metals
  PAIR_XAUUSD,
  PAIR_XAGUSD
];

export function createSyntheticSignalForPair(pair: ForexPair): ForexSignal {
  const current = pair.currentPrice > 0 ? pair.currentPrice : pair.basePrice;
  const pipOffset = pair.pipDigits === 2 ? (pair.isGoldOrCrypto ? 15.0 : 0.40) : (pair.pipDigits === 1 ? 80.0 : 0.0040);
  const tp1Offset = pipOffset * 2.5;
  const tp2Offset = pipOffset * 4.0;
  const tp3Offset = pipOffset * 6.0;

  return {
    id: `ANALYZE-${pair.symbol.replace(/[\/\s]/g, '')}`,
    pair: { ...pair, currentPrice: current },
    type: 'BUY_MARKET',
    status: 'PENDING',
    entryPrice: Number(current.toFixed(pair.pipDigits)),
    currentPrice: Number(current.toFixed(pair.pipDigits)),
    stopLoss: Number((current - pipOffset).toFixed(pair.pipDigits)),
    takeProfit1: Number((current + tp1Offset).toFixed(pair.pipDigits)),
    takeProfit2: Number((current + tp2Offset).toFixed(pair.pipDigits)),
    takeProfit3: Number((current + tp3Offset).toFixed(pair.pipDigits)),
    pips: 0,
    riskReward: '—',
    confluenceScore: 0,
    rationale: `${pair.name} (${pair.symbol}) is a tradable 0.01 micro-lot broker asset, but it currently has NO active institutional signal. Wait for an SMC Order Block mitigation, Liquidity Sweep, and Currency Strength divergence before entering a trade.`,
    timeframe: 'H1',
    timestamp: 'Standby Watch',
    institutionalFlow: 'Neutral / Consolidating — Waiting for Institutional Order Block & Liquidity Sweep',
    isBestTradeNow: false,
    isPending: true,
    isFavorite: false,
    hasAlert: false,
    killzone: 'Monitoring Session Liquidity',
    winProbability: 0,
    quality: 'B',
    economicRisk: 'Do not enter without verified Signal Card',
    validityTimeLeft: 'Waiting for Setup',
    validityExpiresAt: 'Chart Observation Mode',
    invalidationTrigger: 'No active trade setup — wait for verified Signal Card before placing an order.',
    createdAtMs: Date.now(),
    takeProfit: Number((current + tp1Offset).toFixed(pair.pipDigits)),
    checklist: [
      { title: '0.01 Lot Broker Tradability', isConfirmed: true, detail: `Supported at ~$${(pair.minMargin001 || 2.5).toFixed(2)} margin` },
      { title: 'SMC Order Block Mitigation', isConfirmed: false, detail: 'Waiting for price to tap institutional zone' },
      { title: 'Liquidity Sweep Confirmation', isConfirmed: false, detail: 'Pending stop-hunt & displacement candle' },
      { title: 'Currency Strength Divergence', isConfirmed: false, detail: 'Awaiting ≥80% multi-timeframe confluence' }
    ]
  };
}

export function formatPrice(pair: ForexPair, price: number): string {
  if (pair.pipDigits === 0) return price.toFixed(0);
  if (pair.pipDigits === 1) return price.toFixed(1);
  if (pair.pipDigits === 2) return price.toFixed(2);
  return price.toFixed(5);
}

export function calculatePips(pair: ForexPair, entry: number, current: number, isBuy: boolean): number {
  const diff = isBuy ? current - entry : entry - current;
  let multiplier = 10000.0;
  if (pair.isGoldOrCrypto && pair.pipDigits === 1) {
    multiplier = 1.0;
  } else if (pair.isGoldOrCrypto && pair.pipDigits === 2) {
    multiplier = 10.0;
  } else if (pair.pipDigits === 2) {
    multiplier = 100.0;
  }
  const pips = diff * multiplier;
  return Math.round(pips * 10) / 10;
}

export function calculateSlPips(signal: ForexSignal): number {
  const diff = Math.abs(signal.entryPrice - signal.stopLoss);
  let multiplier = 10000.0;
  if (signal.pair.pipDigits === 2 && !signal.pair.isGoldOrCrypto) multiplier = 100.0;
  else if (signal.pair.isGoldOrCrypto) multiplier = 10.0;
  const pips = diff * multiplier;
  return Math.round(pips * 10) / 10;
}

export function calculateLotSize(signal: ForexSignal, accountBalance: number, riskPercent: number): number {
  const riskUsd = accountBalance * (riskPercent / 100.0);
  const slPips = calculateSlPips(signal);
  if (slPips <= 0) return 0.01;

  let lotSize = 0.01;
  if (signal.pair.isGoldOrCrypto) {
    const diff = Math.abs(signal.entryPrice - signal.stopLoss);
    lotSize = diff > 0 ? riskUsd / (diff * 100.0) : 0.01;
  } else {
    lotSize = riskUsd / (slPips * 10.0);
  }
  const rounded = Math.round(lotSize * 100) / 100;
  return Math.max(0.01, Math.min(50.0, rounded));
}

export function calculateDollarPnl(
  pair: ForexPair,
  entryPrice: number,
  targetPrice: number,
  lots: number,
  isBuy: boolean
): { dollarPnl: number; pips: number } {
  const isGold = pair.symbol.includes('XAU') || pair.symbol.includes('GOLD');
  const isIndex = pair.symbol.includes('US30') || pair.symbol.includes('NAS') || pair.symbol.includes('SPX');
  const isBtc = pair.symbol.includes('BTC');

  const priceDiff = isBuy ? (targetPrice - entryPrice) : (entryPrice - targetPrice);

  let dollarPnl = 0;
  let pips = 0;

  if (isGold) {
    pips = Math.round(priceDiff * 10 * 10) / 10;
    dollarPnl = priceDiff * 100.0 * lots; // standard 100 oz contract
  } else if (isIndex) {
    pips = Math.round(priceDiff * 10) / 10;
    dollarPnl = priceDiff * 1.0 * lots; // $1 per index point
  } else if (isBtc) {
    pips = Math.round(priceDiff * 10) / 10;
    dollarPnl = priceDiff * 1.0 * lots;
  } else {
    const isJpy = pair.symbol.includes('JPY');
    pips = Math.round((priceDiff / (isJpy ? 0.01 : 0.0001)) * 10) / 10;
    // For JPY pairs, pip value per standard lot in USD = 1000 JPY / exit price
    // For EUR/USD, GBP/USD, etc., pip value is $10.0 per standard lot
    const pipValuePerLot = isJpy && targetPrice > 0 ? (1000.0 / targetPrice) : 10.0;
    dollarPnl = pips * pipValuePerLot * lots;
  }

  return {
    dollarPnl: Math.round(dollarPnl * 100) / 100,
    pips
  };
}

export function isForexMarketOpen(now: Date = new Date()): boolean {
  const day = now.getUTCDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const hour = now.getUTCHours();
  if (day === 5 && hour >= 22) return false;
  if (day === 6) return false;
  if (day === 0 && hour < 22) return false;
  return true;
}

export function getCurrentGmtTimeFormatted(now: Date = new Date()): string {
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const minute = String(now.getUTCMinutes()).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = days[now.getUTCDay()];
  return `${hour}:${minute} GMT • ${dayName}`;
}

export function getTradingSessions(now: Date = new Date()): TradingSession[] {
  const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hourGmt = now.getUTCHours();
  const minuteGmt = now.getUTCMinutes();
  const totalMinutes = hourGmt * 60 + minuteGmt;

  // Global Weekend Market Hours:
  // Interbank FX closes Friday at 22:00 GMT (1320 mins) and reopens Sunday at 22:00 GMT (1320 mins)
  const isFridayAfterClose = dayOfWeek === 5 && totalMinutes >= 1320;
  const isSaturday = dayOfWeek === 6;
  const isSundayBeforeOpen = dayOfWeek === 0 && totalMinutes < 1320;
  const isGlobalWeekend = isFridayAfterClose || isSaturday || isSundayBeforeOpen;

  // 1. Sydney: 22:00 - 07:00 GMT (1320 to 420 mins)
  // Reopens Sunday 22:00 GMT, runs daily, closes Friday 07:00 GMT
  let isSydneyOpen = false;
  if (!isSaturday) {
    if (dayOfWeek === 0) {
      isSydneyOpen = totalMinutes >= 1320;
    } else if (dayOfWeek === 5) {
      isSydneyOpen = totalMinutes < 420;
    } else {
      isSydneyOpen = totalMinutes >= 1320 || totalMinutes < 420;
    }
  }

  // 2. Tokyo: 00:00 - 09:00 GMT (0 to 540 mins)
  // Monday to Friday
  const isTokyoOpen = !isGlobalWeekend && dayOfWeek >= 1 && dayOfWeek <= 5 && totalMinutes >= 0 && totalMinutes < 540;

  // 3. London: 08:00 - 17:00 GMT (480 to 1020 mins)
  // Monday to Friday
  const isLondonOpen = !isGlobalWeekend && dayOfWeek >= 1 && dayOfWeek <= 5 && totalMinutes >= 480 && totalMinutes < 1020;

  // 4. New York: 13:00 - 22:00 GMT (780 to 1320 mins)
  // Monday to Friday (closes Friday 22:00 GMT)
  const isNewYorkOpen = !isGlobalWeekend && dayOfWeek >= 1 && dayOfWeek <= 5 && totalMinutes >= 780 && totalMinutes < 1320;

  // Format helper for remaining time
  const formatTimeSpan = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  // Local financial center time helper
  const getLocalClock = (timeZone: string) => {
    try {
      return now.toLocaleTimeString('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return `${String(hourGmt).padStart(2, '0')}:${String(minuteGmt).padStart(2, '0')}`;
    }
  };

  // Status text helper
  const status = (isOpen: boolean): string => {
    if (isOpen) return 'OPEN • ACTIVE';
    if (isGlobalWeekend) return 'CLOSED • WEEKEND';
    return 'CLOSED';
  };

  // --- London Session Metrics (08:00 - 17:00 GMT, 540 mins duration) ---
  let londonCountdown = '';
  let londonProgress = 0;
  if (isLondonOpen) {
    const remaining = 1020 - totalMinutes;
    londonCountdown = `Closes in ${formatTimeSpan(remaining)}`;
    londonProgress = Math.min(100, Math.max(0, Math.round(((totalMinutes - 480) / 540) * 100)));
  } else {
    if (isGlobalWeekend || (dayOfWeek === 5 && totalMinutes >= 1020)) {
      londonCountdown = 'Opens Mon 08:00 GMT';
    } else if (totalMinutes < 480 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      londonCountdown = `Opens in ${formatTimeSpan(480 - totalMinutes)}`;
    } else if (totalMinutes >= 1020 && dayOfWeek >= 1 && dayOfWeek <= 4) {
      londonCountdown = `Opens in ${formatTimeSpan((1440 - totalMinutes) + 480)}`;
    } else {
      londonCountdown = 'Opens Mon 08:00 GMT';
    }
  }

  // --- New York Session Metrics (13:00 - 22:00 GMT, 540 mins duration) ---
  let nyCountdown = '';
  let nyProgress = 0;
  if (isNewYorkOpen) {
    const remaining = 1320 - totalMinutes;
    nyCountdown = `Closes in ${formatTimeSpan(remaining)}`;
    nyProgress = Math.min(100, Math.max(0, Math.round(((totalMinutes - 780) / 540) * 100)));
  } else {
    if (isGlobalWeekend || (dayOfWeek === 5 && totalMinutes >= 1320)) {
      nyCountdown = 'Opens Mon 13:00 GMT';
    } else if (totalMinutes < 780 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      nyCountdown = `Opens in ${formatTimeSpan(780 - totalMinutes)}`;
    } else if (totalMinutes >= 1320 && dayOfWeek >= 1 && dayOfWeek <= 4) {
      nyCountdown = `Opens in ${formatTimeSpan((1440 - totalMinutes) + 780)}`;
    } else {
      nyCountdown = 'Opens Mon 13:00 GMT';
    }
  }

  // --- Tokyo Session Metrics (00:00 - 09:00 GMT, 540 mins duration) ---
  let tokyoCountdown = '';
  let tokyoProgress = 0;
  if (isTokyoOpen) {
    const remaining = 540 - totalMinutes;
    tokyoCountdown = `Closes in ${formatTimeSpan(remaining)}`;
    tokyoProgress = Math.min(100, Math.max(0, Math.round((totalMinutes / 540) * 100)));
  } else {
    if (isGlobalWeekend || (dayOfWeek === 5 && totalMinutes >= 540)) {
      tokyoCountdown = 'Opens Mon 00:00 GMT';
    } else if (dayOfWeek >= 1 && dayOfWeek <= 4 && totalMinutes >= 540) {
      tokyoCountdown = `Opens in ${formatTimeSpan(1440 - totalMinutes)}`;
    } else if (dayOfWeek === 0 && totalMinutes >= 1320) {
      tokyoCountdown = `Opens in ${formatTimeSpan(1440 - totalMinutes)}`;
    } else {
      tokyoCountdown = 'Opens Mon 00:00 GMT';
    }
  }

  // --- Sydney Session Metrics (22:00 - 07:00 GMT, 540 mins duration) ---
  let sydneyCountdown = '';
  let sydneyProgress = 0;
  if (isSydneyOpen) {
    const remaining = totalMinutes >= 1320 ? (1440 - totalMinutes) + 420 : 420 - totalMinutes;
    sydneyCountdown = `Closes in ${formatTimeSpan(remaining)}`;
    const elapsed = totalMinutes >= 1320 ? totalMinutes - 1320 : (1440 - 1320) + totalMinutes;
    sydneyProgress = Math.min(100, Math.max(0, Math.round((elapsed / 540) * 100)));
  } else {
    if (isSaturday || (dayOfWeek === 5 && totalMinutes >= 420)) {
      sydneyCountdown = 'Opens Sun 22:00 GMT';
    } else if (dayOfWeek === 0 && totalMinutes < 1320) {
      sydneyCountdown = `Opens in ${formatTimeSpan(1320 - totalMinutes)}`;
    } else if (dayOfWeek >= 1 && dayOfWeek <= 4 && totalMinutes >= 420 && totalMinutes < 1320) {
      sydneyCountdown = `Opens in ${formatTimeSpan(1320 - totalMinutes)}`;
    } else {
      sydneyCountdown = 'Opens Sun 22:00 GMT';
    }
  }

  const isLondonNyOverlap = isLondonOpen && isNewYorkOpen;

  return [
    {
      id: 'LONDON',
      name: 'London Session',
      city: 'London',
      country: 'United Kingdom',
      flag: '🇬🇧',
      localTime: getLocalClock('Europe/London'),
      gmtHours: '08:00 - 17:00 GMT',
      isOpen: isLondonOpen,
      volatility: isLondonOpen
        ? isLondonNyOverlap
          ? 'Peak Liquidity (London/NY Overlap)'
          : 'High Volatility (European Institutional Volume)'
        : isGlobalWeekend
        ? 'Market Closed for Weekend'
        : 'Closed (Off-Hours)',
      statusText: status(isLondonOpen),
      countdownText: londonCountdown,
      progressPercent: londonProgress,
      activePairs: 'EUR, GBP, CHF, XAU/USD',
      overlapNotice: isLondonNyOverlap ? 'London / NY Overlap Active' : undefined
    },
    {
      id: 'NEW_YORK',
      name: 'New York Session',
      city: 'New York',
      country: 'United States',
      flag: '🇺🇸',
      localTime: getLocalClock('America/New_York'),
      gmtHours: '13:00 - 22:00 GMT',
      isOpen: isNewYorkOpen,
      volatility: isNewYorkOpen
        ? isLondonNyOverlap
          ? 'Peak Liquidity (London/NY Overlap)'
          : 'High Volatility (Wall Street Open & USD Order Flow)'
        : isGlobalWeekend
        ? 'Market Closed for Weekend'
        : 'Closed (Awaiting Wall Street)',
      statusText: status(isNewYorkOpen),
      countdownText: nyCountdown,
      progressPercent: nyProgress,
      activePairs: 'USD, CAD, US30, NAS100, Gold',
      overlapNotice: isLondonNyOverlap ? 'London / NY Overlap Active' : undefined
    },
    {
      id: 'TOKYO',
      name: 'Tokyo Session',
      city: 'Tokyo',
      country: 'Japan',
      flag: '🇯🇵',
      localTime: getLocalClock('Asia/Tokyo'),
      gmtHours: '00:00 - 09:00 GMT',
      isOpen: isTokyoOpen,
      volatility: isTokyoOpen
        ? 'Active Asian Liquidity & BoJ Order Flow'
        : isGlobalWeekend
        ? 'Market Closed for Weekend'
        : 'Closed (Session Ended 09:00 GMT)',
      statusText: status(isTokyoOpen),
      countdownText: tokyoCountdown,
      progressPercent: tokyoProgress,
      activePairs: 'JPY, AUD, NZD, Nikkei'
    },
    {
      id: 'SYDNEY',
      name: 'Sydney Session',
      city: 'Sydney',
      country: 'Australia',
      flag: '🇦🇺',
      localTime: getLocalClock('Australia/Sydney'),
      gmtHours: '22:00 - 07:00 GMT',
      isOpen: isSydneyOpen,
      volatility: isSydneyOpen
        ? 'Pacific Open & Baseline Interbank Spread'
        : isGlobalWeekend
        ? 'Opens Sunday 22:00 GMT'
        : 'Closed (Session Ended 07:00 GMT)',
      statusText: status(isSydneyOpen),
      countdownText: sydneyCountdown,
      progressPercent: sydneyProgress,
      activePairs: 'AUD, NZD, Commodity Currencies'
    }
  ];
}

export function getEffectiveDurationMs(timeframe: Timeframe): number {
  switch (timeframe) {
    case 'M5': return 30 * 60 * 1000;         // 30 Minutes
    case 'M15': return 60 * 60 * 1000;        // 1 Hour (60 Minutes)
    case 'H1': return 4 * 3600 * 1000;        // 4 Hours
    case 'H4': return 24 * 3600 * 1000;       // 24 Hours (1 Day)
    case 'D1': return 72 * 3600 * 1000;       // 72 Hours (3 Days)
  }
}

export function getFormattedTimeElapsed(signal: ForexSignal, now: number = Date.now()): string {
  const elapsed = Math.max(0, now - signal.createdAtMs);
  const minutes = Math.floor(elapsed / (60 * 1000));
  const hours = Math.floor(elapsed / (3600 * 1000));
  const days = Math.floor(elapsed / (24 * 3600 * 1000));

  if (days > 0) return `Posted ${days}d ${hours % 24}h ago`;
  if (hours > 0) return `Posted ${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `Posted ${minutes}m ago`;
  return `Posted Just Now`;
}

export function getFormattedTotalValidity(signal: ForexSignal): string {
  const totalMs = signal.validityDurationMs || getEffectiveDurationMs(signal.timeframe);
  const totalMinutes = Math.round(totalMs / (60 * 1000));
  if (totalMinutes < 60) return `${totalMinutes}m Entry Window`;
  const hours = totalMs / (3600 * 1000);
  if (hours >= 24) return `${Math.round(hours / 24)}d Max Validity`;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h Entry Window`;
}

export function getRemainingValidityMs(signal: ForexSignal, now: number = Date.now()): number {
  const total = signal.validityDurationMs || getEffectiveDurationMs(signal.timeframe);
  const elapsed = Math.max(0, now - signal.createdAtMs);
  return Math.max(0, total - elapsed);
}

export function getFormattedCountdown(signal: ForexSignal, now: number = Date.now()): string {
  const remaining = getRemainingValidityMs(signal, now);
  if (remaining <= 0) return 'Expired (Timeframe Invalidation)';
  const hours = Math.floor(remaining / (3600 * 1000));
  const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function getValidityProgress(signal: ForexSignal, now: number = Date.now()): number {
  const total = signal.validityDurationMs || getEffectiveDurationMs(signal.timeframe);
  if (total <= 0) return 0;
  const rem = getRemainingValidityMs(signal, now);
  return Math.max(0, Math.min(1, rem / total));
}

export function getTpProgressRatio(signal: ForexSignal, currentPrice: number): number {
  const isBuy = signal.type.startsWith('BUY');
  const entry = signal.entryPrice;
  const tp = signal.takeProfit1;
  const totalDist = Math.abs(tp - entry);
  if (totalDist <= 0) return 0;
  const achievedDist = isBuy ? (currentPrice - entry) : (entry - currentPrice);
  return Math.max(0, Math.min(1, achievedDist / totalDist));
}

/**
 * Determines whether a signal is actively tradeable and valid.
 * Removes all invalid, completed, closed, or time-expired signal pairs from active cards.
 */
export function isSignalValidAndActive(signal: ForexSignal, now: number = Date.now()): boolean {
  // 1. Closed status (Hit Take Profit or Stop Loss)
  if (signal.status === 'HIT_TP' || signal.status === 'HIT_SL') {
    return false;
  }

  // 2. Closed / Target Reached text markers
  const timeText = (signal.validityTimeLeft || '').toLowerCase();
  const expText = (signal.validityExpiresAt || '').toLowerCase();
  if (
    timeText.includes('target reached') ||
    timeText.includes('completed') ||
    expText.includes('completed')
  ) {
    return false;
  }

  // 3. For Pending Orders ONLY: Time expiration & order cancelation check
  // Running market execution trades stay active until TP or SL is triggered.
  if (signal.status === 'PENDING' || signal.isPending) {
    if (timeText.includes('expired') || expText.includes('expired')) {
      return false;
    }
    const remainingMs = getRemainingValidityMs(signal, now);
    if (remainingMs <= 0) {
      return false; // Pending limit/stop order entry window expired
    }

    // 4. For Pending Orders: Structural price invalidation check
    // If market price broke beyond the Stop Loss level before filling the limit/stop order,
    // the setup is invalidated and must be removed from active signal cards.
    const currentPrice = signal.currentPrice > 0 ? signal.currentPrice : signal.pair.currentPrice;
    if (currentPrice > 0) {
      if (signal.type === 'BUY_LIMIT' && currentPrice <= signal.stopLoss) {
        return false; // Invalidated: Dropped below SL before fill
      }
      if (signal.type === 'SELL_LIMIT' && currentPrice >= signal.stopLoss) {
        return false; // Invalidated: Spiked above SL before fill
      }
      if (signal.type === 'BUY_STOP' && currentPrice <= signal.stopLoss) {
        return false; // Invalidated: Dropped below SL
      }
      if (signal.type === 'SELL_STOP' && currentPrice >= signal.stopLoss) {
        return false; // Invalidated: Spiked above SL
      }
    }
  }

  // 5. Currency Strength Meter Alignment Check:
  // If the signal direction directly contradicts the live Currency Strength Meter
  // (e.g. USD is 8.6 vs JPY 1.6, but signal is SELL), automatically filter it out from active cards.
  const alignment = currencyStrengthService.isSignalAlignedWithCurrencyStrength(signal.pair.symbol, signal.type);
  if (!alignment.isAligned) {
    return false;
  }

  return true;
}

export function isSignalExpiredOrInvalid(signal: ForexSignal, now: number = Date.now()): boolean {
  return !isSignalValidAndActive(signal, now);
}

// Track the last live price seen per signal to distinguish normal market movement from initial feed sync jumps
const lastSeenSignalPrice = new Map<string, number>();

export function updateSignalWithLiveMarket(signal: ForexSignal, livePrice: number): ForexSignal {
  if (livePrice <= 0) return signal;

  const isBuy = signal.type.startsWith('BUY');
  const sym = signal.pair.symbol;
  const decimals =
    sym.includes('JPY') ||
    sym.includes('XAU') ||
    sym.includes('XAG') ||
    sym.includes('US30') ||
    sym.includes('NAS') ||
    sym.includes('BTC') ||
    sym.includes('ETH') ||
    sym.includes('OIL')
      ? 2
      : 4;
  const roundP = (val: number) => Number(val.toFixed(decimals));

  const slDist = Math.abs(signal.entryPrice - signal.stopLoss);
  const tp1Dist = Math.abs(signal.takeProfit1 - signal.entryPrice);
  const tp2Dist = Math.abs(signal.takeProfit2 - signal.entryPrice);
  const tp3Dist = Math.abs(signal.takeProfit3 - signal.entryPrice);

  const prevPrice = lastSeenSignalPrice.get(signal.id);
  lastSeenSignalPrice.set(signal.id, livePrice);

  const wouldHitSl = isBuy ? livePrice <= signal.stopLoss : livePrice >= signal.stopLoss;
  const wouldHitTp = isBuy ? livePrice >= signal.takeProfit1 : livePrice <= signal.takeProfit1;

  // Detect if this tick is an initial feed synchronization jump (e.g., switching from static seed price
  // to live TradingView quote, or waking up after tab sleep where price jumped > 40% of SL distance in 1 tick)
  const referencePrice = prevPrice ?? (signal.currentPrice > 0 ? signal.currentPrice : signal.entryPrice);
  const singleTickJump = Math.abs(livePrice - referencePrice);
  const isInitialFeedSyncJump =
    prevPrice === undefined || (slDist > 0 && singleTickJump > slDist * 0.45);

  // If an initial feed sync jump would immediately trigger SL/TP or leave < 35% of the SL cushion remaining,
  // re-anchor the signal around the real live market price with its full institutional SL & TP distances intact!
  const remainingSlCushion = isBuy ? livePrice - signal.stopLoss : signal.stopLoss - livePrice;
  const isDangerouslyCloseOnSync = isInitialFeedSyncJump && slDist > 0 && remainingSlCushion < slDist * 0.4;

  if (wouldHitSl || wouldHitTp || isDangerouslyCloseOnSync) {
    if (isInitialFeedSyncJump && (signal.status === 'RUNNING' || signal.status === 'PENDING')) {
      // Anchor entry slightly behind livePrice so RUNNING trades start with a realistic +8% of TP1 floating profit
      // and 100% of their institutional Stop Loss buffer intact!
      const entryOffset = signal.status === 'RUNNING' ? tp1Dist * 0.08 : -(tp1Dist * 0.15);
      const newEntry = roundP(isBuy ? livePrice - entryOffset : livePrice + entryOffset);
      const newSl = roundP(isBuy ? newEntry - slDist : newEntry + slDist);
      const newTp1 = roundP(isBuy ? newEntry + tp1Dist : newEntry - tp1Dist);
      const newTp2 = roundP(isBuy ? newEntry + tp2Dist : newEntry - tp2Dist);
      const newTp3 = roundP(isBuy ? newEntry + tp3Dist : newEntry - tp3Dist);

      const updatedPair: ForexPair = { ...signal.pair, currentPrice: livePrice };
      const recalibratedPips =
        signal.status === 'RUNNING'
          ? calculatePips(updatedPair, newEntry, livePrice, isBuy)
          : 0;

      return {
        ...signal,
        pair: updatedPair,
        entryPrice: newEntry,
        currentPrice: livePrice,
        stopLoss: newSl,
        takeProfit: newTp1,
        takeProfit1: newTp1,
        takeProfit2: newTp2,
        takeProfit3: newTp3,
        pips: recalibratedPips
      };
    }
  }

  const updatedPair: ForexPair = { ...signal.pair, currentPrice: livePrice };
  const finalEntry = signal.entryPrice;
  const finalStopLoss = signal.stopLoss;
  const finalTp1 = signal.takeProfit1;

  let newStatus: SignalStatus = signal.status;
  let newPips = signal.pips;

  switch (signal.status) {
    case 'PENDING': {
      let isFilled = false;
      if (signal.type === 'BUY_LIMIT') isFilled = livePrice <= finalEntry;
      else if (signal.type === 'SELL_LIMIT') isFilled = livePrice >= finalEntry;
      else if (signal.type === 'BUY_STOP') isFilled = livePrice >= finalEntry;
      else if (signal.type === 'SELL_STOP') isFilled = livePrice <= finalEntry;
      else isFilled = true;

      if (isFilled) {
        newStatus = 'RUNNING';
        newPips = calculatePips(updatedPair, finalEntry, livePrice, isBuy);
      } else {
        newStatus = 'PENDING';
        newPips = 0;
      }
      break;
    }
    case 'RUNNING': {
      newPips = calculatePips(updatedPair, finalEntry, livePrice, isBuy);
      if (isBuy && livePrice >= finalTp1) newStatus = 'HIT_TP';
      else if (isBuy && livePrice <= finalStopLoss) newStatus = 'HIT_SL';
      else if (!isBuy && livePrice <= finalTp1) newStatus = 'HIT_TP';
      else if (!isBuy && livePrice >= finalStopLoss) newStatus = 'HIT_SL';
      else newStatus = 'RUNNING';
      break;
    }
    case 'HIT_TP':
    case 'HIT_SL':
      break;
  }

  return {
    ...signal,
    pair: updatedPair,
    currentPrice: livePrice,
    pips: Math.round(newPips * 10) / 10,
    status: newStatus,
    isPending: newStatus === 'PENDING'
  };
}

export function getInitialSignals(): ForexSignal[] {
  const favorites = PersistenceManager.getFavorites();
  const alertToggled = PersistenceManager.getAlertToggledSignals();

  const rawSignals: ForexSignal[] = [
    {
      id: 'SIG-XAU-001',
      pair: PAIR_XAUUSD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 4152.00,
      currentPrice: 4164.00,
      stopLoss: 4132.00,
      takeProfit1: 4210.00,
      takeProfit2: 4260.00,
      takeProfit3: 4320.00,
      pips: 120.0,
      riskReward: '1:3.4',
      confluenceScore: 95,
      rationale: 'A+ Confluence: H1 Institutional Demand Block at 4152.00 + London sweep of Asian liquidity. Bullish expansion active toward 4210 TP1.',
      timeframe: 'H1',
      timestamp: 'Just Now',
      institutionalFlow: 'Bullish Demand Block Mitigation + Liquidity Sweep',
      isBestTradeNow: true,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'NY AM Killzone (13:30-16:00 GMT)',
      winProbability: 94,
      quality: 'A_PLUS',
      economicRisk: 'Safe Window (No Red Folder USD Events)',
      validityTimeLeft: 'Active (Running +120p)',
      validityExpiresAt: 'Targeting TP1 4210.00',
      invalidationTrigger: 'SL protected at 4132.00 below H4 Order Block',
      createdAtMs: Date.now(),
      takeProfit: 4210.00,
      checklist: [
        { title: 'H4 Trend Direction', isConfirmed: true, detail: 'Bullish market structure above 200 EMA' },
        { title: 'Institutional Demand Block', isConfirmed: true, detail: 'Tested unmitigated H4 Order Block at 4152.00' },
        { title: 'Fair Value Gap (FVG)', isConfirmed: true, detail: '15M Bullish FVG cleanly filled during London/NY overlap' },
        { title: 'Liquidity Pool Sweep', isConfirmed: true, detail: 'Asian low swept to grab retail stop losses' },
        { title: 'RSI Divergence', isConfirmed: true, detail: 'H1 Bullish Hidden Divergence at 42 level' },
        { title: 'Central Bank / Gold Demand', isConfirmed: true, detail: 'Global reserve accumulation & rate cut tailwind' }
      ]
    },
    {
      id: 'SIG-EUR-002',
      pair: PAIR_EURUSD,
      type: 'SELL_MARKET',
      status: 'RUNNING',
      entryPrice: 1.1220,
      currentPrice: 1.1205,
      stopLoss: 1.1255,
      takeProfit1: 1.1155,
      takeProfit2: 1.1110,
      takeProfit3: 1.1060,
      pips: 15.0,
      riskReward: '1:3.1',
      confluenceScore: 91,
      rationale: 'Market Execution (Bearish EUR Flow): Euro weakness across the board + Strong USD (8.6/10). H1 Bearish Order Block rejection at 1.1220 targeting 1.1155 liquidity pool.',
      timeframe: 'M15',
      timestamp: '12 min ago',
      institutionalFlow: 'Bearish Supply Block + USD Dominance',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London / NY Session',
      winProbability: 91,
      quality: 'A_PLUS',
      economicRisk: 'Aligned with USD Strength vs EUR Weakness',
      validityTimeLeft: 'Active (+15 pips)',
      validityExpiresAt: 'Targeting TP1 1.1155',
      invalidationTrigger: 'SL at 1.1255',
      createdAtMs: Date.now(),
      takeProfit: 1.1155,
      checklist: [
        { title: 'Currency Strength Alignment', isConfirmed: true, detail: 'Strong USD (8.6/10) vs Weak EUR — Bearish EUR/USD continuation' },
        { title: 'H1 Supply Rejection', isConfirmed: true, detail: 'Clean rejection from 1.1220 institutional supply block' }
      ]
    },
    {
      id: 'SIG-GBP-003',
      pair: PAIR_GBPUSD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 1.3205,
      currentPrice: 1.3225,
      stopLoss: 1.3165,
      takeProfit1: 1.3295,
      takeProfit2: 1.3365,
      takeProfit3: 1.3430,
      pips: 20.0,
      riskReward: '1:2.8',
      confluenceScore: 88,
      rationale: 'Market Execution (Instant Buy): Break of Structure (BOS) on H4 chart following UK inflation print. Retesting EMA 50 dynamic support.',
      timeframe: 'H4',
      timestamp: '45 min ago',
      institutionalFlow: 'H4 Bullish Structure Break',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London / NY Overlap',
      winProbability: 88,
      quality: 'A',
      economicRisk: 'UK CPI Cleared (Safe)',
      validityTimeLeft: 'Active Trade (+20p)',
      validityExpiresAt: 'In Progress (+20 pips)',
      invalidationTrigger: 'SL at 1.3165',
      createdAtMs: Date.now(),
      takeProfit: 1.3295,
      checklist: [
        { title: 'Break of Structure', isConfirmed: true, detail: 'Clean close above previous swing high' },
        { title: 'Dynamic EMA Support', isConfirmed: true, detail: '50 EMA acting as institutional launchpad' }
      ]
    },
    {
      id: 'SIG-JPY-004',
      pair: PAIR_USDJPY,
      type: 'BUY_LIMIT',
      status: 'PENDING',
      entryPrice: 157.10,
      currentPrice: 157.84,
      stopLoss: 156.40,
      takeProfit1: 158.40,
      takeProfit2: 159.20,
      takeProfit3: 160.00,
      pips: 0.0,
      riskReward: '1:3.4',
      confluenceScore: 93,
      rationale: 'Pending Buy Limit (Discount Demand Block): Extreme Currency Meter Confluence (USD 8.6/10 vs JPY 1.6/10). Retesting H1 demand zone at 157.10 before bullish continuation.',
      timeframe: 'H1',
      timestamp: '25 min ago',
      institutionalFlow: 'Discount Demand Accumulation',
      isBestTradeNow: false,
      isPending: true,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London / NY Session Window',
      winProbability: 93,
      quality: 'A_PLUS',
      economicRisk: 'High-Confluence Strength Alignment',
      validityTimeLeft: '3h 50m left to validate',
      validityExpiresAt: 'Expires at NY Window Close (21:00 GMT)',
      invalidationTrigger: 'Auto-cancels if price breaches 156.40 before 157.10 tap',
      validityDurationMs: 4 * 3600 * 1000,
      createdAtMs: Date.now(),
      takeProfit: 158.40,
      checklist: [
        { title: 'Currency Meter Confluence', isConfirmed: true, detail: 'USD 8.6/10 vs JPY 1.6/10 (+7.0 pt extreme divergence)' },
        { title: 'Demand Order Block', isConfirmed: true, detail: 'H1 Institutional buy imbalance resting at 157.10' }
      ]
    },
    {
      id: 'SIG-GJ-005',
      pair: PAIR_GBPJPY,
      type: 'BUY_STOP',
      status: 'RUNNING',
      entryPrice: 207.80,
      currentPrice: 208.25,
      stopLoss: 207.20,
      takeProfit1: 209.50,
      takeProfit2: 210.40,
      takeProfit3: 211.50,
      pips: 45.0,
      riskReward: '1:3.8',
      confluenceScore: 93,
      rationale: 'Buy Stop Momentum Execution: The Dragon explosive breakout above 207.80! H4 trendline retest with massive yen carry-trade momentum. Floating +45 pips profit.',
      timeframe: 'H4',
      timestamp: '1 hr ago',
      institutionalFlow: 'Cross-Currency Carry Flow Breakout',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Morning Momentum',
      winProbability: 93,
      quality: 'A_PLUS',
      economicRisk: 'Clear Sailing (Safe Carry Trend)',
      validityTimeLeft: 'Active (+45 pips)',
      validityExpiresAt: 'Targeting TP1 209.50',
      invalidationTrigger: 'Trailing SL moved to 207.70 lock in profit',
      createdAtMs: Date.now(),
      takeProfit: 209.50,
      checklist: [
        { title: 'Dragon Volatility Expansion', isConfirmed: true, detail: 'Average true range expanded above 140 pips' },
        { title: 'Carry Flow Bias', isConfirmed: true, detail: 'Interest rate differential heavily favors GBP' }
      ]
    },
    {
      id: 'SIG-AUD-006',
      pair: PAIR_AUDUSD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 0.6975,
      currentPrice: 0.6991,
      stopLoss: 0.6945,
      takeProfit1: 0.7045,
      takeProfit2: 0.7090,
      takeProfit3: 0.7140,
      pips: 16.0,
      riskReward: '1:2.8',
      confluenceScore: 88,
      rationale: 'Active Market Execution: Strong commodities bounce after 0.6975 liquidity sweep. Bullish continuation above M15 dynamic support.',
      timeframe: 'M15',
      timestamp: '25 min ago',
      institutionalFlow: 'Commodity Superflow Surge',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London / NY Overlap',
      winProbability: 88,
      quality: 'A',
      economicRisk: 'Safe Window (Commodity Rally)',
      validityTimeLeft: 'Active (+16 pips)',
      validityExpiresAt: 'Targeting TP1 0.7045',
      invalidationTrigger: 'SL at 0.6945',
      createdAtMs: Date.now(),
      takeProfit: 0.7045,
      checklist: [
        { title: 'Commodity Demand Index', isConfirmed: true, detail: 'WTI & Copper rally supporting Australian Dollar' },
        { title: 'M15 Trend Continuation', isConfirmed: true, detail: 'Clean stair-stepping higher highs above 50 EMA' }
      ]
    },
    {
      id: 'SIG-EC-007',
      pair: PAIR_EURCAD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 1.6005,
      currentPrice: 1.6025,
      stopLoss: 1.5965,
      takeProfit1: 1.6095,
      takeProfit2: 1.6155,
      takeProfit3: 1.6220,
      pips: 20.0,
      riskReward: '1:3.0',
      confluenceScore: 88,
      rationale: 'Micro-Friendly 0.01 Setup (EUR > CAD): EUR/CAD H1 Range Breakout above 1.6005. Euro (6.7/10) outperforming weak Canadian Dollar (5.2/10) with tight 40-pip risk. Note: GBP/CAD BUY is the stronger primary setup since GBP (7.7) > EUR (6.7).',
      timeframe: 'H1',
      timestamp: '30 min ago',
      institutionalFlow: 'H1 Range Expansion + Order Block Support',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London / NY Session',
      winProbability: 88,
      quality: 'A',
      economicRisk: 'Safe Window (Low Margin ~$2.20)',
      validityTimeLeft: 'Active (+20 pips)',
      validityExpiresAt: 'Targeting TP1 1.6095',
      invalidationTrigger: 'SL at 1.5965',
      createdAtMs: Date.now(),
      takeProfit: 1.6095,
      checklist: [
        { title: 'Micro-Lot Account Friendly', isConfirmed: true, detail: 'Margin needed: ~$2.20 | 1 pip = $0.08' },
        { title: 'Triangulation Note', isConfirmed: true, detail: 'GBP (7.7) > EUR (6.7) > CAD (5.2) — Avoid double-shorting CAD if already in GBP/CAD' }
      ]
    },
    {
      id: 'SIG-CAD-008',
      pair: PAIR_USDCAD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 1.4225,
      currentPrice: 1.4248,
      stopLoss: 1.4185,
      takeProfit1: 1.4310,
      takeProfit2: 1.4365,
      takeProfit3: 1.4420,
      pips: 23.0,
      riskReward: '1:2.8',
      confluenceScore: 91,
      rationale: 'Market Execution (Instant Buy): Strong USD (8.6/10) vs Weak CAD (5.2/10). H1 Bullish Order Block bounce at 1.4225 targeting 1.4310 liquidity.',
      timeframe: 'H1',
      timestamp: '45 min ago',
      institutionalFlow: 'H1 Demand Block + USD Strength',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'NY Session Flow',
      winProbability: 91,
      quality: 'A_PLUS',
      economicRisk: 'Aligned with Currency Strength (+3.4 diff)',
      validityTimeLeft: 'Active (+23 pips)',
      validityExpiresAt: 'Targeting TP1 1.4310',
      invalidationTrigger: 'SL at 1.4185',
      createdAtMs: Date.now(),
      takeProfit: 1.4310,
      checklist: [
        { title: 'Micro-Lot Margin', isConfirmed: true, detail: 'Margin needed: ~$2.00 | 1 pip = $0.08' },
        { title: 'Currency Meter Alignment', isConfirmed: true, detail: 'USD (8.6) vs CAD (5.2) — Strong Bullish Continuation' }
      ]
    },
    {
      id: 'SIG-CJ-009',
      pair: PAIR_CADJPY,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 110.20,
      currentPrice: 110.65,
      stopLoss: 109.80,
      takeProfit1: 111.40,
      takeProfit2: 112.20,
      takeProfit3: 113.00,
      pips: 45.0,
      riskReward: '1:3.0',
      confluenceScore: 91,
      rationale: '0.01 Micro-Lot Cross: CAD/JPY carry breakout! Bouncing off H4 demand zone at 110.20. Minimum margin ~$1.50 with clean $0.09/pip scaling.',
      timeframe: 'H4',
      timestamp: '45 min ago',
      institutionalFlow: 'Cross-Currency Carry Flow',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Tokyo / London Overlap',
      winProbability: 91,
      quality: 'A_PLUS',
      economicRisk: 'High Confluence (Safe Micro Trade)',
      validityTimeLeft: 'Active (+45 pips)',
      validityExpiresAt: 'Targeting TP1 111.40',
      invalidationTrigger: 'SL at 109.80',
      createdAtMs: Date.now(),
      takeProfit: 111.40,
      checklist: [
        { title: 'Micro Margin Requirement', isConfirmed: true, detail: 'Margin needed: ~$1.50 | 1 pip = $0.09' },
        { title: 'Demand Zone Retest', isConfirmed: true, detail: 'H4 Bullish Order Block mitigation at 110.20' }
      ]
    },
    {
      id: 'SIG-EA-010',
      pair: PAIR_EURAUD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 1.6140,
      currentPrice: 1.6164,
      stopLoss: 1.6100,
      takeProfit1: 1.6230,
      takeProfit2: 1.6290,
      takeProfit3: 1.6360,
      pips: 24.0,
      riskReward: '1:3.2',
      confluenceScore: 89,
      rationale: 'Micro-Lot Momentum: EUR/AUD bounce off 1.6140 demand block. European capital inflow outperforming AUD with tight $3.00 max risk on 0.01 lot.',
      timeframe: 'M15',
      timestamp: '50 min ago',
      institutionalFlow: 'European Morning Momentum Surge',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Open Killzone',
      winProbability: 89,
      quality: 'A',
      economicRisk: 'Safe Micro Lot Structure',
      validityTimeLeft: 'Active (+24 pips)',
      validityExpiresAt: 'Targeting TP1 1.6230',
      invalidationTrigger: 'SL at 1.6100',
      createdAtMs: Date.now(),
      takeProfit: 1.6230,
      checklist: [
        { title: 'Micro Account Margin', isConfirmed: true, detail: 'Margin needed: ~$2.20 | 1 pip = $0.07' },
        { title: 'M15 Trend Continuation', isConfirmed: true, detail: 'Clean stair-stepping higher highs above 50 EMA' }
      ]
    },
    {
      id: 'SIG-EG-011',
      pair: PAIR_EURGBP,
      type: 'SELL_MARKET',
      status: 'RUNNING',
      entryPrice: 0.8512,
      currentPrice: 0.8497,
      stopLoss: 0.8545,
      takeProfit1: 0.8450,
      takeProfit2: 0.8415,
      takeProfit3: 0.8380,
      pips: 15.0,
      riskReward: '1:2.9',
      confluenceScore: 89,
      rationale: 'Minor Cross Flow (Bullish GBP / Bearish EUR): EUR/GBP rejecting Daily Bearish Order Block at 0.8512 as GBP strength overpowers Euro. Aligns with GBP/CAD BUY (both are Long GBP).',
      timeframe: 'H1',
      timestamp: '1 hr ago',
      institutionalFlow: 'Cross-Currency Supply Zone Rejection',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Mid-Day Flow',
      winProbability: 89,
      quality: 'A',
      economicRisk: 'BOE & ECB Clear (Safe)',
      validityTimeLeft: 'Active (+15 pips)',
      validityExpiresAt: 'Targeting TP1 0.8450',
      invalidationTrigger: 'SL at 0.8545',
      createdAtMs: Date.now(),
      takeProfit: 0.8450,
      checklist: [
        { title: 'Micro Margin', isConfirmed: true, detail: 'Margin needed: ~$2.20 | 1 pip = $0.13' },
        { title: 'GBP Cross Consistency', isConfirmed: true, detail: 'SELL EUR/GBP = Long GBP (matches BUY GBP/CAD & BUY GBP/JPY)' }
      ]
    },
    {
      id: 'SIG-AJ-012',
      pair: PAIR_AUDJPY,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 109.30,
      currentPrice: 109.80,
      stopLoss: 108.70,
      takeProfit1: 110.50,
      takeProfit2: 111.20,
      takeProfit3: 112.00,
      pips: 50.0,
      riskReward: '1:3.2',
      confluenceScore: 92,
      rationale: 'Aussie / Yen Cross Breakout: Clean H4 Break of Structure (BOS) above 109.30 resistance. Strong carry-trade bidding on extreme JPY weakness.',
      timeframe: 'H4',
      timestamp: '40 min ago',
      institutionalFlow: 'H4 Carry Trade Expansion + BOS',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Tokyo / London Overlap',
      winProbability: 92,
      quality: 'A_PLUS',
      economicRisk: 'RBA Hawkish Bias (Safe)',
      validityTimeLeft: 'Active (+50 pips)',
      validityExpiresAt: 'Targeting TP1 110.50',
      invalidationTrigger: 'SL at 108.70',
      createdAtMs: Date.now(),
      takeProfit: 110.50,
      checklist: [
        { title: 'Break of Structure (BOS)', isConfirmed: true, detail: '4H candle close above previous swing high' },
        { title: 'Carry-Trade Confluence', isConfirmed: true, detail: 'AUD strength vs JPY weakness' }
      ]
    },
    {
      id: 'SIG-GA-013',
      pair: PAIR_GBPAUD,
      type: 'BUY_LIMIT',
      status: 'PENDING',
      entryPrice: 1.8990,
      currentPrice: 1.9055,
      stopLoss: 1.8920,
      takeProfit1: 1.9160,
      takeProfit2: 1.9280,
      takeProfit3: 1.9400,
      pips: 0.0,
      riskReward: '1:3.4',
      confluenceScore: 90,
      rationale: 'Pending Buy Limit: Retesting 1.8990 Discount Demand Block & 61.8% Fibonacci level. Anticipating sharp upward expansion toward 1.9160.',
      timeframe: 'H1',
      timestamp: '20 min ago',
      institutionalFlow: 'Discount Demand Mitigation',
      isBestTradeNow: false,
      isPending: true,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Session Killzone',
      winProbability: 90,
      quality: 'A_PLUS',
      economicRisk: 'Low Impact Window',
      validityTimeLeft: '2h 45m left to validate',
      validityExpiresAt: 'Expires at London Mid-Day (14:00 GMT)',
      invalidationTrigger: 'Auto-cancels if price breaches 1.8920 before fill',
      validityDurationMs: 3 * 3600 * 1000,
      createdAtMs: Date.now(),
      takeProfit: 1.9160,
      checklist: [
        { title: 'Discount Demand Block', isConfirmed: true, detail: 'Tested unmitigated H1 Order Block at 1.8990' },
        { title: 'Fibonacci Confluence', isConfirmed: true, detail: 'Golden pocket 61.8% reaction level' }
      ]
    },
    {
      id: 'SIG-SILVER-014',
      pair: PAIR_XAGUSD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 32.10,
      currentPrice: 32.40,
      stopLoss: 31.70,
      takeProfit1: 33.20,
      takeProfit2: 34.00,
      takeProfit3: 35.00,
      pips: 30.0,
      riskReward: '1:3.5',
      confluenceScore: 91,
      rationale: 'Silver (XAG/USD) Precious Metals Surge: Silver broke above $32.10 multi-week resistance following Gold record highs with heavy industrial demand.',
      timeframe: 'H4',
      timestamp: '1 hr ago',
      institutionalFlow: 'Precious Metals Sympathy Rally',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'NY AM Session Window',
      winProbability: 91,
      quality: 'A_PLUS',
      economicRisk: 'Commodity Supercycle Momentum',
      validityTimeLeft: 'Active (+30 pts)',
      validityExpiresAt: 'Targeting TP1 $33.20',
      invalidationTrigger: 'SL at 31.70',
      createdAtMs: Date.now(),
      takeProfit: 33.20,
      checklist: [
        { title: 'Multi-Week Resistance Flip', isConfirmed: true, detail: 'Clean breakout and retest above $32.10' },
        { title: 'Gold/Silver Ratio Support', isConfirmed: true, detail: 'Precious metals institutional flow accelerating' }
      ]
    },
    {
      id: 'SIG-EJ-015',
      pair: PAIR_EURJPY,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 177.80,
      currentPrice: 178.24,
      stopLoss: 177.30,
      takeProfit1: 178.90,
      takeProfit2: 179.60,
      takeProfit3: 180.50,
      pips: 44.0,
      riskReward: '1:3.4',
      confluenceScore: 92,
      rationale: '0.01 Micro-Lot Cross: EUR/JPY carry trade expansion! Retested H1 Dynamic 50 EMA at 177.80. Low margin (~$2.20) with high liquidity.',
      timeframe: 'H1',
      timestamp: '25 min ago',
      institutionalFlow: 'H1 Dynamic EMA Support + Carry Bids',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Session Killzone',
      winProbability: 92,
      quality: 'A_PLUS',
      economicRisk: 'Safe Micro Lot Trade',
      validityTimeLeft: 'Active (+44 pips)',
      validityExpiresAt: 'Targeting TP1 178.90',
      invalidationTrigger: 'SL at 177.30',
      createdAtMs: Date.now(),
      takeProfit: 178.90,
      checklist: [
        { title: 'Micro Margin Requirement', isConfirmed: true, detail: 'Margin needed: ~$2.20 | 1 pip = $0.09' },
        { title: 'Dynamic EMA Support', isConfirmed: true, detail: 'Clean bounce off 50 EMA on 1-hour chart' }
      ]
    },
    {
      id: 'SIG-NZD-016',
      pair: PAIR_NZDUSD,
      type: 'BUY_LIMIT',
      status: 'PENDING',
      entryPrice: 0.5630,
      currentPrice: 0.5653,
      stopLoss: 0.5600,
      takeProfit1: 0.5700,
      takeProfit2: 0.5750,
      takeProfit3: 0.5820,
      pips: 0.0,
      riskReward: '1:3.3',
      confluenceScore: 90,
      rationale: 'Ultra-Low Margin 0.01 Setup: NZD/USD Discount Demand Zone at 0.5630. Lowest margin required (~$1.15) with tight $3.00 stop loss risk.',
      timeframe: 'M15',
      timestamp: '35 min ago',
      institutionalFlow: 'Discount Demand Mitigation',
      isBestTradeNow: false,
      isPending: true,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Asian / London Handover',
      winProbability: 90,
      quality: 'A_PLUS',
      economicRisk: 'Lowest Margin Forex Major (~$1.15)',
      validityTimeLeft: '3h 10m left to validate',
      validityExpiresAt: 'Expires at NY Window (18:00 GMT)',
      invalidationTrigger: 'Auto-cancels if price sweeps 0.5600 before fill',
      validityDurationMs: 4 * 3600 * 1000,
      createdAtMs: Date.now(),
      takeProfit: 0.5700,
      checklist: [
        { title: 'Micro Margin Requirement', isConfirmed: true, detail: 'Margin needed: ~$1.15 | 1 pip = $0.10' },
        { title: 'Discount FVG Mitigation', isConfirmed: true, detail: '15M Fair Value Gap retest at 0.5630' }
      ]
    }
  ];

  return rawSignals.map(sig => {
    const duration = getEffectiveDurationMs(sig.timeframe);
    const persisted = PersistenceManager.getOrAnchorCreatedAt(sig.id, duration);
    return {
      ...sig,
      createdAtMs: persisted,
      isFavorite: favorites.includes(sig.id),
      hasAlert: alertToggled.includes(sig.id)
    };
  });
}

export function generateCandles(pair: ForexPair, timeframe: Timeframe, count: number = 120): CandleStick[] {
  const targetPrice = pair.currentPrice > 0 ? pair.currentPrice : pair.basePrice;
  const isGoldOrCrypto = Boolean(pair.isGoldOrCrypto || pair.symbol === 'XAU/USD' || pair.symbol.includes('BTC') || pair.symbol.includes('US30') || pair.symbol.includes('NAS100'));

  // Exact Deriv Granularity in milliseconds: M5=300s, M15=900s, H1=3600s, H4=14400s, D1=86400s
  let intervalMs = 3600 * 1000;
  let volatility = targetPrice * 0.0022;
  let cyclePeriod = 16;
  let baseVol = 12000;

  if (timeframe === 'M5') {
    intervalMs = 300 * 1000; // 5 min = 300 seconds
    volatility = isGoldOrCrypto ? targetPrice * 0.00065 : targetPrice * 0.00035; // 3-5 pips per 5m bar
    cyclePeriod = 8;
    baseVol = 2200;
  } else if (timeframe === 'M15') {
    intervalMs = 900 * 1000; // 15 min = 900 seconds
    volatility = isGoldOrCrypto ? targetPrice * 0.0014 : targetPrice * 0.00085; // 8-12 pips per 15m bar
    cyclePeriod = 12;
    baseVol = 5400;
  } else if (timeframe === 'H1') {
    intervalMs = 3600 * 1000; // 1 hour = 3600 seconds
    volatility = isGoldOrCrypto ? targetPrice * 0.0042 : targetPrice * 0.0024; // 25-30 pips per 1h bar
    cyclePeriod = 18;
    baseVol = 15000;
  } else if (timeframe === 'H4') {
    intervalMs = 14400 * 1000; // 4 hours = 14400 seconds
    volatility = isGoldOrCrypto ? targetPrice * 0.0095 : targetPrice * 0.0055; // 60-80 pips per 4h bar
    cyclePeriod = 24;
    baseVol = 42000;
  } else if (timeframe === 'D1') {
    intervalMs = 86400 * 1000; // 1 day = 86400 seconds
    volatility = isGoldOrCrypto ? targetPrice * 0.0220 : targetPrice * 0.0135; // 140-180 pips per daily bar
    cyclePeriod = 30;
    baseVol = 110000;
  }

  // Anchor to exact period boundaries
  const now = Date.now();
  const currentPeriodStart = now - (now % intervalMs);

  // Timeframe and pair specific seed so each timeframe's chart looks completely different
  const tfSalt: Record<Timeframe, number> = {
    M5: 23471,
    M15: 89681,
    H1: 345893,
    H4: 765431,
    D1: 9876541
  };

  let seed = tfSalt[timeframe] || 12345;
  for (let c = 0; c < pair.symbol.length; c++) {
    seed = (seed * 37 + pair.symbol.charCodeAt(c) * 101) & 0x7fffffff;
  }

  const pseudoRand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const reversedCandles: CandleStick[] = [];
  let nextClose = targetPrice;

  for (let i = 0; i < count; i++) {
    const t = currentPeriodStart - (i * intervalMs);
    const close = nextClose;

    // Distinct wave trajectory per timeframe
    const wave = Math.sin((i / cyclePeriod) * Math.PI) * (volatility * 0.65);
    const randComponent = (pseudoRand() - 0.5) * 2.0;
    const bodyFraction = 0.28 + pseudoRand() * 0.52;

    const direction = (randComponent + (wave > 0 ? 0.35 : -0.35)) >= 0 ? 1.0 : -1.0;
    const change = direction * (volatility * bodyFraction);
    const open = close - change;

    const wickTop = pseudoRand() * (volatility * 0.38);
    const wickBottom = pseudoRand() * (volatility * 0.38);
    const high = Math.max(open, close) + wickTop;
    const low = Math.min(open, close) - wickBottom;

    const vol = baseVol * (0.6 + pseudoRand() * 0.8 + (Math.abs(change) / volatility) * 0.4);

    reversedCandles.push({
      timestamp: t,
      open,
      high,
      low,
      close,
      volume: Math.round(vol)
    });

    nextClose = open;
  }

  const candles = reversedCandles.reverse();

  // Enforce the rightmost candle is the live forming candle matching targetPrice exactly
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    const liveWick = volatility * 0.15;
    candles[candles.length - 1] = {
      ...last,
      timestamp: currentPeriodStart,
      close: targetPrice,
      high: Math.max(last.open, targetPrice) + liveWick,
      low: Math.min(last.open, targetPrice) - liveWick
    };
  }

  return candles;
}

export function getEconomicEvents(): EconomicEvent[] {
  return economicCalendarService.getAllEvents();
}

export function getCurrencyStrengths(): CurrencyStrength[] {
  return [
    { currency: 'USD', score: 88, change24h: '+0.45%', trend: 'Strong Bullish' },
    { currency: 'EUR', score: 62, change24h: '+0.12%', trend: 'Neutral / Range' },
    { currency: 'GBP', score: 74, change24h: '+0.31%', trend: 'Moderate Bullish' },
    { currency: 'JPY', score: 35, change24h: '-0.68%', trend: 'Heavy Bearish' },
    { currency: 'AUD', score: 58, change24h: '+0.05%', trend: 'Consolidating' },
    { currency: 'CAD', score: 65, change24h: '+0.20%', trend: 'Bullish Oil Sync' },
    { currency: 'CHF', score: 48, change24h: '-0.15%', trend: 'Mild Weakness' }
  ];
}

export function getSmartMoneyZones(): SmartMoneyZone[] {
  return [
    { id: 'SMZ-1', pairSymbol: 'XAU/USD', type: 'ORDER_BLOCK', highPrice: 4358.50, lowPrice: 4354.00, timeframe: 'H4', isMitigated: false, strengthStars: 5, description: 'Unmitigated H4 Institutional Demand Zone' },
    { id: 'SMZ-2', pairSymbol: 'XAU/USD', type: 'FAIR_VALUE_GAP', highPrice: 4365.00, lowPrice: 4361.50, timeframe: 'M15', isMitigated: true, strengthStars: 4, description: 'M15 Bullish FVG filled during London/NY overlap' },
    { id: 'SMZ-3', pairSymbol: 'EUR/USD', type: 'LIQUIDITY_SWEEP', highPrice: 1.1450, lowPrice: 1.1440, timeframe: 'H1', isMitigated: false, strengthStars: 5, description: 'Asian session low buy-side liquidity pool sweep' },
    { id: 'SMZ-4', pairSymbol: 'GBP/USD', type: 'BREAK_OF_STRUCTURE', highPrice: 1.3340, lowPrice: 1.3330, timeframe: 'H4', isMitigated: true, strengthStars: 4, description: 'H4 Bullish Structure Break confirming continuation' },
    { id: 'SMZ-5', pairSymbol: 'USD/JPY', type: 'CHANGE_OF_CHARACTER', highPrice: 157.80, lowPrice: 157.60, timeframe: 'H1', isMitigated: false, strengthStars: 5, description: 'Bearish CHoCH on H1 signalling reversal from high' },
    { id: 'SMZ-6', pairSymbol: 'US30', type: 'ORDER_BLOCK', highPrice: 43100.0, lowPrice: 43050.0, timeframe: 'M15', isMitigated: true, strengthStars: 5, description: 'M15 Institutional Buy Zone prior to NY open rally' }
  ];
}
