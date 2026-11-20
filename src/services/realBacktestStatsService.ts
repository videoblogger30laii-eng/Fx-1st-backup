import { SignalQuality } from '../types';
import { REAL_OANDA_HISTORICAL_TRADES, OandaHistoricalTradeRecord } from './oandaHistoricalData';
import { PersistenceManager } from './persistence';

export interface RealHistoricalExample {
  id: string;
  pairSymbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: string;
  exitTime: string;
  pips: number;
  outcome: 'WIN' | 'LOSS';
  timeframe: string;
  rationale: string;
  source: 'OANDA_ARCHIVE' | 'USER_CLOSED_HISTORY';
}

export interface RealPairBacktestStats {
  pairSymbol: string;
  hasData: boolean;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winPct: number | null;
  grade: SignalQuality;
  sourceLabel: string;
  examples: RealHistoricalExample[];
}

function normalizeSymbol(symbol: string): string {
  return (symbol || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Returns 100% real historical backtest metrics for a currency pair or metal.
 * Queries ONLY:
 * 1. Verified historical archive (`REAL_OANDA_HISTORICAL_TRADES`)
 * 2. Real closed audited forward signals saved in `PersistenceManager`
 *
 * STRICT ANTI-FAKE RULE:
 * If `tradeCount === 0`, returns `hasData: false`, `winPct: null`, `grade: 'C'`,
 * `sourceLabel: 'NO BACKTEST DATA - 0 TRADES'`, and `examples: []`.
 * NEVER generates Win% from signal ID, confluence score, or invented twin examples.
 */
export function getRealPairBacktestStats(pairSymbol: string): RealPairBacktestStats {
  const normTarget = normalizeSymbol(pairSymbol);
  const examples: RealHistoricalExample[] = [];

  // 1. Query OANDA historical archive strictly matching this pair
  const archiveMatches: OandaHistoricalTradeRecord[] = REAL_OANDA_HISTORICAL_TRADES.filter(
    t => normalizeSymbol(t.pairSymbol) === normTarget
  );

  for (const t of archiveMatches) {
    examples.push({
      id: t.id,
      pairSymbol: t.pairSymbol,
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      stopLoss: t.stopLoss,
      takeProfit: t.takeProfit,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      pips: t.pips,
      outcome: t.outcome,
      timeframe: t.timeframe,
      rationale: t.rationale,
      source: 'OANDA_ARCHIVE'
    });
  }

  // 2. Query any real closed audited forward trades saved locally by the user
  try {
    const savedState = PersistenceManager.getSavedSignalsState();
    for (const item of Object.values(savedState)) {
      if (!item || !item.pair?.symbol) continue;
      if (normalizeSymbol(item.pair.symbol) !== normTarget) continue;
      if (item.status !== 'HIT_TP' && item.status !== 'HIT_SL') continue;
      if (!item.generationAudit) continue; // Only include signals backed by real generation audit

      const isWin = item.status === 'HIT_TP';
      examples.push({
        id: item.id,
        pairSymbol: item.pair.symbol,
        direction: item.type,
        entryPrice: item.entryPrice,
        exitPrice: item.currentPrice,
        stopLoss: item.stopLoss,
        takeProfit: item.takeProfit1,
        entryTime: item.createdAtFormatted || new Date(item.createdAtMs || Date.now()).toISOString(),
        exitTime: item.closedAtMs ? new Date(item.closedAtMs).toISOString() : 'Closed',
        pips: typeof item.pips === 'number' ? item.pips : 0,
        outcome: isWin ? 'WIN' : 'LOSS',
        timeframe: item.timeframe || 'H1',
        rationale: item.rationale || 'Live audited forward trade',
        source: 'USER_CLOSED_HISTORY'
      });
    }
  } catch {
    // safe fallback
  }

  const tradeCount = examples.length;
  if (tradeCount === 0) {
    return {
      pairSymbol,
      hasData: false,
      tradeCount: 0,
      winCount: 0,
      lossCount: 0,
      winPct: null,
      grade: 'C',
      sourceLabel: 'NO BACKTEST DATA - 0 TRADES',
      examples: []
    };
  }

  const winCount = examples.filter(e => e.outcome === 'WIN').length;
  const lossCount = tradeCount - winCount;
  const winPct = Math.round((winCount / tradeCount) * 1000) / 10;

  let grade: SignalQuality = 'C';
  if (tradeCount >= 5 && winPct >= 75) {
    grade = 'A_PLUS';
  } else if (tradeCount >= 3 && winPct >= 60) {
    grade = 'A';
  } else if (tradeCount >= 1 && winPct >= 50) {
    grade = 'B';
  } else {
    grade = 'C';
  }

  return {
    pairSymbol,
    hasData: true,
    tradeCount,
    winCount,
    lossCount,
    winPct,
    grade,
    sourceLabel: `REAL_BACKTEST_${tradeCount}_TRADES (${winCount}W/${lossCount}L)`,
    examples: examples.slice(0, 5)
  };
}
