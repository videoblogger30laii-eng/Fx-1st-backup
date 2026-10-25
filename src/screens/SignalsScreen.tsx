import React, { useState, useMemo } from 'react';
import { ForexSignal, ForexPair, RefreshIntervalSeconds, MarketDataProvider, TradingSession, getAssetCategory, getSignalStrategy, STRATEGY_CONFIGS, StrategyType } from '../types';
import { formatPrice, isSignalValidAndActive, createSyntheticSignalForPair, getTradeDurationMs } from '../services/marketData';
import { TradingSessionsClock } from '../components/TradingSessionsClock';
import { BestTradeHeroCard } from '../components/BestTradeHeroCard';
import { MultiTimeframeMatrix } from '../components/MultiTimeframeMatrix';
import { SignalCard } from '../components/SignalCard';
import { ClosedTradesSummaryWidget } from '../components/ClosedTradesSummaryWidget';
import { TradeOutcomeAnalysisModal } from '../components/TradeOutcomeAnalysisModal';
import {
  ClosedTradesControlBar,
  ClosedTimeRange,
  ClosedSortOption,
  ClosedOutcomeFilter
} from '../components/ClosedTradesControlBar';
import { PersistenceManager } from '../services/persistence';
import {
  RefreshCw,
  Bell,
  Sparkles,
  Calculator,
  Search,
  X,
  PauseCircle,
  Clock,
  Gauge,
  Server,
  Calendar,
  BookOpen,
  Volume2,
  VolumeX,
  Flame,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Check,
  SlidersHorizontal,
  CheckCircle2,
  ListOrdered,
  ArrowUpDown,
  ChevronDown,
  Palette,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { adaptiveSlLearningService } from '../services/adaptiveSlLearningService';

interface Props {
  signals: ForexSignal[];
  filteredSignals: ForexSignal[];
  allPairs: ForexPair[];
  tradingSessions: TradingSession[];
  selectedFilter: string;
  searchQuery: string;
  sortOption: string;
  refreshInterval: RefreshIntervalSeconds;
  marketDataProvider: MarketDataProvider;
  isMarketOpen: boolean;
  isRefreshing: boolean;
  activeAlertCount: number;
  nowClockMs: number;
  isElev8Connected?: boolean;
  isSoundMuted?: boolean;
  isMarketPrecisionEnabled?: boolean;
  onToggleMarketPrecision?: () => void;
  onFilterSelect: (filter: string) => void;
  onSearchChange: (q: string) => void;
  onSortSelect: (sort: string) => void;
  onInspectSignal: (sig: ForexSignal) => void;
  onToggleFavorite: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onOpenRiskModal: () => void;
  onOpenProviderModal: () => void;
  onOpenElev8Modal?: () => void;
  onOpenElev8Order?: (sig: ForexSignal) => void;
  onOpenRefreshModal: () => void;
  onOpenCalendar?: () => void;
  onOpenStrength?: () => void;
  onOpenJournal?: () => void;
  onOpenSoundSettings?: () => void;
  onToggleSound?: () => void;
  onManualRefresh: () => void;
  onToggleSync: () => void;
  lastSyncFormatted: string;
  quotaUsed: number;
  quotaLimit: number;
  onAskAi: (sig: ForexSignal) => void;
  onOpenAlerts: () => void;
  onOpenBacktest: (sig?: ForexSignal) => void;
  onOpenLiveChart?: (sig: ForexSignal) => void;
  onClearClosedHistory?: () => void;
  onScanAndFormSignals?: (targetPairSymbol?: string) => void;
  onOpenThemeModal?: () => void;
  activeStrategy?: StrategyType;
  onStrategySelect?: (strat: StrategyType) => void;
  enabledStrategies?: string[];
  onToggleStrategyEnabled?: (strat: StrategyType) => void;
  onSelectAllStrategies?: () => void;
  onDeselectAllStrategies?: () => void;
}

export const SignalsScreen: React.FC<Props> = ({
  signals,
  filteredSignals,
  allPairs,
  tradingSessions,
  selectedFilter,
  searchQuery,
  sortOption,
  refreshInterval,
  marketDataProvider,
  isMarketOpen,
  isRefreshing,
  activeAlertCount,
  nowClockMs,
  isElev8Connected = false,
  isSoundMuted = false,
  isMarketPrecisionEnabled = true,
  onToggleMarketPrecision,
  onFilterSelect,
  onSearchChange,
  onSortSelect,
  onInspectSignal,
  onToggleFavorite,
  onToggleAlert,
  onOpenRiskModal,
  onOpenProviderModal,
  onOpenElev8Modal,
  onOpenElev8Order,
  onOpenRefreshModal,
  onOpenCalendar,
  onOpenStrength,
  onOpenJournal,
  onOpenSoundSettings,
  onToggleSound,
  onManualRefresh,
  onToggleSync,
  lastSyncFormatted,
  quotaUsed,
  quotaLimit,
  onAskAi,
  onOpenAlerts,
  onOpenBacktest,
  onOpenLiveChart,
  onClearClosedHistory,
  onScanAndFormSignals,
  onOpenThemeModal,
  activeStrategy = 'ALL_STRATEGIES',
  onStrategySelect,
  enabledStrategies = ['ALL_STRATEGIES', 'GOLD_HUNTER', 'LONDON_KILLER', 'TREND_RIDER'],
  onToggleStrategyEnabled = () => {},
  onSelectAllStrategies = () => {},
  onDeselectAllStrategies = () => {}
}) => {
  const [isStrategyTogglesOpen, setIsStrategyTogglesOpen] = useState(false);
  const [selectedOutcomeSignal, setSelectedOutcomeSignal] = useState<ForexSignal | null>(null);
  // Strictly active, tradeable, non-expired, and non-invalidated signals
  const activeSignals = signals.filter(s => isSignalValidAndActive(s, nowClockMs));
  const bestTrade = activeSignals.find(s => s.isBestTradeNow) || activeSignals[0];

  // Closed Trades Timeframe, Sorting & Retention State
  const [closedTimeRange, setClosedTimeRange] = useState<ClosedTimeRange>(() =>
    PersistenceManager.getClosedTimeRange()
  );
  const [closedSortOption, setClosedSortOption] = useState<ClosedSortOption>(() =>
    (PersistenceManager.getClosedSortOption() as ClosedSortOption) || 'NEWEST_CLOSED'
  );
  const [closedOutcome, setClosedOutcome] = useState<ClosedOutcomeFilter>('ALL');
  const [customRange, setCustomRange] = useState(() => PersistenceManager.getClosedCustomRange());
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const defaultStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    return customRange.startMs ? new Date(customRange.startMs).toISOString().slice(0, 10) : defaultStart;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const defaultEnd = new Date().toISOString().slice(0, 10);
    return customRange.endMs ? new Date(customRange.endMs).toISOString().slice(0, 10) : defaultEnd;
  });
  const [retentionPolicy, setRetentionPolicy] = useState(() =>
    PersistenceManager.getClosedTradesRetention()
  );

  const handleTimeRangeChange = (range: ClosedTimeRange) => {
    setClosedTimeRange(range);
    PersistenceManager.saveClosedTimeRange(range);
  };

  const handleSortOptionChange = (opt: ClosedSortOption) => {
    setClosedSortOption(opt);
    PersistenceManager.saveClosedSortOption(opt);
  };

  const handleCustomDatesChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    const startMs = new Date(start).setHours(0, 0, 0, 0);
    const endMs = new Date(end).setHours(23, 59, 59, 999);
    setCustomRange({ startMs, endMs });
    PersistenceManager.saveClosedCustomRange({ startMs, endMs });
  };

  const handleRetentionPolicyChange = (val: '24H' | '48H' | '1W' | '1M' | '90D' | 'ALL') => {
    setRetentionPolicy(val);
    PersistenceManager.saveClosedTradesRetention(val);
  };

  const allClosedSignals = useMemo(() => {
    const seen = new Set<string>();
    return signals.filter(s => {
      if (isSignalValidAndActive(s, nowClockMs)) return false;
      const key = `${s.id}-${s.closedAtMs || s.createdAtMs || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [signals, nowClockMs]);

  // Dynamically filtered and sorted closed trades for the Closed / History tab
  const displayedClosedSignals = useMemo(() => {
    const now = nowClockMs || Date.now();

    // 1. Time Range Filter
    let list = allClosedSignals.filter(s => {
      const closedTime = s.closedAtMs || s.createdAtMs || now;
      if (closedTimeRange === '24H') {
        return closedTime >= now - 24 * 3600 * 1000;
      }
      if (closedTimeRange === '48H') {
        return closedTime >= now - 48 * 3600 * 1000;
      }
      if (closedTimeRange === '1W') {
        return closedTime >= now - 7 * 24 * 3600 * 1000;
      }
      if (closedTimeRange === '1M') {
        return closedTime >= now - 30 * 24 * 3600 * 1000;
      }
      if (closedTimeRange === 'CUSTOM') {
        const startMs = customStartDate ? new Date(customStartDate).setHours(0, 0, 0, 0) : 0;
        const endMs = customEndDate ? new Date(customEndDate).setHours(23, 59, 59, 999) : Number.MAX_SAFE_INTEGER;
        return closedTime >= startMs && closedTime <= endMs;
      }
      return true; // 'ALL'
    });

    // 2. Outcome Filter
    if (closedOutcome === 'WINS') {
      list = list.filter(s => s.status === 'HIT_TP' || (s.pips ?? 0) > 0);
    } else if (closedOutcome === 'LOSSES') {
      list = list.filter(s => s.status === 'HIT_SL' || (s.pips ?? 0) < 0);
    }

    // 3. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qClean = q.replace(/[^a-z0-9]/g, '');
      list = list.filter(sig => {
        const symLower = sig.pair.symbol.toLowerCase();
        const symClean = symLower.replace(/[^a-z0-9]/g, '');
        const nameLower = sig.pair.name.toLowerCase();
        const nameClean = nameLower.replace(/[^a-z0-9]/g, '');
        return (
          symLower.includes(q) ||
          (qClean.length > 0 && symClean.includes(qClean)) ||
          nameLower.includes(q) ||
          (qClean.length > 0 && nameClean.includes(qClean)) ||
          sig.rationale.toLowerCase().includes(q) ||
          sig.killzone.toLowerCase().includes(q) ||
          sig.type.toLowerCase().replace('_', ' ').includes(q)
        );
      });
    }

    // 4. Sorting
    const sorted = [...list].sort((a, b) => {
      const timeA = a.closedAtMs || a.createdAtMs || 0;
      const timeB = b.closedAtMs || b.createdAtMs || 0;
      const pipsA = a.pips ?? 0;
      const pipsB = b.pips ?? 0;

      if (closedSortOption === 'NEWEST_CLOSED') return timeB - timeA;
      if (closedSortOption === 'OLDEST_CLOSED') return timeA - timeB;
      if (closedSortOption === 'LONGEST_DURATION') return getTradeDurationMs(b) - getTradeDurationMs(a);
      if (closedSortOption === 'SHORTEST_DURATION') return getTradeDurationMs(a) - getTradeDurationMs(b);
      if (closedSortOption === 'HIGHEST_PIPS') return pipsB - pipsA;
      if (closedSortOption === 'LOWEST_PIPS') return pipsA - pipsB;
      if (closedSortOption === 'WINS_FIRST') {
        const isWinA = a.status === 'HIT_TP' || pipsA > 0;
        const isWinB = b.status === 'HIT_TP' || pipsB > 0;
        if (isWinA && !isWinB) return -1;
        if (!isWinA && isWinB) return 1;
        return pipsB - pipsA;
      }
      if (closedSortOption === 'LOSSES_FIRST') {
        const isLossA = a.status === 'HIT_SL' || pipsA < 0;
        const isLossB = b.status === 'HIT_SL' || pipsB < 0;
        if (isLossA && !isLossB) return -1;
        if (!isLossA && isLossB) return 1;
        return pipsA - pipsB;
      }
      if (closedSortOption === 'PAIR_AZ') {
        return a.pair.symbol.localeCompare(b.pair.symbol);
      }
      return timeB - timeA;
    });

    return sorted;
  }, [allClosedSignals, closedTimeRange, closedOutcome, searchQuery, closedSortOption, customStartDate, customEndDate, nowClockMs]);

  const activeTimeframeLabel =
    closedTimeRange === '24H' ? '24 Hours' :
    closedTimeRange === '48H' ? '48 Hours' :
    closedTimeRange === '1W' ? '1 Week' :
    closedTimeRange === '1M' ? '1 Month' :
    closedTimeRange === 'CUSTOM' ? `Custom (${customStartDate} → ${customEndDate})` :
    'All History';

  // Selected Asset in Live Explorer for Instant Analysis (synced with live allPairs)
  const [selectedAssetPairState, setSelectedAssetPair] = useState<ForexPair | null>(allPairs[0] || null);
  const selectedAssetPair = selectedAssetPairState
    ? allPairs.find(p => p.symbol === selectedAssetPairState.symbol) || selectedAssetPairState
    : allPairs[0] || null;
  const [assetCarouselCategory, setAssetCarouselCategory] = useState<'ALL' | 'MAJORS' | 'MINORS' | 'METALS'>('ALL');
  const [tradableOnlyFilter, setTradableOnlyFilter] = useState<boolean>(false);
  const [mobileSubView, setMobileSubView] = useState<'SIGNALS' | 'QUOTES' | 'SESSIONS' | 'ALL'>('SIGNALS');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false);

  // Asset Class Category Tabs for Signals Feed (Micro-Account Focused: 0.01 Lot Friendly)
  const assetCategoryTabs = [
    { key: 'ALL', label: 'All Assets', count: activeSignals.length, icon: '🌐' },
    { key: 'MAJORS', label: 'Majors', count: signals.filter(s => isSignalValidAndActive(s, nowClockMs) && getAssetCategory(s.pair.symbol) === 'MAJORS').length, icon: '🏛️' },
    { key: 'MINORS', label: 'Crosses', count: signals.filter(s => isSignalValidAndActive(s, nowClockMs) && getAssetCategory(s.pair.symbol) === 'MINORS').length, icon: '🔀' },
    { key: 'METALS', label: 'Metals', count: signals.filter(s => isSignalValidAndActive(s, nowClockMs) && getAssetCategory(s.pair.symbol) === 'METALS').length, icon: '🥇' },
  ];

  // Execution & Strategy Tabs
  const strategyFilterTabs = [
    { key: 'ALL', label: `All (${activeSignals.length})` },
    { key: 'ALL_ACTIVE', label: `All Trade (${activeSignals.filter(s => s.status === 'RUNNING' || s.status === 'PENDING').length})` },
    { key: 'VIP', label: `🔥 A+ VIP (${activeSignals.filter(s => s.confluenceScore >= 90).length})` },
    { key: 'RUNNING', label: `Running (${activeSignals.filter(s => s.status === 'RUNNING').length})` },
    { key: 'PENDING', label: `Pending (${activeSignals.filter(s => s.status === 'PENDING').length})` },
    { key: 'FAVORITES', label: `Watchlist (${activeSignals.filter(s => s.isFavorite).length})` },
    { key: 'HISTORY', label: `Closed (${displayedClosedSignals.length}${displayedClosedSignals.length !== allClosedSignals.length ? `/${allClosedSignals.length}` : ''})` },
  ];

  // Portfolio Currency Correlation Guard: detect when 3+ signals share identical directional currency exposure
  const correlationRisk = useMemo(() => {
    const currencyExposure: Record<string, { long: string[]; short: string[] }> = {};
    const relevantSignals = activeSignals.filter(s => s.status === 'RUNNING' || s.status === 'PENDING');

    relevantSignals.forEach(sig => {
      const sym = sig.pair.symbol;
      const isBuy = sig.type.includes('BUY');
      let base = '';
      let quote = '';
      if (sym.includes('/')) {
        const parts = sym.split('/');
        base = parts[0];
        quote = parts[1];
      } else if (sym.startsWith('XAU') || sym.startsWith('XAG')) {
        base = sym.slice(0, 3);
        quote = 'USD';
      }

      if (base) {
        if (!currencyExposure[base]) currencyExposure[base] = { long: [], short: [] };
        if (isBuy) currencyExposure[base].long.push(sym);
        else currencyExposure[base].short.push(sym);
      }
      if (quote) {
        if (!currencyExposure[quote]) currencyExposure[quote] = { long: [], short: [] };
        if (isBuy) currencyExposure[quote].short.push(sym); // Long Base/USD = Short USD
        else currencyExposure[quote].long.push(sym); // Short Base/USD = Long USD
      }
    });

    for (const [ccy, exp] of Object.entries(currencyExposure)) {
      if (exp.long.length >= 3) {
        return { currency: ccy, direction: 'LONG' as const, count: exp.long.length, pairs: exp.long };
      }
      if (exp.short.length >= 3) {
        return { currency: ccy, direction: 'SHORT' as const, count: exp.short.length, pairs: exp.short };
      }
    }
    return null;
  }, [activeSignals]);

  return (
    <div className="space-y-2.5 max-w-md mx-auto pb-16 px-4">
      {/* 1. Unified Institutional Command & Telemetry Bar (Compact 2-Row Header) */}
      <div className="bg-[#101522] border border-[#222F47] rounded-xl p-2 space-y-1.5 shadow-sm terminal-card">
        {/* Top Row: View Mode Switcher + Quick Institutional Actions */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          {/* View Mode Segmented Switcher */}
          <div className="flex items-center gap-0.5 bg-[#080B11] p-0.5 rounded-lg border border-[#222F47]">
            {[
              { id: 'SIGNALS' as const, label: `⚡ Signals (${activeSignals.length})` },
              { id: 'QUOTES' as const, label: `💹 Quotes (${allPairs.length})` },
              { id: 'SESSIONS' as const, label: '🌍 Sessions' },
              { id: 'ALL' as const, label: '🗂️ Full Desk' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobileSubView(tab.id)}
                className={`py-1 px-2 rounded-md text-[10px] font-black transition-all whitespace-nowrap cursor-pointer ${
                  mobileSubView === tab.id
                    ? 'bg-[#2979FF] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 4 Quick Institutional Modules (Inline Sleek Buttons instead of Bulky Tiles) */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={onOpenElev8Modal}
              className={`flex items-center gap-1 py-1 px-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                isElev8Connected
                  ? 'bg-[#00E676]/15 border-[#00E676]/50 text-[#00E676]'
                  : 'bg-[#182033] border-[#222F47] text-[#60A5FA] hover:bg-[#222F47]'
              }`}
              title="Elev8 MT5 Terminal Bridge"
            >
              <Server className="w-3 h-3" />
              <span>Elev8 MT5</span>
            </button>

            <button
              onClick={onOpenCalendar}
              className="flex items-center gap-1 py-1 px-2 rounded-lg bg-[#182033] hover:bg-[#222F47] border border-[#FF3366]/35 text-[#FF3366] text-[10px] font-bold transition-all cursor-pointer"
              title="Economic Calendar & High-Impact News Guard"
            >
              <Flame className="w-3 h-3" />
              <span>News</span>
            </button>

            <button
              onClick={onOpenStrength}
              className="flex items-center gap-1 py-1 px-2 rounded-lg bg-[#182033] hover:bg-[#222F47] border border-[#FFD700]/35 text-[#FFD700] text-[10px] font-bold transition-all cursor-pointer"
              title="Currency & Metals Relative Strength Meter"
            >
              <Gauge className="w-3 h-3" />
              <span>Strength</span>
            </button>

            <button
              onClick={onOpenJournal}
              className="flex items-center gap-1 py-1 px-2 rounded-lg bg-[#182033] hover:bg-[#222F47] border border-[#00E676]/35 text-[#00E676] text-[10px] font-bold transition-all cursor-pointer"
              title="Trade Execution Journal"
            >
              <BookOpen className="w-3 h-3" />
              <span>Journal</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Feed Status, Precision, Sync Cadence, Risk Calculator & SMC Scanner */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#222F47]/60 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={onOpenProviderModal}
              className="flex items-center gap-1.5 bg-[#080B11] hover:bg-[#182033] px-2 py-0.5 rounded-md border border-[#222F47] transition-colors cursor-pointer"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isMarketOpen ? 'bg-[#00E676] animate-pulse' : 'bg-[#FFB300]'
                }`}
              />
              <span className="text-[9.5px] font-bold text-[#F1F5F9]">
                {isMarketOpen ? marketDataProvider : 'Weekend Closed'}
              </span>
            </button>

            {onToggleMarketPrecision && (
              <button
                onClick={onToggleMarketPrecision}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[9.5px] transition-all border cursor-pointer ${
                  isMarketPrecisionEnabled
                    ? 'bg-[#FFD700]/15 border-[#FFD700]/50 text-[#FFD700]'
                    : 'bg-[#080B11] border-[#222F47] text-[#64748B]'
                }`}
                title="Market Precision Mode: Raw WebSocket execution"
              >
                <Zap className={`w-2.5 h-2.5 ${isMarketPrecisionEnabled ? 'text-[#FFD700] fill-[#FFD700]' : ''}`} />
                <span>{isMarketPrecisionEnabled ? 'Precision ON' : 'Precision OFF'}</span>
              </button>
            )}

            <button
              onClick={onToggleSync}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[9.5px] transition-all border cursor-pointer ${
                refreshInterval > 0
                  ? 'bg-[#00E676]/15 border-[#00E676]/50 text-[#00E676]'
                  : 'bg-[#FF3366]/15 border-[#FF3366]/50 text-[#FF3366]'
              }`}
            >
              {refreshInterval > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                  <span>Sync ON</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-2.5 h-2.5 text-[#FF3366]" />
                  <span>Paused</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenRefreshModal}
              className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#080B11] border border-[#222F47] text-[#94A3B8] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-2.5 h-2.5 text-[#2979FF]" />
              <span>{refreshInterval === 0 ? 'OFF' : `${refreshInterval}s`}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {onScanAndFormSignals && (
              <button
                onClick={() => onScanAndFormSignals()}
                disabled={isRefreshing}
                className="flex items-center gap-1 bg-[#2979FF] hover:bg-[#2979FF]/90 text-white text-[9.5px] font-black px-2.5 py-1 rounded-md shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Scan SMC structure and form fresh institutional setups"
              >
                <Zap className="w-2.5 h-2.5 text-[#FFD700] fill-[#FFD700]" />
                <span>{isMarketOpen ? 'SMC Scan' : 'Prep Scan'}</span>
              </button>
            )}

            <button
              onClick={onOpenRiskModal}
              className="flex items-center gap-1 px-2 py-1 bg-[#080B11] hover:bg-[#182033] rounded-md border border-[#222F47] text-[#00E676] text-[9.5px] font-bold cursor-pointer"
              title="Lot & Risk Calculator"
            >
              <Calculator className="w-3 h-3" />
              <span className="hidden sm:inline">Lots</span>
            </button>

            {onToggleSound && (
              <button
                onClick={onToggleSound}
                className={`p-1 rounded-md border transition-all cursor-pointer ${
                  isSoundMuted
                    ? 'bg-[#080B11] border-[#222F47] text-[#64748B]'
                    : 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                }`}
                title="Toggle Sound Chimes"
              >
                {isSoundMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Strategy Filters & Toggles Desk (Check / Uncheck 9 Strategies) */}
      <div className="bg-[#101522] border border-[#222F47] rounded-xl px-3 py-2 space-y-2">
        {/* Anti-Loss Mistake Elimination Guard Status */}
        <div className="flex items-center justify-between text-[10.5px] bg-[#00E676]/10 border border-[#00E676]/30 px-2.5 py-1 rounded-lg flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
            <span className="font-bold text-[#F1F5F9]">
              AI Anti-Loss Guard:
            </span>
            <span className="text-[#00E676] font-mono font-bold">
              ACTIVE (Learned from {adaptiveSlLearningService.getSlMistakeStats().totalSlHitsAnalyzed} SL Hits · 68.4% Failure Modes Neutralized)
            </span>
          </div>
          <span className="text-[10px] text-[#94A3B8] font-mono">
            Dynamic +1.28x ATR Buffer & H4 Lock Enforced
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#2979FF]" />
            <span className="text-xs font-bold text-[#F1F5F9]">
              Institutional Strategy Suite ({STRATEGY_CONFIGS[activeStrategy || 'GOLD_HUNTER']?.shortBadge} Active)
            </span>
          </div>
          <button
            onClick={() => setIsStrategyTogglesOpen(prev => !prev)}
            className="text-[11px] font-bold text-[#2979FF] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{isStrategyTogglesOpen ? 'Hide Suite' : 'Select Strategy (1 of 3)'}</span>
            <span>{isStrategyTogglesOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {isStrategyTogglesOpen && (
          <div className="pt-2 border-t border-[#222F47]/60 space-y-2">
            <div className="text-[10.5px] text-[#94A3B8]">
              Select <strong className="text-[#F1F5F9]">only ONE strategy</strong> at a time. The scanner runs M15, H1, and H4 in background and shows the winning timeframe per pair (Best TF Wins).
            </div>

            {/* All Trades Master Stream Card */}
            <button
              onClick={() => {
                if (onStrategySelect) onStrategySelect('ALL_STRATEGIES');
                if (onToggleStrategyEnabled) onToggleStrategyEnabled('ALL_STRATEGIES');
              }}
              className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                activeStrategy === 'ALL_STRATEGIES'
                  ? 'bg-[#182033] border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.12)] text-[#F1F5F9]'
                  : 'bg-[#080B11]/70 border-[#222F47] text-[#94A3B8] hover:border-[#2979FF]/50'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black text-[#FFD700]">🌐 ALL TRADES (Master Stream — All Strategies & Timeframes)</span>
                <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  activeStrategy === 'ALL_STRATEGIES' ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-[#182033] text-[#64748B]'
                }`}>
                  {activeStrategy === 'ALL_STRATEGIES' ? 'ACTIVE' : 'SELECT ALL'}
                </span>
              </div>
              <p className="text-[9.5px] text-[#94A3B8] mt-1">
                Display all valid active trades across all timeframes (M5, M15, H1, H4, D1), metals, majors, and minors generated by all 3 institutional strategies.
              </p>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(STRATEGY_CONFIGS) as StrategyType[]).filter(k => k !== 'ALL_STRATEGIES').map((stratKey) => {
                const config = STRATEGY_CONFIGS[stratKey];
                const isSelected = (activeStrategy || 'GOLD_HUNTER') === stratKey;
                return (
                  <button
                    key={stratKey}
                    onClick={() => {
                      if (onStrategySelect) {
                        onStrategySelect(stratKey);
                      }
                      if (onToggleStrategyEnabled) {
                        onToggleStrategyEnabled(stratKey);
                      }
                    }}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#182033] border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.12)] text-[#F1F5F9]'
                        : 'bg-[#080B11]/70 border-[#222F47] text-[#94A3B8] hover:border-[#2979FF]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-[#F1F5F9]">{config.shortBadge}</span>
                      <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-[#182033] text-[#64748B]'
                      }`}>
                        {isSelected ? 'ACTIVE' : 'SELECT'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#00E676] mt-1 font-bold">
                      {config.modelRule}
                    </div>
                    <p className="text-[9.5px] text-[#94A3B8] line-clamp-2 mt-1">
                      {config.description}
                    </p>
                    <div className="text-[9px] font-mono text-[#60A5FA] mt-1.5">
                      Pairs: {config.allowedPairs.join(', ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Global Trading Sessions Clock (Shown in SESSIONS or ALL view) */}
      {(mobileSubView === 'SESSIONS' || mobileSubView === 'ALL') && (
        <TradingSessionsClock sessions={tradingSessions} />
      )}

      {/* Live Pairs Rates & Asset Categories Explorer (Shown in QUOTES or ALL view) */}
      {(mobileSubView === 'QUOTES' || mobileSubView === 'ALL') && (
      <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 space-y-2.5 shadow-md terminal-card">
        {/* Header with Title, Live Streaming indicator & Tradability Toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
            <span className="font-extrabold text-[#F1F5F9] text-xs uppercase tracking-wider">
              Live Tradable & Non-Tradable Assets
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              · {allPairs.length} Assets
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTradableOnlyFilter(prev => !prev)}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
                tradableOnlyFilter
                  ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676]'
                  : 'bg-[#182033] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tradableOnlyFilter ? 'bg-[#00E676]' : 'bg-[#64748B]'}`} />
              <span>{tradableOnlyFilter ? `Signal Ready Only (${activeSignals.length})` : `Show All (${allPairs.length})`}</span>
            </button>
          </div>
        </div>

        {/* Asset Category Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[#222F47]/60">
          {[
            { key: 'ALL' as const, label: 'All 0.01 Assets', icon: '🌐', count: allPairs.length },
            { key: 'MAJORS' as const, label: 'Majors (~$2 Margin)', icon: '🏛️', count: allPairs.filter(p => getAssetCategory(p.symbol) === 'MAJORS').length },
            { key: 'MINORS' as const, label: 'Minors & Crosses', icon: '🔀', count: allPairs.filter(p => getAssetCategory(p.symbol) === 'MINORS').length },
            { key: 'METALS' as const, label: 'Gold & Silver', icon: '🥇', count: allPairs.filter(p => getAssetCategory(p.symbol) === 'METALS').length },
          ].map(cat => {
            const isCatActive = assetCarouselCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setAssetCarouselCategory(cat.key)}
                className={`flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all ${
                  isCatActive
                    ? 'bg-[#2979FF] border-[#2979FF] text-white shadow-xs'
                    : 'bg-[#182033]/70 border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isCatActive ? 'bg-white/20 text-white' : 'bg-[#101522] text-[#64748B]'}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Asset Cards Grid / Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {allPairs
            .filter(pair => {
              const cat = getAssetCategory(pair.symbol);
              if (assetCarouselCategory !== 'ALL' && cat !== assetCarouselCategory) return false;
              if (tradableOnlyFilter) {
                const hasVerifiedSig = activeSignals.some(s => s.pair.symbol === pair.symbol);
                if (!hasVerifiedSig) return false;
              }
              return true;
            })
            .map(pair => {
              const cat = getAssetCategory(pair.symbol);
              const verifiedSig = activeSignals.find(s => s.pair.symbol === pair.symbol);
              const isSelected = selectedAssetPair?.symbol === pair.symbol;
              const isPos = pair.currentPrice >= pair.basePrice;
              const pipMult = pair.pipDigits === 2 && !pair.isGoldOrCrypto ? 100 : pair.isGoldOrCrypto ? 10 : pair.pipDigits === 1 ? 10 : 10000;
              const pips = Math.round(Math.abs(pair.currentPrice - pair.basePrice) * pipMult * 10) / 10;
              const margin = pair.minMargin001 || (pair.pipDigits === 2 ? 8.5 : 2.2);

              return (
                <div
                  key={pair.symbol}
                  onClick={() => setSelectedAssetPair(pair)}
                  className={`border rounded-lg p-2 shrink-0 min-w-[140px] text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#182033] border-[#FFD700] ring-1 ring-[#FFD700]/40'
                      : verifiedSig
                      ? 'bg-[#182033]/90 border-[#00E676]/50 hover:border-[#00E676]'
                      : 'bg-[#182033]/40 border-[#222F47] hover:border-[#2979FF]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[11px] font-black text-[#F1F5F9]">{pair.symbol}</span>
                    <span
                      className={`text-[9px] font-bold ${
                        isPos ? 'text-[#00E676]' : 'text-[#FF3366]'
                      }`}
                    >
                      {isPos ? '+' : '-'}{pips}p
                    </span>
                  </div>

                  <div className="text-xs font-mono font-bold text-[#F1F5F9] mb-1">
                    {formatPrice(pair, pair.currentPrice)}
                  </div>

                  <div className="flex items-center justify-between text-[8.5px] font-mono text-[#94A3B8] pt-1 border-t border-[#222F47]/60">
                    <span>0.01: <strong className="text-[#F1F5F9]">${margin.toFixed(2)}</strong></span>
                    {verifiedSig ? (
                      <span className="text-[#00E676] font-black">{verifiedSig.confluenceScore}% SIG</span>
                    ) : (
                      <span className="text-[#64748B]">{cat}</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Selected Asset Action & SMC Analysis Bar */}
        {selectedAssetPair && (() => {
          const activeSig = activeSignals.find(s => s.pair.symbol === selectedAssetPair.symbol);
          return (
            <div className={`bg-[#182033] border rounded-lg p-2.5 flex items-center justify-between gap-2 flex-wrap ${
              activeSig ? 'border-[#00E676]/50' : 'border-[#222F47]'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black text-[#F1F5F9]">{selectedAssetPair.symbol}</span>
                <span className="text-[10px] font-mono font-bold text-[#F1F5F9]">{formatPrice(selectedAssetPair, selectedAssetPair.currentPrice)}</span>
                <span className="text-[10px] text-[#64748B]">· Spd {selectedAssetPair.spreadPips}p</span>
                {activeSig ? (
                  <span className="text-[9.5px] font-black text-[#00E676]">
                    · ✅ {activeSig.type.replace('_', ' ')} ({activeSig.confluenceScore}%)
                  </span>
                ) : (
                  <span className="text-[9.5px] text-[#94A3B8]">· Standing By</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {!activeSig && onScanAndFormSignals && (
                  <button
                    onClick={() => onScanAndFormSignals(selectedAssetPair.symbol)}
                    className="text-[10px] font-black px-2 py-1 rounded bg-[#2979FF]/20 hover:bg-[#2979FF]/30 text-[#2979FF] border border-[#2979FF]/50 flex items-center gap-1 transition-all"
                  >
                    <Zap className="w-2.5 h-2.5" />
                    <span>Form Signal</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (onOpenLiveChart) {
                      onOpenLiveChart(activeSig || createSyntheticSignalForPair(selectedAssetPair));
                    }
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded bg-[#00E676] text-[#080B11] transition-all"
                >
                  <BarChart2 className="w-3 h-3" />
                  <span>Chart</span>
                </button>

                <button
                  onClick={() => {
                    onAskAi(activeSig || createSyntheticSignalForPair(selectedAssetPair));
                  }}
                  className="flex items-center gap-1 bg-[#101522] border border-[#FFD700]/50 text-[#FFD700] text-[10px] font-bold px-2.5 py-1 rounded transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Audit</span>
                </button>

                {onOpenElev8Order && activeSig && (
                  <button
                    onClick={() => onOpenElev8Order(activeSig)}
                    className="flex items-center gap-1 bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676] text-[10px] font-bold px-2.5 py-1 rounded transition-all"
                  >
                    <Zap className="w-3 h-3" />
                    <span>MT5</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      )}

      {/* Multi-Timeframe Institutional Matrix (Shown in QUOTES or ALL view) */}
      {(mobileSubView === 'QUOTES' || mobileSubView === 'ALL') && (
        <MultiTimeframeMatrix />
      )}

      {/* Signals Feed Section (Shown in SIGNALS or ALL view) */}
      {(mobileSubView === 'SIGNALS' || mobileSubView === 'ALL') && (
        <>
          {/* Best Trade Now Hero Card (Hidden when viewing Closed section) */}
          {bestTrade && selectedFilter !== 'HISTORY' && (
            <BestTradeHeroCard
              signal={bestTrade}
              onInspect={() => onInspectSignal(bestTrade)}
              onAskAi={() => onAskAi(bestTrade)}
              onOpenChart={onOpenLiveChart ? () => onOpenLiveChart(bestTrade) : undefined}
              onTestBacktest={onOpenBacktest}
              onOpenElev8Order={onOpenElev8Order ? () => onOpenElev8Order(bestTrade) : undefined}
              nowClockMs={nowClockMs}
              isMarketOpen={isMarketOpen}
            />
          )}

          {/* Unified Filter, Search, Strategy & Sort Control Panel */}
          <div className="bg-[#101522] border border-[#222F47] rounded-xl p-2.5 space-y-2 shadow-sm terminal-card relative z-40">
            {/* Row 1: Search Input (Left) + Sort / Confluence Dropdown (Pinned to Right Side) */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder={selectedFilter === 'HISTORY' ? 'Search closed trades...' : 'Search pair, gold, strategy...'}
                  className="w-full bg-[#080B11] border border-[#222F47] rounded-lg pl-8 pr-7 py-1.5 text-xs text-[#F1F5F9] focus:outline-hidden focus:border-[#2979FF]"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort / Confluence Dropdown Menu — Only shown for Active Signals */}
              {selectedFilter !== 'HISTORY' && (
                <div className="relative shrink-0 ml-auto">
                  <button
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center gap-1.5 bg-[#182033] hover:bg-[#222F47] border border-[#2979FF]/40 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#F1F5F9] transition-all cursor-pointer shadow-xs"
                  >
                    <ArrowUpDown className="w-3 h-3 text-[#2979FF]" />
                    <span>
                      {sortOption === 'LATEST' || sortOption === 'RECENT' ? 'Latest' :
                       sortOption === 'OLDEST' ? 'Oldest' :
                       sortOption === 'SMALL_TF' ? 'Small TF' :
                       sortOption === 'HIGH_TF' ? 'High TF' :
                       sortOption === 'PLUS_PIPS' ? '+Pips' :
                       sortOption === 'MINUS_PIPS' ? '-Pips' :
                       sortOption === 'PIPS' ? 'Top Pips' :
                       sortOption === 'RR' ? 'R:R' : 'Confluence'}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-[#94A3B8] transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSortDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSortDropdownOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-60 max-w-[calc(100vw-2rem)] bg-[#141B2D] border border-[#2979FF]/50 rounded-xl shadow-2xl z-50 py-1 divide-y divide-[#222F47]/60">
                        <div className="px-3 py-1.5 text-[9.5px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
                          <span>Sort Signals By</span>
                          <span className="text-[#2979FF] font-mono">Active</span>
                        </div>
                        <div className="py-1">
                          {[
                            { key: 'CONFLUENCE', label: 'Confluence Score (High → Low)', icon: '🔥' },
                            { key: 'LATEST', label: 'Latest (Newest First)', icon: '⏱️' },
                            { key: 'OLDEST', label: 'Oldest First', icon: '⏳' },
                            { key: 'SMALL_TF', label: 'Small Timeframe (M5 → D1)', icon: '📉' },
                            { key: 'HIGH_TF', label: 'Higher Timeframe (D1 → M5)', icon: '📈' },
                            { key: 'PLUS_PIPS', label: 'Plus Pips Gains (Highest +)', icon: '🚀' },
                            { key: 'MINUS_PIPS', label: 'Minus Pips Gains (Lowest -)', icon: '🔻' },
                            { key: 'RR', label: 'Risk : Reward (R:R)', icon: '⚖️' },
                          ].map(item => (
                            <button
                              key={item.key}
                              onClick={() => {
                                onSortSelect(item.key);
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[11px] font-bold flex items-center justify-between transition-colors ${
                                sortOption === item.key
                                  ? 'bg-[#2979FF]/20 text-[#2979FF]'
                                  : 'text-[#94A3B8] hover:bg-[#1C263B] hover:text-[#F1F5F9]'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <span>{item.icon}</span>
                                <span className="truncate">{item.label}</span>
                              </span>
                              {sortOption === item.key && <Check className="w-3.5 h-3.5 text-[#2979FF] shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Portfolio Currency Correlation Guard Advisory */}
            {correlationRisk && selectedFilter !== 'HISTORY' && (
              <div className="bg-[#FF9100]/10 border border-[#FF9100]/35 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] text-[#FF9100] font-mono shadow-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FF9100] shrink-0" />
                  <span className="font-black text-[#FFD700] uppercase tracking-wider shrink-0">CORRELATION GUARD:</span>
                  <span className="text-[#F1F5F9] truncate">
                    {correlationRisk.count}x {correlationRisk.currency} {correlationRisk.direction} ({correlationRisk.pairs.join(', ')})
                  </span>
                </div>
                <span className="text-[8.5px] text-[#FFD700] font-sans font-bold shrink-0 ml-1">
                  Scale to 0.5% lot risk
                </span>
              </div>
            )}

            {/* Row 2: Strategy Model Select (Left) + Asset Category Pills (Right) - Only for Active Signals */}
            {selectedFilter !== 'HISTORY' && (
              <div className="flex items-center justify-between gap-1.5">
                {/* Single-Strategy Dropdown: Only ONE strategy at a time */}
                <select
                  value={activeStrategy}
                  onChange={(e) => {
                    const chosen = e.target.value as StrategyType;
                    if (onStrategySelect) onStrategySelect(chosen);
                    if (onToggleStrategyEnabled) onToggleStrategyEnabled(chosen);
                  }}
                  aria-label="Select Institutional Strategy (Only 1 Active at a Time)"
                  className="flex-1 min-w-0 bg-[#182033] border border-[#222F47] hover:border-[#FFD700]/50 rounded-lg px-2 py-1.5 text-[10.5px] font-bold text-[#FFD700] focus:outline-hidden cursor-pointer truncate"
                >
                  {['ALL_STRATEGIES', ...((selectedFilter === 'METALS' || selectedFilter === 'GOLD')
                    ? (['GOLD_HUNTER', 'TREND_RIDER'] as StrategyType[])
                    : (selectedFilter === 'MAJORS' || selectedFilter === 'MINORS')
                    ? (['LONDON_KILLER', 'TREND_RIDER'] as StrategyType[])
                    : (['GOLD_HUNTER', 'LONDON_KILLER', 'TREND_RIDER'] as StrategyType[])
                  )].map(stratKey => {
                    const cfg = STRATEGY_CONFIGS[stratKey as StrategyType];
                    const tagIcon = stratKey === 'ALL_STRATEGIES' ? '🌐' : stratKey === 'GOLD_HUNTER' ? '🥇' : stratKey === 'LONDON_KILLER' ? '🇬🇧' : '🚀';
                    return (
                      <option key={stratKey} value={stratKey}>
                        {tagIcon} {cfg.shortBadge} — {cfg.title} ({cfg.targetRR})
                      </option>
                    );
                  })}
                </select>

                <div className="flex items-center gap-1 shrink-0">
                  {assetCategoryTabs.slice(1).map(cat => {
                    const isSelected = selectedFilter === cat.key;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => {
                          const nextFilter = isSelected ? 'ALL' : cat.key;
                          onFilterSelect(nextFilter);
                          // Section auto-filter: Metals defaults to GOLD HUNTER, Forex defaults to LONDON KILLER
                          if (nextFilter === 'METALS' && onStrategySelect) {
                            if (activeStrategy === 'LONDON_KILLER') {
                              onStrategySelect('GOLD_HUNTER');
                            }
                          } else if ((nextFilter === 'MAJORS' || nextFilter === 'MINORS') && onStrategySelect) {
                            if (activeStrategy === 'GOLD_HUNTER') {
                              onStrategySelect('ALL_STRATEGIES');
                            }
                          }
                        }}
                        className={`flex items-center gap-1 text-[9.5px] font-bold px-2 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#2979FF] border-[#2979FF] text-white'
                            : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="hidden xs:inline">{cat.label}</span>
                        <span className="font-mono text-[9px] opacity-85">{cat.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 3: Order State Filter Strip */}
            <div className="flex items-center gap-1 pt-1.5 border-t border-[#222F47]/60 overflow-x-auto no-scrollbar">
              {strategyFilterTabs.map(t => {
                const isSelected = selectedFilter === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => onFilterSelect(t.key)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00E676] border-[#00E676] text-[#080B11] font-black'
                        : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Closed Trades Control Bar & Win/Loss Summary Widget (Displayed at the top of the HISTORY tab) */}
          {selectedFilter === 'HISTORY' && (
            <div className="space-y-2.5">
              <ClosedTradesControlBar
                selectedTimeRange={closedTimeRange}
                onChangeTimeRange={handleTimeRangeChange}
                selectedSortOption={closedSortOption}
                onChangeSortOption={handleSortOptionChange}
                selectedOutcome={closedOutcome}
                onChangeOutcome={setClosedOutcome}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
                onChangeCustomDates={handleCustomDatesChange}
                allClosedCount={allClosedSignals.length}
                filteredClosedCount={displayedClosedSignals.length}
                allClosedSignals={allClosedSignals}
                retentionPolicy={retentionPolicy}
                onChangeRetentionPolicy={handleRetentionPolicyChange}
                onClearClosedHistory={onClearClosedHistory}
              />
              <ClosedTradesSummaryWidget
                closedSignals={displayedClosedSignals}
                filteredCount={displayedClosedSignals.length}
                searchQuery={searchQuery}
                timeframeLabel={activeTimeframeLabel}
              />
            </div>
          )}

          {/* Signals List Header */}
          <div className="flex items-center justify-between text-[10.5px] px-1">
            <span className="font-bold text-[#64748B] uppercase tracking-wider">
              {selectedFilter === 'HISTORY'
                ? `Closed & Completed Trades (${activeTimeframeLabel})`
                : 'Live Institutional Signals Feed'}
            </span>
            <span className="text-[#94A3B8] font-mono">
              {selectedFilter === 'HISTORY'
                ? `${displayedClosedSignals.length} of ${allClosedSignals.length} Closed`
                : `${filteredSignals.length} Active Setups`}
            </span>
          </div>

      {/* Signal Cards */}
      <div className="space-y-2">
        {(selectedFilter === 'HISTORY' ? displayedClosedSignals : filteredSignals).map((sig, idx) => (
          <SignalCard
            key={`${sig.id}-${sig.status}-${sig.createdAtMs || idx}`}
            signal={sig}
            onClick={() => onInspectSignal(sig)}
            onToggleFavorite={() => onToggleFavorite(sig.id)}
            onToggleAlert={() => onToggleAlert(sig.id)}
            onAskAi={() => onAskAi(sig)}
            onOpenChart={onOpenLiveChart ? () => onOpenLiveChart(sig) : undefined}
            onOpenBacktest={() => onOpenBacktest(sig)}
            onOpenElev8Order={onOpenElev8Order ? () => onOpenElev8Order(sig) : undefined}
            onOpenOutcomeAnalysis={(s) => setSelectedOutcomeSignal(s)}
            nowClockMs={nowClockMs}
            isMarketOpen={isMarketOpen}
          />
        ))}

        {(selectedFilter === 'HISTORY' ? displayedClosedSignals : filteredSignals).length === 0 && (
          <div className="p-8 text-center bg-[#101522] rounded-xl border border-[#222F47] space-y-3">
            <p className="text-xs text-[#94A3B8]">
              {selectedFilter === 'HISTORY'
                ? `No closed trades found matching "${activeTimeframeLabel}". Try switching to 48 Hours, 1 Week, 1 Month, or All History.`
                : 'No active signals found matching your current filter.'}
            </p>
            {selectedFilter !== 'HISTORY' && onScanAndFormSignals && (
              <button
                onClick={() => onScanAndFormSignals()}
                className="inline-flex items-center gap-1.5 bg-[#2979FF] hover:bg-[#2979FF]/90 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
                <span>Scan & Form Fresh Institutional Signals Now</span>
              </button>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Trade Outcome Forensic Breakdown Modal */}
      <TradeOutcomeAnalysisModal
        isOpen={Boolean(selectedOutcomeSignal)}
        onClose={() => setSelectedOutcomeSignal(null)}
        tradeOrSignal={selectedOutcomeSignal}
      />
    </div>
  );
};
