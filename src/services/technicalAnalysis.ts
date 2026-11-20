import { CandleStick, ForexPair } from '../types';
import { formatPrice } from './marketData';

export function sortCandlesAsc(candles: CandleStick[] | null | undefined): CandleStick[] {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  return candles
    .filter(
      c =>
        c &&
        Number.isFinite(c.timestamp) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close) &&
        c.open > 0 &&
        c.high > 0 &&
        c.low > 0 &&
        c.close > 0
    )
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function computeEMA(closes: number[], period: number): number | null {
  if (!Array.isArray(closes) || closes.length < period || period <= 0) return null;
  let sum = 0;
  for (let i = 0; i < period; i++) {
    if (!Number.isFinite(closes[i])) return null;
    sum += closes[i];
  }
  let ema = sum / period;
  const k = 2 / (period + 1);
  for (let i = period; i < closes.length; i++) {
    if (!Number.isFinite(closes[i])) return null;
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

export function computeEMASlope(closes: number[], period: number, lookbackBars: number = 4): number | null {
  if (closes.length < period + lookbackBars) return null;
  const current = computeEMA(closes, period);
  const previous = computeEMA(closes.slice(0, closes.length - lookbackBars), period);
  if (current === null || previous === null) return null;
  return current - previous;
}

/**
 * Wilder's smoothed RSI(14).
 */
export function computeRSI(closes: number[], period: number = 14): number | null {
  if (!Array.isArray(closes) || closes.length < period + 1) return null;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += -diff;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

/**
 * Wilder's True Range ATR(14).
 */
export function computeATR(
  candles: CandleStick[],
  period: number = 14
): { atr: number; latestRange: number; rangeToAtr: number } | null {
  const sorted = sortCandlesAsc(candles);
  if (sorted.length < period + 1) return null;

  const trs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const c = sorted[i];
    const prevClose = sorted[i - 1].close;
    const tr = Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
    trs.push(tr);
  }

  if (trs.length < period) return null;

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  const latest = sorted[sorted.length - 1];
  const latestRange = latest.high - latest.low;
  const prevClosedRange = sorted.length >= 2 ? sorted[sorted.length - 2].high - sorted[sorted.length - 2].low : latestRange;
  const activeRange = Math.max(latestRange, prevClosedRange);
  const rangeToAtr = atr > 0 ? activeRange / atr : 0;

  return {
    atr,
    latestRange: activeRange,
    rangeToAtr: Math.round(rangeToAtr * 100) / 100
  };
}

/**
 * Wilder's ADX(14) with +DI and -DI directional components.
 */
export function computeADX(
  candles: CandleStick[],
  period: number = 14
): { adx: number; plusDI: number; minusDI: number } | null {
  const sorted = sortCandlesAsc(candles);
  if (sorted.length < period * 2 + 1) return null;

  const trList: number[] = [];
  const plusDMList: number[] = [];
  const minusDMList: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];
    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));

    trList.push(tr);
    plusDMList.push(plusDM);
    minusDMList.push(minusDM);
  }

  if (trList.length < period * 2) return null;

  let smTR = trList.slice(0, period).reduce((a, b) => a + b, 0);
  let smPlusDM = plusDMList.slice(0, period).reduce((a, b) => a + b, 0);
  let smMinusDM = minusDMList.slice(0, period).reduce((a, b) => a + b, 0);

  const dxValues: number[] = [];
  let lastPlusDI = 0;
  let lastMinusDI = 0;

  for (let i = period; i < trList.length; i++) {
    smTR = smTR - smTR / period + trList[i];
    smPlusDM = smPlusDM - smPlusDM / period + plusDMList[i];
    smMinusDM = smMinusDM - smMinusDM / period + minusDMList[i];

    const plusDI = smTR > 0 ? (smPlusDM / smTR) * 100 : 0;
    const minusDI = smTR > 0 ? (smMinusDM / smTR) * 100 : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxValues.push(dx);
    lastPlusDI = plusDI;
    lastMinusDI = minusDI;
  }

  if (dxValues.length < period) return null;

  let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  return {
    adx: Math.round(adx * 10) / 10,
    plusDI: Math.round(lastPlusDI * 10) / 10,
    minusDI: Math.round(lastMinusDI * 10) / 10
  };
}

export interface RealSmcDetectionResult {
  hasData: boolean;
  atr: number;
  ema21: number;
  hasFvg: boolean;
  fvgDetail: string;
  hasBos: boolean;
  isNearEmaPullback: boolean;
  pullbackDistAtr: number;
  hasRejectionWick: boolean;
  hasVolumeOrRangeExpansion: boolean;
  volumeExhaustionConfirmed: boolean;
  obFvgAligned: boolean;
  smcSummary: string;
}

