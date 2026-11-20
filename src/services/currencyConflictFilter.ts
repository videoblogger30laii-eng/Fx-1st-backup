import { ForexSignal, extractCurrenciesFromSymbol } from '../types';

export type CurrencyBiasDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type ConflictFilterMode = 'STRICT' | 'WARNING';

export const TRACKED_CONFLICT_CURRENCIES = [
  'EUR',
  'GBP',
  'USD',
  'JPY',
  'CHF',
  'AUD',
  'CAD',
  'NZD',
  'XAU',
] as const;

export interface CurrencyBiasVote {
  pairSymbol: string;
  signalId: string;
  signalDirection: 'BUY' | 'SELL'; // Signal's own direction (BUY/SELL)
  currencyAction: 'BUY' | 'SELL';  // Implied action on this currency
  pairLabel: string;               // e.g. "EUR/USD BUY"
}

export interface CurrencyBiasInfo {
  currency: string;        // Canonical code e.g. EUR, USD, XAU
  displayName: string;     // Display label e.g. EUR, USD, GOLD
  bias: CurrencyBiasDirection;
  isLocked: boolean;
  buyCount: number;
  sellCount: number;
  buyPairs: string[];      // e.g. ["EUR/USD BUY", "EUR/JPY BUY"]
  sellPairs: string[];     // e.g. ["EUR/CHF SELL"]
  votes: CurrencyBiasVote[];
}

export interface CurrencyConflictDetail {
  currency: string;
  displayName: string;
  lockedBias: CurrencyBiasDirection;
  signalDirection: 'BUY' | 'SELL'; // Implied direction for this currency in this signal
  supportingPairs: string[];       // Pairs establishing the opposing bias
}

export interface SignalConflictEvaluation {
  signalId: string;
  pairSymbol: string;
  signalDirection: 'BUY' | 'SELL';
  baseCurrency: string;
  quoteCurrency: string;
  baseDisplay: string;
  quoteDisplay: string;
  baseImpliedAction: 'BUY' | 'SELL';
  quoteImpliedAction: 'BUY' | 'SELL';
  isConflict: boolean;
  conflicts: CurrencyConflictDetail[];
  warningBannerText: string | null;   // WARNING mode red top banner
  warningBadgeText: string | null;    // WARNING mode red badge
  strictHiddenReason: string | null;  // STRICT mode simple-English hidden reason
  cleanBadgeText: string;             // Clean signal green badge
}

export interface CurrencyConflictAnalysisResult {
  biasMap: Record<string, CurrencyBiasInfo>;
  evaluationsById: Record<string, SignalConflictEvaluation>;
  cleanCount: number;
  conflictCount: number;
}

export function normalizeCurrencyCode(raw: string): string {
  const upper = (raw || '').trim().toUpperCase();
  if (upper === 'GOLD') return 'XAU';
  if (upper === 'SILVER') return 'XAG';
  return upper;
}

export function getCurrencyDisplayName(code: string): string {
  const norm = normalizeCurrencyCode(code);
  if (norm === 'XAU') return 'GOLD';
  if (norm === 'XAG') return 'SILVER';
  return norm;
}

function formatNaturalList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function stripDirectionFromPairLabel(pairLabel: string): string {
  return pairLabel.replace(/\s+(BUY|SELL)$/i, '').trim();
}

/**
 * Deduplicates signals so each pair contributes at most 1 signal to currency bias calculation
 * (same priority order as App.tsx uniquePairSignals: Best Trade Now > A+ > confluenceScore > winProbability).
 */
export function deduplicateSignalsPerPair(signals: ForexSignal[]): ForexSignal[] {
  const bestByPair = new Map<string, ForexSignal>();
  for (const sig of signals) {
    const sym = (sig.pair?.symbol || '').toUpperCase();
    if (!sym) continue;
    const existing = bestByPair.get(sym);
    if (!existing) {
      bestByPair.set(sym, sig);
      continue;
    }
    const isBetter =
      (sig.isBestTradeNow && !existing.isBestTradeNow) ||
      (sig.quality === 'A_PLUS' && existing.quality !== 'A_PLUS') ||
      sig.confluenceScore > existing.confluenceScore ||
      (sig.confluenceScore === existing.confluenceScore &&
        (sig.winProbability || 0) > (existing.winProbability || 0));

    if (isBetter) {
      bestByPair.set(sym, sig);
    }
  }
  return Array.from(bestByPair.values());
}

/**
 * Step 1: Compute per-currency directional bias from active signals.
 * Rules:
 * - PAIR BUY  => BASE BUY, QUOTE SELL
 * - PAIR SELL => BASE SELL, QUOTE BUY
 * - 2+ signals in same direction (more than opposite) => lock bias to majority direction
 * - 1 signal only => still lock bias to that single signal
 * - Equal BUY and SELL counts (e.g. 1 BUY and 1 SELL) => NEUTRAL (no locked directional majority)
 */
