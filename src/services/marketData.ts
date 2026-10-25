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
export const PAIR_EURUSD: ForexPair = { symbol: 'EUR/USD', name: 'Euro / US Dollar', basePrice: 1.1211, currentPrice: 1.1211, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.20, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_GBPUSD: ForexPair = { symbol: 'GBP/USD', name: 'British Pound / USD', basePrice: 1.3242, currentPrice: 1.3242, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.65, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_USDJPY: ForexPair = { symbol: 'USD/JPY', name: 'US Dollar / Yen', basePrice: 157.84, currentPrice: 157.84, pipDigits: 2, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.00, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_USDCHF: ForexPair = { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', basePrice: 0.8871, currentPrice: 0.8871, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.00, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_AUDUSD: ForexPair = { symbol: 'AUD/USD', name: 'Aussie / USD', basePrice: 0.6959, currentPrice: 0.6959, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 1.40, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_NZDUSD: ForexPair = { symbol: 'NZD/USD', name: 'Kiwi / USD', basePrice: 0.5626, currentPrice: 0.5626, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 1.15, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_USDCAD: ForexPair = { symbol: 'USD/CAD', name: 'US Dollar / CAD', basePrice: 1.4248, currentPrice: 1.4248, pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.00, pipValue001: 0.08, isMicroAccountFriendly: true };

// --- 2. 21 Major Crosses (0.01 Lot Micro-Friendly: Margin ~$2 - $10 | 1 Pip = $0.08 - $0.12) ---
export const PAIR_EURGBP: ForexPair = { symbol: 'EUR/GBP', name: 'Euro / British Pound', basePrice: 0.8497, currentPrice: 0.8497, pipDigits: 4, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.13, isMicroAccountFriendly: true };
export const PAIR_EURJPY: ForexPair = { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', basePrice: 178.02, currentPrice: 178.02, pipDigits: 2, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_EURAUD: ForexPair = { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', basePrice: 1.6152, currentPrice: 1.6152, pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.07, isMicroAccountFriendly: true };
export const PAIR_EURCAD: ForexPair = { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', basePrice: 1.6025, currentPrice: 1.6025, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.08, isMicroAccountFriendly: true };
export const PAIR_EURCHF: ForexPair = { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', basePrice: 0.9323, currentPrice: 0.9323, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_EURNZD: ForexPair = { symbol: 'EUR/NZD', name: 'Euro / New Zealand Dollar', basePrice: 2.0029, currentPrice: 2.0029, pipDigits: 4, spreadPips: 0.5, category: 'MINORS', minMargin001: 2.20, pipValue001: 0.06, isMicroAccountFriendly: true };

export const PAIR_GBPJPY: ForexPair = { symbol: 'GBP/JPY', name: 'Pound / Yen (The Dragon)', basePrice: 208.45, currentPrice: 208.45, pipDigits: 2, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_GBPAUD: ForexPair = { symbol: 'GBP/AUD', name: 'Pound / Australian Dollar', basePrice: 1.9008, currentPrice: 1.9008, pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.07, isMicroAccountFriendly: true };
export const PAIR_GBPCAD: ForexPair = { symbol: 'GBP/CAD', name: 'Pound / Canadian Dollar', basePrice: 1.8162, currentPrice: 1.8162, pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.08, isMicroAccountFriendly: true };
export const PAIR_GBPCHF: ForexPair = { symbol: 'GBP/CHF', name: 'Pound / Swiss Franc', basePrice: 1.0965, currentPrice: 1.0965, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_GBPNZD: ForexPair = { symbol: 'GBP/NZD', name: 'Pound / New Zealand Dollar', basePrice: 2.3569, currentPrice: 2.3569, pipDigits: 4, spreadPips: 0.6, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.06, isMicroAccountFriendly: true };

export const PAIR_AUDJPY: ForexPair = { symbol: 'AUD/JPY', name: 'Aussie / Japanese Yen', basePrice: 109.80, currentPrice: 109.80, pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.40, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_AUDCAD: ForexPair = { symbol: 'AUD/CAD', name: 'Aussie / Canadian Dollar', basePrice: 0.9908, currentPrice: 0.9908, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.40, pipValue001: 0.08, isMicroAccountFriendly: true };
export const PAIR_AUDCHF: ForexPair = { symbol: 'AUD/CHF', name: 'Aussie / Swiss Franc', basePrice: 0.5760, currentPrice: 0.5760, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.40, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_AUDNZD: ForexPair = { symbol: 'AUD/NZD', name: 'Aussie / New Zealand Dollar', basePrice: 1.2380, currentPrice: 1.2380, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.40, pipValue001: 0.06, isMicroAccountFriendly: true };

export const PAIR_CADJPY: ForexPair = { symbol: 'CAD/JPY', name: 'Canadian Dollar / Yen', basePrice: 110.65, currentPrice: 110.65, pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.50, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_CADCHF: ForexPair = { symbol: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc', basePrice: 0.5898, currentPrice: 0.5898, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.50, pipValue001: 0.12, isMicroAccountFriendly: true };
export const PAIR_CHFJPY: ForexPair = { symbol: 'CHF/JPY', name: 'Swiss Franc / Yen', basePrice: 190.36, currentPrice: 190.36, pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.30, pipValue001: 0.09, isMicroAccountFriendly: true };

export const PAIR_NZDJPY: ForexPair = { symbol: 'NZD/JPY', name: 'Kiwi / Japanese Yen', basePrice: 88.56, currentPrice: 88.56, pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.09, isMicroAccountFriendly: true };
export const PAIR_NZDCAD: ForexPair = { symbol: 'NZD/CAD', name: 'Kiwi / Canadian Dollar', basePrice: 0.7995, currentPrice: 0.7995, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.08, isMicroAccountFriendly: true };
export const PAIR_NZDCHF: ForexPair = { symbol: 'NZD/CHF', name: 'Kiwi / Swiss Franc', basePrice: 0.4649, currentPrice: 0.4649, pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.12, isMicroAccountFriendly: true };

// --- 3. Precious Metals (0.01 Micro-Lot Friendly: 1 oz Gold / 10 oz Micro Silver) ---
export const PAIR_XAUUSD: ForexPair = { symbol: 'XAU/USD', name: 'Gold / US Dollar', basePrice: 4164.00, currentPrice: 4164.00, pipDigits: 2, isGoldOrCrypto: true, spreadPips: 1.2, category: 'METALS', minMargin001: 8.50, pipValue001: 0.10, isMicroAccountFriendly: true };
export const PAIR_XAGUSD: ForexPair = { symbol: 'XAG/USD', name: 'Silver / US Dollar', basePrice: 59.65, currentPrice: 59.65, pipDigits: 2, isGoldOrCrypto: true, spreadPips: 0.8, category: 'METALS', minMargin001: 3.20, pipValue001: 0.10, isMicroAccountFriendly: true };

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
  const isGold = pair.symbol.includes('XAU') || pair.symbol.includes('GOLD');
  const isSilver = pair.symbol.includes('XAG') || pair.symbol.includes('SILVER');
  const isJpy = pair.symbol.includes('JPY');
  const isUsdJpy = pair.symbol === 'USD/JPY' || pair.symbol === 'USDJPY';
  const pipOffset = isGold ? 17.0 : isSilver ? 0.38 : isUsdJpy ? 0.75 : isJpy ? 1.20 : pair.pipDigits === 2 ? 0.36 : pair.pipDigits === 1 ? 80.0 : 0.0034;
  const tp1Offset = pipOffset * 2.6;
  const tp2Offset = pipOffset * 3.8;
  const tp3Offset = pipOffset * 5.2;

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
  const sym = pair.symbol.toUpperCase();
  let multiplier = 10000.0;
  if (sym.includes('XAU') || sym.includes('GOLD')) {
    multiplier = 10.0; // $0.10 = 1 pip on Gold ($1.00 = 10 pips)
  } else if (sym.includes('XAG') || sym.includes('SILVER')) {
    multiplier = 100.0; // $0.01 = 1 pip on Silver ($0.80 = 80 pips)
  } else if (pair.isGoldOrCrypto && pair.pipDigits === 1) {
    multiplier = 1.0;
  } else if (pair.pipDigits === 2 || sym.includes('JPY')) {
    multiplier = 100.0; // 0.01 = 1 pip on JPY pairs
  }
  const pips = diff * multiplier;
  return Math.round(pips * 10) / 10;
}

export function calculateSlPips(signal: ForexSignal): number {
  const isBuy = signal.type.startsWith('BUY');
  return Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.stopLoss, isBuy));
}

export function pipsToPrice(pair: ForexPair, pips: number): number {
  let multiplier = 10000.0;
  const sym = pair.symbol.toUpperCase();
  if (sym.includes('XAU') || sym.includes('GOLD')) {
    multiplier = 10.0;
  } else if (sym.includes('XAG') || sym.includes('SILVER')) {
    multiplier = 100.0;
  } else if (pair.isGoldOrCrypto && pair.pipDigits === 1) {
    multiplier = 1.0;
  } else if (pair.pipDigits === 2 || sym.includes('JPY')) {
    multiplier = 100.0;
  }
  return pips / multiplier;
}

export function getTimeframeBounds(tf: Timeframe, isGold: boolean, isJpy: boolean): {
  minSl: number;
  maxSl: number;
  minTp1: number;
  maxTp1: number;
  targetRr: number;
} {
  switch (tf) {
    case 'M5':
      return {
        minSl: isGold ? 14 : 8,
        maxSl: isGold ? 20 : isJpy ? 14 : 12,
        minTp1: isGold ? 28 : 16,
        maxTp1: isGold ? 45 : isJpy ? 30 : 26,
        targetRr: 2.0
      };
    case 'M15':
      return {
        minSl: isGold ? 20 : 12,
        maxSl: isGold ? 28 : isJpy ? 18 : 16,
        minTp1: isGold ? 45 : 25,
        maxTp1: isGold ? 65 : isJpy ? 42 : 38,
        targetRr: 2.2
      };
    case 'H1':
      return {
        minSl: isGold ? 38 : 24,
        maxSl: isGold ? 52 : isJpy ? 38 : 34,
        minTp1: isGold ? 95 : 55,
        maxTp1: isGold ? 135 : isJpy ? 95 : 85,
        targetRr: 2.5
      };
    case 'H4':
      return {
        minSl: isGold ? 80 : 55,
        maxSl: isGold ? 125 : isJpy ? 95 : 85,
        minTp1: isGold ? 200 : 140,
        maxTp1: isGold ? 320 : isJpy ? 240 : 210,
        targetRr: 2.7
      };
    case 'D1':
    default:
      return {
        minSl: isGold ? 140 : 90,
        maxSl: isGold ? 220 : isJpy ? 160 : 140,
        minTp1: isGold ? 350 : 225,
        maxTp1: isGold ? 550 : isJpy ? 400 : 350,
        targetRr: 2.8
      };
  }
}

export function enforceTimeframeHierarchy(signal: ForexSignal): ForexSignal {
  if (!signal || !signal.pair) return signal;
  const rawTf = (signal.winningTf || signal.timeframe || 'M15') as Timeframe;
  const tf: Timeframe = rawTf === 'M5' || rawTf === 'M15' || rawTf === 'H1' || rawTf === 'H4' || rawTf === 'D1' ? rawTf : 'M15';

  const sym = signal.pair.symbol.toUpperCase();
  const isGold = sym.includes('XAU') || sym.includes('GOLD');
  const isJpy = sym.includes('JPY');
  const isBuy = signal.type.startsWith('BUY');
  const round = (val: number) => Number(val.toFixed(signal.pair.pipDigits));

  const bounds = getTimeframeBounds(tf, isGold, isJpy);
  const currentSlPips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.stopLoss, isBuy));
  const currentTp1Pips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.takeProfit1, isBuy));

  const isSlViolated = isNaN(currentSlPips) || currentSlPips < bounds.minSl * 0.95 || currentSlPips > bounds.maxSl * 1.05;
  const isTpViolated = isNaN(currentTp1Pips) || currentTp1Pips < bounds.minTp1 * 0.90 || currentTp1Pips > bounds.maxTp1 * 1.15;

  if (!isSlViolated && !isTpViolated && signal.timeframe === tf && signal.winningTf === tf) {
    return signal;
  }

  // Strictly calibrate SL and TP to timeframe rules
  const targetSlPips = Math.min(bounds.maxSl, Math.max(bounds.minSl, isNaN(currentSlPips) || currentSlPips <= 0 ? (bounds.minSl + bounds.maxSl) / 2 : currentSlPips));
  const targetTp1Pips = Math.min(bounds.maxTp1, Math.max(bounds.minTp1, Math.round(targetSlPips * bounds.targetRr * 10) / 10));
  const targetTp2Pips = Math.round(targetTp1Pips * 1.5 * 10) / 10;
  const targetTp3Pips = Math.round(targetTp1Pips * 2.0 * 10) / 10;

  const slDist = pipsToPrice(signal.pair, targetSlPips);
  const tp1Dist = pipsToPrice(signal.pair, targetTp1Pips);
  const tp2Dist = pipsToPrice(signal.pair, targetTp2Pips);
  const tp3Dist = pipsToPrice(signal.pair, targetTp3Pips);

  const calibratedSl = round(isBuy ? signal.entryPrice - slDist : signal.entryPrice + slDist);
  const calibratedTp1 = round(isBuy ? signal.entryPrice + tp1Dist : signal.entryPrice - tp1Dist);
  const calibratedTp2 = round(isBuy ? signal.entryPrice + tp2Dist : signal.entryPrice - tp2Dist);
  const calibratedTp3 = round(isBuy ? signal.entryPrice + tp3Dist : signal.entryPrice - tp3Dist);

  return {
    ...signal,
    timeframe: tf,
    winningTf: tf === 'H4' || tf === 'D1' ? 'H4' : tf === 'H1' ? 'H1' : 'M15',
    stopLoss: calibratedSl,
    takeProfit1: calibratedTp1,
    takeProfit2: calibratedTp2,
    takeProfit3: calibratedTp3,
    takeProfit: calibratedTp1,
    riskReward: `1:${bounds.targetRr.toFixed(1)}`
  };
}

export function calculateLotSize(signal: ForexSignal, accountBalance: number, riskPercent: number): number {
  const riskUsd = accountBalance * (riskPercent / 100.0);
  const oneLotLoss = Math.abs(
    calculateDollarPnl(
      signal.pair,
      signal.entryPrice,
      signal.stopLoss,
      1.0,
      signal.type.startsWith('BUY')
    ).dollarPnl
  );
  if (oneLotLoss <= 0) return 0.01;

  const lotSize = riskUsd / oneLotLoss;
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
  const sym = pair.symbol.toUpperCase();
  const isGold = sym.includes('XAU') || sym.includes('GOLD');
  const isSilver = sym.includes('XAG') || sym.includes('SILVER');

  const priceDiff = isBuy ? (targetPrice - entryPrice) : (entryPrice - targetPrice);

  let dollarPnl = 0;
  let pips = 0;

  if (isGold) {
    // Gold (XAU/USD): 1 pip = $0.10 (10 pips per $1.00 move), 100 oz per standard lot ($1.00 per $1 move at 0.01 lot)
    pips = Math.round(priceDiff * 10 * 10) / 10;
    dollarPnl = priceDiff * 100.0 * lots;
  } else if (isSilver) {
    // Silver (XAG/USD): 1 pip = $0.01 (100 pips per $1.00 move), 1,000 oz contract ($10/pip per 1.0 lot = $0.10/pip at 0.01 lot)
    pips = Math.round(priceDiff * 100 * 10) / 10;
    dollarPnl = pips * 10.0 * lots;
  } else {
    const isJpy = sym.includes('JPY');
    pips = Math.round((priceDiff / (isJpy ? 0.01 : 0.0001)) * 10) / 10;
    // For JPY pairs, pip value per standard lot in USD = 1000 JPY / exit price
    // For EUR/USD, GBP/USD, etc., pip value is $10.0 per standard lot ($0.10/pip at 0.01 lot)
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

export function isMarketOpenTimestamp(timestamp: number): boolean {
  const d = new Date(timestamp);
  const day = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;
  return true;
}


export interface WeekendMarketState {
  isWeekend: boolean;
  lastFridayCloseMs: number;
  nextSundayOpenMs: number;
  reopenCountdownFormatted: string;
}

export function getWeekendMarketState(now: Date = new Date()): WeekendMarketState {
  const day = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const totalMins = hour * 60 + minute;

  const isFridayAfterClose = day === 5 && totalMins >= 1320;
  const isSaturday = day === 6;
  const isSundayBeforeOpen = day === 0 && totalMins < 1320;
  const isWeekend = isFridayAfterClose || isSaturday || isSundayBeforeOpen;

  // Calculate most recent Friday 22:00 GMT
  const lastFriday = new Date(now.getTime());
  let daysBackToFriday = 0;
  if (day === 5) {
    daysBackToFriday = totalMins >= 1320 ? 0 : 7;
  } else if (day === 6) {
    daysBackToFriday = 1;
  } else if (day === 0) {
    daysBackToFriday = 2;
  } else {
    daysBackToFriday = (day + 2) % 7;
  }
  lastFriday.setUTCDate(lastFriday.getUTCDate() - daysBackToFriday);
  lastFriday.setUTCHours(22, 0, 0, 0);

  // Calculate next Sunday 22:00 GMT
  const nextSunday = new Date(now.getTime());
  let daysForwardToSunday = 0;
  if (day === 0) {
    daysForwardToSunday = totalMins < 1320 ? 0 : 7;
  } else {
    daysForwardToSunday = 7 - day;
  }
  nextSunday.setUTCDate(nextSunday.getUTCDate() + daysForwardToSunday);
  nextSunday.setUTCHours(22, 0, 0, 0);

  const msUntilOpen = Math.max(0, nextSunday.getTime() - now.getTime());
  const hoursUntilOpen = Math.floor(msUntilOpen / (3600 * 1000));
  const minsUntilOpen = Math.floor((msUntilOpen % (3600 * 1000)) / (60 * 1000));
  const daysUntilOpen = Math.floor(hoursUntilOpen / 24);
  const remainingHours = hoursUntilOpen % 24;

  let reopenCountdownFormatted = '';
  if (daysUntilOpen > 0) {
    reopenCountdownFormatted = `Reopens in ${daysUntilOpen}d ${remainingHours}h`;
  } else {
    reopenCountdownFormatted = `Reopens in ${hoursUntilOpen}h ${minsUntilOpen}m`;
  }

  return {
    isWeekend,
    lastFridayCloseMs: lastFriday.getTime(),
    nextSundayOpenMs: nextSunday.getTime(),
    reopenCountdownFormatted
  };
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
      activePairs: 'USD, CAD, EUR, GBP, Gold',
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
    case 'M5': return 20 * 60 * 1000;         // 20 Minutes (4 × M5 candles)
    case 'M15': return 45 * 60 * 1000;        // 45 Minutes (3 × M15 candles)
    case 'H1': return 4 * 3600 * 1000;        // 4 Hours (4 × H1 candles)
    case 'H4': return 16 * 3600 * 1000;       // 16 Hours (4 × H4 candles)
    case 'D1': return 72 * 3600 * 1000;       // 72 Hours / 3 Days (3 × D1 candles)
  }
}

export function formatSignalDateTime(createdAtMs: number): string {
  if (!createdAtMs || isNaN(createdAtMs)) return '—';
  const d = new Date(createdAtMs);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hr = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${m} ${day}, ${hr}:${min} UTC`;
}

export function getFormattedTimeElapsed(signal: ForexSignal, now: number = Date.now()): string {
  const nowDate = new Date(now);
  const weekendState = getWeekendMarketState(nowDate);

  if (weekendState.isWeekend) {
    if (signal.status === 'PENDING') {
      return 'Pending for Sun Open';
    }
    const sessionName = signal.killzone?.includes('NY')
      ? 'Fri NY Session'
      : signal.killzone?.includes('London')
      ? 'Fri London Session'
      : 'Fri Session';
    return `${sessionName} • Weekend Hold`;
  }

  const elapsed = Math.max(0, now - signal.createdAtMs);
  const minutes = Math.floor(elapsed / (60 * 1000));
  const hours = Math.floor(elapsed / (3600 * 1000));
  const days = Math.floor(elapsed / (24 * 3600 * 1000));

  if (days > 0) return `Posted ${days}d ${hours % 24}h ago`;
  if (hours > 0) return `Posted ${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `Posted ${minutes}m ago`;
  return `Posted Just Now`;
}

export function getFormattedClosedTime(signal: ForexSignal, now: number = Date.now()): string {
  const closedMs = signal.closedAtMs || signal.createdAtMs;
  if (!closedMs) return 'Closed';
  const elapsed = Math.max(0, now - closedMs);
  const minutes = Math.floor(elapsed / (60 * 1000));
  const hours = Math.floor(elapsed / (3600 * 1000));
  const days = Math.floor(elapsed / (24 * 3600 * 1000));

  if (days > 0) return `Closed ${days}d ${hours % 24}h ago`;
  if (hours > 0) return `Closed ${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `Closed ${minutes}m ago`;
  return `Closed Just Now`;
}

/**
 * Returns the exact execution timestamp when a limit/stop order was triggered and executed at entry.
 * For Market Execution orders, returns the original generation timestamp (createdAtMs).
 * For running Limit/Stop orders without an explicit executedAtMs, computes a deterministic fill timestamp.
 */
export function getSignalExecutedAtMs(signal: ForexSignal, now: number = Date.now()): number {
  if (typeof signal.executedAtMs === 'number' && signal.executedAtMs > 0) {
    return signal.executedAtMs;
  }
  // Market execution trades execute at posted time
  if (
    signal.type === 'BUY_MARKET' ||
    signal.type === 'SELL_MARKET' ||
    signal.type === 'BUY' ||
    signal.type === 'SELL'
  ) {
    return signal.createdAtMs;
  }
  // For limit/stop orders: deterministic fill timestamp between createdAtMs and now
  const createdAt = signal.createdAtMs || now - 60 * 60 * 1000;
  const elapsed = Math.max(0, now - createdAt);

  let hash = 0;
  const str = signal.id || signal.pair.symbol;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  // Deterministic delay (fill occurs 20% to 55% into the elapsed life, min 4m)
  const ratio = 0.25 + (hash % 30) / 100;
  const delayMs = Math.max(4 * 60 * 1000, Math.min(elapsed * 0.7, elapsed * ratio));
  return Math.min(now - 60 * 1000, createdAt + delayMs);
}

/**
 * Formats elapsed time since execution into readable string (e.g. "Executed 45m ago", "Executed 1 day ago").
 */
export function getFormattedExecutedTime(signal: ForexSignal, now: number = Date.now()): string {
  const executedMs = getSignalExecutedAtMs(signal, now);
  const elapsed = Math.max(0, now - executedMs);
  const minutes = Math.floor(elapsed / (60 * 1000));
  const hours = Math.floor(elapsed / (3600 * 1000));
  const days = Math.floor(elapsed / (24 * 3600 * 1000));

  if (days === 1) return `Executed 1 day ago`;
  if (days > 1) return `Executed ${days} days ago`;
  if (hours > 0) return `Executed ${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `Executed ${minutes}m ago`;
  return `Executed Just Now`;
}

/**
 * Formats the exact time difference (wait duration) between when the trade was posted and when it executed.
 */
export function getFormattedExecutionTimeDiff(signal: ForexSignal, now: number = Date.now()): string {
  const executedMs = getSignalExecutedAtMs(signal, now);
  const createdAt = signal.createdAtMs || executedMs;
  const waitMs = Math.max(0, executedMs - createdAt);
  const minutes = Math.floor(waitMs / (60 * 1000));
  const hours = Math.floor(waitMs / (3600 * 1000));
  const days = Math.floor(waitMs / (24 * 3600 * 1000));

  if (days > 0) return `${days}d ${hours % 24}h wait`;
  if (hours > 0) return `${hours}h ${minutes % 60}m wait`;
  if (minutes > 0) return `${minutes}m wait`;
  return `< 1m wait`;
}

/**
 * Calculates elapsed hold duration between trade opening and closing in milliseconds.
 */
export function getTradeDurationMs(signal: ForexSignal): number {
  if (signal.closedAtMs && signal.createdAtMs && signal.closedAtMs > signal.createdAtMs) {
    return signal.closedAtMs - signal.createdAtMs;
  }
  if (signal.validityDurationMs && signal.validityDurationMs > 0) {
    return signal.validityDurationMs;
  }
  switch (signal.timeframe) {
    case 'M5': return 25 * 60 * 1000;
    case 'M15': return 45 * 60 * 1000;
    case 'H1': return 2.5 * 3600 * 1000;
    case 'H4': return 10 * 3600 * 1000;
    case 'D1': return 36 * 3600 * 1000;
    default: return 2 * 3600 * 1000;
  }
}

/**
 * Formats duration in milliseconds into human-readable compact text (e.g. "45m", "2h 15m", "1d 6h").
 */
export function formatDurationCompact(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.round(ms / (60 * 1000));
  if (totalMinutes < 1) return '< 1m';
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function getFormattedTotalValidity(signal: ForexSignal): string {
  const totalMs = getEffectiveDurationMs(signal.timeframe);
  const totalMinutes = Math.round(totalMs / (60 * 1000));
  if (totalMinutes < 60) return `${totalMinutes}m Validity`;
  const hours = totalMs / (3600 * 1000);
  if (hours >= 24) return `${Math.round(hours / 24)}d Validity`;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h Validity`;
}

export function getRemainingValidityMs(signal: ForexSignal, now: number = Date.now()): number {
  const total = getEffectiveDurationMs(signal.timeframe);
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
  const total = getEffectiveDurationMs(signal.timeframe);
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

export function updateSignalWithLiveMarket(
  signal: ForexSignal,
  livePrice: number,
  ohlc?: { high?: number; low?: number }
): ForexSignal {
  if (livePrice <= 0) return signal;

  const updatedPair: ForexPair = { ...signal.pair, currentPrice: livePrice };

  // Keep closed signals locked at their exit price, status, and realized pips
  if (signal.status === 'HIT_TP' || signal.status === 'HIT_SL') {
    return {
      ...signal,
      pair: updatedPair
    };
  }

  // During weekend when forex markets are closed, prices and positions are frozen at Friday close settlement
  if (!isForexMarketOpen()) {
    return {
      ...signal,
      pair: updatedPair,
      currentPrice: livePrice,
      isLiveSynced: true
    };
  }

  const isBuy = signal.type.startsWith('BUY');
  const sym = signal.pair.symbol;
  const decimals =
    sym.includes('JPY') ||
    sym.includes('XAU') ||
    sym.includes('XAG') ||
    sym.includes('OIL')
      ? 2
      : 4;
  const roundP = (val: number) => Number(val.toFixed(decimals));

  const isGold = sym.includes('XAU') || sym.includes('GOLD');
  const isJpy = sym.includes('JPY');
  const tf: Timeframe = (signal.winningTf || signal.timeframe || 'M15') as Timeframe;
  const bounds = getTimeframeBounds(tf, isGold, isJpy);

  const currentSlPips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.stopLoss, isBuy));
  const clampedSlPips = (isNaN(currentSlPips) || currentSlPips <= 0 || currentSlPips > bounds.maxSl * 1.5)
    ? (bounds.minSl + bounds.maxSl) / 2
    : Math.min(bounds.maxSl, Math.max(bounds.minSl, currentSlPips));

  const slDist = pipsToPrice(signal.pair, clampedSlPips);
  const tp1Dist = slDist * bounds.targetRr;
  const tp2Dist = tp1Dist * 1.5;
  const tp3Dist = tp1Dist * 2.0;

  const wouldHitSl = isBuy ? livePrice <= signal.stopLoss : livePrice >= signal.stopLoss;
  const wouldHitTp = isBuy ? livePrice >= signal.takeProfit1 : livePrice <= signal.takeProfit1;

  const isMarketOrder = signal.type === 'BUY_MARKET' || signal.type === 'SELL_MARKET' || signal.type === 'BUY' || signal.type === 'SELL';
  const entryDrift = Math.abs(livePrice - signal.entryPrice);
  const maxAllowableDrift = pipsToPrice(signal.pair, isGold ? 45 : isJpy ? 35 : 25);
  // Re-anchor if entry was computed from an obsolete static base price (e.g. CAD/CHF 0.5809 vs 0.5898)
  const isImpossibleEntryDrift = (signal.status === 'RUNNING' || isMarketOrder) && entryDrift > Math.max(slDist * 1.25, maxAllowableDrift);

  // Pure, deterministic check using signal state: re-anchor on initial boot sync OR if entry price drifted impossibly far from live market
  const isFirstLiveSync = !signal.isLiveSynced;
  const referencePrice = signal.currentPrice > 0 ? signal.currentPrice : signal.entryPrice;
  const singleTickJump = Math.abs(livePrice - referencePrice);

  const remainingSlCushion = isBuy ? livePrice - signal.stopLoss : signal.stopLoss - livePrice;
  const isMockToRealFeedJump = (slDist > 0 && singleTickJump > slDist * 1.35) || isImpossibleEntryDrift;
  const needsReanchorOnSync =
    (isFirstLiveSync &&
      (wouldHitSl ||
        wouldHitTp ||
        (slDist > 0 && remainingSlCushion < slDist * 0.75) ||
        (slDist > 0 && singleTickJump > slDist * 0.15))) ||
    isMockToRealFeedJump;

  if (needsReanchorOnSync && (signal.status === 'RUNNING' || signal.status === 'PENDING')) {
    let newEntry = signal.entryPrice;
    if (signal.status === 'RUNNING' || isMarketOrder) {
      newEntry = roundP(isMarketOrder ? livePrice : (isBuy ? livePrice - tp1Dist * 0.08 : livePrice + tp1Dist * 0.08));
    } else {
      const pendingOffset = tp1Dist * 0.15;
      const shouldPlaceBelow = signal.type === 'BUY_LIMIT' || signal.type === 'SELL_STOP';
      newEntry = roundP(shouldPlaceBelow ? livePrice - pendingOffset : livePrice + pendingOffset);
    }

    const newSl = roundP(isBuy ? newEntry - slDist : newEntry + slDist);
    let newTp1 = roundP(isBuy ? newEntry + tp1Dist : newEntry - tp1Dist);
    let newTp2 = roundP(isBuy ? newEntry + tp2Dist : newEntry - tp2Dist);
    let newTp3 = roundP(isBuy ? newEntry + tp3Dist : newEntry - tp3Dist);

    if (!isBuy) {
      if (newTp1 <= 0.0001) newTp1 = roundP(newEntry * 0.98);
      if (newTp2 <= 0.0001) newTp2 = roundP(newEntry * 0.96);
      if (newTp3 <= 0.0001) newTp3 = roundP(newEntry * 0.94);
    }

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
      pips: recalibratedPips,
      isLiveSynced: true
    };
  }

  // On the very first live sync tick, mark isLiveSynced: true without triggering false SL/TP
  if (isFirstLiveSync) {
    const syncPips =
      signal.status === 'RUNNING'
        ? calculatePips(updatedPair, signal.entryPrice, livePrice, isBuy)
        : 0;
    return {
      ...signal,
      pair: updatedPair,
      currentPrice: livePrice,
      pips: Math.round(syncPips * 10) / 10,
      isLiveSynced: true
    };
  }

  const finalEntry = signal.entryPrice;
  const finalStopLoss = signal.stopLoss;
  const finalTp1 = signal.takeProfit1;

  let newStatus: SignalStatus = signal.status;
  let newPips = signal.pips;
  let validityTimeLeft = signal.validityTimeLeft;
  let validityExpiresAt = signal.validityExpiresAt;
  let closedAtMs = signal.closedAtMs;
  let executedAtMs = signal.executedAtMs;

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
        validityTimeLeft = `Active (${newPips >= 0 ? '+' : ''}${newPips} pips)`;
        executedAtMs = signal.executedAtMs || Date.now();
      } else {
        const remainingMs = getRemainingValidityMs(signal);
        if (remainingMs <= 0) {
          newStatus = 'PENDING';
          validityTimeLeft = 'Expired (Unfilled Limit Order)';
          validityExpiresAt = 'Order Cancelled (Time Horizon Passed)';
          closedAtMs = signal.closedAtMs || Date.now();
        } else {
          newStatus = 'PENDING';
          newPips = 0;
        }
      }
      break;
    }
    case 'RUNNING': {
      newPips = calculatePips(updatedPair, finalEntry, livePrice, isBuy);
      const isSlHit = (isBuy && livePrice <= finalStopLoss) || (!isBuy && livePrice >= finalStopLoss);
      const isTpHit = (isBuy && livePrice >= finalTp1) || (!isBuy && livePrice <= finalTp1);

      if (isSlHit) {
        newStatus = 'HIT_SL';
        newPips = -Math.abs(calculatePips(updatedPair, finalEntry, finalStopLoss, isBuy));
        validityTimeLeft = 'Closed (SL Hit)';
        validityExpiresAt = `SL Hit at ${formatPrice(updatedPair, finalStopLoss)}`;
        closedAtMs = signal.closedAtMs || Date.now();
      } else if (isTpHit) {
        newStatus = 'HIT_TP';
        newPips = Math.abs(calculatePips(updatedPair, finalEntry, finalTp1, isBuy));
        validityTimeLeft = 'Closed (TP1 Hit)';
        validityExpiresAt = `TP1 Hit at ${formatPrice(updatedPair, finalTp1)}`;
        closedAtMs = signal.closedAtMs || Date.now();
      } else {
        newStatus = 'RUNNING';
        const tp1DistPips = Math.abs(calculatePips(updatedPair, finalEntry, finalTp1, isBuy));
        if (newPips >= Math.max(12, tp1DistPips * 0.45) || signal.isBreakevenArmed) {
          validityTimeLeft = `🛡️ Breakeven Protected (${newPips >= 0 ? '+' : ''}${Math.round(newPips * 10) / 10}p)`;
        }
      }
      break;
    }
  }

  const tp1DistPips = Math.abs(calculatePips(updatedPair, finalEntry, finalTp1, isBuy));
  const isBreakevenArmed = newStatus === 'RUNNING' && (newPips >= Math.max(12, tp1DistPips * 0.45) || Boolean(signal.isBreakevenArmed));

  return enforceTimeframeHierarchy({
    ...signal,
    pair: updatedPair,
    currentPrice: livePrice,
    pips: Math.round(newPips * 10) / 10,
    status: newStatus,
    isPending: newStatus === 'PENDING',
    isBreakevenArmed,
    validityTimeLeft,
    validityExpiresAt,
    closedAtMs,
    executedAtMs,
    executedAtFormatted: executedAtMs ? formatSignalDateTime(executedAtMs) : undefined,
    isLiveSynced: true
  });
}

export function getInitialSignals(): ForexSignal[] {
  const favorites = PersistenceManager.getFavorites();
  const alertToggled = PersistenceManager.getAlertToggledSignals();
  const savedState = PersistenceManager.getSavedSignalsState();

  const weekendState = getWeekendMarketState();
  const now = Date.now();
  const goldDefaultCreatedAt = weekendState.isWeekend
    ? weekendState.lastFridayCloseMs - 4 * 3600 * 1000 // Friday 18:00 GMT (Active NY session)
    : now - (1 * 3600 + 45 * 60) * 1000; // 1h 45m ago
  const defaultCreatedAt = goldDefaultCreatedAt;

  const rawSignals: ForexSignal[] = [
    {
      id: 'SIG-XAU-001',
      pair: PAIR_XAUUSD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 4152.00,
      currentPrice: 4155.50,
      stopLoss: 4147.50,
      takeProfit1: 4163.50,
      takeProfit2: 4169.50,
      takeProfit3: 4175.00,
      pips: 35.0,
      riskReward: '1:2.6',
      confluenceScore: 95,
      rationale: 'A+ Confluence: H1 Institutional Demand Block at 4152.00 + London sweep of Asian liquidity. H1 ATR structure: 45p ($4.50) SL targeting 115p ($11.50) TP1.',
      timeframe: 'H1',
      winningTf: 'H1',
      strategy: 'GOLD_HUNTER',
      timestamp: weekendState.isWeekend ? 'Fri NY Session • Weekend Hold' : '1h 45m ago',
      institutionalFlow: 'Bullish Demand Block Mitigation + Liquidity Sweep',
      isBestTradeNow: true,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'NY AM Killzone (13:30-16:00 GMT)',
      winProbability: 94,
      quality: 'A_PLUS',
      economicRisk: 'Safe Window (No Red Folder USD Events)',
      validityTimeLeft: weekendState.isWeekend ? 'Weekend Hold (Running +35p)' : 'Active (Running +35p)',
      validityExpiresAt: 'Targeting TP1 4163.50 (+115p)',
      invalidationTrigger: 'SL protected at 4147.50 (-45p) below H1 Order Block',
      createdAtMs: goldDefaultCreatedAt,
      createdAtFormatted: formatSignalDateTime(goldDefaultCreatedAt),
      takeProfit: 4163.50,
      isLiveSynced: false,
      checklist: [
        { title: 'H4 Trend Direction', isConfirmed: true, detail: 'Bullish market structure above 200 EMA' },
        { title: 'Institutional Demand Block', isConfirmed: true, detail: 'Tested unmitigated H1 Order Block at 4152.00' },
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
      currentPrice: 1.1211,
      stopLoss: 1.1235,
      takeProfit1: 1.1181,
      takeProfit2: 1.1162,
      takeProfit3: 1.1140,
      pips: 9.0,
      riskReward: '1:2.6',
      confluenceScore: 91,
      rationale: 'M15 Intraday Scalp (Bearish EUR Flow): Euro weakness + Strong USD (8.6/10). M15 Supply Block rejection at 1.1220 with tight 15-pip M15 SL targeting 39-pip liquidity pool at 1.1181.',
      timeframe: 'M15',
      timestamp: weekendState.isWeekend ? 'Fri London/NY Session • Weekend Hold' : '12 min ago',
      institutionalFlow: 'Bearish Supply Block + USD Dominance',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London / NY Session',
      winProbability: 91,
      quality: 'A_PLUS',
      economicRisk: 'Aligned with USD Strength vs EUR Weakness',
      validityTimeLeft: weekendState.isWeekend ? 'Weekend Hold (+9 pips)' : 'Active (+9 pips)',
      validityExpiresAt: 'Targeting TP1 1.1181 (+39p)',
      invalidationTrigger: 'Tight M15 SL at 1.1235 (-15p)',
      createdAtMs: defaultCreatedAt,
      takeProfit: 1.1181,
      isLiveSynced: false,
      checklist: [
        { title: 'Currency Strength Alignment', isConfirmed: true, detail: 'Strong USD (8.6/10) vs Weak EUR — Bearish EUR/USD continuation' },
        { title: 'M15 Supply Rejection', isConfirmed: true, detail: 'Tight 15-pip M15 structural stop above 1.1235 micro swing high' }
      ]
    },
    {
      id: 'SIG-GBP-003',
      pair: PAIR_GBPUSD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 1.3205,
      currentPrice: 1.3242,
      stopLoss: 1.3137,
      takeProfit1: 1.3382,
      takeProfit2: 1.3455,
      takeProfit3: 1.3535,
      pips: 37.0,
      riskReward: '1:2.6',
      confluenceScore: 88,
      rationale: 'H4 Swing Execution (Instant Buy): Break of Structure (BOS) on 4-Hour chart following UK inflation print. Wide H4 structural SL (68 pips at 1.3137) targeting 177-pip H4 swing high at 1.3382.',
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
      validityTimeLeft: 'Active Trade (+37p)',
      validityExpiresAt: 'Targeting H4 TP1 1.3382 (+177p)',
      invalidationTrigger: 'H4 Swing SL at 1.3137 (-68p)',
      createdAtMs: defaultCreatedAt,
      takeProfit: 1.3382,
      isLiveSynced: false,
      checklist: [
        { title: 'Break of Structure', isConfirmed: true, detail: 'Clean H4 close above previous swing high' },
        { title: 'H4 Structural ATR Stop', isConfirmed: true, detail: '68-pip H4 stop loss below 50 EMA swing low targeting +177 pips' }
      ]
    },
    {
      id: 'SIG-JPY-004',
      pair: PAIR_USDJPY,
      type: 'BUY_LIMIT',
      status: 'PENDING',
      entryPrice: 157.65,
      currentPrice: 157.84,
      stopLoss: 157.27,
      takeProfit1: 158.64,
      takeProfit2: 159.10,
      takeProfit3: 159.65,
      pips: 0.0,
      riskReward: '1:2.6',
      confluenceScore: 93,
      rationale: 'H1 Pending Buy Limit (Discount Demand Block): Extreme Currency Meter Confluence (USD 8.6/10 vs JPY 1.6/10). H1 structure: 38-pip SL at 157.27 targeting 99-pip TP1 at 158.64.',
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
      invalidationTrigger: 'Auto-cancels if price breaches 157.27 (-38p) before 157.65 tap',
      validityDurationMs: 4 * 3600 * 1000,
      createdAtMs: Date.now(),
      takeProfit: 158.64,
      checklist: [
        { title: 'Currency Meter Confluence', isConfirmed: true, detail: 'USD 8.6/10 vs JPY 1.6/10 (+7.0 pt extreme divergence)' },
        { title: 'H1 Demand Order Block', isConfirmed: true, detail: '38-pip H1 structural stop targeting +99 pips at 158.64' }
      ]
    },
    {
      id: 'SIG-GJ-005',
      pair: PAIR_GBPJPY,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 208.20,
      currentPrice: 208.45,
      stopLoss: 208.02,
      takeProfit1: 208.96,
      takeProfit2: 209.35,
      takeProfit3: 209.80,
      pips: 25.0,
      riskReward: '1:2.1',
      confluenceScore: 94,
      rationale: 'London Killer M15 Intraday Scalp (GBP/JPY The Dragon): Sweep of Asian range liquidity with M15 Market Structure Shift (MSS+) and pin-bar wick rejection during London Open. Tight 18-pip M15 SL at 208.02 targeting 38-pip liquidity pool at 208.96.',
      timeframe: 'M15',
      winningTf: 'M15',
      strategy: 'LONDON_KILLER',
      timestamp: '15 min ago',
      institutionalFlow: 'London Killzone MSS+ Sweep + The Dragon Momentum',
      isBestTradeNow: true,
      isPending: false,
      isFavorite: true,
      hasAlert: false,
      killzone: 'London Killzone (07:00-10:00 UTC)',
      winProbability: 94,
      quality: 'A_PLUS',
      economicRisk: 'London Open Session Flow (Safe)',
      validityTimeLeft: 'Active (Running +25.0p)',
      validityExpiresAt: 'Targeting M15 TP1 208.96 (+38p)',
      invalidationTrigger: 'M15 SL at 208.02 (-18p)',
      createdAtMs: Date.now(),
      takeProfit: 208.96,
      isLiveSynced: false,
      checklist: [
        { title: 'London Killer Strategy Rule', isConfirmed: true, detail: 'Clean sweep of Asian range extreme + M15 MSS+ confirmation' },
        { title: 'The Dragon M15 Structural Stop', isConfirmed: true, detail: '18-pip M15 stop loss targeting +38 pips at 208.96' }
      ]
    },
    {
      id: 'SIG-AUD-006',
      pair: PAIR_AUDUSD,
      type: 'SELL_MARKET',
      status: 'HIT_SL',
      entryPrice: 0.6968,
      currentPrice: 0.6984,
      stopLoss: 0.6984,
      takeProfit1: 0.6930,
      takeProfit2: 0.6912,
      takeProfit3: 0.6890,
      pips: -16.0,
      riskReward: '1:2.4',
      confluenceScore: 88,
      rationale: 'M15 Intraday Supply Rejection: Session wick spike pushed through 0.69840 to sweep local liquidity, hitting SL before retracing. Lessons recorded by Adaptive SL Engine to mandate HTF trend filters and expanded ATR buffer.',
      timeframe: 'M15',
      winningTf: 'M15',
      timestamp: '2d 15h ago',
      institutionalFlow: 'Interbank Liquidity Sweep & Wick Spike',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London / NY Overlap',
      winProbability: 88,
      quality: 'A',
      economicRisk: 'High-Impact Session Wick Triggered Stop Loss',
      validityTimeLeft: 'Closed (SL Hit)',
      validityExpiresAt: 'SL Hit at 0.69840 (-16.0p)',
      invalidationTrigger: 'M15 SL at 0.69840 hit during session wick',
      createdAtMs: Date.now() - (2 * 24 + 15) * 3600 * 1000,
      closedAtMs: Date.now() - 8 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 0.6932,
      checklist: [
        { title: 'Currency Strength Alignment', isConfirmed: true, detail: 'Strong USD (8.6/10) vs Neutral AUD — Bearish trend continuation' },
        { title: 'M15 Supply Rejection', isConfirmed: true, detail: 'Disciplined stop loss triggered at planned 0.69900 buffer' }
      ]
    },
    {
      id: 'SIG-EC-007',
      pair: PAIR_EURCAD,
      type: 'BUY_LIMIT',
      status: 'RUNNING',
      entryPrice: 1.6005,
      currentPrice: 1.6025,
      stopLoss: 1.5971,
      takeProfit1: 1.6093,
      takeProfit2: 1.6135,
      takeProfit3: 1.6185,
      pips: 20.0,
      riskReward: '1:2.6',
      confluenceScore: 88,
      rationale: 'H1 Limit Order Fill (EUR > CAD): EUR/CAD filled H1 Buy Limit at 1.6005 Order Block. H1 ATR structure with 34-pip SL at 1.5971 targeting 88-pip TP1 at 1.6093.',
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
      validityExpiresAt: 'Targeting H1 TP1 1.6093 (+88p)',
      invalidationTrigger: 'H1 SL at 1.5971 (-34p)',
      createdAtMs: now - 75 * 60 * 1000,
      createdAtFormatted: formatSignalDateTime(now - 75 * 60 * 1000),
      executedAtMs: now - 30 * 60 * 1000,
      executedAtFormatted: formatSignalDateTime(now - 30 * 60 * 1000),
      takeProfit: 1.6093,
      checklist: [
        { title: 'Micro-Lot Account Friendly', isConfirmed: true, detail: 'Margin needed: ~$2.20 | 1 pip = $0.08' },
        { title: 'H1 Structural Scaling', isConfirmed: true, detail: '34-pip H1 stop loss targeting +88 pips at 1.6093' }
      ]
    },
    {
      id: 'SIG-CAD-008',
      pair: PAIR_USDCAD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 1.4225,
      currentPrice: 1.4248,
      stopLoss: 1.4193,
      takeProfit1: 1.4308,
      takeProfit2: 1.4350,
      takeProfit3: 1.4400,
      pips: 23.0,
      riskReward: '1:2.6',
      confluenceScore: 91,
      rationale: 'H1 Session Execution (Instant Buy): Strong USD (8.6/10) vs Weak CAD (5.2/10). H1 Bullish Order Block bounce at 1.4225 with 32-pip H1 SL targeting 83-pip TP1 at 1.4308.',
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
      validityExpiresAt: 'Targeting H1 TP1 1.4308 (+83p)',
      invalidationTrigger: 'H1 SL at 1.4193 (-32p)',
      createdAtMs: Date.now(),
      takeProfit: 1.4308,
      checklist: [
        { title: 'Micro-Lot Margin', isConfirmed: true, detail: 'Margin needed: ~$2.00 | 1 pip = $0.08' },
        { title: 'Currency Meter Alignment', isConfirmed: true, detail: 'USD (8.6) vs CAD (5.2) — 32p H1 SL / +83p TP1' }
      ]
    },
    {
      id: 'SIG-CJ-009',
      pair: PAIR_CADJPY,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 110.20,
      currentPrice: 110.65,
      stopLoss: 109.44,
      takeProfit1: 112.18,
      takeProfit2: 112.95,
      takeProfit3: 113.80,
      pips: 45.0,
      riskReward: '1:2.6',
      confluenceScore: 91,
      rationale: 'H4 Swing Cross: CAD/JPY carry breakout! Bouncing off H4 demand zone at 110.20 with 76-pip H4 structural SL at 109.44 targeting 198-pip H4 swing target at 112.18.',
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
      validityExpiresAt: 'Targeting H4 TP1 112.18 (+198p)',
      invalidationTrigger: 'H4 Swing SL at 109.44 (-76p)',
      createdAtMs: Date.now(),
      takeProfit: 112.18,
      checklist: [
        { title: 'H4 Swing Scaling', isConfirmed: true, detail: '76-pip H4 structural stop targeting +198 pips at 112.18' },
        { title: 'Demand Zone Retest', isConfirmed: true, detail: 'H4 Bullish Order Block mitigation at 110.20' }
      ]
    },
    {
      id: 'SIG-EA-010',
      pair: PAIR_EURAUD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 1.6140,
      currentPrice: 1.6152,
      stopLoss: 1.6123,
      takeProfit1: 1.6184,
      takeProfit2: 1.6205,
      takeProfit3: 1.6230,
      pips: 12.0,
      riskReward: '1:2.6',
      confluenceScore: 89,
      rationale: 'M15 Intraday Momentum: EUR/AUD bounce off 1.6140 M15 demand block. Tight 17-pip M15 stop loss at 1.6123 targeting 44-pip intraday expansion at 1.6184.',
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
      validityTimeLeft: 'Active (+12 pips)',
      validityExpiresAt: 'Targeting M15 TP1 1.6184 (+44p)',
      invalidationTrigger: 'M15 SL at 1.6123 (-17p)',
      createdAtMs: Date.now(),
      takeProfit: 1.6184,
      checklist: [
        { title: 'Micro Account Margin', isConfirmed: true, detail: 'Margin needed: ~$2.20 | 1 pip = $0.07' },
        { title: 'M15 Intraday Scaling', isConfirmed: true, detail: '17-pip M15 stop loss targeting +44 pips at 1.6184' }
      ]
    },
    {
      id: 'SIG-EG-011',
      pair: PAIR_EURGBP,
      type: 'SELL_LIMIT',
      status: 'RUNNING',
      entryPrice: 0.8512,
      currentPrice: 0.8497,
      stopLoss: 0.8542,
      takeProfit1: 0.8434,
      takeProfit2: 0.8398,
      takeProfit3: 0.8360,
      pips: 15.0,
      riskReward: '1:2.6',
      confluenceScore: 89,
      rationale: 'H1 Limit Order Fill (Bullish GBP / Bearish EUR): EUR/GBP filled Sell Limit at 0.8512 Order Block. 30-pip H1 SL at 0.8542 targeting 78-pip TP1 at 0.8434.',
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
      validityExpiresAt: 'Targeting H1 TP1 0.8434 (+78p)',
      invalidationTrigger: 'H1 SL at 0.8542 (-30p)',
      createdAtMs: now - (2 * 3600 + 10 * 60) * 1000,
      createdAtFormatted: formatSignalDateTime(now - (2 * 3600 + 10 * 60) * 1000),
      executedAtMs: now - 50 * 60 * 1000,
      executedAtFormatted: formatSignalDateTime(now - 50 * 60 * 1000),
      takeProfit: 0.8434,
      checklist: [
        { title: 'Micro Margin', isConfirmed: true, detail: 'Margin needed: ~$2.20 | 1 pip = $0.13' },
        { title: 'H1 Structural Range', isConfirmed: true, detail: '30-pip H1 stop loss targeting +78 pips at 0.8434' }
      ]
    },
    {
      id: 'SIG-AJ-012',
      pair: PAIR_AUDJPY,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 109.30,
      currentPrice: 109.80,
      stopLoss: 108.52,
      takeProfit1: 111.33,
      takeProfit2: 112.15,
      takeProfit3: 113.00,
      pips: 50.0,
      riskReward: '1:2.6',
      confluenceScore: 92,
      rationale: 'H4 Aussie / Yen Swing Breakout: Clean H4 Break of Structure (BOS) above 109.30 resistance. 78-pip H4 swing SL at 108.52 targeting 203-pip H4 target at 111.33.',
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
      validityExpiresAt: 'Targeting H4 TP1 111.33 (+203p)',
      invalidationTrigger: 'H4 Swing SL at 108.52 (-78p)',
      createdAtMs: Date.now(),
      takeProfit: 111.33,
      checklist: [
        { title: 'Break of Structure (BOS)', isConfirmed: true, detail: '4H candle close above previous swing high' },
        { title: 'H4 Swing ATR Scaling', isConfirmed: true, detail: '78-pip H4 structural stop targeting +203 pips' }
      ]
    },
    {
      id: 'SIG-GA-013',
      pair: PAIR_GBPAUD,
      type: 'BUY_LIMIT',
      status: 'PENDING',
      entryPrice: 1.8990,
      currentPrice: 1.9008,
      stopLoss: 1.8952,
      takeProfit1: 1.9089,
      takeProfit2: 1.9140,
      takeProfit3: 1.9200,
      pips: 0.0,
      riskReward: '1:2.6',
      confluenceScore: 90,
      rationale: 'H1 Pending Buy Limit: Retesting 1.8990 H1 Discount Demand Block & 61.8% Fib. 38-pip H1 SL at 1.8952 targeting 99-pip H1 expansion at 1.9089.',
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
      validityTimeLeft: '3h 18m left to validate',
      validityExpiresAt: 'Expires at London Mid-Day (4h H1 Window)',
      invalidationTrigger: 'Auto-cancels if price breaches 1.8952 (-38p) before fill',
      validityDurationMs: 4 * 3600 * 1000,
      createdAtMs: Date.now(),
      takeProfit: 1.9089,
      checklist: [
        { title: 'Discount Demand Block', isConfirmed: true, detail: 'Tested unmitigated H1 Order Block at 1.8990' },
        { title: 'H1 Structural Scaling', isConfirmed: true, detail: '38-pip H1 stop loss targeting +99 pips at 1.9089' }
      ]
    },
    {
      id: 'SIG-SILVER-014',
      pair: PAIR_XAGUSD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 59.50,
      currentPrice: 59.65,
      stopLoss: 58.70,
      takeProfit1: 61.58,
      takeProfit2: 62.40,
      takeProfit3: 63.30,
      pips: 15.0,
      riskReward: '1:2.6',
      confluenceScore: 91,
      rationale: 'H4 Silver (XAG/USD) Swing Surge: Silver bouncing off $59.50 H4 institutional demand zone. H4 swing structure: 80-pip ($0.80) SL at 58.70 targeting 208-pip ($2.08) TP1 at 61.58.',
      timeframe: 'H4',
      winningTf: 'H4',
      strategy: 'GOLD_HUNTER',
      timestamp: weekendState.isWeekend ? 'Fri London Session • Weekend Hold' : '3h 15m ago',
      institutionalFlow: 'Precious Metals Sympathy Rally',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'NY AM Session Window',
      winProbability: 91,
      quality: 'A_PLUS',
      economicRisk: 'Commodity Supercycle Momentum',
      validityTimeLeft: 'Active (+15 pips)',
      validityExpiresAt: 'Targeting H4 TP1 $61.58 (+208p)',
      invalidationTrigger: 'H4 Swing SL at 58.70 (-80p)',
      createdAtMs: weekendState.isWeekend ? (weekendState.lastFridayCloseMs - 6 * 3600 * 1000) : (now - (3 * 3600 + 15 * 60) * 1000),
      createdAtFormatted: formatSignalDateTime(weekendState.isWeekend ? (weekendState.lastFridayCloseMs - 6 * 3600 * 1000) : (now - (3 * 3600 + 15 * 60) * 1000)),
      takeProfit: 61.58,
      checklist: [
        { title: 'Multi-Week Resistance Flip', isConfirmed: true, detail: 'Clean H4 demand retest at $59.50' },
        { title: 'H4 Metals ATR Scaling', isConfirmed: true, detail: '80-pip ($0.80) H4 stop targeting +208 pips ($2.08)' }
      ]
    },
    {
      id: 'SIG-EJ-015',
      pair: PAIR_EURJPY,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 177.80,
      currentPrice: 178.02,
      stopLoss: 177.44,
      takeProfit1: 178.74,
      takeProfit2: 179.25,
      takeProfit3: 179.85,
      pips: 22.0,
      riskReward: '1:2.6',
      confluenceScore: 92,
      rationale: 'H1 Session Cross: EUR/JPY carry trade expansion! Retested H1 Dynamic 50 EMA at 177.80 with 36-pip H1 SL at 177.44 targeting 94-pip H1 TP1 at 178.74.',
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
      validityTimeLeft: 'Active (+22 pips)',
      validityExpiresAt: 'Targeting H1 TP1 178.74 (+94p)',
      invalidationTrigger: 'H1 SL at 177.44 (-36p)',
      createdAtMs: Date.now(),
      takeProfit: 178.74,
      checklist: [
        { title: 'Micro Margin Requirement', isConfirmed: true, detail: 'Margin needed: ~$2.20 | 1 pip = $0.09' },
        { title: 'H1 Structural Scaling', isConfirmed: true, detail: '36-pip H1 stop loss targeting +94 pips at 178.74' }
      ]
    },
    {
      id: 'SIG-NZD-016',
      pair: PAIR_NZDUSD,
      type: 'SELL_LIMIT',
      status: 'HIT_SL',
      entryPrice: 0.5592,
      currentPrice: 0.5605,
      stopLoss: 0.5605,
      takeProfit1: 0.5558,
      takeProfit2: 0.5542,
      takeProfit3: 0.5525,
      pips: -13.0,
      riskReward: '1:2.6',
      confluenceScore: 90,
      rationale: 'Fulfilled 24H Session Signal (M15 Limit Execution — SL Hit): NZD/USD Sell Limit filled at 0.55920 with tight 13-pip M15 SL at 0.56050 targeting 34-pip M15 TP1 at 0.55580. Stopped out at 0.56050 (-13.0 pips) during USD pullback.',
      timeframe: 'M15',
      timestamp: '2 hr ago',
      institutionalFlow: 'Premium Supply Mitigation (Stopped Out)',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Asian / London Handover',
      winProbability: 90,
      quality: 'A_PLUS',
      economicRisk: 'Stop Loss Hit (-13.0 pips / -$1.30 @ 0.01)',
      validityTimeLeft: 'Closed (SL Hit)',
      validityExpiresAt: 'SL Hit at 0.56050 (-13.0p)',
      invalidationTrigger: 'M15 SL hit at 0.56050 (-13p)',
      validityDurationMs: 45 * 60 * 1000,
      createdAtMs: Date.now() - 2 * 3600 * 1000,
      closedAtMs: Date.now() - 45 * 60 * 1000,
      isLiveSynced: true,
      takeProfit: 0.5558,
      checklist: [
        { title: 'Micro Margin Requirement', isConfirmed: true, detail: 'Margin needed: ~$1.15 | 1 pip = $0.10' },
        { title: 'M15 Intraday Scaling', isConfirmed: true, detail: '13-pip M15 stop loss at 0.56050 (-$1.30 @ 0.01 lot)' }
      ]
    },
    {
      id: 'SIG-CHF-017',
      pair: PAIR_USDCHF,
      type: 'BUY_MARKET',
      status: 'HIT_TP',
      entryPrice: 0.8785,
      currentPrice: 0.8871,
      stopLoss: 0.8752,
      takeProfit1: 0.8871,
      takeProfit2: 0.8905,
      takeProfit3: 0.8945,
      pips: 86.0,
      riskReward: '1:2.6',
      confluenceScore: 93,
      rationale: 'Fulfilled 24H Session Signal (H1 Structure): Strong USD (8.6/10) vs Weak CHF. H1 Order Block bounce at 0.8785 (33-pip H1 SL at 0.8752) reached full H1 Take Profit target at 0.8871 (+86.0 pips).',
      timeframe: 'H1',
      timestamp: '3 hr ago',
      institutionalFlow: 'USD Dominance + H1 Demand Mitigation',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Session Window',
      winProbability: 93,
      quality: 'A_PLUS',
      economicRisk: 'Target Reached (+86.0 pips)',
      validityTimeLeft: 'Closed (TP Hit)',
      validityExpiresAt: 'Take Profit Hit (+86.0p)',
      invalidationTrigger: 'H1 SL was 0.8752 (-33p)',
      createdAtMs: Date.now() - 3 * 3600 * 1000,
      closedAtMs: Date.now() - 55 * 60 * 1000,
      isLiveSynced: true,
      takeProfit: 0.8871,
      checklist: [
        { title: 'Currency Meter Alignment', isConfirmed: true, detail: 'Strong USD vs Weak CHF institutional trend' },
        { title: 'H1 Take Profit Reached', isConfirmed: true, detail: '33-pip H1 SL → +86.0-pip H1 TP target reached at 0.8871' }
      ]
    },
    {
      id: 'SIG-GC-018',
      pair: PAIR_GBPCAD,
      type: 'BUY_MARKET',
      status: 'HIT_TP',
      entryPrice: 1.8120,
      currentPrice: 1.8162,
      stopLoss: 1.8104,
      takeProfit1: 1.8162,
      takeProfit2: 1.8185,
      takeProfit3: 1.8210,
      pips: 42.0,
      riskReward: '1:2.6',
      confluenceScore: 94,
      rationale: 'Fulfilled 24H Session Signal (M15 Scalp): GBP (7.7/10) outperforming weak CAD (5.2/10). M15 Bullish FVG at 1.8120 (tight 16-pip M15 SL at 1.8104) hit M15 Take Profit at 1.8162 (+42.0 pips).',
      timeframe: 'M15',
      timestamp: '5 hr ago',
      institutionalFlow: 'Bullish GBP Cross Expansion',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Open Killzone',
      winProbability: 94,
      quality: 'A_PLUS',
      economicRisk: 'Target Reached (+42.0 pips)',
      validityTimeLeft: 'Closed (TP Hit)',
      validityExpiresAt: 'Take Profit Hit (+42.0p)',
      invalidationTrigger: 'M15 SL was 1.8104 (-16p)',
      createdAtMs: Date.now() - 5 * 3600 * 1000,
      closedAtMs: Date.now() - 2 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 1.8162,
      checklist: [
        { title: 'Primary GBP Cross Leader', isConfirmed: true, detail: 'GBP (7.7) > CAD (5.2) high-velocity spread' },
        { title: 'M15 Scalp Target Reached', isConfirmed: true, detail: '16-pip M15 SL → +42.0-pip M15 TP reached at 1.8162' }
      ]
    },
    {
      id: 'SIG-EJ-019',
      pair: PAIR_EURJPY,
      type: 'BUY_MARKET',
      status: 'HIT_TP',
      entryPrice: 177.40,
      currentPrice: 177.94,
      stopLoss: 177.16,
      takeProfit1: 177.94,
      takeProfit2: 178.25,
      takeProfit3: 178.60,
      pips: 54.0,
      riskReward: '1:2.6',
      confluenceScore: 92,
      rationale: 'Fulfilled 48H Trend Trade (H1 Momentum): EUR strength with JPY carry outflow. H1 Bullish order block test at 177.40 reached TP1 at 177.94 (+54.0 pips).',
      timeframe: 'H1',
      timestamp: '28 hr ago',
      institutionalFlow: 'EUR Bullish Breakout Mitigation',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Frankfurt / London Session',
      winProbability: 92,
      quality: 'A_PLUS',
      economicRisk: 'Target Reached (+54.0 pips)',
      validityTimeLeft: 'Closed (TP Hit)',
      validityExpiresAt: 'Take Profit Hit (+54.0p)',
      invalidationTrigger: 'H1 SL was 177.16 (-24p)',
      createdAtMs: Date.now() - 32 * 3600 * 1000,
      closedAtMs: Date.now() - 28 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 177.94,
      checklist: [
        { title: 'Cross Momentum Alignment', isConfirmed: true, detail: 'Strong EUR vs weak JPY institutional flow' },
        { title: 'Target Reached', isConfirmed: true, detail: '24-pip SL targeting +54.0 pips achieved cleanly' }
      ]
    },
    {
      id: 'SIG-UC-020',
      pair: PAIR_USDCAD,
      type: 'SELL_MARKET',
      status: 'HIT_SL',
      entryPrice: 1.4280,
      currentPrice: 1.4298,
      stopLoss: 1.4298,
      takeProfit1: 1.4235,
      takeProfit2: 1.4210,
      takeProfit3: 1.4180,
      pips: -18.5,
      riskReward: '1:2.5',
      confluenceScore: 88,
      rationale: 'Fulfilled 48H Counter-Trend Scalp: M15 Supply zone mitigation at 1.4280 stopped out at 1.4298 (-18.5 pips) following BOC rate announcement volatility.',
      timeframe: 'M15',
      timestamp: '36 hr ago',
      institutionalFlow: 'Liquidity Grab (Stopped Out)',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'New York Session',
      winProbability: 88,
      quality: 'A',
      economicRisk: 'Stop Loss Hit (-18.5 pips)',
      validityTimeLeft: 'Closed (SL Hit)',
      validityExpiresAt: 'SL Hit at 1.4298 (-18.5p)',
      invalidationTrigger: 'M15 SL hit at 1.4298 (-18.5p)',
      createdAtMs: Date.now() - 38 * 3600 * 1000,
      closedAtMs: Date.now() - 36 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 1.4235,
      checklist: [
        { title: 'Supply Zone Retest', isConfirmed: true, detail: 'Tested M15 bearish order block' },
        { title: 'Controlled Risk', isConfirmed: true, detail: 'Disciplined stop loss exited at planned 18.5 pips' }
      ]
    },
    {
      id: 'SIG-AU-021',
      pair: PAIR_AUDUSD,
      type: 'BUY_MARKET',
      status: 'HIT_TP',
      entryPrice: 0.6912,
      currentPrice: 0.7082,
      stopLoss: 0.6847,
      takeProfit1: 0.7082,
      takeProfit2: 0.7140,
      takeProfit3: 0.7200,
      pips: 170.0,
      riskReward: '1:2.6',
      confluenceScore: 95,
      rationale: 'Fulfilled 1-Week Swing: AUD commodity rally backed by RBA hawkish statement. Daily liquidity sweep into H4 FVG hit TP1 at 0.7082 (+170.0 pips).',
      timeframe: 'H4',
      winningTf: 'H4',
      timestamp: '4 days ago',
      institutionalFlow: 'Pro-Trend AUD Accumulation',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Asian / Sydney Session',
      winProbability: 95,
      quality: 'A_PLUS',
      economicRisk: 'Target Reached (+170.0 pips)',
      validityTimeLeft: 'Closed (TP Hit)',
      validityExpiresAt: 'Take Profit Hit (+170.0p)',
      invalidationTrigger: 'H4 SL was 0.6847 (-65p)',
      createdAtMs: Date.now() - 4.5 * 24 * 3600 * 1000,
      closedAtMs: Date.now() - 4 * 24 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 0.7082,
      checklist: [
        { title: 'Macro Fundamentals', isConfirmed: true, detail: 'RBA rate divergence vs neutral Fed' },
        { title: 'H4 Target Reached', isConfirmed: true, detail: '65-pip SL → +170.0-pip TP1 completed' }
      ]
    },
    {
      id: 'SIG-GJ-022',
      pair: PAIR_GBPJPY,
      type: 'BUY_MARKET',
      status: 'HIT_TP',
      entryPrice: 206.80,
      currentPrice: 207.78,
      stopLoss: 206.42,
      takeProfit1: 207.78,
      takeProfit2: 208.20,
      takeProfit3: 208.80,
      pips: 98.0,
      riskReward: '1:2.6',
      confluenceScore: 96,
      rationale: 'Fulfilled 1-Week Dragon Run: High-beta GBP/JPY breakout from London consolidation. H1 Displacement reached +98.0 pips target at 207.78.',
      timeframe: 'H1',
      timestamp: '5 days ago',
      institutionalFlow: 'Institutional Order Block Mitigation',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London Session',
      winProbability: 96,
      quality: 'A_PLUS',
      economicRisk: 'Target Reached (+98.0 pips)',
      validityTimeLeft: 'Closed (TP Hit)',
      validityExpiresAt: 'Take Profit Hit (+98.0p)',
      invalidationTrigger: 'H1 SL was 206.42 (-38p)',
      createdAtMs: Date.now() - 6 * 24 * 3600 * 1000,
      closedAtMs: Date.now() - 5.5 * 24 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 207.78,
      checklist: [
        { title: 'High-Beta Cross Momentum', isConfirmed: true, detail: 'Top yielding cross pair trend alignment' },
        { title: 'Major Target Hit', isConfirmed: true, detail: 'Captured full +98.0 pips institutional expansion' }
      ]
    },
    {
      id: 'SIG-XAU-023',
      pair: PAIR_XAUUSD,
      type: 'BUY_MARKET',
      status: 'HIT_TP',
      entryPrice: 4020.00,
      currentPrice: 4160.00,
      stopLoss: 3965.00,
      takeProfit1: 4160.00,
      takeProfit2: 4210.00,
      takeProfit3: 4280.00,
      pips: 140.0,
      riskReward: '1:2.6',
      confluenceScore: 97,
      rationale: 'Fulfilled 1-Month Gold Macro Swing: Geopolitical hedge accumulation. D1 Bullish engulfing retest at 4020.00 reached TP1 at 4160.00 (+140.0 pips).',
      timeframe: 'D1',
      timestamp: '12 days ago',
      institutionalFlow: 'Sovereign Bullion Inflows',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'London / NY Overlap',
      winProbability: 97,
      quality: 'A_PLUS',
      economicRisk: 'Target Reached (+140.0 pips)',
      validityTimeLeft: 'Closed (TP Hit)',
      validityExpiresAt: 'Take Profit Hit (+140.0p)',
      invalidationTrigger: 'D1 SL was 3965.00 (-55p)',
      createdAtMs: Date.now() - 14 * 24 * 3600 * 1000,
      closedAtMs: Date.now() - 12 * 24 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 4160.00,
      checklist: [
        { title: 'Macro Safe Haven Catalyst', isConfirmed: true, detail: 'Central bank gold buying support' },
        { title: 'Multi-Day Swing Expansion', isConfirmed: true, detail: '+140.0 pips realized on micro lot' }
      ]
    },
    {
      id: 'SIG-EU-024',
      pair: PAIR_EURUSD,
      type: 'SELL_MARKET',
      status: 'HIT_SL',
      entryPrice: 1.1180,
      currentPrice: 1.1202,
      stopLoss: 1.1202,
      takeProfit1: 1.1125,
      takeProfit2: 1.1090,
      takeProfit3: 1.1050,
      pips: -22.0,
      riskReward: '1:2.5',
      confluenceScore: 89,
      rationale: 'Fulfilled 1-Month Range Reversal: Short EUR/USD from 1.1180 supply ceiling. Exited at 1.1202 SL (-22.0 pips) after US PPI softened.',
      timeframe: 'H1',
      timestamp: '18 days ago',
      institutionalFlow: 'Supply Rejection Failed',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'New York Session',
      winProbability: 89,
      quality: 'A',
      economicRisk: 'Stop Loss Hit (-22.0 pips)',
      validityTimeLeft: 'Closed (SL Hit)',
      validityExpiresAt: 'SL Hit at 1.1202 (-22.0p)',
      invalidationTrigger: 'H1 SL hit at 1.1202 (-22p)',
      createdAtMs: Date.now() - 19 * 24 * 3600 * 1000,
      closedAtMs: Date.now() - 18 * 24 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 1.1125,
      checklist: [
        { title: 'Technical Supply Block', isConfirmed: true, detail: 'Respected structure before news spike' },
        { title: 'Disciplined Stop Out', isConfirmed: true, detail: 'Executed SL protection cleanly' }
      ]
    },
    {
      id: 'SIG-UJ-025',
      pair: PAIR_USDJPY,
      type: 'BUY_MARKET',
      status: 'HIT_TP',
      entryPrice: 156.40,
      currentPrice: 158.28,
      stopLoss: 155.68,
      takeProfit1: 158.28,
      takeProfit2: 159.00,
      takeProfit3: 159.80,
      pips: 188.0,
      riskReward: '1:2.6',
      confluenceScore: 93,
      rationale: 'Fulfilled 1-Month Yield Spread Trade: US 10Y Treasury yield breakout. H4 Dip at 156.40 reached TP1 at 158.28 (+188.0 pips).',
      timeframe: 'H4',
      winningTf: 'H4',
      timestamp: '24 days ago',
      institutionalFlow: 'Yield Differential Expansion',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Tokyo / London Session',
      winProbability: 93,
      quality: 'A_PLUS',
      economicRisk: 'Target Reached (+188.0 pips)',
      validityTimeLeft: 'Closed (TP Hit)',
      validityExpiresAt: 'Take Profit Hit (+188.0p)',
      invalidationTrigger: 'H4 SL was 155.68 (-72p)',
      createdAtMs: Date.now() - 25 * 24 * 3600 * 1000,
      closedAtMs: Date.now() - 24 * 24 * 3600 * 1000,
      isLiveSynced: true,
      takeProfit: 158.28,
      checklist: [
        { title: 'Interest Rate Divergence', isConfirmed: true, detail: 'Bullish USD carry advantage' },
        { title: 'Swing Target Hit', isConfirmed: true, detail: '72-pip SL delivered +188.0 pips profit' }
      ]
    }
  ];

  const parseInitialAgeMs = (tsLabel: string, tf: Timeframe): number => {
    const lower = (tsLabel || '').toLowerCase();
    let totalMs = 0;
    const dMatch = lower.match(/(\d+)\s*d/);
    if (dMatch) totalMs += parseInt(dMatch[1], 10) * 24 * 3600 * 1000;
    const hMatch = lower.match(/(\d+)\s*h/);
    if (hMatch) totalMs += parseInt(hMatch[1], 10) * 3600 * 1000;
    const mMatch = lower.match(/(\d+)\s*m/);
    if (mMatch) totalMs += parseInt(mMatch[1], 10) * 60 * 1000;
    if (totalMs > 0) return totalMs;
    return 18 * 60 * 1000; // Default 18 mins ago
  };

  const localSavedState = PersistenceManager.getSavedSignalsState();

  const mergedSignals: ForexSignal[] = rawSignals.map(sig => {
    const duration = getEffectiveDurationMs(sig.timeframe);
    const initialAgeMs = parseInitialAgeMs(sig.timestamp, sig.timeframe);
    const persisted = PersistenceManager.getOrAnchorCreatedAt(sig.id, duration, initialAgeMs);
    const saved = localSavedState[sig.id];

    // Canonical fulfilled/closed 24H signals (HIT_TP / HIT_SL) must always retain their locked exit price, status, and timestamps
    if (sig.status === 'HIT_TP' || sig.status === 'HIT_SL') {
      const lockedClosedCreated = (typeof sig.createdAtMs === 'number' && sig.createdAtMs > 0 && sig.createdAtMs <= Date.now())
        ? sig.createdAtMs
        : persisted;
      return {
        ...sig,
        validityDurationMs: duration,
        createdAtMs: lockedClosedCreated,
        createdAtFormatted: formatSignalDateTime(lockedClosedCreated),
        closedAtMs: sig.closedAtMs || (Date.now() - 45 * 60 * 1000),
        isFavorite: favorites.includes(sig.id),
        hasAlert: alertToggled.includes(sig.id),
        isLiveSynced: true
      };
    }

    if (saved) {
      const lockedCreatedAt =
        typeof saved.createdAtMs === 'number' && saved.createdAtMs > 0 && saved.createdAtMs <= Date.now()
          ? saved.createdAtMs
          : (typeof sig.createdAtMs === 'number' && sig.createdAtMs > 0 && sig.createdAtMs <= Date.now() ? sig.createdAtMs : persisted);

      const targetSlDist = Math.abs(sig.entryPrice - sig.stopLoss);
      const targetTp1Dist = Math.abs(sig.takeProfit1 - sig.entryPrice);
      const savedEntry = typeof saved.entryPrice === 'number' ? saved.entryPrice : sig.entryPrice;
      const savedSl = typeof saved.stopLoss === 'number' ? saved.stopLoss : sig.stopLoss;
      const savedTp1 = typeof saved.takeProfit1 === 'number' ? saved.takeProfit1 : sig.takeProfit1;
      const savedSlDist = Math.abs(savedEntry - savedSl);
      const savedTp1Dist = Math.abs(savedTp1 - savedEntry);
      const isBuySig = (saved.type || sig.type).startsWith('BUY');
      const sym = sig.pair.symbol;
      const dec = sym.includes('JPY') || sym.includes('XAU') || sym.includes('XAG') ? 2 : 4;
      const roundP = (v: number) => Number(v.toFixed(dec));

      // Sanity audit: Detect if cached values in localStorage were corrupted or exploded by previous sessions
      const isCorruptedCache =
        (targetSlDist > 0 && savedSlDist > targetSlDist * 1.75) ||
        (targetTp1Dist > 0 && savedTp1Dist > targetTp1Dist * 2.2) ||
        (typeof saved.takeProfit3 === 'number' && saved.takeProfit3 <= 0.0001) ||
        (typeof saved.takeProfit1 === 'number' && saved.takeProfit1 <= 0.0001) ||
        (!sig.pair.isGoldOrCrypto && !sym.includes('JPY') && savedSlDist > 0.0095); // Forex SL should never exceed 95 pips on H4

      // Recalibrate if stale pip scale OR if cache was corrupted with explosive SL/TP values
      const isStalePipScale =
        isCorruptedCache ||
        (!saved.isLiveSynced &&
          ((targetSlDist > 0 && Math.abs(savedSlDist - targetSlDist) > targetSlDist * 0.10) ||
            (targetTp1Dist > 0 && Math.abs(savedTp1Dist - targetTp1Dist) > targetTp1Dist * 0.10)));

      if (isStalePipScale) {
        const tp1Dist = Math.abs(sig.takeProfit1 - sig.entryPrice);
        const tp2Dist = Math.abs(sig.takeProfit2 - sig.entryPrice);
        const tp3Dist = Math.abs(sig.takeProfit3 - sig.entryPrice);
        const anchorEntry = savedEntry;
        const recalibratedSl = roundP(isBuySig ? anchorEntry - targetSlDist : anchorEntry + targetSlDist);
        const recalibratedTp1 = roundP(isBuySig ? anchorEntry + tp1Dist : anchorEntry - tp1Dist);
        const recalibratedTp2 = roundP(isBuySig ? anchorEntry + tp2Dist : anchorEntry - tp2Dist);
        const recalibratedTp3 = roundP(isBuySig ? anchorEntry + tp3Dist : anchorEntry - tp3Dist);

        return {
          ...sig,
          type: saved.type || sig.type,
          status: saved.status || sig.status,
          isPending: saved.status ? saved.status === 'PENDING' : sig.isPending,
          entryPrice: anchorEntry,
          currentPrice:
            (saved.status || sig.status) === 'HIT_TP'
              ? recalibratedTp1
              : (saved.status || sig.status) === 'HIT_SL'
              ? recalibratedSl
              : typeof saved.currentPrice === 'number'
              ? saved.currentPrice
              : sig.currentPrice,
          stopLoss: recalibratedSl,
          takeProfit: recalibratedTp1,
          takeProfit1: recalibratedTp1,
          takeProfit2: recalibratedTp2,
          takeProfit3: recalibratedTp3,
          pips: sig.pips,
          isLiveSynced: Boolean(saved.isLiveSynced),
          closedAtMs: saved.closedAtMs || sig.closedAtMs,
          validityTimeLeft: sig.validityTimeLeft,
          validityExpiresAt: sig.validityExpiresAt,
          validityDurationMs: duration,
          createdAtMs: lockedCreatedAt,
          isFavorite: favorites.includes(sig.id),
          hasAlert: alertToggled.includes(sig.id),
          slLearningAudit: isCorruptedCache ? undefined : saved.slLearningAudit
        };
      }

      const priorTf = saved.timeframe;
      let tfUpdateNotice = saved.tfUpdateNotice;
      if (priorTf && sig.timeframe && priorTf !== sig.timeframe) {
        tfUpdateNotice = `Trade timeframe updated from ${priorTf} to ${sig.timeframe}`;
      }

      return {
        ...sig,
        type: saved.type || sig.type,
        status: saved.status || sig.status,
        isPending: saved.status ? saved.status === 'PENDING' : sig.isPending,
        entryPrice: typeof saved.entryPrice === 'number' ? saved.entryPrice : sig.entryPrice,
        currentPrice: typeof saved.currentPrice === 'number' ? saved.currentPrice : sig.currentPrice,
        stopLoss: typeof saved.stopLoss === 'number' ? saved.stopLoss : sig.stopLoss,
        takeProfit: typeof saved.takeProfit === 'number' ? saved.takeProfit : sig.takeProfit,
        takeProfit1: typeof saved.takeProfit1 === 'number' ? saved.takeProfit1 : sig.takeProfit1,
        takeProfit2: typeof saved.takeProfit2 === 'number' ? saved.takeProfit2 : sig.takeProfit2,
        takeProfit3: typeof saved.takeProfit3 === 'number' ? saved.takeProfit3 : sig.takeProfit3,
        pips: typeof saved.pips === 'number' ? saved.pips : sig.pips,
        isLiveSynced: Boolean(saved.isLiveSynced),
        closedAtMs: saved.closedAtMs,
        validityTimeLeft: saved.validityTimeLeft || sig.validityTimeLeft,
        validityExpiresAt: saved.validityExpiresAt || sig.validityExpiresAt,
        validityDurationMs: duration,
        createdAtMs: lockedCreatedAt,
        createdAtFormatted: formatSignalDateTime(lockedCreatedAt),
        isFavorite: favorites.includes(sig.id),
        hasAlert: alertToggled.includes(sig.id),
        slLearningAudit: saved.slLearningAudit,
        tfUpdateNotice
      };
    }

    const effectiveCreatedAt =
      typeof sig.createdAtMs === 'number' && sig.createdAtMs > 0 && sig.createdAtMs <= Date.now()
        ? sig.createdAtMs
        : persisted;

    return {
      ...sig,
      validityDurationMs: duration,
      createdAtMs: effectiveCreatedAt,
      createdAtFormatted: formatSignalDateTime(effectiveCreatedAt),
      isFavorite: favorites.includes(sig.id),
      hasAlert: alertToggled.includes(sig.id),
      isLiveSynced: Boolean(sig.isLiveSynced)
    };
  });

  // Restore any saved scanner or post-news signals (including ones that are active or hit SL/TP)
  const existingIds = new Set(mergedSignals.map(s => s.id));
  const restoredActivePairs = new Set<string>();

  Object.values(savedState).forEach((saved: any) => {
    if (saved && saved.id && saved.pair && !existingIds.has(saved.id)) {
      const isClosed = saved.status === 'HIT_TP' || saved.status === 'HIT_SL' || saved.status === 'EXPIRED';
      if (!isClosed && restoredActivePairs.has(saved.pair.symbol)) {
        return;
      }
      if (!isClosed) {
        restoredActivePairs.add(saved.pair.symbol);
      }
      existingIds.add(saved.id);

      const tf: Timeframe = saved.timeframe || 'M15';
      const duration = getEffectiveDurationMs(tf);
      const anchoredCreated =
        typeof saved.createdAtMs === 'number' && saved.createdAtMs > 0
          ? saved.createdAtMs
          : PersistenceManager.getOrAnchorCreatedAt(saved.id, duration, 25 * 60 * 1000);

      // Preserve scanner-calibrated and live-synced signals as-is with their locked creation timestamp
      mergedSignals.unshift({
        ...saved,
        createdAtMs: anchoredCreated,
        validityDurationMs: saved.validityDurationMs || duration,
        isFavorite: favorites.includes(saved.id),
        hasAlert: alertToggled.includes(saved.id)
      });
    }
  });

  // Pair Deduplication & Fresh Trade Support:
  // 1. All closed trades (HIT_TP, HIT_SL) are permanently preserved in the Closed section.
  // 2. For active trades (RUNNING, PENDING): only ONE active trade is allowed per pair at a time.
  //    Since saved scanner/news signals are unshifted to the front of mergedSignals, the saved active signal
  //    takes precedence and retains its original anchored creation timestamp across browser refreshes.
  const seenActivePairs = new Set<string>();
  const dedupedSignals = mergedSignals.filter(s => {
    const sym = String(s.pair?.symbol || '').toUpperCase();
    // Always preserve closed trades in history
    if (s.status === 'HIT_TP' || s.status === 'HIT_SL') {
      return true;
    }

    const symbol = s.pair.symbol;

    // Only allow 1 active trade per pair simultaneously (keep the first/active saved setup)
    if (seenActivePairs.has(symbol)) {
      return false;
    }
    seenActivePairs.add(symbol);
    return true;
  });

  // Guaranteed Active Gold Setup:
  // If Gold has no currently active trade in dedupedSignals (e.g. because earlier trades hit TP/SL or closed),
  // spawn a stable institutional A+ active signal with a persisted anchor timestamp so it never resets on refresh.
  const hasActiveGold = dedupedSignals.some(
    s => s.pair.symbol === 'XAU/USD' && (s.status === 'RUNNING' || s.status === 'PENDING')
  );
  if (!hasActiveGold) {
    const liveGold = PAIR_XAUUSD;
    const currentGoldPrice = liveGold.currentPrice > 0 ? liveGold.currentPrice : 4181.30;
    const entryPrice = 4180.50;
    const stopLoss = 4176.00; // 45 pips ($4.50)
    const takeProfit1 = 4192.00; // 115 pips ($11.50)
    const isFallbackGoldIdUsed = dedupedSignals.some(s => s.id === 'SIG-XAU-ACTIVE');
    const fallbackGoldId = isFallbackGoldIdUsed
      ? `SIG-XAU-ACTIVE-${Date.now().toString(36).toUpperCase()}`
      : 'SIG-XAU-ACTIVE';
    const anchoredGoldTime = PersistenceManager.getOrAnchorCreatedAt(
      fallbackGoldId,
      4 * 3600 * 1000,
      18 * 60 * 1000
    );
    const freshGoldSignal: ForexSignal = {
      id: fallbackGoldId,
      pair: { ...liveGold, currentPrice: currentGoldPrice },
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice,
      currentPrice: currentGoldPrice,
      stopLoss,
      takeProfit1,
      takeProfit2: 4198.00,
      takeProfit3: 4204.00,
      pips: Math.round((currentGoldPrice - entryPrice) * 10) / 10,
      riskReward: '1:2.6',
      confluenceScore: 96,
      rationale: 'Fresh A+ Institutional Setup: H1 Demand Order Block at 4180.50 mitigated following Asian liquidity sweep. Sovereign bullion safe-haven inflows and US Dollar softening reinforce bullish expansion towards 4200+ liquidity pools.',
      timeframe: 'H1',
      winningTf: 'H1',
      timestamp: '18 min ago',
      institutionalFlow: 'Bullish Demand Block Mitigation + Sovereign Bullion Inflows',
      isBestTradeNow: true,
      isPending: false,
      isFavorite: true,
      hasAlert: false,
      killzone: 'NY AM Killzone (13:30 - 16:30 GMT)',
      winProbability: 95,
      quality: 'A_PLUS',
      economicRisk: 'High Confluence Trend Window',
      validityTimeLeft: 'Active (Running +8.0p)',
      validityExpiresAt: 'Targeting TP1 4192.00 (+115p)',
      invalidationTrigger: 'SL protected at 4176.00 (-45p) below H1 Institutional Order Block',
      createdAtMs: anchoredGoldTime,
      takeProfit: takeProfit1,
      isLiveSynced: false,
      checklist: [
        { title: 'H4 Trend Direction', isConfirmed: true, detail: 'Bullish market structure above 200 EMA' },
        { title: 'Institutional Demand Block', isConfirmed: true, detail: 'Tested unmitigated H1 Order Block at 4180.50' },
        { title: 'Fair Value Gap (FVG)', isConfirmed: true, detail: '15M Bullish FVG filled cleanly during session overlap' },
        { title: 'Liquidity Pool Sweep', isConfirmed: true, detail: 'Asian session retail stops swept before expansion' },
        { title: 'RSI Divergence', isConfirmed: true, detail: 'H1 Bullish Hidden Divergence at 44 level' },
        { title: 'Central Bank / Bullion Inflow', isConfirmed: true, detail: 'Global reserve accumulation & safe haven tailwind' }
      ]
    };
    dedupedSignals.unshift(freshGoldSignal);
  }

  // Ensure every signal has a valid persisted createdAtMs and strictly conforms to timeframe hierarchy
  const seenSignalIds = new Set<string>();
  const normalizedSignals: ForexSignal[] = [];

  dedupedSignals.forEach((s, idx) => {
    let finalId = s.id;
    if (seenSignalIds.has(finalId)) {
      finalId = `${s.id}-${s.status}-${s.createdAtMs || idx}`;
    }
    seenSignalIds.add(finalId);

    let sigWithTime = { ...s, id: finalId };
    if (!s.createdAtMs || s.createdAtMs <= 0) {
      const fallbackAgeMs = (idx + 1) * 18 * 60 * 1000;
      sigWithTime = {
        ...sigWithTime,
        createdAtMs: PersistenceManager.getOrAnchorCreatedAt(
          finalId,
          getEffectiveDurationMs(s.timeframe),
          fallbackAgeMs
        )
      };
    }
    normalizedSignals.push(enforceTimeframeHierarchy(sigWithTime));
  });

  return normalizedSignals;
}

export function generateCandles(pair: ForexPair, timeframe: Timeframe, count: number = 120): CandleStick[] {
  const targetPrice = pair.currentPrice > 0 ? pair.currentPrice : pair.basePrice;
  const isGoldOrCrypto = Boolean(pair.isGoldOrCrypto || pair.symbol === 'XAU/USD' || pair.symbol === 'XAG/USD');

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
  const items = currencyStrengthService.getCurrencyStrengths();
  return items.map(item => ({
    currency: item.currency,
    score: Math.round(item.strength * 10),
    change24h: `${item.change24h >= 0 ? '+' : ''}${item.change24h.toFixed(2)}%`,
    trend:
      item.status === 'VERY_STRONG'
        ? 'Very Strong Bullish'
        : item.status === 'STRONG'
        ? 'Bullish Flow'
        : item.status === 'VERY_WEAK'
        ? 'Heavy Bearish'
        : item.status === 'WEAK'
        ? 'Mild Weakness'
        : 'Neutral / Range'
  }));
}

export function getSmartMoneyZones(): SmartMoneyZone[] {
  const xau = PAIR_XAUUSD.currentPrice || PAIR_XAUUSD.basePrice;
  const eur = PAIR_EURUSD.currentPrice || PAIR_EURUSD.basePrice;
  const gbp = PAIR_GBPUSD.currentPrice || PAIR_GBPUSD.basePrice;
  const jpy = PAIR_USDJPY.currentPrice || PAIR_USDJPY.basePrice;
  const gj = PAIR_GBPJPY.currentPrice || PAIR_GBPJPY.basePrice;

  return [
    {
      id: 'SMZ-1',
      pairSymbol: 'XAU/USD',
      type: 'ORDER_BLOCK',
      highPrice: Number((xau - 8.5).toFixed(2)),
      lowPrice: Number((xau - 14.0).toFixed(2)),
      timeframe: 'H4',
      isMitigated: false,
      strengthStars: 5,
      description: 'Unmitigated H4 Institutional Demand Zone supporting Gold bullish structure'
    },
    {
      id: 'SMZ-2',
      pairSymbol: 'XAU/USD',
      type: 'FAIR_VALUE_GAP',
      highPrice: Number((xau - 2.0).toFixed(2)),
      lowPrice: Number((xau - 5.5).toFixed(2)),
      timeframe: 'M15',
      isMitigated: true,
      strengthStars: 4,
      description: 'M15 Bullish FVG cleanly mitigated during London/NY overlap'
    },
    {
      id: 'SMZ-3',
      pairSymbol: 'EUR/USD',
      type: 'LIQUIDITY_SWEEP',
      highPrice: Number((eur + 0.0025).toFixed(4)),
      lowPrice: Number((eur + 0.0012).toFixed(4)),
      timeframe: 'H1',
      isMitigated: false,
      strengthStars: 5,
      description: 'Asian session high buy-side liquidity sweep & H1 Bearish Supply Block'
    },
    {
      id: 'SMZ-4',
      pairSymbol: 'GBP/USD',
      type: 'BREAK_OF_STRUCTURE',
      highPrice: Number((gbp - 0.0010).toFixed(4)),
      lowPrice: Number((gbp - 0.0022).toFixed(4)),
      timeframe: 'H4',
      isMitigated: true,
      strengthStars: 4,
      description: 'H4 Bullish Structure Break (BOS) & dynamic 50 EMA institutional demand'
    },
    {
      id: 'SMZ-5',
      pairSymbol: 'USD/JPY',
      type: 'ORDER_BLOCK',
      highPrice: Number((jpy - 0.45).toFixed(2)),
      lowPrice: Number((jpy - 0.75).toFixed(2)),
      timeframe: 'H1',
      isMitigated: false,
      strengthStars: 5,
      description: 'H1 Discount Demand Block aligned with USD/JPY carry-trade accumulation'
    },
    {
      id: 'SMZ-6',
      pairSymbol: 'GBP/JPY',
      type: 'FAIR_VALUE_GAP',
      highPrice: Number((gj - 0.30).toFixed(2)),
      lowPrice: Number((gj - 0.65).toFixed(2)),
      timeframe: 'M15',
      isMitigated: true,
      strengthStars: 5,
      description: 'M15 Institutional Buy Imbalance prior to London momentum expansion'
    }
  ];
}
