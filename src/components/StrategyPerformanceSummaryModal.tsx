import React, { useMemo } from 'react';
import { StrategyType, STRATEGY_CONFIGS, BacktestTrade } from '../types';
import { BacktestEngine } from '../services/backtestEngine';
import { X, BarChart3, Award, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trades?: any[];
}

export const StrategyPerformanceSummaryModal: React.FC<Props> = ({ isOpen, onClose, trades = [] }) => {
  const allStrategies: StrategyType[] = [
    'GOLD_HUNTER',
    'LONDON_KILLER',
    'TREND_RIDER'
  ];

  const minCutoff = useMemo(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('fx_min_score_cutoff') === '80' ? 80 : 70;
    } catch {
      return 70;
    }
  }, [isOpen]);

  const realStatsByStrategy = useMemo(() => {
    const backtestTrades: BacktestTrade[] | undefined =
      Array.isArray(trades) && trades.length > 0 && 'pairSymbol' in trades[0] && 'strategy' in trades[0]
        ? (trades as BacktestTrade[])
        : undefined;

    const cached = BacktestEngine.getCachedPortfolioStats();
    const comparisons = BacktestEngine.compareAllStrategies(
      {
        strategy: 'ALL_STRATEGIES',
        timeframe: null,
        minConfluence: minCutoff,
        pairSymbol: null,
        outcomeFilter: null
      },
      undefined,
      backtestTrades ?? (cached.trades.length > 0 ? cached.trades : undefined)
    );

    const map = new Map<StrategyType, (typeof comparisons)[number]>();
    comparisons.forEach(c => map.set(c.strategy, c));
    return map;
  }, [trades, minCutoff, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn text-left">
      <div className="bg-[#0D111C] border border-[#222F47] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2979FF]/20 border border-[#2979FF]/40 flex items-center justify-center text-[#2979FF]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wide">
                  Strategy Win/Loss Ratios & SL Hit Diagnostics
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-[#2979FF]/20 border border-[#2979FF]/40 text-[#2979FF] text-[9.5px] font-bold">
                  CUTOFF ≥{minCutoff}%
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Real calculated win rates, realized risk-to-reward ratios, and expectancy from verified trades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Section 1: Primary Causes for SL Hits */}
          <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#FF3366] uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4" />
              <span>Primary Causes for Stop-Loss Hits & 6-Gate Mitigations</span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Structural failure modes monitored by the H4 9/50 EMA trend filter and 6-Gate Quantitative Risk Shield:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-[#090d16] rounded-xl border border-[#222F47]">
                <div className="flex items-center justify-between font-bold text-[#F1F5F9] mb-1">
                  <span>1. Volatility Spike / Stop-Hunt Wick</span>
                  <span className="text-[#FF3366] font-mono">ATR Shield</span>
                </div>
                <p className="text-[10.5px] text-[#94A3B8]">
                  Rapid interbank liquidity grab wick piercing structural Order Block before trend continuation.
                </p>
              </div>

              <div className="p-3 bg-[#090d16] rounded-xl border border-[#222F47]">
                <div className="flex items-center justify-between font-bold text-[#F1F5F9] mb-1">
                  <span>2. Against Macro Trend Reversal</span>
                  <span className="text-[#FF3366] font-mono">H4 9/50 + D1</span>
                </div>
                <p className="text-[10.5px] text-[#94A3B8]">
                  Counter-trend pullback signals blocked whenever H4 9/50 EMA or D1 200 EMA slope opposes direction.
                </p>
              </div>

              <div className="p-3 bg-[#090d16] rounded-xl border border-[#222F47]">
                <div className="flex items-center justify-between font-bold text-[#F1F5F9] mb-1">
                  <span>3. Retracement Pullback After TP1</span>
                  <span className="text-[#FFD700] font-mono">Auto BE +1p</span>
                </div>
                <p className="text-[10.5px] text-[#94A3B8]">
                  Moving stop loss to breakeven (+1.0p) after TP1 prevents reversals from turning winners into full -1R losses.
                </p>
              </div>

              <div className="p-3 bg-[#090d16] rounded-xl border border-[#222F47]">
                <div className="flex items-center justify-between font-bold text-[#F1F5F9] mb-1">
                  <span>4. Spread Widening / Session Rollover</span>
                  <span className="text-[#FF3366] font-mono">21-23 UTC</span>
                </div>
                <p className="text-[10.5px] text-[#94A3B8]">
                  Spread expansion during NY rollover (21:00–23:00 UTC) and red-folder CPI/FOMC news filtered out.
                </p>
              </div>

              <div className="p-3 bg-[#00E676]/10 border border-[#00E676]/40 rounded-xl space-y-1.5 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00E676] uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                  <span>Adaptive Anti-Loss Solutions (H4 9/50 EMA + Real MTF Confluence)</span>
                </div>
                <div className="text-[10.5px] text-[#CBD5E1] leading-relaxed space-y-1">
                  <p>• <strong>H4 9/50 EMA Trend Filter:</strong> Enforces bullish alignment (close &gt; 50 EMA &amp; close &gt; 9 EMA) or bearish alignment before signal formation.</p>
                  <p>• <strong>Real 5-Factor Confluence ({minCutoff}+ Cutoff):</strong> Scores H4 (30) + H1/M15 (25) + Momentum (20) + D1/Liq (15) + ATR (10) dynamically on live &amp; historical OHLC bars.</p>
                  <p>• <strong>News &amp; Volatility Shield:</strong> Suppresses entries during red-folder news windows and rollover spread spikes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 3 Strategies Real Calculated Win/Loss Ratios & Expectancy */}
          <div className="space-y-3">
            <div className="text-xs font-black text-[#F1F5F9] uppercase tracking-wide flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00E676]" />
              <span>3 Institutional Strategies: Real Backtested Ratios (≥{minCutoff}% Confluence)</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {allStrategies.map(strat => {
                const config = STRATEGY_CONFIGS[strat];
                const stat = realStatsByStrategy.get(strat);
                const totalTrades = stat ? stat.totalTrades : 0;
                const winRate = stat && totalTrades > 0 ? stat.winRate : 0.0;
                const lossRate = totalTrades > 0 ? Math.round((100 - winRate) * 10) / 10 : 0.0;
                const realizedRrRatio =
                  stat && stat.avgLossPips > 0
                    ? `1:${(stat.avgWinPips / stat.avgLossPips).toFixed(2)}`
                    : stat?.spec.targetRR || '1:2.60';
                const expR = stat && totalTrades > 0 ? stat.expectancyR : 0.0;

                return (
                  <div
                    key={strat}
                    className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#F1F5F9] font-sans">{config.title}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#2979FF]/20 text-[#2979FF] text-[9.5px] font-bold">
                          {config.shortBadge}
                        </span>
                        <span className="text-[9.5px] text-[#94A3B8]">
                          ({totalTrades}T: {stat?.winTrades || 0}W-{stat?.lossTrades || 0}L)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
                        {config.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-[#222F47]">
                      <div className="text-center">
                        <div className="text-[10px] text-[#64748B] uppercase">Win / Loss</div>
                        <div className={`font-bold ${totalTrades > 0 ? 'text-[#00E676]' : 'text-[#64748B]'}`}>
                          {winRate.toFixed(1)}% / {lossRate.toFixed(1)}%
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-[10px] text-[#64748B] uppercase">Realized R:R</div>
                        <div className="text-[#FFD700] font-bold">{realizedRrRatio}</div>
                      </div>

                      <div className="text-center">
                        <div className="text-[10px] text-[#64748B] uppercase">Expectancy</div>
                        <div className={`font-bold ${expR >= 0 ? 'text-[#2979FF]' : 'text-[#FF3366]'}`}>
                          {expR >= 0 ? `+${expR.toFixed(2)}R` : `${expR.toFixed(2)}R`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] flex justify-between items-center">
          <span className="text-[11px] text-[#94A3B8]">
            Unified across Signals, Backtesting Lab, and Trade Journal
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-[#080B11] bg-[#00E676] hover:bg-[#00E676]/90 transition-all cursor-pointer shadow-md"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};
