import React, { useState, useEffect } from 'react';
import { ForexSignal } from '../types';
import { formatPrice, calculatePips, getFormattedCountdown, getValidityProgress } from '../services/marketData';
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
  Zap
} from 'lucide-react';

interface Props {
  signal: ForexSignal;
  onInspect: () => void;
  onAskAi: () => void;
  onOpenChart?: () => void;
  onTestBacktest: () => void;
  onOpenElev8Order?: () => void;
  nowClockMs: number;
}

export const BestTradeHeroCard: React.FC<Props> = ({
  signal,
  onInspect,
  onAskAi,
  onOpenChart,
  onTestBacktest,
  onOpenElev8Order,
  nowClockMs
}) => {
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

  return (
    <div
      onClick={onInspect}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#182033] to-[#101522] border-2 border-[#FFD700]/40 p-4 shadow-lg cursor-pointer hover:border-[#FFD700] transition-all text-left"
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 bg-[#FFD700]/15 border border-[#FFD700]/50 rounded-full px-2.5 py-0.5">
          <Flame className="w-3.5 h-3.5 text-[#FFD700]" />
          <span className="text-[10px] font-black text-[#FFD700] tracking-wider uppercase">
            BEST TRADE NOW • 84.8% WIN RATE EDGE
          </span>
        </div>

        <button
          onClick={copyMt4}
          className="flex items-center gap-1 text-[10px] font-bold bg-[#101522] hover:bg-[#182033] text-[#F1F5F9] px-2 py-1 rounded-lg border border-[#222F47] transition-colors"
          title="Copy MT4 Order"
        >
          {copied ? <Check className="w-3 h-3 text-[#00E676]" /> : <Copy className="w-3 h-3 text-[#94A3B8]" />}
          <span>{copied ? 'Copied' : 'MT4'}</span>
        </button>
      </div>

      {/* Main Signal Identification */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center font-black text-[#FFD700] text-sm">
            A+
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xl font-black text-[#F1F5F9]">{signal.pair.symbol}</span>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded ${
                  isBuy
                    ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                    : 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                }`}
              >
                {signal.type}
              </span>

              {/* Real-time Live Price Pill */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-mono text-xs font-bold transition-all duration-300 ${
                  flashDir === 'up'
                    ? 'bg-[#00E676]/30 border-[#00E676] text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.3)]'
                    : flashDir === 'down'
                    ? 'bg-[#FF3366]/30 border-[#FF3366] text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.3)]'
                    : 'bg-[#101522] border-[#222F47] text-[#F8FAFC]'
                }`}
                title="Live Broker Quote"
              >
                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                <span>{formatPrice(signal.pair, livePrice)}</span>
                {flashDir === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-[#00E676]" />
                ) : flashDir === 'down' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-[#FF3366]" />
                ) : null}
              </div>
            </div>
            <div className="text-xs text-[#94A3B8] font-medium mt-0.5">{signal.institutionalFlow}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-[#64748B] font-semibold">Confluence</div>
          <div className="text-xl font-black text-[#FFD700] font-mono">{signal.confluenceScore}%</div>
        </div>
      </div>

      {/* Execution Prices Grid with Live Price as First Column */}
      <div className="grid grid-cols-5 gap-1.5 bg-[#080B11]/90 rounded-xl p-2.5 border border-[#222F47] mb-3">
        <div className={`p-1 rounded-lg transition-colors ${
          flashDir === 'up' ? 'bg-[#00E676]/15' : flashDir === 'down' ? 'bg-[#FF3366]/15' : ''
        }`}>
          <div className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            Live
          </div>
          <div className={`text-xs font-mono font-black mt-0.5 ${
            flashDir === 'up' ? 'text-[#00E676]' : flashDir === 'down' ? 'text-[#FF3366]' : 'text-[#F1F5F9]'
          }`}>
            {formatPrice(signal.pair, livePrice)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Entry</div>
          <div className="text-xs font-mono font-bold text-[#F1F5F9] mt-0.5">
            {formatPrice(signal.pair, signal.entryPrice)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[#FF3366] font-bold uppercase tracking-wider">Stop Loss</div>
          <div className="text-xs font-mono font-bold text-[#FF3366] mt-0.5">
            {formatPrice(signal.pair, signal.stopLoss)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[#00E676] font-bold uppercase tracking-wider">Take Profit 1</div>
          <div className="text-xs font-mono font-bold text-[#00E676] mt-0.5">
            {formatPrice(signal.pair, signal.takeProfit1)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[#2979FF] font-bold uppercase tracking-wider">R:R Ratio</div>
          <div className="text-xs font-mono font-bold text-[#2979FF] mt-0.5">
            {signal.riskReward}
          </div>
        </div>
      </div>

      {/* Validity Countdown Indicator */}
      {isPending && (
        <div className="mb-3 bg-[#101522] rounded-lg p-2 border border-[#222F47]">
          <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-1">
            <span className="flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3 h-3 text-[#00E676]" />
              Setup Invalidation Window:
            </span>
            <span className="font-mono font-bold text-[#FFD700]">{countdown}</span>
          </div>
          <div className="w-full bg-[#182033] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FFD700] to-[#00E676] h-full transition-all duration-1000"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Elev8 MT5 Execution Bar */}
      {onOpenElev8Order && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenElev8Order();
          }}
          className="w-full mb-2.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#2979FF]/20 via-[#00E676]/15 to-[#2979FF]/20 hover:from-[#2979FF]/30 hover:to-[#00E676]/25 border border-[#2979FF]/40 text-[#F1F5F9] font-black text-xs flex items-center justify-between transition-all group shadow"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#00E676] group-hover:scale-110 transition-transform" />
            <span>Elev8 MT5 Order</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#00E676]">
            <span>Custom Lots & Projected P&L</span>
            <span>➔</span>
          </div>
        </button>
      )}

      {/* 4 Action Buttons Row: [ Setup ] [ AI Audit ] [ Chart ] [ Backtest ] */}
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#222F47]/60">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
          className="flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 px-1 rounded-lg bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] border border-[#222F47] transition-all"
          title="Open Setup Details"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span>Setup</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAskAi();
          }}
          className="flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 px-1 rounded-lg bg-[#2979FF]/15 hover:bg-[#2979FF]/25 text-[#2979FF] border border-[#2979FF]/40 transition-all"
          title="Audit setup with Gemini AI"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Audit</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenChart) onOpenChart();
          }}
          className="flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 px-1 rounded-lg bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 shadow-[0_0_10px_rgba(0,230,118,0.2)] transition-all"
          title="Open Live TradingView Chart (Deriv & Forex Feed)"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Chart</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onTestBacktest();
          }}
          className="flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 px-1 rounded-lg bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/40 transition-all"
          title="Test historical performance in Quant Lab"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Backtest</span>
        </button>
      </div>
    </div>
  );
};
