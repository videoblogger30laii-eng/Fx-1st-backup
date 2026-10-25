import React from 'react';
import { ForexSignal } from '../types';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  CheckCircle2,
  XCircle,
  Scale,
  Zap,
  Flame,
  Clock,
  Timer,
  AlertTriangle,
  ShieldCheck,
  Hourglass,
  ArrowRight
} from 'lucide-react';
import { getTradeDurationMs, formatDurationCompact } from '../services/marketData';

interface Props {
  closedSignals: ForexSignal[];
  filteredCount?: number;
  searchQuery?: string;
  timeframeLabel?: string;
}

export const ClosedTradesSummaryWidget: React.FC<Props> = ({
  closedSignals,
  filteredCount,
  searchQuery,
  timeframeLabel
}) => {
  // Aggregate wins and losses
  const wins = closedSignals.filter(
    s => s.status === 'HIT_TP' || (s.pips ?? 0) > 0
  );
  const losses = closedSignals.filter(
    s => s.status === 'HIT_SL' || (s.pips ?? 0) < 0
  );

  const totalClosed = closedSignals.length;
  const winCount = wins.length;
  const lossCount = losses.length;

  const winRate = totalClosed > 0 ? Math.round((winCount / totalClosed) * 100 * 10) / 10 : 0;
  const lossRate = totalClosed > 0 ? Math.round((lossCount / totalClosed) * 100 * 10) / 10 : 0;

  // Win/Loss Ratio format (e.g. 2.0:1 or 1:1)
  const winLossRatio =
    lossCount === 0
      ? winCount > 0
        ? `${winCount}:0 (100%)`
        : '0:0'
      : `${(winCount / lossCount).toFixed(1)} : 1`;

  // Net realized pips
  const totalNetPips = closedSignals.reduce((acc, s) => acc + (s.pips ?? 0), 0);
  const winPips = wins.reduce((acc, s) => acc + Math.max(0, s.pips ?? 0), 0);
  const lossPips = losses.reduce((acc, s) => acc + Math.abs(Math.min(0, s.pips ?? 0)), 0);

  // Profit factor
  const profitFactor =
    lossPips > 0
      ? (winPips / lossPips).toFixed(2)
      : winPips > 0
      ? 'MAX'
      : '1.00';

  // Trade Duration Calculations (Mean time elapsed between trade opening and closing)
  const durations = closedSignals.map(getTradeDurationMs);
  const totalDurationMs = durations.reduce((acc, d) => acc + d, 0);
  const avgDurationMs = totalClosed > 0 ? totalDurationMs / totalClosed : 0;
  const formattedAvgDuration = formatDurationCompact(avgDurationMs);

  const winDurations = wins.map(getTradeDurationMs);
  const avgWinDurationMs = winCount > 0 ? winDurations.reduce((acc, d) => acc + d, 0) / winCount : 0;
  const formattedAvgWinDuration = formatDurationCompact(avgWinDurationMs);

  const lossDurations = losses.map(getTradeDurationMs);
  const avgLossDurationMs = lossCount > 0 ? lossDurations.reduce((acc, d) => acc + d, 0) / lossCount : 0;
  const formattedAvgLossDuration = formatDurationCompact(avgLossDurationMs);

  // Trades held longer than 24 hours (multi-day exposure / potential swap cost)
  const overheldTrades = closedSignals.filter(s => getTradeDurationMs(s) > 24 * 3600 * 1000);
  const overheldCount = overheldTrades.length;
  const overheldPct = totalClosed > 0 ? Math.round((overheldCount / totalClosed) * 100) : 0;

  // Holding Pace Diagnosis & Risk Assessment
  let holdingCategory: 'FAST_INTRADAY' | 'OPTIMAL_SESSION' | 'FULL_SESSION' | 'OVERHELD_SWING' = 'OPTIMAL_SESSION';
  let holdingBadge = '✅ Optimal (2-8h)';
  let holdingColor = 'text-[#2979FF] bg-[#2979FF]/15 border-[#2979FF]/40';
  let holdingTitle = 'Optimal Institutional Pace';
  let holdingAdvice = 'Setups tap target Order Blocks cleanly within 1-2 sessions with minimal swap fee exposure.';
  let isHoldingTooLong = false;

  if (avgDurationMs < 2 * 3600 * 1000) {
    holdingCategory = 'FAST_INTRADAY';
    holdingBadge = '⚡ Fast Intraday (<2h)';
    holdingColor = 'text-[#00E676] bg-[#00E676]/15 border-[#00E676]/40';
    holdingTitle = 'Swift Scalp / Intraday Execution';
    holdingAdvice = 'Disciplined quick exits during active session killzones. Zero overnight rollover swap exposure.';
  } else if (avgDurationMs <= 8 * 3600 * 1000) {
    holdingCategory = 'OPTIMAL_SESSION';
    holdingBadge = '✅ Optimal (2-8h)';
    holdingColor = 'text-[#2979FF] bg-[#2979FF]/15 border-[#2979FF]/40';
    holdingTitle = 'Healthy Session Holding Pace';
    holdingAdvice = 'Well-calibrated trade duration. Targets reached within standard London/NY session overlap.';
  } else if (avgDurationMs <= 24 * 3600 * 1000) {
    holdingCategory = 'FULL_SESSION';
    holdingBadge = '⏱️ Session (8-24h)';
    holdingColor = 'text-[#FFD700] bg-[#FFD700]/15 border-[#FFD700]/40';
    holdingTitle = 'Extended Full Session Hold';
    holdingAdvice = 'Spanning multiple session turnovers. Watch for widening broker spreads at the daily rollover.';
  } else {
    holdingCategory = 'OVERHELD_SWING';
    holdingBadge = '⚠️ Multi-Day (>24h)';
    holdingColor = 'text-[#FF9100] bg-[#FF9100]/15 border-[#FF9100]/40';
    holdingTitle = 'Holding Too Long / Swing Risk';
    holdingAdvice = 'Holding positions multi-day incurs overnight broker financing (swap) fees and weekend gap risk. Lock Stop Loss at Break-Even sooner.';
    isHoldingTooLong = true;
  }

  // Max count for vertical bar scaling
  const maxBarCount = Math.max(winCount, lossCount, 1);
  const winBarHeightPercent = Math.max(12, Math.round((winCount / maxBarCount) * 100));
  const lossBarHeightPercent = Math.max(12, Math.round((lossCount / maxBarCount) * 100));

  return (
    <div className="bg-[#101522] border border-[#222F47] hover:border-[#222F47]/90 rounded-2xl p-4 shadow-lg space-y-3.5 transition-all">
      {/* Header Strip */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[#222F47]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2979FF]/15 border border-[#2979FF]/30 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[#2979FF]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#F1F5F9] uppercase tracking-wide">
                Closed Trades Performance
              </span>
              <span className="text-[10px] font-mono font-bold text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.2 rounded border border-[#FFD700]/25">
                {totalClosed} {totalClosed === 1 ? 'Trade' : 'Trades'}
              </span>
              {timeframeLabel && (
                <span className="text-[10px] font-mono font-bold text-[#60A5FA] bg-[#2979FF]/10 px-1.5 py-0.2 rounded border border-[#2979FF]/25">
                  ⏱️ {timeframeLabel}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#64748B]">
              Realized outcomes from institutional TP & SL terminal hits
            </p>
          </div>
        </div>

        {/* Win Rate Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black font-mono shadow-sm ${
              winRate >= 50
                ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                : winRate > 0
                ? 'bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]'
                : 'bg-[#FF3366]/15 border-[#FF3366]/40 text-[#FF3366]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{winRate}% WIN RATE</span>
          </div>
        </div>
      </div>

      {totalClosed === 0 ? (
        <div className="py-6 text-center space-y-1 bg-[#080B11] rounded-xl border border-[#222F47]/60">
          <p className="text-xs font-bold text-[#F1F5F9]">No Closed Trades Yet</p>
          <p className="text-[11px] text-[#64748B] max-w-sm mx-auto">
            Once orders reach their Target Take Profit or Stop Loss, their Win/Loss ratio and pip distribution will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Main Visual: Horizontal Win / Loss Proportional Bar Chart */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 font-bold text-[#00E676]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Wins: {winCount} ({winRate}%)</span>
              </span>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                Ratio: <span className="text-[#FFD700] font-black">{winLossRatio}</span>
              </span>
              <span className="flex items-center gap-1 font-bold text-[#FF3366]">
                <span>Losses: {lossCount} ({lossRate}%)</span>
                <XCircle className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Segmented Dual Bar Chart */}
            <div className="relative w-full h-4 bg-[#080B11] rounded-full overflow-hidden border border-[#222F47] flex shadow-inner">
              {/* Winning Segment */}
              <div
                className="h-full bg-gradient-to-r from-[#00C853] to-[#00E676] transition-all duration-700 relative group flex items-center justify-center text-[9px] font-black text-[#080B11]"
                style={{ width: `${winRate}%` }}
                title={`${winCount} Winning Trades (${winRate}%)`}
              >
                {winRate >= 18 && (
                  <span className="drop-shadow-xs truncate px-1">
                    {winRate}% W
                  </span>
                )}
              </div>

              {/* Losing Segment */}
              <div
                className="h-full bg-gradient-to-r from-[#FF3366] to-[#D50032] transition-all duration-700 relative group flex items-center justify-center text-[9px] font-black text-white"
                style={{ width: `${lossRate}%` }}
                title={`${lossCount} Losing Trades (${lossRate}%)`}
              >
                {lossRate >= 18 && (
                  <span className="drop-shadow-xs truncate px-1">
                    {lossRate}% L
                  </span>
                )}
              </div>

              {/* 50% Benchmark Marker */}
              <div
                className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/40 pointer-events-none z-10"
                title="50% Break-Even Benchmark"
              />
            </div>

            {/* 50% Guideline label */}
            <div className="flex justify-between text-[9px] text-[#64748B] font-mono px-0.5">
              <span>0%</span>
              <span className="text-[#94A3B8]">▲ 50% Baseline</span>
              <span>100%</span>
            </div>
          </div>

          {/* Comparative Win vs Loss Columns & Stat Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            {/* Visual Bar Comparison Columns (Left 5 Cols on desktop) */}
            <div className="sm:col-span-5 bg-[#080B11] rounded-xl border border-[#222F47] p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                <span>Outcome Volume</span>
                <span className="text-[#FFD700] font-mono">{winCount}W vs {lossCount}L</span>
              </div>

              {/* Vertical Side-by-Side Dual Bars */}
              <div className="h-20 flex items-end justify-around gap-3 px-2 pt-2 pb-1 border-b border-[#222F47]/60">
                {/* Wins Column Bar */}
                <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-mono font-bold text-[#00E676]">
                    +{winPips.toFixed(0)}p
                  </span>
                  <div
                    className="w-full max-w-[42px] bg-gradient-to-t from-[#00C853] to-[#00E676] rounded-t-md transition-all duration-500 shadow-[0_0_10px_rgba(0,230,118,0.25)] flex items-center justify-center"
                    style={{ height: `${winBarHeightPercent}%` }}
                  >
                    <span className="text-[9px] font-black text-[#080B11] drop-shadow-xs">
                      {winCount}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#00E676] uppercase">Wins</span>
                </div>

                {/* Losses Column Bar */}
                <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-mono font-bold text-[#FF3366]">
                    -{lossPips.toFixed(0)}p
                  </span>
                  <div
                    className="w-full max-w-[42px] bg-gradient-to-t from-[#D50032] to-[#FF3366] rounded-t-md transition-all duration-500 shadow-[0_0_10px_rgba(255,51,102,0.25)] flex items-center justify-center"
                    style={{ height: `${lossBarHeightPercent}%` }}
                  >
                    <span className="text-[9px] font-black text-white drop-shadow-xs">
                      {lossCount}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#FF3366] uppercase">Losses</span>
                </div>
              </div>

              {/* Volume Footnote */}
              <div className="pt-1.5 flex items-center justify-between text-[9px] text-[#94A3B8] font-mono">
                <span>Profit Factor:</span>
                <span className="font-bold text-[#F1F5F9]">{profitFactor}</span>
              </div>
            </div>

            {/* 4 Metric Summary Tiles (Right 7 Cols on desktop: Net Pips, W/L Ratio, Avg Duration, Plan R:R) */}
            <div className="sm:col-span-7 grid grid-cols-2 gap-2">
              {/* Tile 1: Net Realized Pips */}
              <div className="bg-[#080B11] rounded-xl border border-[#222F47] p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#64748B] uppercase tracking-wider">
                    Net Pips
                  </span>
                  {totalNetPips >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-[#00E676]" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-[#FF3366]" />
                  )}
                </div>
                <div className="my-1">
                  <div
                    className={`text-base font-black font-mono leading-none ${
                      totalNetPips >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
                    }`}
                  >
                    {totalNetPips > 0 ? `+${totalNetPips.toFixed(1)}` : totalNetPips.toFixed(1)}p
                  </div>
                </div>
                <div className="text-[9px] text-[#94A3B8] font-mono">
                  Realized Gain
                </div>
              </div>

              {/* Tile 2: Win/Loss Ratio */}
              <div className="bg-[#080B11] rounded-xl border border-[#222F47] p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#64748B] uppercase tracking-wider">
                    W/L Ratio
                  </span>
                  <Scale className="w-3.5 h-3.5 text-[#FFD700]" />
                </div>
                <div className="my-1">
                  <div className="text-base font-black font-mono text-[#FFD700] leading-none">
                    {winLossRatio}
                  </div>
                </div>
                <div className="text-[9px] text-[#94A3B8] font-mono">
                  {winCount}W / {lossCount}L
                </div>
              </div>

              {/* Tile 3: Average Trade Duration (Mean time elapsed between trade open & close) */}
              <div className="bg-[#080B11] rounded-xl border border-[#222F47] p-2.5 flex flex-col justify-between hover:border-[#2979FF]/50 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                    <span>Avg Duration</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#2979FF]" />
                  </div>
                </div>
                <div className="my-1">
                  <div className="text-base font-black font-mono text-[#F1F5F9] leading-none flex items-baseline gap-1">
                    <span>{formattedAvgDuration}</span>
                    <span className="text-[9px] text-[#64748B] font-mono font-normal">mean</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 overflow-hidden">
                  <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded border truncate ${holdingColor}`}>
                    {holdingBadge}
                  </span>
                  <span className="text-[9px] text-[#94A3B8] font-mono shrink-0">
                    {totalClosed} closed
                  </span>
                </div>
              </div>

              {/* Tile 4: Avg Risk/Reward */}
              <div className="bg-[#080B11] rounded-xl border border-[#222F47] p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#64748B] uppercase tracking-wider">
                    Plan R:R
                  </span>
                  <Zap className="w-3.5 h-3.5 text-[#2979FF]" />
                </div>
                <div className="my-1">
                  <div className="text-base font-black font-mono text-[#2979FF] leading-none">
                    1:2.6
                  </div>
                </div>
                <div className="text-[9px] text-[#94A3B8] font-mono">
                  Institutional
                </div>
              </div>
            </div>
          </div>

          {/* Trade Duration Diagnostic & Holding Risk Insight (Helping users understand if holding too long) */}
          <div className="bg-[#080B11] rounded-xl border border-[#222F47] p-3 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#222F47]/60">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#2979FF]/15 border border-[#2979FF]/30 flex items-center justify-center">
                  <Timer className="w-3.5 h-3.5 text-[#2979FF]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-[#F1F5F9] uppercase tracking-wide">
                      Average Trade Duration Diagnostic
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${holdingColor}`}>
                      {holdingBadge}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B]">
                    Holding time analysis — monitors if you are holding positions too long
                  </p>
                </div>
              </div>

              {/* Overholding Warning Badge */}
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                {isHoldingTooLong ? (
                  <span className="flex items-center gap-1 text-[#FF9100] bg-[#FF9100]/15 border border-[#FF9100]/30 px-2 py-0.5 rounded-lg">
                    <AlertTriangle className="w-3 h-3 text-[#FF9100]" />
                    <span>HOLDING TOO LONG ({overheldCount} of {totalClosed} over 24H)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-2 py-0.5 rounded-lg">
                    <ShieldCheck className="w-3 h-3 text-[#00E676]" />
                    <span>DISCIPLINED HOLDING ({overheldCount === 0 ? '0%' : `${overheldPct}%`} MULTI-DAY)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Diagnostic Breakdown Grid: Winner vs Loser Hold Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-[#101522] border border-[#222F47] rounded-lg p-2.5">
                <span className="text-[9.5px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Overall Mean Duration
                </span>
                <span className="text-sm font-black font-mono text-[#F1F5F9] mt-0.5 block">
                  {formattedAvgDuration}
                </span>
                <span className="text-[9px] text-[#94A3B8] font-mono mt-0.5 block">
                  All {totalClosed} closed setups
                </span>
              </div>

              <div className="bg-[#101522] border border-[#222F47] rounded-lg p-2.5">
                <span className="text-[9.5px] font-bold text-[#00E676] uppercase tracking-wider block flex items-center justify-between">
                  <span>Winners Avg Hold</span>
                  <span>🏆</span>
                </span>
                <span className="text-sm font-black font-mono text-[#00E676] mt-0.5 block">
                  {winCount > 0 ? formattedAvgWinDuration : 'N/A'}
                </span>
                <span className="text-[9px] text-[#94A3B8] font-mono mt-0.5 block">
                  {winCount} winning trades
                </span>
              </div>

              <div className="bg-[#101522] border border-[#222F47] rounded-lg p-2.5">
                <span className="text-[9.5px] font-bold text-[#FF3366] uppercase tracking-wider block flex items-center justify-between">
                  <span>Losses Avg Hold</span>
                  <span>🛑</span>
                </span>
                <span className="text-sm font-black font-mono text-[#FF3366] mt-0.5 block">
                  {lossCount > 0 ? formattedAvgLossDuration : 'N/A'}
                </span>
                <span className="text-[9px] text-[#94A3B8] font-mono mt-0.5 block">
                  {lossCount} losing trades
                </span>
              </div>
            </div>

            {/* Holding Advice & Guidance Banner */}
            <div className={`rounded-xl p-2.5 border text-[10.5px] flex items-start gap-2.5 ${
              isHoldingTooLong
                ? 'bg-[#FF9100]/10 border-[#FF9100]/30 text-[#F1F5F9]'
                : 'bg-[#101522] border-[#222F47] text-[#94A3B8]'
            }`}>
              {isHoldingTooLong ? (
                <AlertTriangle className="w-4 h-4 text-[#FF9100] shrink-0 mt-0.5" />
              ) : (
                <Hourglass className="w-4 h-4 text-[#2979FF] shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                <div className="font-bold text-[#F1F5F9] flex items-center gap-2">
                  <span>{holdingTitle}</span>
                  <span className="text-[10px] text-[#64748B] font-normal font-mono">• {overheldCount} of {totalClosed} held over 24h</span>
                </div>
                <div className="text-[10px] leading-relaxed">
                  {holdingAdvice}
                </div>
                {lossCount > 0 && winCount > 0 && (
                  <div className="text-[9.5px] font-mono text-[#60A5FA] pt-0.5">
                    {avgLossDurationMs <= avgWinDurationMs
                      ? '✓ Positive Discipline: Losses cut faster than winning runs ("Cut losses short, let winners run").'
                      : '⚠️ Holding Insight: Losing trades are taking longer to exit than winners. Respect Stop Loss invalidations promptly.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Micro Trade Result Ledger Sparkline */}
          <div className="pt-1 border-t border-[#222F47]/40 space-y-1">
            <div className="flex items-center justify-between text-[9.5px] text-[#64748B] font-bold uppercase tracking-wider">
              <span>Closed Trade Ledger Sequence:</span>
              <span className="text-[#94A3B8] font-mono font-normal">
                {closedSignals.length} closed {closedSignals.length === 1 ? 'setup' : 'setups'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {closedSignals.map((sig, idx) => {
                const isWin = sig.status === 'HIT_TP' || (sig.pips ?? 0) > 0;
                const pipVal = sig.pips ?? 0;
                const formattedPips = pipVal > 0 ? `+${pipVal}p` : `${pipVal}p`;

                return (
                  <div
                    key={`${sig.id}-${sig.closedAtMs || idx}`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                      isWin
                        ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]'
                        : 'bg-[#FF3366]/10 border-[#FF3366]/30 text-[#FF3366]'
                    }`}
                    title={`${sig.pair.symbol} (${sig.type}) ${sig.status}: ${formattedPips} at ${sig.timeframe}`}
                  >
                    <span className="text-[9px]">{isWin ? '✓' : '✕'}</span>
                    <span className="text-[#F1F5F9] font-sans font-semibold">{sig.pair.symbol}</span>
                    <span>{formattedPips}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
