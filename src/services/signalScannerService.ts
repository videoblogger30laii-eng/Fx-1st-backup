import {
  ForexPair,
  ForexSignal,
  SignalType,
  SignalStatus,
  SignalQuality,
  ConfluenceChecklistItem,
  Timeframe,
  StrategyType,
  STRATEGY_CONFIGS,
  getSignalStrategy,
  CandleStick,
  CurrencyStrengthSnapshot,
  SignalGenerationAudit,
  ConfluenceBreakdown
} from '../types';
import { ALL_PAIRS, PAIR_XAUUSD, PAIR_XAGUSD, formatPrice, calculatePips, pipsToPrice, isForexMarketOpen, getWeekendMarketState, getEffectiveDurationMs, getTimeframeBounds, enforceTimeframeHierarchy, formatSignalDateTime, isSignalValidAndActive } from './marketData';
import { currencyStrengthService } from './currencyStrengthService';
import { PersistenceManager, CANONICAL_PAIR_INITIAL_AGES_MS, CANONICAL_PAIR_SIGNAL_IDS } from './persistence';
import { adaptiveSlLearningService } from './adaptiveSlLearningService';
import { economicCalendarService } from './economicCalendarService';
import { realPriceService } from './RealPriceService';
import { evaluateH4EmaFilter, H4EmaFilterResult } from './h4TrendFilter';
import { getRealPairBacktestStats, RealPairBacktestStats } from './realBacktestStatsService';
import { RealCandleFetcherService } from './realCandleFetcher';
import {
  computeATR,
  computeADX,
  computeEMA,
  computeEMASlope,
  computeRSI,
  detectSMCOnTimeframe,
  detectRealLiquiditySweep,
  evaluateSwingRangePosition,
  sortCandlesAsc
} from './technicalAnalysis';

export interface TimeframeScoreResult {
  tf: 'M15' | 'H1' | 'H4';
  score: number;
  isBuy: boolean;
  h4BiasMatched: boolean;
  h4TrendConflict: boolean;
  h1BiasMatched: boolean;
  obFvgAligned: boolean;
  timeFilterMatched: boolean;
  atrAdxPassed: boolean;
  spreadTooHigh: boolean;
  breakdown: string;
  d1BiasMatched?: boolean;
  isNewsBlackout?: boolean;
  isOverextended?: boolean;
  isChasingZone?: boolean;
  isChasingExtreme?: boolean;
  rangePosPct?: number;
  chaseWarning?: string;
  pullbackTargetPrice?: number | null;
  isPullbackMitigated?: boolean;
  pullbackDetail?: string;
  volumeExhaustionConfirmed?: boolean;
  isLiquiditySwept?: boolean;
  adxValue?: number | null;
  rsiValue?: number | null;
  smcSummary?: string;
  confluenceBreakdown?: ConfluenceBreakdown;
}

export interface BestTfEvaluationResult {
  winningTf: 'M15' | 'H1' | 'H4';
  highestScore: number;
  isEligible: boolean; // >= min score threshold AND passed real data/H4 EMA/Conflict gates
  blockedStatus?: 'NO_DATA' | 'NO_CANDLES' | 'NO_TRADE' | 'CONFLICT_BLOCKED' | 'LOW_SCORE';
  blockedReason?: string;
  h4Filter?: H4EmaFilterResult;
  strengthSnap?: CurrencyStrengthSnapshot;
  m15Score: number;
  h1Score: number;
  h4Score: number;
  scoreBreakdownText: string;
  isBuy: boolean;
  atrPips: number;
  atrValue: number;
  slMultiplier: number;
  tpMultiplier: number;
  riskRewardLabel: string;
  rationale: string;
  triggerDetail: string;
  d1MacroTrend?: 'BULLISH' | 'BEARISH';
  isD1Aligned?: boolean;
  isNewsBlackout?: boolean;
  newsEventTitle?: string;
  newsMinutesUntil?: number;
  spreadRiskWarning?: string;
  volumeExhaustionConfirmed?: boolean;
  isOverextended?: boolean;
  isChasingZone?: boolean;
  isChasingExtreme?: boolean;
  rangePosPct?: number;
  chaseWarning?: string;
  pullbackTargetPrice?: number | null;
  isPullbackMitigated?: boolean;
  pullbackDetail?: string;
  timeFilterMatched?: boolean;
  isNearEmaPullback?: boolean;
  smcSummary?: string;
  adxValue?: number | null;
  rsiValue?: number | null;
  confluenceBreakdown?: ConfluenceBreakdown;
}

/**
 * Institutional Smart Money Concepts (SMC) & Multi-Timeframe Strategy Scanner Service.
 * Implements the 3 Final Unified Strategies:
 * 1. GOLD HUNTER (Metals Only: XAU/USD, XAG/USD) - TP 1:2.5
 * 2. LONDON KILLER (Forex Only: EUR/USD, GBP/USD, GBP/JPY) - TP 1:2.0
 * 3. TREND RIDER (Forex + Metals: USD/JPY, USD/CAD, AUD/USD, XAU/USD) - TP 1:3.0
 *
 * Runs MTF background evaluation across M15, H1, H4 using real market candles.
 * Shows ONLY highest score signal in card (Best TF Wins, One Pair = One Signal).
 */
class SignalScannerService {
  private lastScanTimestamp: number = Date.now();
  private autoScanActive: boolean = true;
  private h4CandleCache: Map<string, { candles: CandleStick[]; fetchedAtMs: number; error?: string }> = new Map();
  private h1CandleCache: Map<string, { candles: CandleStick[]; fetchedAtMs: number; error?: string }> = new Map();
  private m15CandleCache: Map<string, { candles: CandleStick[]; fetchedAtMs: number; error?: string }> = new Map();
  private d1CandleCache: Map<string, { candles: CandleStick[]; fetchedAtMs: number; error?: string }> = new Map();
  public lastBlockedDiagnostics: { pairSymbol: string; status: string; reason: string }[] = [];
  public lastScanGlobalStatus: string | null = null;

  public isAutoScanActive(): boolean {
    return this.autoScanActive;
  }

  public setAutoScanActive(active: boolean): void {
    this.autoScanActive = active;
  }

  public getLastScanTimestamp(): number {
    return this.lastScanTimestamp;
  }

  private getCacheMapForTf(tf: 'M15' | 'H1' | 'H4' | 'D1') {
    if (tf === 'M15') return this.m15CandleCache;
    if (tf === 'H1') return this.h1CandleCache;
    if (tf === 'D1') return this.d1CandleCache;
    return this.h4CandleCache;
  }

  public setRealCandles(pairSymbol: string, tf: 'M15' | 'H1' | 'H4' | 'D1', candles: CandleStick[], error?: string): void {
    this.getCacheMapForTf(tf).set(pairSymbol.toUpperCase(), {
      candles,
      fetchedAtMs: Date.now(),
      error
    });
  }

  public getCachedCandles(pairSymbol: string, tf: 'M15' | 'H1' | 'H4' | 'D1'): CandleStick[] | undefined {
    return this.getCacheMapForTf(tf).get(pairSymbol.toUpperCase())?.candles;
  }

  public setRealH4Candles(pairSymbol: string, candles: CandleStick[]): void {
    this.setRealCandles(pairSymbol, 'H4', candles);
  }

  public getCachedH4Candles(pairSymbol: string): CandleStick[] | undefined {
    return this.getCachedCandles(pairSymbol, 'H4');
  }

  public clearRealH4Candles(pairSymbol?: string): void {
    if (pairSymbol) {
      const sym = pairSymbol.toUpperCase();
      this.h4CandleCache.delete(sym);
      this.h1CandleCache.delete(sym);
      this.m15CandleCache.delete(sym);
      this.d1CandleCache.delete(sym);
    } else {
      this.h4CandleCache.clear();
      this.h1CandleCache.clear();
      this.m15CandleCache.clear();
      this.d1CandleCache.clear();
    }
  }

  public getLastScanStatus(): {
    globalStatus: string | null;
    blocked: { pairSymbol: string; status: string; reason: string }[];
  } {
    return {
      globalStatus: this.lastScanGlobalStatus,
      blocked: this.lastBlockedDiagnostics
    };
  }

  /**
   * Evaluates real ATR(14) volatility, candle displacement, and spread efficiency from real candles.
   */
  public evaluateAtrVolatility(
    pair: ForexPair,
    livePrice: number,
    candles?: CandleStick[]
  ): {
    atrValue: number;
    atrPips: number;
    displacementMultiple: number;
    spreadTooHigh: boolean;
    atrAdxPassed: boolean;
    adxValue: number | null;
  } {
    const sym = pair.symbol.toUpperCase();
    const isGold = sym.includes('XAU') || sym.includes('GOLD');
    const isSilver = sym.includes('XAG') || sym.includes('SILVER');
    const isUsdJpy = sym === 'USD/JPY' || sym === 'USDJPY';
    const isJpy = sym.includes('JPY');

    const sortedCandles = candles && candles.length >= 15 ? sortCandlesAsc(candles) : [];
    const realAtr = sortedCandles.length >= 15 ? computeATR(sortedCandles, 14) : null;
    const realAdx = sortedCandles.length >= 30 ? computeADX(sortedCandles, 14) : null;

    let atrValue: number;
    let displacementMultiple: number;

    if (realAtr && realAtr.atr > 0) {
      atrValue = realAtr.atr;
      displacementMultiple = realAtr.rangeToAtr;
    } else {
      let fallbackAtr = 0.0018;
      if (isGold) fallbackAtr = 14.5;
      else if (isSilver) fallbackAtr = 0.38;
      else if (isUsdJpy) fallbackAtr = 0.75;
      else if (isJpy) fallbackAtr = 1.2;
      atrValue = fallbackAtr;
      displacementMultiple = 0;
    }

    const atrPips = Math.max(5, Math.round(calculatePips(pair, livePrice, livePrice + atrValue, true)));

    // Spread filters: Gold spread < 30 pips, FX spread/ATR <= 0.18
    let spreadTooHigh = false;
    if (isGold) {
      spreadTooHigh = pair.spreadPips >= 30;
    } else {
      const spreadToAtr = pair.spreadPips / Math.max(atrPips, 1);
      spreadTooHigh = spreadToAtr > 0.18;
    }

    const adxValue = realAdx?.adx ?? null;
    const atrAdxPassed =
      realAtr !== null &&
      displacementMultiple >= 0.75 &&
      (adxValue === null ? true : adxValue >= 18);

    return {
      atrValue,
      atrPips,
      displacementMultiple,
      spreadTooHigh,
      atrAdxPassed,
      adxValue
    };
  }

  /**
   * Verifies real session killzone timing (no free points on weekend market closure):
   * - GOLD HUNTER: London 07:00-10:00 UTC and NY 13:00-16:00 UTC (ICT Silver Bullet)
   * - LONDON KILLER: London 07:00-10:00 UTC Only
   * - TREND RIDER: Active London / NY sessions (07:00-17:00 UTC)
   */
  public evaluateTimeFilter(strategy: StrategyType): {
    timeFilterMatched: boolean;
    isPartialSession?: boolean;
    sessionName: string;
  } {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();
    const decimalHour = utcHour + utcMin / 60;

    const weekendState = getWeekendMarketState();
    if (weekendState.isWeekend) {
      return { timeFilterMatched: false, isPartialSession: false, sessionName: 'Weekend Market Closed' };
    }

    if (strategy === 'GOLD_HUNTER') {
      const isLondonBullet = decimalHour >= 7.0 && decimalHour <= 10.0;
      const isNyBullet = decimalHour >= 13.0 && decimalHour <= 16.0;
      const matched = isLondonBullet || isNyBullet;
      const isLondonNy = decimalHour >= 7.0 && decimalHour <= 19.0;
      const sessionName = isLondonBullet
        ? 'London Silver Bullet (07:00-10:00 UTC)'
        : isNyBullet
        ? 'NY Silver Bullet (13:00-16:00 UTC)'
        : isLondonNy
        ? 'London/NY Active Liquidity Window'
        : 'Outside Silver Bullet Hours';
      return { timeFilterMatched: matched, isPartialSession: !matched && isLondonNy, sessionName };
    }

    if (strategy === 'LONDON_KILLER') {
      const isLondonOpen = decimalHour >= 7.0 && decimalHour <= 10.0;
      const isNyOverlap = decimalHour >= 12.0 && decimalHour <= 16.0;
      return {
        timeFilterMatched: isLondonOpen,
        isPartialSession: !isLondonOpen && isNyOverlap,
        sessionName: isLondonOpen
          ? 'London Killzone (07:00-10:00 UTC)'
          : isNyOverlap
          ? 'NY Overlap Window (Outside London Open)'
          : 'Outside London Killzone'
      };
    }

    // TREND_RIDER or ALL_STRATEGIES
    const isLondonNySession = decimalHour >= 7.0 && decimalHour <= 17.0;
    const isAsianSession = decimalHour >= 0.0 && decimalHour < 7.0;
    return {
      timeFilterMatched: isLondonNySession,
      isPartialSession: isAsianSession,
      sessionName: isLondonNySession
        ? 'London/NY Trending Session (07:00-17:00 UTC)'
        : isAsianSession
        ? 'Asian Session (Tokyo/Sydney 00:00-07:00 UTC)'
        : 'Off-Peak / Rollover Window'
    };
  }

