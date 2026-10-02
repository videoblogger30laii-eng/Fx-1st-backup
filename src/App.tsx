import React, { useState, useEffect, useCallback } from 'react';
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
  Elev8Trade
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
  isSignalExpiredOrInvalid
} from './services/marketData';
import { LiveMarketDataService } from './services/liveMarketService';
import { realPriceService } from './services/RealPriceService';
import { BacktestEngine } from './services/backtestEngine';
import { GeminiChatEngine } from './services/geminiChatEngine';
import { PersistenceManager } from './services/persistence';

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

// Screens
import { SignalsScreen } from './screens/SignalsScreen';
import { AiChatScreen } from './screens/AiChatScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { BacktestingLabScreen } from './screens/BacktestingLabScreen';
import { ChartTerminalScreen } from './screens/ChartTerminalScreen';
import { SmartMoneyScreen } from './screens/SmartMoneyScreen';
import { FundamentalsScreen } from './screens/FundamentalsScreen';

// Icons
import {
  TrendingUp,
  Sparkles,
  Bell,
  FlaskConical,
  BarChart2,
  LineChart,
  Layers,
  Calendar
} from 'lucide-react';

export const App: React.FC = () => {
  // Navigation State
  const [selectedTab, setSelectedTab] = useState<'SIGNALS' | 'AI_CHAT' | 'ALERTS' | 'BACKTEST' | 'MARKETS'>('SIGNALS');
  const [selectedMarketsSubTab, setSelectedMarketsSubTab] = useState<'CHARTS' | 'SMC' | 'CALENDAR'>('CHARTS');

  // Market & Signals State
  const [signals, setSignals] = useState<ForexSignal[]>(() => getInitialSignals());
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('CONFLUENCE');
  const [selectedSignalDetail, setSelectedSignalDetail] = useState<ForexSignal | null>(null);
  const [liveChartSignal, setLiveChartSignal] = useState<ForexSignal | null>(null);

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
  const [twelveDataKey, setTwelveDataKey] = useState<string>(() => 
    localStorage.getItem('fx_twelve_data_key') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TWELVE_DATA_API_KEY) || 
    'fbf5fe46b0344421a3e9c3fb6a549114'
  );
  const [finnhubKey, setFinnhubKey] = useState<string>(() => 
    localStorage.getItem('fx_finnhub_key') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FINNHUB_API_KEY) || 
    'dafson1r01quvmmhdlsgdafson1r01quvmmhdlt0'
  );
  const [derivAppId, setDerivAppId] = useState<string>(() => 
    localStorage.getItem('fx_deriv_app_id') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DERIV_APP_ID) || 
    '1089'
  );
  const [derivApiKey, setDerivApiKey] = useState<string>(() => 
    localStorage.getItem('fx_deriv_token') || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DERIV_API_TOKEN) || 
    ''
  );

  // Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    {
      id: 'alert_xau_tp1',
      pairSymbol: 'XAU/USD',
      condition: 'PRICE_ABOVE',
      targetPrice: 4298.00,
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
      targetPrice: 1.1370,
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
      targetPrice: 1.3310,
      note: 'London Session high break',
      soundEnabled: true,
      vibrateEnabled: false,
      isEnabled: true,
      isTriggered: false,
      createdAt: Date.now()
    },
    {
      id: 'alert_us30_ath',
      pairSymbol: 'US30',
      condition: 'PRICE_ABOVE',
      targetPrice: 51650.0,
      note: 'All-Time High buy-side liquidity expansion',
      soundEnabled: true,
      vibrateEnabled: true,
      isEnabled: true,
      isTriggered: false,
      createdAt: Date.now()
    }
  ]);
  const [triggeredEvents, setTriggeredEvents] = useState<TriggeredAlertEvent[]>([]);
  const [latestTriggeredBanner, setLatestTriggeredBanner] = useState<TriggeredAlertEvent | null>(null);

  // AI Copilot State
  const [aiPersona, setAiPersona] = useState<AiPersonaId>('INSTITUTIONAL');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      text: `### 🏛️ Welcome to FX Institutional Copilot
Powered by **Gemini 3.5 Flash** neural interbank analytics.

I am actively analyzing the live Forex, Gold, and Indices order flow:
- **Top VIP Setup:** **XAU/USD (Gold)** with **95% Confluence** and verified **84.8% backtested win rate**.
- **Current Sessions:** High-liquidity London/New York session overlap active.
- **Risk Mandate:** Strict 1.0% capital allocation with minimum 1:2.0 asymmetric risk/reward.

Tap any suggested prompt below or type your question!`,
      isUser: false,
      timestamp: Date.now(),
      suggestedPrompts: [
        'Analyze Best Trade Now (XAU/USD)',
        'Calculate risk: $1,000 account, 1% risk',
        'Smart Money: How to trade FVG + Order Blocks',
        'Explain 84.8% Backtested Win Rate',
        'London / NY Overlap trading plan'
      ]
    }
  ]);

  // Backtest State
  const [cachedBacktestTrades, setCachedBacktestTrades] = useState<BacktestTrade[]>([]);
  const [backtestFilter, setBacktestFilter] = useState<BacktestFilter>({
    strategy: 'BEST_TRADE_NOW',
    timeframe: null,
    minConfluence: 70,
    pairSymbol: null,
    outcomeFilter: null
  });
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary>(() =>
    BacktestEngine.runBacktest({ strategy: 'BEST_TRADE_NOW', minConfluence: 70 })
  );

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
        signalId: 'SIG-GOLD-001',
        symbol: 'XAUUSD',
        orderType: 'BUY_MARKET',
        lots: 0.50,
        entryPrice: 4152.00,
        currentPrice: 4182.20,
        stopLoss: 4132.00,
        takeProfit1: 4210.00,
        takeProfit2: 4260.00,
        takeProfit3: 4320.00,
        status: 'OPEN',
        realizedPnl: 0,
        floatingPnl: 1510.00,
        pips: 302.2,
        slRiskDollars: 1000.00,
        tp1GainDollars: 2900.00,
        tp2GainDollars: 5400.00,
        tp3GainDollars: 8400.00,
        openedAt: Date.now() - 3600 * 1000 * 2
      },
      {
        id: 'ELEV8-002',
        signalId: 'SIG-EUR-002',
        symbol: 'EURUSD',
        orderType: 'BUY_MARKET',
        lots: 1.00,
        entryPrice: 1.1310,
        currentPrice: 1.1345,
        stopLoss: 1.1275,
        takeProfit1: 1.1345,
        takeProfit2: 1.1390,
        takeProfit3: 1.1440,
        status: 'CLOSED',
        closeReason: 'TP1',
        realizedPnl: 350.00,
        floatingPnl: 0,
        pips: 35.0,
        slRiskDollars: 350.00,
        tp1GainDollars: 350.00,
        tp2GainDollars: 800.00,
        tp3GainDollars: 1300.00,
        openedAt: Date.now() - 3600 * 1000 * 5,
        closedAt: Date.now() - 3600 * 1000 * 3
      }
    ];
    return initialTrades;
  });

  const handleExecuteElev8Trade = (trade: Elev8Trade) => {
    setElev8Trades(prev => {
      const updated = [trade, ...prev];
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

  const handleClearElev8History = () => {
    setElev8Trades([]);
    PersistenceManager.saveElev8Trades([]);
  };

  // Clock Ticker (1 second)
  const [nowClockMs, setNowClockMs] = useState(Date.now());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNowClockMs(Date.now());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Update backtest when filter changes
  useEffect(() => {
    const summary = BacktestEngine.runBacktest(
      backtestFilter,
      cachedBacktestTrades.length > 0 ? cachedBacktestTrades : undefined
    );
    setBacktestSummary(summary);
  }, [backtestFilter, cachedBacktestTrades]);

  // Apply live quote to signals, allPairs, candles, and alerts
  const applyLiveQuote = useCallback((symbol: string, quote: number) => {
    if (quote <= 0) return;

    // Update signals
    setSignals(prev =>
      prev.map(sig => (sig.pair.symbol === symbol ? updateSignalWithLiveMarket(sig, quote) : sig))
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

    // Check alerts
    setAlerts(prev => {
      let triggered: TriggeredAlertEvent | null = null;
      const updated = prev.map(a => {
        if (a.isEnabled && !a.isTriggered && a.pairSymbol === symbol) {
          let fired = false;
          if (a.condition === 'PRICE_ABOVE') fired = quote >= a.targetPrice;
          else if (a.condition === 'PRICE_BELOW') fired = quote <= a.targetPrice;

          if (fired) {
            triggered = {
              id: Math.random().toString(36).slice(2),
              alertId: a.id,
              pairSymbol: a.pairSymbol,
              title: `${a.pairSymbol} Alert Triggered!`,
              message: `${a.condition} at ${quote.toFixed(2)} (${a.note || 'Target reached'})`,
              timestamp: Date.now(),
              condition: a.condition,
              price: quote
            };
            return { ...a, isTriggered: true, triggeredAt: Date.now() };
          }
        }
        return a;
      });

      if (triggered) {
        const newEvt = triggered;
        setTriggeredEvents(h => [newEvt, ...h]);
        setLatestTriggeredBanner(newEvt);
      }
      return updated;
    });
  }, [selectedPair.symbol]);

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
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshInterval, refreshRates]);

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

  // Filtered Signals: Strictly removes invalid and time-expired signals from all active feeds
  const filteredSignals = signals.filter(sig => {
    const isValidAndActive = isSignalValidAndActive(sig, nowClockMs);
    const isClosedOrExpired = !isValidAndActive;

    // The Closed / History tab displays closed, hit-TP, hit-SL, or expired orders
    if (selectedFilter === 'HISTORY') {
      if (!isClosedOrExpired) return false;
    } else {
      // For all active categories (ALL, VIP, RUNNING, PENDING, GOLD, INDICES, FAVORITES):
      // Exclude any signal that has expired or been structurally invalidated!
      if (!isValidAndActive) return false;

      if (selectedFilter === 'VIP' && sig.confluenceScore < 90) return false;
      if (selectedFilter === 'RUNNING' && sig.status !== 'RUNNING') return false;
      if (selectedFilter === 'PENDING' && sig.status !== 'PENDING') return false;
      if (selectedFilter === 'GOLD' && !sig.pair.symbol.includes('XAU')) return false;
      if (selectedFilter === 'INDICES' && (!sig.pair.symbol.includes('US30') && !sig.pair.symbol.includes('NAS'))) return false;
      if (selectedFilter === 'FAVORITES' && !sig.isFavorite) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sig.pair.symbol.toLowerCase().includes(q) ||
        sig.pair.name.toLowerCase().includes(q) ||
        sig.rationale.toLowerCase().includes(q) ||
        sig.killzone.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    if (sortOption === 'PIPS') return b.pips - a.pips;
    if (sortOption === 'RECENT') return b.createdAtMs - a.createdAtMs;
    if (sortOption === 'RR') {
      const rrA = parseFloat(a.riskReward.split(':')[1] || '1');
      const rrB = parseFloat(b.riskReward.split(':')[1] || '1');
      return rrB - rrA;
    }
    return b.confluenceScore - a.confluenceScore;
  });

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
      const updated = prev.map(s => (s.id === id ? { ...s, hasAlert: !s.hasAlert } : s));
      const alertIds = updated.filter(s => s.hasAlert).map(s => s.id);
      PersistenceManager.saveAlertToggledSignals(alertIds);
      return updated;
    });
  };

  // AI Copilot Send Message
  const handleSendAiMessage = async (prompt: string, signalCtx?: ForexSignal) => {
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      text: prompt,
      isUser: true,
      timestamp: Date.now(),
      signalReference: signalCtx ? `${signalCtx.pair.symbol} ${signalCtx.type}` : null
    };

    const thinkingMsgId = Math.random().toString(36).slice(2);
    const thinkingMsg: ChatMessage = {
      id: thinkingMsgId,
      text: 'Analyzing order book, smart money liquidity voids, and institutional confluence...',
      isUser: false,
      timestamp: Date.now(),
      isGenerating: true
    };

    setAiChatMessages(prev => [...prev, userMsg, thinkingMsg]);
    setIsAiGenerating(true);

    try {
      const bestTrade = signals.find(s => s.isBestTradeNow) || signals[0];
      const persona = AI_PERSONAS[aiPersona];
      const reply = await GeminiChatEngine.generateResponse(
        prompt,
        persona,
        signals,
        bestTrade
      );

      const followUps = prompt.toLowerCase().includes('risk')
        ? ['Show 1:3 R:R position calculator', 'What is max drawdown for prop firms?', 'Analyze Best Trade Now (XAU/USD)']
        : ['Analyze Best Trade Now (XAU/USD)', 'Calculate 1% risk for $1,000 account', 'Smart Money: How to trade FVG + Order Blocks'];

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
    const prompt = `Provide a deep institutional SMC audit for ${sig.pair.symbol} [${sig.type}] on ${sig.timeframe} timeframe. Status: ${sig.status === 'PENDING' ? `Pending Order (Valid for ${sig.validityTimeLeft})` : `Active Running Trade (+${sig.pips} pips)`}. Entry: ${formatPrice(sig.pair, sig.entryPrice)}, SL: ${formatPrice(sig.pair, sig.stopLoss)}, TP1: ${formatPrice(sig.pair, sig.takeProfit1)}, R:R: ${sig.riskReward}, Confluence: ${sig.confluenceScore}%. Detail order type, timeframe, pending validation/invalidation, and exact lot sizing.`;
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

  return (
    <div className="min-h-screen bg-[#080B11] text-[#F1F5F9] flex flex-col font-sans select-none">
      {/* Triggered Alert Dropdown Banner */}
      <TriggeredAlertBanner
        event={latestTriggeredBanner}
        onDismiss={() => setLatestTriggeredBanner(null)}
        onClickAlert={() => {
          setLatestTriggeredBanner(null);
          setSelectedTab('ALERTS');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 pt-4 pb-20">
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
            onFilterSelect={setSelectedFilter}
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
            onManualRefresh={refreshRates}
            onToggleSync={handleToggleSync}
            lastSyncFormatted={formatLastSyncTime(lastSyncTime)}
            quotaUsed={apiQuota.used}
            quotaLimit={apiQuota.limit}
            onAskAi={handleAskAiForSignal}
            onOpenAlerts={() => setSelectedTab('ALERTS')}
            onOpenBacktest={() => setSelectedTab('BACKTEST')}
            onOpenLiveChart={(sig) => setLiveChartSignal(sig)}
          />
        )}

        {selectedTab === 'AI_CHAT' && (
          <AiChatScreen
            messages={aiChatMessages}
            selectedPersona={aiPersona}
            isGenerating={isAiGenerating}
            onSendMessage={handleSendAiMessage}
            onSelectPersona={setAiPersona}
            onClearChat={() => {
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
              setAlerts(prev =>
                prev.map(a => (a.id === id ? { ...a, isEnabled: !a.isEnabled, isTriggered: false } : a))
              );
            }}
            onDeleteAlert={(id) => {
              setAlerts(prev => prev.filter(a => a.id !== id));
            }}
            onClearHistory={() => setTriggeredEvents([])}
            onOpenAddModal={() => setIsAddAlertModalOpen(true)}
          />
        )}

        {selectedTab === 'BACKTEST' && (
          <BacktestingLabScreen
            summary={backtestSummary}
            filter={backtestFilter}
            onStrategySelect={(st) => setBacktestFilter(prev => ({ ...prev, strategy: st }))}
            onTimeframeSelect={(tf) => setBacktestFilter(prev => ({ ...prev, timeframe: tf }))}
            onConfluenceSelect={(score) => setBacktestFilter(prev => ({ ...prev, minConfluence: score }))}
            onPairSelect={(pair) => setBacktestFilter(prev => ({ ...prev, pairSymbol: pair }))}
            onOutcomeSelect={(outcome) => setBacktestFilter(prev => ({ ...prev, outcomeFilter: outcome }))}
            onSummaryUpdate={(newSummary, allTrades) => {
              setBacktestSummary(newSummary);
              if (allTrades && allTrades.length > 0) {
                setCachedBacktestTrades(allTrades);
              } else if (newSummary.filteredTrades.length > 0 && !cachedBacktestTrades.length) {
                setCachedBacktestTrades(newSummary.filteredTrades);
              }
            }}
          />
        )}

        {selectedTab === 'MARKETS' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Markets Sub-Tab Header */}
            <div className="flex bg-[#101522] p-1 rounded-xl border border-[#222F47]">
              <button
                onClick={() => setSelectedMarketsSubTab('CHARTS')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedMarketsSubTab === 'CHARTS'
                    ? 'bg-[#182033] text-[#FFD700] border border-[#222F47]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Charts</span>
              </button>

              <button
                onClick={() => setSelectedMarketsSubTab('SMC')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedMarketsSubTab === 'SMC'
                    ? 'bg-[#182033] text-[#FFD700] border border-[#222F47]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>SMC Flow</span>
              </button>

              <button
                onClick={() => setSelectedMarketsSubTab('CALENDAR')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedMarketsSubTab === 'CALENDAR'
                    ? 'bg-[#182033] text-[#FFD700] border border-[#222F47]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar & Macro</span>
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

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#101522] border-t border-[#222F47] px-4 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setSelectedTab('SIGNALS')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            selectedTab === 'SIGNALS' ? 'text-[#FFD700]' : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-bold">Signals</span>
        </button>

        <button
          onClick={() => setSelectedTab('AI_CHAT')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            selectedTab === 'AI_CHAT' ? 'text-[#FFD700]' : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold">AI Copilot</span>
        </button>

        <button
          onClick={() => setSelectedTab('ALERTS')}
          className={`relative flex flex-col items-center gap-1 transition-colors ${
            selectedTab === 'ALERTS' ? 'text-[#FFD700]' : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[10px] font-bold">Alerts</span>
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 right-2 bg-[#FFD700] text-[#080B11] text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setSelectedTab('BACKTEST')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            selectedTab === 'BACKTEST' ? 'text-[#FFD700]' : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          <FlaskConical className="w-5 h-5" />
          <span className="text-[10px] font-bold">Backtest</span>
        </button>

        <button
          onClick={() => setSelectedTab('MARKETS')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            selectedTab === 'MARKETS' ? 'text-[#FFD700]' : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Markets</span>
        </button>
      </nav>

      {/* Modals & Dialogs */}
      {selectedSignalDetail && (
        <SignalDetailSheet
          signal={selectedSignalDetail}
          onDismiss={() => setSelectedSignalDetail(null)}
          onTestInBacktest={() => {
            setSelectedSignalDetail(null);
            setSelectedTab('BACKTEST');
          }}
          onToggleAlert={() => handleToggleAlert(selectedSignalDetail.id)}
          onToggleFavorite={() => handleToggleFavorite(selectedSignalDetail.id)}
          onAskAi={handleAskAiForSignal}
          onSetCustomAlert={(sig) => {
            setPrefillAlertPair(sig.pair);
            setPrefillAlertPrice(sig.takeProfit1);
            setIsAddAlertModalOpen(true);
          }}
          onOpenElev8Order={(sig) => setSelectedElev8OrderSignal(sig)}
          nowClockMs={nowClockMs}
        />
      )}

      {selectedElev8OrderSignal && (
        <Elev8OrderModal
          signal={selectedElev8OrderSignal}
          config={elev8Config}
          isOpen={!!selectedElev8OrderSignal}
          onClose={() => setSelectedElev8OrderSignal(null)}
          onExecuteTrade={handleExecuteElev8Trade}
          onOpenElev8Dashboard={() => setIsElev8ModalOpen(true)}
        />
      )}

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
    </div>
  );
};
export default App;
