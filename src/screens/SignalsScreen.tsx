import React, { useState, useMemo } from 'react';
import { ForexSignal, ForexPair, RefreshIntervalSeconds, MarketDataProvider, TradingSession, getAssetCategory, getSignalStrategy, STRATEGY_CONFIGS, StrategyType, computeNonRepeatedSignals } from '../types';
import { formatPrice, isSignalValidAndActive, createSyntheticSignalForPair, getTradeDurationMs, matchesSignalSearch } from '../services/marketData';
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
  ClosedOutcomeFilter,
  ClosedTfFilter,
  TimeframeStat
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
import {
  analyzeCurrencyConflicts,
  ConflictFilterMode
} from '../services/currencyConflictFilter';

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
  onCloseTrade?: (sig: ForexSignal) => void;
  onClearCooldown?: (pairSymbol: string) => void;
  scannerStatus?: {
    globalStatus: string | null;
    blocked: { pairSymbol: string; status: string; reason: string }[];
    lastScanAtMs?: number;
  };
  confluenceFilter?: '60_PLUS' | '70_PLUS' | '80_PLUS';
  onConfluenceFilterSelect?: (val: '60_PLUS' | '70_PLUS' | '80_PLUS') => void;
  confluenceCounts?: {
    plus60: number;
    plus70: number;
    plus80: number;
  };
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
  onDeselectAllStrategies = () => {},
  onCloseTrade,
  onClearCooldown,
  scannerStatus,
  confluenceFilter = '60_PLUS',
  onConfluenceFilterSelect,
  confluenceCounts
}) => {
  const [isStrategyTogglesOpen, setIsStrategyTogglesOpen] = useState(false);
  const [selectedOutcomeSignal, setSelectedOutcomeSignal] = useState<ForexSignal | null>(null);
  const [isAPlusDropdownOpen, setIsAPlusDropdownOpen] = useState(false);

  // Currency Conflict Filter State (Default: Filter ON, Mode = STRICT)
  const [isConflictFilterEnabled, setIsConflictFilterEnabled] = useState<boolean>(true);
  const [conflictMode, setConflictMode] = useState<ConflictFilterMode>('STRICT');
  const [isHiddenConflictsExpanded, setIsHiddenConflictsExpanded] = useState<boolean>(false);
  const [acknowledgedConflictIds, setAcknowledgedConflictIds] = useState<Record<string, boolean>>({});

  const [closedVisibleCount, setClosedVisibleCount] = useState<number>(40);
  const closedClockBucket = Math.floor((nowClockMs || Date.now()) / 30000) * 30000;

  // Strictly active, tradeable, non-expired, and non-invalidated signals (>= 60 confluence)
  const activeSignals = useMemo(
    () => signals.filter(s => isSignalValidAndActive(s, closedClockBucket) && (s.confluenceScore ?? 0) >= 60),
    [signals, closedClockBucket]
  );
  const isAPlusNonRepeated = selectedFilter === 'A_PLUS_NON_REPEATED';
  const bestTrade = isAPlusNonRepeated
    ? (filteredSignals[0] || activeSignals.find(s => s.isBestTradeNow) || activeSignals[0])
    : (activeSignals.find(s => s.isBestTradeNow) || activeSignals[0]);

  // Step 1 & Step 3: Calculate Currency Bias from all current active signals & evaluate filteredSignals
  const conflictAnalysis = useMemo(() => {
    return analyzeCurrencyConflicts(activeSignals, filteredSignals);
  }, [activeSignals, filteredSignals]);

  const { cleanFilteredSignals, conflictingFilteredSignals } = useMemo(() => {
    const clean: ForexSignal[] = [];
    const conflicts: ForexSignal[] = [];
    for (const sig of filteredSignals) {
      if (conflictAnalysis.evaluationsById[sig.id]?.isConflict) {
        conflicts.push(sig);
      } else {
        clean.push(sig);
      }
    }
    return { cleanFilteredSignals: clean, conflictingFilteredSignals: conflicts };
  }, [filteredSignals, conflictAnalysis]);

  const displayedActiveSignals = useMemo(() => {
    if (!isConflictFilterEnabled) {
      return filteredSignals;
    }
    if (conflictMode === 'STRICT') {
      return cleanFilteredSignals;
    }
    // WARNING mode: clean signals first, conflicting signals pushed to the bottom
    return [...cleanFilteredSignals, ...conflictingFilteredSignals];
  }, [isConflictFilterEnabled, conflictMode, filteredSignals, cleanFilteredSignals, conflictingFilteredSignals]);

  const lockedBiasesList = useMemo(() => {
    return Object.values(conflictAnalysis.biasMap).filter(b => b.isLocked || (b.buyCount > 0 && b.sellCount > 0));
  }, [conflictAnalysis]);

  const handleToggleAcknowledgeConflict = (signalId: string) => {
    setAcknowledgedConflictIds(prev => ({
      ...prev,
      [signalId]: !prev[signalId]
    }));
  };

  // Closed Trades Timeframe, Sorting & Retention State
  const [closedTimeRange, setClosedTimeRange] = useState<ClosedTimeRange>(() =>
    PersistenceManager.getClosedTimeRange()
  );
  const [closedSortOption, setClosedSortOption] = useState<ClosedSortOption>(() =>
    (PersistenceManager.getClosedSortOption() as ClosedSortOption) || 'NEWEST_CLOSED'
  );
  const [closedOutcome, setClosedOutcome] = useState<ClosedOutcomeFilter>('ALL');
  const [closedTimeframe, setClosedTimeframe] = useState<ClosedTfFilter>('ALL');
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
    const seenFp = new Set<string>();
    return signals.filter(s => {
      if (isSignalValidAndActive(s, closedClockBucket)) return false;
      const baseId = (s.id || '').replace(/-HIST-\d+/g, '').replace(/-HIT_TP-\d+/g, '').replace(/-HIT_SL-\d+/g, '');
      const sym = (s.pair?.symbol || '').toUpperCase();
      const entry = s.entryPrice || 0;

      // Discard any phantom closed trade created with an outdated basePrice
      if (
        (sym === 'GBP/CAD' && entry < 1.85) ||
        (sym === 'USD/CHF' && entry > 0.85) ||
        (sym === 'CAD/JPY' && entry < 112.0) ||
        (sym === 'GBP/AUD' && entry < 1.91) ||
        (sym === 'USD/CAD' && entry > 1.41) ||
        (sym === 'GBP/JPY' && entry < 210.0) ||
        (sym === 'EUR/GBP' && entry > 0.842) ||
        (sym === 'EUR/CAD' && entry < 1.568 && s.status === 'HIT_TP') ||
        (s.id && s.id.includes('MW32VU'))
      ) {
        return false;
      }

      const pipsStr = Math.round((s.pips ?? 0) * 10) / 10;
      const fingerprint = `${sym}-${s.status}-${pipsStr}`;

      if (seen.has(s.id) || (baseId && seen.has(baseId)) || seenFp.has(fingerprint)) {
        return false;
      }
      seen.add(s.id);
      if (baseId) seen.add(baseId);
      seenFp.add(fingerprint);
      return true;
    });
  }, [signals, closedClockBucket]);

  // Calculate win/loss rates per timeframe (ALL, M15, H1, H4) across current closed time range
  const timeframeStats = useMemo<Record<ClosedTfFilter, TimeframeStat>>(() => {
    const calc = (list: ForexSignal[]): TimeframeStat => {
      const total = list.length;
      const wins = list.filter(s => s.status === 'HIT_TP' || (s.pips ?? 0) > 0).length;
      const losses = list.filter(s => (s.pips ?? 0) < 0).length;
      const winRate = total > 0 ? Math.round((wins / total) * 100 * 10) / 10 : 0;
      const netPips = Math.round(list.reduce((acc, s) => acc + (s.pips ?? 0), 0) * 10) / 10;
      return { total, wins, losses, winRate, netPips };
    };

    const getTfKey = (s: ForexSignal): 'M15' | 'H1' | 'H4' | 'OTHER' => {
      const tf = (s.timeframe || s.winningTf || s.tfScores?.winningTf || '').toUpperCase();
      if (tf.includes('15') || tf === 'M15') return 'M15';
      if (tf.includes('1H') || tf === 'H1') return 'H1';
      if (tf.includes('4H') || tf === 'H4') return 'H4';
      return 'OTHER';
    };

    const now = closedClockBucket || Date.now();
    const timeRangeFiltered = allClosedSignals.filter(s => {
      const closedTime = s.closedAtMs || s.createdAtMs || now;
      if (closedTimeRange === '24H') return closedTime >= now - 24 * 3600 * 1000;
      if (closedTimeRange === '48H') return closedTime >= now - 48 * 3600 * 1000;
      if (closedTimeRange === '1W') return closedTime >= now - 7 * 24 * 3600 * 1000;
      if (closedTimeRange === '1M') return closedTime >= now - 30 * 24 * 3600 * 1000;
      if (closedTimeRange === 'CUSTOM') {
        const startMs = customStartDate ? new Date(customStartDate).setHours(0, 0, 0, 0) : 0;
        const endMs = customEndDate ? new Date(customEndDate).setHours(23, 59, 59, 999) : Number.MAX_SAFE_INTEGER;
        return closedTime >= startMs && closedTime <= endMs;
      }
      return true;
    });

    return {
      ALL: calc(timeRangeFiltered),
      M15: calc(timeRangeFiltered.filter(s => getTfKey(s) === 'M15')),
      H1: calc(timeRangeFiltered.filter(s => getTfKey(s) === 'H1')),
      H4: calc(timeRangeFiltered.filter(s => getTfKey(s) === 'H4')),
    };
  }, [allClosedSignals, closedTimeRange, customStartDate, customEndDate, closedClockBucket]);

  // Dynamically filtered and sorted closed trades for the Closed / History tab
  const displayedClosedSignals = useMemo(() => {
    const now = closedClockBucket || Date.now();
    const isSearchActive = Boolean(searchQuery && searchQuery.trim());

    // 1. Time Range Filter
    // When a search query is typed, search across all closed history so matching trades (such as yesterday's GBP/AUD) are never hidden
    let list = allClosedSignals.filter(s => {
      if (isSearchActive) {
        return true;
      }
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

    // 1b. Timeframe Filter (M15, H1, H4, or ALL)
    if (closedTimeframe !== 'ALL') {
      const getTfKey = (s: ForexSignal): 'M15' | 'H1' | 'H4' | 'OTHER' => {
        const tf = (s.timeframe || s.winningTf || s.tfScores?.winningTf || '').toUpperCase();
        if (tf.includes('15') || tf === 'M15') return 'M15';
        if (tf.includes('1H') || tf === 'H1') return 'H1';
        if (tf.includes('4H') || tf === 'H4') return 'H4';
        return 'OTHER';
      };
      list = list.filter(s => getTfKey(s) === closedTimeframe);
    }

    // 2. Search Filter (matches symbol, pair name, timeframe e.g. "1hr"/"h1", outcome e.g. "sl"/"loss", strategy, etc.)
    if (isSearchActive) {
      list = list.filter(sig => matchesSignalSearch(sig, searchQuery));

      // 3. Outcome Filter: if search produced results, respect outcome only if it doesn't wipe them out
      if (closedOutcome === 'WINS') {
        const winsOnly = list.filter(s => s.status === 'HIT_TP' || (s.pips ?? 0) > 0);
        if (winsOnly.length > 0) list = winsOnly;
      } else if (closedOutcome === 'LOSSES') {
        const lossesOnly = list.filter(s => s.status === 'HIT_SL' || (s.pips ?? 0) < 0);
        if (lossesOnly.length > 0) list = lossesOnly;
      }
    } else {
      if (closedOutcome === 'WINS') {
        list = list.filter(s => s.status === 'HIT_TP' || (s.pips ?? 0) > 0);
      } else if (closedOutcome === 'LOSSES') {
        list = list.filter(s => s.status === 'HIT_SL' || (s.pips ?? 0) < 0);
      }
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
  }, [allClosedSignals, closedTimeRange, closedOutcome, closedTimeframe, searchQuery, closedSortOption, customStartDate, customEndDate, closedClockBucket]);

  const tfSuffix = closedTimeframe === 'M15' ? ' · 15 Min (M15)' : closedTimeframe === 'H1' ? ' · 1 Hour (H1)' : closedTimeframe === 'H4' ? ' · 4 Hours (H4)' : '';
  const activeTimeframeLabel =
    (searchQuery.trim()
      ? `Search: "${searchQuery}" in All Closed History`
      : closedTimeRange === '24H'
      ? '24 Hours'
      : closedTimeRange === '48H'
      ? '48 Hours'
      : closedTimeRange === '1W'
      ? '1 Week'
      : closedTimeRange === '1M'
      ? '1 Month'
      : closedTimeRange === 'CUSTOM'
      ? `Custom (${customStartDate} → ${customEndDate})`
      : 'All History') + tfSuffix;

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
    { key: 'MAJORS', label: 'Majors', count: activeSignals.filter(s => getAssetCategory(s.pair.symbol) === 'MAJORS').length, icon: '🏛️' },
    { key: 'MINORS', label: 'Crosses', count: activeSignals.filter(s => getAssetCategory(s.pair.symbol) === 'MINORS').length, icon: '🔀' },
    { key: 'METALS', label: 'Metals', count: activeSignals.filter(s => getAssetCategory(s.pair.symbol) === 'METALS').length, icon: '🥇' },
  ];

  // Execution & Strategy Tabs
  const tradeableActiveSignals = useMemo(() => {
    return activeSignals.filter(s => (s.status === 'RUNNING' || s.status === 'PENDING') && !s.isDemotedFromActive);
  }, [activeSignals]);
  const tradeableActiveCount = tradeableActiveSignals.length;

  const nonRepeatedActiveSignals = useMemo(() => {
    return computeNonRepeatedSignals(tradeableActiveSignals);
  }, [tradeableActiveSignals]);
  const nonRepeatedCount = nonRepeatedActiveSignals.length;

  const standbyCount = activeSignals.filter(s => s.status === 'STANDBY').length;
  const runningCount = activeSignals.filter(s => s.status === 'RUNNING').length;

  const strategyFilterTabs = [
    { key: 'ALL', label: `All (${activeSignals.length})` },
    { key: 'ALL_ACTIVE', label: `🎯 A+ Active (${tradeableActiveCount})` },
    { key: 'STANDBY', label: `⏳ Standby (${standbyCount})` },
    { key: 'VIP', label: `🔥 85%+ VIP (${activeSignals.filter(s => s.confluenceScore >= 85 && !s.isDemotedFromActive).length})` },
    { key: 'RUNNING', label: `Running (${runningCount})` },
    { key: 'PENDING', label: `Pending (${activeSignals.filter(s => s.status === 'PENDING').length})` },
    { key: 'FAVORITES', label: `⭐ Saved (${activeSignals.filter(s => s.isFavorite).length})` },
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
    <div className="space-y-2.5 max-w-md mx-auto pb-36 px-4">
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

      {/* Active Strategy Suite & Live Explorer (Only shown for Active Signals Feed) */}
      {selectedFilter !== 'HISTORY' && (
        <>
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
        </>
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
                      {sortOption === 'CHANGED' ? '⚠️ Changed / Recalc' :
                       sortOption === 'LATEST' || sortOption === 'RECENT' ? 'Latest' :
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
                            { key: 'CHANGED', label: 'Recalculated / Changed First', icon: '⚠️' },
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
                if (t.key === 'ALL_ACTIVE') {
                  const isAPlusActive = selectedFilter === 'ALL_ACTIVE' || selectedFilter === 'A_PLUS_NON_REPEATED';
                  const isNonRepeated = selectedFilter === 'A_PLUS_NON_REPEATED';
                  return (
                    <div key={t.key} className="relative shrink-0">
                      <div className={`inline-flex items-center rounded-lg border transition-all ${
                        isAPlusActive
                          ? (isNonRepeated
                              ? 'bg-[#2979FF] border-[#2979FF] text-white shadow-xs'
                              : 'bg-[#00E676] border-[#00E676] text-[#080B11] shadow-xs')
                          : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAPlusActive) {
                              onFilterSelect('ALL_ACTIVE');
                            } else {
                              setIsAPlusDropdownOpen(!isAPlusDropdownOpen);
                            }
                          }}
                          className={`text-[10px] font-bold pl-2.5 pr-1 py-1 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                            isAPlusActive ? 'font-black' : ''
                          }`}
                        >
                          <span>
                            {isNonRepeated
                              ? `⭐ A+ Non-Repeated (${nonRepeatedCount})`
                              : `🎯 A+ Active (${tradeableActiveCount})`}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAPlusDropdownOpen(!isAPlusDropdownOpen);
                          }}
                          className={`px-1.5 py-1 border-l transition-all cursor-pointer flex items-center justify-center ${
                            isAPlusActive
                              ? 'border-black/20 hover:bg-black/10'
                              : 'border-[#222F47] hover:bg-[#182033]'
                          }`}
                          title="Open A+ Active Sort Menu (A+ Active All or A+ Non-Repeated)"
                          aria-label="Toggle A+ Active dropdown menu"
                        >
                          <ChevronDown className={`w-3 h-3 transition-transform ${isAPlusDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {/* Dropdown Menu under A+ Active Card */}
                      {isAPlusDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsAPlusDropdownOpen(false)}
                          />
                          <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#141B2D] border border-[#2979FF]/50 rounded-xl shadow-2xl z-50 py-1 divide-y divide-[#222F47]/60">
                            <div className="px-3 py-1.5 text-[9.5px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
                              <span>A+ Active Options</span>
                              <span className="text-[#00E676] font-mono">Select 1 of 2</span>
                            </div>
                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onFilterSelect('ALL_ACTIVE');
                                  setIsAPlusDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedFilter === 'ALL_ACTIVE'
                                    ? 'bg-[#00E676]/20 text-[#00E676]'
                                    : 'text-[#94A3B8] hover:bg-[#1C263B] hover:text-[#F1F5F9]'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span>🎯</span>
                                    <span className="text-[#F1F5F9]">A+ Active All</span>
                                    <span className="text-[9px] font-mono text-[#00E676]">({tradeableActiveCount})</span>
                                  </div>
                                  <div className="text-[9.5px] text-[#94A3B8] font-normal mt-0.5">
                                    All active & running A+ institutional setups
                                  </div>
                                </div>
                                {selectedFilter === 'ALL_ACTIVE' && <Check className="w-3.5 h-3.5 text-[#00E676] shrink-0" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onFilterSelect('A_PLUS_NON_REPEATED');
                                  setIsAPlusDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedFilter === 'A_PLUS_NON_REPEATED'
                                    ? 'bg-[#2979FF]/20 text-[#60A5FA]'
                                    : 'text-[#94A3B8] hover:bg-[#1C263B] hover:text-[#F1F5F9]'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span>⭐</span>
                                    <span className="text-[#F1F5F9]">A+ Non-Repeated</span>
                                    <span className="text-[9px] font-mono text-[#60A5FA]">({nonRepeatedCount})</span>
                                  </div>
                                  <div className="text-[9.5px] text-[#94A3B8] font-normal mt-0.5">
                                    Best A+ Forex & Metals with 0 currency overlap
                                  </div>
                                </div>
                                {selectedFilter === 'A_PLUS_NON_REPEATED' && <Check className="w-3.5 h-3.5 text-[#2979FF] shrink-0" />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                const isSelected = selectedFilter === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
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

            {/* Row 4: Confluence Score Filter Buttons (60+, 70+, 80+) */}
            {selectedFilter !== 'HISTORY' && onConfluenceFilterSelect && (
              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#222F47]/60 flex-wrap">
                <span className="text-[9.5px] font-bold text-[#94A3B8] uppercase tracking-wider shrink-0">
                  Confluence:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { key: '60_PLUS' as const, label: '60+', count: confluenceCounts?.plus60 },
                    { key: '70_PLUS' as const, label: '70+', count: confluenceCounts?.plus70 },
                    { key: '80_PLUS' as const, label: '80+', count: confluenceCounts?.plus80 }
                  ].map(btn => {
                    const isActive = confluenceFilter === btn.key;
                    const activeColors =
                      btn.key === '80_PLUS'
                        ? 'bg-[#00E676] border-[#00E676] text-[#080B11] font-black shadow-xs'
                        : btn.key === '70_PLUS'
                        ? 'bg-[#2979FF] border-[#2979FF] text-white font-black shadow-xs'
                        : 'bg-[#FFD700] border-[#FFD700] text-[#080B11] font-black shadow-xs';
                    return (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => onConfluenceFilterSelect(btn.key)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                          isActive
                            ? activeColors
                            : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#334155]'
                        }`}
                      >
                        <span>{btn.label}</span>
                        {typeof btn.count === 'number' && (
                          <span className={`font-mono text-[9px] ${isActive ? 'opacity-80' : 'text-[#64748B]'}`}>
                            ({btn.count})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* A+ Active Sub-Menu Strip: 2 Direct Options Under the A+ Active Card */}
            {(selectedFilter === 'ALL_ACTIVE' || selectedFilter === 'A_PLUS_NON_REPEATED') && (
              <div className="flex items-center justify-between gap-1.5 p-1 bg-[#080B11] border border-[#222F47] rounded-lg">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[9.5px] font-bold text-[#94A3B8] px-1.5 uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <span>🎯</span>
                    <span>A+ Mode:</span>
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onFilterSelect('ALL_ACTIVE')}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        selectedFilter === 'ALL_ACTIVE'
                          ? 'bg-[#00E676] text-[#080B11] font-black shadow-xs'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
                      }`}
                    >
                      <span>🎯 A+ Active All</span>
                      <span className="font-mono text-[9px] opacity-80">({tradeableActiveCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onFilterSelect('A_PLUS_NON_REPEATED')}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        selectedFilter === 'A_PLUS_NON_REPEATED'
                          ? 'bg-[#2979FF] text-white font-black shadow-xs'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
                      }`}
                    >
                      <span>⭐ A+ Non-Repeated</span>
                      <span className="font-mono text-[9px] opacity-80">({nonRepeatedCount})</span>
                    </button>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-[#64748B] hidden sm:inline px-1">
                  {selectedFilter === 'A_PLUS_NON_REPEATED' ? 'Zero Overlap Active' : 'All Tradeable Setups'}
                </span>
              </div>
            )}
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
                selectedTimeframe={closedTimeframe}
                onChangeTimeframe={setClosedTimeframe}
                timeframeStats={timeframeStats}
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
                selectedTimeframe={closedTimeframe}
                onSelectTimeframe={setClosedTimeframe}
                timeframeStats={timeframeStats}
              />
            </div>
          )}

          {/* Step 2: Currency Conflict Filter Bar at Top of Signal List (STRICT + WARNING Modes) */}
          {selectedFilter !== 'HISTORY' && (
            <div className="bg-[#101522] border border-[#222F47] rounded-xl p-2.5 space-y-2 shadow-sm terminal-card">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {/* 3 Required Mode Switch Buttons: [Conflict Filter: ON/OFF] + [Mode: STRICT | WARNING] */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsConflictFilterEnabled(prev => !prev)}
                    className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isConflictFilterEnabled
                        ? 'bg-[#00E676]/15 border-[#00E676]/50 text-[#00E676]'
                        : 'bg-[#080B11] border-[#334155] text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {isConflictFilterEnabled ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-[#64748B]" />
                    )}
                    <span>Conflict Filter: {isConflictFilterEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <div className="inline-flex items-center bg-[#080B11] border border-[#222F47] rounded-lg p-0.5">
                    <span className="text-[9px] font-bold text-[#64748B] px-1.5 uppercase tracking-wider">
                      Mode:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsConflictFilterEnabled(true);
                        setConflictMode('STRICT');
                      }}
                      className={`text-[10px] font-black px-2 py-1 rounded-md transition-all cursor-pointer ${
                        isConflictFilterEnabled && conflictMode === 'STRICT'
                          ? 'bg-[#2979FF] text-white shadow-xs'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      STRICT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsConflictFilterEnabled(true);
                        setConflictMode('WARNING');
                      }}
                      className={`text-[10px] font-black px-2 py-1 rounded-md transition-all cursor-pointer ${
                        isConflictFilterEnabled && conflictMode === 'WARNING'
                          ? 'bg-[#FF9100] text-[#080B11] shadow-xs'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      WARNING
                    </button>
                  </div>
                </div>

                {/* Live Clean / Conflicts Counter */}
                <div className="text-[10px] font-mono font-bold px-2 py-1 rounded-md bg-[#080B11] border border-[#1E293B] text-[#E2E8F0]">
                  {isConflictFilterEnabled ? (
                    <>
                      <span>Showing </span>
                      <span className="text-[#00E676] font-black">{cleanFilteredSignals.length} Clean Signals</span>
                      <span className="text-[#64748B]"> | </span>
                      <span className={conflictingFilteredSignals.length > 0 ? 'text-[#FF5252] font-black' : 'text-[#94A3B8]'}>
                        {conflictingFilteredSignals.length} Conflicts
                      </span>
                    </>
                  ) : (
                    <span className="text-[#94A3B8]">
                      Filter OFF · Showing all {filteredSignals.length} signals normally
                    </span>
                  )}
                </div>
              </div>

              {/* Active Locked Currency Bias Summary Strip (shown when Filter is ON) */}
              {isConflictFilterEnabled && lockedBiasesList.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-[#222F47]/60">
                  <span className="text-[8.5px] font-bold text-[#64748B] uppercase tracking-wider mr-0.5">
                    Locked Bias:
                  </span>
                  {lockedBiasesList.map(item => (
                    <span
                      key={item.currency}
                      className={`text-[8.5px] font-mono font-black px-1.5 py-0.5 rounded border leading-none ${
                        item.bias === 'BULLISH'
                          ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30'
                          : item.bias === 'BEARISH'
                          ? 'bg-[#FF3366]/10 text-[#FF5252] border-[#FF3366]/30'
                          : 'bg-[#FF9100]/10 text-[#FF9100] border-[#FF9100]/30'
                      }`}
                      title={`BUY: ${item.buyPairs.join(', ') || 'None'} | SELL: ${item.sellPairs.join(', ') || 'None'}`}
                    >
                      {item.displayName}{' '}
                      {item.bias === 'BULLISH'
                        ? `▲ BULL (${item.buyCount})`
                        : item.bias === 'BEARISH'
                        ? `▼ BEAR (${item.sellCount})`
                        : `⚖ SPLIT (${item.buyCount}/${item.sellCount})`}
                    </span>
                  ))}
                </div>
              )}
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
                : isConflictFilterEnabled
                ? `${displayedActiveSignals.length} Shown (${cleanFilteredSignals.length} Clean · ${conflictingFilteredSignals.length} Conflicts)`
                : `${filteredSignals.length} Active Setups`}
            </span>
          </div>

      {/* 15-Minute Close Cooldown Indicator */}
      {selectedFilter !== 'HISTORY' && (() => {
        const cooldowns = PersistenceManager.getUserClosedCooldowns();
        const list = Object.values(cooldowns);
        if (list.length === 0) return null;
        return (
          <div className="p-2.5 rounded-xl bg-[#161F33]/90 border border-[#FF3366]/30 flex items-center justify-between gap-2 text-[10.5px]">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <Clock className="w-3.5 h-3.5 text-[#FF9100] shrink-0" />
              <span className="font-bold text-[#F8FAFC]">15m Resting Cooldown:</span>
              {list.map(c => {
                const remSec = Math.max(0, Math.floor((c.cooldownExpiresAtMs - nowClockMs) / 1000));
                const remMin = Math.floor(remSec / 60);
                const remSecLeft = remSec % 60;
                return (
                  <span key={c.pairSymbol} className="font-mono px-1.5 py-0.5 rounded bg-[#FF3366]/20 text-[#FF5252] border border-[#FF3366]/40 text-[9.5px] font-black">
                    {c.pairSymbol} ({remMin}m {remSecLeft}s)
                  </span>
                );
              })}
            </div>
            {onClearCooldown && (
              <button
                type="button"
                onClick={() => {
                  list.forEach(c => onClearCooldown(c.pairSymbol));
                }}
                className="text-[9.5px] font-black text-[#60A5FA] hover:text-[#93C5FD] px-2 py-1 rounded-md bg-[#2979FF]/20 border border-[#2979FF]/40 transition-all shrink-0 cursor-pointer active:scale-95"
                title="Resume and rescan paused pairs immediately"
              >
                Rescan Now
              </button>
            )}
          </div>
        );
      })()}

      {/* A+ Non-Repeated Currencies & Metals Portfolio Banner */}
      {selectedFilter === 'A_PLUS_NON_REPEATED' && (
        <div className="bg-[#101522] border border-[#2979FF]/50 rounded-xl p-3 shadow-md space-y-1 terminal-card">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">⭐</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-[#F1F5F9]">A+ Non-Repeated Currencies & Metals</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                    Zero Currency Overlap
                  </span>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">
                  Best possible A+ setups selected across Forex & Metals. Every single trade contains 0 common base or quote currencies with any other trade shown.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black text-[#60A5FA] bg-[#2979FF]/20 px-2 py-1 rounded-md border border-[#2979FF]/40 shrink-0">
              {filteredSignals.length} Setups
            </span>
          </div>
        </div>
      )}

      {/* Real-Data Scanner Diagnostics Banner (NO DATA / NO CANDLES / H4 EMA Trend Blocks / Conflict Blocks) */}
      {selectedFilter !== 'HISTORY' && (scannerStatus?.globalStatus || (scannerStatus?.blocked && scannerStatus.blocked.length > 0)) && (
        <div className="bg-[#101522] rounded-xl border border-[#222F47] p-3 space-y-2">
          {scannerStatus.globalStatus && (
            <div className="flex items-center justify-between gap-2 bg-[#FF5252]/10 border border-[#FF5252]/40 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-[#FF5252] shrink-0" />
                <span className="text-[11px] font-mono font-bold text-[#FCA5A5]">
                  {scannerStatus.globalStatus}
                </span>
              </div>
            </div>
          )}
          {scannerStatus.blocked.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                <span className="font-bold text-[#E2E8F0]">
                  Scanner Real-Data Gate ({scannerStatus.blocked.length} pairs filtered)
                </span>
                {scannerStatus.lastScanAtMs && (
                  <span>{new Date(scannerStatus.lastScanAtMs).toISOString().slice(11, 19)} UTC</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {scannerStatus.blocked.map((b) => (
                  <div
                    key={`${b.pairSymbol}-${b.status}`}
                    className="flex items-start justify-between gap-2 text-[10px] font-mono bg-[#0B0F1A] border border-[#1E293B] rounded px-2 py-1"
                  >
                    <span className="font-bold text-[#F1F5F9] shrink-0">{b.pairSymbol}</span>
                    <span className="text-[#94A3B8] text-right truncate" title={b.reason}>
                      {b.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signal Cards */}
      <div className="space-y-2">
        {(selectedFilter === 'HISTORY'
          ? displayedClosedSignals.slice(0, closedVisibleCount)
          : displayedActiveSignals
        ).map((sig, idx) => (
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
            onCloseTrade={onCloseTrade}
            nowClockMs={nowClockMs}
            isMarketOpen={isMarketOpen}
            conflictFilterActive={selectedFilter !== 'HISTORY' && isConflictFilterEnabled}
            conflictMode={conflictMode}
            conflictInfo={selectedFilter !== 'HISTORY' ? conflictAnalysis.evaluationsById[sig.id] : undefined}
            isConflictAcknowledged={Boolean(acknowledgedConflictIds[sig.id])}
            onAcknowledgeConflict={handleToggleAcknowledgeConflict}
          />
        ))}

        {selectedFilter === 'HISTORY' && displayedClosedSignals.length > closedVisibleCount && (
          <button
            type="button"
            onClick={() => setClosedVisibleCount(prev => prev + 40)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#101522] hover:bg-[#161F33] border border-[#222F47] text-xs font-bold text-[#60A5FA] transition-colors cursor-pointer"
          >
            Load More Closed Trades ({displayedClosedSignals.length - closedVisibleCount} remaining)
          </button>
        )}

        {(selectedFilter === 'HISTORY' ? displayedClosedSignals : displayedActiveSignals).length === 0 && (
          <div className="p-8 text-center bg-[#101522] rounded-xl border border-[#222F47] space-y-3">
            <p className="text-xs text-[#94A3B8]">
              {selectedFilter === 'HISTORY'
                ? `No closed trades found matching "${activeTimeframeLabel}". Try switching to 48 Hours, 1 Week, 1 Month, or All History.`
                : isConflictFilterEnabled && conflictMode === 'STRICT' && conflictingFilteredSignals.length > 0
                ? `All ${conflictingFilteredSignals.length} matching signals are hidden due to Currency Conflicts. Tap the grey box below to view reasons or switch to WARNING mode.`
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

      {/* Step 3A: STRICT MODE Bottom Grey Collapsed Box for Hidden Conflicting Signals */}
      {selectedFilter !== 'HISTORY' &&
        isConflictFilterEnabled &&
        conflictMode === 'STRICT' &&
        conflictingFilteredSignals.length > 0 && (
          <div className="bg-[#161B22] border border-[#334155]/80 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setIsHiddenConflictsExpanded(prev => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left bg-[#1A212C] hover:bg-[#222B3A] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-[#94A3B8] shrink-0" />
                <span className="text-[11px] font-black text-[#CBD5E1] truncate">
                  Hidden - Conflicting Signals ({conflictingFilteredSignals.length}) - Tap to view
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform ${
                  isHiddenConflictsExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isHiddenConflictsExpanded && (
              <div className="p-2.5 space-y-2 border-t border-[#293445] bg-[#11151C]">
                {conflictingFilteredSignals.map(sig => {
                  const evalInfo = conflictAnalysis.evaluationsById[sig.id];
                  const isBuy = sig.type.startsWith('BUY');
                  return (
                    <div
                      key={`hidden-conflict-${sig.id}`}
                      onClick={() => onInspectSignal(sig)}
                      className="p-2.5 rounded-lg bg-[#1A202B] border border-[#334155]/80 hover:border-[#64748B] transition-colors cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-[#E2E8F0]">
                            {sig.pair.symbol}
                          </span>
                          <span
                            className={`text-[9.5px] font-black px-1.5 py-0.5 rounded leading-none ${
                              isBuy
                                ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/35'
                                : 'bg-[#FF3366]/15 text-[#FF5252] border border-[#FF3366]/35'
                            }`}
                          >
                            {isBuy ? 'BUY' : 'SELL'}
                          </span>
                          <span className="text-[9.5px] font-mono text-[#94A3B8]">
                            [{(sig.timeframe || sig.winningTf || 'H1').toUpperCase()}] · {sig.confluenceScore}/100
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-[#94A3B8] underline underline-offset-2 shrink-0">
                          Inspect →
                        </span>
                      </div>

                      <p className="text-[10.5px] font-medium text-[#CBD5E1] leading-relaxed bg-[#0F141B] px-2.5 py-1.5 rounded border border-[#293445]">
                        {evalInfo?.strictHiddenReason || `${sig.pair.symbol} hidden due to conflicting currency bias.`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* Mobile Safe Area Bottom Navigation Clearance Spacer */}
      <div className="h-20 w-full shrink-0" aria-hidden="true" />
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
