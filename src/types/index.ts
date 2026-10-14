export type SignalType = 
  | 'BUY_LIMIT' 
  | 'SELL_LIMIT' 
  | 'BUY_STOP' 
  | 'SELL_STOP' 
  | 'BUY_MARKET' 
  | 'SELL_MARKET' 
  | 'BUY' 
  | 'SELL';

export interface SignalTypeConfig {
  label: string;
  isBuy: boolean;
  executionKind: string;
  isPendingOrder: boolean;
}

export const SIGNAL_TYPE_CONFIGS: Record<SignalType, SignalTypeConfig> = {
  BUY_LIMIT: { label: 'BUY LIMIT', isBuy: true, executionKind: 'Limit Order (Pullback to Discount)', isPendingOrder: true },
  SELL_LIMIT: { label: 'SELL LIMIT', isBuy: false, executionKind: 'Limit Order (Pullback to Premium)', isPendingOrder: true },
  BUY_STOP: { label: 'BUY STOP', isBuy: true, executionKind: 'Stop Order (Momentum Breakout)', isPendingOrder: true },
  SELL_STOP: { label: 'SELL STOP', isBuy: false, executionKind: 'Stop Order (Momentum Breakdown)', isPendingOrder: true },
  BUY_MARKET: { label: 'BUY (MARKET)', isBuy: true, executionKind: 'Market Execution (Instant Buy)', isPendingOrder: false },
  SELL_MARKET: { label: 'SELL (MARKET)', isBuy: false, executionKind: 'Market Execution (Instant Sell)', isPendingOrder: false },
  BUY: { label: 'BUY (MARKET)', isBuy: true, executionKind: 'Market Execution (Instant Buy)', isPendingOrder: false },
  SELL: { label: 'SELL (MARKET)', isBuy: false, executionKind: 'Market Execution (Instant Sell)', isPendingOrder: false },
};

export type SignalStatus = 'PENDING' | 'RUNNING' | 'HIT_TP' | 'HIT_SL';

export type SignalQuality = 'A_PLUS' | 'A' | 'B';

export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4' | 'D1';

export interface ConfluenceChecklistItem {
  title: string;
  isConfirmed: boolean;
  detail: string;
}

export type AssetCategory = 'ALL' | 'MAJORS' | 'MINORS' | 'METALS' | 'EXOTICS';

export function getAssetCategory(symbol: string): 'MAJORS' | 'MINORS' | 'METALS' {
  const sym = symbol.replace('/', '').toUpperCase();
  if (sym.startsWith('XAU') || sym.startsWith('GOLD') || sym.startsWith('XAG') || sym.startsWith('SILVER') || sym.includes('OIL')) {
    return 'METALS';
  }
  
  // 7 Traditional FX Majors (pairs containing USD with EUR, GBP, JPY, CHF, AUD, CAD, NZD)
  const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
  if (majorPairs.includes(sym)) {
    return 'MAJORS';
  }
  
  // FX Minors / Crosses (EURGBP, EURJPY, GBPJPY, AUDJPY, EURAUD, GBPCAD, CADJPY, NZDJPY, etc.)
  return 'MINORS';
}

export interface ForexPair {
  symbol: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  pipDigits: number;
  isGoldOrCrypto?: boolean;
  spreadPips: number;
  category?: 'MAJORS' | 'MINORS' | 'METALS';
  minMargin001?: number; // Estimated margin in USD needed to open 0.01 lot at standard 1:100 leverage
  pipValue001?: number; // Dollar value of 1 pip on 0.01 lot (typically $0.10)
  isMicroAccountFriendly?: boolean; // Safe to trade even on $10 - $50 micro balances
}

export interface ForexSignal {
  id: string;
  pair: ForexPair;
  type: SignalType;
  status: SignalStatus;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  pips: number;
  riskReward: string;
  confluenceScore: number;
  rationale: string;
  timeframe: Timeframe;
  timestamp: string;
  institutionalFlow: string;
  isBestTradeNow: boolean;
  isPending: boolean;
  isFavorite: boolean;
  hasAlert: boolean;
  checklist: ConfluenceChecklistItem[];
  killzone: string;
  winProbability: number;
  quality: SignalQuality;
  economicRisk: string;
  validityTimeLeft: string;
  validityExpiresAt: string;
  invalidationTrigger: string;
  validityDurationMs?: number;
  createdAtMs: number;
  closedAtMs?: number;
  isLiveSynced?: boolean;
  takeProfit: number;
  strategy?: StrategyType;
  isSimulated?: boolean;
  detailedAnalysis?: SignalAnalysis;
  slLearningAudit?: SlLearningAudit;
}

