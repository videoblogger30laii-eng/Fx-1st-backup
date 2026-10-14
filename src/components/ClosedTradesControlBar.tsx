import React, { useState } from 'react';
import { ForexSignal } from '../types';
import {
  Calendar,
  Clock,
  ArrowUpDown,
  Download,
  Trash2,
  Filter,
  Check,
  ChevronDown,
  Settings2,
  X,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Trophy,
  AlertCircle
} from 'lucide-react';
import { PersistenceManager } from '../services/persistence';
import { getTradeDurationMs, formatDurationCompact } from '../services/marketData';

export type ClosedTimeRange = '24H' | '48H' | '1W' | '1M' | 'ALL' | 'CUSTOM';
export type ClosedSortOption =
  | 'NEWEST_CLOSED'
  | 'OLDEST_CLOSED'
  | 'LONGEST_DURATION'
  | 'SHORTEST_DURATION'
  | 'HIGHEST_PIPS'
  | 'LOWEST_PIPS'
  | 'WINS_FIRST'
  | 'LOSSES_FIRST'
  | 'PAIR_AZ';
export type ClosedOutcomeFilter = 'ALL' | 'WINS' | 'LOSSES';

interface Props {
  selectedTimeRange: ClosedTimeRange;
  onChangeTimeRange: (range: ClosedTimeRange) => void;
  selectedSortOption: ClosedSortOption;
  onChangeSortOption: (opt: ClosedSortOption) => void;
  selectedOutcome: ClosedOutcomeFilter;
  onChangeOutcome: (outcome: ClosedOutcomeFilter) => void;
  customStartDate: string;
  customEndDate: string;
  onChangeCustomDates: (start: string, end: string) => void;
  allClosedCount: number;
  filteredClosedCount: number;
  allClosedSignals: ForexSignal[];
  retentionPolicy: '24H' | '48H' | '1W' | '1M' | '90D' | 'ALL';
  onChangeRetentionPolicy: (val: '24H' | '48H' | '1W' | '1M' | '90D' | 'ALL') => void;
  onClearClosedHistory?: () => void;
}

