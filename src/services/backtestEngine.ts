import {
  BacktestFilter,
  BacktestSummary,
  BacktestTrade,
  ConfluenceTierStats,
  StrategyType,
  Timeframe,
  AssetCategory,
  ForexSignal,
  getAssetCategory
} from '../types';
import { getAllRealOandaTrades } from './oandaHistoricalData';
import { RealCandleFetcherService, RealCandleFetchOptions, RealCandleFetchResult } from './realCandleFetcher';
import { StrategyBacktester } from './strategyBacktester';

export interface LiveBacktestExecutionResult {
  summary: BacktestSummary;
  candleResult: RealCandleFetchResult;
}

export const BacktestEngine = {
  /**
   * Converts closed live terminal signals (HIT_TP / HIT_SL) into BacktestTrade records
   * so the Backtesting Lab always reflects real-time live session TP and SL outcomes.
   */
  convertLiveSignalsToBacktestTrades(liveSignals: ForexSignal[], strategy: StrategyType): BacktestTrade[] {
    if (!Array.isArray(liveSignals) || liveSignals.length === 0) return [];

    return liveSignals
      .filter(sig => sig.status === 'HIT_TP' || sig.status === 'HIT_SL')
      .map(sig => {
        const isWin = sig.status === 'HIT_TP';
        const isBuy = sig.type.startsWith('BUY');
        const exitPrice = isWin ? sig.takeProfit1 : sig.stopLoss;
        const rawPips = Math.abs(sig.pips || 25);
        const signedPips = isWin ? rawPips : -rawPips;

        return {
          id: `LIVE-${sig.id}`,
          pairSymbol: sig.pair.symbol,
          strategy,
          direction: isBuy ? 'BUY' : 'SELL',
          entryPrice: sig.entryPrice,
          exitPrice,
          stopLoss: sig.stopLoss,
          takeProfit: sig.takeProfit1,
          entryTime: sig.timestamp || 'Live Session',
          exitTime: isWin ? 'Hit TP1 (Live Session)' : 'Hit SL (Live Session)',
          pips: signedPips,
          pnlPercent: isWin ? 1.5 : -1.0,
          outcome: isWin ? 'WIN' : 'LOSS',
          confluenceScore: sig.confluenceScore || 88,
          timeframe: sig.timeframe,
          riskRewardRatio: sig.riskReward || '1:2.5',
          session: sig.killzone || 'Live Terminal Session',
          rationale: `[📡 LIVE TERMINAL ${isWin ? 'TP1 WIN' : 'STOP LOSS HIT'}] ${sig.rationale}`
        } as BacktestTrade;
      });
  },

  /**
   * Evaluates the selected strategy on historical candles + live session closed signals.
   * Calculates true win rate and real equity curve without capping or artificial floors.
   */
  runBacktest(
    filter: BacktestFilter,
    customRealTrades?: BacktestTrade[],
    liveSignals?: ForexSignal[]
  ): BacktestSummary {
    const historicalTrades = customRealTrades && customRealTrades.length > 0
      ? customRealTrades
      : getAllRealOandaTrades(filter.strategy);

    const liveClosedTrades = liveSignals
      ? this.convertLiveSignalsToBacktestTrades(liveSignals, filter.strategy)
      : [];

    // Prepend live closed trades (HIT_TP and HIT_SL) so they appear first in the log and are counted in stats
    const allTrades = [...liveClosedTrades, ...historicalTrades];

    const filtered = allTrades.filter(trade => {
      const matchTimeframe = !filter.timeframe || trade.timeframe === filter.timeframe;
      const matchConfluence = trade.confluenceScore >= filter.minConfluence;
      const matchPair = !filter.pairSymbol || trade.pairSymbol === filter.pairSymbol;
      const matchOutcome = !filter.outcomeFilter || trade.outcome === filter.outcomeFilter;
      const matchCategory = !filter.category || filter.category === 'ALL' || getAssetCategory(trade.pairSymbol) === filter.category;
      return matchTimeframe && matchConfluence && matchPair && matchOutcome && matchCategory;
    });

    const total = filtered.length;
    const confluenceMatrix = this.generateConfluenceMatrix(filter.strategy, allTrades, filter.category);

    if (total === 0) {
      return {
        strategy: filter.strategy,
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        winRate: 0.0,
        totalPips: 0.0,
        profitFactor: 0.0,
        maxDrawdownPercent: 0.0,
        avgRiskReward: '1:1.5',
        netRoiPercent: 0.0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        avgWinPips: 0.0,
        avgLossPips: 0.0,
        equityCurve: [10000],
        confluenceMatrix,
        filteredTrades: []
      };
    }

    const wins = filtered.filter(t => t.outcome === 'WIN').length;
    const losses = total - wins;

    // TRUE WIN RATE - Pure mathematical calculation without capping or fake baseline
    const winRate = (wins / total) * 100.0;

    let totalWinPips = 0.0;
    let totalLossPips = 0.0;
    let totalPips = 0.0;

    // Real Equity Curve: Starting balance $10,000, risking fixed 1% ($100) per trade (1.5R payout)
    let currentBalance = 10000.0;
    let peakBalance = 10000.0;
    let maxDrawdown = 0.0;
    const equityCurve: number[] = [10000];

    let maxConsecutiveWins = 0;
    let currentStreakWins = 0;
    let maxConsecutiveLosses = 0;
    let currentStreakLosses = 0;

    filtered.forEach(trade => {
      totalPips += trade.pips;

      if (trade.outcome === 'WIN') {
        totalWinPips += Math.max(0, trade.pips);
        // Fixed 1.5R gain = +$150 on $100 risk
        currentBalance += 150.0;

        currentStreakWins++;
        if (currentStreakWins > maxConsecutiveWins) maxConsecutiveWins = currentStreakWins;
        currentStreakLosses = 0;
      } else {
        totalLossPips += Math.abs(trade.pips);
        // Fixed 1.0R loss = -$100 on $100 risk
        currentBalance -= 100.0;

        currentStreakLosses++;
        if (currentStreakLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentStreakLosses;
        currentStreakWins = 0;
      }

      if (currentBalance > peakBalance) {
        peakBalance = currentBalance;
      } else {
        const dd = ((peakBalance - currentBalance) / peakBalance) * 100.0;
        if (dd > maxDrawdown) maxDrawdown = dd;
      }
      equityCurve.push(Math.round(currentBalance));
    });

    const totalWinDollars = wins * 150.0;
    const totalLossDollars = losses * 100.0;
    const profitFactor = totalLossDollars > 0
      ? Math.round((totalWinDollars / totalLossDollars) * 100) / 100
      : (wins > 0 ? 3.0 : 0.0);

    const netRoi = ((currentBalance - 10000.0) / 10000.0) * 100.0;

    const avgWin = wins > 0 ? Math.round((totalWinPips / wins) * 10) / 10 : 0.0;
    const avgLoss = losses > 0 ? Math.round((totalLossPips / losses) * 10) / 10 : 0.0;

    return {
      strategy: filter.strategy,
      totalTrades: total,
      winTrades: wins,
      lossTrades: losses,
      winRate: Math.round(winRate * 10) / 10,
      totalPips: Math.round(totalPips * 10) / 10,
      profitFactor,
      maxDrawdownPercent: Math.round(maxDrawdown * 10) / 10,
      avgRiskReward: '1:1.5',
      netRoiPercent: Math.round(netRoi * 10) / 10,
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
      avgWinPips: avgWin,
      avgLossPips: avgLoss,
      equityCurve,
      confluenceMatrix,
      filteredTrades: filtered
    };
  },

  /**
   * Fetches real raw candles from Deriv / Twelve Data / Binance and executes the strategy on them
   */
  async fetchAndBacktest(
    fetchOptions: RealCandleFetchOptions,
    filter: BacktestFilter
  ): Promise<LiveBacktestExecutionResult> {
    const candleResult = await RealCandleFetcherService.fetchCandles(fetchOptions);
    const timeframe: Timeframe = fetchOptions.timeframe || filter.timeframe || 'M15';

    // Execute algorithmic strategy directly on the real downloaded candles
    const realTrades = StrategyBacktester.run(
      candleResult.candles,
      fetchOptions.symbol,
      filter.strategy,
      timeframe
    );

    const summary = this.runBacktest(
      { ...filter, timeframe, pairSymbol: fetchOptions.symbol },
      realTrades
    );

    return {
      summary,
      candleResult
    };
  },

  /**
   * Generates confluence matrix from real historical trades
   */
  generateConfluenceMatrix(strategy: StrategyType, trades: BacktestTrade[], category?: AssetCategory | null): ConfluenceTierStats[] {
    const tiers: [number, string][] = [
      [90, '90%+ (Elite Confluence)'],
      [85, '85%+ (A+ Institutional)'],
      [80, '80%+ (High Probability)'],
      [70, '70%+ (All Valid Setups)']
    ];

    return tiers.map(([minScore, label]) => {
      const subset = trades.filter(t => {
        const matchCategory = !category || category === 'ALL' || getAssetCategory(t.pairSymbol) === category;
        return t.confluenceScore >= minScore && matchCategory;
      });
      const count = subset.length;
      const wins = subset.filter(t => t.outcome === 'WIN').length;
      const losses = count - wins;
      const rate = count > 0 ? Math.round((wins / count) * 1000) / 10 : 0.0;
      const totalWinP = subset.filter(t => t.outcome === 'WIN').reduce((acc, t) => acc + t.pips, 0);
      const totalLossP = subset.filter(t => t.outcome === 'LOSS').reduce((acc, t) => acc + Math.abs(t.pips), 0);
      const pf = losses > 0
        ? Math.round(((wins * 150.0) / (losses * 100.0)) * 100) / 100
        : (wins > 0 ? 3.0 : 0.0);
      const netP = Math.round((totalWinP - totalLossP) * 10) / 10;

      return {
        minConfluence: minScore,
        label,
        winRate: rate,
        profitFactor: pf,
        totalTrades: count,
        avgRiskReward: '1:1.5',
        netPips: netP
      };
    });
  }
};
