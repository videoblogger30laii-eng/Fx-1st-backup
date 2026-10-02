import React, { useState, useEffect } from 'react';
import { ForexSignal } from '../types';
import {
  formatPrice,
  calculatePips,
  getFormattedCountdown,
  isSignalValidAndActive,
  getRemainingValidityMs,
  getFormattedTimeElapsed,
  getFormattedTotalValidity,
  getValidityProgress,
  getTpProgressRatio
} from '../services/marketData';
import { realPriceService } from '../services/RealPriceService';
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
  Zap
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
  nowClockMs: number;
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
  nowClockMs
}) => {
  const [copied, setCopied] = useState(false);
  const isBuy = signal.type.startsWith('BUY');
  const isPending = signal.status === 'PENDING' || signal.isPending;
  const isTimeExpired = isPending && getRemainingValidityMs(signal, nowClockMs) <= 0;
  const isClosed = signal.status === 'HIT_TP' || signal.status === 'HIT_SL' || isTimeExpired;
  const countdown = getFormattedCountdown(signal, nowClockMs);

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

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-3.5 transition-all cursor-pointer hover:border-[#2979FF]/60 ${
        signal.isBestTradeNow
          ? 'bg-[#101522] border-[#FFD700]/30 shadow-[0_0_12px_rgba(255,215,0,0.05)]'
          : 'bg-[#101522] border-[#222F47]'
      }`}
    >
      {/* Top Header Row with Pair, Action Badge, Live Price Chip and Actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-base font-black text-[#F1F5F9]">{signal.pair.symbol}</span>
          <span
            className={`text-[9.5px] font-black px-2 py-0.5 rounded ${
              isBuy
                ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30'
            }`}
          >
            {signal.type}
          </span>
          <span className="text-[9.5px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded border border-[#FFD700]/25">
            {signal.confluenceScore}%
          </span>

          {/* Integrated Live Real-Time Price Pill */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[11px] font-bold transition-all duration-300 ${
              flashDir === 'up'
                ? 'bg-[#00E676]/25 border-[#00E676] text-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.25)]'
                : flashDir === 'down'
                ? 'bg-[#FF3366]/25 border-[#FF3366] text-[#FF3366] shadow-[0_0_10px_rgba(255,51,102,0.25)]'
                : 'bg-[#182033] border-[#222F47] text-[#F8FAFC]'
            }`}
            title="Real-Time Live Market Price from Deriv Stream"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            <span>{formatPrice(signal.pair, livePrice)}</span>
            {flashDir === 'up' ? (
              <TrendingUp className="w-3 h-3 text-[#00E676]" />
            ) : flashDir === 'down' ? (
              <TrendingDown className="w-3 h-3 text-[#FF3366]" />
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={copyOrder}
            className="flex items-center gap-1 text-[10px] font-bold text-[#94A3B8] hover:text-[#F1F5F9] bg-[#182033] px-2 py-1 rounded border border-[#222F47] transition-colors"
            title="Copy MT4 Order String"
          >
            {copied ? <Check className="w-3 h-3 text-[#00E676]" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'MT4'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAlert();
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              signal.hasAlert
                ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]'
                : 'bg-[#182033] border-[#222F47] text-[#64748B] hover:text-[#F1F5F9]'
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
            className={`p-1.5 rounded-lg border transition-colors ${
              signal.isFavorite
                ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]'
                : 'bg-[#182033] border-[#222F47] text-[#64748B] hover:text-[#F1F5F9]'
            }`}
            title="Toggle Watchlist"
          >
            <Star className={`w-3.5 h-3.5 ${signal.isFavorite ? 'fill-[#FFD700]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Execution description & timeframe badge */}
      <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-1.5">
        <span className="truncate max-w-[220px] font-medium">{signal.institutionalFlow}</span>
        <span className="font-mono bg-[#182033] px-2 py-0.5 rounded border border-[#222F47] text-[#F1F5F9] flex items-center gap-1">
          <span>{signal.timeframe}</span>
          {isPending && (
            <span className="text-[9px] text-[#FFD700] font-semibold">({getFormattedTotalValidity(signal)} Entry Window)</span>
          )}
        </span>
      </div>

      {/* Signal Time Validity / Target Progress Section */}
      <div className="bg-[#080B11] border border-[#222F47] rounded-lg p-2 mb-2.5 space-y-1">
        {isPending ? (
          <>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1 text-[#2979FF] font-semibold">
                <Clock className="w-3 h-3 text-[#2979FF]" />
                <span>{getFormattedTimeElapsed(signal, nowClockMs)}</span>
              </div>
              <div className="flex items-center gap-1 text-[#FFD700] font-bold" title="Pending Order Entry Window Timer">
                <Timer className="w-3 h-3 text-[#FFD700]" />
                <span>
                  {isTimeExpired ? 'Expired' : `Entry Window: ${countdown}`}
                </span>
              </div>
            </div>

            {/* Validity Progress Bar for Pending Orders */}
            <div className="w-full h-1.5 bg-[#182033] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isTimeExpired
                    ? 'bg-[#FF3366]'
                    : getValidityProgress(signal, nowClockMs) > 0.5
                    ? 'bg-[#00E676]'
                    : getValidityProgress(signal, nowClockMs) > 0.2
                    ? 'bg-[#FFD700]'
                    : 'bg-[#FF3366] animate-pulse'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, getValidityProgress(signal, nowClockMs) * 100))}%` }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Active Running Trade Progress Track */}
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                <span>Live Open Trade</span>
              </span>
              <div className="flex items-center gap-1 text-[#00E676] font-bold">
                <Target className="w-3 h-3 text-[#00E676]" />
                <span>
                  TP1 Target: {livePips >= 0 ? `+${livePips}p` : `${livePips}p`} ({Math.round(getTpProgressRatio(signal, livePrice) * 100)}%)
                </span>
              </div>
            </div>

            {/* Take Profit Target Progress Bar for Running Trades */}
            <div className="w-full h-1.5 bg-[#182033] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  livePips >= 0 ? 'bg-[#00E676]' : 'bg-[#FF3366]'
                }`}
                style={{ width: `${Math.max(5, Math.min(100, getTpProgressRatio(signal, livePrice) * 100))}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Integrated 5-Column Price Grid: [ Live Price ] [ Entry ] [ SL ] [ TP1 ] [ R:R ] */}
      <div className="grid grid-cols-5 gap-1.5 bg-[#080B11]/90 rounded-lg p-2 border border-[#222F47] mb-2.5">
        <div className={`p-0.5 rounded transition-colors ${
          flashDir === 'up' ? 'bg-[#00E676]/15' : flashDir === 'down' ? 'bg-[#FF3366]/15' : ''
        }`}>
          <div className="text-[8px] text-[#94A3B8] font-bold uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            Live
          </div>
          <div className={`text-[11px] font-mono font-black ${
            flashDir === 'up' ? 'text-[#00E676]' : flashDir === 'down' ? 'text-[#FF3366]' : 'text-[#F1F5F9]'
          }`}>
            {formatPrice(signal.pair, livePrice)}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[#64748B] font-bold uppercase">Entry</div>
          <div className="text-[11px] font-mono font-bold text-[#F1F5F9]">
            {formatPrice(signal.pair, signal.entryPrice)}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[#FF3366] font-bold uppercase">SL</div>
          <div className="text-[11px] font-mono font-bold text-[#FF3366]">
            {formatPrice(signal.pair, signal.stopLoss)}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[#00E676] font-bold uppercase">TP1</div>
          <div className="text-[11px] font-mono font-bold text-[#00E676]">
            {formatPrice(signal.pair, signal.takeProfit1)}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[#2979FF] font-bold uppercase">R:R</div>
          <div className="text-[11px] font-mono font-bold text-[#2979FF]">
            {signal.riskReward}
          </div>
        </div>
      </div>

      {/* Status & Validity bar with Live Floating PnL */}
      <div className="flex items-center justify-between text-[10px] mb-2">
        <div className="flex items-center gap-2">
          {isTimeExpired ? (
            <span className="text-[#94A3B8] font-bold bg-[#182033] px-2 py-0.5 rounded border border-[#222F47]">
              EXPIRED (Order Timeout)
            </span>
          ) : isPending ? (
            <span className="text-[#FFD700] font-bold bg-[#FFD700]/10 px-2 py-0.5 rounded border border-[#FFD700]/25">
              PENDING ({Math.abs(livePips)}p to Entry)
            </span>
          ) : isClosed ? (
            <span
              className={`font-bold px-2 py-0.5 rounded border ${
                signal.status === 'HIT_TP'
                  ? 'text-[#00E676] bg-[#00E676]/10 border-[#00E676]/30'
                  : 'text-[#FF3366] bg-[#FF3366]/10 border-[#FF3366]/30'
              }`}
            >
              {signal.status} ({signal.pips > 0 ? `+${signal.pips}p` : `${signal.pips}p`})
            </span>
          ) : (
            <span className={`font-bold px-2 py-0.5 rounded border ${
              isProfit 
                ? 'text-[#00E676] bg-[#00E676]/10 border-[#00E676]/30' 
                : 'text-[#FF3366] bg-[#FF3366]/10 border-[#FF3366]/30'
            }`}>
              LIVE {isProfit ? `+${livePips} pips` : `${livePips} pips`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748B]">
          <span>Spread: {signal.pair.spreadPips}p</span>
          {isPending && <span className="text-[#94A3B8]">• {countdown}</span>}
        </div>
      </div>

      {/* Elev8 MT5 Execution Bar */}
      {onOpenElev8Order && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenElev8Order();
          }}
          className="w-full mb-2 py-2 px-3 rounded-xl bg-gradient-to-r from-[#2979FF]/20 via-[#00E676]/15 to-[#2979FF]/20 hover:from-[#2979FF]/30 hover:to-[#00E676]/25 border border-[#2979FF]/40 text-[#F1F5F9] font-black text-xs flex items-center justify-between transition-all group shadow"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#00E676] group-hover:scale-110 transition-transform" />
            <span>Elev8 MT5 Order</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#00E676]">
            <span>Custom Lots & P&L</span>
            <span>➔</span>
          </div>
        </button>
      )}

      {/* 4 Action Buttons Row: [ Setup ] [ AI Audit ] [ Chart ] [ Backtest ] */}
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#222F47]/60">
        {/* 1. Setup */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex items-center justify-center gap-1 text-[10.5px] font-bold py-1.5 px-1 rounded-lg bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] border border-[#222F47] transition-all"
          title="Open Setup Details"
        >
          <SlidersHorizontal className="w-3 h-3 text-[#94A3B8]" />
          <span>Setup</span>
        </button>

        {/* 2. AI Audit */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAskAi();
          }}
          className="flex items-center justify-center gap-1 text-[10.5px] font-bold py-1.5 px-1 rounded-lg bg-[#2979FF]/15 hover:bg-[#2979FF]/25 text-[#2979FF] border border-[#2979FF]/30 transition-all"
          title="Audit setup with Gemini AI"
        >
          <Sparkles className="w-3 h-3 text-[#2979FF]" />
          <span>AI Audit</span>
        </button>

        {/* 3. Live Chart */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenChart) onOpenChart();
          }}
          className="flex items-center justify-center gap-1 text-[10.5px] font-bold py-1.5 px-1 rounded-lg bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 shadow-[0_0_10px_rgba(0,230,118,0.15)] transition-all"
          title="View Live TradingView Chart with Deriv Stream"
        >
          <BarChart2 className="w-3 h-3 text-[#00E676]" />
          <span>Chart</span>
        </button>

        {/* 4. Backtest */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenBacktest) onOpenBacktest();
          }}
          className="flex items-center justify-center gap-1 text-[10.5px] font-bold py-1.5 px-1 rounded-lg bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/30 transition-all"
          title="Test historical performance in Quant Lab"
        >
          <FlaskConical className="w-3 h-3 text-[#FFD700]" />
          <span>Backtest</span>
        </button>
      </div>
    </div>
  );
};

