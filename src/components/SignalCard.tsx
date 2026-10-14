import React, { useState, useEffect } from 'react';
import { ForexSignal, getAssetCategory, getSignalStrategy, STRATEGY_CONFIGS } from '../types';
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
  isForexMarketOpen
} from '../services/marketData';
import { realPriceService } from '../services/RealPriceService';
import { economicCalendarService } from '../services/economicCalendarService';
import {
  Star,
  Bell,
  BellOff,
  Sparkles,
  BarChart2,
  SlidersHorizontal,
  FlaskConical,
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
  ShieldCheck
} from 'lucide-react';

interface Props {
  signal: ForexSignal;
  onClick: () => void;
  onToggleFavorite: () => void;
  onToggleAlert: () => void;
  onAskAi: () => void;
  onOpenChart?: () => void;
  onOpenBacktest?: () => void;
  onOpenElev8Order?: () => void;
  onOpenOutcomeAnalysis?: (signal: ForexSignal) => void;
  nowClockMs: number;
  isMarketOpen?: boolean;
}

export const SignalCard: React.FC<Props> = ({
  signal,
  onClick,
  onToggleFavorite,
  onToggleAlert,
  onAskAi,
  onOpenChart,
  onOpenBacktest,
  onOpenElev8Order,
  onOpenOutcomeAnalysis,
  nowClockMs,
  isMarketOpen
}) => {
  const marketOpen = typeof isMarketOpen === 'boolean' ? isMarketOpen : isForexMarketOpen(new Date(nowClockMs));
  const [copied, setCopied] = useState(false);
  const isBuy = signal.type.startsWith('BUY');
  const isPending = signal.status === 'PENDING' || signal.isPending;
  const isTimeExpired = isPending && getRemainingValidityMs(signal, nowClockMs) <= 0;
  const isClosed = signal.status === 'HIT_TP' || signal.status === 'HIT_SL' || isTimeExpired;
  const countdown = getFormattedCountdown(signal, nowClockMs);
  const newsGuard = economicCalendarService.getNewsGuard(signal.pair.symbol);

  // Live real-time price hook from Deriv/Twelve Data
  const [livePrice, setLivePrice] = useState<number>(() => {
    const current = realPriceService.getPrice(signal.pair.symbol);
    return current > 0 ? current : (signal.pair.currentPrice || signal.entryPrice);
  });
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const current = realPriceService.getPrice(signal.pair.symbol);
    if (current > 0) setLivePrice(current);

    const unsubscribe = realPriceService.onPrice((tick) => {
      if (tick.symbol === signal.pair.symbol && tick.price > 0) {
        setLivePrice(prev => {
          if (tick.price > prev) {
            setFlashDir('up');
            setTimeout(() => setFlashDir(null), 900);
          } else if (tick.price < prev) {
            setFlashDir('down');
            setTimeout(() => setFlashDir(null), 900);
          }
          return tick.price;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [signal.pair.symbol]);

  // Calculate live floating pips from real price
  const livePips = calculatePips(signal.pair, signal.entryPrice, livePrice, isBuy);
  const isProfit = livePips >= 0;

  const copyOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${signal.type} ${signal.pair.symbol.replace('/', '')} @ ${formatPrice(signal.pair, signal.entryPrice)} | SL: ${formatPrice(signal.pair, signal.stopLoss)} | TP1: ${formatPrice(signal.pair, signal.takeProfit1)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 transition-all cursor-pointer hover:border-[var(--accent-color)] terminal-card ${
        signal.isBestTradeNow
          ? 'border-[#FFD700]/40 shadow-[0_0_10px_rgba(255,215,0,0.12)]'
          : ''
      }`}
    >
      {/* ROW 1: Systematic Identity + Strategy + Timeframe (Left) | Confluence + Utility Icons (Right) */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#222F47]/70">
        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
          {/* Symbol */}
          <span className="text-[13.5px] font-black tracking-tight text-[#F1F5F9] leading-none">
            {signal.pair.symbol}
          </span>

          {/* Buy / Sell Direction */}
          <span
            className={`text-[9.5px] font-black px-1.5 py-0.5 rounded leading-none ${
              isBuy
                ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/35'
                : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/35'
            }`}
          >
            {signal.type}
          </span>

          {/* Timeframe & Validity Window */}
          <span className="text-[9.5px] font-mono font-bold bg-[#182033] text-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#222F47] leading-none">
            {signal.timeframe}
            {isPending && (
              <span className="text-[#FFD700] ml-1">({getFormattedTotalValidity(signal)})</span>
            )}
          </span>

          {/* Clean Unboxed Metadata: Category • Strategy • Institutional Flow */}
          <div className="flex items-center gap-1 text-[9.5px] text-[#94A3B8] truncate">
            <span className="text-[#64748B]">·</span>
            <span
              className={`font-bold ${
                assetCat === 'METALS'
                  ? 'text-[#FFD700]'
                  : assetCat === 'MINORS'
                  ? 'text-[#C084FC]'
                  : 'text-[#60A5FA]'
              }`}
            >
              {assetCat === 'MAJORS' ? 'MAJOR' : assetCat === 'MINORS' ? 'CROSS' : 'METAL'}
            </span>
            <span className="text-[#64748B]">·</span>
            <span
              className={`font-bold truncate ${
                stratKey === 'BEST_TRADE_NOW'
                  ? 'text-[#FFD700]'
                  : stratKey === 'ICT_SMART_MONEY'
                  ? 'text-[#00E676]'
                  : stratKey === 'TREND_EMA_CONFLUENCE'
                  ? 'text-[#60A5FA]'
                  : 'text-[#C084FC]'
              }`}
              title={`${stratCfg.title}: ${stratCfg.description}`}
            >
              {stratCfg.title}
            </span>
            {signal.institutionalFlow && (
              <span className="hidden sm:inline text-[#64748B] truncate max-w-[150px]">
                · {signal.institutionalFlow}
              </span>
            )}
          </div>

          {/* High-Impact News Guard Indicator */}
          {newsGuard && newsGuard.isWarning && (
            <span
              className="text-[9px] font-bold text-[#FF3366] bg-[#FF3366]/15 px-1.5 py-0.5 rounded border border-[#FF3366]/40 flex items-center gap-0.5 animate-pulse leading-none"
              title={`High-Impact News: ${newsGuard.eventTitle} in ${newsGuard.minutesUntil} minutes!`}
            >
              <Flame className="w-2.5 h-2.5 text-[#FF3366]" />
              <span>News {newsGuard.minutesUntil > 0 ? `${newsGuard.minutesUntil}m` : 'Live'}</span>
            </span>
          )}
        </div>

        {/* Right Side: Confluence Score Badge + Compact Utility Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Confluence Score on Right Side */}
          <span
            className="text-[9.5px] font-mono font-black text-[#FFD700] bg-[#FFD700]/15 px-1.5 py-1 rounded border border-[#FFD700]/40 leading-none"
            title={`Institutional Confluence Score: ${signal.confluenceScore}%`}
          >
            {signal.confluenceScore}% CONF
          </span>

          <button
            onClick={copyOrder}
            className="flex items-center gap-1 text-[9.5px] font-bold text-[#94A3B8] hover:text-[#F1F5F9] bg-[#182033] px-1.5 py-1 rounded border border-[#222F47] transition-colors"
            title="Copy MT4/MT5 Order String"
          >
            {copied ? <Check className="w-2.5 h-2.5 text-[#00E676]" /> : <Copy className="w-2.5 h-2.5" />}
            <span>{copied ? 'Copied' : 'MT4'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAlert();
            }}
            className={`p-1 rounded border transition-colors ${
              signal.hasAlert
                ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]'
                : 'bg-[#182033] border-[#222F47] text-[#64748B] hover:text-[#F1F5F9]'
            }`}
            title="Toggle Price Alert"
          >
            {signal.hasAlert ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-1 rounded border transition-colors ${
              signal.isFavorite
                ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]'
                : 'bg-[#182033] border-[#222F47] text-[#64748B] hover:text-[#F1F5F9]'
            }`}
            title="Toggle Watchlist"
          >
            <Star className={`w-3 h-3 ${signal.isFavorite ? 'fill-[#FFD700]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ROW 2: Systematic 6-Column Institutional Execution Ledger (All Values in 1 Compact Strip) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-[#222F47]/60 bg-[#080B11]/90 rounded-lg border border-[#222F47] my-1.5 overflow-hidden">
        {/* Col 1: Live / Exit Price */}
        <div
          className={`px-2 py-1 transition-colors ${
            isClosedOrder
              ? ''
              : flashDir === 'up'
              ? 'bg-[#00E676]/15'
              : flashDir === 'down'
              ? 'bg-[#FF3366]/15'
              : ''
          }`}
        >
          <div className="text-[8px] text-[#94A3B8] font-bold uppercase flex items-center gap-1 leading-tight">
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
            className={`text-[11px] font-mono font-black tabular-nums leading-tight mt-0.5 ${
              signal.status === 'HIT_SL'
                ? 'text-[#FF3366]'
                : signal.status === 'HIT_TP'
                ? 'text-[#00E676]'
                : flashDir === 'up'
                ? 'text-[#00E676]'
                : flashDir === 'down'
                ? 'text-[#FF3366]'
                : 'text-[#F1F5F9]'
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
        <div className="px-2 py-1">
          <div className="text-[8px] text-[#64748B] font-bold uppercase leading-tight">Entry</div>
          <div className="text-[11px] font-mono font-bold text-[#F1F5F9] tabular-nums leading-tight mt-0.5">
            {formatPrice(signal.pair, signal.entryPrice)}
          </div>
        </div>

        {/* Col 3: Stop Loss + Pip Risk */}
        <div className="px-2 py-1">
          <div className="text-[8px] text-[#FF3366] font-bold uppercase leading-tight flex items-center justify-between">
            <span>SL</span>
            <span className="font-mono text-[7.5px]">-{slPips}p</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-[#FF3366] tabular-nums leading-tight mt-0.5">
            {formatPrice(signal.pair, signal.stopLoss)}
          </div>
        </div>

        {/* Col 4: Take Profit 1 + Pip Target */}
        <div className="px-2 py-1">
          <div className="text-[8px] text-[#00E676] font-bold uppercase leading-tight flex items-center justify-between">
            <span>TP1</span>
            <span className="font-mono text-[7.5px]">+{tp1Pips}p</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-[#00E676] tabular-nums leading-tight mt-0.5">
            {formatPrice(signal.pair, signal.takeProfit1)}
          </div>
        </div>

        {/* Col 5: Risk:Reward & Spread */}
        <div className="px-2 py-1">
          <div className="text-[8px] text-[#2979FF] font-bold uppercase leading-tight flex items-center justify-between">
            <span>R:R</span>
            <span className="text-[#64748B] font-mono text-[7.5px]">Spd {signal.pair.spreadPips}p</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-[#2979FF] tabular-nums leading-tight mt-0.5">
            {signal.riskReward}
          </div>
        </div>

        {/* Col 6: Net Pips / Status Distance */}
        <div className="px-2 py-1">
          <div className="text-[8px] text-[#94A3B8] font-bold uppercase leading-tight">
            {isTimeExpired
              ? 'Status'
              : isPending
              ? 'To Entry'
              : isClosedOrder
              ? 'Result'
              : 'Live P&L'}
          </div>
          <div
            className={`text-[11px] font-mono font-black tabular-nums leading-tight mt-0.5 ${
              isTimeExpired
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
            {isTimeExpired
              ? 'EXPIRED'
              : isPending
              ? `${Math.abs(livePips)}p away`
              : isClosedOrder
              ? `${(signal.pips ?? 0) >= 0 ? `+${signal.pips}` : signal.pips}p`
              : `${isProfit ? `+${livePips}` : livePips}p`}
          </div>
        </div>
      </div>

      {/* ROW 3: Unified Telemetry & Progress Strip (Elapsed Time, Countdown/Hold Duration, Progress Bar) */}
      <div className="mb-1.5 space-y-1">
        {isPending ? (
          <div className="flex items-center justify-between text-[9.5px] font-mono text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#FFD700] font-bold">PENDING</span>
              <span className="text-[#64748B]">·</span>
              <Clock className="w-2.5 h-2.5 text-[#2979FF]" />
              <span>{getFormattedTimeElapsed(signal, nowClockMs)}</span>
              <span className="sm:hidden text-[#64748B]">· {signal.institutionalFlow}</span>
            </div>
            <div className="flex items-center gap-1 text-[#FFD700] font-bold">
              <Timer className="w-2.5 h-2.5 text-[#FFD700]" />
              <span>{isTimeExpired ? 'Expired' : `${signal.timeframe} Window: ${countdown}`}</span>
            </div>
          </div>
        ) : isClosedOrder ? (
          <div className="flex items-center justify-between text-[9.5px] font-mono flex-wrap gap-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenOutcomeAnalysis) onOpenOutcomeAnalysis(signal);
                }}
                className={`font-black px-2 py-0.5 rounded border transition-all cursor-pointer flex items-center gap-1 shadow-xs hover:scale-105 ${
                  isWin
                    ? 'text-[#00E676] bg-[#00E676]/15 border-[#00E676]/40 hover:bg-[#00E676]/25'
                    : 'text-[#FF3366] bg-[#FF3366]/15 border-[#FF3366]/40 hover:bg-[#FF3366]/25'
                }`}
                title={isWin ? 'Click to view Why it Hit TP & Forensic Breakdown' : 'Click to view Why it Hit SL & Post-Mortem Audit'}
              >
                <span>{isWin ? '🎯 TP HIT' : '🛑 SL HIT'}</span>
                <span className="text-[8.5px] underline opacity-90">
                  · Why {isWin ? 'TP' : 'SL'}?
                </span>
              </button>
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenOutcomeAnalysis) onOpenOutcomeAnalysis(signal);
                }}
                className={`ml-1 text-[9px] font-black px-1.5 py-0.5 rounded border transition-all cursor-pointer shadow-xs ${
                  isWin
                    ? 'text-[#00E676] bg-[#00E676]/10 hover:bg-[#00E676]/25 border-[#00E676]/30'
                    : 'text-[#FF3366] bg-[#FF3366]/10 hover:bg-[#FF3366]/25 border-[#FF3366]/30'
                }`}
                title="Open Deep Post-Mortem Forensic Breakdown"
              >
                🔍 Audit
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[9.5px] font-mono">
            <div className="flex items-center gap-1.5 text-[#94A3B8]">
              <span className={`font-bold ${isProfit ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                LIVE {isProfit ? `+${livePips}p` : `${livePips}p`}
              </span>
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
              <Target className="w-2.5 h-2.5 text-[#00E676]" />
              <span>TP1 Target: {tpRatio}%</span>
            </div>
          </div>
        )}

        {/* Slim 1-px/4-px Progress Track */}
        <div className="w-full h-1 bg-[#182033] rounded-full overflow-hidden">
          {isPending ? (
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

      {/* SL Hit Mistake Learning & Anti-Loss Guard Strip */}
      {signal.slLearningAudit && signal.slLearningAudit.applied && !isClosedOrder && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="mb-1.5 px-2 py-0.5 rounded-lg bg-[#00E676]/10 border border-[#00E676]/30 flex items-center justify-between text-[9px] font-mono text-[#00E676] cursor-pointer hover:bg-[#00E676]/15 transition-all"
          title={signal.slLearningAudit.lessonsAppliedSummary}
        >
          <div className="flex items-center gap-1 min-w-0">
            <ShieldCheck className="w-2.5 h-2.5 text-[#00E676] shrink-0" />
            <span className="font-bold shrink-0">SL GUARD:</span>
            <span className="text-[#F1F5F9] truncate">+{signal.slLearningAudit.antiWickExtraBufferPips}p ATR Buffer</span>
          </div>
          <span className="text-[8.5px] text-[#94A3B8] font-sans font-semibold shrink-0">
            H4 Aligned · -68% Repeat Loss
          </span>
        </div>
      )}

      {/* ROW 4: Unified Compact Action Dock (Elev8 MT5 + Re-Entry + Setup + AI Audit + Chart + Backtest in 1 Row) */}
      <div className="flex items-center gap-1 pt-1.5 border-t border-[#222F47]/60">
        {isClosedOrder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenOutcomeAnalysis) onOpenOutcomeAnalysis(signal);
            }}
            className={`flex items-center justify-center gap-1 text-[10px] font-black py-1 px-2 rounded-md border transition-all shrink-0 cursor-pointer shadow-xs ${
              isWin
                ? 'bg-[#00E676]/20 hover:bg-[#00E676]/30 text-[#00E676] border-[#00E676]/45'
                : 'bg-[#FF3366]/20 hover:bg-[#FF3366]/30 text-[#FF3366] border-[#FF3366]/45'
            }`}
            title={isWin ? 'Open Detailed Take-Profit Success Breakdown' : 'Open Detailed Stop-Loss Post-Mortem Audit'}
          >
            <span>{isWin ? '🎯 Why TP Hit?' : '🛑 Why SL Hit?'}</span>
          </button>
        )}

        {signal.status === 'HIT_SL' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAi();
            }}
            className="flex items-center justify-center gap-1 text-[10px] font-black py-1 px-2 rounded-md bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/40 transition-all shrink-0"
            title="Audit 2nd Entry Opportunity (AI Re-Entry)"
          >
            <Sparkles className="w-2.5 h-2.5 text-[#FFD700]" />
            <span>2nd Entry</span>
          </button>
        )}

        {onOpenElev8Order && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenElev8Order();
            }}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black py-1 px-1.5 rounded-md bg-[#2979FF]/20 hover:bg-[#2979FF]/30 text-[#F1F5F9] border border-[#2979FF]/45 transition-all"
            title="Execute Custom Lots & P&L on Elev8 MT5"
          >
            <Zap className="w-2.5 h-2.5 text-[#00E676] shrink-0" />
            <span className="truncate">MT5 Order</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1 px-1.5 rounded-md bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] border border-[#222F47] transition-all"
          title="Open Setup Details"
        >
          <SlidersHorizontal className="w-2.5 h-2.5 text-[#94A3B8] shrink-0" />
          <span>Setup</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAskAi();
          }}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1 px-1.5 rounded-md bg-[#2979FF]/15 hover:bg-[#2979FF]/25 text-[#2979FF] border border-[#2979FF]/30 transition-all"
          title="Audit setup with Gemini AI"
        >
          <Sparkles className="w-2.5 h-2.5 text-[#2979FF] shrink-0" />
          <span>AI Audit</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenChart) onOpenChart();
          }}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1 px-1.5 rounded-md bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 transition-all"
          title="View Live TradingView Chart with Deriv Stream"
        >
          <BarChart2 className="w-2.5 h-2.5 text-[#00E676] shrink-0" />
          <span>Chart</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenBacktest) onOpenBacktest();
          }}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1 px-1.5 rounded-md bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/30 transition-all"
          title="Test historical performance in Quant Lab"
        >
          <FlaskConical className="w-2.5 h-2.5 text-[#FFD700] shrink-0" />
          <span>Backtest</span>
        </button>
      </div>
    </div>
  );
};