export function detectSMCOnTimeframe(
  candles: CandleStick[] | null | undefined,
  livePrice: number,
  isBuy: boolean
): RealSmcDetectionResult {
  const sorted = sortCandlesAsc(candles);
  if (sorted.length < 25) {
    return {
      hasData: false,
      atr: 0,
      ema21: livePrice,
      hasFvg: false,
      fvgDetail: 'Insufficient candles for SMC inspection',
      hasBos: false,
      isNearEmaPullback: false,
      pullbackDistAtr: 99,
      hasRejectionWick: false,
      hasVolumeOrRangeExpansion: false,
      volumeExhaustionConfirmed: false,
      obFvgAligned: false,
      smcSummary: 'No TF candles'
    };
  }

  const closes = sorted.map(c => c.close);
  const atrInfo = computeATR(sorted, 14);
  const atr = atrInfo?.atr && atrInfo.atr > 0 ? atrInfo.atr : Math.abs(sorted[sorted.length - 1].high - sorted[sorted.length - 1].low) || livePrice * 0.001;
  const ema21 = computeEMA(closes, 21) ?? closes[closes.length - 1];

  // 1. Fair Value Gap (FVG) detection across last 18 bars
  let hasFvg = false;
  let fvgDetail = 'No recent directional FVG';
  const scanStart = Math.max(2, sorted.length - 18);
  for (let k = sorted.length - 1; k >= scanStart; k--) {
    const cPrev2 = sorted[k - 2];
    const cMid = sorted[k - 1];
    const cCur = sorted[k];
    const barsAgo = sorted.length - 1 - k;

    if (isBuy) {
      const gap = cCur.low - cPrev2.high;
      const midBull = cMid.close > cMid.open;
      if (midBull && gap >= atr * 0.06) {
        const isRetestingOrFresh =
          barsAgo <= 6 || (livePrice >= cPrev2.high - atr * 0.5 && livePrice <= cCur.low + atr * 1.25);
        if (isRetestingOrFresh) {
          hasFvg = true;
          fvgDetail = `Bullish FVG ${cPrev2.high.toFixed(4)}-${cCur.low.toFixed(4)} (${barsAgo}b ago)`;
          break;
        }
      }
    } else {
      const gap = cPrev2.low - cCur.high;
      const midBear = cMid.close < cMid.open;
      if (midBear && gap >= atr * 0.06) {
        const isRetestingOrFresh =
          barsAgo <= 6 || (livePrice <= cPrev2.low + atr * 0.5 && livePrice >= cCur.high - atr * 1.25);
        if (isRetestingOrFresh) {
          hasFvg = true;
          fvgDetail = `Bearish FVG ${cCur.high.toFixed(4)}-${cPrev2.low.toFixed(4)} (${barsAgo}b ago)`;
          break;
        }
      }
    }
  }

  // 2. Break of Structure (BOS) in last 8 bars vs prior 12-bar swing
  let hasBos = false;
  if (sorted.length >= 22) {
    const priorWindow = sorted.slice(-20, -8);
    const recentWindow = sorted.slice(-8);
    if (isBuy) {
      const priorSwingHigh = Math.max(...priorWindow.map(c => c.high));
      const recentMaxClose = Math.max(...recentWindow.map(c => c.close));
      hasBos = recentMaxClose > priorSwingHigh;
    } else {
      const priorSwingLow = Math.min(...priorWindow.map(c => c.low));
      const recentMinClose = Math.min(...recentWindow.map(c => c.close));
      hasBos = recentMinClose < priorSwingLow;
    }
  }

  // 3. Optimal EMA21 Pullback / Equilibrium Distance
  const distFromEma21 = Math.abs(livePrice - ema21);
  const pullbackDistAtr = Math.round((distFromEma21 / Math.max(atr, 1e-8)) * 100) / 100;
  const isNearEmaPullback = isBuy
    ? pullbackDistAtr <= 1.25 && livePrice >= ema21 - 0.85 * atr
    : pullbackDistAtr <= 1.25 && livePrice <= ema21 + 0.85 * atr;

  // 4. Institutional Rejection Wick / Displacement Candle in last 3 bars
  const last3 = sorted.slice(-3);
  let hasRejectionWick = false;
  for (const bar of last3) {
    const range = bar.high - bar.low;
    if (range <= 0) continue;
    const body = Math.abs(bar.close - bar.open);
    const bodyRatio = body / range;
    if (isBuy) {
      const lowerWick = Math.min(bar.open, bar.close) - bar.low;
      const closePos = (bar.close - bar.low) / range;
      const isPinRej = lowerWick / range >= 0.30 && closePos >= 0.55;
      const isBullImpulse = bar.close > bar.open && bodyRatio >= 0.55 && body >= atr * 0.55;
      if (isPinRej || isBullImpulse) {
        hasRejectionWick = true;
        break;
      }
    } else {
      const upperWick = bar.high - Math.max(bar.open, bar.close);
      const closePos = (bar.high - bar.close) / range;
      const isPinRej = upperWick / range >= 0.30 && closePos >= 0.55;
      const isBearImpulse = bar.close < bar.open && bodyRatio >= 0.55 && body >= atr * 0.55;
      if (isPinRej || isBearImpulse) {
        hasRejectionWick = true;
        break;
      }
    }
  }

  // 5. Real Volume / Range Expansion Check
  const lookback20 = sorted.slice(-23, -3);
  const volumes = lookback20.map(c => c.volume || 0).filter(v => v > 0);
  const hasRealVaryingVolume =
    volumes.length >= 10 && new Set(volumes.map(v => Math.round(v))).size > 3;

  let hasVolumeOrRangeExpansion = false;
  if (hasRealVaryingVolume) {
    const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    hasVolumeOrRangeExpansion = last3.some(c => (c.volume || 0) >= avgVol * 1.15);
  } else {
    hasVolumeOrRangeExpansion = last3.some(c => (c.high - c.low) >= atr * 0.95);
  }

  const volumeExhaustionConfirmed = hasRejectionWick && hasVolumeOrRangeExpansion;
  const obFvgAligned = hasFvg || (hasBos && isNearEmaPullback);

  const parts: string[] = [];
  if (hasFvg) parts.push('FVG');
  if (hasBos) parts.push('BOS');
  if (isNearEmaPullback) parts.push('Pullback');
  if (hasRejectionWick) parts.push('Wick');
  if (hasVolumeOrRangeExpansion) parts.push('VolExp');

  return {
    hasData: true,
    atr,
    ema21,
    hasFvg,
    fvgDetail,
    hasBos,
    isNearEmaPullback,
    pullbackDistAtr,
    hasRejectionWick,
    hasVolumeOrRangeExpansion,
    volumeExhaustionConfirmed,
    obFvgAligned,
    smcSummary: parts.length > 0 ? parts.join('+') : 'Consolidating'
  };
}

