import React, { useState, useMemo, useEffect } from 'react';
import { AssetPerformanceStat, AssetCategory } from '../types';
import {
  Percent,
  DollarSign,
  Layers,
  Award,
  Sparkles,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  LayoutGrid
} from 'lucide-react';

interface Props {
  stats: AssetPerformanceStat[];
  onSelectPair?: (pair: string | null) => void;
  selectedPair?: string | null;
  onAskAi?: (pair: string) => void;
}

export const AssetPerformanceBreakdown: React.FC<Props> = ({
  stats,
  onSelectPair,
  selectedPair,
  onAskAi
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'PROFIT' | 'WIN_RATE' | 'TRADES' | 'PIPS'>('PROFIT');
  const [viewLayout, setViewLayout] = useState<'DROPDOWN' | 'COMPACT_TABLE'>('DROPDOWN');
  const [inspectedPairSymbol, setInspectedPairSymbol] = useState<string>('');

  // Category options
  const categories: { key: AssetCategory | 'ALL'; label: string; icon: string }[] = [
    { key: 'ALL', label: 'All Assets', icon: '🌐' },
    { key: 'MAJORS', label: 'Majors (~$2 Margin)', icon: '🏛️' },
    { key: 'MINORS', label: 'Minors & Crosses', icon: '🔀' },
    { key: 'METALS', label: 'Gold & Silver', icon: '🥇' },
  ];

  // Filter & Sort
  const filteredStats = useMemo(() => {
    return stats
      .filter(item => {
        return selectedCategory === 'ALL' || item.category === selectedCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'PROFIT') return b.profitDollar - a.profitDollar;
        if (sortBy === 'WIN_RATE') return b.winRate - a.winRate;
        if (sortBy === 'TRADES') return b.totalTrades - a.totalTrades;
        if (sortBy === 'PIPS') return b.totalPips - a.totalPips;
        return 0;
      });
  }, [stats, selectedCategory, sortBy]);

  // Sync inspected pair when parent selectedPair or filteredStats changes
  useEffect(() => {
    if (selectedPair && filteredStats.some(s => s.pairSymbol === selectedPair)) {
      setInspectedPairSymbol(selectedPair);
    } else if (
      !inspectedPairSymbol ||
      !filteredStats.some(s => s.pairSymbol === inspectedPairSymbol)
    ) {
      setInspectedPairSymbol(filteredStats[0]?.pairSymbol || '');
    }
  }, [selectedPair, filteredStats, inspectedPairSymbol]);

  const activePairStat = useMemo(() => {
    return (
      filteredStats.find(s => s.pairSymbol === inspectedPairSymbol) ||
      filteredStats[0] ||
      null
    );
  }, [filteredStats, inspectedPairSymbol]);

  const currentPairIndex = useMemo(() => {
    if (!activePairStat) return -1;
    return filteredStats.findIndex(s => s.pairSymbol === activePairStat.pairSymbol);
  }, [filteredStats, activePairStat]);

  // Aggregate Category Totals
  const totals = useMemo(() => {
    const list = filteredStats;
    const totalTrades = list.reduce((acc, s) => acc + s.totalTrades, 0);
    const winTrades = list.reduce((acc, s) => acc + s.winTrades, 0);
    const lossTrades = list.reduce((acc, s) => acc + s.lossTrades, 0);
    const totalPips = Math.round(list.reduce((acc, s) => acc + s.totalPips, 0) * 10) / 10;
    const totalProfitDollar = list.reduce((acc, s) => acc + s.profitDollar, 0);
    const avgWinRate = totalTrades > 0 ? Math.round((winTrades / totalTrades) * 1000) / 10 : 0;
    const topPerformer = list.length > 0 ? list[0] : null;

    return {
      totalTrades,
      winTrades,
      lossTrades,
      totalPips,
      totalProfitDollar,
      avgWinRate,
      topPerformer
    };
  }, [filteredStats]);

  const handlePairDropdownChange = (symbol: string) => {
    setInspectedPairSymbol(symbol);
  };

  const handleStepPair = (dir: -1 | 1) => {
    if (filteredStats.length === 0) return;
    const nextIdx = (currentPairIndex + dir + filteredStats.length) % filteredStats.length;
    setInspectedPairSymbol(filteredStats[nextIdx].pairSymbol);
  };

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
      {/* Header & Compact Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-[#222F47]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2979FF]/15 border border-[#2979FF]/30 flex items-center justify-center text-[#2979FF]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
              <span>Backtest Result by Pair</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2979FF]/20 text-[#2979FF] border border-[#2979FF]/40">
                {filteredStats.length} Pairs
              </span>
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              Select any currency pair or metal from the dropdown menu to inspect its backtest performance
            </p>
          </div>
        </div>

        {/* View Mode & Sort Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#182033] p-0.5 rounded-lg border border-[#222F47]">
            <button
              onClick={() => setViewLayout('DROPDOWN')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                viewLayout === 'DROPDOWN'
                  ? 'bg-[#2979FF] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
              title="Compact Pair Dropdown View"
            >
              <ListFilter className="w-3 h-3" />
              <span>Dropdown View</span>
            </button>
            <button
              onClick={() => setViewLayout('COMPACT_TABLE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                viewLayout === 'COMPACT_TABLE'
                  ? 'bg-[#2979FF] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
              title="Compact Summary Table"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Compact Table</span>
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort asset performance breakdown"
            className="bg-[#182033] border border-[#222F47] text-[#F1F5F9] text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2979FF]"
          >
            <option value="PROFIT">Sort: Top Net Profit ($)</option>
            <option value="WIN_RATE">Sort: Highest Win Rate (%)</option>
            <option value="TRADES">Sort: Most Trades</option>
            <option value="PIPS">Sort: Top Pips</option>
          </select>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards (Compact 4-Column Strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-[#182033]/70 border border-[#222F47] p-2.5 rounded-xl">
          <span className="text-[9.5px] text-[#94A3B8] uppercase font-bold block mb-0.5">
            Category Net PnL ($)
          </span>
          <div className="flex items-center gap-1">
            <DollarSign className={`w-3.5 h-3.5 ${totals.totalProfitDollar >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'}`} />
            <span className={`text-sm sm:text-base font-mono font-black ${
              totals.totalProfitDollar >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
            }`}>
              {totals.totalProfitDollar >= 0 ? `+$${totals.totalProfitDollar.toLocaleString()}` : `-$${Math.abs(totals.totalProfitDollar).toLocaleString()}`}
            </span>
          </div>
          <span className="text-[9.5px] text-[#64748B] font-mono block">
            {totals.totalPips >= 0 ? `+${totals.totalPips} pips` : `${totals.totalPips} pips`}
          </span>
        </div>

        <div className="bg-[#182033]/70 border border-[#222F47] p-2.5 rounded-xl">
          <span className="text-[9.5px] text-[#94A3B8] uppercase font-bold block mb-0.5">
            Category Win Rate
          </span>
          <div className="flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-[#FFD700]" />
            <span className="text-sm sm:text-base font-mono font-black text-[#FFD700]">
              {totals.avgWinRate}%
            </span>
          </div>
          <span className="text-[9.5px] text-[#64748B] font-mono block">
            {totals.winTrades}W / {totals.lossTrades}L
          </span>
        </div>

        <div className="bg-[#182033]/70 border border-[#222F47] p-2.5 rounded-xl">
          <span className="text-[9.5px] text-[#94A3B8] uppercase font-bold block mb-0.5">
            Total Setups
          </span>
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#2979FF]" />
            <span className="text-sm sm:text-base font-mono font-black text-[#2979FF]">
              {totals.totalTrades}
            </span>
          </div>
          <span className="text-[9.5px] text-[#64748B] font-mono block">
            Across {filteredStats.length} pairs
          </span>
        </div>

        <div className="bg-[#182033]/70 border border-[#222F47] p-2.5 rounded-xl">
          <span className="text-[9.5px] text-[#94A3B8] uppercase font-bold block mb-0.5">
            #1 Top Pair
          </span>
          <div className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-[#00E676]" />
            <span className="text-sm font-bold text-[#F1F5F9] truncate">
              {totals.topPerformer ? totals.topPerformer.pairSymbol : 'N/A'}
            </span>
          </div>
          <span className="text-[9.5px] text-[#00E676] font-mono block truncate">
            {totals.topPerformer ? `+$${totals.topPerformer.profitDollar.toLocaleString()} (${totals.topPerformer.winRate}%)` : '-'}
          </span>
        </div>
      </div>

      {/* Compact Dropdown Selector Row: Category Dropdown + Pair Result Dropdown */}
      <div className="bg-[#141B2D] border border-[#222F47] rounded-xl p-3 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          {/* 1. Category Filter Dropdown (4 cols) */}
          <div className="sm:col-span-4">
            <label className="text-[10px] text-[#94A3B8] uppercase font-bold block mb-1">
              1. Asset Category Filter
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as AssetCategory | 'ALL')}
                aria-label="Select asset category"
                className="w-full appearance-none bg-[#182033] border border-[#222F47] hover:border-[#2979FF]/60 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#F1F5F9] focus:outline-none focus:border-[#2979FF] cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat.key} value={cat.key}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Backtesting Result Pair Dropdown Menu (8 cols) */}
          <div className="sm:col-span-8">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-[#FFD700] uppercase font-black tracking-wide">
                2. Select Backtesting Result Pair ({filteredStats.length} Available)
              </label>
              {filteredStats.length > 1 && (
                <span className="text-[10px] font-mono text-[#94A3B8]">
                  Rank #{currentPairIndex + 1} of {filteredStats.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepPair(-1)}
                disabled={filteredStats.length <= 1}
                className="p-2 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-40 transition-colors cursor-pointer"
                title="Previous Pair"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex-1">
                <select
                  value={activePairStat?.pairSymbol || ''}
                  onChange={(e) => handlePairDropdownChange(e.target.value)}
                  aria-label="Select pair to view backtesting result"
                  className="w-full appearance-none bg-[#182033] border-2 border-[#2979FF]/60 hover:border-[#2979FF] rounded-xl pl-3.5 pr-9 py-2 text-xs font-mono font-black text-[#F1F5F9] focus:outline-none focus:border-[#FFD700] shadow-inner cursor-pointer"
                >
                  {filteredStats.map((item, idx) => {
                    const pnlSign = item.profitDollar >= 0 ? '+' : '-';
                    const pipsSign = item.totalPips >= 0 ? '+' : '';
                    return (
                      <option key={item.pairSymbol} value={item.pairSymbol}>
                        #{idx + 1} {item.pairSymbol} [{item.category}] — {item.winRate}% WR | {pnlSign}${Math.abs(item.profitDollar)} ({pipsSign}{item.totalPips}p • {item.totalTrades}T)
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-[#FFD700] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => handleStepPair(1)}
                disabled={filteredStats.length <= 1}
                className="p-2 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-40 transition-colors cursor-pointer"
                title="Next Pair"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: SINGLE SELECTED PAIR RESULT CARD (DEFAULT COMPACT VIEW) */}
      {viewLayout === 'DROPDOWN' && activePairStat && (() => {
        const item = activePairStat;
        const isProfitable = item.profitDollar >= 0;
        const isGlobalFilterActive = selectedPair === item.pairSymbol;

        return (
          <div
            className={`bg-[#141B2D] border rounded-xl p-4 transition-all relative overflow-hidden ${
              isGlobalFilterActive
                ? 'border-[#FFD700] shadow-lg shadow-[#FFD700]/10'
                : 'border-[#2979FF]/50'
            }`}
          >
            {/* Top Row: Pair Title + Net PnL Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg font-black text-[#F1F5F9] font-mono">
                  {item.pairSymbol}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#182033] text-[#94A3B8] border border-[#222F47]">
                  {item.category}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#2979FF]/15 text-[#60A5FA] border border-[#2979FF]/30">
                  Rank #{currentPairIndex + 1} of {filteredStats.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-sm sm:text-base font-mono font-black ${
                  isProfitable ? 'text-[#00E676]' : 'text-[#FF3366]'
                }`}>
                  {isProfitable ? `+$${item.profitDollar.toLocaleString()}` : `-$${Math.abs(item.profitDollar).toLocaleString()}`}
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  isProfitable ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30' : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30'
                }`}>
                  {item.returnPercent >= 0 ? `+${item.returnPercent}% ROI` : `${item.returnPercent}% ROI`}
                </span>
              </div>
            </div>

            {/* Win/Loss Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8] mb-1.5">
                <span>
                  Win Rate: <strong className="text-[#FFD700] text-sm">{item.winRate}%</strong>
                </span>
                <span>
                  <strong className="text-[#00E676]">{item.winTrades} Wins</strong> •{' '}
                  <strong className="text-[#FF3366]">{item.lossTrades} Losses</strong> ({item.totalTrades} Total Trades)
                </span>
              </div>
              <div className="h-2 w-full bg-[#FF3366]/40 rounded-full overflow-hidden flex">
                <div
                  className="bg-[#00E676] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, item.winRate))}%` }}
                />
              </div>
            </div>

            {/* 4-Column Sub-Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-[#101522] p-2.5 rounded-xl border border-[#222F47]/80 mb-3">
              <div>
                <span className="text-[10px] text-[#64748B] block">Total Pips</span>
                <span className={`font-black text-sm ${item.totalPips >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                  {item.totalPips >= 0 ? `+${item.totalPips}p` : `${item.totalPips}p`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Profit Factor</span>
                <span className="text-[#FFD700] font-black text-sm">
                  {item.profitFactor.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Wins / Losses</span>
                <span className="text-[#F1F5F9] font-bold text-xs">
                  {item.winTrades}W / {item.lossTrades}L
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Best / Worst Trade</span>
                <span className="text-[#F1F5F9] font-bold text-xs">
                  +{item.bestWinPips}p / {item.worstLossPips}p
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              {onSelectPair && (
                <button
                  onClick={() => onSelectPair(isGlobalFilterActive ? null : item.pairSymbol)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isGlobalFilterActive
                      ? 'bg-[#FFD700] text-[#080B11] shadow-md'
                      : 'bg-[#2979FF] hover:bg-[#2979FF]/90 text-white'
                  }`}
                >
                  {isGlobalFilterActive
                    ? `✓ Global Filter Active on ${item.pairSymbol} (Click to Show All Pairs)`
                    : `Filter Entire Backtest Lab & Equity Curve to ${item.pairSymbol}`}
                </button>
              )}

              {onAskAi && (
                <button
                  onClick={() => onAskAi(item.pairSymbol)}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/40 transition-all cursor-pointer"
                  title={`Analyze ${item.pairSymbol} in AI Copilot`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Audit {item.pairSymbol}</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* VIEW 2: COMPACT SCROLLABLE TABLE (Optional if user switches to Compact Table) */}
      {viewLayout === 'COMPACT_TABLE' && (
        <div className="bg-[#141B2D] border border-[#222F47] rounded-xl overflow-hidden">
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#101522] text-[#64748B] sticky top-0 border-b border-[#222F47]">
                <tr>
                  <th className="py-2 px-3">Pair</th>
                  <th className="py-2 px-2">Win Rate</th>
                  <th className="py-2 px-2">Trades</th>
                  <th className="py-2 px-2">Pips</th>
                  <th className="py-2 px-2">Net PnL</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222F47]/50 text-[#F1F5F9]">
                {filteredStats.map((item) => {
                  const isPos = item.profitDollar >= 0;
                  const isSelected = inspectedPairSymbol === item.pairSymbol;
                  return (
                    <tr
                      key={item.pairSymbol}
                      onClick={() => {
                        setInspectedPairSymbol(item.pairSymbol);
                        setViewLayout('DROPDOWN');
                      }}
                      className={`hover:bg-[#182033] cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#2979FF]/15' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-bold">
                        {item.pairSymbol}{' '}
                        <span className="text-[9px] text-[#64748B] font-normal">{item.category}</span>
                      </td>
                      <td className="py-2 px-2 text-[#FFD700] font-bold">{item.winRate}%</td>
                      <td className="py-2 px-2 text-[#94A3B8]">
                        {item.winTrades}W-{item.lossTrades}L ({item.totalTrades})
                      </td>
                      <td className={`py-2 px-2 font-bold ${item.totalPips >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                        {item.totalPips >= 0 ? `+${item.totalPips}p` : `${item.totalPips}p`}
                      </td>
                      <td className={`py-2 px-2 font-bold ${isPos ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                        {isPos ? `+$${item.profitDollar}` : `-$${Math.abs(item.profitDollar)}`}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-[10px] text-[#2979FF] font-bold">Inspect →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