  /**
   * Institutional Trend Rider Pullback & Overextension Gate:
   * Evaluates price displacement vs real H4 ATR from H4 9 EMA.
   */
  public evaluateTrendRiderPullback(
    pair: ForexPair,
    livePrice: number,
    isBuy: boolean,
    _tf: 'M15' | 'H1' | 'H4',
    h4AtrPips: number,
    h4Filter?: H4EmaFilterResult
  ): {
    isOverextended: boolean;
    isPullbackMitigated: boolean;
    equilibriumDistancePips: number;
    pullbackDetail: string;
  } {
    const emaAnchor = h4Filter?.ema9 ?? h4Filter?.ema50 ?? livePrice;
    const displacementPips = calculatePips(pair, emaAnchor, livePrice, isBuy);
    const absDisplacementPips = Math.abs(displacementPips);

    const isOverextended = displacementPips > h4AtrPips * 1.85;
    const isPullbackMitigated = !isOverextended && absDisplacementPips <= h4AtrPips * 0.90;
    const equilibriumDistancePips = Math.round(absDisplacementPips * 10) / 10;

    let pullbackDetail = '';
    if (isOverextended) {
      pullbackDetail = `⚠️ Overextended Move: Price ${absDisplacementPips.toFixed(1)}p from H4 9 EMA (>1.85x H4 ATR). Awaiting pullback.`;
    } else if (isPullbackMitigated) {
      pullbackDetail = `🎯 EMA Pullback Zone: Price within ${equilibriumDistancePips}p of H4 9 EMA in trend direction.`;
    } else {
      pullbackDetail = `Trending (${equilibriumDistancePips}p from H4 9 EMA). Observing structure continuation.`;
    }

    return {
      isOverextended,
      isPullbackMitigated,
      equilibriumDistancePips,
      pullbackDetail
    };
  }

  /**
   * Layer 9: Real Pre-Entry Liquidity Sweep Confirmation Guard using actual H1/H4/D1 candles.
   */
  public checkLiquiditySweep(
    pair: ForexPair,
    isBuy: boolean,
    livePrice: number,
    candleContext?: {
      h1Candles?: CandleStick[];
      h4Candles?: CandleStick[];
      d1Candles?: CandleStick[];
      atrValue?: number;
    }
  ): {
    isLiquiditySwept: boolean;
    isNearLiquidityLevel: boolean;
    liquiditySweepLevel: number;
    liquiditySweepType: 'PDL' | 'PDH' | 'PWL' | 'PWH' | 'SWING_LOW' | 'SWING_HIGH';
    liquiditySweepDetail: string;
    liquiditySweepStatusTag: string;
    liquiditySweepTimeMs?: number;
  } {
    const h1 = candleContext?.h1Candles ?? this.getCachedCandles(pair.symbol, 'H1');
    const h4 = candleContext?.h4Candles ?? this.getCachedCandles(pair.symbol, 'H4');
    const d1 = candleContext?.d1Candles ?? this.getCachedCandles(pair.symbol, 'D1');
    return detectRealLiquiditySweep(pair, isBuy, livePrice, h1, h4, d1, candleContext?.atrValue);
  }

  /**
   * Hard Correlation Blocker exposure helper:
   * Counts active USD, EUR, JPY, GBP directional exposure across active running/pending signals.
   */
  public getCurrencyDirectionalExposure(activeSignals: ForexSignal[]): {
    USD_LONG: number;
    USD_SHORT: number;
    EUR_LONG: number;
    EUR_SHORT: number;
    JPY_LONG: number;
    JPY_SHORT: number;
    GBP_LONG: number;
    GBP_SHORT: number;
  } {
    const counts = {
      USD_LONG: 0,
      USD_SHORT: 0,
      EUR_LONG: 0,
      EUR_SHORT: 0,
      JPY_LONG: 0,
      JPY_SHORT: 0,
      GBP_LONG: 0,
      GBP_SHORT: 0
    };

    activeSignals.forEach(s => {
      if (!s || s.isCorrelationBlocked) return;
      if (s.status !== 'RUNNING' && s.status !== 'PENDING') return;

      const sym = (s.pair?.symbol || '').toUpperCase();
      const isBuy = s.type.startsWith('BUY');

      let base = '';
      let quote = '';
      if (sym.includes('/')) {
        const parts = sym.split('/');
        base = parts[0];
        quote = parts[1];
      }

      const addExp = (ccy: string, direction: 'LONG' | 'SHORT') => {
        if (ccy === 'USD') {
          if (direction === 'LONG') counts.USD_LONG++;
          else counts.USD_SHORT++;
        } else if (ccy === 'EUR') {
          if (direction === 'LONG') counts.EUR_LONG++;
          else counts.EUR_SHORT++;
        } else if (ccy === 'JPY') {
          if (direction === 'LONG') counts.JPY_LONG++;
          else counts.JPY_SHORT++;
        } else if (ccy === 'GBP') {
          if (direction === 'LONG') counts.GBP_LONG++;
          else counts.GBP_SHORT++;
        } else if (ccy === 'XAU' || ccy === 'XAG' || ccy === 'GOLD') {
          if (direction === 'SHORT') counts.USD_LONG++;
          else counts.USD_SHORT++;
        }
      };

      if (base) addExp(base, isBuy ? 'LONG' : 'SHORT');
      if (quote) addExp(quote, isBuy ? 'SHORT' : 'LONG');
    });

    return counts;
  }