export interface RealLiquiditySweepResult {
  isLiquiditySwept: boolean;
  isNearLiquidityLevel: boolean;
  liquiditySweepLevel: number;
  liquiditySweepType: 'PDL' | 'PDH' | 'PWL' | 'PWH' | 'SWING_LOW' | 'SWING_HIGH';
  liquiditySweepDetail: string;
  liquiditySweepStatusTag: string;
  liquiditySweepTimeMs?: number;
}

/**
 * Real Pre-Entry Liquidity Sweep detection from actual D1 / H1 / H4 candles.
 * Never uses symbol hashes or time modulo tricks.
 */
export function detectRealLiquiditySweep(
  pair: ForexPair,
  isBuy: boolean,
  livePrice: number,
  h1Candles?: CandleStick[],
  h4Candles?: CandleStick[],
  d1Candles?: CandleStick[],
  atrValue?: number
): RealLiquiditySweepResult {
  const d1Sorted = sortCandlesAsc(d1Candles);
  const h1Sorted = sortCandlesAsc(h1Candles);
  const h4Sorted = sortCandlesAsc(h4Candles);
  const intraday = h1Sorted.length >= 24 ? h1Sorted : h4Sorted;
  const fallbackAtr =
    atrValue && atrValue > 0
      ? atrValue
      : intraday.length >= 15
      ? computeATR(intraday, 14)?.atr || livePrice * 0.002
      : livePrice * 0.002;

  const candidates: {
    level: number;
    type: 'PDL' | 'PDH' | 'SWING_LOW' | 'SWING_HIGH';
    label: string;
  }[] = [];

  // Previous completed day high/low from D1 candles
  if (d1Sorted.length >= 2) {
    const prevDay = d1Sorted[d1Sorted.length - 2];
    candidates.push({
      level: isBuy ? prevDay.low : prevDay.high,
      type: isBuy ? 'PDL' : 'PDH',
      label: isBuy ? 'PDL' : 'PDH'
    });
  }

  // Structural H1/H4 prior swing level (bars -36 to -7 so we check sweeps in the most recent 6 bars)
  if (intraday.length >= 16) {
    const priorSlice = intraday.slice(Math.max(0, intraday.length - 36), Math.max(8, intraday.length - 6));
    if (priorSlice.length >= 4) {
      const swingLevel = isBuy
        ? Math.min(...priorSlice.map(c => c.low))
        : Math.max(...priorSlice.map(c => c.high));
      candidates.push({
        level: swingLevel,
        type: isBuy ? 'SWING_LOW' : 'SWING_HIGH',
        label: isBuy ? 'Swing Low' : 'Swing High'
      });
    }
  }

  if (candidates.length === 0) {
    const level = Number(livePrice.toFixed(pair.pipDigits));
    const sweepType = isBuy ? 'SWING_LOW' : 'SWING_HIGH';
    return {
      isLiquiditySwept: false,
      isNearLiquidityLevel: false,
      liquiditySweepLevel: level,
      liquiditySweepType: sweepType,
      liquiditySweepDetail: 'Awaiting H1/D1 candles to verify liquidity sweep',
      liquiditySweepStatusTag: '⏳ SWEEP DATA PENDING'
    };
  }

  const recentBars = intraday.length >= 8 ? intraday.slice(-8) : intraday;

  for (const cand of candidates) {
    // Find the most recent bar that wicked through the level and closed back on the trade side
    for (let i = recentBars.length - 1; i >= 0; i--) {
      const bar = recentBars[i];
      const sweptAndReclaimed = isBuy
        ? bar.low < cand.level && bar.close > cand.level && livePrice > cand.level
        : bar.high > cand.level && bar.close < cand.level && livePrice < cand.level;

      if (sweptAndReclaimed) {
        const sweepD = new Date(bar.timestamp);
        const hh = String(sweepD.getUTCHours()).padStart(2, '0');
        const mm = String(sweepD.getUTCMinutes()).padStart(2, '0');
        const timeTag = `${hh}:${mm} UTC`;
        const priceStr = formatPrice(pair, cand.level);

        return {
          isLiquiditySwept: true,
          isNearLiquidityLevel: true,
          liquiditySweepLevel: Number(cand.level.toFixed(pair.pipDigits)),
          liquiditySweepType: cand.type,
          liquiditySweepDetail: `✅ LIQUIDITY SWEPT: ${cand.label} ${priceStr} swept at ${timeTag}, reclaimed ${isBuy ? 'above' : 'below'}`,
          liquiditySweepStatusTag: `💧 LIQUIDITY: ${cand.label} Swept at ${timeTag}`,
          liquiditySweepTimeMs: bar.timestamp
        };
      }
    }
  }

  // Not yet swept — report nearest target liquidity level and whether price is tapping near it
  const primary = candidates[0];
  const priceStr = formatPrice(pair, primary.level);
  const distToLevel = Math.abs(livePrice - primary.level);
  const isNear = distToLevel <= fallbackAtr * 0.45;

  return {
    isLiquiditySwept: false,
    isNearLiquidityLevel: isNear,
    liquiditySweepLevel: Number(primary.level.toFixed(pair.pipDigits)),
    liquiditySweepType: primary.type,
    liquiditySweepDetail: isNear
      ? `👀 LIQUIDITY TAP: Testing near ${primary.label} (${priceStr}) — awaiting reclaim close`
      : `⏳ WATCHLIST: No sweep yet of ${primary.label} (${priceStr})`,
    liquiditySweepStatusTag: isNear
      ? `👀 TAPPING ${primary.label}: ${priceStr}`
      : `⏳ AWAITING SWEEP: ${primary.label} ${priceStr}`
  };
}