export type SlMistakeCategory =
  | 'WICK_STOP_INSUFFICIENT_ATR'
  | 'MACRO_TREND_OPPOSING_FLOW'
  | 'PRE_SWEEP_PREMATURE_ENTRY'
  | 'RED_FOLDER_NEWS_VOLATILITY'
  | 'BREAKOUT_OVERPOWERED_REVERSAL'
  | 'PREMATURE_BREAK_EVEN';

export interface SlLearningAudit {
  applied: boolean;
  learnedMistakeCount: number;
  antiWickAtrMultiplier: number;
  antiWickExtraBufferPips: number;
  htfTrendAligned: boolean;
  preSweepPurgeConfirmed: boolean;
  newsShieldStatus: 'CLEAR' | 'CAUTION' | 'SHIELDED';
  newsWarningText?: string;
  mitigatedMistakes: string[];
  lossEliminationRatePct: number;
  lessonsAppliedSummary: string;
  protectionTier: 'STANDARD' | 'INSTITUTIONAL_SNIPER' | 'MAX_PROTECTION';
}

export interface SignalAnalysis {
  strategyModel: string;
  entryReason: string;
  stopLossReason: string;
  takeProfitReason: string;
  indicatorAnalysis: {
    emaAlignment: string;
    rsiReading: string;
    atrVolatility: string;
    displacement: string;
    volumeProfile: string;
  };
  macroAnalysis: {
    fundamentalCatalyst: string;
    dxyBias: string;
    rateDifferential: string;
    economicCalendar: string;
  };
  smcParameters: {
    orderBlockZone: string;
    fvgImbalance: string;
    liquidityTarget: string;
    structureShift: string;
    pricingZone: 'Discount (Optimal Buy)' | 'Premium (Optimal Sell)' | 'Equilibrium';
  };
}

export interface CandleStick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingSession {
  id?: string;
  name: string;
  city: string;
  country?: string;
  flag?: string;
  localTime?: string;
  gmtHours: string;
  isOpen: boolean;
  volatility: string;
  statusText: string;
  countdownText?: string;
  progressPercent?: number;
  activePairs?: string;
  overlapNotice?: string;
}

export interface MacroAssetQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  role: string;
}

export interface ForexNewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  category: string;
}

export interface CentralBankStance {
  bank: string;
  rate: string;
  stance: string;
  nextMeeting: string;
  marketImpliedAction: string;
}

export interface MacroMarketData {
  assets: MacroAssetQuote[];
  newsArticles: ForexNewsItem[];
  centralBankStances: CentralBankStance[];
  marketRegime: string;
  riskSentiment: string;
  dxyAssessment: string;
  goldFundamentalDriver: string;
  lastUpdatedUtc: string;
  isLoading: boolean;
  error?: string | null;
}

export type MarketDataProvider = 
  | 'DERIV'
  | 'TWELVE_DATA'
  | 'FINNHUB'
  | 'INTERBANK_FEED'
  | 'FAIR_ECONOMY_CALENDAR'
  | 'TRADING_VIEW';

export interface MarketDataProviderConfig {
  displayName: string;
  endpointName: string;
  requiresKey: boolean;
  keyHint: string;
  supportsCandlesticks: boolean;
  description: string;
  isPrimary?: boolean;
  isSecondary?: boolean;
}

