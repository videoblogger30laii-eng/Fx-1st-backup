import React, { useState, useEffect, useRef } from 'react';
import { ForexSignal, getSignalStrategy, STRATEGY_CONFIGS, isMarketExecutionSignal } from '../types';
import {
  formatPrice,
  calculatePips,
  getFormattedCountdown,
  getRemainingValidityMs,
  getFormattedTimeElapsed,
  getFormattedClosedTime,
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
  ShieldCheck,
  Info,
  X,
  ChevronDown,
  ChevronUp
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
  const [showDetails, setShowDetails] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isDemotionModalOpen, setIsDemotionModalOpen] = useState(false);
  const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);

  const isBuy = signal.type.startsWith('BUY');
  const isStandby = signal.status === 'STANDBY';
  const isPending = (signal.status === 'PENDING' || signal.isPending) && !isStandby;
  const isTimeExpired = isPending && getRemainingValidityMs(signal, nowClockMs) <= 0;
  const countdown = getFormattedCountdown(signal, nowClockMs);
  const newsGuard = economicCalendarService.getNewsGuard(signal.pair.symbol);
  const isParamChanged = isSignalChangedOrRecalculated(signal);
  const paramAudit = isParamChanged ? getSignalParameterAudit(signal) : null;

  const isClosedOrder = signal.status === 'HIT_SL' || signal.status === 'HIT_TP' || Boolean(signal.closedAtMs);

  // Live real-time price hook from Deriv/Twelve Data (active cards only)
  const [livePrice, setLivePrice] = useState<number>(() => {
    if (isClosedOrder) return signal.currentPrice || signal.entryPrice;
    const current = realPriceService.getPrice(signal.pair.symbol);
    return current > 0 ? current : (signal.pair.currentPrice || signal.entryPrice);
  });
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number>(livePrice);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    prevPriceRef.current = livePrice;
  }, [livePrice]);

  useEffect(() => {
    if (isClosedOrder) return;

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
          setLivePrice(tick.price);
        }
      }
    });

    return () => {
      unsubscribe();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [signal.pair.symbol, isClosedOrder]);

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
  const slPips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.stopLoss, isBuy));
  const tp1Pips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.takeProfit1, isBuy));
  const tpRatio = Math.round(getTpProgressRatio(signal, livePrice) * 100);
  const validityRatio = getValidityProgress(signal, nowClockMs);
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

  const cardTf = (signal.winningTf || signal.timeframe || 'M15').toUpperCase();
  const beThresholdPct = cardTf === 'H4' || cardTf === 'D1' ? 30 : 45;
  const isBreakevenActive = (signal.isBreakevenArmed || (signal.status === 'RUNNING' && tpRatio >= beThresholdPct)) && !isClosedOrder;

  const scoreColorClass =
    signal.confluenceScore >= 80
      ? 'text-[#00E676]'
      : signal.confluenceScore >= 70
      ? 'text-[#60A5FA]'
      : signal.confluenceScore >= 60
      ? 'text-[#FFD700]'
      : 'text-[#FF9100]';

  const gradeLabel = signal.quality === 'A_PLUS' ? 'A+' : (signal.quality || 'C');
  const hasDiagnosticsNotes = Boolean(
    (signal.slLearningAudit && signal.slLearningAudit.applied && !isClosedOrder) ||
    signal.tfUpdateNotice ||
    executedAtMs ||
    signal.correlationExposureTag ||
    signal.isCorrelationBlocked
  );

  return (
    <div
      onClick={() => {
        if (isClosedOrder && onOpenOutcomeAnalysis) {
          onOpenOutcomeAnalysis(signal);
        } else {
          onClick();
        }
      }}
      className={`p-3.5 rounded-2xl transition-all cursor-pointer border shadow-md space-y-2.5 ${
        isWarningConflictCard
          ? `${
              isConflictAcknowledged ? 'opacity-95' : 'opacity-65'
            } bg-[#180C14] border-[#FF3366] hover:border-[#FF5252] shadow-[0_0_14px_rgba(255,51,102,0.18)]`
          : signal.isCorrelationBlocked
          ? 'opacity-80 bg-[#101420]/90 border-[#FF3366]/40 hover:border-[#2979FF]/60'
          : signal.isBestTradeNow
          ? 'bg-[#0F1626] border-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.08)] hover:border-[#2979FF]/60'
          : 'bg-[#0B101D]/95 border-[#1E293B] hover:border-[#2979FF]/60'
      }`}
    >
      {/* WARNING MODE BANNER */}
      {isWarningConflictCard && conflictInfo && (
        <div className="px-2.5 py-2 rounded-lg bg-[#FF3366]/15 border-l-2 border-[#FF3366] space-y-1">
          <div className="text-[10.5px] font-black text-[#FF5252] leading-snug">
            {conflictInfo.warningBannerText}
          </div>
          {conflictInfo.warningBadgeText && (
            <div className="text-[9.5px] font-mono text-[#FF8A9E] leading-snug">
              {conflictInfo.warningBadgeText}
            </div>
          )}
        </div>
      )}

      {/* TIER 1: CLEAN HEADER (Identity + Utilities on Row 1 | Unboxed Metadata + Confluence Score on Row 2) */}
      <div className="space-y-1.5 pb-2 border-b border-[#1E293B]">
        {/* Row 1: Symbol + Direction + Utility Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
            <span className="text-[15px] sm:text-[16px] font-black tracking-tight text-[#F8FAFC] leading-none whitespace-nowrap">
              {signal.pair.symbol}
            </span>

            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded leading-none whitespace-nowrap shrink-0 ${
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

            {isStandby ? (
              <span className="text-[10px] font-black text-[#FFD700] whitespace-nowrap shrink-0">
                · STANDBY
              </span>
            ) : isClosedOrder ? (
              <span
                className={`text-[10px] font-black whitespace-nowrap shrink-0 ${
                  isWin ? 'text-[#00E676]' : 'text-[#FF3366]'
                }`}
              >
                · {isWin ? 'TP HIT' : 'SL HIT'}
              </span>
            ) : isTimeExpired ? (
              <span className="text-[10px] font-black text-[#94A3B8] whitespace-nowrap shrink-0">
                · EXPIRED
              </span>
            ) : null}
          </div>

          {/* Right Quick Utilities */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {onCloseTrade && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTrade(signal);
                }}
                className="h-7 px-2 flex items-center gap-1 text-[10px] font-bold rounded-lg border border-[#FF3366]/35 bg-[#FF3366]/10 hover:bg-[#FF3366]/25 text-[#FF5252] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                title="Dismiss & hide for 15 minutes"
              >
                <X className="w-3 h-3" />
                <span>Close</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAuditModalOpen(true);
              }}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                isParamChanged
                  ? 'bg-[#FF9100]/20 border-[#FF9100]/60 text-[#FF9100] ring-1 ring-[#FF9100]/30'
                  : 'bg-[#111827] border-[#1E293B] text-[#64748B] hover:text-[#F8FAFC]'
              }`}
              title={
                isParamChanged
                  ? `Parameters Changed: ${paramAudit?.reason || 'Tap to view before/after audit'}`
                  : 'Signal Audit & Parameters Info'
              }
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={copyOrder}
              className="h-7 px-2 flex items-center justify-center gap-1 text-[10px] font-bold text-[#94A3B8] hover:text-[#F8FAFC] bg-[#111827] rounded-lg border border-[#1E293B] transition-colors cursor-pointer"
              title="Copy MT4/MT5 Order"
            >
              {copied ? <Check className="w-3 h-3 text-[#00E676]" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAlert();
              }}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                signal.hasAlert
                  ? 'bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]'
                  : 'bg-[#111827] border-[#1E293B] text-[#64748B] hover:text-[#F8FAFC]'
              }`}
              title="Toggle Price Alert"
            >
              {signal.hasAlert ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                signal.isFavorite
                  ? 'bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]'
                  : 'bg-[#111827] border-[#1E293B] text-[#64748B] hover:text-[#F8FAFC]'
              }`}
              title="Toggle Watchlist"
            >
              <Star className={`w-3.5 h-3.5 ${signal.isFavorite ? 'fill-[#FFD700]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Unboxed Telemetry Metadata + Right Focal Confluence Score */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[10.5px] text-[#94A3B8] min-w-0 leading-snug">
            <span className="font-mono font-bold text-[#60A5FA]">{cardTf}</span>
            <span className="text-[#475569]">·</span>
            <span className="font-semibold text-[#E2E8F0] truncate max-w-[140px]" title={stratCfg.title}>
              {stratCfg.shortBadge}
            </span>
            <span className="text-[#475569]">·</span>
            <span
              className={`font-semibold ${
                signal.quality === 'C' || signal.backtestTradeCount === 0 ? 'text-[#FF9100]' : 'text-[#00E676]'
              }`}
              title={signal.winPctSource || `Quality Grade ${gradeLabel}`}
            >
              Grade {gradeLabel}
            </span>
            <span className="text-[#475569]">·</span>
            {isClosedOrder ? (
              <span className="font-mono text-[#94A3B8]">
                {getFormattedClosedTime(signal, nowClockMs)} · Held {formatDurationCompact(getTradeDurationMs(signal))}
              </span>
            ) : (
              <span className="font-mono text-[#94A3B8]">
                {getFormattedTimeElapsed(signal, nowClockMs)} · {formatSignalDateTime(signal.createdAtMs)}
              </span>
            )}
            {!marketOpen && !isClosedOrder && (
              <>
                <span className="text-[#475569]">·</span>
                <span className="font-semibold text-[#FFB300]">Weekend Hold</span>
              </>
            )}
          </div>

          {/* Focal Confluence Score */}
          <div
            className="shrink-0 flex items-baseline gap-0.5 font-mono tabular-nums"
            title={
              signal.confluenceBreakdown?.summaryText
                ? `Confluence Math: ${signal.confluenceBreakdown.summaryText}`
                : `Confluence Score: ${signal.confluenceScore}/100`
            }
          >
            <span className={`text-[15px] font-black leading-none ${scoreColorClass}`}>
              {signal.confluenceScore}
            </span>
            <span className="text-[10px] text-[#64748B] font-bold">/100</span>
          </div>
        </div>
      </div>

      {/* TIER 2: PRICE EXECUTION MATRIX (3x2 Mobile / 6-Column Desktop) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-[#1E293B] bg-[#070A12] rounded-xl border border-[#1E293B] overflow-hidden">
        {/* Live / Exit */}
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
          <div className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider flex items-center gap-1 leading-none">
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
                : 'Close'}
            </span>
            {!isClosedOrder && flashDir === 'up' && <TrendingUp className="w-2.5 h-2.5 text-[#00E676] ml-auto" />}
            {!isClosedOrder && flashDir === 'down' && <TrendingDown className="w-2.5 h-2.5 text-[#FF3366] ml-auto" />}
          </div>
          <div
            className={`text-[12.5px] font-mono font-black tabular-nums leading-tight mt-1 ${
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

        {/* Entry */}
        <div className="p-2">
          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider leading-none">Entry</div>
          <div className="text-[12.5px] font-mono font-bold text-[#F8FAFC] tabular-nums leading-tight mt-1">
            {formatPrice(signal.pair, signal.entryPrice)}
          </div>
        </div>

        {/* Stop Loss */}
        <div className="p-2">
          <div className="text-[9px] text-[#FF3366] font-bold uppercase tracking-wider leading-none flex items-center justify-between">
            <span>SL</span>
            <span className="font-mono text-[8.5px] opacity-85">-{slPips}p</span>
          </div>
          <div className="text-[12.5px] font-mono font-bold text-[#FF3366] tabular-nums leading-tight mt-1">
            {formatPrice(signal.pair, signal.stopLoss)}
          </div>
        </div>

        {/* Take Profit 1 */}
        <div className="p-2">
          <div className="text-[9px] text-[#00E676] font-bold uppercase tracking-wider leading-none flex items-center justify-between">
            <span>TP1</span>
            <span className="font-mono text-[8.5px] opacity-85">+{tp1Pips}p</span>
          </div>
          <div className="text-[12.5px] font-mono font-bold text-[#00E676] tabular-nums leading-tight mt-1">
            {formatPrice(signal.pair, signal.takeProfit1)}
          </div>
        </div>

        {/* Risk:Reward & Spread */}
        <div className="p-2">
          <div className="text-[9px] text-[#60A5FA] font-bold uppercase tracking-wider leading-none flex items-center justify-between">
            <span>R:R</span>
            <span className="text-[#64748B] font-mono text-[8px]">Spd {signal.pair.spreadPips}p</span>
          </div>
          <div className="text-[12.5px] font-mono font-bold text-[#60A5FA] tabular-nums leading-tight mt-1">
            {signal.riskReward}
          </div>
        </div>

        {/* Live P&L / Result */}
        <div className="p-2">
          <div className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider leading-none">
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
            className={`text-[12.5px] font-mono font-black tabular-nums leading-tight mt-1 ${
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
              ? 'Wait'
              : isTimeExpired
              ? 'EXPIRED'
              : isPending
              ? `${Math.abs(livePips)}p`
              : isClosedOrder
              ? `${(signal.pips ?? 0) >= 0 ? `+${signal.pips}` : signal.pips}p`
              : `${isProfit ? `+${livePips}` : livePips}p`}
          </div>
        </div>
      </div>

      {/* TIER 3: CLEAN PROGRESS TRACK + SCANNABLE TELEMETRY & DETAILS TOGGLE */}
      <div className="space-y-2">
        {/* Progress Header + Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10.5px] font-mono tabular-nums">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {isStandby ? (
                <>
                  <Clock className="w-3 h-3 text-[#FFD700] shrink-0" />
                  <span className="text-[#FFD700] font-bold truncate">Awaiting Trigger Confirmation</span>
                </>
              ) : isPending ? (
                <>
                  <Timer className="w-3 h-3 text-[#FFD700] shrink-0" />
                  <span className="text-[#94A3B8] truncate">
                    {isTimeExpired ? 'Window Expired' : `${signal.timeframe} Window: ${countdown}`}
                  </span>
                </>
              ) : isClosedOrder ? (
                <span className={`font-bold truncate ${isWin ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                  {isWin ? 'Take Profit Reached' : 'Stop Loss Hit'} · Exit {formatPrice(signal.pair, signal.currentPrice)}
                </span>
              ) : (
                <>
                  <Target className="w-3 h-3 text-[#00E676] shrink-0" />
                  <span className="text-[#94A3B8] font-semibold">
                    TP1 Progress: <span className="text-[#F8FAFC] font-bold">{tpRatio}%</span>
                  </span>
                </>
              )}
            </div>

            <span
              className={`font-bold whitespace-nowrap shrink-0 ${
                isStandby || isPending
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
                ? 'Standby'
                : isTimeExpired
                ? 'Expired'
                : isPending
                ? `${Math.abs(livePips)}p to entry`
                : isClosedOrder
                ? `${(signal.pips ?? 0) >= 0 ? `+${signal.pips}` : signal.pips} pips`
                : `LIVE ${isProfit ? `+${livePips}` : livePips}p`}
            </span>
          </div>

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
                    : 'bg-[#FF3366]'
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

        {/* Unboxed Micro-Diagnostics Bar + Collapsible Details Toggle */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1E293B]/60">
          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] font-mono min-w-0">
            {conflictFilterActive && !isClosedOrder && conflictInfo && !conflictInfo.isConflict && (
              <span className="text-[#00E676] font-semibold">✓ No Conflict</span>
            )}
            <span className={signal.isD1Aligned !== false ? 'text-[#00E676]' : 'text-[#FF9100]'}>
              D1 {signal.d1MacroTrend === 'BEARISH' ? '↘' : '↗'}
            </span>
            <span className={signal.isLiquiditySwept ? 'text-[#00E676]' : 'text-[#FFD700]'}>
              {signal.isLiquiditySwept ? '💧 Swept' : '⏳ Wait Sweep'}
            </span>
            {signal.backtestTradeCount === 0 || signal.winPctSource === 'NO BACKTEST DATA - 0 TRADES' ? (
              <span className="text-[#FF9100]">0 Backtest</span>
            ) : signal.winPctSource ? (
              <span className="text-[#94A3B8]">{signal.winProbability}% Win ({signal.backtestTradeCount})</span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails((prev) => !prev);
            }}
            className="flex items-center gap-1 text-[10px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer shrink-0 py-0.5 px-1.5 rounded hover:bg-[#161F33]"
          >
            {hasDiagnosticsNotes && !showDetails && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
            )}
            <span>{showDetails ? 'Hide' : 'Details'}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expanded Technical Drawer */}
        {showDetails && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#070A12] border border-[#1E293B] rounded-xl p-2.5 text-[10px] font-mono space-y-1.5 text-[#94A3B8]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[#64748B] shrink-0">Score Math</span>
              <span className="text-[#00E676] text-right">
                {signal.confluenceBreakdown?.summaryText || signal.scoreBreakdownText || `${cardTf}: ${signal.confluenceScore}/100`}
              </span>
            </div>

            {signal.generationAudit && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748B] shrink-0">H4 EMAs</span>
                <span className="text-[#38BDF8] text-right">
                  EMA50 {signal.generationAudit.ema50} · EMA9 {signal.generationAudit.ema9} ({signal.generationAudit.h4CandleCount} bars)
                </span>
              </div>
            )}

            <div className="flex items-start justify-between gap-2">
              <span className="text-[#64748B] shrink-0">Liquidity</span>
              <span className="text-[#E2E8F0] text-right">
                {signal.liquiditySweepStatusTag || (signal.isLiquiditySwept ? 'Liquidity Swept' : 'Awaiting Sweep')} · Vol ✓
              </span>
            </div>

            {signal.slLearningAudit && signal.slLearningAudit.applied && !isClosedOrder && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748B] shrink-0">SL Guard</span>
                <span className="text-[#00E676] text-right">
                  +{signal.slLearningAudit.antiWickExtraBufferPips}p ATR Buffer · H4 Aligned
                </span>
              </div>
            )}

            {(signal.isCorrelationBlocked || signal.correlationExposureTag) && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Correlation</span>
                <span className={`text-right ${signal.isCorrelationBlocked ? 'text-[#FF3366] font-bold' : 'text-[#60A5FA]'}`}>
                  {signal.correlationBlockReason || signal.correlationExposureTag}
                </span>
              </div>
            )}

            {executedAtMs && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Fill Time</span>
                <span className="text-[#60A5FA] text-right">
                  {executedTimeText.replace('Executed ', '')} (+{waitText} after signal)
                </span>
              </div>
            )}

            {signal.tfUpdateNotice && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748B] shrink-0">TF Update</span>
                <span className="text-[#60A5FA] text-right">{signal.tfUpdateNotice}</span>
              </div>
            )}

            {signal.winPctSource && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Backtest</span>
                <span className="text-[#E2E8F0] text-right">{signal.winPctSource}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TIER 4: PRIORITY ACTIONABLE ALERTS (Only time-sensitive or actionable items) */}
      {(
        Boolean(signal.isDemotedFromActive && signal.demotionAudit) ||
        (newsGuard && newsGuard.isWarning && !isClosedOrder) ||
        isBreakevenActive ||
        isStandby ||
        (isParamChanged && paramAudit) ||
        isWarningConflictCard
      ) && (
        <div className="space-y-1.5">
          {signal.isDemotedFromActive && signal.demotionAudit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDemotionModalOpen(true);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FF9100]/10 border-l-2 border-[#FF9100] hover:bg-[#FF9100]/20 flex items-center justify-between gap-2 text-[10px] font-mono transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF9100] shrink-0" />
                <span className="font-bold text-[#FFD700] shrink-0">DEMOTED A+:</span>
                <span className="text-[#E2E8F0] truncate">{signal.demotionAudit.reason}</span>
              </div>
              <span className="text-[#FFD700] font-bold shrink-0 underline underline-offset-2">Audit →</span>
            </button>
          )}

          {newsGuard && newsGuard.isWarning && !isClosedOrder && (
            <div className="px-2.5 py-1.5 rounded-lg bg-[#FF3366]/10 border-l-2 border-[#FF3366] flex items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 min-w-0">
                <Flame className="w-3.5 h-3.5 text-[#FF3366] shrink-0" />
                <span className="font-bold text-[#FF3366] shrink-0">NEWS:</span>
                <span className="text-[#F8FAFC] truncate">
                  {newsGuard.eventTitle} ({newsGuard.minutesUntil > 0 ? `in ${newsGuard.minutesUntil}m` : 'Live'})
                </span>
              </div>
              <span className="text-[#FF9100] font-semibold shrink-0">Spread Gate</span>
            </div>
          )}

          {isBreakevenActive && (
            <div className="px-2.5 py-1.5 rounded-lg bg-[#00E676]/10 border-l-2 border-[#00E676] flex items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
                <span className="font-bold text-[#00E676] shrink-0">BREAKEVEN (+1p):</span>
                <span className="text-[#E2E8F0] truncate">Protected at {formatPrice(signal.pair, signal.entryPrice)}</span>
              </div>
              <span className="text-[#00E676] font-bold shrink-0">Risk Free</span>
            </div>
          )}

          {isStandby && (
            <div className="px-2.5 py-1.5 rounded-lg bg-[#FFD700]/10 border-l-2 border-[#FFD700] flex items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
                <span className="text-[#E2E8F0] truncate">
                  {signal.standbyTriggerDetail || 'Monitoring Order Block & liquidity sweep before trigger.'}
                </span>
              </div>
              <span className="text-[#FFD700] font-bold shrink-0">80-87% Gate</span>
            </div>
          )}

          {isParamChanged && paramAudit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAuditModalOpen(true);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FF9100]/10 border-l-2 border-[#FF9100] hover:bg-[#FF9100]/20 flex items-center justify-between gap-2 text-[10px] font-mono transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Info className="w-3.5 h-3.5 text-[#FF9100] shrink-0" />
                <span className="font-bold text-[#FFD700] shrink-0">UPDATED:</span>
                <span className="text-[#E2E8F0] truncate">{paramAudit.reason}</span>
              </div>
              <span className="text-[#FF9100] font-bold shrink-0 underline underline-offset-2">Audit →</span>
            </button>
          )}

          {isWarningConflictCard && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAcknowledgeConflict) onAcknowledgeConflict(signal.id);
              }}
              className={`w-full py-2 px-3 rounded-lg text-[10.5px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                isConflictAcknowledged
                  ? 'bg-[#FF9100]/15 border-[#FF9100]/50 text-[#FFD700]'
                  : 'bg-[#FF3366]/15 hover:bg-[#FF3366]/25 border-[#FF3366]/50 text-[#FF8A9E]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isConflictAcknowledged
                  ? '✓ Risk Acknowledged — Proceed Carefully'
                  : 'Trade Anyway — I Understand Risk'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* TIER 5: ORGANIZED ACTION DOCK */}
      {isClosedOrder ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-2.5 border-t border-[#1E293B]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenOutcomeAnalysis) onOpenOutcomeAnalysis(signal);
            }}
            className={`col-span-4 sm:col-span-2 flex items-center justify-center gap-1.5 text-[10.5px] font-black py-2 px-2.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              isWin
                ? 'bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border-[#00E676]/45'
                : 'bg-[#FF3366]/15 hover:bg-[#FF3366]/25 text-[#FF3366] border-[#FF3366]/45'
            }`}
            title={isWin ? 'Open Take-Profit Breakdown' : 'Open Stop-Loss Audit'}
          >
            <span>{isWin ? '🎯 Why TP Hit?' : '🛑 Why SL Hit?'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenChart) onOpenChart();
            }}
            className="col-span-1 flex items-center justify-center gap-1 text-[10px] font-bold py-2 px-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
            <span>Chart</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTimeMachine) onOpenTimeMachine(signal);
              else setIsTimeMachineOpen(true);
            }}
            className="col-span-1 flex items-center justify-center gap-1 text-[10px] font-bold py-2 px-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <History className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
            <span>Replay</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenBacktest) onOpenBacktest();
            }}
            className="col-span-1 flex items-center justify-center gap-1 text-[10px] font-bold py-2 px-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <FlaskConical className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
            <span>Backtest</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAskAi();
            }}
            className="col-span-1 flex items-center justify-center gap-1 text-[10px] font-bold py-2 px-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2979FF] shrink-0" />
            <span>AI Audit</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2.5 border-t border-[#1E293B]">
          {isStandby ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAlert();
              }}
              className="flex items-center justify-center gap-1.5 text-[10.5px] font-bold py-2 px-2 rounded-lg bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/35 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>Alert</span>
            </button>
          ) : onOpenElev8Order ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenElev8Order();
              }}
              className="flex items-center justify-center gap-1.5 text-[10.5px] font-black py-2 px-2 rounded-lg bg-[#2979FF]/20 hover:bg-[#2979FF]/30 text-[#F8FAFC] border border-[#2979FF]/45 transition-colors cursor-pointer whitespace-nowrap"
              title="Execute on Elev8 MT5"
            >
              <Zap className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
              <span>MT5 Order</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex items-center justify-center gap-1.5 text-[10.5px] font-semibold py-2 px-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
            <span>Setup</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenChart) onOpenChart();
            }}
            className="flex items-center justify-center gap-1.5 text-[10.5px] font-semibold py-2 px-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
            <span>Chart</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAskAi();
            }}
            className="flex items-center justify-center gap-1.5 text-[10.5px] font-semibold py-2 px-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2979FF] shrink-0" />
            <span>AI Audit</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTimeMachine) onOpenTimeMachine(signal);
              else setIsTimeMachineOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 text-[10.5px] font-semibold py-2 px-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <History className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
            <span>Replay</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenBacktest) onOpenBacktest();
            }}
            className="flex items-center justify-center gap-1.5 text-[10.5px] font-semibold py-2 px-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#1E293B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <FlaskConical className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
            <span>Backtest</span>
          </button>
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
};
