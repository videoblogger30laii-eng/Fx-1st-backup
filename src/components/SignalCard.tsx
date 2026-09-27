import React, { useState } from 'react';
import { ForexSignal } from '../types';
import { formatPrice, getFormattedCountdown } from '../services/marketData';
import { Star, Bell, BellOff, Sparkles, ChevronRight, Copy, Check } from 'lucide-react';

interface Props {
  signal: ForexSignal;
  onClick: () => void;
  onToggleFavorite: () => void;
  onToggleAlert: () => void;
  onAskAi: () => void;
  nowClockMs: number;
}

export const SignalCard: React.FC<Props> = ({
  signal,
  onClick,
  onToggleFavorite,
  onToggleAlert,
  onAskAi,
  nowClockMs
}) => {
  const [copied, setCopied] = useState(false);
  const isBuy = signal.type.startsWith('BUY');
  const isPending = signal.status === 'PENDING' || signal.isPending;
  const isClosed = signal.status === 'HIT_TP' || signal.status === 'HIT_SL';
  const countdown = getFormattedCountdown(signal, nowClockMs);

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
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-1">
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
      <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-2.5">
        <span className="truncate max-w-[220px] font-medium">{signal.institutionalFlow}</span>
        <span className="font-mono bg-[#182033] px-2 py-0.5 rounded border border-[#222F47] text-[#F1F5F9]">
          {signal.timeframe}
        </span>
      </div>

      {/* Price Grid */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#080B11]/80 rounded-lg p-2 border border-[#222F47] mb-2.5">
        <div>
          <div className="text-[8.5px] text-[#64748B] font-bold uppercase">Entry</div>
          <div className="text-[11px] font-mono font-bold text-[#F1F5F9]">
            {formatPrice(signal.pair, signal.entryPrice)}
          </div>
        </div>
        <div>
          <div className="text-[8.5px] text-[#FF3366] font-bold uppercase">SL</div>
          <div className="text-[11px] font-mono font-bold text-[#FF3366]">
            {formatPrice(signal.pair, signal.stopLoss)}
          </div>
        </div>
        <div>
          <div className="text-[8.5px] text-[#00E676] font-bold uppercase">TP1</div>
          <div className="text-[11px] font-mono font-bold text-[#00E676]">
            {formatPrice(signal.pair, signal.takeProfit1)}
          </div>
        </div>
        <div>
          <div className="text-[8.5px] text-[#2979FF] font-bold uppercase">R:R</div>
          <div className="text-[11px] font-mono font-bold text-[#2979FF]">
            {signal.riskReward}
          </div>
        </div>
      </div>

      {/* Status & Validity bar */}
      <div className="flex items-center justify-between text-[10px] pt-1">
        <div className="flex items-center gap-2">
          {isPending ? (
            <span className="text-[#FFD700] font-bold bg-[#FFD700]/10 px-2 py-0.5 rounded border border-[#FFD700]/25">
              PENDING ({countdown})
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
            <span className="text-[#00E676] font-bold bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
              ACTIVE (+{signal.pips} pips)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={copyOrder}
            className="flex items-center gap-1 text-[10px] font-bold text-[#94A3B8] hover:text-[#F1F5F9] bg-[#182033] px-2 py-1 rounded border border-[#222F47]"
          >
            {copied ? <Check className="w-3 h-3 text-[#00E676]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'MT4'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAi();
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-[#2979FF] hover:text-[#2979FF] bg-[#2979FF]/10 px-2 py-1 rounded border border-[#2979FF]/30"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI</span>
          </button>

          <ChevronRight className="w-4 h-4 text-[#64748B]" />
        </div>
      </div>
    </div>
  );
};
