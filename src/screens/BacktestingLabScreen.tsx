import React from 'react';
import { BacktestFilter, BacktestSummary, StrategyType, Timeframe, TradeOutcome, STRATEGY_CONFIGS } from '../types';
import { EquityCurveChart } from '../components/EquityCurveChart';
import { FlaskConical, TrendingUp, BarChart3, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  summary: BacktestSummary;
  filter: BacktestFilter;
  onStrategySelect: (strat: StrategyType) => void;
  onTimeframeSelect: (tf: Timeframe | null) => void;
  onConfluenceSelect: (score: number) => void;
  onPairSelect: (pair: string | null) => void;
  onOutcomeSelect: (outcome: TradeOutcome | null) => void;
}

export const BacktestingLabScreen: React.FC<Props> = ({
  summary,
  filter,
  onStrategySelect,
  onTimeframeSelect,
  onConfluenceSelect,
  onPairSelect,
  onOutcomeSelect
}) => {
  const timeframes: { tf: Timeframe | null; label: string }[] = [
    { tf: null, label: 'All TFs' },
    { tf: 'M15', label: 'M15' },
    { tf: 'H1', label: 'H1' },
    { tf: 'H4', label: 'H4' },
    { tf: 'D1', label: 'D1' },
  ];

  const confluenceTiers = [
    { score: 85, label: 'A+ VIP (85%+)' },
    { score: 90, label: 'Elite (90%+)' },
    { score: 80, label: 'A (80%+)' },
    { score: 70, label: 'All (70%+)' },
  ];

  const pairs = [
    { pair: null, label: 'All Pairs' },
    { pair: 'XAU/USD', label: 'Gold XAU' },
    { pair: 'EUR/USD', label: 'EUR/USD' },
    { pair: 'GBP/USD', label: 'GBP/USD' },
    { pair: 'USD/JPY', label: 'USD/JPY' },
    { pair: 'GBP/JPY', label: 'GBP/JPY' },
    { pair: 'US30', label: 'US30' },
  ];

  const outcomes: { outcome: TradeOutcome | null; label: string }[] = [
    { outcome: null, label: 'All Trades' },
    { outcome: 'WIN', label: 'Wins Only (✓)' },
    { outcome: 'LOSS', label: 'Losses Only (✕)' },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16 text-left">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-[#FFD700]" />
          <h2 className="text-lg font-black text-[#F1F5F9] uppercase tracking-wider">
            Quant Backtesting Lab
          </h2>
        </div>
        <p className="text-xs text-[#94A3B8]">
          Dynamic simulation engine with multi-timeframe & institutional confluence matrix
        </p>
      </div>

      {/* Strategy Selector Chips */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-[#64748B] font-bold uppercase">Select Strategy Model</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(Object.keys(STRATEGY_CONFIGS) as StrategyType[]).map(st => {
            const isSelected = filter.strategy === st;
            const config = STRATEGY_CONFIGS[st];
            return (
              <button
                key={st}
                onClick={() => onStrategySelect(st)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#182033] border-[#FFD700] text-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.1)]'
                    : 'bg-[#101522] border-[#222F47] text-[#94A3B8] hover:border-[#222F47]/80'
                }`}
              >
                <div className="text-xs font-bold text-[#F1F5F9] truncate">{config.title}</div>
                <div className="text-[10px] text-[#00E676] font-semibold mt-0.5">
                  {config.defaultWinRate}% Baseline Win Rate
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Matrix Card */}
      <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 space-y-3">
        {/* Timeframe Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-[#64748B] font-bold w-24 shrink-0">Timeframe:</span>
          <div className="flex gap-1.5">
            {timeframes.map(item => (
              <button
                key={item.label}
                onClick={() => onTimeframeSelect(item.tf)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all ${
                  filter.timeframe === item.tf
                    ? 'bg-[#2979FF] border-[#2979FF] text-[#F1F5F9]'
                    : 'bg-[#182033] border-[#222F47] text-[#94A3B8]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min Confluence Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-[#64748B] font-bold w-24 shrink-0">Min Confluence:</span>
          <div className="flex gap-1.5">
            {confluenceTiers.map(item => (
              <button
                key={item.score}
                onClick={() => onConfluenceSelect(item.score)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all ${
                  filter.minConfluence === item.score
                    ? 'bg-[#FFD700] border-[#FFD700] text-[#080B11]'
                    : 'bg-[#182033] border-[#222F47] text-[#94A3B8]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pair Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-[#64748B] font-bold w-24 shrink-0">Asset / Pair:</span>
          <div className="flex gap-1.5">
            {pairs.map(item => (
              <button
                key={item.label}
                onClick={() => onPairSelect(item.pair)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all ${
                  filter.pairSymbol === item.pair
                    ? 'bg-[#00E676] border-[#00E676] text-[#080B11]'
                    : 'bg-[#182033] border-[#222F47] text-[#94A3B8]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outcome Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-[#64748B] font-bold w-24 shrink-0">Outcome:</span>
          <div className="flex gap-1.5">
            {outcomes.map(item => (
              <button
                key={item.label}
                onClick={() => onOutcomeSelect(item.outcome)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all ${
                  filter.outcomeFilter === item.outcome
                    ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]'
                    : 'bg-[#182033] border-[#222F47] text-[#94A3B8]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Confluence Impact Table */}
      <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#FFD700] uppercase tracking-wider">
            Confluence Impact Analysis
          </span>
          <span className="text-[10px] text-[#64748B]">Click tier to apply</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] text-[#64748B] uppercase border-b border-[#222F47]">
                <th className="pb-1.5 font-bold">Confluence Tier</th>
                <th className="pb-1.5 font-bold">Win Rate</th>
                <th className="pb-1.5 font-bold">Profit Factor</th>
                <th className="pb-1.5 font-bold">Net Pips</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222F47]/50">
              {summary.confluenceMatrix.map(tier => {
                const isSelected = filter.minConfluence === tier.minConfluence;
                return (
                  <tr
                    key={tier.minConfluence}
                    onClick={() => onConfluenceSelect(tier.minConfluence)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#182033] font-bold text-[#FFD700]' : 'hover:bg-[#182033]/50'
                    }`}
                  >
                    <td className="py-2 text-[#F1F5F9]">{tier.label}</td>
                    <td className="py-2 text-[#00E676] font-mono">{tier.winRate}%</td>
                    <td className="py-2 text-[#F1F5F9] font-mono">{tier.profitFactor}</td>
                    <td
                      className={`py-2 font-mono ${
                        tier.netPips >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
                      }`}
                    >
                      {tier.netPips >= 0 ? `+${tier.netPips}` : tier.netPips}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3">
          <div className="text-[9px] text-[#64748B] uppercase font-bold">Win Rate</div>
          <div className="text-xl font-mono font-black text-[#00E676]">{summary.winRate}%</div>
          <div className="text-[9px] text-[#94A3B8]">{summary.winTrades}W / {summary.lossTrades}L ({summary.totalTrades} total)</div>
        </div>

        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3">
          <div className="text-[9px] text-[#64748B] uppercase font-bold">Profit Factor</div>
          <div className="text-xl font-mono font-black text-[#F1F5F9]">{summary.profitFactor}</div>
          <div className="text-[9px] text-[#94A3B8]">Gross Gain / Loss</div>
        </div>

        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3">
          <div className="text-[9px] text-[#64748B] uppercase font-bold">Total Pips</div>
          <div className={`text-xl font-mono font-black ${summary.totalPips >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
            {summary.totalPips >= 0 ? `+${summary.totalPips}` : summary.totalPips}
          </div>
          <div className="text-[9px] text-[#94A3B8]">Net pip yield</div>
        </div>

        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3">
          <div className="text-[9px] text-[#64748B] uppercase font-bold">Max Drawdown</div>
          <div className="text-xl font-mono font-black text-[#FF3366]">{summary.maxDrawdownPercent}%</div>
          <div className="text-[9px] text-[#94A3B8]">Peak-to-valley risk</div>
        </div>

        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3">
          <div className="text-[9px] text-[#64748B] uppercase font-bold">Avg Risk/Reward</div>
          <div className="text-xl font-mono font-black text-[#2979FF]">{summary.avgRiskReward}</div>
          <div className="text-[9px] text-[#94A3B8]">Target asymmetric R:R</div>
        </div>

        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3">
          <div className="text-[9px] text-[#64748B] uppercase font-bold">Estimated ROI</div>
          <div className="text-xl font-mono font-black text-[#00E676]">{summary.netRoiPercent}%</div>
          <div className="text-[9px] text-[#94A3B8]">Simulated return</div>
        </div>
      </div>

      {/* Equity Curve Graph */}
      <div>
        <div className="text-[10px] text-[#64748B] font-bold uppercase mb-1.5">
          Equity Growth Simulation ($10k Account)
        </div>
        <EquityCurveChart equityPoints={summary.equityCurve} />
      </div>

      {/* Trade Log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="font-bold text-[#64748B] uppercase tracking-wider">
            Historical Trade Log ({summary.filteredTrades.length} Trades)
          </span>
          <span className="text-[#94A3B8]">Filtered Results</span>
        </div>

        <div className="space-y-2">
          {summary.filteredTrades.map(trade => {
            const isWin = trade.outcome === 'WIN';
            return (
              <div
                key={trade.id}
                className="bg-[#101522] border border-[#222F47] rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#F1F5F9]">{trade.pairSymbol}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        trade.direction.startsWith('BUY')
                          ? 'bg-[#00E676]/15 text-[#00E676]'
                          : 'bg-[#FF3366]/15 text-[#FF3366]'
                      }`}
                    >
                      {trade.direction}
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">{trade.timeframe}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        isWin
                          ? 'bg-[#00E676]/20 text-[#00E676]'
                          : 'bg-[#FF3366]/20 text-[#FF3366]'
                      }`}
                    >
                      {isWin ? 'WIN' : 'LOSS'}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        trade.pips >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
                      }`}
                    >
                      {trade.pips >= 0 ? `+${trade.pips}p` : `${trade.pips}p`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#94A3B8] mb-1.5">{trade.rationale}</p>

                <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                  <span>Entry: {trade.entryPrice} → Exit: {trade.exitPrice}</span>
                  <span className="text-[#FFD700] font-bold">Confluence: {trade.confluenceScore}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
