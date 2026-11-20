import React, { useState } from 'react';
import { ForexSignal } from '../types';
import { formatPrice, getSignalParameterAudit } from '../services/marketData';
import {
  X,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Sparkles,
  Zap,
  Flame,
  HelpCircle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  signal: ForexSignal | null;
  onAskAi?: (sig: ForexSignal) => void;
}

export const SignalChangeAuditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  signal,
  onAskAi
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !signal) return null;

  const audit = getSignalParameterAudit(signal);
  const isBuy = signal.type.startsWith('BUY');
  const isRecalculated = audit.isRecalculated;

  const handleCopyOrder = () => {
    const text = `${signal.type} ${signal.pair.symbol.replace('/', '')} [${signal.timeframe}] @ ${formatPrice(signal.pair, signal.entryPrice)} | SL: ${formatPrice(signal.pair, signal.stopLoss)} | TP1: ${formatPrice(signal.pair, signal.takeProfit1)} (Audit: ${audit.verdict.headline})`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const getVerdictTheme = () => {
    switch (audit.verdict.status) {
      case 'TRADE_RECOMMENDED':
        return {
          bg: 'bg-[#00E676]/10',
          border: 'border-[#00E676]/40',
          text: 'text-[#00E676]',
          badge: 'bg-[#00E676]/20 border-[#00E676]/50 text-[#00E676]',
          icon: CheckCircle2,
          tag: 'APPROVED TO TRADE'
        };
      case 'TRADE_WITH_CAUTION':
        return {
          bg: 'bg-[#FF9100]/10',
          border: 'border-[#FF9100]/40',
          text: 'text-[#FFD700]',
          badge: 'bg-[#FF9100]/20 border-[#FF9100]/50 text-[#FFD700]',
          icon: AlertTriangle,
          tag: 'TRADE WITH CAUTION'
        };
      case 'STAND_DOWN':
      default:
        return {
          bg: 'bg-[#FF3366]/10',
          border: 'border-[#FF3366]/40',
          text: 'text-[#FF3366]',
          badge: 'bg-[#FF3366]/20 border-[#FF3366]/50 text-[#FF3366]',
          icon: ShieldAlert,
          tag: 'STAND DOWN / AVOID'
        };
    }
  };

  const verdictTheme = getVerdictTheme();
  const VerdictIcon = verdictTheme.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#0D1322] border border-[#222F47] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#F1F5F9]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#222F47] bg-[#10182B]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
              isRecalculated
                ? 'bg-[#FF9100]/20 border-[#FF9100]/40 text-[#FFD700]'
                : 'bg-[#2979FF]/20 border-[#2979FF]/40 text-[#60A5FA]'
            }`}>
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-white">{signal.pair.symbol}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                  isBuy ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30' : 'bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/30'
                }`}>
                  {signal.type.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono text-[#60A5FA] bg-[#2979FF]/15 px-1.5 py-0.2 rounded border border-[#2979FF]/30">
                  [{signal.timeframe}]
                </span>
              </div>
              <div className="text-[11px] text-[#94A3B8] font-medium truncate">
                Signal Parameter & Recalculation Audit
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#182033] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 text-xs">
          {/* Status Banner */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isRecalculated
              ? 'bg-[#FF9100]/10 border-[#FF9100]/30 text-[#FFD700]'
              : 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]'
          }`}>
            {isRecalculated ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#FFD700]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#00E676]" />
            )}
            <div className="space-y-1 min-w-0">
              <div className="font-black text-xs uppercase tracking-wide flex items-center justify-between gap-2 flex-wrap">
                <span>{isRecalculated ? 'Parameters Have Been Modified / Recalculated' : 'Original Baseline Verified (No Changes)'}</span>
                {signal.createdAtFormatted && (
                  <span className="text-[10px] text-[#94A3B8] font-mono font-normal">
                    {signal.createdAtFormatted}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#F1F5F9] leading-relaxed">
                {audit.changeSummary}
              </p>
            </div>
          </div>

          {/* Section: WHY WAS IT CHANGED? */}
          <div className="bg-[#141C2E] border border-[#222F47] rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#94A3B8] font-bold text-[10.5px] uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-[#2979FF]" />
              <span>Why Was This Signal Changed or Calibrated?</span>
            </div>
            <p className="text-[11.5px] text-[#CBD5E1] leading-relaxed bg-[#0A0F1C] p-2.5 rounded-lg border border-[#222F47]/60">
              {audit.reason}
            </p>
          </div>

          {/* Section: SIDE-BY-SIDE PARAMETER AUDIT TABLE */}
          {audit.changes.length > 0 && (
            <div className="bg-[#141C2E] border border-[#222F47] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[#94A3B8] font-bold text-[10.5px] uppercase tracking-wider">
                <span>Changed Parameters Comparison</span>
                <span className="text-[9.5px] text-[#2979FF] font-mono">{audit.changes.length} Modified Fields</span>
              </div>

              <div className="space-y-1.5 divide-y divide-[#222F47]/60">
                {audit.changes.map((ch, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-[#94A3B8] font-sans font-medium">{ch.field}:</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-[#1C263B] text-[#94A3B8] line-through">
                        {String(ch.original)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[#2979FF]" />
                      <span className="px-1.5 py-0.5 rounded bg-[#2979FF]/20 border border-[#2979FF]/40 text-[#60A5FA] font-bold">
                        {String(ch.current)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Live Specifications Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center font-mono text-[10.5px]">
            <div className="bg-[#0A0F1C] p-2 rounded-lg border border-[#222F47]">
              <div className="text-[8.5px] text-[#64748B] uppercase font-bold">Entry</div>
              <div className="text-white font-bold">{formatPrice(signal.pair, signal.entryPrice)}</div>
            </div>
            <div className="bg-[#0A0F1C] p-2 rounded-lg border border-[#222F47]">
              <div className="text-[8.5px] text-[#64748B] uppercase font-bold">Stop Loss</div>
              <div className="text-[#FF3366] font-bold">{formatPrice(signal.pair, signal.stopLoss)}</div>
            </div>
            <div className="bg-[#0A0F1C] p-2 rounded-lg border border-[#222F47]">
              <div className="text-[8.5px] text-[#64748B] uppercase font-bold">Take Profit 1</div>
              <div className="text-[#00E676] font-bold">{formatPrice(signal.pair, signal.takeProfit1)}</div>
            </div>
            <div className="bg-[#0A0F1C] p-2 rounded-lg border border-[#222F47]">
              <div className="text-[8.5px] text-[#64748B] uppercase font-bold">Confluence</div>
              <div className="text-[#FFD700] font-bold">{signal.confluenceScore}%</div>
            </div>
          </div>

          {/* Section: ACTIONABLE VERDICT - "SHOULD IT BE TRADED OR NOT?" */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${verdictTheme.bg} ${verdictTheme.border}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <VerdictIcon className={`w-4 h-4 ${verdictTheme.text}`} />
                <span className="font-black text-xs uppercase tracking-wide text-white">
                  Institutional Verdict:
                </span>
              </div>
              <span className={`text-[9.5px] font-black px-2 py-0.5 rounded border ${verdictTheme.badge}`}>
                {verdictTheme.tag}
              </span>
            </div>

            <div className="font-bold text-xs text-white">
              {audit.verdict.headline}
            </div>

            <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
              👉 {audit.verdict.actionableAdvice}
            </p>

            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-[#94A3B8]">
              <span>Confluence Context:</span>
              <span className="font-mono text-[#F1F5F9] font-medium">{audit.verdict.confluenceImpact}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#222F47] bg-[#10182B] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyOrder}
              className="px-2.5 py-1.5 rounded-lg bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-white text-[10.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Order Copied!' : 'Copy MT4/MT5'}</span>
            </button>

            {onAskAi && (
              <button
                onClick={() => {
                  onClose();
                  onAskAi(signal);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#2979FF]/15 hover:bg-[#2979FF]/25 border border-[#2979FF]/40 text-[#60A5FA] text-[10.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                <span>Ask AI Audit</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#2979FF] hover:bg-[#2979FF]/90 text-white text-[10.5px] font-black transition-colors cursor-pointer ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
