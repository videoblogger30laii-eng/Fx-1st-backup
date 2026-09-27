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

export const PAIR_XAUUSD: ForexPair = { symbol: 'XAU/USD', name: 'Gold / US Dollar', basePrice: 4286.20, currentPrice: 4286.20, pipDigits: 2, isGoldOrCrypto: true, spreadPips: 1.2 };
export const PAIR_EURUSD: ForexPair = { symbol: 'EUR/USD', name: 'Euro / US Dollar', basePrice: 1.1396, currentPrice: 1.1396, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_GBPUSD: ForexPair = { symbol: 'GBP/USD', name: 'British Pound / USD', basePrice: 1.3243, currentPrice: 1.3243, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_USDJPY: ForexPair = { symbol: 'USD/JPY', name: 'US Dollar / Yen', basePrice: 157.45, currentPrice: 157.45, pipDigits: 2, spreadPips: 0.2 };
export const PAIR_USDCHF: ForexPair = { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', basePrice: 0.8286, currentPrice: 0.8286, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_AUDUSD: ForexPair = { symbol: 'AUD/USD', name: 'Aussie / USD', basePrice: 0.7025, currentPrice: 0.7025, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_NZDUSD: ForexPair = { symbol: 'NZD/USD', name: 'Kiwi / USD', basePrice: 0.5666, currentPrice: 0.5666, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_USDCAD: ForexPair = { symbol: 'USD/CAD', name: 'US Dollar / CAD', basePrice: 1.4137, currentPrice: 1.4137, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_EURGBP: ForexPair = { symbol: 'EUR/GBP', name: 'Euro / British Pound', basePrice: 0.8605, currentPrice: 0.8605, pipDigits: 4, spreadPips: 0.2 };
export const PAIR_EURJPY: ForexPair = { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', basePrice: 179.43, currentPrice: 179.43, pipDigits: 2, spreadPips: 0.2 };
export const PAIR_GBPJPY: ForexPair = { symbol: 'GBP/JPY', name: 'Pound / Yen (The Dragon)', basePrice: 208.52, currentPrice: 208.52, pipDigits: 2, spreadPips: 0.2 };
export const PAIR_US30: ForexPair = { symbol: 'US30', name: 'Wall Street 30 Index', basePrice: 51500.0, currentPrice: 51500.0, pipDigits: 1, isGoldOrCrypto: true, spreadPips: 1.5 };
export const PAIR_NAS100: ForexPair = { symbol: 'NAS100', name: 'US Tech 100 Index', basePrice: 26900.0, currentPrice: 26900.0, pipDigits: 1, isGoldOrCrypto: true, spreadPips: 1.0 };
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

export function isForexMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const hour = now.getUTCHours();
  if (day === 5 && hour >= 22) return false;
  if (day === 6) return false;
  if (day === 0 && hour < 22) return false;
  return true;
}

export function getCurrentGmtTimeFormatted(): string {
  const now = new Date();
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const minute = String(now.getUTCMinutes()).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = days[now.getUTCDay()];
  return `${hour}:${minute} GMT • ${dayName}`;
}

export function getTradingSessions(): TradingSession[] {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const hourGmt = now.getUTCHours();

  const isFridayAfterClose = dayOfWeek === 5 && hourGmt >= 22;
  const isSaturday = dayOfWeek === 6;
  const isSundayBeforeOpen = dayOfWeek === 0 && hourGmt < 22;
  const isWeekend = isFridayAfterClose || isSaturday || isSundayBeforeOpen;

  const isLondonOpen = !isWeekend && (dayOfWeek >= 1 && dayOfWeek <= 5) && (hourGmt >= 8 && hourGmt <= 16);
  const isNewYorkOpen = !isWeekend && (dayOfWeek >= 1 && dayOfWeek <= 5) && (hourGmt >= 13 && hourGmt <= 21);
  const isTokyoOpen = !isWeekend && (dayOfWeek >= 1 && dayOfWeek <= 5) && (hourGmt >= 0 && hourGmt <= 8);
  const isSydneyOpen = isSaturday ? false : dayOfWeek === 0 ? hourGmt >= 22 : dayOfWeek === 5 ? hourGmt < 7 : (hourGmt >= 22 || hourGmt < 7);

  const status = (isOpen: boolean): string => {
    if (isOpen) return 'OPEN • ACTIVE';
    if (isWeekend) return 'CLOSED • WEEKEND';
    return 'CLOSED';
  };

  return [
    {
      name: 'London Session',
      city: 'London',
      gmtHours: '08:00 - 17:00 GMT',
      isOpen: isLondonOpen,
      volatility: isLondonOpen ? 'High Volatility (Institutional Peak)' : isWeekend ? 'Market Closed for Weekend' : 'Off-Hours Liquidity',
      statusText: status(isLondonOpen)
    },
    {
      name: 'New York Session',
      city: 'New York',
      gmtHours: '13:00 - 22:00 GMT',
      isOpen: isNewYorkOpen,
      volatility: isNewYorkOpen ? 'Overlapping NY Rush' : isWeekend ? 'Market Closed for Weekend' : 'Off-Hours Liquidity',
      statusText: status(isNewYorkOpen)
    },
    {
      name: 'Tokyo Session',
      city: 'Tokyo',
      gmtHours: '00:00 - 09:00 GMT',
      isOpen: isTokyoOpen,
      volatility: isTokyoOpen ? 'Asian Liquidity & Yen Flow' : isWeekend ? 'Market Closed for Weekend' : 'Closed',
      statusText: status(isTokyoOpen)
    },
    {
      name: 'Sydney Session',
      city: 'Sydney',
      gmtHours: '22:00 - 07:00 GMT',
      isOpen: isSydneyOpen,
      volatility: isSydneyOpen ? 'Pacific Open & Baseline Spread' : isWeekend ? 'Opens Sunday 22:00 GMT' : 'Closed',
      statusText: status(isSydneyOpen)
    }
  ];
}

export function getEffectiveDurationMs(timeframe: Timeframe): number {
  switch (timeframe) {
    case 'M5': return 25 * 60 * 1000;
    case 'M15': return 90 * 60 * 1000;
    case 'H1': return 3 * 3600 * 1000;
    case 'H4': return 12 * 3600 * 1000;
    case 'D1': return 36 * 3600 * 1000;
  }
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
      entryPrice: 4272.50,
      currentPrice: 4279.80,
      stopLoss: 4258.00,
      takeProfit1: 4298.00,
      takeProfit2: 4320.00,
      takeProfit3: 4350.00,
      pips: 73.0,
      riskReward: '1:3.3',
      confluenceScore: 95,
      rationale: 'A+ Confluence: H1 Institutional Demand Block at 4272.50 + London sweep of Asian liquidity. Bullish momentum continuing toward 4298 TP1.',
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
      validityTimeLeft: 'Active (Running +73p)',
      validityExpiresAt: 'Targeting TP1 4298.00',
      invalidationTrigger: 'SL protected at 4258.00 below H4 Order Block',
      createdAtMs: Date.now(),
      takeProfit: 4298.00,
      checklist: [
        { title: 'H4 Trend Direction', isConfirmed: true, detail: 'Bullish market structure above 200 EMA' },
        { title: 'Institutional Demand Block', isConfirmed: true, detail: 'Tested unmitigated H4 Order Block at 4272.50' },
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
      entryPrice: 1.1370,
      currentPrice: 1.1400,
      stopLoss: 1.1335,
      takeProfit1: 1.1440,
      takeProfit2: 1.1490,
      takeProfit3: 1.1560,
      pips: 0.0,
      riskReward: '1:3.4',
      confluenceScore: 91,
      rationale: 'Pending Buy Limit: Discount zone retest at London session low sweep. Resting order at 1.1370 awaiting mitigation.',
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
      validityTimeLeft: '2h 45m left to validate',
      validityExpiresAt: 'Expires at London/NY Overlap Close (16:30 GMT)',
      invalidationTrigger: 'Auto-cancels if price sweeps 1.1330 before fill',
      createdAtMs: Date.now(),
      takeProfit: 1.1440,
      checklist: [
        { title: 'Discount Entry Zone', isConfirmed: true, detail: 'Retesting 61.8% Fibonacci discount level' },
        { title: 'London Low Sweep', isConfirmed: true, detail: 'Retail stop-loss pool engineered and cleared' },
        { title: 'Pending Trigger Status', isConfirmed: true, detail: 'Limit order resting at 1.1370 pending tap' }
      ]
    },
    {
      id: 'SIG-GBP-003',
      pair: PAIR_GBPUSD,
      type: 'BUY_MARKET',
      status: 'RUNNING',
      entryPrice: 1.3225,
      currentPrice: 1.3255,
      stopLoss: 1.3185,
      takeProfit1: 1.3310,
      takeProfit2: 1.3365,
      takeProfit3: 1.3430,
      pips: 30.0,
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
      validityTimeLeft: 'Active Trade',
      validityExpiresAt: 'In Progress (+30 pips)',
      invalidationTrigger: 'SL at 1.3185',
      createdAtMs: Date.now(),
      takeProfit: 1.3310,
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
      entryPrice: 158.60,
      currentPrice: 158.20,
      stopLoss: 159.10,
      takeProfit1: 157.60,
      takeProfit2: 157.00,
      takeProfit3: 156.20,
      pips: 0.0,
      riskReward: '1:3.2',
      confluenceScore: 89,
      rationale: 'Pending Sell Limit: Premium Bearish Supply at 158.60. BOJ verbal intervention pressure creates strong ceiling.',
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
      validityTimeLeft: '3h 20m left to validate',
      validityExpiresAt: 'Expires at BOJ Window Close (18:00 GMT)',
      invalidationTrigger: 'Auto-cancels if price breaches 159.10 before 158.60 tap',
      createdAtMs: Date.now(),
      takeProfit: 157.60,
      checklist: [
        { title: 'Supply Order Block', isConfirmed: true, detail: 'H1 Institutional sell imbalance at 158.60' },
        { title: 'BOJ Verbal Defense', isConfirmed: true, detail: 'Government intervention barrier' }
      ]
    },
    {
      id: 'SIG-GJ-005',
      pair: PAIR_GBPJPY,
      type: 'BUY_STOP',
      status: 'RUNNING',
      entryPrice: 209.10,
      currentPrice: 209.64,
      stopLoss: 208.50,
      takeProfit1: 210.50,
      takeProfit2: 211.40,
      takeProfit3: 212.50,
      pips: 54.0,
      riskReward: '1:3.8',
      confluenceScore: 93,
      rationale: 'Buy Stop Momentum Execution: The Dragon explosive breakout above 209.10! H4 trendline retest with massive yen carry-trade momentum. Floating +54 pips profit.',
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
      validityTimeLeft: 'Active (+54 pips)',
      validityExpiresAt: 'Targeting TP1 210.50',
      invalidationTrigger: 'Trailing SL moved to 209.00 lock in profit',
      createdAtMs: Date.now(),
      takeProfit: 210.50,
      checklist: [
        { title: 'Dragon Volatility Expansion', isConfirmed: true, detail: 'Average true range expanded above 140 pips' },
        { title: 'Carry Flow Bias', isConfirmed: true, detail: 'Interest rate differential heavily favors GBP' }
      ]
    },
    {
      id: 'SIG-AUD-006',
      pair: PAIR_AUDUSD,
      type: 'BUY_MARKET',
      status: 'HIT_TP',
      entryPrice: 0.7010,
      currentPrice: 0.7046,
      stopLoss: 0.6985,
      takeProfit1: 0.7045,
      takeProfit2: 0.7085,
      takeProfit3: 0.7130,
      pips: 35.0,
      riskReward: '1:2.5',
      confluenceScore: 86,
      rationale: 'TP1 Smashed! Strong commodities rally driven by China stimulus package. Trend extension underway.',
      timeframe: 'M15',
      timestamp: '3 hrs ago',
      institutionalFlow: 'Commodity Superflow Surge',
      isBestTradeNow: false,
      isPending: false,
      isFavorite: false,
      hasAlert: false,
      killzone: 'Sydney / Tokyo Cross',
      winProbability: 86,
      quality: 'A',
      economicRisk: 'Trade Target Completed',
      validityTimeLeft: 'Target Reached',
      validityExpiresAt: 'Completed',
      invalidationTrigger: 'Closed at TP1',
      createdAtMs: Date.now() - 3 * 3600 * 1000,
      takeProfit: 0.7045,
      checklist: []
    },
    {
      id: 'SIG-US30-007',
      pair: PAIR_US30,
      type: 'BUY_STOP',
      status: 'RUNNING',
      entryPrice: 51370.0,
      currentPrice: 51500.0,
      stopLoss: 51220.0,
      takeProfit1: 51650.0,
      takeProfit2: 51850.0,
      takeProfit3: 52100.0,
      pips: 130.0,
      riskReward: '1:3.8',
      confluenceScore: 92,
      rationale: 'Buy Stop Opening Range: Wall Street Open Liquidity Sweep! Dow Jones swept previous day low and printed massive bullish engulfing pin bar above 51370.',
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
      validityTimeLeft: 'Active (+130 pts)',
      validityExpiresAt: 'Targeting TP1 51650',
      invalidationTrigger: 'SL at 51220',
      createdAtMs: Date.now(),
      takeProfit: 51650.0,
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
      entryPrice: 1.4135,
      currentPrice: 1.4099,
      stopLoss: 1.4170,
      takeProfit1: 1.4055,
      takeProfit2: 1.4005,
      takeProfit3: 1.3920,
      pips: 36.0,
      riskReward: '1:2.8',
      confluenceScore: 87,
      rationale: 'Market Execution (Instant Sell): Crude oil bounce pushing CAD higher. Double Top formation with bearish MACD divergence on H1.',
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
      validityTimeLeft: 'Active (+36 pips)',
      validityExpiresAt: 'Targeting TP1 1.4055',
      invalidationTrigger: 'SL at 1.4170',
      createdAtMs: Date.now(),
      takeProfit: 1.4055,
      checklist: [
        { title: 'Crude Oil Alignment', isConfirmed: true, detail: 'WTI Crude rally strengthening CAD' },
        { title: 'H1 Bearish Divergence', isConfirmed: true, detail: 'RSI/MACD lower high on retest of 1.4035' }
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
