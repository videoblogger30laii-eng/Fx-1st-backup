import React from 'react';
import { ForexSignal, ForexPair, RefreshIntervalSeconds, MarketDataProvider, TradingSession } from '../types';
import { formatPrice, isSignalValidAndActive } from '../services/marketData';
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
  Server
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

  const filterTabs = [
    { key: 'ALL', label: `Active (${activeSignals.length})` },
    { key: 'VIP', label: `🔥 A+ VIP (${activeSignals.filter(s => s.confluenceScore >= 90).length})` },
    { key: 'RUNNING', label: `Running (${activeSignals.filter(s => s.status === 'RUNNING').length})` },
    { key: 'PENDING', label: `Pending (${activeSignals.filter(s => s.status === 'PENDING').length})` },
    { key: 'GOLD', label: 'Gold XAU' },
    { key: 'INDICES', label: 'US30 / Indices' },
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

          {/* Alerts with badge */}
          <button
            onClick={onOpenAlerts}
            className="relative p-1.5 bg-[#182033] hover:bg-[#222F47] rounded-lg border border-[#222F47] text-[#FFD700]"
            title="Alerts Center"
          >
            <Bell className="w-4 h-4" />
            {activeAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FFD700] text-[#080B11] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {activeAlertCount}
              </span>
            )}
          </button>

          {/* AI Copilot Fast Open */}
          <button
            onClick={() => (bestTrade ? onAskAi(bestTrade) : onAskAi(signals[0]))}
            className="p-1.5 bg-[#182033] hover:bg-[#222F47] rounded-lg border border-[#222F47] text-[#2979FF]"
            title="AI Copilot Audit"
          >
            <Sparkles className="w-4 h-4" />
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

      {/* Live Pairs Rates Carousel */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
            <span className="font-bold text-[#F1F5F9] uppercase tracking-wider text-[10px]">
              Live Pair Rates
            </span>
          </div>
          <span className="text-[10px] text-[#64748B]">Streaming Ticks</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {allPairs.map(pair => {
            const isPos = pair.currentPrice >= pair.basePrice;
            const pips = Math.round(Math.abs(pair.currentPrice - pair.basePrice) * (pair.pipDigits === 2 ? 100 : 10000) * 10) / 10;

            return (
              <div
                key={pair.symbol}
                className="bg-[#101522] border border-[#222F47] rounded-xl px-3 py-2 shrink-0 min-w-[115px] text-left"
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-xs font-bold text-[#F1F5F9]">{pair.symbol}</span>
                  <span
                    className={`text-[9.5px] font-bold ${
                      isPos ? 'text-[#00E676]' : 'text-[#FF3366]'
                    }`}
                  >
                    {isPos ? '+' : '-'}{pips}p
                  </span>
                </div>
                <div className="text-[11px] font-mono font-bold text-[#F1F5F9]">
                  {formatPrice(pair, pair.currentPrice)}
                </div>
              </div>
            );
          })}
        </div>
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

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map(t => {
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