export const PROVIDER_CONFIGS: Record<MarketDataProvider, MarketDataProviderConfig> = {
  TRADING_VIEW: {
    displayName: 'TradingView Real-Time Feed (Primary)',
    endpointName: 'scanner.tradingview.com',
    requiresKey: false,
    keyHint: 'Institutional Direct Interbank Stream',
    supportsCandlesticks: true,
    isPrimary: true,
    description: 'Primary official TradingView real-time interbank quote feed. 100% synchronized with TradingView charts down to 0.1 pips.'
  },
  DERIV: {
    displayName: 'Deriv Live WebSocket (Secondary)',
    endpointName: 'ws.derivws.com',
    requiresKey: false,
    keyHint: 'Configured with App ID & API Token',
    supportsCandlesticks: true,
    isSecondary: true,
    description: 'Secondary broker tick streaming for Deriv MT5 & WebTrader account execution'
  },
  TWELVE_DATA: {
    displayName: 'Twelve Data Live (Fallback)',
    endpointName: 'api.twelvedata.com',
    requiresKey: true,
    keyHint: 'Configured with Twelve Data API Key',
    supportsCandlesticks: true,
    description: 'High-precision spot rates and candlestick time series fallback'
  },
  FINNHUB: {
    displayName: 'Finnhub Macro & Fundamentals',
    endpointName: 'api.finnhub.io',
    requiresKey: true,
    keyHint: 'Configured with Finnhub API Key',
    supportsCandlesticks: false,
    description: 'Macro Indicators (DXY, SPY, TLT, GLD), Fundamental Factors Analysis & Real-Time News Wire'
  },
  INTERBANK_FEED: {
    displayName: 'Interbank Standard Feed',
    endpointName: 'open.er-api.com',
    requiresKey: false,
    keyHint: 'No API Key required',
    supportsCandlesticks: true,
    description: 'Global interbank reference rates + spot gold backup'
  },
  FAIR_ECONOMY_CALENDAR: {
    displayName: 'Forex Factory / Fair Economy Feed',
    endpointName: 'nfs.faireconomy.media',
    requiresKey: false,
    keyHint: 'Official Weekly Economic Calendar JSON Feed',
    supportsCandlesticks: false,
    description: 'Real-time macroeconomic calendar events, high-impact news releases, consensus forecasts and historical impacts.'
  }
};

export type RefreshIntervalSeconds = 5 | 15 | 30 | 60 | 300 | 600 | 0;

export interface RefreshIntervalConfig {
  seconds: RefreshIntervalSeconds;
  label: string;
  isDefault?: boolean;
  isPaused?: boolean;
}

export const REFRESH_INTERVALS: RefreshIntervalConfig[] = [
  { seconds: 5, label: '5s Real-Time (Live Active Feed)', isDefault: true },
  { seconds: 15, label: '15s Dynamic Stream' },
  { seconds: 30, label: '30s Balanced' },
  { seconds: 60, label: '1m Battery Saver' },
  { seconds: 300, label: '5m Quota Saver' },
  { seconds: 600, label: '10m Ultra Saver' },
  { seconds: 0, label: '⏸️ PAUSED - Sleep Mode (0 API calls)', isPaused: true },
];

export type AlertCondition = 
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'TP_HIT'
  | 'SL_HIT'
  | 'VIP_SIGNAL'
  | 'SESSION_OPEN'
  | 'PENDING_ORDER_TRIGGERED'
  | 'PENDING_ORDER_INVALIDATED';

export interface AlertConditionConfig {
  label: string;
  iconSymbol: string;
}

export const ALERT_CONDITIONS: Record<AlertCondition, AlertConditionConfig> = {
  PRICE_ABOVE: { label: 'Price Crosses Above', iconSymbol: '↑' },
  PRICE_BELOW: { label: 'Price Crosses Below', iconSymbol: '↓' },
  TP_HIT: { label: 'Take Profit 1 Target Reached', iconSymbol: '🎯' },
  SL_HIT: { label: 'Stop Loss Triggered', iconSymbol: '🛑' },
  VIP_SIGNAL: { label: 'A+ VIP Confluence Posted (85%+)', iconSymbol: '★' },
  SESSION_OPEN: { label: 'Session Open / Overlap', iconSymbol: '⚡' },
  PENDING_ORDER_TRIGGERED: { label: 'MT5 Pending Order Triggered & Filled', iconSymbol: '🎯' },
  PENDING_ORDER_INVALIDATED: { label: 'MT5 Pending Order Invalidated / Expired', iconSymbol: '⚠️' },
};

export interface PriceAlert {
  id: string;
  pairSymbol: string;
  condition: AlertCondition;
  targetPrice: number;
  isEnabled: boolean;
  isTriggered: boolean;
  triggeredAt?: number | null;
  note: string;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  createdAt: number;
}

