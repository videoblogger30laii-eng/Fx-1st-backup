import React, { useState, useEffect } from 'react';
import { ForexSignal, getSignalStrategy, STRATEGY_CONFIGS } from '../types';
import {
  formatPrice,
  calculatePips,
  getFormattedCountdown,
  getValidityProgress,
  isForexMarketOpen,
  getWeekendMarketState,
  formatSignalDateTime,
  getFormattedTimeElapsed
} from '../services/marketData';
import { realPriceService } from '../services/RealPriceService';
import {
  Sparkles,
  ArrowUpRight,
  Copy,
  Check,
  FlaskConical,
  ShieldCheck,
  Flame,
  SlidersHorizontal,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock
} from 'lucide-react';

interface Props {
  signal: ForexSignal;
  onInspect: () => void;
  onAskAi: () => void;
  onOpenChart?: () => void;
  onTestBacktest: () => void;
  onOpenElev8Order?: () => void;
  nowClockMs: number;
  isMarketOpen?: boolean;
}

export const BestTradeHeroCard: React.FC<Props> = ({
  signal,
  onInspect,
  onAskAi,
  onOpenChart,
  onTestBacktest,
  onOpenElev8Order,
  nowClockMs,
  isMarketOpen
}) => {
  const marketOpen = typeof isMarketOpen === 'boolean' ? isMarketOpen : isForexMarketOpen(new Date(nowClockMs));
  const weekendState = getWeekendMarketState(new Date(nowClockMs));
  const [copied, setCopied] = useState(false);
  const countdown = getFormattedCountdown(signal, nowClockMs);
  const progress = getValidityProgress(signal, nowClockMs);
  const isPending = signal.status === 'PENDING' || signal.isPending;
  const isBuy = signal.type.startsWith('BUY');

  // Real-time live price hook from Deriv/Twelve Data
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

  const livePips = calculatePips(signal.pair, signal.entryPrice, livePrice, isBuy);
  const isProfit = livePips >= 0;

  const copyMt4 = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${signal.type} ${signal.pair.symbol.replace('/', '')} @ ${formatPrice(signal.pair, signal.entryPrice)} | SL: ${formatPrice(signal.pair, signal.stopLoss)} | TP: ${formatPrice(signal.pair, signal.takeProfit1)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const slPips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.stopLoss, isBuy));
  const tp1Pips = Math.abs(calculatePips(signal.pair, signal.entryPrice, signal.takeProfit1, isBuy));
  const stratTitle = STRATEGY_CONFIGS[getSignalStrategy(signal)].title;

  return (
    <div
      onClick={onInspect}
      className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#182033] to-[#101522] border border-[#FFD700]/50 px-3 py-2.5 shadow-md cursor-pointer hover:border-[#FFD700] transition-all text-left terminal-card"
    >
      {/* Row 1: Top Header Strip + Pair + Strategy (Left) | Confluence + Copy MT4 (Right) */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#222F47]/70">
        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 bg-[#FFD700]/15 border border-[#FFD700]/50 rounded px-1.5 py-0.5 text-[9px] font-black text-[#FFD700] uppercase leading-none">
            <Flame className="w-2.5 h-2.5 text-[#FFD700]" />
            <span>A+ Best</span>
          </span>

          <span className="text-sm font-black text-[#F1F5F9] leading-none">{signal.pair.symbol}</span>

          <span
            className={`text-[9.5px] font-black px-1.5 py-0.5 rounded leading-none ${
              isBuy
                ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                : 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
            }`}
          >
            {signal.type}
          </span>

          <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#101522] border border-[#222F47] text-[#F1F5F9] leading-none">
            {signal.timeframe}
          </span>

          <span className="text-[9.5px] text-[#94A3B8] truncate hidden sm:inline">
            · <strong className="text-[#FFD700]">{stratTitle}</strong> · {signal.institutionalFlow}
          </span>
        </div>

        {/* Right Side: Prominent Confluence Badge + MT4 Copy Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="inline-flex items-center gap-1 text-[9.5px] font-mono font-black text-[#FFD700] bg-[#FFD700]/15 px-2 py-1 rounded border border-[#FFD700]/40 leading-none"
            title={`Institutional Confluence Score: ${signal.confluenceScore}%`}
          >
            <Flame className="w-2.5 h-2.5 text-[#FFD700]" />
            <span>{signal.confluenceScore}% CONF</span>
          </span>

          <button
            onClick={copyMt4}
            className="flex items-center gap-1 text-[9.5px] font-bold bg-[#101522] hover:bg-[#182033] text-[#F1F5F9] px-2 py-1 rounded border border-[#222F47] transition-colors shrink-0"
            title="Copy MT4 Order"
          >
            {copied ? <Check className="w-2.5 h-2.5 text-[#00E676]" /> : <Copy className="w-2.5 h-2.5 text-[#94A3B8]" />}
            <span>{copied ? 'Copied' : 'MT4'}</span>
          </button>
        </div>
      </div>

      {/* Weekend Compact Notice */}
      {!marketOpen && (
        <div className="flex items-center justify-between bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-md px-2 py-1 text-[9.5px] text-[#FFB300] font-medium my-1.5">
          <div className="flex items-center gap-1 truncate">
            <Clock className="w-3 h-3 text-[#FFB300] shrink-0" />
            <span className="truncate">
              <strong>Weekend Hold:</strong> Friday swing ({isProfit ? `+${livePips}` : livePips}p) · {stratTitle}
            </span>
          </div>
          <span className="font-mono font-bold text-[#F1F5F9] shrink-0 ml-2">
            {weekendState.reopenCountdownFormatted}
          </span>
        </div>
      )}

      {/* Row 2: 6-Column Systematic Execution Ledger */}
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-[#222F47]/60 bg-[#080B11]/90 rounded-lg border border-[#222F47] my-1.5 overflow-hidden">
        <div
          className={`px-2 py-1 transition-colors ${
            flashDir === 'up' ? 'bg-[#00E676]/15' : flashDir === 'down' ? 'bg-[#FF3366]/15' : ''
          }`}
        >
          <div className="text-[8px] text-[#94A3B8] font-bold uppercase flex items-center gap-1 leading-tight">
            <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'bg-[#00E676] animate-pulse' : 'bg-[#FFB300]'}`} />
            <span>{marketOpen ? 'Live' : 'Fri Close'}</span>
            {marketOpen && flashDir === 'up' && <TrendingUp className="w-2.5 h-2.5 text-[#00E676] ml-auto" />}
            {marketOpen && flashDir === 'down' && <TrendingDown className="w-2.5 h-2.5 text-[#FF3366] ml-auto" />}
          </div>
          <div
            className={`text-[11px] font-mono font-black tabular-nums leading-tight mt-0.5 ${
              flashDir === 'up' ? 'text-[#00E676]' : flashDir === 'down' ? 'text-[#FF3366]' : 'text-[#F1F5F9]'
            }`}
          >
            {formatPrice(signal.pair, livePrice)}
          </div>
        </div>

        <div className="px-2 py-1">
          <div className="text-[8px] text-[#64748B] font-bold uppercase leading-tight">Entry</div>
          <div className="text-[11px] font-mono font-bold text-[#F1F5F9] tabular-nums leading-tight mt-0.5">
            {formatPrice(signal.pair, signal.entryPrice)}
          </div>
        </div>

        <div className="px-2 py-1">
          <div className="text-[8px] text-[#FF3366] font-bold uppercase leading-tight flex items-center justify-between">
            <span>SL</span>
            <span className="font-mono text-[7.5px]">-{slPips}p</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-[#FF3366] tabular-nums leading-tight mt-0.5">
            {formatPrice(signal.pair, signal.stopLoss)}
          </div>
        </div>

        <div className="px-2 py-1">
          <div className="text-[8px] text-[#00E676] font-bold uppercase leading-tight flex items-center justify-between">
            <span>TP1</span>
            <span className="font-mono text-[7.5px]">+{tp1Pips}p</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-[#00E676] tabular-nums leading-tight mt-0.5">
            {formatPrice(signal.pair, signal.takeProfit1)}
          </div>
        </div>

        <div className="px-2 py-1">
          <div className="text-[8px] text-[#2979FF] font-bold uppercase leading-tight flex items-center justify-between">
            <span>R:R</span>
            <span className="text-[#64748B] font-mono text-[7.5px]">Spd {signal.pair.spreadPips}p</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-[#2979FF] tabular-nums leading-tight mt-0.5">
            {signal.riskReward}
          </div>
        </div>

        <div className="px-2 py-1">
          <div className="text-[8px] text-[#94A3B8] font-bold uppercase leading-tight">
            {isPending ? 'Window' : 'Live P&L'}
          </div>
          <div
            className={`text-[11px] font-mono font-black tabular-nums leading-tight mt-0.5 ${
              isPending ? 'text-[#FFD700]' : isProfit ? 'text-[#00E676]' : 'text-[#FF3366]'
            }`}
          >
            {isPending ? countdown : `${isProfit ? `+${livePips}` : livePips}p`}
          </div>
        </div>
      </div>

      {/* Real Generated Time & Elapsed Age Strip */}
      <div className="flex items-center justify-between text-[9.5px] font-mono text-[#94A3B8] px-1 my-1.5 flex-wrap gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Clock className="w-2.5 h-2.5 text-[#2979FF]" />
          <span className="text-[#F1F5F9] font-bold">
            {formatSignalDateTime(signal.createdAtMs)}
          </span>
          <span className="text-[#64748B]">·</span>
          <span>{getFormattedTimeElapsed(signal, nowClockMs)}</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-[#FFD700] font-bold">
          <span>🎯 TP1: {formatPrice(signal.pair, signal.takeProfit1)}</span>
        </div>
      </div>

      {/* Pending Validity Slim Bar */}
      {isPending && (
        <div className="mb-1.5 flex items-center gap-2 text-[9px] font-mono text-[#94A3B8]">
          <ShieldCheck className="w-3 h-3 text-[#00E676] shrink-0" />
          <span className="shrink-0">Setup Window: {countdown}</span>
          <div className="flex-1 bg-[#182033] h-1 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FFD700] to-[#00E676] h-full transition-all duration-1000"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Row 3: Unified Action Dock (MT5 Order + Setup + AI Audit + Chart + Backtest in 1 Row) */}
      <div className="flex items-center gap-1 pt-1.5 border-t border-[#222F47]/60">
        {onOpenElev8Order && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenElev8Order();
            }}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black py-1 px-1.5 rounded-md bg-[#2979FF]/20 hover:bg-[#2979FF]/30 text-[#F1F5F9] border border-[#2979FF]/45 transition-all"
            title="Elev8 MT5 Order: Custom Lots & Projected P&L"
          >
            <Zap className="w-2.5 h-2.5 text-[#00E676] shrink-0" />
            <span className="truncate">MT5 Order</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
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
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1 px-1.5 rounded-md bg-[#2979FF]/15 hover:bg-[#2979FF]/25 text-[#2979FF] border border-[#2979FF]/40 transition-all"
          title="Audit setup with Gemini AI"
        >
          <Sparkles className="w-2.5 h-2.5 shrink-0" />
          <span>AI Audit</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenChart) onOpenChart();
          }}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1 px-1.5 rounded-md bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 transition-all"
          title="Open Live TradingView Chart"
        >
          <BarChart2 className="w-2.5 h-2.5 shrink-0" />
          <span>Chart</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onTestBacktest();
          }}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1 px-1.5 rounded-md bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/40 transition-all"
          title="Test historical performance in Quant Lab"
        >
          <FlaskConical className="w-2.5 h-2.5 shrink-0" />
          <span>Backtest</span>
        </button>
      </div>
    </div>
  );
};