  /**
   * Real Multi-Timeframe Confluence Scoring (0 - 100) on M15, H1, H4 independently:
   * Every single point is computed strictly from genuine OHLCV market candles and live quotes:
   * - H4 Trend Structure & EMA9/EMA50 separation/slope + H4 ADX: 0-20 pts
   * - D1 Macro EMA20/EMA50/EMA200 alignment from real D1 candles: 0-12 pts (-15 counter-trend)
   * - H1 EMA9/EMA21/EMA50 alignment from real H1 candles: 0-13 pts (-12 counter-trend)
   * - Target TF (M15/H1/H4) SMC Structure (FVG + BOS + EMA21 pullback + Rejection wick + Volume): 0-20 pts
   * - Target TF Momentum & Volatility (Real ADX(14)+DI & RSI(14)): 0-12 pts (-6 extreme RSI)
   * - Live Directional Currency Strength Divergence: 0-11 pts
   * - Real Liquidity Sweep & Reclaim (PDL/PDH/Swing on H1/H4/D1): 0-8 pts
   * - Real Session Killzone Timing: 0-4 pts
   * Penalties: Spread/Rollover (-15), News Blackout (-20), H4 Overextension (-15)
   */
  public scoreTimeframe(
    pair: ForexPair,
    strategy: StrategyType,
    tf: 'M15' | 'H1' | 'H4',
    livePrice: number,
    realContext?: {
      strengthSnap?: CurrencyStrengthSnapshot;
      h4Filter?: H4EmaFilterResult;
      m15Candles?: CandleStick[];
      h1Candles?: CandleStick[];
      h4Candles?: CandleStick[];
      d1Candles?: CandleStick[];
    }
  ): TimeframeScoreResult {
    const sym = pair.symbol.toUpperCase();
    const strengthSnap = realContext?.strengthSnap || currencyStrengthService.getLiveCurrencyStrengthSnapshot();
    const h4Candles = realContext?.h4Candles ?? this.getCachedCandles(pair.symbol, 'H4');
    const h1Candles = realContext?.h1Candles ?? this.getCachedCandles(pair.symbol, 'H1');
    const m15Candles = realContext?.m15Candles ?? this.getCachedCandles(pair.symbol, 'M15');
    const d1Candles = realContext?.d1Candles ?? this.getCachedCandles(pair.symbol, 'D1');

    const h4Filter = realContext?.h4Filter || evaluateH4EmaFilter(h4Candles, livePrice);

    if (!strengthSnap.hasLiveData || !h4Filter.ok || h4Filter.bias === 'NO_TRADE') {
      return {
        tf,
        score: 0,
        isBuy: false,
        h4BiasMatched: false,
        h4TrendConflict: true,
        h1BiasMatched: false,
        obFvgAligned: false,
        timeFilterMatched: false,
        atrAdxPassed: false,
        spreadTooHigh: false,
        volumeExhaustionConfirmed: false,
        isLiquiditySwept: false,
        breakdown: `${tf}:0`
      };
    }

    const strengthMap = new Map(strengthSnap.items.map(s => [s.currency, s.strength]));
    let baseCcy = 'USD';
    let quoteCcy = 'USD';
    if (sym.includes('/')) {
      const parts = sym.split('/');
      baseCcy = parts[0];
      quoteCcy = parts[1];
    } else if (sym.startsWith('XAU') || sym.startsWith('XAG')) {
      baseCcy = sym.slice(0, 3);
      quoteCcy = 'USD';
    }

    const baseScore = strengthMap.get(baseCcy);
    const quoteScore = strengthMap.get(quoteCcy);
    const rawDelta =
      typeof baseScore === 'number' && typeof quoteScore === 'number'
        ? baseScore - quoteScore
        : 0;

    const isBuy = h4Filter.bias === 'BUY_ONLY';
    const directionalDelta = isBuy ? rawDelta : -rawDelta;

    const tfCandles = tf === 'M15' ? m15Candles : tf === 'H1' ? h1Candles : h4Candles;
    const tfSorted = sortCandlesAsc(tfCandles);
    const h4Sorted = sortCandlesAsc(h4Candles);
    const h1Sorted = sortCandlesAsc(h1Candles);
    const d1Sorted = sortCandlesAsc(d1Candles);

    // 1. H4 Trend Structure Quality (0-20 pts)
    let h4Pts = 0;
    const h4Ema9 = h4Filter.ema9 ?? livePrice;
    const h4Ema50 = h4Filter.ema50 ?? livePrice;
    const h4RibbonAligned = isBuy ? h4Ema9 > h4Ema50 : h4Ema9 < h4Ema50;
    h4Pts += h4RibbonAligned ? 8 : 3;

    const h4Closes = h4Sorted.map(c => c.close);
    const slope9 = computeEMASlope(h4Closes, 9, 4);
    const slope50 = computeEMASlope(h4Closes, 50, 4);
    const s9Ok = slope9 !== null && (isBuy ? slope9 > 0 : slope9 < 0);
    const s50Ok = slope50 !== null && (isBuy ? slope50 > 0 : slope50 < 0);
    if (s9Ok && s50Ok) h4Pts += 4;
    else if (s9Ok) h4Pts += 2;

    const h4AtrInfo = computeATR(h4Sorted, 14);
    const h4AtrVal = h4AtrInfo?.atr && h4AtrInfo.atr > 0 ? h4AtrInfo.atr : Math.abs(h4Ema9 - h4Ema50) || livePrice * 0.002;
    const h4SepAtr = Math.abs(livePrice - h4Ema50) / Math.max(h4AtrVal, 1e-8);
    if (h4SepAtr >= 0.25 && h4SepAtr <= 2.4) h4Pts += 4;
    else if (h4SepAtr >= 0.08) h4Pts += 2;

    const h4Adx = computeADX(h4Sorted, 14);
    if (h4Adx) {
      const h4DiOk = isBuy ? h4Adx.plusDI > h4Adx.minusDI : h4Adx.minusDI > h4Adx.plusDI;
      if (h4Adx.adx >= 24 && h4DiOk) h4Pts += 4;
      else if (h4Adx.adx >= 17 && h4DiOk) h4Pts += 2;
    }

    // 2. D1 Macro Trend Alignment from real D1 candles (0-12 pts, -15 counter-trend)
    let d1Pts = 0;
    let d1BiasMatched = false;
    if (d1Sorted.length >= 50) {
      const d1Closes = d1Sorted.map(c => c.close);
      const d1Ema20 = computeEMA(d1Closes, 20)!;
      const d1Ema50 = computeEMA(d1Closes, 50)!;
      const d1Ema200 = d1Closes.length >= 200 ? computeEMA(d1Closes, 200) : null;
      const d1Ref = d1Closes[d1Closes.length - 1];

      const fullD1 = isBuy ? d1Ref > d1Ema50 && d1Ema20 > d1Ema50 : d1Ref < d1Ema50 && d1Ema20 < d1Ema50;
      const partD1 = isBuy ? (d1Ref > d1Ema50 || d1Ref > d1Ema20) : (d1Ref < d1Ema50 || d1Ref < d1Ema20);
      const counterD1 = isBuy ? d1Ref < d1Ema20 && d1Ref < d1Ema50 : d1Ref > d1Ema20 && d1Ref > d1Ema50;

      if (fullD1) {
        d1BiasMatched = true;
        d1Pts = d1Ema200 !== null && (isBuy ? d1Ref < d1Ema200 : d1Ref > d1Ema200) ? 9 : 12;
      } else if (partD1) {
        d1BiasMatched = true;
        d1Pts = 7;
      } else if (counterD1) {
        d1BiasMatched = false;
        d1Pts = -15;
      }
    } else if (d1Sorted.length >= 20) {
      const d1Closes = d1Sorted.map(c => c.close);
      const d1Ema20 = computeEMA(d1Closes, 20)!;
      const d1Ref = d1Closes[d1Closes.length - 1];
      if ((isBuy && d1Ref > d1Ema20) || (!isBuy && d1Ref < d1Ema20)) {
        d1BiasMatched = true;
        d1Pts = 7;
      } else {
        d1BiasMatched = false;
        d1Pts = -10;
      }
    }

    // 3. H1 Structure Confirmation from real H1 candles (0-13 pts, -12 counter-trend)
    let h1Pts = 0;
    let h1BiasMatched = false;
    if (h1Sorted.length >= 50) {
      const h1Closes = h1Sorted.map(c => c.close);
      const h1Ema9 = computeEMA(h1Closes, 9)!;
      const h1Ema21 = computeEMA(h1Closes, 21)!;
      const h1Ema50 = computeEMA(h1Closes, 50)!;

      const fullH1 = isBuy
        ? livePrice > h1Ema9 && h1Ema9 > h1Ema21 && h1Ema21 > h1Ema50
        : livePrice < h1Ema9 && h1Ema9 < h1Ema21 && h1Ema21 < h1Ema50;
      const structH1 = isBuy ? livePrice > h1Ema50 && h1Ema21 > h1Ema50 : livePrice < h1Ema50 && h1Ema21 < h1Ema50;
      const singleEmaH1 = isBuy ? livePrice > h1Ema50 : livePrice < h1Ema50;
      const counterH1 = isBuy ? livePrice < h1Ema21 && livePrice < h1Ema50 : livePrice > h1Ema21 && livePrice > h1Ema50;

      if (fullH1) {
        h1BiasMatched = true;
        h1Pts = 13;
      } else if (structH1) {
        h1BiasMatched = true;
        h1Pts = 9;
      } else if (singleEmaH1) {
        h1BiasMatched = true;
        h1Pts = 5;
      } else if (counterH1) {
        h1BiasMatched = false;
        h1Pts = -12;
      }
    } else if (h1Sorted.length >= 25) {
      const h1Closes = h1Sorted.map(c => c.close);
      const h1Ema21 = computeEMA(h1Closes, 21)!;
      if ((isBuy && livePrice > h1Ema21) || (!isBuy && livePrice < h1Ema21)) {
        h1BiasMatched = true;
        h1Pts = 8;
      } else {
        h1BiasMatched = false;
        h1Pts = -8;
      }
    }

    // 4. Target Timeframe Real SMC Structure (0-20 pts strictly from M15, H1, or H4 candles)
    const smc = detectSMCOnTimeframe(tfSorted, livePrice, isBuy);
    let smcPts = 0;
    if (smc.hasData) {
      if (smc.hasFvg) smcPts += 6;
      if (smc.hasBos) smcPts += 4;
      if (smc.isNearEmaPullback) smcPts += 4;
      else if (smc.pullbackDistAtr <= 1.8) smcPts += 2;
      if (smc.hasRejectionWick) smcPts += 4;
      if (smc.hasVolumeOrRangeExpansion) smcPts += 2;
    }

    // 5. Target Timeframe Momentum & Volatility: Real ADX(14) + RSI(14) (0-12 pts)
    let momentumPts = 0;
    const tfCloses = tfSorted.map(c => c.close);
    const tfAdx = tfSorted.length >= 30 ? computeADX(tfSorted, 14) : null;
    const tfRsi = tfCloses.length >= 16 ? computeRSI(tfCloses, 14) : null;
    const tfDiAligned = tfAdx ? (isBuy ? tfAdx.plusDI > tfAdx.minusDI : tfAdx.minusDI > tfAdx.plusDI) : false;

    if (tfAdx && tfDiAligned) {
      if (tfAdx.adx >= 25) momentumPts += 6;
      else if (tfAdx.adx >= 18) momentumPts += 4;
      else if (tfAdx.adx >= 14) momentumPts += 2;
    }

    if (tfRsi !== null) {
      if (isBuy) {
        if (tfRsi >= 42 && tfRsi <= 64) momentumPts += 6;
        else if ((tfRsi >= 34 && tfRsi < 42) || (tfRsi > 64 && tfRsi <= 68)) momentumPts += 3;
        else if (tfRsi > 68 && tfRsi <= 73) momentumPts -= 6;
        else if (tfRsi > 73) momentumPts -= 12;
      } else {
        if (tfRsi >= 36 && tfRsi <= 58) momentumPts += 6;
        else if ((tfRsi > 58 && tfRsi <= 66) || (tfRsi >= 32 && tfRsi < 36)) momentumPts += 3;
        else if (tfRsi >= 27 && tfRsi < 32) momentumPts -= 6;
        else if (tfRsi < 27) momentumPts -= 12;
      }
    }

    const atrCheck = this.evaluateAtrVolatility(pair, livePrice, tfSorted.length >= 15 ? tfSorted : h4Sorted);
    const atrAdxPassed = Boolean(
      tfSorted.length >= 15 &&
        atrCheck.displacementMultiple >= 0.70 &&
        (tfAdx === null || (tfAdx.adx >= 18 && tfDiAligned))
    );

    // 6. Live Currency Strength Divergence Fuel (0-11 pts, directional)
    let ccyFuel = 0;
    if (directionalDelta >= 3.5) ccyFuel = 11;
    else if (directionalDelta >= 2.0) ccyFuel = 8;
    else if (directionalDelta >= 1.0) ccyFuel = 6;
    else if (directionalDelta >= 0.3) ccyFuel = 4;
    else if (directionalDelta >= 0) ccyFuel = 2;

    // 7. Real Liquidity Sweep & Reclaim (0-8 pts)
    const sweepRes = this.checkLiquiditySweep(pair, isBuy, livePrice, {
      h1Candles: h1Sorted,
      h4Candles: h4Sorted,
      d1Candles: d1Sorted,
      atrValue: atrCheck.atrValue
    });
    const sweepPts = sweepRes.isLiquiditySwept ? 8 : sweepRes.isNearLiquidityLevel ? 4 : 0;

    // 8. Real Session Killzone Timing (0-4 pts)
    const timeFilterRes = this.evaluateTimeFilter(strategy);
    const sessionPts = timeFilterRes.timeFilterMatched ? 4 : timeFilterRes.isPartialSession ? 2 : 0;

    // 9. Spread / Rollover / News Blackout / H4 Overextension Gates
    const nowUtc = new Date();
    const utcHour = nowUtc.getUTCHours();
    const isRolloverHour = utcHour >= 21 && utcHour < 23;
    const spreadTooHigh = atrCheck.spreadTooHigh || isRolloverHour;

    const newsGuard = economicCalendarService.getNewsGuard(pair.symbol);
    const isNewsBlackout = Boolean(
      newsGuard && newsGuard.isWarning && newsGuard.minutesUntil >= -15 && newsGuard.minutesUntil <= 30
    );

    const h4AtrPips = Math.max(8, Math.round(calculatePips(pair, livePrice, livePrice + h4AtrVal, true)));
    const pullbackRes = this.evaluateTrendRiderPullback(pair, livePrice, isBuy, tf, h4AtrPips, h4Filter);
    const isOverextended = pullbackRes.isOverextended;
    const isPullbackMitigated = pullbackRes.isPullbackMitigated;

    // 10. Real SMC Premium/Discount Swing Range & Anti-Chase Guard (intraday H1 48h range or H4 fallback)
    const swingCandles = h1Sorted.length >= 16 ? h1Sorted : h4Sorted;
    const swingEval = evaluateSwingRangePosition(
      pair,
      swingCandles,
      livePrice,
      isBuy,
      tfRsi,
      smc.hasData ? smc.ema21 : null,
      atrCheck.atrValue
    );

    const pullbackDetail = swingEval.chaseReason || pullbackRes.pullbackDetail;

    const swingAdjustment = swingEval.hasData
      ? (swingEval.isExtremeChase ? -24 : swingEval.isChasingZone ? -16 : swingEval.isInValueZone ? 6 : 0)
      : 0;
    const spreadPenalty = spreadTooHigh ? 15 : 0;
    const overextPenalty = isOverextended ? 15 : 0;
    const newsPenalty = isNewsBlackout ? 20 : 0;

    let score = h4Pts + d1Pts + h1Pts + smcPts + momentumPts + ccyFuel + sweepPts + sessionPts + swingAdjustment - spreadPenalty - newsPenalty - overextPenalty;

    // Pure real 0-100 clamp (NO artificial 95 ceiling, NO static floors)
    score = Math.max(0, Math.min(100, Math.round(score)));

    const bdH4 = Math.round(h4Pts);
    const bdH1M15 = Math.round(h1Pts + smcPts);
    const bdStrength = Math.round(ccyFuel);
    const bdD1Liq = Math.round(d1Pts + sweepPts);
    const bdAtrSpread = Math.round(momentumPts + sessionPts + swingAdjustment - spreadPenalty - overextPenalty);
    const confluenceBreakdown: ConfluenceBreakdown = {
      h4Score: bdH4,
      h1M15Score: bdH1M15,
      strengthScore: bdStrength,
      d1LiquidityScore: bdD1Liq,
      atrSpreadScore: bdAtrSpread,
      newsPenalty,
      total: score,
      summaryText: `H4:${bdH4} + H1/M15:${bdH1M15} + Strength:${bdStrength} + D1/Liq:${bdD1Liq} + ATR:${bdAtrSpread}${newsPenalty > 0 ? ` - News:${newsPenalty}` : ''} = ${score}`,
      sources: {
        h4Bars: h4Sorted.length,
        h1Bars: h1Sorted.length,
        m15Bars: m15Candles?.length || 0,
        d1Bars: d1Sorted.length
      }
    };

    return {
      tf,
      score,
      isBuy,
      h4BiasMatched: true,
      h4TrendConflict: false,
      h1BiasMatched,
      obFvgAligned: smc.obFvgAligned,
      timeFilterMatched: timeFilterRes.timeFilterMatched,
      atrAdxPassed,
      spreadTooHigh,
      d1BiasMatched,
      isNewsBlackout,
      isOverextended,
      isChasingZone: swingEval.isChasingZone,
      isChasingExtreme: swingEval.isExtremeChase,
      rangePosPct: swingEval.hasData ? swingEval.rangePosPct : undefined,
      chaseWarning: swingEval.chaseReason,
      pullbackTargetPrice: swingEval.pullbackEntryTarget,
      isPullbackMitigated,
      pullbackDetail,
      volumeExhaustionConfirmed: smc.volumeExhaustionConfirmed,
      isLiquiditySwept: sweepRes.isLiquiditySwept,
      adxValue: tfAdx?.adx ?? null,
      rsiValue: tfRsi,
      smcSummary: smc.smcSummary,
      breakdown: `${tf}:${score}`,
      confluenceBreakdown
    };
  }