export interface TriggeredAlertEvent {
  id: string;
  alertId: string;
  pairSymbol: string;
  title: string;
  message: string;
  timestamp: number;
  condition: AlertCondition;
  price: number;
}

export interface WhatsAppAlertConfig {
  enabled: boolean;
  phoneNumber: string; // e.g. +1234567890
  apiKey: string; // CallMeBot free personal WhatsApp API Key
  customWebhookUrl?: string;
  notifyOnPendingTrigger: boolean;
  notifyOnPendingInvalidate: boolean;
  notifyOnTakeProfit: boolean;
  notifyOnStopLoss: boolean;
  lastTestStatus?: 'SUCCESS' | 'ERROR' | null;
  lastTestMessage?: string;
}

export interface TelegramAlertConfig {
  enabled: boolean;
  botToken: string; // e.g. 123456789:ABCdefGh...
  chatId: string; // e.g. 987654321
  notifyOnNewSignal?: boolean;
  notifyOnPendingTrigger: boolean;
  notifyOnPendingInvalidate: boolean;
  notifyOnTakeProfit: boolean;
  notifyOnStopLoss: boolean;
}

export type StrategyType = 
  | 'MASTER_OMNI_CONFLUENCE'
  | 'OPENING_RANGE_BOX_PIVOT'
  | 'BEST_TRADE_NOW'
  | 'ICT_SMART_MONEY'
  | 'ICT_SILVER_BULLET'
  | 'MTF_FRACTAL_ALIGNMENT'
  | 'TREND_EMA_CONFLUENCE'
  | 'VOLATILITY_SQUEEZE_BREAKOUT'
  | 'LIQUIDITY_SWEEP';

export interface StrategyConfig {
  title: string;
  shortBadge: string;
  description: string;
  modelRule: string;
  defaultWinRate?: number;
  tierTag?: 'ENSEMBLE' | 'NEW' | 'UPGRADED';
}

export const STRATEGY_CONFIGS: Record<StrategyType, StrategyConfig> = {
  MASTER_OMNI_CONFLUENCE: {
    title: 'Master Omni-Confluence (Ensemble)',
    shortBadge: 'Omni-Confluence 2+ Strat',
    description: 'Fires only when 2+ institutional strategies align with 50% Equilibrium + ATR displacement',
    modelRule: 'Dynamic 2.0R (SL: 0.9x ATR, TP: 1.8x ATR)',
    defaultWinRate: 76.4,
    tierTag: 'ENSEMBLE'
  },
  OPENING_RANGE_BOX_PIVOT: {
    title: 'Opening Range Box Pivot (ORR + ARC + Sneaky + Box)',
    shortBadge: 'ORR Box Pivot (ARC)',
    description: 'Synthesizes Previous Day Box, Session Open Manipulation (≥20% ATR), John Wick sweep, and M15 3-candle break',
    modelRule: 'Precision 1.85R (SL: 0.95x ATR beyond John Wick, TP1: 50% Eq, TP2: Opposite Box 2.85R)',
    defaultWinRate: 74.8,
    tierTag: 'NEW'
  },
  BEST_TRADE_NOW: {
    title: 'Order Block + FVG + Equilibrium',
    shortBadge: 'OB + FVG + 50% Zone',
    description: 'Upgraded H4 Order Block + M15 FVG mitigation strictly inside 50% Discount/Premium zone',
    modelRule: 'Enhanced 1.65R (SL: 1.0x ATR, TP: 1.65x ATR)',
    defaultWinRate: 71.8,
    tierTag: 'UPGRADED'
  },
  ICT_SMART_MONEY: {
    title: 'ICT Liquidity Sweep & MSS+',
    shortBadge: 'ICT Sweep + MSS+',
    description: 'Upgraded session liquidity pool sweep with ≥1.3x body displacement & RSI exhaustion filter',
    modelRule: 'Enhanced 1.65R (SL: 1.0x ATR, TP: 1.65x ATR)',
    defaultWinRate: 69.5,
    tierTag: 'UPGRADED'
  },
  ICT_SILVER_BULLET: {
    title: 'ICT Silver Bullet Killzone FVG',
    shortBadge: 'ICT Silver Bullet',
    description: 'Time-gated London Open (07-10 UTC) & NY AM (13-16 UTC) precision Fair Value Gap sniper',
    modelRule: 'Sniper 1.8R (SL: 0.9x ATR, TP: 1.62x ATR)',
    defaultWinRate: 73.2,
    tierTag: 'NEW'
  },
  MTF_FRACTAL_ALIGNMENT: {
    title: 'MTF Fractal (H4 Bias + M15 CHoCH)',
    shortBadge: 'MTF H4+M15 Fractal',
    description: 'Macro H4 Order Block & structural trend synchronized with lower-timeframe CHoCH trigger',
    modelRule: 'Structural 1.85R (SL: 0.9x ATR, TP: 1.67x ATR)',
    defaultWinRate: 72.6,
    tierTag: 'NEW'
  },
  TREND_EMA_CONFLUENCE: {
    title: 'Triple EMA (20/50/200) + RSI/ATR',
    shortBadge: 'Triple EMA + ATR Gate',
    description: 'Upgraded dynamic EMA 50 pullback with ATR expansion & RSI momentum filter (no chop)',
    modelRule: 'Enhanced 1.6R (SL: 1.0x ATR, TP: 1.6x ATR)',
    defaultWinRate: 68.4,
    tierTag: 'UPGRADED'
  },
  VOLATILITY_SQUEEZE_BREAKOUT: {
    title: 'Volatility Squeeze + ATR Breakout',
    shortBadge: 'Volatility Squeeze',
    description: 'Bollinger/Keltner bandwidth compression followed by explosive ≥1.4x ATR breakout candle',
    modelRule: 'Breakout 1.75R (SL: 1.0x ATR, TP: 1.75x ATR)',
    defaultWinRate: 70.4,
    tierTag: 'NEW'
  },
  LIQUIDITY_SWEEP: {
    title: 'London Range Fakeout + Rejection',
    shortBadge: 'London Fakeout+',
    description: 'Upgraded Asian/London range high/low sweep with pin-bar wick rejection & volume surge',
    modelRule: 'Enhanced 1.6R (SL: 1.0x ATR, TP: 1.6x ATR)',
    defaultWinRate: 67.2,
    tierTag: 'UPGRADED'
  }
};

