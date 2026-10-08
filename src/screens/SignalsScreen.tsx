import React, { useState } from 'react';
import { ForexSignal, ForexPair, RefreshIntervalSeconds, MarketDataProvider, TradingSession, getAssetCategory, getSignalStrategy, STRATEGY_CONFIGS, StrategyType } from '../types';
import { formatPrice, isSignalValidAndActive, createSyntheticSignalForPair } from '../services/marketData';
import { TradingSessionsClock } from '../components/TradingSessionsClock';
import { BestTradeHeroCard } from '../components/BestTradeHeroCard';
import { MultiTimeframeMatrix } from '../components/MultiTimeframeMatrix';
import { SignalCard } from '../components/SignalCard';
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
  ChevronDown
} from 'lucide-react';

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
  onOpenLiveChart
}) => {
  // Strictly active, tradeable, non-expired, and non-invalidated signals
  const activeSignals = signals.filter(s => isSignalValidAndActive(s, nowClockMs));
  const bestTrade = activeSignals.find(s => s.isBestTradeNow) || activeSignals[0];
  const closedOrExpiredCount = signals.filter(s => !isSignalValidAndActive(s, nowClockMs)).length;

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
    { key: 'ALL', label: 'All 0.01 Assets', count: activeSignals.length, icon: '🌐' },
    { key: 'MAJORS', label: 'Majors (~$2 Margin)', count: activeSignals.filter(s => getAssetCategory(s.pair.symbol) === 'MAJORS').length, icon: '🏛️' },
    { key: 'MINORS', label: 'Minors & Crosses', count: activeSignals.filter(s => getAssetCategory(s.pair.symbol) === 'MINORS').length, icon: '🔀' },
    { key: 'METALS', label: 'Gold & Silver', count: activeSignals.filter(s => getAssetCategory(s.pair.symbol) === 'METALS').length, icon: '🥇' },
  ];

  // Execution & Strategy Tabs
  const strategyFilterTabs = [
    { key: 'VIP', label: `🔥 A+ VIP (${activeSignals.filter(s => s.confluenceScore >= 90).length})` },
    { key: 'RUNNING', label: `Running (${activeSignals.filter(s => s.status === 'RUNNING').length})` },
    { key: 'PENDING', label: `Pending (${activeSignals.filter(s => s.status === 'PENDING').length})` },
    { key: 'FAVORITES', label: `Watchlist (${activeSignals.filter(s => s.isFavorite).length})` },
    { key: 'HISTORY', label: `Closed (${closedOrExpiredCount})` },
  ];

  return (
    <div className="space-y-3.5 max-w-4xl mx-auto pb-16">
      {/* Compact Mobile App Quick-Action Dock (4 Primary App Tiles + Sync & Tools Row) */}
      <div className="bg-[#101522] border border-[#222F47] rounded-2xl p-2.5 space-y-2 shadow-md">
        <div className="grid grid-cols-4 gap-1.5">
          {/* 1. Elev8 MT5 */}
          <button
            onClick={onOpenElev8Modal}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all active:scale-95 ${
              isElev8Connected
                ? 'bg-[#00E676]/15 border-[#00E676]/50 text-[#00E676]'
                : 'bg-[#182033] border-[#222F47] text-[#2979FF] hover:bg-[#222F47]'
            }`}
          >
            <Server className="w-4 h-4" />
            <span className="text-[10px] font-black leading-none">Elev8 MT5</span>
          </button>

          {/* 2. News Guard */}
          <button
            onClick={onOpenCalendar}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#FF3366]/40 text-[#FF3366] transition-all active:scale-95"
          >
            <Flame className="w-4 h-4 text-[#FF3366]" />
            <span className="text-[10px] font-black leading-none">News 🔴</span>
          </button>

          {/* 3. Strength Meter (Gold, Silver, 8 FX & All Assets) */}
          <button
            onClick={onOpenStrength}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#FFD700]/40 text-[#FFD700] transition-all active:scale-95"
          >
            <Gauge className="w-4 h-4 text-[#FFD700]" />
            <span className="text-[10px] font-black leading-none">Strength</span>
          </button>

          {/* 4. Trade Journal */}
          <button
            onClick={onOpenJournal}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#00E676]/40 text-[#00E676] transition-all active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-[#00E676]" />
            <span className="text-[10px] font-black leading-none">Journal</span>
          </button>
        </div>

        {/* Compact Status & Utility Strip */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#222F47]/60">
          <button
            onClick={onOpenProviderModal}
            className="flex items-center gap-1.5 bg-[#080B11] hover:bg-[#182033] px-2.5 py-1 rounded-lg border border-[#222F47] transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isMarketOpen ? 'bg-[#00E676] animate-pulse' : 'bg-[#64748B]'
              }`}
            />
            <span className="text-[10px] font-bold text-[#F1F5F9]">
              {isMarketOpen ? marketDataProvider : 'Weekend'}
            </span>
          </button>

          <div className="flex items-center gap-1">
            {/* Market Precision Mode (Raw Socket Feed) */}
            {onToggleMarketPrecision && (
              <button
                onClick={onToggleMarketPrecision}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all border ${
                  isMarketPrecisionEnabled
                    ? 'bg-[#FFD700]/20 border-[#FFD700]/60 text-[#FFD700]'
                    : 'bg-[#182033] border-[#222F47] text-[#64748B]'
                }`}
                title="Market Precision Mode: Uses raw WebSocket feeds for zero slippage execution at exact entry price"
              >
                <Zap className={`w-3 h-3 ${isMarketPrecisionEnabled ? 'text-[#FFD700] fill-[#FFD700]' : ''}`} />
                <span>{isMarketPrecisionEnabled ? 'PRECISION ON' : 'PRECISION OFF'}</span>
              </button>
            )}

            {/* Sync ON/OFF */}
            <button
              onClick={onToggleSync}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all ${
                refreshInterval > 0
                  ? 'bg-[#00E676]/20 border border-[#00E676]/60 text-[#00E676]'
                  : 'bg-[#FF3366]/20 border border-[#FF3366]/60 text-[#FF3366]'
              }`}
            >
              {refreshInterval > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                  <span>SYNC ON</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3 h-3 text-[#FF3366]" />
                  <span>PAUSED</span>
                </>
              )}
            </button>

            {/* Refresh Cadence */}
            <button
              onClick={onOpenRefreshModal}
              className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-[#080B11] border border-[#222F47] text-[#94A3B8] hover:text-white flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-[#2979FF]" />
              <span>{refreshInterval === 0 ? 'OFF' : `${refreshInterval}s`}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 bg-[#080B11] hover:bg-[#182033] rounded-lg border border-[#222F47] text-[#2979FF] disabled:opacity-50"
              title="Instant Live Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Risk Calculator */}
            <button
              onClick={onOpenRiskModal}
              className="p-1.5 bg-[#080B11] hover:bg-[#182033] rounded-lg border border-[#222F47] text-[#00E676]"
              title="Lot & Risk Calculator"
            >
              <Calculator className="w-3.5 h-3.5" />
            </button>

            {/* Sound Toggle */}
            {onToggleSound && (
              <button
                onClick={onToggleSound}
                className={`p-1.5 rounded-lg border transition-all ${
                  isSoundMuted
                    ? 'bg-[#080B11] border-[#222F47] text-[#64748B]'
                    : 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                }`}
                title="Toggle Sound Chimes"
              >
                {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile App View Switcher: [ ⚡ Signals ] [ 💹 Quotes (30) ] [ 🌍 Sessions ] [ 🗂️ Full ] */}
      <div className="grid grid-cols-4 gap-1 bg-[#101522] p-1 rounded-xl border border-[#222F47]">
        {[
          { id: 'SIGNALS' as const, label: `⚡ Signals (${activeSignals.length})` },
          { id: 'QUOTES' as const, label: `💹 Quotes (${allPairs.length})` },
          { id: 'SESSIONS' as const, label: '🌍 Sessions' },
          { id: 'ALL' as const, label: '🗂️ All View' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMobileSubView(tab.id)}
            className={`py-1.5 px-1 rounded-lg text-[10.5px] font-black transition-all ${
              mobileSubView === tab.id
                ? 'bg-[#2979FF] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Global Trading Sessions Clock (Shown in SESSIONS or ALL view) */}
      {(mobileSubView === 'SESSIONS' || mobileSubView === 'ALL') && (
        <TradingSessionsClock sessions={tradingSessions} />
      )}

      {/* Live Pairs Rates & Asset Categories Explorer (Shown in QUOTES or ALL view) */}
      {(mobileSubView === 'QUOTES' || mobileSubView === 'ALL') && (
      <div className="bg-[#101522] border border-[#222F47] rounded-2xl p-3.5 space-y-3 shadow-lg">
        {/* Header with Title, Live Streaming indicator & Tradability Toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
            <span className="font-extrabold text-[#F1F5F9] text-xs uppercase tracking-wider">
              Live Tradable & Non-Tradable Assets
            </span>
            <span className="text-[10px] bg-[#182033] border border-[#222F47] px-2 py-0.5 rounded-full text-[#94A3B8] font-mono">
              {allPairs.length} Assets
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTradableOnlyFilter(prev => !prev)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
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
                className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
                  isCatActive
                    ? 'bg-[#2979FF] border-[#2979FF] text-white shadow-md'
                    : 'bg-[#182033]/70 border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${isCatActive ? 'bg-white/20 text-white' : 'bg-[#101522] text-[#64748B]'}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Asset Cards Grid / Carousel */}
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 no-scrollbar">
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
                  className={`border rounded-xl p-2.5 shrink-0 min-w-[152px] text-left transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[#182033] border-[#FFD700] ring-2 ring-[#FFD700]/30 shadow-[0_0_15px_rgba(255,215,0,0.18)] scale-[1.02]'
                      : verifiedSig
                      ? 'bg-[#182033]/90 border-[#00E676]/50 hover:border-[#00E676] hover:bg-[#182033]'
                      : 'bg-[#182033]/40 border-[#222F47] hover:border-[#2979FF]/50 hover:bg-[#182033]/70'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-2 right-2 bg-[#FFD700] text-[#080B11] text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                      <Check className="w-2.5 h-2.5" /> Selected
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-black text-[#F1F5F9]">{pair.symbol}</span>
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

                  {/* 0.01 Lot Micro Margin indicator */}
                  <div className="text-[9px] text-[#94A3B8] bg-[#101522] px-1.5 py-0.5 rounded border border-[#222F47] font-mono mb-1.5 flex items-center justify-between">
                    <span>0.01 Margin:</span>
                    <span className="font-bold text-[#F1F5F9]">${margin.toFixed(2)}</span>
                  </div>

                  {/* Signal Status Pill: Clearly distinguishes Verified Active Signal vs Chart Observation Only */}
                  <div className="flex items-center justify-between text-[8.5px] font-semibold">
                    {verifiedSig ? (
                      <span className="px-1.5 py-0.5 rounded border bg-[#00E676]/15 text-[#00E676] border-[#00E676]/40 flex items-center gap-1 font-extrabold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                        <span>SIGNAL • {verifiedSig.confluenceScore}%</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded border bg-[#101522] text-[#64748B] border-[#222F47] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                        <span>NO SIGNAL • WAIT</span>
                      </span>
                    )}

                    <span className="text-[#64748B] text-[8px] uppercase">
                      {cat}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Selected Asset Action & SMC Analysis Bar */}
        {selectedAssetPair && (() => {
          const activeSig = activeSignals.find(s => s.pair.symbol === selectedAssetPair.symbol);
          return (
            <div className={`bg-[#182033] border rounded-xl p-3 space-y-2.5 animate-in fade-in duration-200 ${
              activeSig ? 'border-[#00E676]/50' : 'border-[#222F47]'
            }`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-black ${
                    activeSig
                      ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                      : 'bg-[#101522] border-[#222F47] text-[#94A3B8]'
                  }`}>
                    {selectedAssetPair.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-[#F1F5F9]">{selectedAssetPair.symbol}</span>
                      <span className="text-[10px] text-[#94A3B8]">{selectedAssetPair.name}</span>
                      {activeSig ? (
                        <span className="text-[9.5px] font-black px-2 py-0.5 rounded bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40">
                          ✅ ACTIVE SIGNAL ({activeSig.type.replace('_', ' ')} • {activeSig.confluenceScore}%)
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30">
                          ⚠️ NO ACTIVE SIGNAL — DO NOT TRADE YET (Chart Watch Only)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#64748B] mt-0.5">
                      <span>Live Price: <strong className="text-[#F1F5F9] font-mono">{formatPrice(selectedAssetPair, selectedAssetPair.currentPrice)}</strong></span>
                      <span>•</span>
                      <span>Spread: {selectedAssetPair.spreadPips}p</span>
                      <span>•</span>
                      <span>{activeSig ? `Entry: ${formatPrice(selectedAssetPair, activeSig.entryPrice)} | SL: ${formatPrice(selectedAssetPair, activeSig.stopLoss)} | TP1: ${formatPrice(selectedAssetPair, activeSig.takeProfit1)}` : 'Waiting for SMC Order Block & Currency Strength alignment'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Open Live Chart (Signal vs Chart-Only) */}
                  <button
                    onClick={() => {
                      if (onOpenLiveChart) {
                        onOpenLiveChart(activeSig || createSyntheticSignalForPair(selectedAssetPair));
                      }
                    }}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-md ${
                      activeSig
                        ? 'bg-[#00E676] hover:bg-[#00E676]/90 text-[#080B11]'
                        : 'bg-[#2979FF] hover:bg-[#2979FF]/80 text-white'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>{activeSig ? 'View Signal & Chart' : 'Open Chart Only'}</span>
                  </button>

                  {/* AI SMC Audit */}
                  <button
                    onClick={() => {
                      onAskAi(activeSig || createSyntheticSignalForPair(selectedAssetPair));
                    }}
                    className="flex items-center gap-1.5 bg-[#101522] hover:bg-[#182033] border border-[#FFD700]/50 text-[#FFD700] text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>AI Audit</span>
                  </button>

                  {/* Elev8 MT5 Custom Order - Only highlighted if active signal exists */}
                  {onOpenElev8Order && activeSig && (
                    <button
                      onClick={() => {
                        onOpenElev8Order(activeSig);
                      }}
                      className="flex items-center gap-1.5 bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/40 text-[#00E676] text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Trade Elev8</span>
                    </button>
                  )}

                  {/* Filter Feed to this Asset */}
                  {activeSig && (
                    <button
                      onClick={() => onSearchChange(selectedAssetPair.symbol)}
                      className="flex items-center gap-1 bg-[#101522] hover:bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                      title="Filter all signals to this pair"
                    >
                      <Search className="w-3 h-3" />
                      <span>Signal Card</span>
                    </button>
                  )}
                </div>
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
          {/* Best Trade Now Hero Card */}
          {bestTrade && (
            <BestTradeHeroCard
              signal={bestTrade}
              onInspect={() => onInspectSignal(bestTrade)}
              onAskAi={() => onAskAi(bestTrade)}
              onOpenChart={onOpenLiveChart ? () => onOpenLiveChart(bestTrade) : undefined}
              onTestBacktest={onOpenBacktest}
              onOpenElev8Order={onOpenElev8Order ? () => onOpenElev8Order(bestTrade) : undefined}
              nowClockMs={nowClockMs}
            />
          )}

      {/* Search Bar & Sort Row */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search pairs, gold, rationale, killzone..."
            className="w-full bg-[#101522] border border-[#222F47] rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#F1F5F9] focus:outline-hidden focus:border-[#FFD700]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Chips & Sort Icon Menu */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#222F47]/60">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-[#FFD700]" />
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Arrange / Sort:</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-1.5 bg-[#182033] hover:bg-[#222F47] border border-[#222F47] px-2.5 py-1 rounded-lg text-xs font-bold text-[#FFD700] transition-all"
            >
              <span>
                {sortOption === 'LATEST' || sortOption === 'RECENT' ? '⏱️ Latest' :
                 sortOption === 'OLDEST' ? '⏳ Oldest' :
                 sortOption === 'SMALL_TF' ? '📉 Small Timeframe' :
                 sortOption === 'HIGH_TF' ? '📈 Higher Timeframe' :
                 sortOption === 'PLUS_PIPS' ? '🚀 Plus Pips Gains' :
                 sortOption === 'MINUS_PIPS' ? '🔻 Minus Pips Gains' :
                 sortOption === 'PIPS' ? '🚀 Top Pips' :
                 sortOption === 'RR' ? '⚖️ R:R' : '🔥 Confluence'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-[#141B2D] border border-[#222F47] rounded-xl shadow-2xl z-50 py-1.5 divide-y divide-[#222F47]/60">
                <div className="px-3 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  Sort Signals By
                </div>
                <div className="py-1">
                  {[
                    { key: 'LATEST', label: 'Latest (Newest First)', icon: '⏱️' },
                    { key: 'OLDEST', label: 'Oldest First', icon: '⏳' },
                    { key: 'SMALL_TF', label: 'Small Timeframe (M5 → D1)', icon: '📉' },
                    { key: 'HIGH_TF', label: 'Higher Timeframe (D1 → M5)', icon: '📈' },
                    { key: 'PLUS_PIPS', label: 'Plus Pips Gains (Highest +)', icon: '🚀' },
                    { key: 'MINUS_PIPS', label: 'Minus Pips Gains (Lowest -)', icon: '🔻' },
                    { key: 'CONFLUENCE', label: 'Confluence Score', icon: '🔥' },
                    { key: 'RR', label: 'Risk : Reward (R:R)', icon: '⚖️' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => {
                        onSortSelect(item.key);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
                        sortOption === item.key
                          ? 'bg-[#2979FF]/20 text-[#2979FF]'
                          : 'text-[#94A3B8] hover:bg-[#1C263B] hover:text-[#F1F5F9]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      {sortOption === item.key && <Check className="w-3.5 h-3.5 text-[#2979FF]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset Class Categories Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">
            Asset Categories
          </span>
          <span className="text-[10px] text-[#94A3B8] font-mono">
            {activeSignals.length} Pairs Tracked
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {assetCategoryTabs.map(cat => {
            const isSelected = selectedFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onFilterSelect(cat.key)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border whitespace-nowrap transition-all shadow-sm ${
                  isSelected
                    ? 'bg-[#2979FF] border-[#2979FF] text-white'
                    : 'bg-[#101522] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#182033] text-[#64748B]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Core Institutional Strategies Filter Row (Matches Backtesting Lab 100%) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="font-bold text-[#FFD700] uppercase tracking-wider text-[10px]">
            4 Institutional Strategy Models
          </span>
          <span className="text-[10px] text-[#94A3B8]">
            Tap to Filter Signals by Strategy
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              { key: 'ALL', label: '🌐 All 4 Strategies', count: activeSignals.length },
              ...(Object.keys(STRATEGY_CONFIGS) as StrategyType[]).map(stratKey => ({
                key: stratKey,
                label: STRATEGY_CONFIGS[stratKey].title,
                count: activeSignals.filter(s => getSignalStrategy(s) === stratKey).length
              }))
            ]
          ).map(item => {
            const isSelected = selectedFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onFilterSelect(item.key)}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#FFD700] border-[#FFD700] text-[#080B11] font-black shadow-md'
                    : 'bg-[#101522] border-[#222F47] text-[#F1F5F9] hover:bg-[#182033]'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-[#080B11]/20 text-[#080B11]' : 'bg-[#182033] text-[#FFD700]'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Execution & Order State Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {strategyFilterTabs.map(t => {
          const isSelected = selectedFilter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onFilterSelect(t.key)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#00E676] border-[#00E676] text-[#080B11]'
                  : 'bg-[#101522] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Signals List Header */}
      <div className="flex items-center justify-between text-[11px] px-1">
        <span className="font-bold text-[#64748B] uppercase tracking-wider">
          {selectedFilter === 'HISTORY'
            ? 'Closed & Resolved Signals (Hit SL / Hit TP / Expired)'
            : 'Live Signals Feed'}
        </span>
        <span className="text-[#94A3B8]">
          {selectedFilter === 'HISTORY'
            ? `${filteredSignals.length} Closed Signals`
            : `${filteredSignals.length} Active Signals`}
        </span>
      </div>

      {/* Signal Cards */}
      <div className="space-y-3">
        {filteredSignals.map(sig => (
          <SignalCard
            key={sig.id}
            signal={sig}
            onClick={() => onInspectSignal(sig)}
            onToggleFavorite={() => onToggleFavorite(sig.id)}
            onToggleAlert={() => onToggleAlert(sig.id)}
            onAskAi={() => onAskAi(sig)}
            onOpenChart={onOpenLiveChart ? () => onOpenLiveChart(sig) : undefined}
            onOpenBacktest={() => onOpenBacktest(sig)}
            onOpenElev8Order={onOpenElev8Order ? () => onOpenElev8Order(sig) : undefined}
            nowClockMs={nowClockMs}
          />
        ))}

        {filteredSignals.length === 0 && (
          <div className="p-8 text-center bg-[#101522] rounded-xl border border-[#222F47]">
            <p className="text-xs text-[#94A3B8]">
              {selectedFilter === 'HISTORY'
                ? 'No signals have hit Stop Loss, Take Profit, or expired yet in this session.'
                : 'No signals found matching your current filter.'}
            </p>
          </div>
        )}
      </div>

      {/* Recently Closed Signals Preview when viewing active tabs */}
      {selectedFilter !== 'HISTORY' && closedOrExpiredCount > 0 && (
        <div className="pt-4 border-t border-[#222F47] space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3366]" />
              <span className="text-xs font-black text-[#F1F5F9] uppercase tracking-wider">
                Closed Signals History ({closedOrExpiredCount})
              </span>
            </div>
            <button
              onClick={() => onFilterSelect('HISTORY')}
              className="text-[11px] font-bold text-[#2979FF] hover:underline"
            >
              Open Closed Tab ➔
            </button>
          </div>
          <div className="space-y-3">
            {signals
              .filter(s => !isSignalValidAndActive(s, nowClockMs))
              .map(sig => (
                <SignalCard
                  key={`closed-${sig.id}`}
                  signal={sig}
                  onClick={() => onInspectSignal(sig)}
                  onToggleFavorite={() => onToggleFavorite(sig.id)}
                  onToggleAlert={() => onToggleAlert(sig.id)}
                  onAskAi={() => onAskAi(sig)}
                  onOpenChart={onOpenLiveChart ? () => onOpenLiveChart(sig) : undefined}
                  onOpenBacktest={() => onOpenBacktest(sig)}
                  onOpenElev8Order={onOpenElev8Order ? () => onOpenElev8Order(sig) : undefined}
                  nowClockMs={nowClockMs}
                />
              ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
