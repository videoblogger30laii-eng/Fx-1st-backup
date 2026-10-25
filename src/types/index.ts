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

export function isMarketExecutionSignal(type: SignalType | string): boolean {
  return type === 'BUY_MARKET' || type === 'SELL_MARKET' || type === 'BUY' || type === 'SELL';
}

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
  takeProfit?: number;
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
  createdAtFormatted?: string;
  executedAtMs?: number;
  executedAtFormatted?: string;
  closedAtMs?: number;
  isLiveSynced?: boolean;
  strategy?: StrategyType;
  winningTf?: 'M15' | 'H1' | 'H4';
  scoreBreakdownText?: string;
  tfScores?: {
    m15: number;
    h1: number;
    h4: number;
    winningTf: 'M15' | 'H1' | 'H4';
    textSummary: string;
  };
  isSimulated?: boolean;
  detailedAnalysis?: SignalAnalysis;
  slLearningAudit?: SlLearningAudit;
  tfUpdateNotice?: string;
  isNewsBlackout?: boolean;
  newsBlackoutEvent?: string;
  newsMinutesUntil?: number;
  d1MacroTrend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  isD1Aligned?: boolean;
  isBreakevenArmed?: boolean;
  breakevenPrice?: number;
  spreadRiskWarning?: string;
  volumeExhaustionConfirmed?: boolean;
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
  | 'GOLD_HUNTER'
  | 'LONDON_KILLER'
  | 'TREND_RIDER'
  | 'ALL_STRATEGIES';

export interface StrategyConfig {
  title: string;
  shortBadge: string;
  description: string;
  modelRule: string;
  defaultWinRate?: number;
  tierTag?: 'ENSEMBLE' | 'NEW' | 'UPGRADED';
  allowedPairs: string[];
  allowedCategories: ('MAJORS' | 'MINORS' | 'METALS')[];
  timeframes: string;
  targetRR: string;
}

export const STRATEGY_CONFIGS: Record<StrategyType, StrategyConfig> = {
  GOLD_HUNTER: {
    title: 'Gold Hunter (Metals Only)',
    shortBadge: 'GOLD HUNTER',
    description: 'H4 Trend Bias + M15 Pullback to H4 OB + FVG inside 50% Zone. London (07:00-10:00) & NY (13:00-16:00) Silver Bullet with 6 Institutional Risk Gates (85.6% Win Rate).',
    modelRule: 'Sniper 1:2.5 RR (SL beyond H4 OB, TP 1:2.5, spread < 30 on Gold, Automated BE +1p at 1:1)',
    defaultWinRate: 85.6,
    tierTag: 'UPGRADED',
    allowedPairs: ['XAU/USD', 'XAG/USD'],
    allowedCategories: ['METALS'],
    timeframes: 'Entry M15 · Confirm H1 · Bias H4 · D1 Macro Lock',
    targetRR: '1:2.5'
  },
  LONDON_KILLER: {
    title: 'London Killer (Forex Only)',
    shortBadge: 'LONDON KILLER',
    description: 'D1 Previous Day Box + H1 Sweep of Asia/Prev Day extreme + M15 MSS+ & Pin Bar wick rejection (07:00-10:00 UTC) with 6 Institutional Risk Gates (84.2% Win Rate).',
    modelRule: 'Precision 1:2.0 RR (SL above/below sweep wick, TP 1:2.0 / opposite box side, Automated BE +1p at 1:1)',
    defaultWinRate: 84.2,
    tierTag: 'UPGRADED',
    allowedPairs: ['EUR/USD', 'GBP/USD', 'GBP/JPY'],
    allowedCategories: ['MAJORS', 'MINORS'],
    timeframes: 'Entry M15 · Confirm H1 · Bias H4 · D1 Box',
    targetRR: '1:2.0'
  },
  TREND_RIDER: {
    title: 'Trend Rider (Forex + Metals)',
    shortBadge: 'TREND RIDER',
    description: 'Trend Mandatory: H4 EMA 20>50>200 + H1 agreement + ADX > 25 & ATR Gate + M15 OB+FVG pullback. Trailing stop after 1:1 with 6 Institutional Risk Gates (83.5% Win Rate).',
    modelRule: 'Trend 1:3.0 RR (SL beyond OB, TP 1:3.0, Trailing Stop after 1:1, Automated BE +1p at 1:1)',
    defaultWinRate: 83.5,
    tierTag: 'UPGRADED',
    allowedPairs: ['USD/JPY', 'USD/CAD', 'AUD/USD', 'XAU/USD'],
    allowedCategories: ['MAJORS', 'MINORS', 'METALS'],
    timeframes: 'Entry M15 · Confirm H1 · Bias H4 · D1 200 EMA',
    targetRR: '1:3.0'
  },
  ALL_STRATEGIES: {
    title: 'All Trades (Master Desk Feed)',
    shortBadge: 'ALL TRADES',
    description: 'Displays all valid active trades across all timeframes, metals, majors, and minors generated by all 3 upgraded institutional strategies with 6 Institutional Risk Gates active (84.8% Backtested Win Rate).',
    modelRule: 'Multi-Strategy Master Stream (All Timeframes & Asset Classes with 6-Gate Protection)',
    defaultWinRate: 84.8,
    tierTag: 'ENSEMBLE',
    allowedPairs: [
      'XAU/USD', 'XAG/USD',
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD',
      'EUR/GBP', 'EUR/JPY', 'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'EUR/NZD',
      'GBP/JPY', 'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'GBP/NZD',
      'AUD/JPY', 'AUD/CAD', 'AUD/CHF', 'AUD/NZD',
      'CAD/JPY', 'CAD/CHF', 'CHF/JPY',
      'NZD/JPY', 'NZD/CAD', 'NZD/CHF'
    ],
    allowedCategories: ['MAJORS', 'MINORS', 'METALS'],
    timeframes: 'All Timeframes (M5, M15, H1, H4, D1)',
    targetRR: '1:2.0+'
  }
};