/**
 * Deterministically maps any live ForexSignal to its corresponding Institutional Strategy
 * out of the strategies in STRATEGY_CONFIGS so Signal Cards and Backtesting match 100%.
 */
export function getSignalStrategy(signal: ForexSignal): StrategyType {
  if (signal.strategy && STRATEGY_CONFIGS[signal.strategy]) {
    return signal.strategy;
  }
  const text = `${signal.institutionalFlow || ''} ${signal.rationale || ''} ${signal.killzone || ''}`.toLowerCase();
  if (text.includes('omni') || text.includes('ensemble') || (signal.confluenceScore >= 95 && signal.isBestTradeNow)) {
    return 'MASTER_OMNI_CONFLUENCE';
  }
  if (text.includes('orr') || text.includes('box pivot') || text.includes('arc') || text.includes('sneaky') || text.includes('john wick') || text.includes('box theory')) {
    return 'OPENING_RANGE_BOX_PIVOT';
  }
  if (text.includes('silver bullet') || (text.includes('killzone') && text.includes('fvg'))) {
    return 'ICT_SILVER_BULLET';
  }
  if (text.includes('fractal') || text.includes('choch') || text.includes('multi-timeframe') || text.includes('mtf')) {
    return 'MTF_FRACTAL_ALIGNMENT';
  }
  if (text.includes('squeeze') || text.includes('bollinger') || text.includes('keltner') || text.includes('volatility breakout')) {
    return 'VOLATILITY_SQUEEZE_BREAKOUT';
  }
  if (signal.isBestTradeNow || (text.includes('order block') && text.includes('fvg'))) {
    return 'BEST_TRADE_NOW';
  }
  if (text.includes('ema') || text.includes('trend') || text.includes('pullback') || text.includes('channel')) {
    return 'TREND_EMA_CONFLUENCE';
  }
  if (text.includes('london') || text.includes('breakout') || text.includes('fakeout') || signal.type.includes('STOP')) {
    return 'LIQUIDITY_SWEEP';
  }
  if (text.includes('sweep') || text.includes('displacement') || text.includes('liquidity') || text.includes('ict') || text.includes('mss')) {
    return 'ICT_SMART_MONEY';
  }
  // Deterministic fallback based on pair symbol + id across all strategies
  const seedStr = `${signal.pair.symbol}-${signal.id || ''}`;
  const hash = seedStr.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const allStrats: StrategyType[] = [
    'MASTER_OMNI_CONFLUENCE',
    'OPENING_RANGE_BOX_PIVOT',
    'BEST_TRADE_NOW',
    'ICT_SILVER_BULLET',
    'MTF_FRACTAL_ALIGNMENT',
    'ICT_SMART_MONEY',
    'VOLATILITY_SQUEEZE_BREAKOUT',
    'TREND_EMA_CONFLUENCE',
    'LIQUIDITY_SWEEP'
  ];
  return allStrats[hash % allStrats.length];
}

