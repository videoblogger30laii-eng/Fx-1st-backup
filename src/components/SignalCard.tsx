import React, { useState, useEffect, useRef } from 'react';
import { ForexSignal, getAssetCategory, getSignalStrategy, STRATEGY_CONFIGS, isMarketExecutionSignal } from '../types';
import {
  formatPrice,
  calculatePips,
  getFormattedCountdown,
  isSignalValidAndActive,
  getRemainingValidityMs,
  getFormattedTimeElapsed,
  getFormattedClosedTime,
  getFormattedTotalValidity,
  getValidityProgress,
  getTpProgressRatio,
  getTradeDurationMs,
  formatDurationCompact,
  isForexMarketOpen,
  formatSignalDateTime,
  getSignalExecutedAtMs,
  getFormattedExecutedTime,
  getFormattedExecutionTimeDiff,
  isSignalChangedOrRecalculated,
  getSignalParameterAudit
} from '../services/marketData';
import { realPriceService } from '../services/RealPriceService';
import { economicCalendarService } from '../services/economicCalendarService';
import { TelegramAlertService } from '../services/TelegramAlertService';
import { SignalChangeAuditModal } from './SignalChangeAuditModal';
import { TradeDemotionAuditModal } from './TradeDemotionAuditModal';
import { TimeMachineModal } from './TimeMachineModal';
import { ConflictFilterMode, SignalConflictEvaluation } from '../services/currencyConflictFilter';
import {
  Star,
  Bell,
  BellOff,
  Sparkles,
  BarChart2,
  SlidersHorizontal,
  FlaskConical,
  History,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Clock,
  Timer,
  Target,
  Zap,
  Flame,
  AlertTriangle,
  Trophy,
  ShieldCheck,
  Info,
  X
} from 'lucide-react';

interface Props {
  signal: ForexSignal;
  onClick: () => void;
  onToggleFavorite: () => void;
  onToggleAlert: () => void;
  onAskAi: () => void;
  onOpenChart?: () => void;
  onOpenBacktest?: () => void;
  onOpenTimeMachine?: (signal: ForexSignal) => void;
  onOpenElev8Order?: () => void;
  onOpenOutcomeAnalysis?: (signal: ForexSignal) => void;
  onCloseTrade?: (signal: ForexSignal) => void;
  nowClockMs: number;
  isMarketOpen?: boolean;
  conflictFilterActive?: boolean;
  conflictMode?: ConflictFilterMode;
  conflictInfo?: SignalConflictEvaluation;
  isConflictAcknowledged?: boolean;
  onAcknowledgeConflict?: (signalId: string) => void;
}