export interface SwingRangeEvaluation {
  hasData: boolean;
  swingHigh: number;
  swingLow: number;
  equilibrium: number;
  rangePosPct: number; // 0 = swing low, 100 = swing high
  zoneLabel: 'DISCOUNT' | 'EQUILIBRIUM' | 'PREMIUM';
  isInValueZone: boolean;
  isChasingZone: boolean;
  isExtremeChase: boolean;
  pullbackEntryTarget: number | null;
  chaseReason?: string;
}

/**
 * SMC Premium / Discount Swing Range & Anti-Chase Guard:
 * Checks where livePrice sits within the real 48-bar intraday dealing range (swingLow .. swingHigh)
 * and combines it with real RSI(14) to stop buying at swing highs or selling at swing lows.
 */
export function evaluateSwingRangePosition(
  pair: ForexPair,
  candles: CandleStick[] | null | undefined,
  livePrice: number,
  isBuy: boolean,
  tfRsi: number | null,
  tfEma21?: number | null,
  tfAtr?: number | null
): SwingRangeEvaluation {
  const sorted = sortCandlesAsc(candles);
  const lookback = sorted.slice(-48);
  if (lookback.length < 12 || livePrice <= 0) {
    return {
      hasData: false,
      swingHigh: livePrice,
      swingLow: livePrice,
      equilibrium: livePrice,
      rangePosPct: 50,
      zoneLabel: 'EQUILIBRIUM',
      isInValueZone: false,
      isChasingZone: false,
      isExtremeChase: false,
      pullbackEntryTarget: null
    };
  }

  const swingHigh = Math.max(...lookback.map(c => c.high));
  const swingLow = Math.min(...lookback.map(c => c.low));
  const span = swingHigh - swingLow;
  if (!Number.isFinite(span) || span <= 1e-8) {
    return {
      hasData: false,
      swingHigh,
      swingLow,
      equilibrium: livePrice,
      rangePosPct: 50,
      zoneLabel: 'EQUILIBRIUM',
      isInValueZone: false,
      isChasingZone: false,
      isExtremeChase: false,
      pullbackEntryTarget: null
    };
  }

  const equilibrium = (swingHigh + swingLow) / 2;
  const rawPos = ((livePrice - swingLow) / span) * 100;
  const rangePosPct = Math.round(Math.max(0, Math.min(100, rawPos)));
  const zoneLabel: 'DISCOUNT' | 'EQUILIBRIUM' | 'PREMIUM' =
    rangePosPct <= 38 ? 'DISCOUNT' : rangePosPct >= 62 ? 'PREMIUM' : 'EQUILIBRIUM';

  // Ideal value: BUY in discount/equilibrium (<= 60%), SELL in premium/equilibrium (>= 40%)
  const isInValueZone = isBuy ? rangePosPct <= 60 : rangePosPct >= 40;

  // Chasing guard: Buying at upper range/overbought or Selling at lower range/oversold
  const isChasingZone = isBuy
    ? rangePosPct >= 78 || (tfRsi !== null && tfRsi >= 72)
    : rangePosPct <= 22 || (tfRsi !== null && tfRsi <= 28);

  const isExtremeChase = isBuy
    ? rangePosPct >= 86 || (tfRsi !== null && tfRsi >= 75)
    : rangePosPct <= 14 || (tfRsi !== null && tfRsi <= 25);

  // Compute genuine structural pullback entry level (EMA21 / Equilibrium) bounded to sensible ATR range
  const atrRef = tfAtr && tfAtr > 0 ? tfAtr : span * 0.22;
  const minPullback = atrRef * 0.30;
  const maxPullback = atrRef * 0.95;

  const structuralRefs: number[] = [];
  if (tfEma21 && Number.isFinite(tfEma21)) {
    if ((isBuy && tfEma21 < livePrice) || (!isBuy && tfEma21 > livePrice)) {
      structuralRefs.push(tfEma21);
    }
  }
  if ((isBuy && equilibrium < livePrice) || (!isBuy && equilibrium > livePrice)) {
    structuralRefs.push(equilibrium);
  }

  let rawTarget = isBuy ? livePrice - atrRef * 0.55 : livePrice + atrRef * 0.55;
  if (structuralRefs.length > 0) {
    rawTarget = isBuy ? Math.max(...structuralRefs) : Math.min(...structuralRefs);
  }
  const dist = Math.abs(livePrice - rawTarget);
  const boundedDist = Math.min(maxPullback, Math.max(minPullback, dist));
  const pullbackEntryTarget = Number(
    (isBuy ? livePrice - boundedDist : livePrice + boundedDist).toFixed(pair.pipDigits)
  );

  let chaseReason: string | undefined;
  if (isChasingZone) {
    const targetStr = formatPrice(pair, pullbackEntryTarget);
    const rsiTag = tfRsi !== null ? ` • RSI ${tfRsi.toFixed(1)}` : '';
    chaseReason = isBuy
      ? `🛑 ANTI-CHASE GUARD: Buying in ${zoneLabel} (${rangePosPct}% of swing range${rsiTag}). Waiting for pullback to ${targetStr}.`
      : `🛑 ANTI-CHASE GUARD: Selling in ${zoneLabel} (${rangePosPct}% of swing range${rsiTag}). Waiting for rally pullback to ${targetStr}.`;
  }

  return {
    hasData: true,
    swingHigh,
    swingLow,
    equilibrium,
    rangePosPct,
    zoneLabel,
    isInValueZone,
    isChasingZone,
    isExtremeChase,
    pullbackEntryTarget,
    chaseReason
  };
}

