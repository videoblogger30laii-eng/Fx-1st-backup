import {
  BacktestFilter,
  BacktestSummary,
  BacktestTrade,
  ConfluenceTierStats,
  StrategyType,
  Timeframe
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
   * Evaluates the selected strategy on historical candles.
   * Calculates true win rate and real equity curve without capping or artificial floors.
   */
  runBacktest(filter: BacktestFilter, customRealTrades?: BacktestTrade[]): BacktestSummary {
    const allTrades = customRealTrades && customRealTrades.length > 0
      ? customRealTrades
      : getAllRealOandaTrades(filter.strategy);

    const filtered = allTrades.filter(trade => {
      const matchTimeframe = !filter.timeframe || trade.timeframe === filter.timeframe;
      const matchConfluence = trade.confluenceScore >= filter.minConfluence;
      const matchPair = !filter.pairSymbol || trade.pairSymbol === filter.pairSymbol;
      const matchOutcome = !filter.outcomeFilter || trade.outcome === filter.outcomeFilter;
      return matchTimeframe && matchConfluence && matchPair && matchOutcome;
    });

    const total = filtered.length;
    const confluenceMatrix = this.generateConfluenceMatrix(filter.strategy, allTrades);

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
  generateConfluenceMatrix(strategy: StrategyType, trades: BacktestTrade[]): ConfluenceTierStats[] {
    const tiers: [number, string][] = [
      [90, '90%+ (Elite Confluence)'],
      [85, '85%+ (A+ Institutional)'],
      [80, '80%+ (High Probability)'],
      [70, '70%+ (All Valid Setups)']
    ];

    return tiers.map(([minScore, label]) => {
      const subset = trades.filter(t => t.confluenceScore >= minScore);
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