export const SignalCard: React.FC<Props> = ({
  signal,
  onClick,
  onToggleFavorite,
  onToggleAlert,
  onAskAi,
  onOpenChart,
  onOpenBacktest,
  onOpenTimeMachine,
  onOpenElev8Order,
  onOpenOutcomeAnalysis,
  onCloseTrade,
  nowClockMs,
  isMarketOpen,
  conflictFilterActive = false,
  conflictMode = 'STRICT',
  conflictInfo,
  isConflictAcknowledged = false,
  onAcknowledgeConflict
}) => {
  const marketOpen = typeof isMarketOpen === 'boolean' ? isMarketOpen : isForexMarketOpen(new Date(nowClockMs));
  const [copied, setCopied] = useState(false);
  const isBuy = signal.type.startsWith('BUY');
  const isStandby = signal.status === 'STANDBY';
  const isPending = (signal.status === 'PENDING' || signal.isPending) && !isStandby;
  const isTimeExpired = isPending && getRemainingValidityMs(signal, nowClockMs) <= 0;
  const isClosed = (signal.status === 'HIT_TP' || signal.status === 'HIT_SL' || isTimeExpired) && !isStandby;
  const countdown = getFormattedCountdown(signal, nowClockMs);
  const newsGuard = economicCalendarService.getNewsGuard(signal.pair.symbol);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isDemotionModalOpen, setIsDemotionModalOpen] = useState(false);
  const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);
  const isParamChanged = isSignalChangedOrRecalculated(signal);
  const paramAudit = isParamChanged ? getSignalParameterAudit(signal) : null;

  // Live real-time price hook from Deriv/Twelve Data
  const [livePrice, setLivePrice] = useState<number>(() => {
    const current = realPriceService.getPrice(signal.pair.symbol);
    return current > 0 ? current : (signal.pair.currentPrice || signal.entryPrice);
  });
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number>(livePrice);
  const flashTimerRef = useRef<any>(null);

  useEffect(() => {
    prevPriceRef.current = livePrice;
  }, [livePrice]);

  useEffect(() => {
    const current = realPriceService.getPrice(signal.pair.symbol);
    if (current > 0) {
      setLivePrice(current);
      prevPriceRef.current = current;
    }

    const unsubscribe = realPriceService.onPrice((tick) => {
      if (tick.symbol === signal.pair.symbol && tick.price > 0) {
        const prev = prevPriceRef.current;
        if (tick.price !== prev) {
          const dir = tick.price > prev ? 'up' : 'down';
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          setFlashDir(dir);
          flashTimerRef.current = setTimeout(() => setFlashDir(null), 900);
          prevPriceRef.current = tick.price;
        }
        setLivePrice(tick.price);
      }
    });

    return () => {
      unsubscribe();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [signal.pair.symbol]);

  // Calculate live floating pips from real price
  const livePips = calculatePips(signal.pair, signal.entryPrice, livePrice, isBuy);
  const isProfit = livePips >= 0;

  const copyOrder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${signal.type} ${signal.pair.symbol.replace('/', '')} @ ${formatPrice(signal.pair, signal.entryPrice)} | SL: ${formatPrice(signal.pair, signal.stopLoss)} | TP1: ${formatPrice(signal.pair, signal.takeProfit1)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    try {
      await TelegramAlertService.sendNewSignalAlert(
        signal,
        `📋 *MT5 ORDER COPIED & SENT TO TELEGRAM!*\nPair: ${signal.pair.symbol} (${signal.type})`,
        true
      );
    } catch {}
  };

  const stratKey = getSignalStrategy(signal);
  const stratCfg = STRATEGY_CONFIGS[stratKey];
  const assetCat = getAssetCategory(signal.pair.symbol);
  const slPips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.stopLoss, isBuy));
  const tp1Pips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.takeProfit1, isBuy));
  const tpRatio = Math.round(getTpProgressRatio(signal, livePrice) * 100);
  const validityRatio = getValidityProgress(signal, nowClockMs);
  const isClosedOrder = signal.status === 'HIT_SL' || signal.status === 'HIT_TP' || Boolean(signal.closedAtMs);
  const isWin = signal.status === 'HIT_TP' || (signal.status !== 'HIT_SL' && (signal.pips ?? 0) > 0);
  const isMarketExecution = isMarketExecutionSignal(signal.type);
  const isRunning = signal.status === 'RUNNING';
  const executedAtMs = !isMarketExecution && isRunning && !isPending && !isClosedOrder ? getSignalExecutedAtMs(signal, nowClockMs) : undefined;
  const executedTimeText = executedAtMs ? getFormattedExecutedTime(signal, nowClockMs) : '';
  const waitText = executedAtMs ? getFormattedExecutionTimeDiff(signal, nowClockMs) : '';

  const isWarningConflictCard =
    conflictFilterActive &&
    conflictMode === 'WARNING' &&
    !isClosedOrder &&
    Boolean(conflictInfo?.isConflict);

  return (
    <div
      onClick={() => {
        if (isClosedOrder) {
          if (onOpenOutcomeAnalysis) {
            onOpenOutcomeAnalysis(signal);
          } else {
            onClick();
          }
        } else {
          onClick();
        }
      }}
      className={`p-3.5 rounded-xl transition-all cursor-pointer border shadow-md ${
        isWarningConflictCard
          ? `${
              isConflictAcknowledged ? 'opacity-95' : 'opacity-50'
            } bg-[#180C14] border-[#FF3366] hover:border-[#FF5252] shadow-[0_0_14px_rgba(255,51,102,0.18)]`
          : signal.isCorrelationBlocked
          ? 'opacity-75 bg-[#101420]/90 border-[#FF3366]/40 hover:border-[#2979FF]/60'
          : signal.isBestTradeNow
          ? 'bg-[#0F1626] border-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.1)] hover:border-[#2979FF]/60'
          : 'bg-[#0B101D]/90 border-[#1E293B] hover:border-[#2979FF]/60'
      }`}
    >
      {/* WARNING MODE: Red Top Banner & Conflict Badge */}
      {isWarningConflictCard && conflictInfo && (
        <div className="mb-2.5 space-y-1.5">
          <div className="px-2.5 py-1.5 rounded-lg bg-[#FF3366]/20 border border-[#FF3366]/65 flex items-center gap-1.5 text-[10px] font-black text-[#FF5252] leading-tight">
            <span className="leading-snug">{conflictInfo.warningBannerText}</span>
          </div>
          {conflictInfo.warningBadgeText && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-[#FF3366]/15 text-[#FF8A9E] border border-[#FF3366]/45 leading-snug">
                {conflictInfo.warningBadgeText}
              </span>
            </div>
          )}
        </div>
      )}

      {/* HEADER ROW: Symbol, Direction, Timeframe & Score (Left) | Quick Tools (Right) */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1E293B]">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Symbol */}
          <span className="text-[14px] sm:text-[15px] font-black tracking-tight text-[#F8FAFC] leading-none">
            {signal.pair.symbol}
          </span>

          {/* Buy / Sell Direction & Order Type Badge */}
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded leading-none ${
              isBuy
                ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40'
                : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/40'
            }`}
          >
            {signal.type.includes('LIMIT') || signal.type.includes('STOP')
              ? signal.type.replace('_', ' ')
              : isBuy
              ? 'BUY'
              : 'SELL'}
          </span>

          {/* Standby Setup Badge */}
          {isStandby && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded leading-none bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 flex items-center gap-1">
              <span>⏳ STANDBY</span>
            </span>
          )}

          {/* Winning Timeframe Badge [M15], [H1], or [H4] */}
          <span className="text-[10px] font-mono font-black bg-[#2979FF]/20 text-[#60A5FA] px-1.5 py-0.5 rounded border border-[#2979FF]/40 leading-none">
            [{signal.winningTf || signal.timeframe}]
          </span>

          {/* Confluence Score Badge */}
          <span
            className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border leading-none ${
              signal.confluenceScore >= 80
                ? 'text-[#00E676] bg-[#00E676]/15 border-[#00E676]/40'
                : signal.confluenceScore >= 70
                ? 'text-[#60A5FA] bg-[#2979FF]/20 border-[#2979FF]/40'
                : signal.confluenceScore >= 60
                ? 'text-[#FFD700] bg-[#FFD700]/15 border-[#FFD700]/40'
                : 'text-[#FF9100] bg-[#FF9100]/15 border-[#FF9100]/40'
            }`}
            title={
              signal.confluenceBreakdown?.summaryText
                ? `Real MTF Breakdown: ${signal.confluenceBreakdown.summaryText}`
                : `Multi-Timeframe Evaluated Score: ${signal.confluenceScore}/100`
            }
          >
            {signal.confluenceScore}/100{signal.confluenceScore < 60 ? ' (<60)' : ''}
          </span>

          {/* Quality Grade Badge (Grade C when 0 historical backtest trades) */}
          <span
            className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded border leading-none ${
              signal.quality === 'C' || signal.backtestTradeCount === 0
                ? 'bg-[#FF9100]/15 text-[#FF9100] border-[#FF9100]/40'
                : 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/40'
            }`}
            title={signal.winPctSource || `Quality Grade ${signal.quality}`}
          >
            Grade {signal.quality === 'A_PLUS' ? 'A+' : (signal.quality || 'C')}
          </span>
        </div>

        {/* Right Side: Quick Action Utilities */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Close Badge */}
          {onCloseTrade && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTrade(signal);
              }}
              className="flex items-center gap-1 text-[9.5px] font-black px-2 py-1 rounded-md border border-[#FF3366]/40 bg-[#FF3366]/15 hover:bg-[#FF3366]/30 text-[#FF5252] hover:text-[#FF1744] transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Close Trade: Dismiss & hide everywhere for 15 minutes. Background scanner will resume after 15m."
            >
              <X className="w-3 h-3 text-[#FF5252]" />
              <span>Close</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAuditModalOpen(true);
            }}
            className={`p-1.5 rounded-md border transition-all ${
              isParamChanged
                ? 'bg-[#FF9100]/20 border-[#FF9100]/60 text-[#FF9100] animate-pulse ring-1 ring-[#FF9100]/40'
                : 'bg-[#161F33] border-[#222F47] text-[#64748B] hover:text-[#F8FAFC]'
            }`}
            title={
              isParamChanged
                ? `⚠️ Parameters Changed: ${paramAudit?.reason || 'Tap to view before/after changes & trade verdict'}`
                : 'Signal Audit & Parameters Info (Tap to view status)'
            }
          >
            <Info className={`w-3.5 h-3.5 ${isParamChanged ? 'text-[#FF9100]' : ''}`} />
          </button>

          <button
            onClick={copyOrder}
            className="flex items-center gap-1 text-[10px] font-bold text-[#94A3B8] hover:text-[#F8FAFC] bg-[#161F33] px-2 py-1 rounded-md border border-[#222F47] transition-colors"
            title="Copy MT4/MT5 Order String"
          >
            {copied ? <Check className="w-3 h-3 text-[#00E676]" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'MT4'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAlert();
            }}
            className={`p-1.5 rounded-md border transition-colors ${
              signal.hasAlert
                ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]'
                : 'bg-[#161F33] border-[#222F47] text-[#64748B] hover:text-[#F8FAFC]'
            }`}
            title="Toggle Price Alert"
          >
            {signal.hasAlert ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-1.5 rounded-md border transition-colors ${
              signal.isFavorite
                ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]'
                : 'bg-[#161F33] border-[#222F47] text-[#64748B] hover:text-[#F8FAFC]'
            }`}
            title="Toggle Watchlist"
          >
            <Star className={`w-3.5 h-3.5 ${signal.isFavorite ? 'fill-[#FFD700]' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUB-ROW: Strategy Identity & Confluence Breakdown Badges */}
      <div className="py-1.5 flex flex-wrap items-center gap-1.5 border-b border-[#1E293B]/60">
        {/* Strategy Name Badge */}
        <span
          className="text-[9.5px] font-black px-1.5 py-0.5 rounded border leading-none bg-[#161F33] text-[#FFD700] border-[#FFD700]/30 truncate max-w-[140px]"
          title={`${stratCfg.title}: ${stratCfg.description}`}
        >
          {stratCfg.shortBadge}
        </span>

        {/* Real Confluence Breakdown */}
        <span
          className="text-[9px] font-mono text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5 rounded border border-[#00E676]/25 leading-none"
          title={signal.confluenceBreakdown?.summaryText || signal.scoreBreakdownText}
        >
          {signal.confluenceBreakdown?.summaryText || signal.scoreBreakdownText || `${signal.winningTf || signal.timeframe}:${signal.confluenceScore}`}
        </span>

        {/* Daily (D1) Macro Trend Gate */}
        <span
          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border leading-none ${
            signal.isD1Aligned !== false
              ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30'
              : 'bg-[#FF9100]/15 text-[#FF9100] border-[#FF9100]/40'
          }`}
          title={`Daily Macro Trend: ${signal.d1MacroTrend || 'Aligned with Structure'}`}
        >
          D1 {signal.d1MacroTrend === 'BEARISH' ? '↘' : '↗'}
        </span>

        {/* Volume & Exhaustion Check */}
        <span
          className="text-[9px] font-mono font-bold text-[#60A5FA] bg-[#2979FF]/10 px-1.5 py-0.5 rounded border border-[#2979FF]/25 leading-none"
          title="Volume & Candle Exhaustion: Institutional Sweep & Absorption Wick Verified"
        >
          Vol ✓
        </span>

        {/* Liquidity Sweep Status */}
        <span
          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded leading-none border ${
            signal.isLiquiditySwept
              ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/35'
              : 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/35'
          }`}
          title={signal.liquiditySweepDetail || 'Pre-Entry Liquidity Sweep Confirmation Status'}
        >
          {signal.liquiditySweepStatusTag || (signal.isLiquiditySwept ? '💧 LIQUIDITY SWEPT' : '⏳ AWAITING SWEEP')}
        </span>

        {/* Correlation Exposure / Hard Block Tag */}
        {signal.isCorrelationBlocked ? (
          <span
            className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded leading-none bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/50 flex items-center gap-1"
            title={signal.correlationBlockReason || 'Hard Blocked due to Currency Exposure Limits'}
          >
            <span>{signal.correlationExposureTag || '🚫 HARD BLOCKED: MAX CORRELATION'}</span>
          </span>
        ) : signal.correlationExposureTag ? (
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded leading-none bg-[#2979FF]/15 text-[#60A5FA] border border-[#2979FF]/35"
            title="Currency Exposure Correlation Guard"
          >
            {signal.correlationExposureTag}
          </span>
        ) : null}

        {/* Demoted from A+ Setup Notice Badge */}
        {signal.isDemotedFromActive && signal.demotionAudit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDemotionModalOpen(true);
            }}
            className="text-[9px] font-mono font-black px-2 py-0.5 rounded leading-none bg-[#FF9100]/20 text-[#FF9100] border border-[#FF9100]/50 flex items-center gap-1 hover:bg-[#FF9100]/30 transition-all cursor-pointer animate-pulse"
            title="⚠️ Trade Demoted from A+ Setup: Tap to see why and whether to run or stop"
          >
            <span>⚠️ DEMOTED FROM A+</span>
            <span className="text-[8px] underline decoration-dotted">Audit →</span>
          </button>
        )}

        {/* High-Impact News Guard Indicator */}
        {newsGuard && newsGuard.isWarning && !isClosedOrder && (
          <span
            className="text-[9px] font-bold text-[#FF3366] bg-[#FF3366]/15 px-1.5 py-0.5 rounded border border-[#FF3366]/40 flex items-center gap-1 animate-pulse leading-none"
            title={`High-Impact News: ${newsGuard.eventTitle} in ${newsGuard.minutesUntil} minutes!`}
          >
            <Flame className="w-2.5 h-2.5 text-[#FF3366]" />
            <span>News {newsGuard.minutesUntil > 0 ? `${newsGuard.minutesUntil}m` : 'Live'}</span>
          </span>
        )}

        {/* Currency Conflict Filter: Green Clean Badge */}
        {conflictFilterActive && !isClosedOrder && conflictInfo && !conflictInfo.isConflict && (
          <span
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded leading-none bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40"
            title="Verified clean against current desk currency bias"
          >
            {conflictInfo.cleanBadgeText}
          </span>
        )}

        {/* Real H4 50/9 EMA Audit Badge */}
        {signal.generationAudit && (
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded leading-none bg-[#161F33] text-[#38BDF8] border border-[#38BDF8]/30"
            title={`Real H4 50 EMA: ${signal.generationAudit.ema50} | 9 EMA: ${signal.generationAudit.ema9} (${signal.generationAudit.h4CandleCount} bars)`}
          >
            H4 EMA50:{signal.generationAudit.ema50} · EMA9:{signal.generationAudit.ema9}
          </span>
        )}

        {/* Real Backtest Provenance Badge */}
        {(signal.backtestTradeCount === 0 || signal.winPctSource === 'NO BACKTEST DATA - 0 TRADES') ? (
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded leading-none bg-[#FF9100]/15 text-[#FF9100] border border-[#FF9100]/35"
            title="Historical archive has 0 trades for this pair"
          >
            NO BACKTEST DATA - 0 TRADES
          </span>
        ) : signal.winPctSource ? (
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded leading-none bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30"
            title={signal.winPctSource}
          >
            {signal.winProbability}% Win ({signal.backtestTradeCount} trades)
          </span>
        ) : null}
      </div>

      {/* PRICE EXECUTION LEDGER GRID (6-Column Matrix) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-[#1E293B] bg-[#070A12] rounded-lg border border-[#1E293B] my-2 overflow-hidden shadow-inner">
        {/* Col 1: Live / Exit Price */}
        <div
          className={`p-2 transition-colors ${
            isClosedOrder
              ? ''
              : flashDir === 'up'
              ? 'bg-[#00E676]/15'
              : flashDir === 'down'
              ? 'bg-[#FF3366]/15'
              : ''
          }`}
        >
          <div className="text-[8px] text-[#94A3B8] font-black uppercase tracking-wider flex items-center gap-1 leading-tight">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                signal.status === 'HIT_SL'
                  ? 'bg-[#FF3366]'
                  : signal.status === 'HIT_TP'
                  ? 'bg-[#00E676]'
                  : marketOpen
                  ? 'bg-[#00E676] animate-pulse'
                  : 'bg-[#FFB300]'
              }`}
            />
            <span>
              {signal.status === 'HIT_SL' || signal.status === 'HIT_TP'
                ? 'Exit'
                : marketOpen
                ? 'Live'
                : 'Fri Close'}
            </span>
            {!isClosedOrder && flashDir === 'up' && <TrendingUp className="w-2.5 h-2.5 text-[#00E676] ml-auto" />}
            {!isClosedOrder && flashDir === 'down' && <TrendingDown className="w-2.5 h-2.5 text-[#FF3366] ml-auto" />}
          </div>
          <div
            className={`text-[12px] font-mono font-black tabular-nums leading-tight mt-1 ${
              signal.status === 'HIT_SL'
                ? 'text-[#FF3366]'
                : signal.status === 'HIT_TP'
                ? 'text-[#00E676]'
                : flashDir === 'up'
                ? 'text-[#00E676]'
                : flashDir === 'down'
                ? 'text-[#FF3366]'
                : 'text-[#F8FAFC]'
            }`}
          >
            {formatPrice(
              signal.pair,
              signal.status === 'HIT_SL' || signal.status === 'HIT_TP'
                ? signal.currentPrice
                : livePrice
            )}
          </div>
        </div>

        {/* Col 2: Entry Price */}
        <div className="p-2">
          <div className="text-[8px] text-[#64748B] font-black uppercase tracking-wider leading-tight">Entry</div>
          <div className="text-[12px] font-mono font-bold text-[#F8FAFC] tabular-nums leading-tight mt-1">
            {formatPrice(signal.pair, signal.entryPrice)}
          </div>
        </div>

        {/* Col 3: Stop Loss + Pip Risk */}
        <div className="p-2">
          <div className="text-[8px] text-[#FF3366] font-black uppercase tracking-wider leading-tight flex items-center justify-between">
            <span>SL</span>
            <span className="font-mono text-[8px] opacity-80">-{slPips}p</span>
          </div>
          <div className="text-[12px] font-mono font-bold text-[#FF3366] tabular-nums leading-tight mt-1">
            {formatPrice(signal.pair, signal.stopLoss)}
          </div>
        </div>

        {/* Col 4: Take Profit 1 + Pip Target */}
        <div className="p-2">
          <div className="text-[8px] text-[#00E676] font-black uppercase tracking-wider leading-tight flex items-center justify-between">
            <span>TP1</span>
            <span className="font-mono text-[8px] opacity-80">+{tp1Pips}p</span>
          </div>
          <div className="text-[12px] font-mono font-bold text-[#00E676] tabular-nums leading-tight mt-1">
            {formatPrice(signal.pair, signal.takeProfit1)}
          </div>
        </div>

        {/* Col 5: Risk:Reward & Spread */}
        <div className="p-2">
          <div className="text-[8px] text-[#2979FF] font-black uppercase tracking-wider leading-tight flex items-center justify-between">
            <span>R:R</span>
            <span className="text-[#64748B] font-mono text-[7.5px]">Spd {signal.pair.spreadPips}p</span>
          </div>
          <div className="text-[12px] font-mono font-bold text-[#2979FF] tabular-nums leading-tight mt-1">
            {signal.riskReward}
          </div>
        </div>

        {/* Col 6: Net Pips / Status Distance */}
        <div className="p-2">
          <div className="text-[8px] text-[#94A3B8] font-black uppercase tracking-wider leading-tight">
            {isStandby
              ? 'Standby'
              : isTimeExpired
              ? 'Status'
              : isPending
              ? 'To Entry'
              : isClosedOrder
              ? 'Result'
              : 'Live P&L'}
          </div>
          <div
            className={`text-[12px] font-mono font-black tabular-nums leading-tight mt-1 ${
              isStandby
                ? 'text-[#FFD700]'
                : isTimeExpired
                ? 'text-[#94A3B8]'
                : isPending
                ? 'text-[#FFD700]'
                : isClosedOrder
                ? isWin
                  ? 'text-[#00E676]'
                  : 'text-[#FF3366]'
                : isProfit
                ? 'text-[#00E676]'
                : 'text-[#FF3366]'
            }`}
          >
            {isStandby
              ? '0.0p (Wait)'
              : isTimeExpired
              ? 'EXPIRED'
              : isPending
              ? `${Math.abs(livePips)}p away`
              : isClosedOrder
              ? `${(signal.pips ?? 0) >= 0 ? `+${signal.pips}` : signal.pips}p`
              : `${isProfit ? `+${livePips}` : livePips}p`}
          </div>
        </div>
      </div>

      {/* TELEMETRY & TIMING PROGRESS TRACK */}
      <div className="mb-2 space-y-1">
        {isStandby ? (
          <div className="flex items-center justify-between text-[9.5px] font-mono text-[#FFD700]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#FFD700]" />
              <span className="font-bold">STANDBY SETUP:</span>
              <span className="text-[#94A3B8]">{signal.confluenceScore}% Confluence</span>
              <span className="text-[#64748B]">·</span>
              <span className="text-[#F8FAFC]">{getFormattedTimeElapsed(signal, nowClockMs)}</span>
            </div>
            <span className="text-[9px] text-[#FFD700] font-bold bg-[#FFD700]/10 px-1.5 py-0.5 rounded border border-[#FFD700]/30">
              Awaiting Trigger
            </span>
          </div>
        ) : isPending ? (
          <div className="flex items-center justify-between text-[9.5px] font-mono text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#FFD700] font-bold">PENDING</span>
              <span className="text-[#64748B]">·</span>
              <Clock className="w-3 h-3 text-[#2979FF]" />
              <span className="text-[#F8FAFC] font-bold">{formatSignalDateTime(signal.createdAtMs)}</span>
              <span className="text-[#64748B]">·</span>
              <span>{getFormattedTimeElapsed(signal, nowClockMs)}</span>
            </div>
            <div className="flex items-center gap-1 text-[#FFD700] font-bold">
              <Timer className="w-3 h-3 text-[#FFD700]" />
              <span>{isTimeExpired ? 'Expired' : `${signal.timeframe} Window: ${countdown}`}</span>
            </div>
          </div>
        ) : isClosedOrder ? (
          <div className="flex items-center justify-between text-[9.5px] font-mono flex-wrap gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-black px-2 py-0.5 rounded border flex items-center gap-1 shadow-xs ${
                  isWin
                    ? 'text-[#00E676] bg-[#00E676]/15 border-[#00E676]/40'
                    : 'text-[#FF3366] bg-[#FF3366]/15 border-[#FF3366]/40'
                }`}
              >
                <span>{isWin ? '🎯 TP HIT' : '🛑 SL HIT'}</span>
              </span>
              <span className="text-[#64748B]">·</span>
              <span className="text-[#94A3B8]">{getFormattedClosedTime(signal, nowClockMs)}</span>
              <span className="text-[#64748B]">·</span>
              <span className={isWin ? 'text-[#00E676] font-bold' : 'text-[#FF3366] font-bold'}>
                {isWin ? 'Win Held: ' : 'Loss Held: '}
                {formatDurationCompact(getTradeDurationMs(signal))}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`font-bold ${isWin ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                {(signal.pips ?? 0) >= 0 ? `+${signal.pips} pips` : `${signal.pips} pips`} · Exit {formatPrice(signal.pair, signal.currentPrice)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[9.5px] font-mono">
            <div className="flex items-center gap-1.5 text-[#94A3B8]">
              <span className={`font-bold ${isProfit ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                LIVE {isProfit ? `+${livePips}p` : `${livePips}p`}
              </span>
              <span className="text-[#64748B]">·</span>
              <Clock className="w-3 h-3 text-[#2979FF]" />
              <span className="text-[#F8FAFC] font-bold">{formatSignalDateTime(signal.createdAtMs)}</span>
              <span className="text-[#64748B]">·</span>
              <span>{getFormattedTimeElapsed(signal, nowClockMs)}</span>
              {!marketOpen && (
                <>
                  <span className="text-[#64748B]">·</span>
                  <span className="text-[#FFB300] font-bold">WEEKEND HOLD</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-[#00E676] font-bold">
              <Target className="w-3 h-3 text-[#00E676]" />
              <span>TP1 Target: {tpRatio}%</span>
            </div>
          </div>
        )}

        {/* Progress Bar Track */}
        <div className="w-full h-1.5 bg-[#182033] rounded-full overflow-hidden">
          {isStandby ? (
            <div className="h-full rounded-full bg-[#FFD700]/70" style={{ width: '100%' }} />
          ) : isPending ? (
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isTimeExpired
                  ? 'bg-[#FF3366]'
                  : validityRatio > 0.5
                  ? 'bg-[#00E676]'
                  : validityRatio > 0.2
                  ? 'bg-[#FFD700]'
                  : 'bg-[#FF3366] animate-pulse'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, validityRatio * 100))}%` }}
            />
          ) : isClosedOrder ? (
            <div
              className={`h-full rounded-full ${isWin ? 'bg-[#00E676]' : 'bg-[#FF3366]'}`}
              style={{ width: '100%' }}
            />
          ) : (
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                livePips >= 0 ? 'bg-[#00E676]' : 'bg-[#FF3366]'
              }`}
              style={{ width: `${Math.max(5, Math.min(100, tpRatio))}%` }}
            />
          )}
        </div>
      </div>

      {/* SYSTEM NOTICES & INSIGHT BANNERS PANEL */}
      {(
        (!isMarketExecution && isRunning && !isPending && !isClosedOrder && executedAtMs) ||
        isStandby ||
        Boolean(signal.isDemotedFromActive && signal.demotionAudit) ||
        signal.tfUpdateNotice ||
        ((signal.isBreakevenArmed || (signal.status === 'RUNNING' && tpRatio >= 45)) && !isClosedOrder) ||
        (newsGuard && newsGuard.isWarning && !isClosedOrder) ||
        (signal.slLearningAudit && signal.slLearningAudit.applied && !isClosedOrder) ||
        (isParamChanged && paramAudit)
      ) && (
        <div className="my-2 space-y-1">
          {/* Trade Demoted from A+ Setup Notice Banner */}
          {signal.isDemotedFromActive && signal.demotionAudit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDemotionModalOpen(true);
              }}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#FF9100]/15 border border-[#FF9100]/50 hover:bg-[#FF9100]/25 flex items-center justify-between text-[9.5px] font-mono text-[#FF9100] transition-all cursor-pointer text-left shadow-xs"
              title="Click to view why trade was demoted from A+ setup, audit details and whether to hold or close"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF9100] shrink-0" />
                <span className="font-black text-[#FFD700] shrink-0">DEMOTED FROM A+:</span>
                <span className="text-[#F8FAFC] truncate text-[9px]">
                  {signal.demotionAudit.reason}
                </span>
              </div>
              <span className="text-[8.5px] font-bold text-[#FFD700] shrink-0 ml-1.5 underline underline-offset-2">
                View Advice & Verdict →
              </span>
            </button>
          )}
          {/* Executed Fill Telemetry */}
          {!isMarketExecution && isRunning && !isPending && !isClosedOrder && executedAtMs && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-2.5 py-1 rounded-md bg-[#161F33] border border-[#2979FF]/40 flex flex-wrap items-center justify-between gap-1 text-[9px] font-mono cursor-pointer hover:border-[#2979FF]/80 transition-all"
              title={`Order Type: ${signal.type.replace('_', ' ')} | Posted: ${formatSignalDateTime(signal.createdAtMs)} | Executed at Entry: ${formatSignalDateTime(executedAtMs)} (${waitText} after posting)`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.2 rounded bg-[#2979FF]/20 text-[#60A5FA] border border-[#2979FF]/40 font-black text-[8px] uppercase shrink-0">
                  {signal.type.replace('_', ' ')}
                </span>
                <span className="font-bold text-[#FFD700] flex items-center gap-1 shrink-0">
                  <Zap className="w-2.5 h-2.5 text-[#FFD700] fill-[#FFD700]/30" />
                  <span>EXECUTED:</span>
                  <span className="text-[#00E676] font-black">{executedTimeText.replace('Executed ', '')}</span>
                </span>
                <span className="text-[#94A3B8] text-[8px] hidden sm:inline">
                  ({formatSignalDateTime(executedAtMs)})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] text-[#94A3B8] font-mono shrink-0">
                <span>Posted: <span className="text-[#F8FAFC] font-bold">{getFormattedTimeElapsed(signal, nowClockMs).replace('Posted ', '')}</span></span>
                <span className="text-[#64748B]">·</span>
                <span className="text-[#60A5FA] font-bold bg-[#2979FF]/15 px-1 rounded border border-[#2979FF]/30">
                  Time to Fill: +{waitText}
                </span>
              </div>
            </div>
          )}

          {/* Standby Setup Trigger */}
          {isStandby && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-2.5 py-1 rounded-md bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-between text-[9px] font-mono text-[#FFD700] cursor-pointer hover:bg-[#FFD700]/15 transition-all"
              title={signal.standbyTriggerDetail || 'Monitoring Order Block & liquidity sweep before entry execution.'}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-3 h-3 text-[#FFD700] shrink-0" />
                <span className="font-bold text-[#FFD700] shrink-0">STANDBY TRIGGER:</span>
                <span className="text-[#F8FAFC] truncate text-[9px]">
                  {signal.standbyTriggerDetail || 'Monitoring Order Block & liquidity sweep before entry execution.'}
                </span>
              </div>
              <span className="text-[8.5px] font-bold text-[#FFD700] shrink-0 ml-1.5">
                80-87% Gate
              </span>
            </div>
          )}

          {/* Timeframe Update Notice */}
          {signal.tfUpdateNotice && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-2.5 py-1 rounded-md bg-[#2979FF]/10 border border-[#2979FF]/30 flex items-center justify-between text-[9px] font-mono text-[#2979FF] cursor-pointer hover:bg-[#2979FF]/15 transition-all"
            >
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-bold shrink-0">⚡ TIMEFRAME UPDATE:</span>
                <span className="text-[#F8FAFC] truncate">{signal.tfUpdateNotice}</span>
              </div>
            </div>
          )}

          {/* Breakeven Protection */}
          {(() => {
            const cardTf = (signal.winningTf || signal.timeframe || 'M15').toUpperCase();
            const beThresholdPct = cardTf === 'H4' || cardTf === 'D1' ? 30 : 45;
            return (signal.isBreakevenArmed || (signal.status === 'RUNNING' && tpRatio >= beThresholdPct)) && !isClosedOrder;
          })() && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-2.5 py-1 rounded-md bg-[#00E676]/15 border border-[#00E676]/40 flex items-center justify-between text-[9px] font-mono text-[#00E676] cursor-pointer hover:bg-[#00E676]/20 transition-all"
              title="1:1 Risk/Reward reached — Stop Loss automatically moved to Breakeven (+1 pip buffer)."
            >
              <div className="flex items-center gap-1 min-w-0">
                <ShieldCheck className="w-3 h-3 text-[#00E676] shrink-0" />
                <span className="font-black shrink-0">SL AT BREAKEVEN (+1p):</span>
                <span className="text-[#F8FAFC] truncate">Protected at {formatPrice(signal.pair, signal.entryPrice)}</span>
              </div>
              <span className="text-[8.5px] text-[#00E676] font-bold shrink-0">
                Zero Risk Active
              </span>
            </div>
          )}

          {/* News Blackout */}
          {newsGuard && newsGuard.isWarning && !isClosedOrder && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-2.5 py-1 rounded-md bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-between text-[9px] font-mono text-[#FF3366] cursor-pointer hover:bg-[#FF3366]/20 transition-all animate-pulse"
              title={`Tier-1 News Blackout Window: ${newsGuard.eventTitle}`}
            >
              <div className="flex items-center gap-1 min-w-0">
                <Flame className="w-3 h-3 text-[#FF3366] shrink-0" />
                <span className="font-black shrink-0">NEWS BLACKOUT:</span>
                <span className="text-[#F8FAFC] truncate">{newsGuard.eventTitle} ({newsGuard.minutesUntil > 0 ? `in ${newsGuard.minutesUntil}m` : 'Live'})</span>
              </div>
              <span className="text-[8.5px] text-[#FF9100] font-semibold shrink-0">
                Spread Gate Active
              </span>
            </div>
          )}

          {/* SL Guard */}
          {signal.slLearningAudit && signal.slLearningAudit.applied && !isClosedOrder && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-2.5 py-1 rounded-md bg-[#00E676]/10 border border-[#00E676]/30 flex items-center justify-between text-[9px] font-mono text-[#00E676] cursor-pointer hover:bg-[#00E676]/15 transition-all"
              title={signal.slLearningAudit.lessonsAppliedSummary}
            >
              <div className="flex items-center gap-1 min-w-0">
                <ShieldCheck className="w-3 h-3 text-[#00E676] shrink-0" />
                <span className="font-bold shrink-0">SL GUARD:</span>
                <span className="text-[#F8FAFC] truncate">+{signal.slLearningAudit.antiWickExtraBufferPips}p ATR Buffer</span>
              </div>
              <span className="text-[8.5px] text-[#94A3B8] font-semibold shrink-0">
                H4 Aligned · -68% Repeat Loss
              </span>
            </div>
          )}

          {/* Recalculated Audit */}
          {isParamChanged && paramAudit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAuditModalOpen(true);
              }}
              className="w-full px-2.5 py-1 rounded-md bg-[#FF9100]/10 border border-[#FF9100]/30 hover:bg-[#FF9100]/15 flex items-center justify-between text-[9px] font-mono text-[#FF9100] transition-all cursor-pointer text-left"
              title="Click to view full parameter changes, institutional reason, and trade verdict"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Info className="w-3 h-3 text-[#FF9100] shrink-0" />
                <span className="font-bold text-[#FFD700] shrink-0">RECALCULATED:</span>
                <span className="text-[#F8FAFC] truncate text-[9px]">
                  {paramAudit.reason}
                </span>
              </div>
              <span className="text-[8.5px] font-bold text-[#FF9100] shrink-0 ml-1.5 underline underline-offset-2">
                View Audit →
              </span>
            </button>
          )}
        </div>
      )}

      {/* WARNING MODE: Acknowledge Conflict Button */}
      {isWarningConflictCard && (
        <div className="mb-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onAcknowledgeConflict) onAcknowledgeConflict(signal.id);
            }}
            className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isConflictAcknowledged
                ? 'bg-[#FF9100]/20 border-[#FF9100]/60 text-[#FFD700]'
                : 'bg-[#FF3366]/20 hover:bg-[#FF3366]/35 border-[#FF3366]/60 text-[#FF8A9E]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isConflictAcknowledged
                ? '✓ Risk Acknowledged — Proceed Carefully'
                : 'Trade Anyway - I Understand Risk'}
            </span>
          </button>
        </div>
      )}

      {/* ACTION DOCK (Bottom Action Buttons) */}
      {isClosedOrder ? (
        <div className="flex items-center gap-1.5 pt-2 border-t border-[#1E293B]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenOutcomeAnalysis) onOpenOutcomeAnalysis(signal);
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-[10px] sm:text-[10.5px] font-black py-1.5 px-2.5 rounded-md border transition-all cursor-pointer shadow-xs ${
              isWin
                ? 'bg-[#00E676]/20 hover:bg-[#00E676]/30 text-[#00E676] border-[#00E676]/50'
                : 'bg-[#FF3366]/20 hover:bg-[#FF3366]/30 text-[#FF3366] border-[#FF3366]/50'
            }`}
            title={isWin ? 'Open Detailed Take-Profit Forensic Breakdown' : 'Open Detailed Stop-Loss Post-Mortem Audit'}
          >
            <span>{isWin ? '🎯 Why TP Hit? (Audit)' : '🛑 Why SL Hit? (Audit)'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenChart) onOpenChart();
            }}
            className="flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 px-2.5 rounded-md bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 transition-all cursor-pointer"
            title="View Historical Chart Execution"
          >
            <BarChart2 className="w-3 h-3 text-[#00E676] shrink-0" />
            <span>Chart</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTimeMachine) onOpenTimeMachine(signal);
              else setIsTimeMachineOpen(true);
            }}
            className="flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 px-2 rounded-md bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/35 transition-all cursor-pointer"
            title="Replay in Quantum Time Machine"
          >
            <History className="w-3 h-3 text-[#A78BFA] shrink-0" />
            <span className="truncate">Time Machine</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenBacktest) onOpenBacktest();
            }}
            className="flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 px-2.5 rounded-md bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/35 transition-all cursor-pointer"
            title="Test in Quant Lab Backtest"
          >
            <FlaskConical className="w-3 h-3 text-[#FFD700] shrink-0" />
            <span>Backtest</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAi();
            }}
            className="flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 px-2.5 rounded-md bg-[#2979FF]/15 hover:bg-[#2979FF]/25 text-[#2979FF] border border-[#2979FF]/30 transition-all cursor-pointer"
            title="Ask AI Copilot for In-Depth Audit"
          >
            <Sparkles className="w-3 h-3 text-[#2979FF] shrink-0" />
            <span>AI Audit</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-2 border-t border-[#1E293B]">
          {isStandby ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAlert();
              }}
              className="flex items-center justify-center gap-1 text-[9.5px] sm:text-[10px] font-bold py-1.5 px-1 rounded-md bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/35 transition-all cursor-pointer"
              title="Set Price Alert for Trigger Confirmation"
            >
              <Bell className="w-3 h-3 text-[#FFD700] shrink-0" />
              <span className="truncate">Alert</span>
            </button>
          ) : onOpenElev8Order ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenElev8Order();
              }}
              className="flex items-center justify-center gap-1 text-[9.5px] sm:text-[10px] font-black py-1.5 px-1 rounded-md bg-[#2979FF]/20 hover:bg-[#2979FF]/30 text-[#F8FAFC] border border-[#2979FF]/45 transition-all cursor-pointer"
              title="Execute Custom Lots & P&L on Elev8 MT5"
            >
              <Zap className="w-3 h-3 text-[#00E676] shrink-0" />
              <span className="truncate">MT5 Order</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex items-center justify-center gap-1 text-[9.5px] sm:text-[10px] font-bold py-1.5 px-1 rounded-md bg-[#161F33] hover:bg-[#222F47] text-[#F8FAFC] border border-[#222F47] transition-all cursor-pointer"
            title="Open Setup Details"
          >
            <SlidersHorizontal className="w-3 h-3 text-[#94A3B8] shrink-0" />
            <span className="truncate">Setup</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAi();
            }}
            className="flex items-center justify-center gap-1 text-[9.5px] sm:text-[10px] font-bold py-1.5 px-1 rounded-md bg-[#2979FF]/15 hover:bg-[#2979FF]/25 text-[#2979FF] border border-[#2979FF]/30 transition-all cursor-pointer"
            title="Audit setup with Gemini AI"
          >
            <Sparkles className="w-3 h-3 text-[#2979FF] shrink-0" />
            <span className="truncate">AI Audit</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenChart) onOpenChart();
            }}
            className="flex items-center justify-center gap-1 text-[9.5px] sm:text-[10px] font-bold py-1.5 px-1 rounded-md bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 transition-all cursor-pointer"
            title="View Live TradingView Chart with Deriv Stream"
          >
            <BarChart2 className="w-3 h-3 text-[#00E676] shrink-0" />
            <span className="truncate">Chart</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTimeMachine) onOpenTimeMachine(signal);
              else setIsTimeMachineOpen(true);
            }}
            className="flex items-center justify-center gap-1 text-[9.5px] sm:text-[10px] font-bold py-1.5 px-1 rounded-md bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/40 transition-all cursor-pointer"
            title="Time Machine: AI Forward Projection & Bar-by-Bar Replay"
          >
            <History className="w-3 h-3 text-[#A78BFA] shrink-0" />
            <span className="truncate">Time Machine</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenBacktest) onOpenBacktest();
            }}
            className="flex items-center justify-center gap-1 text-[9.5px] sm:text-[10px] font-bold py-1.5 px-1 rounded-md bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/30 transition-all cursor-pointer"
            title="Test historical performance in Quant Lab"
          >
            <FlaskConical className="w-3 h-3 text-[#FFD700] shrink-0" />
            <span className="truncate">Backtest</span>
          </button>
        </div>
      )}

      {/* Signal Parameter Change Audit Modal */}
      <SignalChangeAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        signal={signal}
        onAskAi={onAskAi}
      />

      {/* Trade Demotion Audit Modal */}
      <TradeDemotionAuditModal
        isOpen={isDemotionModalOpen}
        onClose={() => setIsDemotionModalOpen(false)}
        signal={signal}
        onAskAi={onAskAi}
      />

      {/* Time Machine Modal */}
      <TimeMachineModal
        isOpen={isTimeMachineOpen}
        onClose={() => setIsTimeMachineOpen(false)}
        signal={signal}
        onOpenElev8Order={onOpenElev8Order ? () => onOpenElev8Order() : undefined}
      />
    </div>
  );
};
