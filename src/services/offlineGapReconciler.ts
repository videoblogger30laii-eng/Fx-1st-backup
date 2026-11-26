import { ForexSignal, CandleStick, Timeframe } from '../types';
import { formatPrice, calculatePips, getTypicalPairSpread } from './marketData';
import { realPriceService } from './RealPriceService';
import { DERIV_PAIR_MAP } from './derivHistoricalService';
import { PersistenceManager } from './persistence';

export interface ReconciliationReport {
  reconciledCount: number;
  updatedSignals: ForexSignal[];
  logs: string[];
}

/**
 * OfflineGapReconciler:
 * Automatically runs on app launch, browser tab wake, network reconnect, and periodic 30s sync.
 * Replays real M1/M5 market candle history strictly at/after signal entry time using MT5 Bid/Ask rules
 * so brief intrabar wick spikes or Ask spread triggers are never missed.
 */
class OfflineGapReconciler {
  private isReconciling = false;
  private lastReconciliationTime = 0;

  /**
   * Fetches real historical M1/M5 candles from /api/market/candles first, falling back to Deriv public websocket.
   */
  private async fetchCandlesForReconciliation(
    symbol: string,
    _timeframe: Timeframe,
    startTimeMs: number
  ): Promise<CandleStick[]> {
    // Primary: Local Yahoo Finance /api/market/candles M1 (1m resolution) or M5 for older signals
    const ageMs = Date.now() - startTimeMs;
    const primaryTf = ageMs > 20 * 3600 * 1000 ? 'M5' : 'M1';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(
        `/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${primaryTf}&count=500`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && Array.isArray(json.candles) && json.candles.length > 0) {
          return json.candles.map((c: any) => ({
            timestamp: Number(c.timestamp),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
            volume: Number(c.volume || 100)
          }));
        }
      }
      if (primaryTf === 'M1') {
        const m5Controller = new AbortController();
        const m5Timeout = setTimeout(() => m5Controller.abort(), 7000);
        const m5Res = await fetch(
          `/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=M5&count=400`,
          { signal: m5Controller.signal }
        );
        clearTimeout(m5Timeout);
        if (m5Res.ok) {
          const m5Json = await m5Res.json();
          if (m5Json?.ok && Array.isArray(m5Json.candles) && m5Json.candles.length > 0) {
            return m5Json.candles.map((c: any) => ({
              timestamp: Number(c.timestamp),
              open: Number(c.open),
              high: Number(c.high),
              low: Number(c.low),
              close: Number(c.close),
              volume: Number(c.volume || 100)
            }));
          }
        }
      }
    } catch {
      // Fall through to Deriv WS
    }

    return new Promise((resolve) => {
      try {
        const derivSymbol = DERIV_PAIR_MAP[symbol] || `frx${symbol.replace(/[^a-zA-Z]/g, '')}`;
        const granularity = ageMs > 20 * 3600 * 1000 ? 300 : 60;
        const startSec = Math.floor(startTimeMs / 1000);
        const endSec = Math.floor(Date.now() / 1000);

        const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
        const timeout = setTimeout(() => {
          try { ws.close(); } catch {}
          resolve([]);
        }, 5000);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              ticks_history: derivSymbol,
              adjust_start_time: 1,
              start: startSec,
              end: String(endSec),
              count: 1000,
              style: 'candles',
              granularity
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.candles && Array.isArray(data.candles)) {
              clearTimeout(timeout);
              ws.close();
              const mapped: CandleStick[] = data.candles.map((c: any) => ({
                timestamp: c.epoch * 1000,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                volume: Number(c.volume || 100)
              }));
              resolve(mapped);
              return;
            }
          } catch {
            // fallback
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve([]);
        };
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Reconciles all active signals against both real-time Bid/Ask quotes and post-entry M1/M5 candles
   */
  public async reconcileSignals(currentSignals: ForexSignal[]): Promise<ReconciliationReport> {
    if (this.isReconciling) {
      return { reconciledCount: 0, updatedSignals: currentSignals, logs: [] };
    }

    this.isReconciling = true;
    const logs: string[] = [];
    let reconciledCount = 0;

    try {
      const activeSignals = currentSignals.filter(
        s => s.status === 'RUNNING' || s.status === 'PENDING'
      );

      if (activeSignals.length === 0) {
        return { reconciledCount: 0, updatedSignals: currentSignals, logs: [] };
      }

      const updatedSignals = [...currentSignals];

      for (let i = 0; i < updatedSignals.length; i++) {
        const sig = updatedSignals[i];
        if (sig.status !== 'RUNNING') {
          continue;
        }
        // Only skip brand-new signals less than 15 seconds old
        if (sig.createdAtMs && Date.now() - sig.createdAtMs < 15000) {
          continue;
        }

        const sym = sig.pair.symbol;
        const isBuy = sig.type.startsWith('BUY');
        const ohlc = realPriceService.getOHLC(sym);
        const typicalSpread = getTypicalPairSpread(sym);
        const hasValidTvSpread = Boolean(
          ohlc?.bid &&
          ohlc?.ask &&
          ohlc.ask > ohlc.bid &&
          ohlc.ask - ohlc.bid <= typicalSpread * 4
        );
        const effectiveSpread = hasValidTvSpread
          ? Math.max(typicalSpread * 0.65, ohlc.ask! - ohlc.bid!)
          : typicalSpread;

        const isJpy = sym.includes('JPY');
        const isGold = sym.includes('XAU') || sym.includes('GOLD');
        const isSilver = sym.includes('XAG') || sym.includes('SILVER');
        const mult = isGold ? 10 : (isJpy || isSilver) ? 100 : 10000;
        const pipDigits = sig.pair?.pipDigits ?? (isGold ? 2 : isJpy || isSilver ? 3 : 5);
        const tp1DistPips = Math.abs(calculatePips(sig.pair, sig.entryPrice, sig.takeProfit1, isBuy));
        const beRatio = sig.timeframe === 'H4' || sig.timeframe === 'D1' ? 0.30 : 0.45;
        const beTriggerPips = Math.max(12, tp1DistPips * beRatio);
        const beTriggerPrice = sig.entryPrice + (isBuy ? 1 : -1) * (beTriggerPips / mult);
        const beProtectedSl = Number((sig.entryPrice + (isBuy ? 1 : -1) * (1.0 / mult)).toFixed(pipDigits));

        let beArmed = Boolean(sig.isBreakevenArmed);
        let beHit = false;
        let slBreached = false;
        let tpBreached = false;
        let breachTimestamp = 0;
        let breachExitPrice = 0;
        let reason = '';

        // 1. First check: current live Bid/Ask from active feed
        const liveNow = realPriceService.getPrice(sym);
        if (liveNow > 0) {
          // Reject signals whose entry price is disconnected from current market reality (> 120p FX, > 250p Gold)
          const entryDistPips = Math.abs(sig.entryPrice - liveNow) * mult;
          const maxAllowedPips = isGold ? 250 : isJpy ? 180 : 120;
          if (entryDistPips > maxAllowedPips) {
            continue;
          }

          const maxOvershootPips = isGold ? 100 : isJpy ? 45 : 30;
          const liveBid = ohlc?.bid && ohlc.bid > 0 ? ohlc.bid : liveNow;
          const liveAsk =
            ohlc?.ask && ohlc.ask > 0 && hasValidTvSpread
              ? Math.max(ohlc.ask, liveBid + effectiveSpread * 0.65)
              : liveBid + effectiveSpread;
          const liveExitQuote = isBuy ? liveBid : liveAsk;
          const activeLiveSl = beArmed
            ? (isBuy ? Math.max(sig.stopLoss, beProtectedSl) : Math.min(sig.stopLoss, beProtectedSl))
            : sig.stopLoss;

          if ((isBuy && liveExitQuote <= activeLiveSl) || (!isBuy && liveExitQuote >= activeLiveSl)) {
            const slOvershootPips = isBuy ? (activeLiveSl - liveExitQuote) * mult : (liveExitQuote - activeLiveSl) * mult;
            if (slOvershootPips <= maxOvershootPips) {
              if (beArmed) {
                tpBreached = true;
                beHit = true;
                breachExitPrice = activeLiveSl;
                breachTimestamp = Date.now();
                reason = `🛡️ Breakeven SL (+1.0p) protected profit at ${activeLiveSl}`;
              } else {
                slBreached = true;
                breachExitPrice = sig.stopLoss;
                breachTimestamp = Date.now();
                reason = `Live ${isBuy ? 'Bid' : 'Ask'} ${liveExitQuote.toFixed(isJpy || isGold ? 3 : 5)} reached SL at ${sig.stopLoss}`;
              }
            }
          } else if ((isBuy && liveExitQuote >= sig.takeProfit1) || (!isBuy && liveExitQuote <= sig.takeProfit1)) {
            const tpOvershootPips = isBuy ? (liveExitQuote - sig.takeProfit1) * mult : (sig.takeProfit1 - liveExitQuote) * mult;
            if (tpOvershootPips <= maxOvershootPips) {
              tpBreached = true;
              breachExitPrice = sig.takeProfit1;
              breachTimestamp = Date.now();
              reason = `Live ${isBuy ? 'Bid' : 'Ask'} ${liveExitQuote.toFixed(isJpy || isGold ? 3 : 5)} reached TP1 at ${sig.takeProfit1}`;
            }
          }
        }

        // 2. Second check: Verify real historical M1/M5 candles strictly at/after entryStartMs
        const entryStartMs = sig.executedAtMs || sig.createdAtMs || 0;
        if (!slBreached && !tpBreached && entryStartMs > 0) {
          const candles = await this.fetchCandlesForReconciliation(
            sym,
            sig.timeframe,
            entryStartMs
          );

          if (candles && candles.length > 0) {
            for (const c of candles) {
              if (c.timestamp < entryStartMs) continue;

              const activeBarSl = beArmed
                ? (isBuy ? Math.max(sig.stopLoss, beProtectedSl) : Math.min(sig.stopLoss, beProtectedSl))
                : sig.stopLoss;

              // MT5: BUY closes on Bid (candle low/high); SELL closes on Ask (Bid + spread)
              if (!isBuy && (c.high + effectiveSpread) >= activeBarSl) {
                if (beArmed) {
                  tpBreached = true;
                  beHit = true;
                  breachExitPrice = activeBarSl;
                  breachTimestamp = c.timestamp;
                  reason = `🛡️ Ask ${(c.high + effectiveSpread).toFixed(3)} locked Breakeven SL (+1.0p) at ${activeBarSl}`;
                } else {
                  slBreached = true;
                  breachExitPrice = sig.stopLoss;
                  breachTimestamp = c.timestamp;
                  reason = `Ask wick ${(c.high + effectiveSpread).toFixed(3)} (Bid high ${c.high} + spread ${effectiveSpread}) hit SL ${sig.stopLoss}`;
                }
                break;
              } else if (isBuy && c.low <= activeBarSl) {
                if (beArmed) {
                  tpBreached = true;
                  beHit = true;
                  breachExitPrice = activeBarSl;
                  breachTimestamp = c.timestamp;
                  reason = `🛡️ Bid low ${c.low} locked Breakeven SL (+1.0p) at ${activeBarSl}`;
                } else {
                  slBreached = true;
                  breachExitPrice = sig.stopLoss;
                  breachTimestamp = c.timestamp;
                  reason = `Candle Bid low ${c.low} hit SL ${sig.stopLoss}`;
                }
                break;
              }

              if (!isBuy && (c.low + effectiveSpread) <= sig.takeProfit1) {
                tpBreached = true;
                breachExitPrice = sig.takeProfit1;
                breachTimestamp = c.timestamp;
                reason = `Ask low ${(c.low + effectiveSpread).toFixed(3)} hit TP1 ${sig.takeProfit1}`;
                break;
              } else if (isBuy && c.high >= sig.takeProfit1) {
                tpBreached = true;
                breachExitPrice = sig.takeProfit1;
                breachTimestamp = c.timestamp;
                reason = `Candle Bid high ${c.high} hit TP1 ${sig.takeProfit1}`;
                break;
              }

              // Arm Breakeven SL for subsequent candles once price reaches beTriggerPrice
              if (!beArmed) {
                if ((isBuy && c.high >= beTriggerPrice) || (!isBuy && (c.low + effectiveSpread) <= beTriggerPrice)) {
                  beArmed = true;
                }
              }
            }
          }
        }

        // If breached, transition signal to closed ledger
        if (slBreached) {
          const finalExit = breachExitPrice || sig.stopLoss;
          const pips = -Math.abs(calculatePips(sig.pair, sig.entryPrice, finalExit, isBuy));
          const closedSig: ForexSignal = {
            ...sig,
            status: 'HIT_SL',
            currentPrice: finalExit,
            pips,
            validityTimeLeft: `Closed (SL Hit: -${Math.abs(pips)}p)`,
            validityExpiresAt: `SL Hit at ${formatPrice(sig.pair, finalExit)}`,
            closedAtMs: breachTimestamp || Date.now(),
            isLiveSynced: true
          };
          updatedSignals[i] = closedSig;
          reconciledCount++;
          logs.push(`[Offline Reconciler] ${sym} (${sig.type}) marked as HIT_SL: ${reason}`);
          PersistenceManager.emitSignalTransition({
            signalId: sig.id,
            pairSymbol: sym,
            previousStatus: sig.status,
            newStatus: 'HIT_SL',
            closedAtMs: breachTimestamp || Date.now(),
            signal: closedSig,
            allSignals: updatedSignals
          });
        } else if (tpBreached) {
          const finalExit = breachExitPrice || sig.takeProfit1;
          const pips = beHit ? 1.0 : Math.abs(calculatePips(sig.pair, sig.entryPrice, finalExit, isBuy));
          const closedSig: ForexSignal = {
            ...sig,
            status: 'HIT_TP',
            currentPrice: finalExit,
            pips,
            isBreakevenArmed: beHit || beArmed,
            validityTimeLeft: beHit ? 'Closed (Breakeven +1.0p Lock)' : `Closed (TP1 Hit: +${pips}p)`,
            validityExpiresAt: beHit
              ? `🛡️ BE SL Protected at ${formatPrice(sig.pair, finalExit)}`
              : `TP1 Hit at ${formatPrice(sig.pair, finalExit)}`,
            closedAtMs: breachTimestamp || Date.now(),
            isLiveSynced: true
          };
          updatedSignals[i] = closedSig;
          reconciledCount++;
          logs.push(`[Offline Reconciler] ${sym} (${sig.type}) marked as HIT_TP: ${reason}`);
          PersistenceManager.emitSignalTransition({
            signalId: sig.id,
            pairSymbol: sym,
            previousStatus: sig.status,
            newStatus: 'HIT_TP',
            closedAtMs: breachTimestamp || Date.now(),
            signal: closedSig,
            allSignals: updatedSignals
          });
        } else if (beArmed && !sig.isBreakevenArmed) {
          updatedSignals[i] = {
            ...sig,
            isBreakevenArmed: true,
            validityTimeLeft: `🛡️ Breakeven Protected (${sig.pips >= 0 ? '+' : ''}${sig.pips}p)`
          };
          reconciledCount++;
        }
      }

      this.lastReconciliationTime = Date.now();
      return { reconciledCount, updatedSignals, logs };
    } finally {
      this.isReconciling = false;
    }
  }

  public getLastSyncTime(): number {
    return this.lastReconciliationTime;
  }
}

export const offlineGapReconciler = new OfflineGapReconciler();