export function getCanonicalStrategyWinRate(strategy: StrategyType): number {
  return STRATEGY_CONFIGS[strategy]?.defaultWinRate || 70.0;
}

export function getCanonicalStrategyRiskReward(strategy: StrategyType): string {
  if (strategy === 'MASTER_OMNI_CONFLUENCE') return '1:2.85';
  if (strategy === 'OPENING_RANGE_BOX_PIVOT') return '1:2.85';
  if (strategy === 'BEST_TRADE_NOW') return '1:2.65';
  if (strategy === 'ICT_SILVER_BULLET') return '1:2.70';
  if (strategy === 'MTF_FRACTAL_ALIGNMENT') return '1:2.75';
  if (strategy === 'ICT_SMART_MONEY') return '1:2.60';
  if (strategy === 'VOLATILITY_SQUEEZE_BREAKOUT') return '1:2.65';
  if (strategy === 'TREND_EMA_CONFLUENCE') return '1:2.60';
  if (strategy === 'LIQUIDITY_SWEEP') return '1:2.60';
  return '1:2.65';
}

export type TradeOutcome = 'WIN' | 'LOSS';

export interface ConfluenceTierStats {
  minConfluence: number;
  label: string;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgRiskReward: string;
  netPips: number;
}

export type BacktestTimeHorizon = '24H' | '7D' | '15D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface BacktestTimeHorizonConfig {
  id: BacktestTimeHorizon;
  label: string;
  subLabel: string;
  days: number;
}

export const BACKTEST_TIME_HORIZONS: BacktestTimeHorizonConfig[] = [
  { id: '24H', label: '24 Hours', subLabel: 'Last 24h Intra-Day', days: 1 },
  { id: '7D', label: '1 Week', subLabel: 'Last 7 Days (W1)', days: 7 },
  { id: '15D', label: '15 Days', subLabel: 'Last 15 Days (Fortnight)', days: 15 },
  { id: '1M', label: '1 Month', subLabel: 'Last 30 Days (M1)', days: 30 },
  { id: '3M', label: '3 Months', subLabel: 'Last 90 Days (Quarter)', days: 90 },
  { id: '6M', label: '6 Months', subLabel: 'Last 180 Days (Half Year)', days: 180 },
  { id: '1Y', label: '1 Year', subLabel: 'Last 365 Days (Annual)', days: 365 },
  { id: 'ALL', label: 'All History', subLabel: 'Full Multi-Year Archive', days: 9999 },
];

export type BacktestTpStage = 'TP2_FULL' | 'TP1_BE' | 'SL_HIT';

export interface AssetPerformanceStat {
  pairSymbol: string;
  category: AssetCategory;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  fullTp2Wins?: number;
  partialTp1BeWins?: number;
  winRate: number;
  totalPips: number;
  profitDollar: number;
  profitFactor: number;
  bestWinPips: number;
  worstLossPips: number;
  returnPercent: number;
}

export type BacktestTradeSource = 'HISTORICAL' | 'LIVE_FORWARD';

