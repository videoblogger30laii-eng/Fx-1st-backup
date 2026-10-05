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
  Elev8Trade,
  getAssetCategory
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
import { economicCalendarService } from './services/economicCalendarService';

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
import { WhatsAppAlertModal } from './components/WhatsAppAlertModal';
import { EconomicCalendarModal } from './components/EconomicCalendarModal';
import { CurrencyStrengthModal } from './components/CurrencyStrengthModal';
import { TradeJournalModal } from './components/TradeJournalModal';
import { WhatsAppAlertService } from './services/WhatsAppAlertService';
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
  Flame
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
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isStrengthModalOpen, setIsStrengthModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
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
  const notifiedTransitionsRef = React.useRef<Set<string>>(new Set());

  const appendUniqueTriggeredEvent = useCallback((evt: TriggeredAlertEvent) => {
    setTriggeredEvents(prev => {
      const isDuplicate = prev.some(
        existing =>
          existing.id === evt.id ||
          (existing.alertId === evt.alertId &&
            existing.condition === evt.condition &&
            Math.abs(existing.timestamp - evt.timestamp) < 3000)
      );
      if (isDuplicate) return prev;
      return [evt, ...prev];
    });
    setLatestTriggeredBanner(evt);
  }, []);

  const runNewsSignalSync = useCallback((showBanner: boolean = false) => {
    setSignals(prevSignals => {
      const res = economicCalendarService.synchronizeSignalsWithReleasedNews(prevSignals, allPairs);
      if (res.hasChanges) {
        // Identify any brand-new or flipped/updated signals and automatically send to Telegram
        const prevMap = new Map(prevSignals.map(s => [s.pair.symbol, s]));
        res.updatedSignals.forEach(nextSig => {
          const prevSig = prevMap.get(nextSig.pair.symbol);
          if (!prevSig) {
            // Brand new post-news signal formed!
            TelegramAlertService.sendNewSignalAlert(
              nextSig,
              '🚨📰 *NEW POST-NEWS TRADE SIGNAL FORMED!*',
              true
            );
          } else if (prevSig.type !== nextSig.type || prevSig.entryPrice !== nextSig.entryPrice) {
            // Existing signal flipped or updated by news release!
            TelegramAlertService.sendNewSignalAlert(
              nextSig,
              '🔄📰 *TRADE SIGNAL UPDATED BY NEWS RELEASE!*',
              true
            );
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

  // Automatically dispatch any newly formed signal in `signals` to Telegram
  useEffect(() => {
    const activeValid = signals.filter(s => isSignalValidAndActive(s));
    const alreadySent = TelegramAlertService.getSentSignalKeys();

    // If this is the very first load and no signals have ever been recorded yet,
    // send the Best Trade Now VIP signal to Telegram and mark existing initial signals as known
    if (alreadySent.size === 0 && activeValid.length > 0) {
      const bestSig = activeValid.find(s => s.isBestTradeNow) || activeValid[0];
      activeValid.forEach(sig => {
        if (sig.id !== bestSig.id) {
          TelegramAlertService.markSignalKeySent(TelegramAlertService.getSignalSignature(sig));
        }
      });
      if (bestSig) {
        TelegramAlertService.sendNewSignalAlert(
          bestSig,
          '🏆 *NEW VIP BEST TRADE NOW SIGNAL!*',
          false
        );
      }
      return;
    }

    // For any newly formed signal not yet sent to Telegram, dispatch automatically!
    activeValid.forEach(sig => {
      const key = TelegramAlertService.getSignalSignature(sig);
      if (!alreadySent.has(key)) {
        TelegramAlertService.sendNewSignalAlert(
          sig,
          sig.isBestTradeNow
            ? '🏆 *NEW BEST TRADE NOW SIGNAL FORMED!*'
            : '🚨 *NEW TRADE SIGNAL FORMED!*',
          false
        );
      }
    });
  }, [signals]);

  useEffect(() => {
    // Initial sync for already-released session news
    runNewsSignalSync(false);
    const clockTimer = setInterval(() => {
      setNowClockMs(Date.now());
      runNewsSignalSync(true);
    }, 1000);
    return () => clearInterval(clockTimer);
  }, [runNewsSignalSync]);

  // Update backtest when filter or live signals change
  useEffect(() => {
    const summary = BacktestEngine.runBacktest(
      backtestFilter,
      cachedBacktestTrades.length > 0 ? cachedBacktestTrades : undefined,
      signals
    );
    setBacktestSummary(summary);
  }, [backtestFilter, cachedBacktestTrades, signals]);

  // Apply live quote to signals, allPairs, candles, and alerts
  const applyLiveQuote = useCallback((symbol: string, quote: number) => {
    if (quote <= 0) return;

    // Update signals & dispatch Telegram alerts on signal status transitions (PENDING -> RUNNING, or HIT_TP / HIT_SL)
    setSignals(prev =>
      prev.map(sig => {
        if (sig.pair.symbol !== symbol) return sig;
        const updatedSig = updateSignalWithLiveMarket(sig, quote);

        if (sig.status === 'PENDING' && updatedSig.status === 'RUNNING') {
          const transKey = `${sig.id}:RUNNING`;
          if (!notifiedTransitionsRef.current.has(transKey)) {
            notifiedTransitionsRef.current.add(transKey);
            soundFx.playOrderFilled();
            TelegramAlertService.sendNewSignalAlert(
              updatedSig,
              '🎯 *PENDING SIGNAL TRIGGERED (NOW RUNNING)!*',
              true
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
        } else if (sig.status === 'RUNNING' && updatedSig.status === 'HIT_TP') {
          const transKey = `${sig.id}:HIT_TP`;
          if (!notifiedTransitionsRef.current.has(transKey)) {
            notifiedTransitionsRef.current.add(transKey);
            soundFx.playTpChime();
            TelegramAlertService.sendAlert(
              `🎉 *SIGNAL TAKE PROFIT 1 HIT!*\n\n` +
              `📊 *Pair:* ${updatedSig.pair.symbol} (${updatedSig.type.replace('_', ' ')})\n` +
              `📍 *Entry:* ${updatedSig.entryPrice}\n` +
              `🎯 *TP1 Reached:* ${quote} (+${Math.abs(updatedSig.pips)} pips)\n` +
              `🛡️ *Action:* Secure partial profits & move Stop Loss to Entry (${updatedSig.entryPrice}) for risk-free runner to TP2 (${updatedSig.takeProfit2})!`
            );
          }
        } else if (sig.status === 'RUNNING' && updatedSig.status === 'HIT_SL') {
          const transKey = `${sig.id}:HIT_SL`;
          if (!notifiedTransitionsRef.current.has(transKey)) {
            notifiedTransitionsRef.current.add(transKey);
            soundFx.playStopLossSound();
            TelegramAlertService.sendAlert(
              `🛡️ *SIGNAL STOP LOSS HIT*\n\n` +
              `📊 *Pair:* ${updatedSig.pair.symbol} (${updatedSig.type.replace('_', ' ')})\n` +
              `📍 *Entry:* ${updatedSig.entryPrice}\n` +
              `🛑 *SL Hit at:* ${quote}\n` +
              `ℹ️ Setup invalidated & moved to Closed History.`
            );
          }
        }

        return updatedSig;
      })
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
        const newEvt: TriggeredAlertEvent = triggered;
        appendUniqueTriggeredEvent(newEvt);
        soundFx.playAlertPing();
        TelegramAlertService.sendAlert(`🔔 *PRICE ALERT TRIGGERED!*\n\nPair: *${newEvt.pairSymbol}*\nPrice: *${quote}*\nEvent: ${newEvt.title}\nDetails: ${newEvt.message}`);
      }
      return updated;
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

            // Automated WhatsApp & Telegram Alert Dispatch
            const waFillMsg = `🎯 *MT5 PENDING ORDER FILLED!*\n\nPair: *${trade.symbol}*\nAction: *${trade.orderType.replace('_', ' ')}*\nEntry: *${trade.entryPrice}*\nFilled at: *${quote}*\nTime: ${new Date().toLocaleTimeString()}\n\n👉 *Review running position in your MT5 mobile app now!*`;
            WhatsAppAlertService.sendAutomatedAlert(waFillMsg);
            TelegramAlertService.sendAlert(waFillMsg);

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

            // Automated WhatsApp & Telegram Alert Dispatch
            const waInvalMsg = `⚠️ *MT5 PENDING ORDER INVALIDATED!*\n\nPair: *${trade.symbol}*\nOrder: *${trade.orderType.replace('_', ' ')} @ ${trade.entryPrice}*\nReason: *${invalidReason}*\nTime: ${new Date().toLocaleTimeString()}\n\n⚠️ *Action: Please CANCEL or DELETE this order in your MT5 mobile app immediately!*`;
            WhatsAppAlertService.sendAutomatedAlert(waInvalMsg);
            TelegramAlertService.sendAlert(waInvalMsg);

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
          let isHitTp = false;
          let isHitSl = false;

          if (isBuy) {
            if (trade.takeProfit1 > 0 && quote >= trade.takeProfit1) isHitTp = true;
            else if (trade.stopLoss > 0 && quote <= trade.stopLoss) isHitSl = true;
          } else {
            if (trade.takeProfit1 > 0 && quote <= trade.takeProfit1) isHitTp = true;
            else if (trade.stopLoss > 0 && quote >= trade.stopLoss) isHitSl = true;
          }

          const isJpy = trade.symbol.includes('JPY');
          const mult = isJpy ? 100 : (trade.symbol.includes('XAU') ? 10 : 10000);
          const pipVal = isJpy && quote > 0 ? (1000.0 / quote) : (trade.symbol.includes('XAU') ? 10.0 : 10.0);

          if (isHitTp || isHitSl) {
            hasChanges = true;
            if (isHitTp) {
              soundFx.playTpChime();
            } else {
              soundFx.playStopLossSound();
            }

            const pips = Math.round(Math.abs(quote - trade.entryPrice) * mult * 10) / 10;
            const pnl = isHitTp ? (pips * pipVal * trade.lots) : -(pips * pipVal * trade.lots);

            const tgMsg = isHitTp
              ? `🎉 *TAKE PROFIT HIT!*\n\nPair: *${trade.symbol}*\nAction: *${trade.orderType.replace('_', ' ')}*\nEntry: *${trade.entryPrice}*\nExit Price: *${quote}*\nProfit: *+$${pnl.toFixed(2)} (+${pips} pips)*\nTime: ${new Date().toLocaleTimeString()}\n\n💰 *Target reached! Check your MT5 balance.*`
              : `🛡️ *STOP LOSS HIT (Capital Protected)*\n\nPair: *${trade.symbol}*\nAction: *${trade.orderType.replace('_', ' ')}*\nEntry: *${trade.entryPrice}*\nExit Price: *${quote}*\nLoss: *-$${Math.abs(pnl).toFixed(2)} (-${pips} pips)*\nTime: ${new Date().toLocaleTimeString()}\n\n🛡️ *Risk managed. Ready for next setup.*`;

            WhatsAppAlertService.sendAutomatedAlert(tgMsg);
            TelegramAlertService.sendAlert(tgMsg);

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
      if (selectedFilter === 'MAJORS' && getAssetCategory(sig.pair.symbol) !== 'MAJORS') return false;
      if (selectedFilter === 'MINORS' && getAssetCategory(sig.pair.symbol) !== 'MINORS') return false;
      if ((selectedFilter === 'METALS' || selectedFilter === 'GOLD') && getAssetCategory(sig.pair.symbol) !== 'METALS') return false;
      if (selectedFilter === 'INDICES' && getAssetCategory(sig.pair.symbol) !== 'INDICES') return false;
      if (selectedFilter === 'CRYPTO' && getAssetCategory(sig.pair.symbol) !== 'CRYPTO') return false;
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
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 pt-4 pb-36 sm:pb-24">
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
            onOpenCalendar={() => setIsCalendarModalOpen(true)}
            onOpenStrength={() => setIsStrengthModalOpen(true)}
            onOpenJournal={() => setIsJournalModalOpen(true)}
            isSoundMuted={isSoundMuted}
            onToggleSound={() => setIsSoundMuted(soundFx.toggleMute())}
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
              setAlerts(prev =>
                prev.map(a => (a.id === id ? { ...a, isEnabled: !a.isEnabled, isTriggered: false } : a))
              );
            }}
            onDeleteAlert={(id) => {
              setAlerts(prev => prev.filter(a => a.id !== id));
            }}
            onClearHistory={() => setTriggeredEvents([])}
            onOpenAddModal={() => setIsAddAlertModalOpen(true)}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
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
            onSummaryUpdate={(newSummary, allTrades) => {
              setBacktestSummary(newSummary);
              if (allTrades && allTrades.length > 0) {
                setCachedBacktestTrades(allTrades);
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

      {/* Bottom Navigation Bar — Lifted with Mobile System Bar Safe Clearance */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#101522]/98 backdrop-blur-md border-t border-[#222F47] px-2 pt-2 pb-[calc(52px+env(safe-area-inset-bottom,0px))] sm:pb-2.5 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center justify-around">
          <button
            onClick={() => setSelectedTab('SIGNALS')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
              selectedTab === 'SIGNALS'
                ? 'text-[#FFD700] bg-[#182033]/80'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-bold">Signals</span>
          </button>

          <button
            onClick={() => setSelectedTab('AI_CHAT')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
              selectedTab === 'AI_CHAT'
                ? 'text-[#FFD700] bg-[#182033]/80'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] font-bold">AI Copilot</span>
          </button>

          <button
            onClick={() => setSelectedTab('ALERTS')}
            className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
              selectedTab === 'ALERTS'
                ? 'text-[#FFD700] bg-[#182033]/80'
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
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
              selectedTab === 'BACKTEST'
                ? 'text-[#FFD700] bg-[#182033]/80'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <FlaskConical className="w-5 h-5" />
            <span className="text-[10px] font-bold">Backtest</span>
          </button>

          <button
            onClick={() => setSelectedTab('MARKETS')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl active:scale-95 transition-all ${
              selectedTab === 'MARKETS'
                ? 'text-[#FFD700] bg-[#182033]/80'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] font-bold">Markets</span>
          </button>
        </div>
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

      {/* WhatsApp & Telegram Alerts Configuration Modal */}
      <WhatsAppAlertModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
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
    </div>
  );
};
export default App;
