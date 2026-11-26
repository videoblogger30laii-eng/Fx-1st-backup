import {
  CurrencyStrengthItem,
  CurrencyStrengthSnapshot,
  BestPairingRecommendation,
  PairStrengthItem
} from '../types';
import { realPriceService } from './RealPriceService';
import { ALL_PAIRS } from './marketData';

const FX_MAJOR_CURRENCIES = ['EUR', 'GBP', 'USD', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'] as const;

const CURRENCY_META: Record<string, { name: string; primaryPair: string }> = {
  USD: { name: 'US Dollar (USD)', primaryPair: 'USD/JPY' },
  EUR: { name: 'Euro (EUR)', primaryPair: 'EUR/USD' },
  GBP: { name: 'British Pound (GBP)', primaryPair: 'GBP/USD' },
  JPY: { name: 'Japanese Yen (JPY)', primaryPair: 'USD/JPY' },
  CHF: { name: 'Swiss Franc (CHF)', primaryPair: 'USD/CHF' },
  AUD: { name: 'Australian Dollar (AUD)', primaryPair: 'AUD/USD' },
  CAD: { name: 'Canadian Dollar (CAD)', primaryPair: 'USD/CAD' },
  NZD: { name: 'New Zealand Dollar (NZD)', primaryPair: 'NZD/USD' },
  XAU: { name: 'Spot Gold (XAU/USD)', primaryPair: 'XAU/USD' },
  XAG: { name: 'Spot Silver (XAG/USD)', primaryPair: 'XAG/USD' },
  USOIL: { name: 'WTI Crude Oil', primaryPair: 'USOIL' },
  UKOIL: { name: 'Brent Crude Oil', primaryPair: 'UKOIL' }
};

export interface LiveQuoteInput {
  price: number;
  changePercent: number;
}

class CurrencyStrengthService {
  /**
   * Computes currency strength strictly LIVE from actual 24h % price changes across all live majors & crosses.
   * ZERO hardcoded scores (NO EUR 6.2, NO JPY 2.4, NO XAU 9.2, NO static change24h).
   *
   * Strongest = highest relative 24h % change vs all other majors.
   * Weakest = lowest relative 24h % change vs all other majors.
   * If live prices / 24h changes cannot be fetched, returns:
   *   { hasLiveData: false, error: 'NO DATA - CANNOT GENERATE SIGNAL', items: [] }
   */
  public getLiveCurrencyStrengthSnapshot(
    overrideQuotes?: Record<string, LiveQuoteInput>
  ): CurrencyStrengthSnapshot {
    const now = Date.now();
    const changeTotals: Record<string, number> = {};
    const sampleCounts: Record<string, number> = {};
    FX_MAJOR_CURRENCIES.forEach(c => {
      changeTotals[c] = 0;
      sampleCounts[c] = 0;
    });

    const getQuote = (sym: string): LiveQuoteInput | null => {
      if (overrideQuotes && overrideQuotes[sym]) {
        const q = overrideQuotes[sym];
        if (q.price > 0 && Number.isFinite(q.changePercent)) {
          return q;
        }
      }
      if (!overrideQuotes && realPriceService.hasLivePrice(sym) && realPriceService.hasLive24hChange(sym)) {
        const price = realPriceService.getPrice(sym);
        const ohlc = realPriceService.getOHLC(sym);
        if (price > 0 && Number.isFinite(ohlc.changePercent)) {
          return { price, changePercent: ohlc.changePercent };
        }
      }
      return null;
    };

    // Aggregate pairwise 24h % changes across all live 6-letter FX pairs
    const fxPairSymbols = ALL_PAIRS.filter(
      p => p.category === 'MAJORS' || p.category === 'MINORS'
    ).map(p => p.symbol);

    let liveFxPairsCount = 0;
    for (const sym of fxPairSymbols) {
      const q = getQuote(sym);
      if (!q) continue;

      const [base, quote] = sym.split('/');
      if (!base || !quote) continue;
      if (changeTotals[base] === undefined || changeTotals[quote] === undefined) continue;

      changeTotals[base] += q.changePercent;
      sampleCounts[base] += 1;

      changeTotals[quote] -= q.changePercent;
      sampleCounts[quote] += 1;
      liveFxPairsCount += 1;
    }

    const activeFxCurrencies = FX_MAJOR_CURRENCIES.filter(c => sampleCounts[c] > 0);
    if (liveFxPairsCount === 0 || activeFxCurrencies.length < 2) {
      return {
        hasLiveData: false,
        error: 'NO DATA - CANNOT GENERATE SIGNAL',
        items: [],
        updatedAtMs: now
      };
    }

    const avgPctByCcy: Record<string, number> = {};
    for (const ccy of activeFxCurrencies) {
      avgPctByCcy[ccy] = changeTotals[ccy] / sampleCounts[ccy];
    }

    // Add Metals / Oil strictly if live quote + 24h change exist
    const nonFxSymbols = ['XAU/USD', 'XAG/USD', 'USOIL', 'UKOIL'];
    const activeNonFx: { code: string; sym: string; group: 'METALS' | 'COMMODITIES'; price: number; pct: number }[] = [];
    for (const sym of nonFxSymbols) {
      const q = getQuote(sym);
      if (!q) continue;
      const code = sym.includes('/') ? sym.split('/')[0] : sym;
      const group = code === 'XAU' || code === 'XAG' ? 'METALS' : 'COMMODITIES';
      activeNonFx.push({ code, sym, group, price: q.price, pct: q.changePercent });
    }

    const fxVals = activeFxCurrencies.map(c => avgPctByCcy[c]);
    const minFxPct = Math.min(...fxVals);
    const maxFxPct = Math.max(...fxVals);
    const fxSpan = maxFxPct - minFxPct;

    const toScore = (pct: number): number => {
      if (fxSpan <= 0.0001) {
        return 5.0;
      }
      // Pure linear normalization onto [1.0, 9.5] from live min -> live max 24h % change
      const ratio = (pct - minFxPct) / fxSpan;
      const scaled = 1.0 + ratio * 8.5;
      return Math.max(0.5, Math.min(9.9, Math.round(scaled * 10) / 10));
    };

    const getStatus = (score: number): CurrencyStrengthItem['status'] => {
      if (score >= 8.0) return 'VERY_STRONG';
      if (score >= 6.5) return 'STRONG';
      if (score <= 2.8) return 'VERY_WEAK';
      if (score <= 4.8) return 'WEAK';
      return 'NEUTRAL';
    };

    const getMomentum = (pct: number): CurrencyStrengthItem['momentum'] => {
      if (pct >= 0.1) return 'RISING';
      if (pct <= -0.1) return 'FALLING';
      return 'STABLE';
    };

    const items: CurrencyStrengthItem[] = [];

    for (const ccy of activeFxCurrencies) {
      const avgPct = Math.round(avgPctByCcy[ccy] * 100) / 100;
      const score = toScore(avgPctByCcy[ccy]);
      const meta = CURRENCY_META[ccy];
      const primaryQuote = getQuote(meta.primaryPair);

      items.push({
        currency: ccy,
        name: meta.name,
        pairSymbol: meta.primaryPair,
        group: 'FX',
        livePrice: primaryQuote?.price,
        strength: score,
        status: getStatus(score),
        change24h: avgPct,
        momentum: getMomentum(avgPct)
      });
    }

    for (const nf of activeNonFx) {
      const score = toScore(nf.pct);
      const meta = CURRENCY_META[nf.code] || { name: nf.code, primaryPair: nf.sym };
      items.push({
        currency: nf.code,
        name: meta.name,
        pairSymbol: nf.sym,
        group: nf.group,
        livePrice: nf.price,
        strength: score,
        status: getStatus(score),
        change24h: Math.round(nf.pct * 100) / 100,
        momentum: getMomentum(nf.pct)
      });
    }

    items.sort((a, b) => b.change24h - a.change24h || b.strength - a.strength);

    const fxSorted = items.filter(i => i.group === 'FX');
    const strongestCurrency = fxSorted[0]?.currency;
    const weakestCurrency = fxSorted[fxSorted.length - 1]?.currency;

    return {
      hasLiveData: true,
      items,
      strongestCurrency,
      weakestCurrency,
      updatedAtMs: now
    };
  }

  public getCurrencyStrengths(overrideQuotes?: Record<string, LiveQuoteInput>): CurrencyStrengthItem[] {
    return this.getLiveCurrencyStrengthSnapshot(overrideQuotes).items;
  }

  /**
   * Computes relative strength and directional bias for all pairs strictly from live currency strength.
   * Returns [] if NO DATA is available.
   */
  public getAllPairStrengths(overrideQuotes?: Record<string, LiveQuoteInput>): PairStrengthItem[] {
    const snapshot = this.getLiveCurrencyStrengthSnapshot(overrideQuotes);
    if (!snapshot.hasLiveData || snapshot.items.length === 0) {
      return [];
    }

    const map = new Map<string, CurrencyStrengthItem>();
    snapshot.items.forEach(item => map.set(item.currency, item));

    const results: PairStrengthItem[] = [];

    for (const pair of ALL_PAIRS) {
      const [base, quote] = pair.symbol.split('/');
      const baseItem = map.get(base);
      const quoteItem = map.get(quote);
      const livePrice = overrideQuotes?.[pair.symbol]?.price ?? realPriceService.getPrice(pair.symbol);

      if (!baseItem || !quoteItem || !livePrice || livePrice <= 0) {
        continue;
      }

      const baseScore = baseItem.strength;
      const quoteScore = quoteItem.strength;
      const diff = Math.round((baseScore - quoteScore) * 10) / 10;
      const absDiff = Math.abs(diff);

      let bias: PairStrengthItem['bias'] = 'NEUTRAL';
      if (diff >= 2.2) bias = 'STRONG BUY';
      else if (diff >= 0.8) bias = 'BUY';
      else if (diff <= -2.2) bias = 'STRONG SELL';
      else if (diff <= -0.8) bias = 'SELL';

      const ohlc = realPriceService.getOHLC(pair.symbol);
      const change24h =
        overrideQuotes?.[pair.symbol]?.changePercent ??
        (realPriceService.hasLive24hChange(pair.symbol) ? ohlc.changePercent : (baseItem.change24h - quoteItem.change24h));

      results.push({
        pairSymbol: pair.symbol,
        name: pair.name,
        category: pair.category || 'MINORS',
        baseAsset: base,
        quoteAsset: quote,
        baseStrength: baseScore,
        quoteStrength: quoteScore,
        netStrengthDiff: diff,
        compositeScore: Math.max(1.5, Math.min(9.9, Math.round((5.0 + absDiff * 0.68) * 10) / 10)),
        bias,
        livePrice,
        change24h: Math.round(change24h * 100) / 100
      });
    }

    return results.sort((a, b) => Math.abs(b.netStrengthDiff) - Math.abs(a.netStrengthDiff));
  }

  public getBestPairings(overrideQuotes?: Record<string, LiveQuoteInput>): BestPairingRecommendation[] {
    const snapshot = this.getLiveCurrencyStrengthSnapshot(overrideQuotes);
    if (!snapshot.hasLiveData) {
      return [];
    }

    const fxList = snapshot.items.filter(i => i.group === 'FX');
    if (fxList.length < 2) {
      return [];
    }

    const strongestFx = fxList[0];
    const secondStrongestFx = fxList[1];
    const weakestFx = fxList[fxList.length - 1];
    const secondWeakestFx = fxList.length > 2 ? fxList[fxList.length - 2] : weakestFx;

    const recs: BestPairingRecommendation[] = [
      {
        pair: `${strongestFx.currency}/${weakestFx.currency}`,
        action: 'BUY',
        strongCurrency: strongestFx.currency,
        weakCurrency: weakestFx.currency,
        strengthDiff: Math.round((strongestFx.strength - weakestFx.strength) * 10) / 10,
        confluenceReason: `Live 24h FX Spread: ${strongestFx.currency} (${strongestFx.change24h >= 0 ? '+' : ''}${strongestFx.change24h}%) vs ${weakestFx.currency} (${weakestFx.change24h >= 0 ? '+' : ''}${weakestFx.change24h}%).`
      },
      {
        pair: `${secondStrongestFx.currency}/${weakestFx.currency}`,
        action: 'BUY',
        strongCurrency: secondStrongestFx.currency,
        weakCurrency: weakestFx.currency,
        strengthDiff: Math.round((secondStrongestFx.strength - weakestFx.strength) * 10) / 10,
        confluenceReason: `Live Cross Momentum: ${secondStrongestFx.currency} (${secondStrongestFx.strength}/10) vs ${weakestFx.currency} (${weakestFx.strength}/10).`
      }
    ];

    if (secondWeakestFx.currency !== weakestFx.currency && secondWeakestFx.currency !== strongestFx.currency) {
      recs.push({
        pair: `${strongestFx.currency}/${secondWeakestFx.currency}`,
        action: 'BUY',
        strongCurrency: strongestFx.currency,
        weakCurrency: secondWeakestFx.currency,
        strengthDiff: Math.round((strongestFx.strength - secondWeakestFx.strength) * 10) / 10,
        confluenceReason: `Secondary FX Divergence: ${strongestFx.currency} (${strongestFx.strength}/10) vs ${secondWeakestFx.currency} (${secondWeakestFx.strength}/10).`
      });
    }

    return recs;
  }

  /**
   * Step 4 Live Conflict Filter:
   * - Requires live currency strength data; if unavailable, blocks with 'NO DATA - CANNOT GENERATE SIGNAL'.
   * - If BUY signal AND (base is Weakest OR quote is Strongest) => BLOCKED.
   * - If SELL signal AND (base is Strongest OR quote is Weakest) => BLOCKED.
   */
  public isSignalAlignedWithCurrencyStrength(
    pairSymbol: string,
    signalType: string,
    providedSnapshot?: CurrencyStrengthSnapshot
  ): {
    isAligned: boolean;
    blocked: boolean;
    reason?: string;
    meterBias: 'BUY' | 'SELL' | 'NEUTRAL';
  } {
    const snap = providedSnapshot || this.getLiveCurrencyStrengthSnapshot();
    if (!snap.hasLiveData || snap.items.length === 0) {
      return {
        isAligned: false,
        blocked: true,
        meterBias: 'NEUTRAL',
        reason: 'NO DATA - CANNOT GENERATE SIGNAL'
      };
    }

    const clean = pairSymbol.replace('/', '').toUpperCase();
    if (clean.length !== 6) {
      return { isAligned: true, blocked: false, meterBias: 'NEUTRAL' };
    }

    const base = clean.substring(0, 3);
    const quote = clean.substring(3, 6);

    const baseItem = snap.items.find(s => s.currency === base);
    const quoteItem = snap.items.find(s => s.currency === quote);

    if (!baseItem || !quoteItem) {
      return {
        isAligned: false,
        blocked: true,
        meterBias: 'NEUTRAL',
        reason: `NO DATA - CANNOT GENERATE SIGNAL (${base}/${quote} missing live strength)`
      };
    }

    const isBuySignal = signalType.toUpperCase().startsWith('BUY');
    const isSellSignal = signalType.toUpperCase().startsWith('SELL');
    const strongest = snap.strongestCurrency;
    const weakest = snap.weakestCurrency;

    // Hard Rule: Never BUY Weakest currency or SELL against Weakest/Strongest extremes
    if (isBuySignal && (base === weakest || quote === strongest)) {
      return {
        isAligned: false,
        blocked: true,
        meterBias: 'SELL',
        reason: `Conflict Filter Blocked BUY ${pairSymbol}: ${base === weakest ? `${base} is Weakest (${baseItem.change24h}%)` : `${quote} is Strongest (${quoteItem.change24h}%)`}`
      };
    }

    if (isSellSignal && (base === strongest || quote === weakest)) {
      return {
        isAligned: false,
        blocked: true,
        meterBias: 'BUY',
        reason: `Conflict Filter Blocked SELL ${pairSymbol}: ${base === strongest ? `${base} is Strongest (${baseItem.change24h}%)` : `${quote} is Weakest (${quoteItem.change24h}%)`}`
      };
    }

    const diff = baseItem.strength - quoteItem.strength;
    if (isBuySignal && diff < 0.35) {
      return {
        isAligned: false,
        blocked: true,
        meterBias: diff <= -0.35 ? 'SELL' : 'NEUTRAL',
        reason: `Weak Currency Divergence Blocked BUY ${pairSymbol}: ${base} (${baseItem.strength}/10) vs ${quote} (${quoteItem.strength}/10, Δ ${diff.toFixed(2)})`
      };
    }

    if (isSellSignal && diff > -0.35) {
      return {
        isAligned: false,
        blocked: true,
        meterBias: diff >= 0.35 ? 'BUY' : 'NEUTRAL',
        reason: `Weak Currency Divergence Blocked SELL ${pairSymbol}: ${base} (${baseItem.strength}/10) vs ${quote} (${quoteItem.strength}/10, Δ ${diff.toFixed(2)})`
      };
    }

    if (diff >= 1.5) {
      return { isAligned: true, blocked: false, meterBias: 'BUY' };
    }

    if (diff <= -1.5) {
      return { isAligned: true, blocked: false, meterBias: 'SELL' };
    }

    return { isAligned: true, blocked: false, meterBias: isBuySignal ? 'BUY' : 'SELL' };
  }
}

export const currencyStrengthService = new CurrencyStrengthService();
