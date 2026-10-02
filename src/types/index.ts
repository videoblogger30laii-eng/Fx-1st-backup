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

export interface ForexPair {
  symbol: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  pipDigits: number;
  isGoldOrCrypto?: boolean;
  spreadPips: number;
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
  takeProfit: number;
  isSimulated?: boolean;
  detailedAnalysis?: SignalAnalysis;
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
  | 'YAHOO_FINANCE'
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
    description: 'Global interbank reference rates + Binance crypto & spot gold backup'
  },
  YAHOO_FINANCE: {
    displayName: 'Yahoo Real-Time',
    endpointName: 'stream.finance.yahoo.com',
    requiresKey: false,
    keyHint: 'Global Interbank Feed',
    supportsCandlesticks: true,
    description: 'High-frequency interbank FX quotes'
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
  | 'SESSION_OPEN';

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

export type StrategyType = 
  | 'BEST_TRADE_NOW'
  | 'ICT_SMART_MONEY'
  | 'TREND_EMA_CONFLUENCE'
  | 'LIQUIDITY_SWEEP';

export interface StrategyConfig {
  title: string;
  description: string;
  modelRule: string;
  defaultWinRate?: number;
}

export const STRATEGY_CONFIGS: Record<StrategyType, StrategyConfig> = {
  BEST_TRADE_NOW: {
    title: 'Order Block + FVG Mitigation',
    description: 'H4 Order Block + M15 Fair Value Gap mitigation with multi-TF alignment',
    modelRule: 'Fixed 1.5R (SL: 1.0x ATR, TP: 1.5x ATR)'
  },
  ICT_SMART_MONEY: {
    title: 'ICT Liquidity Sweep & Displacement',
    description: 'Session liquidity pool sweep with aggressive market structure shift',
    modelRule: 'Fixed 1.5R (SL: 1.0x ATR, TP: 1.5x ATR)'
  },
  TREND_EMA_CONFLUENCE: {
    title: 'Triple EMA (20/50/200) Pullback',
    description: 'Trend pullback entries on dynamic EMA 50 support/resistance retests',
    modelRule: 'Fixed 1.5R (SL: 1.0x ATR, TP: 1.5x ATR)'
  },
  LIQUIDITY_SWEEP: {
    title: 'London Range Breakout Fakeout',
    description: 'Range high/low sweep and immediate candle displacement reversal',
    modelRule: 'Fixed 1.5R (SL: 1.0x ATR, TP: 1.5x ATR)'
  }
};

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

export interface BacktestTrade {
  id: string;
  pairSymbol: string;
  strategy: StrategyType;
  direction: SignalType;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
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
}

export interface BacktestSummary {
  strategy: StrategyType;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
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

export interface EconomicEvent {
  id: string;
  currency: string;
  title: string;
  time: string;
  impact: ImpactLevel;
  actual: string;
  forecast: string;
  previous: string;
  bias: string;
}

export interface CurrencyStrength {
  currency: string;
  score: number;
  change24h: string;
  trend: string;
}

export type AiPersonaId = 'INSTITUTIONAL' | 'RISK_MANAGER' | 'SCALPER';

export interface AiPersona {
  id: AiPersonaId;
  title: string;
  badge: string;
  description: string;
}

export const AI_PERSONAS: Record<AiPersonaId, AiPersona> = {
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
  status: 'OPEN' | 'CLOSED';
  closeReason?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'MANUAL';
  realizedPnl: number;
  floatingPnl: number;
  pips: number;
  slRiskDollars: number;
  tp1GainDollars: number;
  tp2GainDollars: number;
  tp3GainDollars: number;
  openedAt: number;
  closedAt?: number;
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