  /**
   * Runs M15, H1, H4 in background using real market candles, selects best timeframe according to tie-breaker rules:
   * 1st priority: H1 (1 Hour)
   * 2nd priority: M15 (15 Min)
   * 3rd priority: H4 (4 Hours)
   *
   * If highest score < 65, returns isEligible = false (weak setups eliminated).
   */
  public evaluateBestTimeframeForStrategy(
    pair: ForexPair,
    strategy: StrategyType,
    livePrice: number,
    preloaded?: {
      m15Candles?: CandleStick[];
      h1Candles?: CandleStick[];
      h4Candles?: CandleStick[];
      d1Candles?: CandleStick[];
      strengthSnap?: CurrencyStrengthSnapshot;
      h4Filter?: H4EmaFilterResult;
    }
  ): BestTfEvaluationResult {
    const strengthSnap = preloaded?.strengthSnap || currencyStrengthService.getLiveCurrencyStrengthSnapshot();
    const h4Candles = preloaded?.h4Candles ?? this.getCachedCandles(pair.symbol, 'H4');
    const h1Candles = preloaded?.h1Candles ?? this.getCachedCandles(pair.symbol, 'H1');
    const m15Candles = preloaded?.m15Candles ?? this.getCachedCandles(pair.symbol, 'M15');
    const d1Candles = preloaded?.d1Candles ?? this.getCachedCandles(pair.symbol, 'D1');
    const h4Filter = preloaded?.h4Filter ?? evaluateH4EmaFilter(h4Candles, livePrice);

    const makeBlockedResult = (
      blockedStatus: 'NO_DATA' | 'NO_CANDLES' | 'NO_TRADE' | 'CONFLICT_BLOCKED' | 'LOW_SCORE',
      blockedReason: string
    ): BestTfEvaluationResult => {
      const atrCheck = this.evaluateAtrVolatility(pair, livePrice > 0 ? livePrice : pair.basePrice, h4Candles);
      return {
        winningTf: 'H1',
        highestScore: 0,
        isEligible: false,
        blockedStatus,
        blockedReason,
        h4Filter,
        strengthSnap,
        m15Score: 0,
        h1Score: 0,
        h4Score: 0,
        scoreBreakdownText: blockedReason,
        isBuy: false,
        atrPips: atrCheck.atrPips,
        atrValue: atrCheck.atrValue,
        slMultiplier: 1.0,
        tpMultiplier: 2.0,
        riskRewardLabel: '1:2.0',
        rationale: blockedReason,
        triggerDetail: blockedReason
      };
    };

    // STEP 1 GATE: Live Currency Strength data must exist
    if (!strengthSnap.hasLiveData || strengthSnap.items.length === 0) {
      return makeBlockedResult('NO_DATA', 'NO DATA - CANNOT GENERATE SIGNAL');
    }

    // STEP 3 GATE: Mandatory Real H4 50 EMA & 9 EMA Trend Filter
    if (!h4Filter.ok || h4Filter.status === 'NO_CANDLES') {
      return makeBlockedResult('NO_CANDLES', 'NO CANDLES - NO SIGNAL');
    }

    if (h4Filter.bias === 'NO_TRADE') {
      return makeBlockedResult('NO_TRADE', h4Filter.reason);
    }

    // STEP 4 GATE: Live Conflict Filter against currency bias
    const intendedDirection = h4Filter.bias === 'BUY_ONLY' ? 'BUY' : 'SELL';
    const conflictCheck = currencyStrengthService.isSignalAlignedWithCurrencyStrength(
      pair.symbol,
      intendedDirection,
      strengthSnap
    );
    if (conflictCheck.blocked) {
      return makeBlockedResult(
        'CONFLICT_BLOCKED',
        conflictCheck.reason || `Blocked ${intendedDirection} ${pair.symbol} by Currency Conflict Filter`
      );
    }

    // STEP 5 GATE: Hard ADX Chop / Regime Filter (avoid low-momentum ranging whipsaws)
    const isBuyDir = h4Filter.bias === 'BUY_ONLY';
    const h1AdxGate = h1Candles && h1Candles.length >= 30 ? computeADX(sortCandlesAsc(h1Candles), 14) : null;
    const h4AdxGate = h4Candles && h4Candles.length >= 30 ? computeADX(sortCandlesAsc(h4Candles), 14) : null;
    const h1ChopBlocked = Boolean(
      h1AdxGate && (h1AdxGate.adx < 18 || !(isBuyDir ? h1AdxGate.plusDI > h1AdxGate.minusDI : h1AdxGate.minusDI > h1AdxGate.plusDI))
    );
    const h4ChopBlocked = Boolean(
      h4AdxGate && (h4AdxGate.adx < 16 || !(isBuyDir ? h4AdxGate.plusDI > h4AdxGate.minusDI : h4AdxGate.minusDI > h4AdxGate.plusDI))
    );
    if (h1ChopBlocked || h4ChopBlocked) {
      const adxMsg = h4ChopBlocked
        ? `Choppy H4 Market Blocked (ADX ${h4AdxGate?.adx ?? 0} < 16 or DI opposes ${intendedDirection})`
        : `Choppy H1 Market Blocked (ADX ${h1AdxGate?.adx ?? 0} < 18 or DI opposes ${intendedDirection})`;
      return makeBlockedResult('LOW_SCORE', adxMsg);
    }

    const ctx = { strengthSnap, h4Filter, m15Candles, h1Candles, h4Candles, d1Candles };
    const m15Res = this.scoreTimeframe(pair, strategy, 'M15', livePrice, ctx);
    const h1Res = this.scoreTimeframe(pair, strategy, 'H1', livePrice, ctx);
    const h4Res = this.scoreTimeframe(pair, strategy, 'H4', livePrice, ctx);

    const m15 = m15Res.score;
    const h1 = h1Res.score;
    const h4 = h4Res.score;

    let winningTf: 'M15' | 'H1' | 'H4' = 'H1';
    const highestScore = Math.max(m15, h1, h4);

    // Strict tie-breaker evaluation: 1st H1 -> 2nd M15 -> 3rd H4
    if (h1 >= m15 && h1 >= h4) {
      winningTf = 'H1';
    } else if (m15 >= h4) {
      winningTf = 'M15';
    } else {
      winningTf = 'H4';
    }

    const winningCandles = winningTf === 'M15' ? m15Candles : winningTf === 'H1' ? h1Candles : h4Candles;
    const atrCheck = this.evaluateAtrVolatility(pair, livePrice, winningCandles && winningCandles.length >= 15 ? winningCandles : h4Candles);
    const winningRes = winningTf === 'H4' ? h4Res : winningTf === 'H1' ? h1Res : m15Res;
    const scoreBreakdownText = `M15:${m15} | H1:${h1} | H4:${h4} - ${winningTf} won`;

    // Enforce minimum 60 confluence rate: never generate or display new setups below 60 confluence
    if (highestScore < 60) {
      return {
        ...makeBlockedResult(
          'LOW_SCORE',
          `Confluence ${highestScore}/100 below 60 minimum (${winningTf} M15:${m15} | H1:${h1} | H4:${h4})`
        ),
        winningTf,
        highestScore,
        m15Score: m15,
        h1Score: h1,
        h4Score: h4,
        scoreBreakdownText,
        isBuy: h4Filter.bias === 'BUY_ONLY',
        confluenceBreakdown: winningRes.confluenceBreakdown
      };
    }
    const isEligible = true;
    const winningSmc = detectSMCOnTimeframe(winningCandles, livePrice, h4Filter.bias === 'BUY_ONLY');
    const isBuy = h4Filter.bias === 'BUY_ONLY';

    let slMultiplier = 1.0;
    let tpMultiplier = 2.5;
    let riskRewardLabel = '1:2.5';
    let rationale = '';
    let triggerDetail = '';

    const isOverextended = winningRes.isOverextended;
    const isPullbackMitigated = winningRes.isPullbackMitigated;
    const pullbackDetail = winningRes.pullbackDetail;
    const ema50Str = h4Filter.ema50 !== null ? h4Filter.ema50.toFixed(pair.pipDigits) : 'N/A';
    const ema9Str = h4Filter.ema9 !== null ? h4Filter.ema9.toFixed(pair.pipDigits) : 'N/A';
    const smcTag = winningSmc.hasData ? winningSmc.smcSummary : 'H4 Structure';

    if (strategy === 'GOLD_HUNTER') {
      slMultiplier = 1.0;
      tpMultiplier = 2.5;
      riskRewardLabel = '1:2.5';
      triggerDetail = `H4 50 EMA (${ema50Str}) & 9 EMA (${ema9Str}) ${h4Filter.bias} · ${winningTf} SMC: ${smcTag}`;
      rationale = `[GOLD HUNTER] Real H4 EMA Lock (${h4Filter.bias}): Price ${livePrice} vs H4 50 EMA (${ema50Str}) & 9 EMA (${ema9Str}). ${winningTf} ${smcTag} (ADX ${winningRes.adxValue ?? 'N/A'}, RSI ${winningRes.rsiValue ?? 'N/A'}). Risk:Reward 1:2.5.`;
    } else if (strategy === 'LONDON_KILLER') {
      slMultiplier = 0.95;
      tpMultiplier = 2.0;
      riskRewardLabel = '1:2.0';
      triggerDetail = `H4 ${h4Filter.bias} (50 EMA ${ema50Str} / 9 EMA ${ema9Str}) · ${winningTf} ${smcTag}`;
      rationale = `[LONDON KILLER] Real H4 EMA Lock (${h4Filter.bias}): Price ${livePrice} vs H4 50 EMA (${ema50Str}) & 9 EMA (${ema9Str}). ${winningTf} structure: ${smcTag}. Risk:Reward 1:2.0.`;
    } else {
      slMultiplier = isPullbackMitigated ? 0.85 : 1.10;
      tpMultiplier = isPullbackMitigated ? 2.90 : 3.30;
      riskRewardLabel = isPullbackMitigated ? '1:3.4' : '1:3.0';

      triggerDetail = `H4 ${h4Filter.bias}: Price (${livePrice}) ${isBuy ? '>' : '<'} H4 50 EMA (${ema50Str}) & 9 EMA (${ema9Str}) · ${winningTf} ${smcTag}`;
      rationale = `[TREND RIDER] Real H4 EMA Lock (${h4Filter.bias}): Price (${livePrice}) ${isBuy ? 'above' : 'below'} H4 50 EMA (${ema50Str}) & 9 EMA (${ema9Str}). ${winningTf} SMC: ${smcTag} (ADX ${winningRes.adxValue ?? 'N/A'}, RSI ${winningRes.rsiValue ?? 'N/A'}). ${riskRewardLabel} RR.`;
    }

    const newsGuard = economicCalendarService.getNewsGuard(pair.symbol);
    const isNewsBlackout = Boolean(newsGuard && newsGuard.isWarning && newsGuard.minutesUntil >= -15 && newsGuard.minutesUntil <= 30);
    const d1MacroTrend: 'BULLISH' | 'BEARISH' = isBuy ? 'BULLISH' : 'BEARISH';
    const isD1Aligned = Boolean(winningRes.d1BiasMatched);

    const nowUtc = new Date();
    const isRolloverHour = nowUtc.getUTCHours() >= 21 && nowUtc.getUTCHours() < 23;
    const spreadRiskWarning = isRolloverHour
      ? 'Rollover Spread Expansion Window (21:00-23:00 UTC)'
      : (pair.spreadPips > 2.5 ? `Elevated Spread: ${pair.spreadPips}p` : undefined);

    return {
      winningTf,
      highestScore,
      isEligible,
      blockedStatus: undefined,
      blockedReason: undefined,
      h4Filter,
      strengthSnap,
      m15Score: m15,
      h1Score: h1,
      h4Score: h4,
      scoreBreakdownText,
      isBuy,
      atrPips: atrCheck.atrPips,
      atrValue: atrCheck.atrValue,
      slMultiplier,
      tpMultiplier,
      riskRewardLabel,
      rationale,
      triggerDetail,
      d1MacroTrend,
      isD1Aligned,
      isNewsBlackout,
      newsEventTitle: newsGuard?.eventTitle,
      newsMinutesUntil: newsGuard?.minutesUntil,
      spreadRiskWarning,
      volumeExhaustionConfirmed: Boolean(winningRes.volumeExhaustionConfirmed),
      isOverextended,
      isChasingZone: Boolean(winningRes.isChasingZone),
      isChasingExtreme: Boolean(winningRes.isChasingExtreme),
      rangePosPct: winningRes.rangePosPct,
      chaseWarning: winningRes.chaseWarning,
      pullbackTargetPrice: winningRes.pullbackTargetPrice ?? null,
      isPullbackMitigated,
      pullbackDetail,
      timeFilterMatched: winningRes.timeFilterMatched,
      isNearEmaPullback: winningSmc.isNearEmaPullback,
      smcSummary: winningSmc.smcSummary,
      adxValue: winningRes.adxValue,
      rsiValue: winningRes.rsiValue,
      confluenceBreakdown: winningRes.confluenceBreakdown
    };
  }

