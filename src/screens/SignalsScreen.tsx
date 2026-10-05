import React, { useState } from 'react';
import { ForexSignal, ForexPair, RefreshIntervalSeconds, MarketDataProvider, TradingSession, getAssetCategory } from '../types';
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
  CheckCircle2
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
  onToggleSound?: () => void;
  onManualRefresh: () => void;
  onToggleSync: () => void;
  lastSyncFormatted: string;
  quotaUsed: number;
  quotaLimit: number;
  onAskAi: (sig: ForexSignal) => void;
  onOpenAlerts: () => void;
  onOpenBacktest: () => void;
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

  // Selected Asset in Live Explorer for Instant Analysis
  const [selectedAssetPair, setSelectedAssetPair] = useState<ForexPair | null>(allPairs[0] || null);
  const [assetCarouselCategory, setAssetCarouselCategory] = useState<'ALL' | 'MAJORS' | 'MINORS' | 'METALS' | 'INDICES' | 'CRYPTO'>('ALL');
  const [tradableOnlyFilter, setTradableOnlyFilter] = useState<boolean>(false);

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
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      {/* Top Provider, Sync & Quick Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Provider Button */}
          <button
            onClick={onOpenProviderModal}
            className="flex items-center gap-1.5 bg-[#182033] hover:bg-[#222F47] px-3 py-1.5 rounded-full border border-[#222F47] transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isMarketOpen ? 'bg-[#00E676] animate-pulse' : 'bg-[#64748B]'
              }`}
            />
            <span className="text-[11px] font-semibold text-[#F1F5F9]">
              {isMarketOpen ? marketDataProvider : 'Weekend Close'}
            </span>
          </button>

          {/* Elev8 MT5 Account Integration Button */}
          {onOpenElev8Modal && (
            <button
              onClick={onOpenElev8Modal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[11px] font-bold ${
                isElev8Connected
                  ? 'bg-[#00E676]/15 border-[#00E676]/50 text-[#00E676] hover:bg-[#00E676]/25'
                  : 'bg-[#182033] border-[#2979FF]/40 text-[#2979FF] hover:bg-[#222F47]'
              }`}
              title="Configure Elev8 MT5 Account Integration & Auto-Copier"
            >
              <Server className="w-3.5 h-3.5 text-[#2979FF]" />
              <span>Elev8 MT5</span>
              {isElev8Connected && <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />}
            </button>
          )}

          {/* Economic Calendar & News Guard Button */}
          {onOpenCalendar && (
            <button
              onClick={onOpenCalendar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#182033] hover:bg-[#222F47] border border-[#FF3366]/40 text-[#FF3366] text-[11px] font-bold transition-all shadow-sm"
              title="Open Live Economic Calendar & News Guard"
            >
              <Flame className="w-3.5 h-3.5 text-[#FF3366]" />
              <span>News Calendar 🔴</span>
            </button>
          )}

          {/* Currency Strength Meter Button */}
          {onOpenStrength && (
            <button
              onClick={onOpenStrength}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#182033] hover:bg-[#222F47] border border-[#2979FF]/40 text-[#2979FF] text-[11px] font-bold transition-all shadow-sm"
              title="Open Live Currency Strength Meter & Heatmap"
            >
              <Gauge className="w-3.5 h-3.5 text-[#2979FF]" />
              <span>Strength Meter</span>
            </button>
          )}

          {/* Trader Journal Button */}
          {onOpenJournal && (
            <button
              onClick={onOpenJournal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#182033] hover:bg-[#222F47] border border-[#00E676]/40 text-[#00E676] text-[11px] font-bold transition-all shadow-sm"
              title="Open Trader Journal & Performance Analytics"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00E676]" />
              <span>Journal</span>
            </button>
          )}

          {/* Audio Sound FX Toggle */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className={`p-1.5 rounded-full border transition-all ${
                isSoundMuted
                  ? 'bg-[#182033] border-[#64748B]/40 text-[#64748B] hover:text-white'
                  : 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676] hover:bg-[#00E676]/25'
              }`}
              title={isSoundMuted ? "Sound Muted: Click to Enable Audio Chimes" : "Sound Enabled: Click to Mute Audio Chimes"}
            >
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Quick Utilities Row */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Daily Quota Bar / Pill */}
          <button
            onClick={onOpenRefreshModal}
            className="hidden md:flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#101522] border border-[#222F47] text-[#94A3B8] hover:border-[#2979FF] transition-all"
            title="API Quota Saver: Click to view details"
          >
            <Gauge className="w-3.5 h-3.5 text-[#2979FF]" />
            <span>Used: <strong className="text-[#FFD700] font-bold">{quotaUsed}/{quotaLimit}</strong> today</span>
          </button>

          {/* Big Sync ON/OFF Toggle Button */}
          <button
            onClick={onToggleSync}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-md ${
              refreshInterval > 0
                ? 'bg-[#00E676]/20 border border-[#00E676]/70 text-[#00E676] hover:bg-[#00E676]/30 shadow-[0_0_12px_rgba(0,230,118,0.25)]'
                : 'bg-[#FF3366]/20 border border-[#FF3366]/70 text-[#FF3366] hover:bg-[#FF3366]/30 shadow-[0_0_12px_rgba(255,51,102,0.25)]'
            }`}
            title={refreshInterval > 0 ? "Click to Pause Sync (Sleep Mode - 0 API calls)" : "Click to Resume Sync (Resumes 5m Default)"}
          >
            {refreshInterval > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                <span className="tracking-wide">SYNC ON</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-3.5 h-3.5 text-[#FF3366]" />
                <span className="tracking-wide">SYNC OFF</span>
                <span className="text-[10px] font-mono text-[#F87171]">• Last sync {lastSyncFormatted}</span>
              </>
            )}
          </button>

          {/* Refresh interval pill */}
          <button
            onClick={onOpenRefreshModal}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
              refreshInterval === 0
                ? 'bg-[#182033] border-[#FF3366]/40 text-[#FF3366]'
                : refreshInterval === 300
                ? 'bg-[#182033] border-[#00E676]/40 text-[#00E676]'
                : 'bg-[#182033] border-[#2979FF]/40 text-[#2979FF]'
            } hover:bg-[#222F47]`}
            title="Configure Refresh Cadence"
          >
            <Clock className="w-3 h-3" />
            <span>
              {refreshInterval === 0
                ? 'PAUSED'
                : refreshInterval === 300
                ? '5m Default'
                : refreshInterval === 600
                ? '10m'
                : refreshInterval === 60
                ? '1m'
                : `${refreshInterval}s`}
            </span>
          </button>

          {/* Quick Refresh Icon */}
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 bg-[#182033] hover:bg-[#222F47] rounded-lg border border-[#222F47] text-[#2979FF] disabled:opacity-50"
            title="Instant Live Sync"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Risk Calculator */}
          <button
            onClick={onOpenRiskModal}
            className="p-1.5 bg-[#182033] hover:bg-[#222F47] rounded-lg border border-[#222F47] text-[#00E676]"
            title="Risk Calculator"
          >
            <Calculator className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Trading Sessions Clock */}
      <TradingSessionsClock sessions={tradingSessions} />

      {/* Live Pairs Rates & Asset Categories Explorer */}
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
              const pips = Math.round(Math.abs(pair.currentPrice - pair.basePrice) * (pair.pipDigits === 2 ? 100 : (pair.pipDigits === 1 ? 10 : 10000)) * 10) / 10;
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

      {/* Multi-Timeframe Institutional Matrix */}
      <MultiTimeframeMatrix />

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

        {/* Sort Chips */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] text-[#64748B] font-bold">Sort by:</span>
          <div className="flex gap-1.5">
            {[
              { key: 'CONFLUENCE', label: 'Confluence' },
              { key: 'PIPS', label: 'Top Pips' },
              { key: 'RECENT', label: 'Newest' },
              { key: 'RR', label: 'R:R' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => onSortSelect(s.key)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                  sortOption === s.key
                    ? 'bg-[#182033] border-[#FFD700] text-[#FFD700]'
                    : 'bg-[#101522] border-[#222F47] text-[#94A3B8]'
                }`}
              >
                {s.label}
              </button>
            ))}
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
          Live Signals Feed
        </span>
        <span className="text-[#94A3B8]">{filteredSignals.length} Active Signals</span>
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
            onOpenBacktest={onOpenBacktest}
            onOpenElev8Order={onOpenElev8Order ? () => onOpenElev8Order(sig) : undefined}
            nowClockMs={nowClockMs}
          />
        ))}

        {filteredSignals.length === 0 && (
          <div className="p-8 text-center bg-[#101522] rounded-xl border border-[#222F47]">
            <p className="text-xs text-[#94A3B8]">No signals found matching your current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