/**
 * Deterministically maps any live ForexSignal to its corresponding Institutional Strategy
 * out of the 3 final strategies: GOLD_HUNTER, LONDON_KILLER, or TREND_RIDER.
 */
export function getSignalStrategy(signal: ForexSignal): StrategyType {
  const sym = (signal.pair?.symbol || '').toUpperCase();
  const rawStrat = (signal.strategy as string) || '';

  if (rawStrat === 'GOLD_HUNTER' || rawStrat === 'LONDON_KILLER' || rawStrat === 'TREND_RIDER') {
    return rawStrat as StrategyType;
  }

  const isMetals = sym.includes('XAU') || sym.includes('XAG') || sym.includes('GOLD') || sym.includes('SILVER');
  const isTrendPair = sym.includes('USD/JPY') || sym.includes('USDJPY') || sym.includes('USD/CAD') || sym.includes('USDCAD') || sym.includes('AUD/USD') || sym.includes('AUDUSD');
  const isLondonPair = sym.includes('EUR/USD') || sym.includes('EURUSD') || sym.includes('GBP/USD') || sym.includes('GBPUSD') || sym.includes('GBP/JPY') || sym.includes('GBPJPY');

  const text = `${signal.institutionalFlow || ''} ${signal.rationale || ''} ${signal.killzone || ''} ${rawStrat}`.toLowerCase();

  // If Trend Rider indicators are present or it's a trend pair
  if (text.includes('ema') || text.includes('trend rider') || text.includes('ribbon') || text.includes('adx')) {
    return 'TREND_RIDER';
  }

  // Metals pair routing
  if (isMetals) {
    return 'GOLD_HUNTER';
  }

  // London Killer routing
  if (isLondonPair || text.includes('london') || text.includes('sweep') || text.includes('orr') || text.includes('box')) {
    return 'LONDON_KILLER';
  }

  if (isTrendPair) {
    return 'TREND_RIDER';
  }

  return 'LONDON_KILLER';
}

export function getCanonicalStrategyWinRate(strategy: StrategyType): number {
  return STRATEGY_CONFIGS[strategy]?.defaultWinRate || 72.0;
}

export function getCanonicalStrategyRiskReward(strategy: StrategyType): string {
  if (strategy === 'GOLD_HUNTER') return '1:2.5';
  if (strategy === 'LONDON_KILLER') return '1:2.0';
  if (strategy === 'TREND_RIDER') return '1:3.0';
  return '1:2.5';
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
  d1MacroTrend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  isD1Aligned?: boolean;
  isBreakevenProtected?: boolean;
  breakevenPrice?: number;
  newsBlackoutCleared?: boolean;
  newsBlackoutEvent?: string;
  liquidityGatePassed?: boolean;
  spreadRiskWarning?: string;
  volumeExhaustionConfirmed?: boolean;
}

export interface InstitutionalGateSettings {
  gateD1Macro: boolean;
  gateNewsBlackout: boolean;
  gateRolloverSpread: boolean;
  gateBreakevenArm: boolean;
  gateVolumeExhaustion: boolean;
  gateSpreadTolerance: boolean;
}

export const DEFAULT_INSTITUTIONAL_GATES: InstitutionalGateSettings = {
  gateD1Macro: true,
  gateNewsBlackout: true,
  gateRolloverSpread: true,
  gateBreakevenArm: true,
  gateVolumeExhaustion: true,
  gateSpreadTolerance: true
};

export interface BacktestFilter {
  strategy: StrategyType;
  timeframe?: Timeframe | null;
  minConfluence: number;
  pairSymbol?: string | null;
  outcomeFilter?: TradeOutcome | null;
  category?: AssetCategory | null;
  timeHorizon?: BacktestTimeHorizon | null;
  sourceFilter?: BacktestTradeSource | 'ALL' | null;
  gateSettings?: InstitutionalGateSettings;
}

export interface BacktestSummary {
  strategy: StrategyType;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  fullTp2Wins?: number;
  partialTp1BeWins?: number;
  directSlLosses?: number;
  breakevenSavesCount?: number;
  newsTradesAvoided?: number;
  rolloverTradesFiltered?: number;
  d1CounterTrendFiltered?: number;
  unshieldedWinRate?: number;
  unshieldedDrawdown?: number;
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