  /**
   * Generates ONE institutional signal for a pair adhering to:
   * - Best TF Wins (runs M15, H1, H4 in background, picks highest score >= 70)
   * - Accurate SL & TP calculation
   * - Real strategy risk:reward
   */
  public generateInstitutionalSignal(
    pair: ForexPair,
    overridePrice?: number,
    strategy: StrategyType = 'GOLD_HUNTER',
    existingCreatedAtMs?: number,
    existingId?: string,
    forceStandby?: boolean,
    correlationGuardOptions?: {
      isCorrelationBlocked?: boolean;
      correlationBlockReason?: string;
      correlationExposureTag?: string;
    },
    demotionOptions?: {
      isDemotedFromActive?: boolean;
      demotionReason?: string;
      demotionAudit?: ForexSignal['demotionAudit'];
    },
    auditContext?: {
      m15Candles?: CandleStick[];
      h1Candles?: CandleStick[];
      h4Candles?: CandleStick[];
      d1Candles?: CandleStick[];
      strengthSnap?: CurrencyStrengthSnapshot;
      h4Filter?: H4EmaFilterResult;
      backtestStats?: RealPairBacktestStats;
    }
  ): ForexSignal | null {
    const hasLive = overridePrice && overridePrice > 0 ? true : realPriceService.hasLivePrice(pair.symbol);
    if (!hasLive) {
      return null; // NEVER use static basePrice to form signals
    }
    const livePrice = overridePrice && overridePrice > 0
      ? overridePrice
      : realPriceService.getPrice(pair.symbol);

    if (!livePrice || livePrice <= 0) {
      return null;
    }

    const m15Candles = auditContext?.m15Candles ?? this.getCachedCandles(pair.symbol, 'M15');
    const h1Candles = auditContext?.h1Candles ?? this.getCachedCandles(pair.symbol, 'H1');
    const h4Candles = auditContext?.h4Candles ?? this.getCachedCandles(pair.symbol, 'H4');
    const d1Candles = auditContext?.d1Candles ?? this.getCachedCandles(pair.symbol, 'D1');

    const evalResult = this.evaluateBestTimeframeForStrategy(pair, strategy, livePrice, {
      m15Candles,
      h1Candles,
      h4Candles,
      d1Candles,
      strengthSnap: auditContext?.strengthSnap,
      h4Filter: auditContext?.h4Filter
    });
    if (!evalResult.isEligible || !evalResult.h4Filter || !evalResult.h4Filter.ok) {
      return null;
    }
    if (evalResult.h4Filter.bias === 'NO_TRADE') return null;
    if (evalResult.h4Filter.bias === 'SELL_ONLY' && evalResult.isBuy) return null;
    if (evalResult.h4Filter.bias === 'BUY_ONLY' && !evalResult.isBuy) return null;

    const {
      winningTf,
      highestScore,
      scoreBreakdownText,
      isBuy,
      atrPips,
      atrValue,
      slMultiplier,
      tpMultiplier,
      riskRewardLabel,
      rationale,
      triggerDetail,
      d1MacroTrend,
      isD1Aligned,
      isNewsBlackout,
      newsEventTitle,
      newsMinutesUntil,
      spreadRiskWarning,
      volumeExhaustionConfirmed
    } = evalResult;

    // Layer 9: Real Pre-Entry Liquidity Sweep Confirmation Guard
    const sweepRes = this.checkLiquiditySweep(pair, isBuy, livePrice, {
      h1Candles,
      h4Candles,
      d1Candles,
      atrValue
    });

    const isCorrelationBlocked = Boolean(correlationGuardOptions?.isCorrelationBlocked);

    const stratConfig = STRATEGY_CONFIGS[strategy];
    const signalType: SignalType = isBuy ? 'BUY_MARKET' : 'SELL_MARKET';

    // Analytically Proven, Timeframe-Respecting SMC & ATR Stop Loss & Take Profit Generation
    const isGold = pair.symbol.includes('XAU');
    const isJpy = pair.symbol.includes('JPY');

    // Timeframe-specific structural anchors:
    const bounds = getTimeframeBounds(winningTf, isGold, isJpy);
    const baseSlPips = (bounds.minSl + bounds.maxSl) / 2;

    // Volatility scaling derived from live ATR and strategy parameters
    const atrFactor = Math.min(1.20, Math.max(0.85, atrPips / 35));
    const rawSlPips = baseSlPips * atrFactor * slMultiplier;

    // Clamped strictly between timeframe-specific min and max
    const slDistPips = Math.min(bounds.maxSl, Math.max(bounds.minSl, Math.round(rawSlPips * 10) / 10));

    // Dynamic R:R preserving strict M15 < H1 < H4 Take Profit hierarchy
    const effectiveTpMultiplier = Math.max(bounds.targetRr, Math.min(bounds.targetRr * 1.15, tpMultiplier));
    const tp1DistPips = Math.min(bounds.maxTp1, Math.max(bounds.minTp1, Math.round(slDistPips * effectiveTpMultiplier * 10) / 10));
    const tp2DistPips = Math.round(tp1DistPips * 1.5 * 10) / 10;
    const tp3DistPips = Math.round(tp1DistPips * 2.0 * 10) / 10;

    const slDist = pipsToPrice(pair, slDistPips);
    const tp1Dist = pipsToPrice(pair, tp1DistPips);
    const tp2Dist = pipsToPrice(pair, tp2DistPips);
    const tp3Dist = pipsToPrice(pair, tp3DistPips);

    const sym = pair.symbol.toUpperCase();
    const cleanSymId = pair.symbol.replace(/[^A-Za-z0-9]/g, '');
    const symSeed = cleanSymId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const isChaseGuarded = Boolean(evalResult.isChasingExtreme || evalResult.isChasingZone || evalResult.isOverextended);
    const isInValueZone = evalResult.rangePosPct === undefined
      ? true
      : isBuy
      ? evalResult.rangePosPct <= 52
      : evalResult.rangePosPct >= 48;
    // Order type comes from real value-zone discipline & Anti-Chase Guard:
    // Never market-buy above Equilibrium (>52%) or market-sell below Equilibrium (<48%); force LIMIT orders on pullback
    const isPullbackLimit =
      isChaseGuarded ||
      !isInValueZone ||
      (!sweepRes.isLiquiditySwept &&
        !evalResult.isPullbackMitigated &&
        !evalResult.isNearEmaPullback &&
        (strategy === 'GOLD_HUNTER' || strategy === 'TREND_RIDER'));
    const resolvedSignalType: SignalType = isPullbackLimit
      ? (isBuy ? 'BUY_LIMIT' : 'SELL_LIMIT')
      : signalType;
    const isLimitOrStop = resolvedSignalType.includes('LIMIT') || resolvedSignalType.includes('STOP');

    const round = (val: number) => Number(val.toFixed(pair.pipDigits));
    const weekendState = getWeekendMarketState();
    const isWeekend = weekendState.isWeekend;

    let entryOffset = 0;
    if (isLimitOrStop) {
      const targetPrice = evalResult.pullbackTargetPrice;
      const validStructuralTarget =
        typeof targetPrice === 'number' &&
        Number.isFinite(targetPrice) &&
        ((isBuy && targetPrice < livePrice) || (!isBuy && targetPrice > livePrice));

      if (validStructuralTarget) {
        entryOffset = targetPrice! - livePrice;
      } else {
        const atrStep = Math.max(pipsToPrice(pair, 4), atrValue * 0.45);
        entryOffset = isBuy ? -atrStep : atrStep;
      }
    }

    // Market execution orders strictly execute at current live price (0 distance to entry);
    // Limit orders execute strictly on discount (BUY_LIMIT < livePrice) or premium (SELL_LIMIT > livePrice) pullback.
    const entryPrice = isWeekend && !isChaseGuarded
      ? round(livePrice)
      : !isLimitOrStop
      ? round(livePrice)
      : round(livePrice + entryOffset);
    const stopLoss = round(isBuy ? entryPrice - slDist : entryPrice + slDist);
    const takeProfit1 = round(isBuy ? entryPrice + tp1Dist : entryPrice - tp1Dist);
    const takeProfit2 = round(isBuy ? entryPrice + tp2Dist : entryPrice - tp2Dist);
    const takeProfit3 = round(isBuy ? entryPrice + tp3Dist : entryPrice - tp3Dist);

    // Active threshold derived strictly from real institutional confluence + Anti-Chase Guard
    const isStandby = Boolean(
      forceStandby ||
        isCorrelationBlocked ||
        isChaseGuarded ||
        highestScore < 76 ||
        (strategy === 'LONDON_KILLER' && !sweepRes.isLiquiditySwept && highestScore < 82)
    );

    const calculatedCurrentPips = isStandby || isWeekend
      ? 0.0
      : Math.round(calculatePips(pair, entryPrice, livePrice, isBuy) * 10) / 10;

    const pipsToTp1 = Math.abs(calculatePips(pair, entryPrice, takeProfit1, isBuy));
    const beRatio = winningTf === 'H4' ? 0.30 : 0.45;
    const isBreakevenArmed = !isStandby && !isWeekend && calculatedCurrentPips >= Math.max(12, pipsToTp1 * beRatio);
    const beBufferPips = 1.0;
    const breakevenPrice = round(entryPrice + pipsToPrice(pair, isBuy ? beBufferPips : -beBufferPips));

    let standbyTriggerDetail = '';
    if (isCorrelationBlocked) {
      standbyTriggerDetail = correlationGuardOptions?.correlationBlockReason || 'BLOCKED: Max Currency Correlation Exposure Limit Reached';
    } else if (evalResult.chaseWarning) {
      standbyTriggerDetail = evalResult.chaseWarning;
    } else if (!sweepRes.isLiquiditySwept && strategy === 'LONDON_KILLER') {
      standbyTriggerDetail = sweepRes.liquiditySweepDetail;
    } else if (highestScore < 60) {
      standbyTriggerDetail = `Below 60% Confluence Watch (${highestScore}/100). H4 ${isBuy ? 'Bullish' : 'Bearish'} bias aligned on ${winningTf}; awaiting stronger momentum/SMC confirmation.`;
    } else if (strategy === 'GOLD_HUNTER') {
      standbyTriggerDetail = `H4 Trend Bias locked (${isBuy ? 'Bullish' : 'Bearish'}). Score ${highestScore}/100. Monitoring ${winningTf} ${evalResult.smcSummary || 'structure'} for entry trigger.`;
    } else if (strategy === 'LONDON_KILLER') {
      standbyTriggerDetail = `Observing ${sweepRes.liquiditySweepType} liquidity boundary (${formatPrice(pair, sweepRes.liquiditySweepLevel)}). Awaiting confirmation before trigger.`;
    } else {
      standbyTriggerDetail = evalResult.pullbackDetail
        || `Tracking H4 EMA 9/50 ${isBuy ? 'Bullish' : 'Bearish'} trend. Current score ${highestScore}/100.`;
    }

    const timeFilterRes = this.evaluateTimeFilter(strategy);
    const checklist: ConfluenceChecklistItem[] = [
      {
        title: isChaseGuarded
          ? 'Premium/Discount Anti-Chase Guard'
          : strategy === 'TREND_RIDER'
          ? (evalResult.isPullbackMitigated ? 'Trend Rider OTE Pullback Retest' : 'Trend Rider SMC Rule')
          : `${stratConfig.shortBadge} Strategy Rule`,
        isConfirmed: !isChaseGuarded,
        detail: isStandby ? standbyTriggerDetail : (evalResult.pullbackDetail || triggerDetail)
      },
      {
        title: 'Daily (D1) Trend Direction Gate',
        isConfirmed: Boolean(isD1Aligned),
        detail: isD1Aligned
          ? `Real D1 EMA20/50 aligned with H4 (${d1MacroTrend})`
          : `D1 Neutral or Counter-Flow (${d1MacroTrend})`
      },
      {
        title: 'High-Impact News Clearance',
        isConfirmed: !isNewsBlackout,
        detail: isNewsBlackout
          ? `🚨 Active News Blackout Window: ${newsEventTitle || 'Tier-1 Event'} in ${newsMinutesUntil}m`
          : 'Clean macro window (No red-folder releases < 30m)'
      },
      {
        title: 'Volume & Candle Exhaustion',
        isConfirmed: Boolean(volumeExhaustionConfirmed),
        detail: volumeExhaustionConfirmed
          ? `${winningTf} rejection/displacement wick with volume/range expansion verified`
          : `No strong ${winningTf} rejection wick or volume expansion yet (${evalResult.smcSummary || 'Neutral'})`
      },
      {
        title: 'Breakeven Trailing Guard',
        isConfirmed: Boolean(isBreakevenArmed),
        detail: isBreakevenArmed
          ? `SL protected at Breakeven (${formatPrice(pair, breakevenPrice)})`
          : isStandby
          ? 'Armed upon trade activation'
          : 'Armed to trail to +1p buffer upon 1:1 / TP1 touch'
      },
      {
        title: 'Best Timeframe MTF Evaluation',
        isConfirmed: highestScore >= 76,
        detail: `${scoreBreakdownText} (Score: ${highestScore}/100 • ADX: ${evalResult.adxValue ?? 'N/A'} • RSI: ${evalResult.rsiValue ?? 'N/A'})`
      },
      {
        title: 'Institutional Invalidation & Risk',
        isConfirmed: !spreadRiskWarning,
        detail: `SL ${slMultiplier.toFixed(1)}x ATR (${slDistPips}p) • TP ${tpMultiplier.toFixed(1)}x ATR (${tp1DistPips}p) • ${riskRewardLabel} RR`
      },
      {
        title: 'Session Killzone & Volume Filter',
        isConfirmed: Boolean(timeFilterRes.timeFilterMatched),
        detail: timeFilterRes.sessionName
      },
      {
        title: 'Layer 9: Pre-Entry Liquidity Sweep Confirmation',
        isConfirmed: sweepRes.isLiquiditySwept,
        detail: sweepRes.liquiditySweepDetail
      }
    ];

    const randomHex = Math.random().toString(36).slice(2, 6).toUpperCase();
    const isSilver = sym.includes('XAG') || sym.includes('SILVER');
    const id = existingId || `SIG-${cleanSymId}-${strategy}-${winningTf}-${Date.now().toString(36).toUpperCase()}-${randomHex}`;

    const effectiveStatus: SignalStatus = isStandby
      ? 'STANDBY'
      : (isWeekend || isLimitOrStop ? 'PENDING' : 'RUNNING');
    const effectiveTimestamp = isStandby
      ? 'Monitoring Standby'
      : isWeekend
      ? 'Pending for Sun Open'
      : 'Fresh Live Scan';
    
    const now = Date.now();
    const pairAnchor = PersistenceManager.getPairActiveAnchor(pair.symbol);
    const signalAnchor = PersistenceManager.getAnchoredCreatedAt(id);
    const savedStateMap = PersistenceManager.getSavedSignalsState();
    const savedForPair = Object.values(savedStateMap).find(
      (item: any) =>
        item &&
        String(item.pair?.symbol || '').toUpperCase() === pair.symbol.toUpperCase() &&
        !item.closedAtMs &&
        (item.status === 'RUNNING' || item.status === 'PENDING' || item.status === 'STANDBY') &&
        item.createdAtMs > 0
    );
    const savedCreatedAt = savedForPair ? savedForPair.createdAtMs : undefined;

    // Anchor calculation for weekends: Friday active session before 22:00 GMT close
    const fridayAnchor = isGold
      ? weekendState.lastFridayCloseMs - 4 * 3600 * 1000 // Friday 18:00 GMT
      : isSilver
      ? weekendState.lastFridayCloseMs - 6 * 3600 * 1000 // Friday 16:00 GMT
      : weekendState.lastFridayCloseMs - (2 + (symSeed % 4)) * 3600 * 1000;

    let effectiveCreatedAt: number;

    if (isWeekend) {
      effectiveCreatedAt = fridayAnchor;
    } else {
      const maxRetentionMs = winningTf === 'H4' ? 5 * 24 * 3600 * 1000 : 48 * 3600 * 1000;

      // Only inherit existing createdAtMs if it is for the SAME active/pending signal at the same price and direction
      const isSamePriceAndDir =
        savedForPair &&
        Math.abs((savedForPair.entryPrice || 0) - entryPrice) <= pipsToPrice(pair, 2.0) &&
        (savedForPair.type || '').startsWith(isBuy ? 'BUY' : 'SELL');

      const validExistingCreated =
        existingCreatedAtMs && existingCreatedAtMs > 0 && (now - existingCreatedAtMs <= maxRetentionMs)
          ? Math.min(existingCreatedAtMs, now)
          : undefined;
      const validSavedCreated =
        isSamePriceAndDir && savedCreatedAt && savedCreatedAt > 0 && (now - savedCreatedAt <= maxRetentionMs)
          ? Math.min(savedCreatedAt, now)
          : undefined;

      if (validExistingCreated) {
        effectiveCreatedAt = validExistingCreated;
      } else if (validSavedCreated) {
        effectiveCreatedAt = validSavedCreated;
      } else {
        // Brand-new signal scanned right now must always originate at `now` ("Posted Just Now"),
        // never backdated to an earlier chart sweep time.
        effectiveCreatedAt = now;
      }
    }

    PersistenceManager.setExplicitSignalAnchor(id, effectiveCreatedAt);
    PersistenceManager.setPairActiveAnchor(pair.symbol, effectiveCreatedAt);

    const executedAtMs = !isStandby && isLimitOrStop && effectiveStatus === 'RUNNING'
      ? (existingCreatedAtMs ? Math.max(effectiveCreatedAt, now - 60 * 1000) : now)
      : undefined;

    // Real Historical Backtest Statistics (NO deterministic fake Win% / NO invented examples)
    const backtestStats = auditContext?.backtestStats ?? getRealPairBacktestStats(pair.symbol);
    const resolvedWinProb = backtestStats.hasData && backtestStats.winPct !== null ? backtestStats.winPct : 0;
    const resolvedQuality: SignalQuality = backtestStats.hasData ? backtestStats.grade : 'C';
    const resolvedWinPctSource = backtestStats.sourceLabel;

    const h4Filter = evalResult.h4Filter!;
    const strengthSnap = evalResult.strengthSnap!;
    const parts = pair.symbol.split('/');
    const baseCcy = parts[0] || pair.symbol;
    const quoteCcy = parts[1] || 'USD';
    const baseItem = strengthSnap.items.find(s => s.currency === baseCcy);
    const quoteItem = strengthSnap.items.find(s => s.currency === quoteCcy);

    const currencyScoresSnapshot: Record<string, { score: number; change24hPct: number }> = {};
    strengthSnap.items.forEach(item => {
      currencyScoresSnapshot[item.currency] = {
        score: item.strength,
        change24hPct: item.change24h
      };
    });

    const generationAudit: SignalGenerationAudit = {
      signalId: id,
      pairSymbol: pair.symbol,
      direction: isBuy ? 'BUY' : 'SELL',
      orderType: isWeekend ? (isBuy ? 'BUY_LIMIT' : 'SELL_LIMIT') : resolvedSignalType,
      generatedAtMs: effectiveCreatedAt,
      generatedAtIso: new Date(effectiveCreatedAt).toISOString(),
      price: livePrice,
      timeframe: winningTf,
      h4TrendBias: h4Filter.bias,
      ema50: Number((h4Filter.ema50 ?? 0).toFixed(pair.pipDigits + 1)),
      ema9: Number((h4Filter.ema9 ?? 0).toFixed(pair.pipDigits + 1)),
      lastH4CandleTime: h4Filter.lastCandleTime,
      h4CandleCount: h4Filter.candleCount,
      baseCurrency: baseCcy,
      quoteCurrency: quoteCcy,
      baseStrengthScore: baseItem?.strength ?? 0,
      quoteStrengthScore: quoteItem?.strength ?? 0,
      strongestCurrency: strengthSnap.strongestCurrency || '',
      weakestCurrency: strengthSnap.weakestCurrency || '',
      currencyScoresSnapshot,
      winPct: backtestStats.winPct,
      grade: resolvedQuality,
      winPctSource: resolvedWinPctSource,
      backtestTradeCount: backtestStats.tradeCount,
      conflictCheckPassed: true,
      confluenceBreakdown: evalResult.confluenceBreakdown
    };

    PersistenceManager.saveSignalAuditRecord(generationAudit);

    checklist.push({
      title: 'Real H4 EMA 50/9 Trend & Backtest Audit',
      isConfirmed: true,
      detail: `H4 50 EMA: ${generationAudit.ema50} | 9 EMA: ${generationAudit.ema9} (${h4Filter.bias}) • ${resolvedWinPctSource} (Grade ${resolvedQuality})`
    });

    const rawSignal: ForexSignal = {
      id,
      pair: { ...pair, currentPrice: livePrice },
      type: isWeekend ? (isBuy ? 'BUY_LIMIT' : 'SELL_LIMIT') : resolvedSignalType,
      status: effectiveStatus,
      entryPrice,
      currentPrice: livePrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      takeProfit: takeProfit1,
      pips: calculatedCurrentPips,
      riskReward: riskRewardLabel,
      confluenceScore: isCorrelationBlocked ? 0 : highestScore,
      rationale,
      timeframe: winningTf,
      winningTf,
      scoreBreakdownText,
      tfScores: {
        m15: evalResult.m15Score,
        h1: evalResult.h1Score,
        h4: evalResult.h4Score,
        winningTf,
        textSummary: scoreBreakdownText
      },
      timestamp: effectiveTimestamp,
      institutionalFlow: `${stratConfig.shortBadge} [${winningTf}] • ${scoreBreakdownText}`,
      isBestTradeNow: !isStandby && highestScore >= 82 && !isCorrelationBlocked && resolvedQuality !== 'C',
      isPending: !isStandby && (isWeekend || effectiveStatus === 'PENDING'),
      isFavorite: pair.symbol === 'XAU/USD' || pair.symbol === 'EUR/USD',
      hasAlert: false,
      checklist,
      killzone: this.evaluateTimeFilter(strategy).sessionName,
      winProbability: resolvedWinProb,
      quality: resolvedQuality,
      winPctSource: resolvedWinPctSource,
      backtestTradeCount: backtestStats.tradeCount,
      confluenceBreakdown: evalResult.confluenceBreakdown,
      generationAudit,
      economicRisk: isNewsBlackout
        ? `🚨 HIGH RISK NEWS BLACKOUT: ${newsEventTitle || 'Tier-1 Release'} in ${newsMinutesUntil}m`
        : spreadRiskWarning
        ? `Caution: ${spreadRiskWarning}`
        : isWeekend
        ? 'Weekend Market Prep (Markets Closed)'
        : 'Safe Window (MTF & Volatility Gates Verified)',
      validityTimeLeft: isStandby
        ? `⏳ Standby (${highestScore}% - Awaiting Trigger)`
        : isWeekend
        ? 'Pending Sunday 22:00 GMT Open'
        : isBreakevenArmed
        ? `🛡️ Breakeven Protected (+${calculatedCurrentPips}p)`
        : `Active (${calculatedCurrentPips >= 0 ? '+' : ''}${calculatedCurrentPips} pips)`,
      validityExpiresAt: isStandby
        ? `Observing Order Block at ${formatPrice(pair, entryPrice)}`
        : `Targeting TP1 ${formatPrice(pair, takeProfit1)}`,
      invalidationTrigger: `Institutional SL at ${formatPrice(pair, stopLoss)} (${riskRewardLabel} RR)`,
      standbyTriggerDetail: isStandby ? standbyTriggerDetail : undefined,
      standbyObservedLevel: isStandby ? formatPrice(pair, entryPrice) : undefined,
      createdAtMs: effectiveCreatedAt,
      createdAtFormatted: formatSignalDateTime(effectiveCreatedAt),
      executedAtMs,
      executedAtFormatted: executedAtMs ? formatSignalDateTime(executedAtMs) : undefined,
      isLiveSynced: true,
      strategy,
      isNewsBlackout,
      newsBlackoutEvent: newsEventTitle,
      newsMinutesUntil,
      d1MacroTrend,
      isD1Aligned,
      isBreakevenArmed,
      breakevenPrice,
      spreadRiskWarning,
      volumeExhaustionConfirmed,
      isCorrelationBlocked,
      correlationBlockReason: correlationGuardOptions?.correlationBlockReason,
      correlationExposureTag: correlationGuardOptions?.correlationExposureTag,
      isLiquiditySwept: sweepRes.isLiquiditySwept,
      liquiditySweepLevel: sweepRes.liquiditySweepLevel,
      liquiditySweepType: sweepRes.liquiditySweepType,
      liquiditySweepDetail: sweepRes.liquiditySweepDetail,
      liquiditySweepStatusTag: sweepRes.liquiditySweepStatusTag,
      isDemotedFromActive: demotionOptions?.isDemotedFromActive,
      demotionReason: demotionOptions?.demotionReason,
      demotedAtMs: demotionOptions?.isDemotedFromActive ? Date.now() : undefined,
      demotionAudit: demotionOptions?.demotionAudit
    };

    const calibrated = enforceTimeframeHierarchy(adaptiveSlLearningService.calibrateSignalWithSlLessons(rawSignal, pair, livePrice));
    return {
      ...calibrated,
      winProbability: resolvedWinProb,
      quality: resolvedQuality,
      winPctSource: resolvedWinPctSource,
      backtestTradeCount: backtestStats.tradeCount,
      confluenceBreakdown: evalResult.confluenceBreakdown,
      generationAudit
    };
  }

