import React, { useState } from 'react';
import { ForexSignal } from '../types';
import { formatPrice, getFormattedCountdown, getValidityProgress } from '../services/marketData';
import { Sparkles, ArrowUpRight, Copy, Check, FlaskConical, ShieldCheck, Flame } from 'lucide-react';

interface Props {
  signal: ForexSignal;
  onInspect: () => void;
  onAskAi: () => void;
  onTestBacktest: () => void;
  nowClockMs: number;
}

export const BestTradeHeroCard: React.FC<Props> = ({
  signal,
  onInspect,
  onAskAi,
  onTestBacktest,
  nowClockMs
}) => {
  const [copied, setCopied] = useState(false);
  const countdown = getFormattedCountdown(signal, nowClockMs);
  const progress = getValidityProgress(signal, nowClockMs);
  const isPending = signal.status === 'PENDING' || signal.isPending;

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
      className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#182033] to-[#101522] border-2 border-[#FFD700]/40 p-4 shadow-lg cursor-pointer hover:border-[#FFD700] transition-all"
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 bg-[#FFD700]/15 border border-[#FFD700]/50 rounded-full px-2.5 py-0.5">
          <Flame className="w-3.5 h-3.5 text-[#FFD700]" />
          <span className="text-[10px] font-black text-[#FFD700] tracking-wider uppercase">
            BEST TRADE NOW • 84.8% WIN RATE EDGE
          </span>
        </div>
        <div className="text-[10px] font-mono text-[#94A3B8] bg-[#080B11]/80 px-2 py-0.5 rounded border border-[#222F47]">
          {signal.timeframe} • {signal.killzone}
        </div>
      </div>

      {/* Main Info Row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-[#F1F5F9]">{signal.pair.symbol}</span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                signal.type.startsWith('BUY')
                  ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                  : 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
              }`}
            >
              {signal.type}
            </span>
            <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded border border-[#FFD700]/30">
              {signal.confluenceScore}% Confluence
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">{signal.pair.name}</p>
        </div>

        <div className="text-right">
          <div className="text-xl font-black font-mono text-[#F1F5F9]">
            {formatPrice(signal.pair, signal.currentPrice)}
          </div>
          <div className="text-[10px] font-bold text-[#00E676]">
            {isPending ? 'Awaiting Limit Touch' : `+${signal.pips} pips floating`}
          </div>
        </div>
      </div>

      {/* Price Target Matrix */}
      <div className="grid grid-cols-3 gap-2 bg-[#080B11]/70 rounded-xl p-2.5 border border-[#222F47] mb-3">
        <div>
          <div className="text-[9px] text-[#64748B] font-bold uppercase">Entry</div>
          <div className="text-[12px] font-mono font-bold text-[#F1F5F9]">
            {formatPrice(signal.pair, signal.entryPrice)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[#FF3366] font-bold uppercase">Stop Loss</div>
          <div className="text-[12px] font-mono font-bold text-[#FF3366]">
            {formatPrice(signal.pair, signal.stopLoss)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[#00E676] font-bold uppercase">TP1 Target</div>
          <div className="text-[12px] font-mono font-bold text-[#00E676]">
            {formatPrice(signal.pair, signal.takeProfit1)}
          </div>
        </div>
      </div>

      {/* Rationale Snippet */}
      <p className="text-[11px] text-[#94A3B8] line-clamp-2 mb-3">
        {signal.rationale}
      </p>

      {/* Countdown Timer Bar */}
      {isPending && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
            <span>Setup Invalidation Window:</span>
            <span className="font-mono text-[#FFD700] font-bold">{countdown}</span>
          </div>
          <div className="w-full bg-[#080B11] h-1.5 rounded-full overflow-hidden border border-[#222F47]">
            <div
              className="bg-gradient-to-r from-[#00E676] to-[#FFD700] h-full transition-all duration-1000"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#222F47]/60">
        <button
          onClick={copyMt4}
          className="flex items-center gap-1 text-[11px] font-bold bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] px-2.5 py-1.5 rounded-lg border border-[#222F47] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />}
          <span>{copied ? 'Copied' : 'Copy MT4'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAi();
            }}
            className="flex items-center gap-1 text-[11px] font-bold bg-[#2979FF]/15 hover:bg-[#2979FF]/25 text-[#2979FF] px-2.5 py-1.5 rounded-lg border border-[#2979FF]/40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Audit</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onTestBacktest();
            }}
            className="flex items-center gap-1 text-[11px] font-bold bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] px-2.5 py-1.5 rounded-lg border border-[#FFD700]/40 transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Quant Lab</span>
          </button>
        </div>
      </div>
    </div>
  );
};
