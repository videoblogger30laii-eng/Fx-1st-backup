import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ForexSignal,
  ForexPair,
  Timeframe,
  CandleStick,
  RefreshIntervalSeconds,
  MarketDataProvider,
  MacroMarketData,
  PriceAlert,
  TriggeredAlertEvent,
  ChatMessage,
  AiPersonaId,
  BacktestFilter,
  BacktestSummary,
  BacktestTrade,
  StrategyType,
  TradeOutcome,
  AI_PERSONAS,
  Elev8AccountConfig,
  DEFAULT_ELEV8_CONFIG,
  Elev8Trade,
  getAssetCategory,
  getSignalStrategy,
  STRATEGY_CONFIGS
} from './types';
import {
  ALL_PAIRS,
  PAIR_XAUUSD,
  getInitialSignals,
  generateCandles,
  getTradingSessions,
  getEconomicEvents,
  getCurrencyStrengths,
  getSmartMoneyZones,
  isForexMarketOpen,
  updateSignalWithLiveMarket,
  calculateLotSize,
  formatPrice,
  isSignalValidAndActive,
  isSignalExpiredOrInvalid,
  enforceTimeframeHierarchy
} from './services/marketData';
import { LiveMarketDataService } from './services/liveMarketService';
import { realPriceService } from './services/RealPriceService';
import { BacktestEngine } from './services/backtestEngine';
import { GeminiChatEngine } from './services/geminiChatEngine';
import { PersistenceManager } from './services/persistence';
import { economicCalendarService } from './services/economicCalendarService';
import { marketPrecisionService } from './services/marketPrecisionService';
import { signalScannerService } from './services/signalScannerService';
import { adaptiveSlLearningService } from './services/adaptiveSlLearningService';
import { offlineGapReconciler } from './services/offlineGapReconciler';

// Components & Modals
import { SignalDetailSheet } from './components/SignalDetailSheet';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { MarketDataProviderModal } from './components/MarketDataProviderModal';
import { RefreshIntervalModal } from './components/RefreshIntervalModal';
import { AddAlertDialog } from './components/AddAlertDialog';
import { TriggeredAlertBanner } from './components/TriggeredAlertBanner';
import { LiveChartModal } from './components/LiveChartModal';
import { Elev8IntegrationModal } from './components/Elev8IntegrationModal';
import { Elev8OrderModal } from './components/Elev8OrderModal';
import { TelegramAlertModal } from './components/TelegramAlertModal';
import { EconomicCalendarModal } from './components/EconomicCalendarModal';
import { CurrencyStrengthModal } from './components/CurrencyStrengthModal';
import { TradeJournalModal } from './components/TradeJournalModal';
import { SoundSettingsModal } from './components/SoundSettingsModal';
import { MobileAppInstallModal } from './components/MobileAppInstallModal';
import { Live247StatusModal } from './components/Live247StatusModal';
import { TelegramAlertService } from './services/TelegramAlertService';
import { soundFx } from './services/soundFxService';

// Screens
import { SignalsScreen } from './screens/SignalsScreen';
import { AiChatScreen } from './screens/AiChatScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { BacktestingLabScreen } from './screens/BacktestingLabScreen';
import { ChartTerminalScreen } from './screens/ChartTerminalScreen';
import { SmartMoneyScreen } from './screens/SmartMoneyScreen';
import { FundamentalsScreen } from './screens/FundamentalsScreen';

import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { visualThemeService, VisualTheme, VISUAL_THEMES } from './services/themeService';

