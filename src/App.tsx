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
  StrategyType,
  TradeOutcome,
  AI_PERSONAS
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
  formatPrice
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

  // Charting & Pairs State
  const [allPairs, setAllPairs] = useState<ForexPair[]>(ALL_PAIRS);
  const [selectedPair, setSelectedPair] = useState<ForexPair>(PAIR_XAUUSD);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('H1');
  const [candles, setCandles] = useState<CandleStick[]>(() => generateCandles(PAIR_XAUUSD, 'H1', 120));
  const [isCandleLoading, setIsCandleLoading] = useState<boolean>(false);

  // Provider & Refresh Interval
  const [marketDataProvider, setMarketDataProvider] = useState<MarketDataProvider>('DERIV');
  const [refreshInterval, setRefreshInterval] = useState<RefreshIntervalSeconds>(5);
  const [providerStatus, setProviderStatus] = useState<string>('Deriv • Live Streaming');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [twelveDataKey, setTwelveDataKey] = useState<string>('fbf5fe46b0344421a3e9c3fb6a549114');
  const [finnhubKey, setFinnhubKey] = useState<string>('dafson1r01quvmmhdlsgdafson1r01quvmmhdlt0');
  const [derivAppId, setDerivAppId] = useState<string>('10154');
  const [derivApiKey, setDerivApiKey] = useState<string>('pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c');

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
  const [backtestFilter, setBacktestFilter] = useState<BacktestFilter>({
    strategy: 'BEST_TRADE_NOW',
    timeframe: null,
    minConfluence: 85,
    pairSymbol: null,
    outcomeFilter: null
  });
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary>(() =>
    BacktestEngine.runBacktest({ strategy: 'BEST_TRADE_NOW', minConfluence: 85 })
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
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [isAddAlertModalOpen, setIsAddAlertModalOpen] = useState(false);
  const [prefillAlertPair, setPrefillAlertPair] = useState<ForexPair | null>(null);
  const [prefillAlertPrice, setPrefillAlertPrice] = useState<number | null>(null);

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
    const summary = BacktestEngine.runBacktest(backtestFilter);
    setBacktestSummary(summary);
  }, [backtestFilter]);

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

  // Periodic rate polling
  const refreshRates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        realPriceService.pollGoldPrice(),
        realPriceService.pollFxRates(),
        realPriceService.pollBtcPrice()
      ]);
      setProviderStatus('Active • Real FX & Gold Feed');
    } catch {
      // fallback
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshRates, refreshInterval]);

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

  // Filtered Signals
  const filteredSignals = signals.filter(sig => {
    const isClosed = sig.status === 'HIT_TP' || sig.status === 'HIT_SL';
    if (selectedFilter === 'VIP' && (isClosed || sig.confluenceScore < 90)) return false;
    if (selectedFilter === 'RUNNING' && sig.status !== 'RUNNING') return false;
    if (selectedFilter === 'PENDING' && sig.status !== 'PENDING') return false;
    if (selectedFilter === 'HISTORY' && !isClosed) return false;
    if (selectedFilter === 'GOLD' && (isClosed || !sig.pair.symbol.includes('XAU'))) return false;
    if (selectedFilter === 'INDICES' && (isClosed || (!sig.pair.symbol.includes('US30') && !sig.pair.symbol.includes('NAS')))) return false;
    if (selectedFilter === 'FAVORITES' && (isClosed || !sig.isFavorite)) return false;
    if (selectedFilter === 'ALL' && isClosed) return false;

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
            tradingSessions={getTradingSessions()}
            selectedFilter={selectedFilter}
            searchQuery={searchQuery}
            sortOption={sortOption}
            refreshInterval={refreshInterval}
            marketDataProvider={marketDataProvider}
            isMarketOpen={isForexMarketOpen()}
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
            onOpenRefreshModal={() => setIsRefreshModalOpen(true)}
            onManualRefresh={refreshRates}
            onAskAi={handleAskAiForSignal}
            onOpenAlerts={() => setSelectedTab('ALERTS')}
            onOpenBacktest={() => setSelectedTab('BACKTEST')}
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
          nowClockMs={nowClockMs}
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
            if (prov === 'TWELVE_DATA') setTwelveDataKey(key);
            if (prov === 'FINNHUB') setFinnhubKey(key);
          }}
          onSaveDerivConfig={(appId, token) => {
            setDerivAppId(appId);
            setDerivApiKey(token);
          }}
          onDismiss={() => setIsProviderModalOpen(false)}
        />
      )}

      {isRefreshModalOpen && (
        <RefreshIntervalModal
          currentInterval={refreshInterval}
          onSelect={setRefreshInterval}
          onDismiss={() => setIsRefreshModalOpen(false)}
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
    </div>
  );
};
export default App;