export const ClosedTradesControlBar: React.FC<Props> = ({
  selectedTimeRange,
  onChangeTimeRange,
  selectedSortOption,
  onChangeSortOption,
  selectedOutcome,
  onChangeOutcome,
  customStartDate,
  customEndDate,
  onChangeCustomDates,
  allClosedCount,
  filteredClosedCount,
  allClosedSignals,
  retentionPolicy,
  onChangeRetentionPolicy,
  onClearClosedHistory
}) => {
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  // Temporary state for the custom date modal
  const [tempStart, setTempStart] = useState(customStartDate);
  const [tempEnd, setTempEnd] = useState(customEndDate);

  // Time range presets
  const timePresets: { key: ClosedTimeRange; label: string; icon: string }[] = [
    { key: '24H', label: '24 Hours', icon: '⏱️' },
    { key: '48H', label: '48 Hours', icon: '⏳' },
    { key: '1W', label: '1 Week', icon: '📅' },
    { key: '1M', label: '1 Month', icon: '🗓️' },
    { key: 'ALL', label: 'All History', icon: '🌐' },
    { key: 'CUSTOM', label: 'Custom', icon: '⚙️' },
  ];

  const sortOptionsConfig: { key: ClosedSortOption; label: string; icon: string }[] = [
    { key: 'NEWEST_CLOSED', label: 'Newest Closed First', icon: '⏱️' },
    { key: 'OLDEST_CLOSED', label: 'Oldest Closed First', icon: '⏳' },
    { key: 'LONGEST_DURATION', label: 'Longest Hold Time', icon: '⌛' },
    { key: 'SHORTEST_DURATION', label: 'Shortest Hold Time', icon: '⚡' },
    { key: 'HIGHEST_PIPS', label: 'Highest Profit (+ Pips)', icon: '🚀' },
    { key: 'LOWEST_PIPS', label: 'Highest Loss (- Pips)', icon: '🔻' },
    { key: 'WINS_FIRST', label: 'Wins First (Hit TP)', icon: '🎯' },
    { key: 'LOSSES_FIRST', label: 'Losses First (Hit SL)', icon: '🛑' },
    { key: 'PAIR_AZ', label: 'Pair Symbol (A → Z)', icon: '🔤' },
  ];

  const activeSortLabel =
    sortOptionsConfig.find(s => s.key === selectedSortOption)?.label || 'Newest Closed';

  // Export CSV Handler
  const handleExportCsv = () => {
    try {
      const rows = [
        ['Signal ID', 'Pair', 'Type', 'Status', 'Entry Price', 'Exit Price', 'Realized Pips', 'Holding Duration', 'Risk:Reward', 'Timeframe', 'Created At', 'Closed At', 'Confluence Score', 'Strategy Model']
      ];

      allClosedSignals.forEach(s => {
        const createdStr = s.createdAtMs ? new Date(s.createdAtMs).toISOString() : s.timestamp;
        const closedStr = s.closedAtMs ? new Date(s.closedAtMs).toISOString() : 'N/A';
        const durationStr = formatDurationCompact(getTradeDurationMs(s));
        rows.push([
          s.id,
          s.pair.symbol,
          s.type,
          s.status,
          String(s.entryPrice),
          String(s.currentPrice),
          String(s.pips ?? 0),
          durationStr,
          s.riskReward,
          s.timeframe,
          createdStr,
          closedStr,
          `${s.confluenceScore}%`,
          s.institutionalFlow || ''
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Forex_Closed_Trades_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // ignore
    }
  };

  // Quick helper for custom presets
  const applyPresetDays = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 3600 * 1000);
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);
    setTempStart(startIso);
    setTempEnd(endIso);
  };

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-2xl p-3 shadow-md space-y-2.5 relative z-40">
      {/* Top Header: Title + Retention & Export Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 text-[#2979FF] shrink-0" />
          <span className="text-[11px] font-black text-[#F1F5F9] uppercase tracking-wider truncate">
            Review Closed Timeframe:
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsRetentionModalOpen(true)}
            className="flex items-center gap-1 bg-[#182033] hover:bg-[#222F47] border border-[#222F47] px-2 py-1 rounded-lg text-[10px] font-bold text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
            title="Configure how long closed trades are kept in storage"
          >
            <Settings2 className="w-3 h-3 text-[#FFD700]" />
            <span className="hidden xs:inline">Keep: {retentionPolicy === 'ALL' ? 'Forever' : retentionPolicy}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={allClosedSignals.length === 0}
            className="flex items-center gap-1 bg-[#182033] hover:bg-[#222F47] border border-[#222F47] px-2 py-1 rounded-lg text-[10px] font-bold text-[#00E676] hover:text-white transition-colors disabled:opacity-40"
            title="Download CSV ledger of closed trades"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Second Row: Sort Dropdown Pinned Separately */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#222F47]/50">
        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Sort & Controls:</span>
        
        {/* Sort Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            className="flex items-center gap-1.5 bg-[#182033] hover:bg-[#222F47] border border-[#FFD700]/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#FFD700] transition-all cursor-pointer shadow-xs"
          >
            <ArrowUpDown className="w-3 h-3 text-[#FFD700] shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-none">Sort: {activeSortLabel}</span>
            <ChevronDown className="w-3 h-3 text-[#94A3B8] shrink-0" />
          </button>

          {isSortDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsSortDropdownOpen(false)}
              />
              <div className="absolute right-0 bottom-full mb-1.5 w-65 max-w-[calc(100vw-2rem)] bg-[#141B2D] border border-[#222F47] rounded-xl shadow-2xl z-50 py-1.5 divide-y divide-[#222F47]/60">
                <div className="px-3 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  Sort Closed Trades By
                </div>
                <div className="py-1">
                  {sortOptionsConfig.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        onChangeSortOption(opt.key);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between hover:bg-[#1e293b] transition-colors cursor-pointer ${
                        selectedSortOption === opt.key ? 'text-[#FFD700] font-black bg-[#1e293b]/50' : 'text-[#F1F5F9]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </span>
                      {selectedSortOption === opt.key && <Check className="w-3.5 h-3.5 text-[#FFD700]" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Time Range Selector Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {timePresets.map(preset => {
          const isSelected = selectedTimeRange === preset.key;
          return (
            <button
              key={preset.key}
              onClick={() => {
                onChangeTimeRange(preset.key);
                if (preset.key === 'CUSTOM') {
                  setIsCustomModalOpen(true);
                }
              }}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                isSelected
                  ? 'bg-[#2979FF] border-[#2979FF] text-white shadow-md shadow-[#2979FF]/20 font-black scale-[1.02]'
                  : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
              }`}
            >
              <span className="text-[11px]">{preset.icon}</span>
              <span className="truncate">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Row: Outcome Filter Pills */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-[#222F47]/65 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[10px] text-[#64748B] uppercase tracking-wider mr-1 hidden sm:inline shrink-0 font-bold">Result:</span>
        <button
          onClick={() => onChangeOutcome('ALL')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors border shrink-0 cursor-pointer ${
            selectedOutcome === 'ALL'
              ? 'bg-[#F1F5F9] border-[#F1F5F9] text-[#080B11] font-black'
              : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-white'
          }`}
        >
          All Outcomes
        </button>
        <button
          onClick={() => onChangeOutcome('WINS')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors border shrink-0 cursor-pointer ${
            selectedOutcome === 'WINS'
              ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676] font-black'
              : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#00E676]'
          }`}
        >
          🎯 Wins Only
        </button>
        <button
          onClick={() => onChangeOutcome('LOSSES')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors border shrink-0 cursor-pointer ${
            selectedOutcome === 'LOSSES'
              ? 'bg-[#FF3366]/20 border-[#FF3366] text-[#FF3366] font-black'
              : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#FF3366]'
          }`}
        >
          🛑 Losses Only
        </button>
      </div>

      {/* Active Time Filter Summary Note */}
      {selectedTimeRange === 'CUSTOM' && customStartDate && customEndDate && (
        <div className="flex items-center justify-between bg-[#080B11] border border-[#2979FF]/40 rounded-xl px-2.5 py-1 text-[11px] font-mono text-[#60A5FA]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#2979FF]" />
            <span>Range: {customStartDate} → {customEndDate}</span>
          </div>
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="text-[10px] font-bold text-[#FFD700] underline hover:text-white"
          >
            Edit Range
          </button>
        </div>
      )}

      {/* Custom Time Range Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#101522] border border-[#222F47] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#222F47]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2979FF]" />
                <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wider">
                  Custom Review Range
                </h3>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#182033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Shortcuts */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Quick Shortcuts:
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => applyPresetDays(1)}
                  className="bg-[#080B11] hover:bg-[#182033] border border-[#222F47] py-1 rounded-lg text-[#94A3B8] hover:text-white"
                >
                  Last 24h
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDays(2)}
                  className="bg-[#080B11] hover:bg-[#182033] border border-[#222F47] py-1 rounded-lg text-[#94A3B8] hover:text-white"
                >
                  Last 48h
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDays(7)}
                  className="bg-[#080B11] hover:bg-[#182033] border border-[#222F47] py-1 rounded-lg text-[#94A3B8] hover:text-white"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDays(30)}
                  className="bg-[#080B11] hover:bg-[#182033] border border-[#222F47] py-1 rounded-lg text-[#94A3B8] hover:text-white"
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={e => setTempStart(e.target.value)}
                  className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#2979FF]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={e => setTempEnd(e.target.value)}
                  className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#2979FF]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222F47]">
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[#222F47] text-xs font-bold text-[#94A3B8] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeCustomDates(tempStart, tempEnd);
                  onChangeTimeRange('CUSTOM');
                  setIsCustomModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#2979FF] hover:bg-[#2979FF]/90 text-white text-xs font-black shadow-md"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retention Settings Modal */}
      {isRetentionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#101522] border border-[#222F47] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#222F47]">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#FFD700]" />
                <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wider">
                  Closed Trades Retention
                </h3>
              </div>
              <button
                onClick={() => setIsRetentionModalOpen(false)}
                className="p-1 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#182033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Choose how long completed trades (Take Profit & Stop Loss hits) are stored in your local session ledger before cleanup.
            </p>

            <div className="space-y-1.5">
              {[
                { val: '24H', label: '24 Hours (Daily Session Only)', desc: 'Keeps only trades from the current 24-hour cycle' },
                { val: '48H', label: '48 Hours (2 Days)', desc: 'Review yesterday and today trades' },
                { val: '1W', label: '1 Week (7 Days)', desc: 'Full weekly performance review' },
                { val: '1M', label: '1 Month (30 Days)', desc: 'Monthly institutional review' },
                { val: '90D', label: '90 Days (Quarterly — Recommended)', desc: 'Full 3 months history retained locally' },
                { val: 'ALL', label: 'Permanent / All History', desc: 'Never auto-purge completed trade records' },
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => {
                    onChangeRetentionPolicy(item.val as any);
                    setIsRetentionModalOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start justify-between ${
                    retentionPolicy === item.val
                      ? 'bg-[#2979FF]/15 border-[#2979FF] text-white shadow-sm'
                      : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:border-[#2979FF]/40 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#F1F5F9]">{item.label}</div>
                    <div className="text-[10px] text-[#64748B]">{item.desc}</div>
                  </div>
                  {retentionPolicy === item.val && (
                    <Check className="w-4 h-4 text-[#2979FF] shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>

            {/* Clear History option */}
            {onClearClosedHistory && (
              <div className="pt-2 border-t border-[#222F47]/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear your closed trades history ledger? This cannot be undone.')) {
                      onClearClosedHistory();
                      setIsRetentionModalOpen(false);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#FF3366] hover:text-[#ff4d7d] font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Closed History</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