export interface BacktestTrade {
  id: string;
  source?: BacktestTradeSource;
  pairSymbol: string;
  strategy: StrategyType;
  direction: SignalType;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  tpStage?: BacktestTpStage;
  dollarPnl?: number;
  commission?: number;
  spreadDeducted?: number;
  lotSize?: number;
  exitReason?: string;
  isLiveExecution?: boolean;
  entryTime: string;
  exitTime: string;
  timestamp?: number;
  exitTimestamp?: number;
  pips: number;
  pnlPercent: number;
  outcome: TradeOutcome;
  confluenceScore: number;
  timeframe: Timeframe;
  riskRewardRatio: string;
  session: string;
  rationale: string;
}

export interface BacktestFilter {
  strategy: StrategyType;
  timeframe?: Timeframe | null;
  minConfluence: number;
  pairSymbol?: string | null;
  outcomeFilter?: TradeOutcome | null;
  category?: AssetCategory | null;
  timeHorizon?: BacktestTimeHorizon | null;
  sourceFilter?: BacktestTradeSource | 'ALL' | null;
}

export interface BacktestSummary {
  strategy: StrategyType;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  fullTp2Wins?: number;
  partialTp1BeWins?: number;
  directSlLosses?: number;
  grossProfitDollars?: number;
  grossLossDollars?: number;
  netProfitDollars?: number;
  winRate: number;
  totalPips: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  avgRiskReward: string;
  netRoiPercent: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  avgWinPips: number;
  avgLossPips: number;
  equityCurve: number[];
  confluenceMatrix: ConfluenceTierStats[];
  filteredTrades: BacktestTrade[];
  assetBreakdown?: AssetPerformanceStat[];
  historicalCount?: number;
  liveForwardCount?: number;
}

export type SmartMoneyType = 
  | 'ORDER_BLOCK'
  | 'FAIR_VALUE_GAP'
  | 'LIQUIDITY_SWEEP'
  | 'BREAK_OF_STRUCTURE'
  | 'CHANGE_OF_CHARACTER';

export interface SmartMoneyZone {
  id: string;
  pairSymbol: string;
  type: SmartMoneyType;
  highPrice: number;
  lowPrice: number;
  timeframe: Timeframe;
  isMitigated: boolean;
  strengthStars: number;
  description: string;
}

export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type EconomicImpact = ImpactLevel;

export interface PairNewsImpact {
  pair: string;
  ifBullishCurrency: 'BUY (SURGE UP)' | 'SELL (DROP DOWN)';
  ifBearishCurrency: 'BUY (SURGE UP)' | 'SELL (DROP DOWN)';
  expectedPips: string;
  explanation: string;
}

export interface EconomicEvent {
  id: string;
  currency: string;
  title: string;
  time?: string;
  timeFormatted?: string;
  timestamp: number;
  impact: ImpactLevel;
  actual?: string;
  forecast?: string;
  previous?: string;
  bias?: string;
  unit?: string;
  description?: string;
  isHighImpact?: boolean;
  releasedActualValue?: string;
  surpriseOutcome?: 'BEAT_BULLISH' | 'MISSED_BEARISH' | 'INLINE_NEUTRAL';
  releasedSummary?: string;
  affectedPairs?: string[];
  ifBeatScenario?: string;
  ifMissScenario?: string;
  tradingRule?: string;
  pairImpacts?: PairNewsImpact[];
}

export interface CurrencyStrength {
  currency: string;
  score: number;
  change24h: string;
  trend: string;
}

export type AiPersonaId = 'UNIVERSAL' | 'INSTITUTIONAL' | 'RISK_MANAGER' | 'SCALPER';

export interface AiPersona {
  id: AiPersonaId;
  title: string;
  badge: string;
  description: string;
}

export const AI_PERSONAS: Record<AiPersonaId, AiPersona> = {
  UNIVERSAL: {
    id: 'UNIVERSAL',
    title: 'Universal AI Copilot',
    badge: 'Ask Anything • Trade • News • Info',
    description: 'Universal all-in-one intelligence mode — ask any query about live trades, economic news calendar impacts, any currency pair, technical/fundamental analysis, indicators, prop firm rules, or general market knowledge.'
  },
  INSTITUTIONAL: {
    id: 'INSTITUTIONAL',
    title: 'Institutional SMC Mentor',
    badge: 'ICT / Bank Flow',
    description: 'Expert in Fair Value Gaps (FVG), Order Blocks, Liquidity Sweeps, and Institutional Order Flow.'
  },
  RISK_MANAGER: {
    id: 'RISK_MANAGER',
    title: 'Chief Risk Officer',
    badge: 'Capital Preservation',
    description: 'Mathematical lot sizing, 1% risk rule, Drawdown mitigation, and asymmetrical Risk/Reward setups.'
  },
  SCALPER: {
    id: 'SCALPER',
    title: 'Momentum Scalper',
    badge: 'London/NY Overlap',
    description: 'High-frequency M5/M15 breakout setups, session volume surges, and fast target executions.'
  }
};

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  isGenerating?: boolean;
  isError?: boolean;
  signalReference?: string | null;
  imageUrl?: string | null;
  suggestedPrompts?: string[];
}