  /**
   * Async orchestrator: Fetches missing real H4, H1, M15, and D1 candles for candidate pairs via strict API providers
   * before evaluating multi-timeframe confluence & generating signals. Never calls fake candle generators.
   */
  public async scanAndReplenishSignalsAsync(
    currentSignals: ForexSignal[],
    allPairs: ForexPair[],
    options?: {
      selectedStrategy?: StrategyType;
      forceFormNewForTopPairs?: boolean;
      targetPairSymbol?: string;
    }
  ): Promise<{
    updatedSignals: ForexSignal[];
    newlyFormed: ForexSignal[];
    globalStatus: string | null;
    blocked: { pairSymbol: string; status: string; reason: string }[];
  }> {
    const activeStrategy = options?.selectedStrategy || 'ALL_STRATEGIES';
    const stratConfig = STRATEGY_CONFIGS[activeStrategy];
    const allowedPairsList = stratConfig?.allowedPairs || [];
    const candidatePairs = (activeStrategy === 'ALL_STRATEGIES' || allowedPairsList.length === 0)
      ? allPairs
      : allPairs.filter(p => allowedPairsList.includes(p.symbol));

    const targetFilter = options?.targetPairSymbol?.toUpperCase();
    const now = Date.now();
    const h4D1TtlMs = 15 * 60 * 1000;
    const intradayTtlMs = 3 * 60 * 1000;

    // Step A: Ensure H4 candles exist for all candidate pairs with live quotes
    const pairsNeedingH4 = candidatePairs.filter(pair => {
      if (targetFilter && pair.symbol.toUpperCase() !== targetFilter) return false;
      if (PersistenceManager.isPairInCloseCooldown(pair.symbol)) return false;
      if (!realPriceService.hasLivePrice(pair.symbol)) return false;
      const cached = this.h4CandleCache.get(pair.symbol.toUpperCase());
      return !cached || now - cached.fetchedAtMs > h4D1TtlMs || cached.candles.length < 50;
    });

    const batchSize = 6;
    for (let i = 0; i < pairsNeedingH4.length; i += batchSize) {
      const batch = pairsNeedingH4.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async pair => {
          const res = await RealCandleFetcherService.fetchRealCandlesStrict(pair.symbol, 'H4', 120, { minBars: 50 });
          this.setRealCandles(
            pair.symbol,
            'H4',
            res.ok ? res.candles : [],
            res.ok ? undefined : (res.error || 'NO CANDLES - NO SIGNAL')
          );
        })
      );
    }

    // Step B: For pairs with valid directional H4 bias (or existing active signals), fetch real H1, M15, D1 candles
    const strengthSnap = currencyStrengthService.getLiveCurrencyStrengthSnapshot();
    const activeSymbols = new Set(
      currentSignals
        .filter(s => s.status === 'RUNNING' || s.status === 'PENDING' || s.status === 'STANDBY')
        .map(s => s.pair.symbol.toUpperCase())
    );

    const mtfPairs = candidatePairs.filter(pair => {
      const sym = pair.symbol.toUpperCase();
      if (targetFilter && sym !== targetFilter) return false;
      if (PersistenceManager.isPairInCloseCooldown(pair.symbol)) return false;
      if (!realPriceService.hasLivePrice(pair.symbol)) return false;
      if (activeSymbols.has(sym)) return true;

      const h4 = this.getCachedCandles(pair.symbol, 'H4');
      const livePrice = realPriceService.getPrice(pair.symbol);
      const h4Filter = evaluateH4EmaFilter(h4, livePrice);
      if (!h4Filter.ok || h4Filter.bias === 'NO_TRADE') return false;
      if (strengthSnap.hasLiveData) {
        const dir = h4Filter.bias === 'BUY_ONLY' ? 'BUY' : 'SELL';
        if (currencyStrengthService.isSignalAlignedWithCurrencyStrength(pair.symbol, dir, strengthSnap).blocked) {
          return false;
        }
      }
      return true;
    });

    for (let i = 0; i < mtfPairs.length; i += 4) {
      const batch = mtfPairs.slice(i, i + 4);
      await Promise.all(
        batch.map(async pair => {
          const sym = pair.symbol.toUpperCase();
          const needH1 = !this.h1CandleCache.get(sym) || now - this.h1CandleCache.get(sym)!.fetchedAtMs > intradayTtlMs || this.h1CandleCache.get(sym)!.candles.length < 30;
          const needM15 = !this.m15CandleCache.get(sym) || now - this.m15CandleCache.get(sym)!.fetchedAtMs > intradayTtlMs || this.m15CandleCache.get(sym)!.candles.length < 30;
          const needD1 = !this.d1CandleCache.get(sym) || now - this.d1CandleCache.get(sym)!.fetchedAtMs > h4D1TtlMs || this.d1CandleCache.get(sym)!.candles.length < 50;

          await Promise.all([
            needH1
              ? RealCandleFetcherService.fetchRealCandlesStrict(pair.symbol, 'H1', 120, { minBars: 30 }).then(res =>
                  this.setRealCandles(pair.symbol, 'H1', res.ok ? res.candles : [], res.error)
                )
              : Promise.resolve(),
            needM15
              ? RealCandleFetcherService.fetchRealCandlesStrict(pair.symbol, 'M15', 120, { minBars: 30 }).then(res =>
                  this.setRealCandles(pair.symbol, 'M15', res.ok ? res.candles : [], res.error)
                )
              : Promise.resolve(),
            needD1
              ? RealCandleFetcherService.fetchRealCandlesStrict(pair.symbol, 'D1', 220, { minBars: 50 }).then(res =>
                  this.setRealCandles(pair.symbol, 'D1', res.ok ? res.candles : [], res.error)
                )
              : Promise.resolve()
          ]);
        })
      );
    }

    const syncRes = this.scanAndReplenishSignals(currentSignals, allPairs, options);
    return {
      ...syncRes,
      globalStatus: this.lastScanGlobalStatus,
      blocked: this.lastBlockedDiagnostics
    };
  }

  /**
   * Scans and replenishes signals ensuring strict enforcement of:
   * 1. Live currency strength & live quotes (NO DATA - CANNOT GENERATE SIGNAL if missing)
   * 2. Real H4 50/9 EMA trend filter (NO CANDLES - NO SIGNAL if missing; SELL ONLY below EMAs; BUY ONLY above EMAs)
   * 3. Real M15, H1, H4, D1 multi-timeframe scoring (NO synthetic/hardcoded confluence)
   * 4. Live currency conflict check (Blocks BUY vs Weakest/Strongest mismatch)
   * 5. Real historical backtest win% & Grade C for 0 trades
   */
  public scanAndReplenishSignals(
    currentSignals: ForexSignal[],
    allPairs: ForexPair[],
    options?: {
      selectedStrategy?: StrategyType;
      forceFormNewForTopPairs?: boolean;
      targetPairSymbol?: string;
      m15CandlesBySymbol?: Record<string, CandleStick[]>;
      h1CandlesBySymbol?: Record<string, CandleStick[]>;
      h4CandlesBySymbol?: Record<string, CandleStick[]>;
      d1CandlesBySymbol?: Record<string, CandleStick[]>;
      overrideStrengthSnapshot?: CurrencyStrengthSnapshot;
    }
  ): {
    updatedSignals: ForexSignal[];
    newlyFormed: ForexSignal[];
  } {
    this.lastScanTimestamp = Date.now();
    this.lastBlockedDiagnostics = [];
    this.lastScanGlobalStatus = null;
    const newlyFormed: ForexSignal[] = [];

    const activeStrategy = options?.selectedStrategy || 'ALL_STRATEGIES';
    const stratConfig = STRATEGY_CONFIGS[activeStrategy];

    // Step 1 Check: Live Currency Strength snapshot
    const strengthSnap = options?.overrideStrengthSnapshot || currencyStrengthService.getLiveCurrencyStrengthSnapshot();
    if (!strengthSnap.hasLiveData || strengthSnap.items.length === 0) {
      this.lastScanGlobalStatus = 'NO DATA - CANNOT GENERATE SIGNAL';
      const retained = currentSignals.filter(s => s.status === 'HIT_TP' || s.status === 'HIT_SL' || Boolean(s.generationAudit));
      return {
        updatedSignals: retained,
        newlyFormed: []
      };
    }

    // Filter candidate pairs strictly to allowed pairs for the selected strategy (or all pairs under ALL_STRATEGIES)
    const allowedPairsList = stratConfig?.allowedPairs || [];
    const candidatePairs = (activeStrategy === 'ALL_STRATEGIES' || allowedPairsList.length === 0)
      ? allPairs
      : allPairs.filter(p => allowedPairsList.includes(p.symbol));

    // Ensure ONE pair = ONE signal only
    const activePairMap = new Map<string, ForexSignal>();
    for (const sig of currentSignals) {
      if (!sig.generationAudit) {
        continue;
      }
      if (PersistenceManager.isPairInCloseCooldown(sig.pair.symbol)) {
        continue;
      }
      if (!isSignalValidAndActive(sig)) {
        continue;
      }
      if (sig.status === 'RUNNING' || sig.status === 'PENDING' || sig.status === 'STANDBY') {
        if (!activePairMap.has(sig.pair.symbol)) {
          activePairMap.set(sig.pair.symbol, sig);
        }
      }
    }

    interface EvaluatedCandidate {
      pair: ForexPair;
      livePrice: number;
      pairStrategy: StrategyType;
      evalRes: ReturnType<SignalScannerService['evaluateBestTimeframeForStrategy']>;
      m15Candles: CandleStick[];
      h1Candles: CandleStick[];
      h4Candles: CandleStick[];
      d1Candles: CandleStick[];
    }

    const evaluations: EvaluatedCandidate[] = [];

    for (const pair of candidatePairs) {
      if (options?.targetPairSymbol && pair.symbol.toUpperCase() !== options.targetPairSymbol.toUpperCase()) {
        continue;
      }

      if (PersistenceManager.isPairInCloseCooldown(pair.symbol)) {
        continue;
      }

      if (!realPriceService.hasLivePrice(pair.symbol)) {
        this.lastBlockedDiagnostics.push({
          pairSymbol: pair.symbol,
          status: 'NO_DATA',
          reason: 'NO DATA - CANNOT GENERATE SIGNAL'
        });
        continue;
      }

      const livePrice = realPriceService.getPrice(pair.symbol);
      if (!livePrice || livePrice <= 0) {
        this.lastBlockedDiagnostics.push({
          pairSymbol: pair.symbol,
          status: 'NO_DATA',
          reason: 'NO DATA - CANNOT GENERATE SIGNAL'
        });
        continue;
      }

      const m15Candles = options?.m15CandlesBySymbol?.[pair.symbol] ?? this.getCachedCandles(pair.symbol, 'M15') ?? [];
      const h1Candles = options?.h1CandlesBySymbol?.[pair.symbol] ?? this.getCachedCandles(pair.symbol, 'H1') ?? [];
      const h4Candles = options?.h4CandlesBySymbol?.[pair.symbol] ?? this.getCachedCandles(pair.symbol, 'H4') ?? [];
      const d1Candles = options?.d1CandlesBySymbol?.[pair.symbol] ?? this.getCachedCandles(pair.symbol, 'D1') ?? [];

      const pairStrategy: StrategyType =
        activeStrategy === 'ALL_STRATEGIES'
          ? (pair.symbol.includes('XAU') || pair.symbol.includes('XAG')
              ? 'GOLD_HUNTER'
              : STRATEGY_CONFIGS.LONDON_KILLER.allowedPairs.includes(pair.symbol)
              ? 'LONDON_KILLER'
              : 'TREND_RIDER')
          : activeStrategy;

      const evalRes = this.evaluateBestTimeframeForStrategy(pair, pairStrategy, livePrice, {
        m15Candles,
        h1Candles,
        h4Candles,
        d1Candles,
        strengthSnap
      });

      if (evalRes.isEligible) {
        evaluations.push({ pair, livePrice, pairStrategy, evalRes, m15Candles, h1Candles, h4Candles, d1Candles });
      } else if (evalRes.blockedStatus && evalRes.blockedReason) {
        this.lastBlockedDiagnostics.push({
          pairSymbol: pair.symbol,
          status: evalRes.blockedStatus,
          reason: evalRes.blockedReason
        });
      }
    }

    evaluations.sort((a, b) => b.evalRes.highestScore - a.evalRes.highestScore);

    const parsePairKeys = (pairSymbol: string, dirIsBuy: boolean): string[] => {
      const upper = pairSymbol.toUpperCase();
      if (upper.includes('/')) {
        const [b, q] = upper.split('/');
        return [
          `${b}:${dirIsBuy ? 'LONG' : 'SHORT'}`,
          `${q}:${dirIsBuy ? 'SHORT' : 'LONG'}`
        ];
      }
      if (upper.startsWith('XAU') || upper.startsWith('XAG')) {
        return [`${upper.slice(0, 3)}:${dirIsBuy ? 'LONG' : 'SHORT'}`, `USD:${dirIsBuy ? 'SHORT' : 'LONG'}`];
      }
      return [];
    };

    const dirExposures: Record<string, number> = {};
    const existingActiveSet = new Set<string>();
    currentSignals.forEach(s => {
      if (!s || s.isCorrelationBlocked) return;
      if (s.status !== 'RUNNING' && s.status !== 'PENDING') return;
      existingActiveSet.add(s.pair.symbol);
      parsePairKeys(s.pair.symbol, s.type.startsWith('BUY')).forEach(k => {
        dirExposures[k] = (dirExposures[k] || 0) + 1;
      });
    });

    const candCorrGuardMap = new Map<string, { isCorrelationBlocked: boolean; blockReason?: string; exposureTag?: string }>();
    const activePairSet = new Set<string>();

    for (const cand of evaluations) {
      const isBuy = cand.evalRes.isBuy;
      const score = cand.evalRes.highestScore;
      const sym = cand.pair.symbol;
      const isAlreadyOpen = existingActiveSet.has(sym);
      const keys = parsePairKeys(sym, isBuy);

      const primaryKey = keys.find(k => !k.startsWith('XAU:') && !k.startsWith('XAG:')) || keys[0] || '';
      const [primaryCcy, primaryDir] = primaryKey.split(':');
      const currentPrimaryCount = primaryKey ? (dirExposures[primaryKey] || 0) : 0;
      const projectedCount = isAlreadyOpen ? currentPrimaryCount : currentPrimaryCount + 1;
      const exposureTag = primaryKey
        ? `🔒 ${primaryCcy} ${primaryDir === 'LONG' ? 'Long' : 'Short'} (${projectedCount}/2)`
        : `🔒 Exposure Clear`;

      const overLimitKey = !isAlreadyOpen
        ? keys.find(k => (dirExposures[k] || 0) >= 2)
        : undefined;

      // A+ Active threshold from real MTF institutional confluence (>= 76), passing Anti-Chase Guard, and <= 2 correlated positions
      const isChaseBlocked = Boolean(cand.evalRes.isChasingExtreme || cand.evalRes.isChasingZone || cand.evalRes.isOverextended);
      const isCorrCapReached = Boolean(overLimitKey);
      const canBeActive = isAlreadyOpen || (score >= 76 && !isChaseBlocked && !isCorrCapReached);

      candCorrGuardMap.set(sym, {
        isCorrelationBlocked: isCorrCapReached && score >= 76 && !isChaseBlocked,
        blockReason: isCorrCapReached
          ? `BLOCKED: Max 2 active ${overLimitKey?.replace(':', ' ')} trades open (Correlation Cap)`
          : undefined,
        exposureTag
      });

      if (canBeActive) {
        activePairSet.add(sym);
        if (!isAlreadyOpen) {
          keys.forEach(k => {
            dirExposures[k] = (dirExposures[k] || 0) + 1;
          });
        }
      }
    }

    const refreshedActiveBySymbol = new Map<string, ForexSignal>();

    for (const { pair, livePrice, pairStrategy, evalRes, m15Candles, h1Candles, h4Candles, d1Candles } of evaluations) {
      const isEligibleForActive = activePairSet.has(pair.symbol);
      const corrGuard = candCorrGuardMap.get(pair.symbol);
      const isCorrelationBlocked = Boolean(corrGuard?.isCorrelationBlocked);
      const existing = activePairMap.get(pair.symbol);
      const isExistingActive = existing !== undefined && (existing.status === 'RUNNING' || existing.status === 'PENDING');

      // Check if an existing active trade is no longer eligible for A+ Setup
      const isDemoted = Boolean(isExistingActive && !isEligibleForActive);

      let demotionReason = '';
      let demotionAudit: ForexSignal['demotionAudit'] = undefined;

      if (isDemoted) {
        let triggerFactor: 'SCORE_DROP' | 'LIQUIDITY_UNSWEPT' | 'COUNTER_TREND' | 'NEWS_VOLATILITY' = 'SCORE_DROP';
        let verdict: 'WATCH_OUT' | 'STOP_IMMEDIATELY' | 'SAFE_TO_HOLD' = 'WATCH_OUT';
        let actionableAdvice = '';
        const details: string[] = [];

        if (evalRes.highestScore < 76) {
          triggerFactor = 'SCORE_DROP';
          verdict = evalRes.highestScore < 65 ? 'STOP_IMMEDIATELY' : 'WATCH_OUT';
          demotionReason = `Confluence Score dropped to ${evalRes.highestScore}% (below 76% A+ threshold)`;
          actionableAdvice = evalRes.highestScore < 65
            ? 'Score dropped significantly below institutional threshold. Consider closing the position or tightening Stop Loss immediately to protect capital.'
            : 'Confluence weakened slightly. Position is still running on MT4/MT5, but watch price action closely around the nearest support/resistance.';
          details.push(`Timeframe Breakdown: ${evalRes.scoreBreakdownText}`);
          if (evalRes.isOverextended) {
            details.push('Price expanded into an overextended impulse peak (>1.85x H4 ATR).');
          }
        } else if (evalRes.isNewsBlackout) {
          triggerFactor = 'NEWS_VOLATILITY';
          verdict = 'WATCH_OUT';
          demotionReason = `High-Impact Tier 1 News Event (${evalRes.newsEventTitle || 'Economic Release'}) within blackout window`;
          actionableAdvice = 'High volatility and spread widening expected. Move SL to Breakeven or reduce position size.';
          details.push(`Upcoming news: ${evalRes.newsEventTitle} in ${evalRes.newsMinutesUntil}m`);
        } else {
          triggerFactor = 'SCORE_DROP';
          verdict = 'WATCH_OUT';
          demotionReason = 'Setup slipped from top priority A+ tier into Standard Watchlist tier.';
          actionableAdvice = 'Setup remains active on your broker. Monitor for reassessment when M15/H1 candle closes.';
        }

        const nowD = new Date();
        const demotedAtFormatted = `${String(nowD.getUTCHours()).padStart(2, '0')}:${String(nowD.getUTCMinutes()).padStart(2, '0')} UTC`;

        demotionAudit = {
          reason: demotionReason,
          actionableAdvice,
          verdict,
          details,
          demotedAtFormatted,
          triggerFactor
        };
      }

      const forceStandby = isExistingActive ? false : (!isEligibleForActive || isCorrelationBlocked);
      const existingStrat = existing ? (existing.strategy || getSignalStrategy(existing)) : null;
      const existingIsBuy = existing ? existing.type.startsWith('BUY') : null;
      const isDirectionMismatch = existing !== undefined && existingIsBuy !== evalRes.isBuy;
      const isStatusTierMismatch = existing !== undefined && (
        (isEligibleForActive && existing.status === 'STANDBY') ||
        (existing.isDemotedFromActive !== isDemoted)
      );

      if (existing && isExistingActive) {
        // Active position: keep entryPrice/SL/TP/timeframe immutable, but refresh live confluence score & MTF telemetry!
        const liveSweep = this.checkLiquiditySweep(pair, Boolean(existingIsBuy), livePrice, {
          h1Candles,
          h4Candles,
          d1Candles,
          atrValue: evalRes.atrValue
        });
        const liveTimeFilter = this.evaluateTimeFilter(pairStrategy);
        const updatedChecklist = (existing.checklist || []).map(item => {
          if (item.title.includes('Best Timeframe MTF')) {
            return {
              ...item,
              isConfirmed: evalRes.highestScore >= 76,
              detail: `${evalRes.scoreBreakdownText} (Score: ${evalRes.highestScore}/100 • ADX: ${evalRes.adxValue ?? 'N/A'} • RSI: ${evalRes.rsiValue ?? 'N/A'})`
            };
          }
          if (item.title.includes('Volume & Candle Exhaustion')) {
            return {
              ...item,
              isConfirmed: Boolean(evalRes.volumeExhaustionConfirmed),
              detail: evalRes.volumeExhaustionConfirmed
                ? `${evalRes.winningTf} rejection/displacement wick with volume/range expansion verified`
                : `No strong ${evalRes.winningTf} rejection wick or volume expansion (${evalRes.smcSummary || 'Neutral'})`
            };
          }
          if (item.title.includes('Session Killzone')) {
            return {
              ...item,
              isConfirmed: Boolean(liveTimeFilter.timeFilterMatched),
              detail: liveTimeFilter.sessionName
            };
          }
          if (item.title.includes('Layer 9: Pre-Entry Liquidity Sweep')) {
            return {
              ...item,
              isConfirmed: liveSweep.isLiquiditySwept,
              detail: liveSweep.liquiditySweepDetail
            };
          }
          if (item.title.includes('Daily (D1)')) {
            return {
              ...item,
              isConfirmed: Boolean(evalRes.isD1Aligned),
              detail: evalRes.isD1Aligned
                ? `Real D1 EMA20/50 aligned (${evalRes.d1MacroTrend})`
                : `D1 Neutral or Counter-Flow (${evalRes.d1MacroTrend})`
            };
          }
          return item;
        });

        refreshedActiveBySymbol.set(pair.symbol, {
          ...existing,
          confluenceScore: isCorrelationBlocked ? 0 : evalRes.highestScore,
          winningTf: evalRes.winningTf,
          scoreBreakdownText: evalRes.scoreBreakdownText,
          tfScores: {
            m15: evalRes.m15Score,
            h1: evalRes.h1Score,
            h4: evalRes.h4Score,
            winningTf: evalRes.winningTf,
            textSummary: evalRes.scoreBreakdownText
          },
          institutionalFlow: `${STRATEGY_CONFIGS[pairStrategy].shortBadge} [${existing.timeframe}] • ${evalRes.scoreBreakdownText}`,
          isBestTradeNow: evalRes.highestScore >= 82 && !isCorrelationBlocked && existing.quality !== 'C',
          d1MacroTrend: evalRes.d1MacroTrend,
          isD1Aligned: evalRes.isD1Aligned,
          volumeExhaustionConfirmed: evalRes.volumeExhaustionConfirmed,
          isLiquiditySwept: liveSweep.isLiquiditySwept,
          liquiditySweepLevel: liveSweep.liquiditySweepLevel,
          liquiditySweepType: liveSweep.liquiditySweepType,
          liquiditySweepDetail: liveSweep.liquiditySweepDetail,
          liquiditySweepStatusTag: liveSweep.liquiditySweepStatusTag,
          checklist: updatedChecklist,
          isDemotedFromActive: isDemoted,
          demotionReason: isDemoted ? demotionReason : undefined,
          demotionAudit,
          confluenceBreakdown: evalRes.confluenceBreakdown ?? existing.confluenceBreakdown
        });
      }

      // A RUNNING or PENDING trade is an active position: its entryPrice, stopLoss, takeProfit, and timeframe are IMMUTABLE.
      const shouldReplace = isExistingActive
        ? false
        : (!existing ||
           isDirectionMismatch ||
           isStatusTierMismatch ||
           (existingStrat !== pairStrategy && activeStrategy !== 'ALL_STRATEGIES') ||
           options?.forceFormNewForTopPairs ||
           (existing.winningTf && existing.winningTf !== evalRes.winningTf && evalRes.highestScore > (existing.confluenceScore || 0)) ||
           (existing.confluenceScore !== evalRes.highestScore));

      if (shouldReplace) {
        const savedStateMap = PersistenceManager.getSavedSignalsState();
        const savedSignal = Object.values(savedStateMap).find(
          (s: any) => s && String(s.pair?.symbol || '').toUpperCase() === pair.symbol.toUpperCase() && (s.status === 'RUNNING' || s.status === 'PENDING' || s.status === 'STANDBY')
        );
        const nowMs = Date.now();
        const candidateCreatedAt = existing?.createdAtMs || savedSignal?.createdAtMs || PersistenceManager.getPairActiveAnchor(pair.symbol);
        const maxCandAgeMs = evalRes.winningTf === 'H4' ? 5 * 24 * 3600 * 1000 : 48 * 3600 * 1000;
        const isStaleCandidate = typeof candidateCreatedAt === 'number' && (nowMs - candidateCreatedAt > maxCandAgeMs);
        const resolvedCreatedAtMs = (isDirectionMismatch || isStaleCandidate)
          ? undefined
          : (candidateCreatedAt || undefined);
        const resolvedId = (isDirectionMismatch || isStaleCandidate)
          ? undefined
          : (existing?.id || savedSignal?.id || undefined);

        const freshSignal = this.generateInstitutionalSignal(
          pair,
          livePrice,
          pairStrategy,
          resolvedCreatedAtMs,
          resolvedId,
          forceStandby,
          corrGuard ? {
            isCorrelationBlocked: corrGuard.isCorrelationBlocked,
            correlationBlockReason: corrGuard.blockReason,
            correlationExposureTag: corrGuard.exposureTag
          } : undefined,
          isDemoted ? {
            isDemotedFromActive: true,
            demotionReason,
            demotionAudit
          } : (isExistingActive ? {
            isDemotedFromActive: false,
            demotionReason: undefined,
            demotionAudit: undefined
          } : undefined),
          {
            m15Candles,
            h1Candles,
            h4Candles,
            d1Candles,
            strengthSnap,
            h4Filter: evalRes.h4Filter
          }
        );
        if (freshSignal) {
          if (isExistingActive && existing.status === 'RUNNING') {
            freshSignal.status = 'RUNNING';
            freshSignal.isPending = false;
          }
          newlyFormed.push(freshSignal);
          activePairMap.set(pair.symbol, freshSignal);
        }
      }
    }

    // Also update any active signals whose H4 bias flipped/blocked so they never stay frozen on fake 95 confluence
    for (const [sym, activeSig] of activePairMap.entries()) {
      if ((activeSig.status === 'RUNNING' || activeSig.status === 'PENDING') && !refreshedActiveBySymbol.has(sym)) {
        const pairObj = candidatePairs.find(p => p.symbol === sym) || allPairs.find(p => p.symbol === sym) || activeSig.pair;
        const lp = realPriceService.hasLivePrice(sym) ? realPriceService.getPrice(sym) : (activeSig.currentPrice || activeSig.entryPrice);
        if (lp > 0) {
          const sigStrategy = activeSig.strategy || getSignalStrategy(activeSig);
          const m15C = this.getCachedCandles(sym, 'M15');
          const h1C = this.getCachedCandles(sym, 'H1');
          const h4C = this.getCachedCandles(sym, 'H4');
          const d1C = this.getCachedCandles(sym, 'D1');
          const evalCheck = this.evaluateBestTimeframeForStrategy(pairObj, sigStrategy, lp, {
            m15Candles: m15C,
            h1Candles: h1C,
            h4Candles: h4C,
            d1Candles: d1C,
            strengthSnap
          });
          if (!evalCheck.isEligible && evalCheck.blockedStatus && evalCheck.blockedStatus !== 'NO_CANDLES' && evalCheck.blockedStatus !== 'NO_DATA') {
            const baseBd = evalCheck.confluenceBreakdown || activeSig.confluenceBreakdown;
            let penaltyScore = evalCheck.highestScore > 0 ? evalCheck.highestScore : (activeSig.confluenceScore ?? 0);
            let updatedBd = baseBd;

            if (evalCheck.blockedStatus === 'LOW_SCORE' && evalCheck.highestScore > 0) {
              penaltyScore = evalCheck.highestScore;
              updatedBd = evalCheck.confluenceBreakdown ?? baseBd;
            } else if (baseBd) {
              const nextH4 = evalCheck.blockedStatus === 'NO_TRADE' ? 0 : baseBd.h4Score;
              const nextStrength = evalCheck.blockedStatus === 'CONFLICT_BLOCKED' ? 0 : baseBd.strengthScore;
              const recalcTotal = Math.max(
                0,
                Math.min(
                  100,
                  Math.round(nextH4 + baseBd.h1M15Score + nextStrength + baseBd.d1LiquidityScore + baseBd.atrSpreadScore - (baseBd.newsPenalty || 0))
                )
              );
              penaltyScore = recalcTotal;
              updatedBd = {
                ...baseBd,
                h4Score: nextH4,
                strengthScore: nextStrength,
                total: recalcTotal,
                summaryText: `H4:${nextH4} + H1/M15:${baseBd.h1M15Score} + Strength:${nextStrength} + D1/Liq:${baseBd.d1LiquidityScore} + ATR:${baseBd.atrSpreadScore}${baseBd.newsPenalty > 0 ? ` - News:${baseBd.newsPenalty}` : ''} = ${recalcTotal}`
              };
            }

            refreshedActiveBySymbol.set(sym, {
              ...activeSig,
              confluenceScore: penaltyScore,
              confluenceBreakdown: updatedBd,
              scoreBreakdownText: evalCheck.scoreBreakdownText,
              isBestTradeNow: false,
              isDemotedFromActive: true,
              demotionReason: evalCheck.blockedReason || 'H4 Trend / Currency Conflict invalidated prior A+ setup',
              demotionAudit: {
                reason: evalCheck.blockedReason || 'Confluence invalidated by live H4/Currency filter',
                actionableAdvice: 'Live trend or currency strength no longer supports this trade. Protect capital or tighten SL.',
                verdict: penaltyScore < 60 ? 'STOP_IMMEDIATELY' : 'WATCH_OUT',
                details: [updatedBd?.summaryText || evalCheck.scoreBreakdownText],
                demotedAtFormatted: `${String(new Date().getUTCHours()).padStart(2, '0')}:${String(new Date().getUTCMinutes()).padStart(2, '0')} UTC`,
                triggerFactor: evalCheck.blockedStatus === 'LOW_SCORE' ? 'SCORE_DROP' : 'COUNTER_TREND'
              }
            });
          }
        }
      }
    }

    // Deduplicate so NEVER more than 1 active/standby signal exists for any pair, and IDs are strictly unique
    const seenPairs = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicatedActiveSignals: ForexSignal[] = [];

    for (const s of newlyFormed) {
      if (!seenPairs.has(s.pair.symbol) && !seenIds.has(s.id)) {
        seenPairs.add(s.pair.symbol);
        seenIds.add(s.id);
        deduplicatedActiveSignals.push(s);
      }
    }

    const seenClosedFp = new Set<string>();
    for (const s of currentSignals) {
      if ((s.status === 'RUNNING' || s.status === 'PENDING' || s.status === 'STANDBY') && isSignalValidAndActive(s)) {
        const refreshed = refreshedActiveBySymbol.get(s.pair.symbol) ?? s;
        if (!seenPairs.has(refreshed.pair.symbol) && !seenIds.has(refreshed.id)) {
          seenPairs.add(refreshed.pair.symbol);
          seenIds.add(refreshed.id);
          deduplicatedActiveSignals.push(refreshed);
        }
      } else {
        const baseId = s.id.replace(/-HIST-\d+/g, '').replace(/-HIT_TP-\d+/g, '').replace(/-HIT_SL-\d+/g, '');
        const sym = (s.pair?.symbol || '').toUpperCase();
        const pipsStr = Math.round((s.pips ?? 0) * 10) / 10;
        const fingerprint = `${sym}-${s.status}-${pipsStr}`;

        if (seenIds.has(s.id) || (baseId && seenIds.has(baseId)) || seenClosedFp.has(fingerprint)) {
          continue;
        }

        seenIds.add(s.id);
        seenIds.add(baseId);
        seenClosedFp.add(fingerprint);
        deduplicatedActiveSignals.push({ ...s, id: baseId });
      }
    }

    return {
      updatedSignals: deduplicatedActiveSignals,
      newlyFormed
    };
  }
}

export const signalScannerService = new SignalScannerService();
