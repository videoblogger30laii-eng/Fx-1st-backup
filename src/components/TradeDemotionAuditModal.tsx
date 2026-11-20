import React from 'react';
import { ForexSignal } from '../types';
import { formatPrice } from '../services/marketData';
import {
  X,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Info
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  signal: ForexSignal | null;
  onAskAi?: (sig: ForexSignal) => void;
}

export const TradeDemotionAuditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  signal,
  onAskAi
}) => {
  if (!isOpen || !signal || !signal.demotionAudit) return null;

  const audit = signal.demotionAudit;
  const isBuy = signal.type.startsWith('BUY');

  const getVerdictBadge = () => {
    switch (audit.verdict) {
      case 'STOP_IMMEDIATELY':
        return {
          bg: 'bg-[#FF3366]/15',
          border: 'border-[#FF3366]/40',
          text: 'text-[#FF3366]',
          icon: AlertOctagon,
          title: 'STOP IMMEDIATELY / CLOSE TRADE'
        };
      case 'WATCH_OUT':
        return {
          bg: 'bg-[#FF9100]/15',
          border: 'border-[#FF9100]/40',
          text: 'text-[#FF9100]',
          icon: AlertTriangle,
          title: 'WATCH OUT / TIGHTEN RISK'
        };
      case 'SAFE_TO_HOLD':
      default:
        return {
          bg: 'bg-[#00E676]/15',
          border: 'border-[#00E676]/40',
          text: 'text-[#00E676]',
          icon: ShieldCheck,
          title: 'SAFE TO RUN WITH CAUTION'
        };
    }
  };

  const badgeInfo = getVerdictBadge();
  const VerdictIcon = badgeInfo.icon;

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
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FF9100]/20 border border-[#FF9100]/50 text-[#FF9100]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-[#F1F5F9]">
                  {signal.pair.symbol} Trade Demotion Audit
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isBuy ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-[#FF3366]/20 text-[#FF3366]'
                }`}>
                  {signal.type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono">
                Moved from A+ Setup to Running Feed · {audit.demotedAtFormatted}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#182033] hover:bg-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Main Actionable Verdict Box */}
          <div className={`p-3.5 rounded-xl border ${badgeInfo.bg} ${badgeInfo.border} space-y-2`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <VerdictIcon className={`w-4 h-4 ${badgeInfo.text}`} />
                <span className={`font-black text-xs uppercase tracking-wide ${badgeInfo.text}`}>
                  {badgeInfo.title}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                Trigger: {audit.triggerFactor.replace('_', ' ')}
              </span>
            </div>

            <p className="text-xs text-[#F1F5F9] leading-relaxed font-semibold">
              {audit.actionableAdvice}
            </p>
          </div>

          {/* Primary Reason Why Demoted */}
          <div className="bg-[#10182B] border border-[#222F47] rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[#FFD700] font-bold text-xs">
              <Info className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>Why Was This Trade Demoted From A+ Setup?</span>
            </div>
            <p className="text-[11.5px] text-[#CBD5E1] bg-[#0A0E1A] p-2.5 rounded-lg border border-[#1E293B] leading-relaxed">
              {audit.reason}
            </p>
          </div>

          {/* Institutional Breakdown Details */}
          {audit.details && audit.details.length > 0 && (
            <div className="bg-[#10182B] border border-[#222F47] rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                Audit Checklist & Telemetry
              </div>
              <div className="space-y-1.5">
                {audit.details.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-[#0A0E1A] p-2 rounded-lg border border-[#1E293B] text-[11px] text-[#E2E8F0]"
                  >
                    <span className="text-[#FF9100] mt-0.5">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Position Snapshot */}
          <div className="grid grid-cols-4 gap-2 bg-[#080B11] p-2.5 rounded-xl border border-[#222F47] text-center font-mono">
            <div>
              <div className="text-[9px] text-[#64748B] uppercase">Entry</div>
              <div className="text-xs font-bold text-[#F1F5F9] mt-0.5">
                {formatPrice(signal.pair, signal.entryPrice)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-[#FF3366] uppercase">Stop Loss</div>
              <div className="text-xs font-bold text-[#FF3366] mt-0.5">
                {formatPrice(signal.pair, signal.stopLoss)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-[#00E676] uppercase">Take Profit</div>
              <div className="text-xs font-bold text-[#00E676] mt-0.5">
                {formatPrice(signal.pair, signal.takeProfit1)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-[#94A3B8] uppercase">Floating P&L</div>
              <div className={`text-xs font-black mt-0.5 ${
                signal.pips >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
              }`}>
                {signal.pips >= 0 ? `+${signal.pips}` : signal.pips}p
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#64748B] bg-[#12192A] p-2 rounded-lg border border-[#1E293B] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#2979FF] shrink-0" />
            <span>
              <strong>Note:</strong> If conditions improve and the setup passes all 9 institutional layers again, this badge will automatically disappear and the setup will return to the A+ Active section!
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#10182B] border-t border-[#222F47] flex items-center justify-between gap-2">
          {onAskAi && (
            <button
              onClick={() => {
                onClose();
                onAskAi(signal);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2979FF]/20 hover:bg-[#2979FF]/30 text-[#60A5FA] border border-[#2979FF]/40 text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Copilot Advice</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-bold transition-all cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