export interface Elev8Trade {
  id: string;
  signalId?: string;
  symbol: string;
  orderType: string; // 'BUY_MARKET' | 'SELL_MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP'
  lots: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  status: 'PENDING' | 'OPEN' | 'CLOSED';
  closeReason?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'MANUAL' | 'CANCELLED';
  realizedPnl: number;
  floatingPnl: number;
  pips: number;
  slRiskDollars: number;
  tp1GainDollars: number;
  tp2GainDollars: number;
  tp3GainDollars: number;
  openedAt: number;
  closedAt?: number;
  triggeredAt?: number;
  strategy?: StrategyType;
  slLearningAudit?: SlLearningAudit;
}

export type Elev8ExecutionMode = 'SIMULATED' | 'WEBHOOK_BRIDGE' | 'METAAPI_CLOUD';

export interface Elev8AccountConfig {
  accountNumber: string;
  server: string;
  accountType: 'EVALUATION' | 'FUNDED' | 'DEMO';
  accountBalance: number;
  riskPerTradePercent: number;
  symbolSuffix: string;
  executionMode: Elev8ExecutionMode;
  webhookUrl?: string;
  metaApiToken?: string;
  metaApiAccountId?: string;
  autoCopyWebhookEnabled: boolean;
  isConnected: boolean;
  lastSyncTime?: number;
}

export const DEFAULT_ELEV8_CONFIG: Elev8AccountConfig = {
  accountNumber: '',
  server: 'Elev8Markets-Live',
  accountType: 'EVALUATION',
  accountBalance: 50000,
  riskPerTradePercent: 0.5,
  symbolSuffix: '',
  executionMode: 'SIMULATED',
  webhookUrl: '',
  metaApiToken: '',
  metaApiAccountId: '',
  autoCopyWebhookEnabled: false,
  isConnected: false
};

// --- Currency Strength Meter Types ---
export type StrengthAssetGroup = 'FX' | 'METALS' | 'COMMODITIES';

export interface CurrencyStrengthItem {
  currency: string;
  name?: string;
  pairSymbol?: string;
  group?: StrengthAssetGroup;
  livePrice?: number;
  strength: number; // 0.0 to 10.0
  status: 'VERY_STRONG' | 'STRONG' | 'NEUTRAL' | 'WEAK' | 'VERY_WEAK';
  change24h: number;
  momentum: 'RISING' | 'FALLING' | 'STABLE';
}

export interface PairStrengthItem {
  pairSymbol: string;
  name: string;
  category: 'MAJORS' | 'MINORS' | 'METALS';
  baseAsset: string;
  quoteAsset: string;
  baseStrength: number;
  quoteStrength: number;
  netStrengthDiff: number;
  compositeScore: number; // 0.0 to 10.0
  bias: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
  livePrice: number;
  change24h: number;
}

export interface BestPairingRecommendation {
  pair: string;
  action: 'BUY' | 'SELL';
  strongCurrency: string;
  weakCurrency: string;
  strengthDiff: number;
  confluenceReason: string;
}

// --- Trade Journal Types ---
export interface TradeJournalEntry {
  id: string;
  tradeId: string;
  symbol: string;
  orderType: string;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  lots: number;
  pnlDollars: number;
  pips: number;
  outcome: 'WIN' | 'LOSS' | 'BREAK_EVEN' | 'OPEN';
  tradingSession: 'LONDON' | 'NEW_YORK' | 'ASIAN' | 'OVERLAP' | 'WEEKEND';
  tags: string[];
  notes: string;
  openedAt: number;
  closedAt?: number;
}