export function calculateCurrencyBiasMap(
  activeSignals: ForexSignal[]
): Record<string, CurrencyBiasInfo> {
  const deduped = deduplicateSignalsPerPair(activeSignals);
  const accum: Record<
    string,
    {
      buyPairs: string[];
      sellPairs: string[];
      votes: CurrencyBiasVote[];
    }
  > = {};

  for (const ccy of TRACKED_CONFLICT_CURRENCIES) {
    accum[ccy] = { buyPairs: [], sellPairs: [], votes: [] };
  }

  for (const sig of deduped) {
    const currencies = extractCurrenciesFromSymbol(sig.pair?.symbol || '');
    if (!currencies) continue;

    const base = normalizeCurrencyCode(currencies[0]);
    const quote = normalizeCurrencyCode(currencies[1]);
    const sigDir: 'BUY' | 'SELL' = sig.type.startsWith('BUY') ? 'BUY' : 'SELL';
    const baseAction: 'BUY' | 'SELL' = sigDir;
    const quoteAction: 'BUY' | 'SELL' = sigDir === 'BUY' ? 'SELL' : 'BUY';
    const pairLabel = `${sig.pair.symbol} ${sigDir}`;

    if (!accum[base]) accum[base] = { buyPairs: [], sellPairs: [], votes: [] };
    if (!accum[quote]) accum[quote] = { buyPairs: [], sellPairs: [], votes: [] };

    if (baseAction === 'BUY') {
      accum[base].buyPairs.push(pairLabel);
    } else {
      accum[base].sellPairs.push(pairLabel);
    }
    accum[base].votes.push({
      pairSymbol: sig.pair.symbol,
      signalId: sig.id,
      signalDirection: sigDir,
      currencyAction: baseAction,
      pairLabel,
    });

    if (quoteAction === 'BUY') {
      accum[quote].buyPairs.push(pairLabel);
    } else {
      accum[quote].sellPairs.push(pairLabel);
    }
    accum[quote].votes.push({
      pairSymbol: sig.pair.symbol,
      signalId: sig.id,
      signalDirection: sigDir,
      currencyAction: quoteAction,
      pairLabel,
    });
  }

  const biasMap: Record<string, CurrencyBiasInfo> = {};

  for (const [ccy, data] of Object.entries(accum)) {
    const buyCount = data.buyPairs.length;
    const sellCount = data.sellPairs.length;

    let bias: CurrencyBiasDirection = 'NEUTRAL';
    let isLocked = false;

    if (buyCount > sellCount) {
      bias = 'BULLISH';
      isLocked = true;
    } else if (sellCount > buyCount) {
      bias = 'BEARISH';
      isLocked = true;
    } else {
      bias = 'NEUTRAL';
      isLocked = false;
    }

    biasMap[ccy] = {
      currency: ccy,
      displayName: getCurrencyDisplayName(ccy),
      bias,
      isLocked,
      buyCount,
      sellCount,
      buyPairs: data.buyPairs,
      sellPairs: data.sellPairs,
      votes: data.votes,
    };
  }

  return biasMap;
}

/**
 * Evaluates a single signal against the locked currency bias map.
 */