// Icons
import {
  TrendingUp,
  Sparkles,
  Bell,
  FlaskConical,
  BarChart2,
  LineChart,
  Layers,
  Calendar,
  Gauge,
  BookOpen,
  Volume2,
  VolumeX,
  Flame,
  Smartphone,
  Monitor,
  Download,
  Wifi,
  RefreshCw,
  Palette
} from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & App View Mode State (Defaults to MOBILE App Version)
  const [selectedTab, setSelectedTab] = useState<'SIGNALS' | 'AI_CHAT' | 'ALERTS' | 'BACKTEST' | 'MARKETS'>('SIGNALS');
  const [selectedMarketsSubTab, setSelectedMarketsSubTab] = useState<'CHARTS' | 'SMC' | 'CALENDAR'>('CHARTS');
  const [appViewMode, setAppViewMode] = useState<'MOBILE' | 'DESKTOP'>(() => {
    try {
      const saved = localStorage.getItem('fx_app_view_mode');
      return saved === 'DESKTOP' ? 'DESKTOP' : 'MOBILE';
    } catch {
      return 'MOBILE';
    }
  });
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [is247StatusModalOpen, setIs247StatusModalOpen] = useState<boolean>(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [activeVisualTheme, setActiveVisualTheme] = useState<VisualTheme>(() => visualThemeService.getTheme());

  const [isTelegramWebview, setIsTelegramWebview] = useState<boolean>(false);

  useEffect(() => {
    try {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const isTg =
        params.get('download') === '1' ||
        params.get('download') === 'true' ||
        params.get('from') === 'telegram' ||
        params.get('action') === 'download' ||
        /telegram/i.test(navigator.userAgent) ||
        (typeof document !== 'undefined' && document.referrer.includes('t.me'));

      if (isTg) {
        setIsTelegramWebview(true);
        if (params.get('download') === '1' || params.get('download') === 'true') {
          setIsInstallModalOpen(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    return visualThemeService.subscribe((t) => setActiveVisualTheme(t));
  }, []);

  useEffect(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        (window.location.protocol === 'https:' || window.location.protocol === 'http:') &&
        'serviceWorker' in navigator &&
        navigator.serviceWorker
      ) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    } catch {}
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleChangeViewMode = (mode: 'MOBILE' | 'DESKTOP') => {
    setAppViewMode(mode);
    try {
      localStorage.setItem('fx_app_view_mode', mode);
    } catch {}
  };

  const handleTriggerNativeInstall = async (): Promise<boolean> => {
    if (!deferredInstallPrompt) return false;
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setDeferredInstallPrompt(null);
        return true;
      }
    } catch {}
    return false;
  };

  // Market & Signals State (Calibrated by Adaptive Anti-Loss Mistake Elimination Engine)
  const [signals, setSignals] = useState<ForexSignal[]>(() => {
    const raw = getInitialSignals();
    return raw.map(s => {
      let sig = s;
      if ((s.status === 'RUNNING' || s.status === 'PENDING') && !s.slLearningAudit) {
        sig = adaptiveSlLearningService.calibrateSignalWithSlLessons(s, s.pair, s.currentPrice);
      }
      return enforceTimeframeHierarchy(sig);
    });
  });

  // Always keep signalsRef synchronized to avoid stale closure gaps in mobile background reconcilers
  const signalsRef = React.useRef<ForexSignal[]>(signals);
  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);

  const [activeStrategy, setActiveStrategy] = useState<StrategyType>(() => {
    try {
      const migrationKey = 'fx_active_strategy_master_all_v5';
      if (!localStorage.getItem(migrationKey)) {
        localStorage.setItem(migrationKey, 'true');
        localStorage.setItem('fx_active_strategy', 'ALL_STRATEGIES');
        PersistenceManager.saveEnabledStrategies(['ALL_STRATEGIES']);
        return 'ALL_STRATEGIES';
      }
      const saved = localStorage.getItem('fx_active_strategy');
      if (saved === 'ALL_STRATEGIES' || saved === 'GOLD_HUNTER' || saved === 'LONDON_KILLER' || saved === 'TREND_RIDER') {
        return saved as StrategyType;
      }
    } catch {}
    return 'ALL_STRATEGIES';
  });

  const handleSelectStrategy = (strat: StrategyType) => {
    setActiveStrategy(strat);
    try {
      localStorage.setItem('fx_active_strategy', strat);
      PersistenceManager.saveEnabledStrategies([strat]);
    } catch {}
  };

  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter);
    // Section auto-filter: Metals section defaults to GOLD HUNTER, Forex defaults to ALL_STRATEGIES
    if (filter === 'METALS' || filter === 'GOLD') {
      if (activeStrategy === 'LONDON_KILLER') {
        handleSelectStrategy('GOLD_HUNTER');
      }
    } else if (filter === 'MAJORS' || filter === 'MINORS') {
      if (activeStrategy === 'GOLD_HUNTER') {
        handleSelectStrategy('ALL_STRATEGIES');
      }
    }
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('CONFLUENCE');
  const [selectedSignalDetail, setSelectedSignalDetail] = useState<ForexSignal | null>(null);
  const [liveChartSignal, setLiveChartSignal] = useState<ForexSignal | null>(null);

  // Market Precision Mode State (Raw socket feeds for zero slippage)
  const [isMarketPrecisionEnabled, setIsMarketPrecisionEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fx_market_precision_mode');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  // Charting & Pairs State
  const [allPairs, setAllPairs] = useState<ForexPair[]>(ALL_PAIRS);
  const [selectedPair, setSelectedPair] = useState<ForexPair>(PAIR_XAUUSD);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('H1');
  const [candles, setCandles] = useState<CandleStick[]>(() => generateCandles(PAIR_XAUUSD, 'H1', 120));
  const [isCandleLoading, setIsCandleLoading] = useState<boolean>(false);

  // Provider & Refresh Interval
  const [marketDataProvider, setMarketDataProvider] = useState<MarketDataProvider>('TRADING_VIEW');
  const [refreshInterval, setRefreshInterval] = useState<RefreshIntervalSeconds>(() =>
    PersistenceManager.getRefreshInterval()
  );
  const [prevActiveInterval, setPrevActiveInterval] = useState<RefreshIntervalSeconds>(() => {
    const current = PersistenceManager.getRefreshInterval();
    return current > 0 ? current : 300;
  });
  const [lastSyncTime, setLastSyncTime] = useState<number>(() => PersistenceManager.getLastSyncTime());
  const [apiQuota, setApiQuota] = useState<{ used: number; limit: number }>(() => PersistenceManager.getApiQuota());
  const [providerStatus, setProviderStatus] = useState<string>('TradingView Interbank • Primary Active');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const safeGetLocal = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const [twelveDataKey, setTwelveDataKey] = useState<string>(() => 
    safeGetLocal('fx_twelve_data_key') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TWELVE_DATA_API_KEY) || 
    'fbf5fe46b0344421a3e9c3fb6a549114'
  );
  const [finnhubKey, setFinnhubKey] = useState<string>(() => 
    safeGetLocal('fx_finnhub_key') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FINNHUB_API_KEY) || 
    'dafson1r01quvmmhdlsgdafson1r01quvmmhdlt0'
  );
  const [derivAppId, setDerivAppId] = useState<string>(() => 
    safeGetLocal('fx_deriv_app_id') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DERIV_APP_ID) || 
    '1089'
  );
  const [derivApiKey, setDerivApiKey] = useState<string>(() => 
    safeGetLocal('fx_deriv_token') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DERIV_API_TOKEN) || 
    ''
  );

  // Alerts State (Persisted in localStorage so triggered alerts never re-fire across reloads)
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const defaultAlerts: PriceAlert[] = [
      {
        id: 'alert_xau_tp1',
        pairSymbol: 'XAU/USD',
        condition: 'PRICE_ABOVE',
        targetPrice: 4850.00,
        note: 'Take Profit 1 on Best Trade Now (84.8% win rate setup)',
        soundEnabled: true,
        vibrateEnabled: true,
        isEnabled: true,
        isTriggered: false,
        createdAt: Date.now()
      },
      {
        id: 'alert_eur_demand',
        pairSymbol: 'EUR/USD',
        condition: 'PRICE_BELOW',
        targetPrice: 1.0780,
        note: 'H4 Demand Block liquidity sweep level',
        soundEnabled: true,
        vibrateEnabled: true,
        isEnabled: true,
        isTriggered: false,
        createdAt: Date.now()
      },
      {
        id: 'alert_gbp_session',
        pairSymbol: 'GBP/USD',
        condition: 'PRICE_ABOVE',
        targetPrice: 1.3650,
        note: 'London Session high break',
        soundEnabled: true,
        vibrateEnabled: false,
        isEnabled: true,
        isTriggered: false,
        createdAt: Date.now()
      },
      {
        id: 'alert_gbpjpy_res',
        pairSymbol: 'GBP/JPY',
        condition: 'PRICE_ABOVE',
        targetPrice: 215.000,
        note: 'London key resistance breakout level',
        soundEnabled: true,
        vibrateEnabled: true,
        isEnabled: true,
        isTriggered: false,
        createdAt: Date.now()
      }
    ];

    const saved = PersistenceManager.getAlerts();
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved.map((a: PriceAlert) => {
        if (a.id === 'alert_eur_demand' && a.targetPrice === 1.1370) {
          return { ...a, targetPrice: 1.0780, isTriggered: true };
        }
        return a;
      });
    }
    return defaultAlerts;
  });
  const [triggeredEvents, setTriggeredEvents] = useState<TriggeredAlertEvent[]>([]);
  const [latestTriggeredBanner, setLatestTriggeredBanner] = useState<TriggeredAlertEvent | null>(null);

  // App startup timestamp: used to strictly distinguish between pre-existing loaded signals and genuine real-time signals
  const appStartupTimeRef = React.useRef<number>(Date.now());
  // Set of dismissed banner IDs so clicked alerts are permanently removed and never re-displayed across reloads
  const dismissedBannerIdsRef = React.useRef<Set<string>>((() => {
    try {
      const raw = localStorage.getItem('fx_dismissed_banners_v1');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set<string>();
  })());

  // Synchronous Ref locks so React StrictMode double-invocations and rapid concurrent price ticks never fire duplicate alerts
  const triggeredAlertIdsRef = React.useRef<Set<string>>(
    new Set(alerts.filter(a => a.isTriggered).map(a => a.id))
  );
  const notifiedElev8EventsRef = React.useRef<Set<string>>(new Set());
  const notifiedNewsSyncRef = React.useRef<Set<string>>(new Set());

  // Baseline pre-existing signals on web app launch to prevent bulk Telegram spam on startup
  useEffect(() => {
    TelegramAlertService.baselineInitialSignals(signalsRef.current);
  }, []);

  // Persist alerts state whenever it changes
  useEffect(() => {
    PersistenceManager.saveAlerts(alerts);
    alerts.forEach(a => {
      if (a.isTriggered) {
        triggeredAlertIdsRef.current.add(a.id);
      }
    });
  }, [alerts]);

  // AI Copilot State (Persisted in localStorage until manually cleared by the user)
  const [aiPersona, setAiPersona] = useState<AiPersonaId>('UNIVERSAL');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>(() => {
    const saved = PersistenceManager.getAiChatMessages();
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return [
      {
        id: 'welcome_msg',
        text: `### 🌐 Welcome to Universal & Institutional AI Copilot
Powered by **Gemini 3.8 Flash** with full live terminal access.

In **Universal AI Copilot (Ask Anything)** mode, you can ask **any query** about:
- **Live Trades & Any Pair:** Analyze active signals or inspect any of the 30 pairs (even those on Standby/Chart Watch).
- **Economic Calendar & News Impact:** Ask what happens to any pair when CPI, NFP, GDP, or FOMC news releases and how to adjust your strategy.
- **Technical, Macro & Risk Intelligence:** Ask about SMC/FVG, indicators (RSI, EMA), currency strength, lot sizing math, prop firm rules, or any general market question.

Tap a topic or suggested prompt below, or type any question in the chat bar!`,
        isUser: false,
        timestamp: Date.now(),
        suggestedPrompts: [
          'What high-impact news is coming today & how will it affect pairs?',
          'Analyze Best Trade Now (XAU/USD)',
          'Which currency is strongest & weakest right now?',
          'Analyze GBP/CAD live price, strength & news bias',
          'Calculate risk: $1,000 account, 1% risk',
          'Smart Money: How to trade FVG + Order Blocks'
        ]
      }
    ];
  });

  // Automatically persist AI chat messages across browser reloads & sessions
  useEffect(() => {
    if (aiChatMessages.length > 0) {
      PersistenceManager.saveAiChatMessages(aiChatMessages);
    }
  }, [aiChatMessages]);

  // Backtest State
  const [cachedBacktestTrades, setCachedBacktestTrades] = useState<BacktestTrade[]>([]);
  const [backtestFilter, setBacktestFilter] = useState<BacktestFilter>({
    strategy: 'GOLD_HUNTER',
    timeframe: null,
    minConfluence: 85,
    pairSymbol: null,
    outcomeFilter: null
  });
  // Automatically compute backtest summary via useMemo whenever signals, filter, or cached trades change
  const backtestSummary = useMemo(() => {
    return BacktestEngine.runBacktest(backtestFilter, cachedBacktestTrades.length > 0 ? cachedBacktestTrades : undefined, signals);
  }, [signals, backtestFilter, cachedBacktestTrades]);

  // Macro & Fundamentals
  const [macroData, setMacroData] = useState<MacroMarketData>(() => ({
    assets: [],
    newsArticles: [],
    centralBankStances: [],
    marketRegime: 'Moderate Risk-On • Balancing',
    riskSentiment: 'Equities steady, Yields consolidating, USD range-bound',
    dxyAssessment: 'UUP Dollar Bullish ETF at 28.39; short-term support holding',
    goldFundamentalDriver: 'Geopolitical reserve accumulation & ETF inflows keeping Gold anchored above $4,250/oz',
    lastUpdatedUtc: 'Finnhub Live',
    isLoading: false
  }));

  // Modals
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isElev8ModalOpen, setIsElev8ModalOpen] = useState(false);
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [isAddAlertModalOpen, setIsAddAlertModalOpen] = useState(false);
  const [prefillAlertPair, setPrefillAlertPair] = useState<ForexPair | null>(null);
  const [prefillAlertPrice, setPrefillAlertPrice] = useState<number | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isStrengthModalOpen, setIsStrengthModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => soundFx.getMuted());

  // Elev8 MT5 Account Integration State
  const [elev8Config, setElev8Config] = useState<Elev8AccountConfig>(() => {
    return PersistenceManager.getElev8Config() || DEFAULT_ELEV8_CONFIG;
  });
  const [selectedElev8OrderSignal, setSelectedElev8OrderSignal] = useState<ForexSignal | null>(null);
  const [elev8Trades, setElev8Trades] = useState<Elev8Trade[]>(() => {
    const saved = PersistenceManager.getElev8Trades();
    if (saved && saved.length > 0) return saved;
    const initialTrades: Elev8Trade[] = [
      {
        id: 'ELEV8-001',
        signalId: 'SIG-XAU-001',
        symbol: 'XAUUSD',
        orderType: 'BUY_MARKET',
        lots: 0.50,
        entryPrice: 4152.00,
        currentPrice: 4164.00,
        stopLoss: 4135.00,
        takeProfit1: 4196.00,
        takeProfit2: 4225.00,
        takeProfit3: 4260.00,
        status: 'OPEN',
        realizedPnl: 0,
        floatingPnl: 600.00,
        pips: 120.0,
        slRiskDollars: 850.00,
        tp1GainDollars: 2200.00,
        tp2GainDollars: 3650.00,
        tp3GainDollars: 5400.00,
        openedAt: Date.now() - 3600 * 1000 * 2
      },
      {
        id: 'ELEV8-002',
        signalId: 'SIG-EUR-002',
        symbol: 'EURUSD',
        orderType: 'SELL_MARKET',
        lots: 1.00,
        entryPrice: 1.1220,
        currentPrice: 1.1181,
        stopLoss: 1.1235,
        takeProfit1: 1.1181,
        takeProfit2: 1.1162,
        takeProfit3: 1.1140,
        status: 'CLOSED',
        closeReason: 'TP1',
        realizedPnl: 390.00,
        floatingPnl: 0,
        pips: 39.0,
        slRiskDollars: 150.00,
        tp1GainDollars: 390.00,
        tp2GainDollars: 580.00,
        tp3GainDollars: 800.00,
        openedAt: Date.now() - 3600 * 1000 * 5,
        closedAt: Date.now() - 3600 * 1000 * 3
      }
    ];
    return initialTrades;
  });

  const handleExecuteElev8Trade = (trade: Elev8Trade) => {
    const pair = ALL_PAIRS.find(p => p.symbol === trade.symbol) || selectedPair;
    const calibratedTrade = adaptiveSlLearningService.calibrateElev8TradeWithSlLessons(trade, pair);
    setElev8Trades(prev => {
      const updated = [calibratedTrade, ...prev];
      PersistenceManager.saveElev8Trades(updated);
      return updated;
    });
  };

  const handleCloseElev8Trade = (tradeId: string) => {
    setElev8Trades(prev => {
      const updated = prev.map(t => {
        if (t.id === tradeId) {
          return {
            ...t,
            status: 'CLOSED' as const,
            closeReason: 'MANUAL' as const,
            realizedPnl: t.floatingPnl,
            closedAt: Date.now()
          };
        }
        return t;
      });
      PersistenceManager.saveElev8Trades(updated);
      return updated;
    });
  };

  const handleDeleteElev8Trade = (tradeId: string) => {
    setElev8Trades(prev => {
      const updated = prev.filter(t => t.id !== tradeId);
      PersistenceManager.saveElev8Trades(updated);
      return updated;
    });
  };

  const handleMoveToBreakEven = (tradeId: string) => {
    setElev8Trades(prev => {
      const updated = prev.map(t => {
        if (t.id === tradeId) {
          return {
            ...t,
            stopLoss: t.entryPrice
          };
        }
        return t;
      });
      PersistenceManager.saveElev8Trades(updated);

      const targetTrade = prev.find(t => t.id === tradeId);
      if (targetTrade) {
        soundFx.playBreakEvenSound();
        const beMsg = `🛡️ *TRADE MOVED TO BREAK-EVEN (BE)!*\n\n` +
          `📊 *Pair:* ${targetTrade.symbol} (${targetTrade.orderType.replace('_', ' ')})\n` +
          `💵 *Lots:* ${targetTrade.lots.toFixed(2)}\n` +
          `📍 *Entry Price:* ${targetTrade.entryPrice}\n` +
          `🛡️ *New Stop Loss:* ${targetTrade.entryPrice} (*0.0 Pips Risk / $0.00 Loss Risk*)\n` +
          `🎯 *Take Profit 1:* ${targetTrade.takeProfit1}\n\n` +
          `👉 *Your position is now 100% RISK-FREE. All downside capital is protected while runners aim for higher TP targets!*`;
        TelegramAlertService.sendAlert(beMsg);
      }
      return updated;
    });
  };

  const handleClearElev8History = () => {
    setElev8Trades([]);
    PersistenceManager.saveElev8Trades([]);
  };

  // Clock Ticker (1 second)
  const [nowClockMs, setNowClockMs] = useState(Date.now());
  const notifiedTransitionsRef = React.useRef<Set<string>>(
    new Set(PersistenceManager.getNotifiedTransitions())
  );
  const prevSignalsStatusRef = React.useRef<Map<string, ForexSignal['status']>>(
    new Map(signals.map(s => [s.id, s.status]))
  );

  const persistDismissedBannerId = useCallback((id: string) => {
    try {
      const set = dismissedBannerIdsRef.current;
      set.add(id);
      const arr = Array.from(set).slice(-200);
      localStorage.setItem('fx_dismissed_banners_v1', JSON.stringify(arr));
    } catch {}
  }, []);

  const handleDismissBanner = useCallback(() => {
    setLatestTriggeredBanner(current => {
      if (current) {
        persistDismissedBannerId(current.id);
        if (current.alertId) {
          persistDismissedBannerId(current.alertId);
        }
        const canonicalKey = `${current.pairSymbol}:${current.condition}`;
        persistDismissedBannerId(canonicalKey);
      }
      return null;
    });
  }, [persistDismissedBannerId]);

  const appendUniqueTriggeredEvent = useCallback((evt: TriggeredAlertEvent) => {
    // 1. Never pop up banners during startup grace period (first 60 seconds of web app open)
    if (Date.now() - appStartupTimeRef.current < 60000) {
      persistDismissedBannerId(evt.id);
      if (evt.alertId) persistDismissedBannerId(evt.alertId);
      const canonicalKey = `${evt.pairSymbol}:${evt.condition}`;
      persistDismissedBannerId(canonicalKey);
      return;
    }

    // 2. If user has dismissed this alert ID or canonical pair-condition, never re-show it
    const canonicalKey = `${evt.pairSymbol}:${evt.condition}`;
    if (
      dismissedBannerIdsRef.current.has(evt.id) ||
      (evt.alertId && dismissedBannerIdsRef.current.has(evt.alertId)) ||
      dismissedBannerIdsRef.current.has(canonicalKey)
    ) {
      return;
    }

    setTriggeredEvents(prev => {
      const isDuplicate = prev.some(
        existing =>
          existing.id === evt.id ||
          (existing.pairSymbol === evt.pairSymbol &&
            existing.condition === evt.condition &&
            Math.abs(existing.timestamp - evt.timestamp) < 3600 * 1000)
      );
      if (isDuplicate) return prev;
      return [evt, ...prev];
    });

    persistDismissedBannerId(canonicalKey);
    setLatestTriggeredBanner(evt);
  }, [persistDismissedBannerId]);

  const runNewsSignalSync = useCallback((showBanner: boolean = false) => {
    setSignals(prevSignals => {
      const res = economicCalendarService.synchronizeSignalsWithReleasedNews(prevSignals, allPairs);
      if (res.hasChanges) {
        // Identify any brand-new or flipped/updated signals and automatically send once to Telegram
        const prevMap = new Map(prevSignals.map(s => [s.pair.symbol, s]));
        const isRealTimeSession = (Date.now() - appStartupTimeRef.current) > 8000;

        res.updatedSignals.forEach(nextSig => {
          const prevSig = prevMap.get(nextSig.pair.symbol);
          const syncKey = `${nextSig.pair.symbol}:${nextSig.type}:${nextSig.entryPrice}`;
          if (!prevSig) {
            if (!notifiedNewsSyncRef.current.has(syncKey)) {
              notifiedNewsSyncRef.current.add(syncKey);
              if (isRealTimeSession) {
                TelegramAlertService.sendNewSignalAlert(
                  nextSig,
                  '🚨📰 *NEW POST-NEWS TRADE SIGNAL FORMED!*',
                  false
                );
              }
            }
          } else if (prevSig.type !== nextSig.type || prevSig.entryPrice !== nextSig.entryPrice) {
            if (!notifiedNewsSyncRef.current.has(syncKey)) {
              notifiedNewsSyncRef.current.add(syncKey);
              if (isRealTimeSession) {
                TelegramAlertService.sendNewSignalAlert(
                  nextSig,
                  '🔄📰 *TRADE SIGNAL UPDATED BY NEWS RELEASE!*',
                  false
                );
              }
            }
          }
        });

        if (showBanner && (res.newlyAddedPairs.length > 0 || res.updatedExistingPairs.length > 0)) {
          soundFx.playAlertPing();
          const addedStr = res.newlyAddedPairs.length > 0 ? `New Signals Added: ${res.newlyAddedPairs.join(', ')}. ` : '';
          const updatedStr = res.updatedExistingPairs.length > 0 ? `Updated: ${res.updatedExistingPairs.join(', ')}` : '';
          const bannerEvt: TriggeredAlertEvent = {
            id: `news-sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            alertId: 'news-guard',
            pairSymbol: res.newlyAddedPairs[0]?.split(' ')[0] || 'NEWS',
            title: '📰 Post-News Signals Automatically Updated & Sent to Telegram!',
            message: `${addedStr}${updatedStr}`,
            timestamp: Date.now(),
            condition: 'VIP_SIGNAL',
            price: 0
          };
          appendUniqueTriggeredEvent(bannerEvt);
        }
        return res.updatedSignals;
      }
      return prevSignals;
    });
  }, [allPairs, appendUniqueTriggeredEvent]);

  // Institutional SMC Signal Scanner: automatically replenishes closed trades and enables on-demand scanning
  const runAutoSignalScanner = useCallback(
    (showBanner: boolean = false, forceForTopPairs: boolean = false, targetPairSymbol?: string) => {
      setSignals(prevSignals => {
        const res = signalScannerService.scanAndReplenishSignals(prevSignals, allPairs, {
          selectedStrategy: activeStrategy,
          forceFormNewForTopPairs: forceForTopPairs,
          targetPairSymbol
        });
        if (res.newlyFormed.length > 0) {
          if (showBanner) {
            soundFx.playVipSignalPing();
            const formedSymbols = res.newlyFormed.map(s => s.pair.symbol).join(', ');
            const bannerEvt: TriggeredAlertEvent = {
              id: `scanner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              alertId: 'smc-scanner',
              pairSymbol: res.newlyFormed[0]?.pair.symbol || 'SMC',
              title: `⚡ ${res.newlyFormed.length} Fresh Institutional Signal${res.newlyFormed.length > 1 ? 's' : ''} Formed!`,
              message: `Institutional MTF scan formed active setups for: ${formedSymbols}.`,
              timestamp: Date.now(),
              condition: 'VIP_SIGNAL',
              price: res.newlyFormed[0]?.entryPrice || 0
            };
            appendUniqueTriggeredEvent(bannerEvt);
          }
          return res.updatedSignals.map(enforceTimeframeHierarchy);
        }
        return prevSignals.map(enforceTimeframeHierarchy);
      });
    },
    [allPairs, activeStrategy, appendUniqueTriggeredEvent]
  );

  // Refresh every 5 minutes: background MTF check replaces card if new TF becomes stronger
  useEffect(() => {
    const mtfTimer = setInterval(() => {
      runAutoSignalScanner(false, true);
    }, 5 * 60 * 1000);
    return () => clearInterval(mtfTimer);
  }, [runAutoSignalScanner]);

  // Persist live signals state (including HIT_SL / HIT_TP closed status) & dispatch transition alerts strictly from committed state
  useEffect(() => {
    PersistenceManager.saveSignalsState(signals);

    const marketOpen = isForexMarketOpen(new Date());

    signals.forEach(sig => {
      const prevStatus = prevSignalsStatusRef.current.get(sig.id);
      prevSignalsStatusRef.current.set(sig.id, sig.status);

      if (!prevStatus || prevStatus === sig.status) return;

      // Immediately emit unified PersistenceManager transition event whenever RUNNING transitions to HIT_SL or HIT_TP
      if (prevStatus === 'RUNNING' && (sig.status === 'HIT_TP' || sig.status === 'HIT_SL')) {
        PersistenceManager.emitSignalTransition({
          signalId: sig.id,
          pairSymbol: sig.pair.symbol,
          previousStatus: prevStatus,
          newStatus: sig.status,
          closedAtMs: sig.closedAtMs || Date.now(),
          signal: sig,
          allSignals: signals
        });
      }

      // Do not fire automated transition alerts or sounds during weekend market closure, startup grace period (60s), or for past reconciled signals
      const isStartupGracePeriod = (Date.now() - appStartupTimeRef.current) < 60000;
      if (!marketOpen || isStartupGracePeriod || (sig as any).isPastReconciled) {
        const transKey = `${sig.id}:${sig.status}`;
        notifiedTransitionsRef.current.add(transKey);
        PersistenceManager.saveNotifiedTransition(transKey);
        return;
      }

      const quote = sig.currentPrice || sig.pair.currentPrice;

      if (prevStatus === 'PENDING' && sig.status === 'RUNNING') {
        const transKey = `${sig.id}:RUNNING`;
        if (!notifiedTransitionsRef.current.has(transKey)) {
          notifiedTransitionsRef.current.add(transKey);
          PersistenceManager.saveNotifiedTransition(transKey);
          
          soundFx.playOrderFilled();
          TelegramAlertService.sendNewSignalAlert(
            sig,
            '🎯 *PENDING SIGNAL TRIGGERED (NOW RUNNING)!*',
            false
          );
          const fillEvt: TriggeredAlertEvent = {
            id: `sig-fill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${sig.id}`,
            alertId: sig.id,
            pairSymbol: sig.pair.symbol,
            title: `🎯 ${sig.pair.symbol} Pending Signal Triggered!`,
            message: `${sig.type.replace('_', ' ')} filled at ${quote} • TP1: ${sig.takeProfit1} | SL: ${sig.stopLoss}`,
            timestamp: Date.now(),
            condition: 'PENDING_ORDER_TRIGGERED',
            price: quote
          };
          appendUniqueTriggeredEvent(fillEvt);
        }
      } else if (prevStatus === 'RUNNING' && sig.status === 'HIT_TP') {
        const transKey = `${sig.id}:HIT_TP`;
        if (!notifiedTransitionsRef.current.has(transKey)) {
          notifiedTransitionsRef.current.add(transKey);
          PersistenceManager.saveNotifiedTransition(transKey);
          
          soundFx.playTpChime();
          TelegramAlertService.sendAlert(
            `🎉 *SIGNAL TAKE PROFIT 1 HIT!*\n\n` +
            `📊 *Pair:* ${sig.pair.symbol} (${sig.type.replace('_', ' ')})\n` +
            `📍 *Entry:* ${sig.entryPrice}\n` +
            `🎯 *TP1 Reached:* ${quote} (+${Math.abs(sig.pips)} pips)\n` +
            `🛡️ *Action:* Moved to Closed History (+${Math.abs(sig.pips)} pips win)!`
          );
          const tpEvt: TriggeredAlertEvent = {
            id: `sig-tp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${sig.id}`,
            alertId: sig.id,
            pairSymbol: sig.pair.symbol,
            title: `🎉 ${sig.pair.symbol} Take Profit 1 Hit!`,
            message: `${sig.type.replace('_', ' ')} reached TP1 at ${quote} (+${Math.abs(sig.pips)} pips) • Moved to Closed section.`,
            timestamp: Date.now(),
            condition: 'TP_HIT' as any,
            price: quote
          };
          appendUniqueTriggeredEvent(tpEvt);

          // Automatically schedule background scanner to formulate next setup silently (showBanner = false)
          setTimeout(() => {
            runAutoSignalScanner(false, false, sig.pair.symbol);
          }, 4000);
        }
      } else if (prevStatus === 'RUNNING' && sig.status === 'HIT_SL') {
        const transKey = `${sig.id}:HIT_SL`;
        if (!notifiedTransitionsRef.current.has(transKey)) {
          notifiedTransitionsRef.current.add(transKey);
          PersistenceManager.saveNotifiedTransition(transKey);
          
          soundFx.playStopLossSound();
          TelegramAlertService.sendAlert(
            `🛡️ *SIGNAL STOP LOSS HIT*\n\n` +
            `📊 *Pair:* ${sig.pair.symbol} (${sig.type.replace('_', ' ')})\n` +
            `📍 *Entry:* ${sig.entryPrice}\n` +
            `🛑 *SL Hit at:* ${quote}\n` +
            `ℹ️ Setup invalidated & moved to Closed History.`
          );
          const slEvt: TriggeredAlertEvent = {
            id: `sig-sl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${sig.id}`,
            alertId: sig.id,
            pairSymbol: sig.pair.symbol,
            title: `🛑 ${sig.pair.symbol} Stop Loss Hit`,
            message: `${sig.type.replace('_', ' ')} (Entry ${sig.entryPrice}) hit SL at ${quote} • Moved to Closed section.`,
            timestamp: Date.now(),
            condition: 'SL_HIT' as any,
            price: quote
          };
          appendUniqueTriggeredEvent(slEvt);

          // Automatically schedule background scanner to formulate next setup silently (showBanner = false)
          setTimeout(() => {
            runAutoSignalScanner(false, false, sig.pair.symbol);
          }, 4000);
        }
      }
    });
  }, [signals, appendUniqueTriggeredEvent, runAutoSignalScanner]);



  // 24/7 Server Signal Sync & Offline Gap Reconciliation
  const perform247Sync = useCallback(async () => {
    try {
      const res = await fetch('/api/signals/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signals: signalsRef.current })
      });
      const data = await res.json();
      if (data?.signals && Array.isArray(data.signals)) {
        const closedOnServer = data.signals.filter(
          (s: any) => s.status === 'HIT_SL' || s.status === 'HIT_TP'
        );
        if (closedOnServer.length > 0) {
          setSignals(prev => {
            let modified = false;
            const next = prev.map(p => {
              const srv = closedOnServer.find((c: any) => c.id === p.id);
              if (srv && (p.status === 'RUNNING' || p.status === 'PENDING')) {
                modified = true;
                return {
                  ...p,
                  status: srv.status,
                  currentPrice: srv.currentPrice,
                  closedAtMs: srv.closedAtMs || Date.now(),
                  validityTimeLeft: srv.validityTimeLeft || p.validityTimeLeft,
                  validityExpiresAt: srv.validityExpiresAt || p.validityExpiresAt
                };
              }
              return p;
            });
            return modified ? next : prev;
          });
        }
      }
    } catch {
      // offline fallback
    }

    try {
      const report = await offlineGapReconciler.reconcileSignals(signalsRef.current);
      if (report.reconciledCount > 0) {
        setSignals(report.updatedSignals);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    perform247Sync();
    const interval = setInterval(perform247Sync, 30000);
    return () => clearInterval(interval);
  }, [perform247Sync]);

  // Automatically dispatch newly formed signals to Telegram strictly in REAL-TIME
  // (NEVER push bulk alerts or pre-existing loaded signals when opening the web app)
  useEffect(() => {
    const activeValid = signals.filter(s => isSignalValidAndActive(s));

    // During weekend market closure, mark any synced signals as already known and do NOT send automated alerts
    if (!isForexMarketOpen(new Date())) {
      activeValid.forEach(sig => {
        if (sig.isLiveSynced) {
          TelegramAlertService.markSignalSent(sig);
        }
      });
      return;
    }

    const isRealTimeSession = (Date.now() - appStartupTimeRef.current) > 60000;

    // Only dispatch signals formed in real-time during this active browser session after 60s startup baseline.
    // Pre-existing signals present on initial web app launch are silently acknowledged.
    activeValid.forEach(sig => {
      const isFreshRealTimeSignal =
        isRealTimeSession &&
        typeof sig.createdAtMs === 'number' &&
        sig.createdAtMs >= (appStartupTimeRef.current + 60000);

      if (isFreshRealTimeSignal && sig.isLiveSynced && !TelegramAlertService.hasSignalBeenSent(sig)) {
        TelegramAlertService.sendNewSignalAlert(
          sig,
          sig.isBestTradeNow
            ? '🏆 *NEW BEST TRADE NOW SIGNAL FORMED!*'
            : '🚨 *NEW TRADE SIGNAL FORMED!*',
          false
        );
      } else {
        // Silently mark pre-existing initial signals as known so they never blast
        TelegramAlertService.markSignalSent(sig);
      }
    });
  }, [signals]);

  useEffect(() => {
    // Initial sync for already-released session news and auto-replenish check (only during active market hours)
    const marketOpen = isForexMarketOpen(new Date());
    if (marketOpen) {
      runNewsSignalSync(false);
      runAutoSignalScanner(false);
    }
    const clockTimer = setInterval(() => {
      const now = Date.now();
      setNowClockMs(now);
      const isOpen = isForexMarketOpen(new Date(now));
      if (isOpen) {
        runNewsSignalSync(false);
        // Auto-scan every 20 seconds for missing setups during open market hours
        if (Math.floor(now / 1000) % 20 === 0) {
          runAutoSignalScanner(false);
        }
      }
    }, 1000);
    return () => clearInterval(clockTimer);
  }, [runNewsSignalSync, runAutoSignalScanner]);



  // Apply live quote to signals, allPairs, candles, and alerts
  const applyLiveQuote = useCallback((symbol: string, quote: number) => {
    if (quote <= 0) return;

    // Pure state update for signals (transitions are handled in the committed useEffect above)
    const ohlc = realPriceService.getOHLC(symbol);
    setSignals(prev =>
      prev.map(sig => (sig.pair.symbol === symbol ? updateSignalWithLiveMarket(sig, quote, ohlc) : sig))
    );

    // Update allPairs
    setAllPairs(prev =>
      prev.map(p => (p.symbol === symbol ? { ...p, currentPrice: quote } : p))
    );

    // Update selected pair
    setSelectedPair(prev => (prev.symbol === symbol ? { ...prev, currentPrice: quote } : prev));

    // Sync last candle if matching
    setCandles(prev => {
      if (selectedPair.symbol === symbol && prev.length > 0) {
        const last = prev[prev.length - 1];
        const updatedLast = {
          ...last,
          close: quote,
          high: Math.max(last.high, quote),
          low: Math.min(last.low, quote)
        };
        return [...prev.slice(0, -1), updatedLast];
      }
      return prev;
    });

    // During weekend market closure, do not fire automated Price Alerts or Elev8 Order triggers
    if (!isForexMarketOpen(new Date())) {
      return;
    }

    // Do not fire automated Price Alerts or Elev8 Order triggers during startup grace period (60 seconds)
    if ((Date.now() - appStartupTimeRef.current) < 60000) {
      // Silently baseline any alerts that are already met by current price so they never burst
      setAlerts(prev => {
        let hasChanges = false;
        const updated = prev.map(a => {
          if (a.isEnabled && !a.isTriggered && a.pairSymbol === symbol) {
            let met = false;
            if (a.condition === 'PRICE_ABOVE') met = quote >= a.targetPrice;
            else if (a.condition === 'PRICE_BELOW') met = quote <= a.targetPrice;
            if (met) {
              hasChanges = true;
              triggeredAlertIdsRef.current.add(a.id);
              return { ...a, isTriggered: true, triggeredAt: Date.now() };
            }
          }
          return a;
        });
        if (hasChanges) {
          PersistenceManager.saveAlerts(updated);
          return updated;
        }
        return prev;
      });
      return;
    }

    // Check alerts with synchronous Ref lock to prevent StrictMode or multi-tick duplicate alerts
    setAlerts(prev => {
      let hasTriggeredChange = false;
      const updated = prev.map(a => {
        if (a.isEnabled && !a.isTriggered && a.pairSymbol === symbol) {
          let fired = false;
          if (a.condition === 'PRICE_ABOVE') fired = quote >= a.targetPrice;
          else if (a.condition === 'PRICE_BELOW') fired = quote <= a.targetPrice;

          if (fired) {
            hasTriggeredChange = true;
            // Synchronously lock alert ID before dispatching so duplicate ticks/StrictMode cannot re-enter
            if (!triggeredAlertIdsRef.current.has(a.id)) {
              triggeredAlertIdsRef.current.add(a.id);
              const newEvt: TriggeredAlertEvent = {
                id: Math.random().toString(36).slice(2),
                alertId: a.id,
                pairSymbol: a.pairSymbol,
                title: `${a.pairSymbol} Alert Triggered!`,
                message: `${a.condition} at ${quote.toFixed(a.pairSymbol.includes('JPY') || a.pairSymbol.includes('XAU') ? 2 : 4)} (${a.note || 'Target reached'})`,
                timestamp: Date.now(),
                condition: a.condition,
                price: quote
              };
              appendUniqueTriggeredEvent(newEvt);
              soundFx.playAlertPing();
              TelegramAlertService.sendAlert(
                `🔔 *PRICE ALERT TRIGGERED!*\n\nPair: *${newEvt.pairSymbol}*\nPrice: *${quote}*\nEvent: ${newEvt.title}\nDetails: ${newEvt.message}`,
                undefined,
                false
              );
            }
            return { ...a, isTriggered: true, triggeredAt: Date.now() };
          }
        }
        return a;
      });

      if (hasTriggeredChange) {
        PersistenceManager.saveAlerts(updated);
        return updated;
      }
      return prev;
    });

    // Check Elev8 Pending Orders for Auto-Trigger or Invalidation
    setElev8Trades(prevTrades => {
      let hasChanges = false;
      const cleanTickSym = symbol.replace('/', '');

      const updated = prevTrades.map(trade => {
        const cleanTradeSym = trade.symbol.replace(elev8Config.symbolSuffix || '', '').replace('/', '');
        if (cleanTickSym !== cleanTradeSym) return trade;

        if (trade.status === 'PENDING') {
          // 1. Check if Pending Order is TRIGGERED & FILLED
          let isTriggered = false;
          if (trade.orderType === 'BUY_LIMIT' && quote <= trade.entryPrice) isTriggered = true;
          else if (trade.orderType === 'SELL_LIMIT' && quote >= trade.entryPrice) isTriggered = true;
          else if (trade.orderType === 'BUY_STOP' && quote >= trade.entryPrice) isTriggered = true;
          else if (trade.orderType === 'SELL_STOP' && quote <= trade.entryPrice) isTriggered = true;

          if (isTriggered) {
            hasChanges = true;
            const fillLockKey = `${trade.id}:PENDING_FILLED`;
            if (!notifiedElev8EventsRef.current.has(fillLockKey)) {
              notifiedElev8EventsRef.current.add(fillLockKey);
              soundFx.playOrderFilled();
              const evt: TriggeredAlertEvent = {
                id: 'evt_trig_' + Date.now() + Math.random().toString(36).slice(2, 5),
                alertId: trade.id,
                pairSymbol: trade.symbol,
                title: `🎯 MT5 Pending Order Filled!`,
                message: `${trade.symbol} ${trade.orderType.replace('_', ' ')} @ ${trade.entryPrice} was filled at ${quote}! Review running position in your MT5 mobile.`,
                timestamp: Date.now(),
                condition: 'PENDING_ORDER_TRIGGERED',
                price: quote
              };
              appendUniqueTriggeredEvent(evt);

              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(evt.title, { body: evt.message });
                } catch {}
              }

              // Automated Real-Time Telegram Alert Dispatch
              const tgFillMsg = `🎯 *MT5 PENDING ORDER FILLED!*\n\nPair: *${trade.symbol}*\nAction: *${trade.orderType.replace('_', ' ')}*\nEntry: *${trade.entryPrice}*\nFilled at: *${quote}*\nTime: ${new Date().toLocaleTimeString()}\n\n👉 *Review running position in your MT5 mobile app now!*`;
              TelegramAlertService.sendAlert(tgFillMsg, undefined, false);
            }

            return {
              ...trade,
              status: 'OPEN' as const,
              triggeredAt: Date.now(),
              currentPrice: quote
            };
          }

          // 2. Check if Pending Order is INVALIDATED (TP hit without entry, or SL breached)
          let isInvalidated = false;
          let invalidReason = '';

          if (trade.orderType === 'SELL_LIMIT') {
            if (trade.takeProfit1 > 0 && quote <= trade.takeProfit1) {
              isInvalidated = true;
              invalidReason = `Target TP1 (${trade.takeProfit1}) reached without entry fill. The trade move has completed.`;
            } else if (trade.stopLoss > 0 && quote >= trade.stopLoss) {
              isInvalidated = true;
              invalidReason = `Price breached Stop Loss (${trade.stopLoss}) before fill.`;
            }
          } else if (trade.orderType === 'BUY_LIMIT') {
            if (trade.takeProfit1 > 0 && quote >= trade.takeProfit1) {
              isInvalidated = true;
              invalidReason = `Target TP1 (${trade.takeProfit1}) reached without entry fill. The trade move has completed.`;
            } else if (trade.stopLoss > 0 && quote <= trade.stopLoss) {
              isInvalidated = true;
              invalidReason = `Price breached Stop Loss (${trade.stopLoss}) before fill.`;
            }
          }

          if (isInvalidated) {
            hasChanges = true;
            const invalLockKey = `${trade.id}:PENDING_INVALIDATED`;
            if (!notifiedElev8EventsRef.current.has(invalLockKey)) {
              notifiedElev8EventsRef.current.add(invalLockKey);
              const evt: TriggeredAlertEvent = {
                id: 'evt_inval_' + Date.now() + Math.random().toString(36).slice(2, 5),
                alertId: trade.id,
                pairSymbol: trade.symbol,
                title: `⚠️ MT5 Pending Order Invalidated!`,
                message: `${trade.symbol} ${trade.orderType.replace('_', ' ')} @ ${trade.entryPrice}: ${invalidReason} Please cancel/delete this order in your MT5 mobile app!`,
                timestamp: Date.now(),
                condition: 'PENDING_ORDER_INVALIDATED',
                price: quote
              };
              appendUniqueTriggeredEvent(evt);

              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(evt.title, { body: evt.message });
                } catch {}
              }

              // Automated Real-Time Telegram Alert Dispatch
              const tgInvalMsg = `⚠️ *MT5 PENDING ORDER INVALIDATED!*\n\nPair: *${trade.symbol}*\nOrder: *${trade.orderType.replace('_', ' ')} @ ${trade.entryPrice}*\nReason: *${invalidReason}*\nTime: ${new Date().toLocaleTimeString()}\n\n⚠️ *Action: Please CANCEL or DELETE this order in your MT5 mobile app immediately!*`;
              TelegramAlertService.sendAlert(tgInvalMsg, undefined, false);
            }

            return {
              ...trade,
              status: 'CLOSED' as const,
              closeReason: 'CANCELLED' as const,
              closedAt: Date.now(),
              currentPrice: quote
            };
          }
        }

        if (trade.status === 'OPEN') {
          const isBuy = trade.orderType.startsWith('BUY');
          const slDist = Math.abs(trade.entryPrice - trade.stopLoss);
          const tp1Dist = Math.abs(trade.takeProfit1 - trade.entryPrice);
          const tp2Dist = Math.abs(trade.takeProfit2 - trade.entryPrice);
          const tp3Dist = Math.abs(trade.takeProfit3 - trade.entryPrice);

          if (
            trade.id === 'ELEV8-001' &&
            slDist > 0 &&
            Math.abs(quote - trade.currentPrice) > slDist * 0.45
          ) {
            hasChanges = true;
            const newEntry = Number((isBuy ? quote - 3.0 : quote + 3.0).toFixed(2));
            return {
              ...trade,
              entryPrice: newEntry,
              currentPrice: quote,
              stopLoss: Number((isBuy ? newEntry - slDist : newEntry + slDist).toFixed(2)),
              takeProfit1: Number((isBuy ? newEntry + tp1Dist : newEntry - tp1Dist).toFixed(2)),
              takeProfit2: Number((isBuy ? newEntry + tp2Dist : newEntry - tp2Dist).toFixed(2)),
              takeProfit3: Number((isBuy ? newEntry + tp3Dist : newEntry - tp3Dist).toFixed(2)),
              pips: 30.0,
              floatingPnl: Math.round(3.0 * 100 * trade.lots * 100) / 100
            };
          }

          let isHitTp = false;
          let isHitSl = false;

          if (isBuy) {
            if (trade.takeProfit1 > 0 && quote >= trade.takeProfit1) isHitTp = true;
            else if (trade.stopLoss > 0 && quote <= trade.stopLoss) isHitSl = true;
          } else {
            if (trade.takeProfit1 > 0 && quote <= trade.takeProfit1) isHitTp = true;
            else if (trade.stopLoss > 0 && quote >= trade.stopLoss) isHitSl = true;
          }

          const upperSym = trade.symbol.toUpperCase();
          const isJpy = upperSym.includes('JPY');
          const isGold = upperSym.includes('XAU') || upperSym.includes('GOLD');
          const isSilver = upperSym.includes('XAG') || upperSym.includes('SILVER');
          const mult = isGold ? 10 : (isJpy || isSilver) ? 100 : 10000;
          const pipVal = isJpy && quote > 0 ? (1000.0 / quote) : 10.0;

          if (isHitTp || isHitSl) {
            hasChanges = true;
            const pips = Math.round(Math.abs(quote - trade.entryPrice) * mult * 10) / 10;
            const pnl = isHitTp ? (pips * pipVal * trade.lots) : -(pips * pipVal * trade.lots);

            const closeLockKey = `${trade.id}:${isHitTp ? 'TP' : 'SL'}`;
            if (!notifiedElev8EventsRef.current.has(closeLockKey)) {
              notifiedElev8EventsRef.current.add(closeLockKey);
              if (isHitTp) {
                soundFx.playTpChime();
              } else {
                soundFx.playStopLossSound();
              }

              const tgMsg = isHitTp
                ? `🎉 *TAKE PROFIT HIT!*\n\nPair: *${trade.symbol}*\nAction: *${trade.orderType.replace('_', ' ')}*\nEntry: *${trade.entryPrice}*\nExit Price: *${quote}*\nProfit: *+$${pnl.toFixed(2)} (+${pips} pips)*\nTime: ${new Date().toLocaleTimeString()}\n\n💰 *Target reached! Check your MT5 balance.*`
                : `🛡️ *STOP LOSS HIT (Capital Protected)*\n\nPair: *${trade.symbol}*\nAction: *${trade.orderType.replace('_', ' ')}*\nEntry: *${trade.entryPrice}*\nExit Price: *${quote}*\nLoss: *-$${Math.abs(pnl).toFixed(2)} (-${pips} pips)*\nTime: ${new Date().toLocaleTimeString()}\n\n🛡️ *Risk managed. Ready for next setup.*`;

              TelegramAlertService.sendAlert(tgMsg, undefined, false);
            }

            return {
              ...trade,
              status: 'CLOSED' as const,
              closeReason: (isHitTp ? 'TP1' : 'SL') as Elev8Trade['closeReason'],
              closedAt: Date.now(),
              currentPrice: quote,
              realizedPnl: Math.round(pnl * 100) / 100,
              floatingPnl: 0,
              pips: isHitTp ? pips : -pips
            };
          }

          // Update live floating P&L and pips for running OPEN trades
          if (quote !== trade.currentPrice) {
            hasChanges = true;
            const signedPriceDiff = isBuy ? (quote - trade.entryPrice) : (trade.entryPrice - quote);
            const livePips = Math.round(signedPriceDiff * mult * 10) / 10;
            const livePnl = Math.round(livePips * pipVal * trade.lots * 100) / 100;
            return {
              ...trade,
              currentPrice: quote,
              pips: livePips,
              floatingPnl: livePnl
            };
          }
        }

        return trade;
      });

      if (hasChanges) {
        PersistenceManager.saveElev8Trades(updated);
        return updated;
      }
      return prevTrades;
    });
  }, [selectedPair.symbol, elev8Config.symbolSuffix, appendUniqueTriggeredEvent]);

  useEffect(() => {
    marketPrecisionService.setPrecisionMode(isMarketPrecisionEnabled);
    try {
      localStorage.setItem('fx_market_precision_mode', String(isMarketPrecisionEnabled));
    } catch {}
    const unsubscribe = marketPrecisionService.onPrecisionTick((sym, price) => {
      applyLiveQuote(sym, price);
    });
    return () => {
      unsubscribe();
    };
  }, [isMarketPrecisionEnabled, applyLiveQuote]);

  // Real Price Service Setup: Gold API (5s) + Open ER-API (10s) + Binance BTC (8s)
  useEffect(() => {
    realPriceService.start();

    const unsubscribePrice = realPriceService.onPrice(tick => {
      applyLiveQuote(tick.symbol, tick.price);
    });

    const unsubscribeAll = realPriceService.onAllPrices(prices => {
      setAllPairs(prev =>
        prev.map(p => {
          const price = prices[p.symbol];
          return price && price > 0 ? { ...p, currentPrice: price } : p;
        })
      );
    });

    setProviderStatus('Real FX & Gold API • Active');

    return () => {
      unsubscribePrice();
      unsubscribeAll();
      realPriceService.stop();
    };
  }, [applyLiveQuote]);

  // Format last sync time (e.g. "18:45")
  const formatLastSyncTime = useCallback((timestamp: number): string => {
    const d = new Date(timestamp);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);

  // Periodic rate polling & quota counting
  const refreshRates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        realPriceService.pollTradingViewQuotes(),
        realPriceService.pollTradingViewCfdAndIndices(),
        realPriceService.pollGoldPrice(),
        realPriceService.pollBtcPrice()
      ]);
      const now = Date.now();
      setLastSyncTime(now);
      PersistenceManager.saveLastSyncTime(now);
      const updatedUsed = PersistenceManager.incrementApiQuota(1);
      setApiQuota({ used: updatedUsed, limit: 800 });
      setProviderStatus('TradingView • Live Interbank Real Feed');
      runAutoSignalScanner(false);
    } catch {
      // fallback
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Synchronized cadence interval
  useEffect(() => {
    if (refreshInterval === 0) {
      // PAUSED / Sleep Mode: Halt all calls, freeze chart & prices
      realPriceService.stop();
      setProviderStatus('Paused • Sleep Mode (0 API calls)');
      return;
    }

    // Active Cadence: Start feed and trigger immediate fetch
    realPriceService.start();
    refreshRates();

    const interval = setInterval(() => {
      // Auto-freeze if document is hidden to conserve API quota & battery
      if (!document.hidden) {
        refreshRates();
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshRates, refreshInterval]);

  // Tab Visibility Listener: Auto-pause when tab is hidden/minimized
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab minimized or switched -> freeze polling
        realPriceService.stop();
      } else {
        // Tab foregrounded -> resume if active
        if (refreshInterval > 0) {
          realPriceService.start();
          refreshRates();
        }
        // Run 24/7 server sync & historical wick reconciler with latest signalsRef
        perform247Sync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [refreshInterval, refreshRates, perform247Sync]);

  // Big Sync ON/OFF Toggle
  const handleToggleSync = useCallback(() => {
    if (refreshInterval === 0) {
      // Resume sync: resume to prevActiveInterval (or 300 / 5m Default)
      const targetInterval = prevActiveInterval > 0 ? prevActiveInterval : 300;
      setRefreshInterval(targetInterval);
      PersistenceManager.saveRefreshInterval(targetInterval);
      realPriceService.start();
      refreshRates();
    } else {
      // Pause sync: save current interval to prevActiveInterval, set interval to 0 (PAUSED mode)
      setPrevActiveInterval(refreshInterval);
      setRefreshInterval(0);
      PersistenceManager.saveRefreshInterval(0);
      realPriceService.stop();
    }
  }, [refreshInterval, prevActiveInterval, refreshRates]);

  const handleSelectRefreshInterval = useCallback((sec: RefreshIntervalSeconds) => {
    setRefreshInterval(sec);
    PersistenceManager.saveRefreshInterval(sec);
    if (sec > 0) {
      setPrevActiveInterval(sec);
      realPriceService.start();
      refreshRates();
    } else {
      realPriceService.stop();
    }
  }, [refreshRates]);

  // Load Macro Data
  const loadMacro = useCallback(async () => {
    setMacroData(prev => ({ ...prev, isLoading: true }));
    const data = await LiveMarketDataService.fetchFinnhubMacroData(finnhubKey);
    setMacroData(data);
  }, [finnhubKey]);

  useEffect(() => {
    loadMacro();
  }, [loadMacro]);

  // Timeframe & Pair Sync
  const loadCandles = useCallback((pair: ForexPair, tf: Timeframe) => {
    setIsCandleLoading(true);
    try {
      const fetched = LiveMarketDataService.fetchCandles(pair, tf, 120);
      setCandles(fetched);
    } catch {
      setCandles(generateCandles(pair, tf, 120));
    } finally {
      setTimeout(() => setIsCandleLoading(false), 200);
    }
  }, []);

  // Pair & Timeframe Selection
  const handleSelectPair = useCallback((pair: ForexPair) => {
    setSelectedPair(pair);
    loadCandles(pair, selectedTimeframe);
    // Immediately fetch real price on switch
    realPriceService.fetchSymbolImmediate(pair.symbol).then(price => {
      if (price > 0) {
        applyLiveQuote(pair.symbol, price);
      }
    });
  }, [selectedTimeframe, loadCandles, applyLiveQuote]);

  const handleSelectTimeframe = useCallback((tf: Timeframe) => {
    setSelectedTimeframe(tf);
    loadCandles(selectedPair, tf);
  }, [selectedPair, loadCandles]);

  // Filtered Signals: Enforces Best TF Wins (One Pair = One Signal Only) and Single Active Strategy
  const filteredSignals = useMemo(() => {
    const seenPairs = new Set<string>();

    return signals.filter(sig => {
      const isValidAndActive = isSignalValidAndActive(sig, nowClockMs);
      const isClosedOrExpired = !isValidAndActive;

      // The Closed / History tab displays closed, hit-TP, hit-SL, or expired orders
      if (selectedFilter === 'HISTORY') {
        if (!isClosedOrExpired) return false;
      } else {
        // Exclude any signal that has expired or been structurally invalidated
        if (!isValidAndActive) return false;

        // User can select ONLY ONE strategy at a time (unless ALL_STRATEGIES is selected):
        const strat = getSignalStrategy(sig);
        if (activeStrategy !== 'ALL_STRATEGIES' && strat !== activeStrategy) {
          return false;
        }

        // Section Filters
        if (selectedFilter === 'VIP' && sig.confluenceScore < 90) return false;
        if (selectedFilter === 'RUNNING' && sig.status !== 'RUNNING') return false;
        if (selectedFilter === 'PENDING' && sig.status !== 'PENDING') return false;
        if (selectedFilter === 'ALL_ACTIVE' && sig.status !== 'RUNNING' && sig.status !== 'PENDING') return false;
        if (selectedFilter === 'MAJORS' && getAssetCategory(sig.pair.symbol) !== 'MAJORS') return false;
        if (selectedFilter === 'MINORS' && getAssetCategory(sig.pair.symbol) !== 'MINORS') return false;
        if ((selectedFilter === 'METALS' || selectedFilter === 'GOLD') && getAssetCategory(sig.pair.symbol) !== 'METALS') return false;
        if (selectedFilter === 'FAVORITES' && !sig.isFavorite) return false;

        // Strict Section & Strategy Routing:
        if (activeStrategy === 'GOLD_HUNTER' && getAssetCategory(sig.pair.symbol) !== 'METALS') {
          return false;
        }
        if (activeStrategy === 'LONDON_KILLER' && getAssetCategory(sig.pair.symbol) === 'METALS') {
          return false;
        }

        // ONE PAIR = ONE SIGNAL ONLY:
        // Discard any secondary signal for the same pair so only the winning TF card is shown
        if (seenPairs.has(sig.pair.symbol)) {
          return false;
        }
        seenPairs.add(sig.pair.symbol);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qClean = q.replace(/[^a-z0-9]/g, '');
        const symLower = sig.pair.symbol.toLowerCase();
        const symClean = symLower.replace(/[^a-z0-9]/g, '');
        const nameLower = sig.pair.name.toLowerCase();
        const nameClean = nameLower.replace(/[^a-z0-9]/g, '');
        const matchesSearch =
          symLower.includes(q) ||
          (qClean.length > 0 && symClean.includes(qClean)) ||
          nameLower.includes(q) ||
          (qClean.length > 0 && nameClean.includes(qClean)) ||
          sig.rationale.toLowerCase().includes(q) ||
          sig.killzone.toLowerCase().includes(q) ||
          sig.type.toLowerCase().replace('_', ' ').includes(q);

        if (!matchesSearch) return false;
      }
      return true;
    }).sort((a, b) => {
      const tfOrder: Record<string, number> = { 'M5': 1, 'M15': 2, 'H1': 3, 'H4': 4, 'D1': 5 };
      if (sortOption === 'LATEST' || sortOption === 'RECENT') return b.createdAtMs - a.createdAtMs;
      if (sortOption === 'OLDEST') return a.createdAtMs - b.createdAtMs;
      if (sortOption === 'SMALL_TF') return (tfOrder[a.timeframe] || 3) - (tfOrder[b.timeframe] || 3);
      if (sortOption === 'HIGH_TF') return (tfOrder[b.timeframe] || 3) - (tfOrder[a.timeframe] || 3);
      if (sortOption === 'PLUS_PIPS') return b.pips - a.pips;
      if (sortOption === 'MINUS_PIPS') return a.pips - b.pips;
      if (sortOption === 'PIPS') return b.pips - a.pips;
      if (sortOption === 'RR') {
        const rrA = parseFloat(a.riskReward.split(':')[1] || '1');
        const rrB = parseFloat(b.riskReward.split(':')[1] || '1');
        return rrB - rrA;
      }
      return b.confluenceScore - a.confluenceScore;
    });
  }, [signals, nowClockMs, selectedFilter, activeStrategy, searchQuery, sortOption]);

  // Favorite & Alert Toggles
  const handleToggleFavorite = (id: string) => {
    setSignals(prev => {
      const updated = prev.map(s => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
      const favIds = updated.filter(s => s.isFavorite).map(s => s.id);
      PersistenceManager.saveFavorites(favIds);
      return updated;
    });
  };

  const handleToggleAlert = (id: string) => {
    setSignals(prev => {
      const targetSig = prev.find(s => s.id === id);
      const willBeActive = targetSig ? !targetSig.hasAlert : false;
      const updated = prev.map(s => (s.id === id ? { ...s, hasAlert: !s.hasAlert } : s));
      const alertIds = updated.filter(s => s.hasAlert).map(s => s.id);
      PersistenceManager.saveAlertToggledSignals(alertIds);

      if (targetSig && willBeActive) {
        TelegramAlertService.sendNewSignalAlert(
          targetSig,
          '🔔 *LIVE TRADE SIGNAL & WATCHDOG ACTIVATED!*',
          true
        );
      }

      return updated;
    });
  };

  // AI Copilot Send Message (supports text + optional uploaded image)
  const handleSendAiMessage = async (
    prompt: string,
    signalCtx?: ForexSignal,
    imageDataUrl?: string | null
  ) => {
    const displayPrompt =
      prompt.trim() ||
      '📸 Analyze this uploaded screenshot (identify pairs, price levels, orders, or news & give trading advice).';

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      text: displayPrompt,
      isUser: true,
      timestamp: Date.now(),
      signalReference: signalCtx ? `${signalCtx.pair.symbol} ${signalCtx.type}` : null,
      imageUrl: imageDataUrl || null
    };

    const thinkingMsgId = Math.random().toString(36).slice(2);
    const thinkingMsg: ChatMessage = {
      id: thinkingMsgId,
      text: imageDataUrl
        ? '🔍 Inspecting your uploaded screenshot with Gemini Vision & cross-referencing live terminal data...'
        : 'Analyzing order book, smart money liquidity voids, and institutional confluence...',
      isUser: false,
      timestamp: Date.now(),
      isGenerating: true
    };

    setAiChatMessages(prev => [...prev, userMsg, thinkingMsg]);
    setIsAiGenerating(true);

    try {
      const bestTrade = signals.find(s => s.isBestTradeNow) || signals[0];
      const persona = AI_PERSONAS[aiPersona];
      const historyForContext = aiChatMessages
        .filter(m => !m.isGenerating)
        .map(m => ({ text: m.text, isUser: m.isUser }));
      const reply = await GeminiChatEngine.generateResponse(
        displayPrompt,
        persona,
        signals,
        bestTrade,
        historyForContext,
        allPairs,
        imageDataUrl
      );

      const pLower = prompt.toLowerCase();
      const followUps = pLower.includes('news') || pLower.includes('calendar') || pLower.includes('impact')
        ? [
            'How should I adjust my trade strategy before & after news?',
            'Analyze Best Trade Now (XAU/USD)',
            'Which currency is strongest & weakest right now?'
          ]
        : pLower.includes('risk')
        ? [
            'How to pass a $50,000 Prop Firm challenge?',
            'When should I move my Stop Loss to Breakeven (BE)?',
            'Analyze Best Trade Now (XAU/USD)'
          ]
        : [
            'What high-impact news is coming today & how will it affect pairs?',
            'Analyze Best Trade Now (XAU/USD)',
            'Which currency is strongest & weakest right now?',
            'Calculate 1% risk for $1,000 account'
          ];

      const assistantMsg: ChatMessage = {
        id: thinkingMsgId,
        text: reply,
        isUser: false,
        timestamp: Date.now(),
        isGenerating: false,
        suggestedPrompts: followUps
      };

      setAiChatMessages(prev => [...prev.filter(m => m.id !== thinkingMsgId), assistantMsg]);
    } catch {
      // ignore
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAskAiForSignal = (sig: ForexSignal) => {
    const isSlHit = sig.status === 'HIT_SL';
    const prompt = isSlHit
      ? `I was trading ${sig.pair.symbol} (${sig.type}) but it hit Stop Loss at ${formatPrice(sig.pair, sig.stopLoss)}. Please audit whether price completed a liquidity sweep (stop hunt) and whether it is good to re-enter ${sig.pair.symbol} now with a limit order at a discount Order Block / Fair Value Gap.`
      : `Provide a deep institutional SMC audit for ${sig.pair.symbol} [${sig.type}] on ${sig.timeframe} timeframe. Status: ${sig.status === 'PENDING' ? `Pending Order (Valid for ${sig.validityTimeLeft})` : `Active Running Trade (+${sig.pips} pips)`}. Entry: ${formatPrice(sig.pair, sig.entryPrice)}, SL: ${formatPrice(sig.pair, sig.stopLoss)}, TP1: ${formatPrice(sig.pair, sig.takeProfit1)}, R:R: ${sig.riskReward}, Confluence: ${sig.confluenceScore}%. Detail order type, timeframe, pending validation/invalidation, and exact lot sizing.`;
    handleSendAiMessage(prompt, sig);
    setSelectedTab('AI_CHAT');
  };

  const handleAddPriceAlert = (
    pairSymbol: string,
    condition: any,
    targetPrice: number,
    note: string,
    sound: boolean,
    vibrate: boolean
  ) => {
    const newAlert: PriceAlert = {
      id: Math.random().toString(36).slice(2),
      pairSymbol,
      condition,
      targetPrice,
      note,
      soundEnabled: sound,
      vibrateEnabled: vibrate,
      isEnabled: true,
      isTriggered: false,
      createdAt: Date.now()
    };
    setAlerts(prev => [newAlert, ...prev]);
    setIsAddAlertModalOpen(false);
  };

  const activeAlertsCount = alerts.filter(a => a.isEnabled).length;
  const isMobileShell = appViewMode === 'MOBILE';
  const liveClockStr = new Date(nowClockMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="min-h-screen terminal-canvas text-[#F1F5F9] flex flex-col items-center justify-start font-sans select-none">
      {/* Native Mobile App Shell */}
      <div
        className={`w-full min-h-screen terminal-app-bg flex flex-col relative transition-all duration-300 ${
          isMobileShell
            ? 'mobile-app-shell max-w-[480px] mx-auto shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-x-hidden'
            : ''
        }`}
      >
        {/* Native Mobile App Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-[var(--app-bg)]/95 backdrop-blur-xl border-b border-[var(--border-color)] px-3 py-2">
          <div className="flex items-center justify-between gap-2 max-w-md mx-auto px-4">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/icon.svg"
                alt="FX Signals Pro"
                className="w-8 h-8 rounded-lg border border-[#FFD700]/40 shadow-sm shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                    FX Signals Pro
                  </span>
                  <button
                    onClick={() => setIs247StatusModalOpen(true)}
                    className="flex items-center gap-1 text-[8.5px] font-black px-1.5 py-0.5 rounded bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 shrink-0 leading-none cursor-pointer transition-all active:scale-95 shadow-xs"
                    title="24/7 Mobile & Cloud Watchdog: ACTIVE (Tap for live status)"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                    24/7 LIVE
                  </button>
                </div>
                <div className="text-[10px] text-[#94A3B8] font-medium truncate">
                  {selectedTab === 'SIGNALS'
                    ? `${signals.filter(s => isSignalValidAndActive(s, nowClockMs)).length} Active Setups · ${liveClockStr} UTC`
                    : selectedTab === 'AI_CHAT'
                    ? 'AI Institutional Copilot'
                    : selectedTab === 'ALERTS'
                    ? `${activeAlertsCount} Active Watchdogs`
                    : selectedTab === 'BACKTEST'
                    ? 'Verified Quant Backtesting Lab'
                    : 'Live Charts, SMC & Macro'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Compact Inline Theme Selector Pills */}
              <div className="hidden md:flex items-center gap-1 bg-[#101522] p-0.5 rounded-lg border border-[#222F47] mr-1">
                {VISUAL_THEMES.map((t) => {
                  const isSelected = activeVisualTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => visualThemeService.setTheme(t.id, true)}
                      className={`px-2 py-0.5 rounded text-[9.5px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#2979FF] text-white shadow-xs'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                      title={`Switch to ${t.name}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: isSelected ? '#FFFFFF' : t.accentColor }}
                      />
                      <span>{t.shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Instant Refresh & Sync Button */}
              <button
                onClick={refreshRates}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E293B] border border-[#2979FF]/40 text-[#2979FF] active:scale-95 transition-all disabled:opacity-50"
                title="Instant Refresh Market Rates & Signals"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00E676]' : ''}`} />
              </button>

              {/* Quick Strength Meter Button */}
              <button
                onClick={() => setIsStrengthModalOpen(true)}
                className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E293B] border border-[#FFD700]/30 text-[#FFD700] active:scale-95 transition-all"
                title="Live Strength Meter (Gold, Silver & FX)"
              >
                <Gauge className="w-3.5 h-3.5" />
              </button>

              {/* Quick News Guard Button */}
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E293B] border border-[#FF3366]/30 text-[#FF3366] active:scale-95 transition-all"
                title="Economic Calendar & News Guard"
              >
                <Flame className="w-3.5 h-3.5" />
              </button>

              {/* Visual Appearance & Themes Studio Button */}
              <button
                onClick={() => setIsThemeModalOpen(true)}
                className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E293B] border border-[#A855F7]/40 text-[#C084FC] active:scale-95 transition-all cursor-pointer"
                title={`Visual Theme: ${visualThemeService.getThemeConfig(activeVisualTheme).name}`}
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {/* Download Native Android APK / QR Modal Button */}
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#00E676] to-[#10B981] hover:opacity-95 text-[#080B11] text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                title="Download Android APK or Scan QR"
              >
                <Download className="w-3 h-3" />
                <span>APK</span>
              </button>
            </div>
          </div>
        </header>

        {/* Telegram In-App Quick Download & Install Alert Bar */}
        {isTelegramWebview && (
          <div className="bg-gradient-to-r from-[#2979FF] via-[#00E676] to-[#10B981] text-[#080B11] px-3 py-1.5 flex items-center justify-between text-[11px] font-black shadow-md border-b border-[#00E676]/40 animate-fadeIn">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-sm">✈️</span>
              <span className="truncate">Telegram Link Active: Tap to download updated APK directly!</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="/FX-Signals-Pro.apk?v=1.4.0"
                download="FX-Signals-Pro-v1.4.0.apk"
                className="bg-[#080B11] text-[#00E676] px-2 py-0.5 rounded-md text-[10px] font-black hover:bg-[#101522] no-underline shadow-xs flex items-center gap-1"
              >
                <Download className="w-2.5 h-2.5" />
                <span>Download .APK</span>
              </a>
              <button
                onClick={() => setIsTelegramWebview(false)}
                className="text-[#080B11]/70 hover:text-[#080B11] font-black text-xs px-1 leading-none"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Triggered Alert Dropdown Banner */}
        <TriggeredAlertBanner
          event={latestTriggeredBanner}
          onDismiss={handleDismissBanner}
          onClickAlert={() => {
            handleDismissBanner();
            setSelectedTab('ALERTS');
          }}
        />

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto pt-2.5 pb-24 ${isMobileShell ? 'px-2.5' : 'px-3 sm:px-5'}`}>
        {selectedTab === 'SIGNALS' && (
          <SignalsScreen
            signals={signals}
            filteredSignals={filteredSignals}
            allPairs={allPairs}
            tradingSessions={getTradingSessions(new Date(nowClockMs))}
            selectedFilter={selectedFilter}
            searchQuery={searchQuery}
            sortOption={sortOption}
            refreshInterval={refreshInterval}
            marketDataProvider={marketDataProvider}
            isMarketOpen={isForexMarketOpen(new Date(nowClockMs))}
            isRefreshing={isRefreshing}
            activeAlertCount={activeAlertsCount}
            nowClockMs={nowClockMs}
            onFilterSelect={handleFilterSelect}
            onSearchChange={setSearchQuery}
            onSortSelect={setSortOption}
            onInspectSignal={setSelectedSignalDetail}
            onToggleFavorite={handleToggleFavorite}
            onToggleAlert={handleToggleAlert}
            onOpenRiskModal={() => setIsRiskModalOpen(true)}
            onOpenProviderModal={() => setIsProviderModalOpen(true)}
            onOpenElev8Modal={() => setIsElev8ModalOpen(true)}
            onOpenElev8Order={(sig) => setSelectedElev8OrderSignal(sig)}
            isElev8Connected={elev8Config.isConnected}
            onOpenRefreshModal={() => setIsRefreshModalOpen(true)}
            onOpenCalendar={() => setIsCalendarModalOpen(true)}
            onOpenStrength={() => setIsStrengthModalOpen(true)}
            onOpenJournal={() => setIsJournalModalOpen(true)}
            onOpenSoundSettings={() => setIsSoundSettingsOpen(true)}
            isSoundMuted={isSoundMuted}
            onToggleSound={() => setIsSoundMuted(soundFx.toggleMute())}
            onManualRefresh={refreshRates}
            onToggleSync={handleToggleSync}
            lastSyncFormatted={formatLastSyncTime(lastSyncTime)}
            quotaUsed={apiQuota.used}
            quotaLimit={apiQuota.limit}
            onAskAi={handleAskAiForSignal}
            onOpenAlerts={() => setSelectedTab('ALERTS')}
            onOpenBacktest={(sig) => {
              if (sig) {
                setBacktestFilter(prev => ({
                  ...prev,
                  strategy: getSignalStrategy(sig),
                  pairSymbol: sig.pair.symbol
                }));
              }
              setSelectedTab('BACKTEST');
            }}
            onOpenLiveChart={(sig) => setLiveChartSignal(sig)}
            onClearClosedHistory={() => {
              PersistenceManager.clearClosedTradesHistory();
              setSignals(prev => prev.filter(s => isSignalValidAndActive(s, nowClockMs)));
            }}
            onScanAndFormSignals={(targetPairSymbol) => runAutoSignalScanner(true, true, targetPairSymbol)}
            onOpenThemeModal={() => setIsThemeModalOpen(true)}
            activeStrategy={activeStrategy}
            onStrategySelect={handleSelectStrategy}
            enabledStrategies={[activeStrategy]}
            onToggleStrategyEnabled={(st) => handleSelectStrategy(st)}
          />
        )}

        {selectedTab === 'AI_CHAT' && (
          <AiChatScreen
            messages={aiChatMessages}
            selectedPersona={aiPersona}
            isGenerating={isAiGenerating}
            onSendMessage={handleSendAiMessage}
            onSelectPersona={setAiPersona}
            onDeleteMessage={(id) => {
              setAiChatMessages(prev => {
                const updated = prev.filter(m => m.id !== id);
                PersistenceManager.saveAiChatMessages(updated);
                return updated;
              });
            }}
            onClearChat={() => {
              PersistenceManager.clearAiChatMessages();
              setAiChatMessages([
                {
                  id: Math.random().toString(36).slice(2),
                  text: `### 🏛️ FX Institutional Copilot Reset\nReady for fresh market analysis with **${AI_PERSONAS[aiPersona].title}**.\n\nAsk anything about Forex, Gold (XAU/USD), US30, Smart Money Concepts, or custom trade plans.`,
                  isUser: false,
                  timestamp: Date.now(),
                  suggestedPrompts: [
                    'Analyze Best Trade Now (XAU/USD)',
                    'Calculate risk for $1,000 account',
                    'Smart Money: How to trade FVG + Order Blocks',
                    'Explain 84.8% Backtested Win Rate'
                  ]
                }
              ]);
            }}
          />
        )}

        {selectedTab === 'ALERTS' && (
          <AlertsScreen
            alerts={alerts}
            triggeredEvents={triggeredEvents}
            onToggleEnabled={(id) => {
              triggeredAlertIdsRef.current.delete(id);
              setAlerts(prev => {
                const updated = prev.map(a =>
                  a.id === id ? { ...a, isEnabled: !a.isEnabled, isTriggered: false } : a
                );
                PersistenceManager.saveAlerts(updated);
                return updated;
              });
            }}
            onDeleteAlert={(id) => {
              triggeredAlertIdsRef.current.delete(id);
              setAlerts(prev => {
                const updated = prev.filter(a => a.id !== id);
                PersistenceManager.saveAlerts(updated);
                return updated;
              });
            }}
            onClearHistory={() => setTriggeredEvents([])}
            onOpenAddModal={() => setIsAddAlertModalOpen(true)}
            onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
            onOpenSoundSettings={() => setIsSoundSettingsOpen(true)}
          />
        )}

        {selectedTab === 'BACKTEST' && (
          <BacktestingLabScreen
            summary={backtestSummary}
            filter={backtestFilter}
            liveSignals={signals}
            onStrategySelect={(st) => {
              setCachedBacktestTrades([]);
              setBacktestFilter(prev => ({ ...prev, strategy: st }));
            }}
            onTimeframeSelect={(tf) => setBacktestFilter(prev => ({ ...prev, timeframe: tf }))}
            onConfluenceSelect={(score) => setBacktestFilter(prev => ({ ...prev, minConfluence: score }))}
            onCategorySelect={(cat) => setBacktestFilter(prev => ({ ...prev, category: cat, pairSymbol: null }))}
            onPairSelect={(pair) => setBacktestFilter(prev => ({ ...prev, pairSymbol: pair }))}
            onOutcomeSelect={(outcome) => setBacktestFilter(prev => ({ ...prev, outcomeFilter: outcome }))}
            onTimeHorizonSelect={(horizon) => setBacktestFilter(prev => ({ ...prev, timeHorizon: horizon }))}
            onAskAi={(prompt) => {
              handleSendAiMessage(prompt);
              setSelectedTab('AI_CHAT');
            }}
            onSummaryUpdate={(newSummary, allTrades) => {
              if (allTrades && allTrades.length > 0) {
                setCachedBacktestTrades(allTrades);
              }
            }}
          />
        )}

        {selectedTab === 'MARKETS' && (
          <div className="max-w-md mx-auto space-y-3 px-4">
            {/* Markets Sub-Tab Header */}
            <div className="flex bg-[#101522] p-1 rounded-xl border border-[#222F47] terminal-card">
              <button
                onClick={() => setSelectedMarketsSubTab('CHARTS')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  selectedMarketsSubTab === 'CHARTS'
                    ? 'bg-[#2979FF] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Live Chart</span>
              </button>

              <button
                onClick={() => setSelectedMarketsSubTab('SMC')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  selectedMarketsSubTab === 'SMC'
                    ? 'bg-[#2979FF] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>SMC Order Flow</span>
              </button>

              <button
                onClick={() => setSelectedMarketsSubTab('CALENDAR')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  selectedMarketsSubTab === 'CALENDAR'
                    ? 'bg-[#2979FF] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Macro & Calendar</span>
              </button>
            </div>

            {selectedMarketsSubTab === 'CHARTS' && (
              <ChartTerminalScreen
                allPairs={allPairs}
                selectedPair={selectedPair}
                selectedTimeframe={selectedTimeframe}
                candles={candles}
                isLoadingCandles={isCandleLoading}
                marketDataProvider={marketDataProvider}
                onPairSelect={handleSelectPair}
                onTimeframeSelect={handleSelectTimeframe}
                onRefreshCandles={() => loadCandles(selectedPair, selectedTimeframe)}
                onBack={() => setSelectedTab('SIGNALS')}
              />
            )}

            {selectedMarketsSubTab === 'SMC' && (
              <SmartMoneyScreen zones={getSmartMoneyZones()} />
            )}

            {selectedMarketsSubTab === 'CALENDAR' && (
              <FundamentalsScreen
                macroData={macroData as any}
                economicEvents={getEconomicEvents()}
                currencyStrengths={getCurrencyStrengths()}
                onRefreshMacro={loadMacro}
              />
            )}
          </div>
        )}
      </main>

        {/* Bottom Navigation Bar — Pinned inside Mobile App Shell */}
        <nav
          className={`fixed bottom-0 z-40 bg-[#0D121F]/98 backdrop-blur-xl border-t border-[#1E293B] px-2 pt-1.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] shadow-2xl ${
            isMobileShell
              ? 'left-1/2 -translate-x-1/2 w-full sm:max-w-[436px] sm:bottom-2 sm:rounded-b-[30px]'
              : 'left-0 right-0'
          }`}
        >
          <div className="max-w-md mx-auto flex items-center justify-around px-4">
            <button
              onClick={() => setSelectedTab('SIGNALS')}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
                selectedTab === 'SIGNALS'
                  ? 'text-[#FFD700] bg-[#182033]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px] font-bold">Signals</span>
            </button>

            <button
              onClick={() => setSelectedTab('AI_CHAT')}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
                selectedTab === 'AI_CHAT'
                  ? 'text-[#FFD700] bg-[#182033]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[10px] font-bold">AI Copilot</span>
            </button>

            <button
              onClick={() => setSelectedTab('ALERTS')}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
                selectedTab === 'ALERTS'
                  ? 'text-[#FFD700] bg-[#182033]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="text-[10px] font-bold">Alerts</span>
              {activeAlertsCount > 0 && (
                <span className="absolute top-0.5 right-2.5 bg-[#FFD700] text-[#080B11] text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedTab('BACKTEST')}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
                selectedTab === 'BACKTEST'
                  ? 'text-[#FFD700] bg-[#182033]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              <FlaskConical className="w-5 h-5" />
              <span className="text-[10px] font-bold">Backtest</span>
            </button>

            <button
              onClick={() => setSelectedTab('MARKETS')}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
                selectedTab === 'MARKETS'
                  ? 'text-[#FFD700] bg-[#182033]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              <BarChart2 className="w-5 h-5" />
              <span className="text-[10px] font-bold">Markets</span>
            </button>
          </div>
          {/* Native Mobile Home Indicator Pill */}
          {isMobileShell && (
            <div className="w-28 h-1 bg-[#334155] rounded-full mx-auto mt-1.5 opacity-70" />
          )}
        </nav>
      </div>

      {/* Modals & Dialogs */}
      {selectedSignalDetail && (() => {
        const liveDetailSignal = signals.find(s => s.id === selectedSignalDetail.id) || selectedSignalDetail;
        return (
          <SignalDetailSheet
            signal={liveDetailSignal}
            onDismiss={() => setSelectedSignalDetail(null)}
            onTestInBacktest={() => {
              setBacktestFilter(prev => ({
                ...prev,
                strategy: getSignalStrategy(liveDetailSignal),
                pairSymbol: liveDetailSignal.pair.symbol
              }));
              setSelectedSignalDetail(null);
              setSelectedTab('BACKTEST');
            }}
            onToggleAlert={() => handleToggleAlert(liveDetailSignal.id)}
            onToggleFavorite={() => handleToggleFavorite(liveDetailSignal.id)}
            onAskAi={handleAskAiForSignal}
            onSetCustomAlert={(sig) => {
              setPrefillAlertPair(sig.pair);
              setPrefillAlertPrice(sig.takeProfit1);
              setIsAddAlertModalOpen(true);
            }}
            onOpenElev8Order={(sig) => setSelectedElev8OrderSignal(sig)}
            nowClockMs={nowClockMs}
            isMarketOpen={isForexMarketOpen(new Date(nowClockMs))}
          />
        );
      })()}

      {selectedElev8OrderSignal && (() => {
        const liveElev8Signal = signals.find(s => s.id === selectedElev8OrderSignal.id) || selectedElev8OrderSignal;
        return (
          <Elev8OrderModal
            signal={liveElev8Signal}
            config={elev8Config}
            isOpen={!!selectedElev8OrderSignal}
            onClose={() => setSelectedElev8OrderSignal(null)}
            onExecuteTrade={handleExecuteElev8Trade}
            onOpenElev8Dashboard={() => setIsElev8ModalOpen(true)}
          />
        );
      })()}

      {isElev8ModalOpen && (
        <Elev8IntegrationModal
          config={elev8Config}
          trades={elev8Trades}
          signals={signals}
          onSaveConfig={(updated) => {
            setElev8Config(updated);
            PersistenceManager.saveElev8Config(updated);
          }}
          onCloseTrade={handleCloseElev8Trade}
          onDeleteTrade={handleDeleteElev8Trade}
          onMoveToBreakEven={handleMoveToBreakEven}
          onClearHistory={handleClearElev8History}
          onDismiss={() => setIsElev8ModalOpen(false)}
        />
      )}

      {isRiskModalOpen && (
        <RiskCalculatorModal onDismiss={() => setIsRiskModalOpen(false)} />
      )}

      {isProviderModalOpen && (
        <MarketDataProviderModal
          currentProvider={marketDataProvider}
          twelveDataKey={twelveDataKey}
          finnhubKey={finnhubKey}
          derivKey={derivApiKey}
          derivAppId={derivAppId}
          activeStatus={providerStatus}
          onSelect={setMarketDataProvider}
          onSaveApiKey={(prov, key) => {
            if (prov === 'TWELVE_DATA') {
              setTwelveDataKey(key);
              try { localStorage.setItem('fx_twelve_data_key', key); } catch {}
            }
            if (prov === 'FINNHUB') {
              setFinnhubKey(key);
              try { localStorage.setItem('fx_finnhub_key', key); } catch {}
            }
          }}
          onSaveDerivConfig={(appId, token) => {
            setDerivAppId(appId);
            setDerivApiKey(token);
            try {
              localStorage.setItem('fx_deriv_app_id', appId);
              localStorage.setItem('fx_deriv_token', token);
            } catch {}
          }}
          onDismiss={() => setIsProviderModalOpen(false)}
        />
      )}

      {isRefreshModalOpen && (
        <RefreshIntervalModal
          currentInterval={refreshInterval}
          onSelect={handleSelectRefreshInterval}
          onDismiss={() => setIsRefreshModalOpen(false)}
          quotaUsed={apiQuota.used}
          quotaLimit={apiQuota.limit}
          lastSyncFormatted={formatLastSyncTime(lastSyncTime)}
        />
      )}

      {isAddAlertModalOpen && (
        <AddAlertDialog
          initialPair={prefillAlertPair}
          initialPrice={prefillAlertPrice}
          onDismiss={() => {
            setIsAddAlertModalOpen(false);
            setPrefillAlertPair(null);
            setPrefillAlertPrice(null);
          }}
          onAddAlert={handleAddPriceAlert}
        />
      )}

      {liveChartSignal && (
        <LiveChartModal
          signal={liveChartSignal}
          isOpen={!!liveChartSignal}
          onClose={() => setLiveChartSignal(null)}
          onAskAi={handleAskAiForSignal}
        />
      )}

      {/* Telegram Real-Time Alerts Configuration Modal */}
      <TelegramAlertModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        activeSignals={filteredSignals}
      />

      {/* Economic Calendar & News Guard Modal */}
      <EconomicCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        activeSignalPairs={signals.map(s => ({ symbol: s.pair.symbol, type: s.type, confluence: s.confluenceScore, isNewsGenerated: s.id.startsWith('SIG-NEWS-') }))}
        onTriggerReleaseNow={(eventId, outcome) => {
          economicCalendarService.triggerReleaseNow(eventId, outcome);
          runNewsSignalSync(true);
        }}
        onSelectPair={(sym) => {
          setIsCalendarModalOpen(false);
          setSelectedTab('SIGNALS');
          setSearchQuery(sym);
          const found = signals.find(s => s.pair.symbol.replace('/', '') === sym.replace('/', ''));
          if (found) setSelectedSignalDetail(found);
        }}
      />

      {/* Live Currency Strength Meter Modal */}
      <CurrencyStrengthModal
        isOpen={isStrengthModalOpen}
        onClose={() => setIsStrengthModalOpen(false)}
        onSelectPair={(sym) => {
          setIsStrengthModalOpen(false);
          const found = signals.find(s => s.pair.symbol.replace('/', '') === sym.replace('/', ''));
          if (found) setSelectedSignalDetail(found);
        }}
      />

      {/* Trader Journal & Analytics Modal */}
      <TradeJournalModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        trades={elev8Trades}
      />

      {/* Institutional Audio Chime & Theme Settings Modal */}
      <SoundSettingsModal
        isOpen={isSoundSettingsOpen}
        onClose={() => setIsSoundSettingsOpen(false)}
      />

      {/* Visual Design System & Themes Studio Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Mobile App Mode & Standalone PWA Installation Modal */}
      <MobileAppInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        viewMode={appViewMode}
        onChangeViewMode={handleChangeViewMode}
        deferredPrompt={deferredInstallPrompt}
        onTriggerInstall={handleTriggerNativeInstall}
      />

      {/* 24/7 Mobile & Cloud Watchdog Status Modal */}
      <Live247StatusModal
        isOpen={is247StatusModalOpen}
        onClose={() => setIs247StatusModalOpen(false)}
        onTriggerSync={perform247Sync}
        activeSignalsCount={signals.filter(s => isSignalValidAndActive(s, nowClockMs)).length}
      />
    </div>
  );
};
export default App;
