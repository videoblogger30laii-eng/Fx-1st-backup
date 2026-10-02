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

export const PAIR_XAUUSD: ForexPair = { symbol: 'XAU/USD', name: 'Gold / US Dollar', basePrice: 4188.80, currentPrice: 4188.80, pipDigits: 2, isGoldOrCrypto: true, spreadPips: 1.2 };
export const PAIR_EURUSD: ForexPair = { symbol: 'EUR/USD', name: 'Euro / US Dollar', basePrice: 1.1360, currentPrice: 1.1360, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_GBPUSD: ForexPair = { symbol: 'GBP/USD', name: 'British Pound / USD', basePrice: 1.3284, currentPrice: 1.3284, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_USDJPY: ForexPair = { symbol: 'USD/JPY', name: 'US Dollar / Yen', basePrice: 156.90, currentPrice: 156.90, pipDigits: 2, spreadPips: 0.2 };
export const PAIR_USDCHF: ForexPair = { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', basePrice: 0.8333, currentPrice: 0.8333, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_AUDUSD: ForexPair = { symbol: 'AUD/USD', name: 'Aussie / USD', basePrice: 0.6971, currentPrice: 0.6971, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_NZDUSD: ForexPair = { symbol: 'NZD/USD', name: 'Kiwi / USD', basePrice: 0.5653, currentPrice: 0.5653, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_USDCAD: ForexPair = { symbol: 'USD/CAD', name: 'US Dollar / CAD', basePrice: 1.4181, currentPrice: 1.4181, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_EURGBP: ForexPair = { symbol: 'EUR/GBP', name: 'Euro / British Pound', basePrice: 0.8552, currentPrice: 0.8552, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_EURJPY: ForexPair = { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', basePrice: 178.24, currentPrice: 178.24, pipDigits: 2, spreadPips: 0.2 };
export const PAIR_GBPJPY: ForexPair = { symbol: 'GBP/JPY', name: 'Pound / Yen (The Dragon)', basePrice: 208.42, currentPrice: 208.42, pipDigits: 2, spreadPips: 0.2 };
export const PAIR_US30: ForexPair = { symbol: 'US30', name: 'Wall Street 30 Index', basePrice: 51465.0, currentPrice: 51465.0, pipDigits: 1, isGoldOrCrypto: true, spreadPips: 1.5 };
export const PAIR_NAS100: ForexPair = { symbol: 'NAS100', name: 'US Tech 100 Index', basePrice: 30275.0, currentPrice: 30275.0, pipDigits: 1, isGoldOrCrypto: true, spreadPips: 1.0 };
export const PAIR_BTCUSD: ForexPair = { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', basePrice: 84290.0, currentPrice: 84290.0, pipDigits: 2, isGoldOrCrypto: true, spreadPips: 8.0 };

export const ALL_PAIRS: ForexPair[] = [
  PAIR_XAUUSD,
  PAIR_EURUSD,
  PAIR_GBPUSD,
  PAIR_USDJPY,
  PAIR_USDCHF,
  PAIR_AUDUSD,
  PAIR_NZDUSD,
  PAIR_USDCAD,
  PAIR_EURGBP,
  PAIR_EURJPY,
  PAIR_GBPJPY,
  PAIR_BTCUSD,
  PAIR_US30,
  PAIR_NAS100
];

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

  return true;
}

export function isSignalExpiredOrInvalid(signal: ForexSignal, now: number = Date.now()): boolean {
  return !isSignalValidAndActive(signal, now);
}

export function updateSignalWithLiveMarket(signal: ForexSignal, livePrice: number): ForexSignal {
  if (livePrice <= 0) return signal;

  const updatedPair: ForexPair = { ...signal.pair, currentPrice: livePrice };
  const finalEntry = signal.entryPrice;
  const finalStopLoss = signal.stopLoss;
  const finalTp1 = signal.takeProfit1;
  const isBuy = signal.type.startsWith('BUY');

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
      type: 'BUY_LIMIT',
      status: 'PENDING',
      entryPrice: 1.1325,
      currentPrice: 1.1343,
      stopLoss: 1.1290,
      takeProfit1: 1.1410,
      takeProfit2: 1.1465,
      takeProfit3: 1.1520,
      pips: 0.0,
      riskReward: '1:3.4',
      confluenceScore: 91,
      rationale: 'Pending Buy Limit: Institutional Discount zone retest at 1.1325 after London low sweep. Limit order resting awaiting mitigation.',
      timeframe: 'M15',
      timestamp: '12 min ago',
      institutionalFlow: 'Discount FVG + Daily Demand Block',
      isBestTradeNow: false,
      isPending: true,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Open Killzone (07:00-10:00 GMT)',
      winProbability: 91,
      quality: 'A_PLUS',
      economicRisk: 'Low Impact Window (Safe)',
      validityTimeLeft: '48m left to validate',
      validityExpiresAt: 'Expires at London Open Close (10:00 GMT)',
      invalidationTrigger: 'Auto-cancels if price sweeps 1.1285 before fill',
      validityDurationMs: 60 * 60 * 1000,
      createdAtMs: Date.now(),
      takeProfit: 1.1410,
      checklist: [
        { title: 'Discount Entry Zone', isConfirmed: true, detail: 'Retesting 61.8% Fibonacci discount level at 1.1325' },
        { title: 'London Low Sweep', isConfirmed: true, detail: 'Retail stop-loss pool engineered and cleared' },
        { title: 'Pending Trigger Status', isConfirmed: true, detail: 'Limit order resting at 1.1325 pending tap' }
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
      type: 'SELL_LIMIT',
      status: 'PENDING',
      entryPrice: 157.90,
      currentPrice: 157.45,
      stopLoss: 158.40,
      takeProfit1: 156.60,
      takeProfit2: 155.80,
      takeProfit3: 155.00,
      pips: 0.0,
      riskReward: '1:3.2',
      confluenceScore: 89,
      rationale: 'Pending Sell Limit: Premium Bearish Supply at 157.90. BOJ verbal intervention pressure creates strong ceiling.',
      timeframe: 'H1',
      timestamp: '1 hr ago',
      institutionalFlow: 'Premium Supply Rejection',
      isBestTradeNow: false,
      isPending: true,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Tokyo Session Invalidation Zone',
      winProbability: 89,
      quality: 'A',
      economicRisk: 'BOJ Intervention Watch',
      validityTimeLeft: '3h 50m left to validate',
      validityExpiresAt: 'Expires at BOJ Window Close (18:00 GMT)',
      invalidationTrigger: 'Auto-cancels if price breaches 158.40 before 157.90 tap',
      validityDurationMs: 4 * 3600 * 1000,
      createdAtMs: Date.now(),
      takeProfit: 156.60,
      checklist: [
        { title: 'Supply Order Block', isConfirmed: true, detail: 'H1 Institutional sell imbalance at 157.90' },
        { title: 'BOJ Verbal Defense', isConfirmed: true, detail: 'Government intervention barrier' }
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
      id: 'SIG-US30-007',
      pair: PAIR_US30,
      type: 'BUY_STOP',
      status: 'RUNNING',
      entryPrice: 51320.0,
      currentPrice: 51465.0,
      stopLoss: 51150.0,
      takeProfit1: 51750.0,
      takeProfit2: 52100.0,
      takeProfit3: 52450.0,
      pips: 145.0,
      riskReward: '1:3.8',
      confluenceScore: 92,
      rationale: 'Buy Stop Opening Range: Wall Street Open Liquidity Sweep! Dow Jones swept previous day low and printed massive bullish engulfing pin bar above 51320.',
      timeframe: 'M15',
      timestamp: '30 min ago',
      institutionalFlow: 'Index Opening Range Breakout',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Wall Street Open (09:30 EST)',
      winProbability: 92,
      quality: 'A_PLUS',
      economicRisk: 'High Volume Window',
      validityTimeLeft: 'Active (+145 pts)',
      validityExpiresAt: 'Targeting TP1 51750',
      invalidationTrigger: 'SL at 51150',
      createdAtMs: Date.now(),
      takeProfit: 51750.0,
      checklist: [
        { title: 'NY Opening Range', isConfirmed: true, detail: 'High volume reaction at 09:30 EST' },
        { title: 'Previous Day Low Sweep', isConfirmed: true, detail: 'Fake breakdown reversed into strong trend' }
      ]
    },
    {
      id: 'SIG-CAD-008',
      pair: PAIR_USDCAD,
      type: 'SELL_MARKET',
      status: 'RUNNING',
      entryPrice: 1.4195,
      currentPrice: 1.4183,
      stopLoss: 1.4235,
      takeProfit1: 1.4120,
      takeProfit2: 1.4060,
      takeProfit3: 1.3980,
      pips: 12.0,
      riskReward: '1:2.8',
      confluenceScore: 87,
      rationale: 'Market Execution (Instant Sell): Rejection from 1.4200 session supply block. Double Top formation with bearish MACD divergence on H1.',
      timeframe: 'H1',
      timestamp: '2 hrs ago',
      institutionalFlow: 'Double Top + Bearish Divergence',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'NY Afternoon Settlement',
      winProbability: 87,
      quality: 'A',
      economicRisk: 'Crude Oil Inventory Aligned',
      validityTimeLeft: 'Active (+12 pips)',
      validityExpiresAt: 'Targeting TP1 1.4120',
      invalidationTrigger: 'SL at 1.4235',
      createdAtMs: Date.now(),
      takeProfit: 1.4120,
      checklist: [
        { title: 'Crude Oil Alignment', isConfirmed: true, detail: 'WTI Crude rally strengthening CAD' },
        { title: 'H1 Bearish Divergence', isConfirmed: true, detail: 'RSI/MACD lower high on retest of 1.4200' }
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
  return [
    { id: 'ECO-1', currency: 'USD', title: 'Core CPI (MoM)', time: '13:30 GMT', impact: 'HIGH', actual: '0.3%', forecast: '0.2%', previous: '0.2%', bias: 'Bullish USD if > 0.3%' },
    { id: 'ECO-2', currency: 'USD', title: 'Non-Farm Payrolls (NFP)', time: 'Tomorrow', impact: 'HIGH', actual: '---', forecast: '165K', previous: '142K', bias: 'High Volatility Warning' },
    { id: 'ECO-3', currency: 'EUR', title: 'ECB President Lagarde Speech', time: '15:00 GMT', impact: 'MEDIUM', actual: '---', forecast: '---', previous: '---', bias: 'Hawkish tone expected' },
    { id: 'ECO-4', currency: 'GBP', title: 'GDP (MoM)', time: '07:00 GMT', impact: 'HIGH', actual: '0.2%', forecast: '0.0%', previous: '-0.1%', bias: 'Bullish for GBP/USD' },
    { id: 'ECO-5', currency: 'JPY', title: 'BOJ Policy Rate', time: 'Friday', impact: 'HIGH', actual: '---', forecast: '0.25%', previous: '0.25%', bias: 'Potential rate hike speculation' }
  ];
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