export function evaluateSignalAgainstBias(
  sig: ForexSignal,
  biasMap: Record<string, CurrencyBiasInfo>
): SignalConflictEvaluation {
  const currencies = extractCurrenciesFromSymbol(sig.pair?.symbol || '');
  const sigDir: 'BUY' | 'SELL' = sig.type.startsWith('BUY') ? 'BUY' : 'SELL';

  if (!currencies) {
    return {
      signalId: sig.id,
      pairSymbol: sig.pair?.symbol || '',
      signalDirection: sigDir,
      baseCurrency: '',
      quoteCurrency: '',
      baseDisplay: '',
      quoteDisplay: '',
      baseImpliedAction: sigDir,
      quoteImpliedAction: sigDir === 'BUY' ? 'SELL' : 'BUY',
      isConflict: false,
      conflicts: [],
      warningBannerText: null,
      warningBadgeText: null,
      strictHiddenReason: null,
      cleanBadgeText: '✓ No Conflict',
    };
  }

  const base = normalizeCurrencyCode(currencies[0]);
  const quote = normalizeCurrencyCode(currencies[1]);
  const baseDisplay = getCurrencyDisplayName(base);
  const quoteDisplay = getCurrencyDisplayName(quote);

  const baseAction: 'BUY' | 'SELL' = sigDir;
  const quoteAction: 'BUY' | 'SELL' = sigDir === 'BUY' ? 'SELL' : 'BUY';

  const conflicts: CurrencyConflictDetail[] = [];

  const checkLeg = (ccy: string, displayName: string, action: 'BUY' | 'SELL') => {
    const info = biasMap[ccy];
    if (!info) return;

    const neededBias: CurrencyBiasDirection = action === 'BUY' ? 'BULLISH' : 'BEARISH';

    if (info.isLocked && info.bias !== 'NEUTRAL') {
      if (info.bias !== neededBias) {
        const supportingPairs = info.bias === 'BULLISH' ? info.buyPairs : info.sellPairs;
        conflicts.push({
          currency: ccy,
          displayName,
          lockedBias: info.bias,
          signalDirection: action,
          supportingPairs,
        });
      }
    } else if (info.bias === 'NEUTRAL' && info.buyCount > 0 && info.sellCount > 0) {
      // Equal tie (e.g. 1 BUY and 1 SELL): opposing signals contradict each other
      const opposingPairs = action === 'BUY' ? info.sellPairs : info.buyPairs;
      conflicts.push({
        currency: ccy,
        displayName,
        lockedBias: 'NEUTRAL',
        signalDirection: action,
        supportingPairs: opposingPairs,
      });
    }
  };

  checkLeg(base, baseDisplay, baseAction);
  checkLeg(quote, quoteDisplay, quoteAction);

  const isConflict = conflicts.length > 0;
  const baseBiasLabel = baseAction === 'BUY' ? 'Bullish' : 'Bearish';
  const quoteBiasLabel = quoteAction === 'BUY' ? 'Bullish' : 'Bearish';
  const cleanBadgeText = `✓ No Conflict | ${baseDisplay} ${baseBiasLabel} | ${quoteDisplay} ${quoteBiasLabel}`;

  if (!isConflict) {
    return {
      signalId: sig.id,
      pairSymbol: sig.pair.symbol,
      signalDirection: sigDir,
      baseCurrency: base,
      quoteCurrency: quote,
      baseDisplay,
      quoteDisplay,
      baseImpliedAction: baseAction,
      quoteImpliedAction: quoteAction,
      isConflict: false,
      conflicts: [],
      warningBannerText: null,
      warningBadgeText: null,
      strictHiddenReason: null,
      cleanBadgeText,
    };
  }

  const warningBannerText = `⚠️ CONFLICT WARNING: This signal conflicts with ${conflicts
    .map(c => `${c.displayName} Bias`)
    .join(' & ')}`;

  const warningBadgeText = conflicts
    .map(c =>
      c.lockedBias === 'NEUTRAL'
        ? `Conflicts with ${c.displayName} NEUTRAL split (${c.supportingPairs.join(', ')})`
        : `Conflicts with ${c.displayName} ${c.lockedBias} bias (${c.supportingPairs.join(', ')})`
    )
    .join(' · ');

  const reasonParts = conflicts.map(c => {
    const cleanPairNames = c.supportingPairs.map(stripDirectionFromPairLabel);
    if (c.lockedBias === 'NEUTRAL') {
      return `${c.displayName} is NEUTRAL (contradicted by ${formatNaturalList(c.supportingPairs)}). Cannot confirm ${c.signalDirection} here`;
    }
    return `${c.displayName} is ${c.lockedBias} in ${formatNaturalList(cleanPairNames)}. Cannot be ${c.signalDirection} here`;
  });

  const strictHiddenReason = `${sig.pair.symbol} ${sigDir} hidden: ${reasonParts.join(
    '; '
  )}. Skipped to avoid confusion.`;

  return {
    signalId: sig.id,
    pairSymbol: sig.pair.symbol,
    signalDirection: sigDir,
    baseCurrency: base,
    quoteCurrency: quote,
    baseDisplay,
    quoteDisplay,
    baseImpliedAction: baseAction,
    quoteImpliedAction: quoteAction,
    isConflict: true,
    conflicts,
    warningBannerText,
    warningBadgeText,
    strictHiddenReason,
    cleanBadgeText,
  };
}

/**
 * Computes full currency bias map from `biasSourceSignals` (all current active signals)
 * and evaluates `targetSignals` (signals shown in current feed filter).
 */
export function analyzeCurrencyConflicts(
  biasSourceSignals: ForexSignal[],
  targetSignals: ForexSignal[] = biasSourceSignals
): CurrencyConflictAnalysisResult {
  const biasMap = calculateCurrencyBiasMap(biasSourceSignals);
  const evaluationsById: Record<string, SignalConflictEvaluation> = {};

  let cleanCount = 0;
  let conflictCount = 0;

  for (const sig of targetSignals) {
    const evaluation = evaluateSignalAgainstBias(sig, biasMap);
    evaluationsById[sig.id] = evaluation;
    if (evaluation.isConflict) {
      conflictCount++;
    } else {
      cleanCount++;
    }
  }

  return {
    biasMap,
    evaluationsById,
    cleanCount,
    conflictCount,
  };
}
