import React, { useState } from 'react';
import { ForexSignal } from '../types';
import { formatPrice, calculateSlPips, calculateLotSize, getFormattedCountdown } from '../services/marketData';
import { X, Copy, Check, Sparkles, FlaskConical, Bell, Star, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  signal: ForexSignal;
  onDismiss: () => void;
  onTestInBacktest: () => void;
  onToggleAlert: () => void;
  onToggleFavorite: () => void;
  onAskAi: (signal: ForexSignal) => void;
  onSetCustomAlert: (signal: ForexSignal) => void;
  nowClockMs: number;
}

export const SignalDetailSheet: React.FC<Props> = ({
  signal,
  onDismiss,
  onTestInBacktest,
  onToggleAlert,
  onToggleFavorite,
  onAskAi,
  onSetCustomAlert,
  nowClockMs
}) => {
  const [copiedMt4, setCopiedMt4] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  const slPips = calculateSlPips(signal);
  const countdown = getFormattedCountdown(signal, nowClockMs);
  const isPending = signal.status === 'PENDING' || signal.isPending;

  const lot1k = calculateLotSize(signal, 1000, 1.0).toFixed(2);
  const lot5k = calculateLotSize(signal, 5000, 1.0).toFixed(2);
  const lot10k = calculateLotSize(signal, 10000, 1.0).toFixed(2);
  const lot50k = calculateLotSize(signal, 50000, 1.0).toFixed(2);

  const copyMt4 = () => {
    const text = `${signal.type} ${signal.pair.symbol.replace('/', '')} @ ${formatPrice(signal.pair, signal.entryPrice)} | SL: ${formatPrice(signal.pair, signal.stopLoss)} | TP1: ${formatPrice(signal.pair, signal.takeProfit1)}`;
    navigator.clipboard.writeText(text);
    setCopiedMt4(true);
    setTimeout(() => setCopiedMt4(false), 2000);
  };

  const copyTelegram = () => {
    const text = `⚡ INSTITUTIONAL FOREX SIGNAL ⚡
Instrument: ${signal.pair.symbol} (${signal.type})
Session: ${signal.killzone}
Tier: ${signal.quality} (${signal.confluenceScore}% Confluence)
--------------------------------
🎯 Entry: ${formatPrice(signal.pair, signal.entryPrice)}
🛑 Stop Loss: ${formatPrice(signal.pair, signal.stopLoss)} (${slPips} pips)
✅ Take Profit 1: ${formatPrice(signal.pair, signal.takeProfit1)}
✅ Take Profit 2: ${formatPrice(signal.pair, signal.takeProfit2)}
✅ Take Profit 3: ${formatPrice(signal.pair, signal.takeProfit3)}
📊 Risk/Reward: ${signal.riskReward}
🛡️ Rationale: ${signal.rationale}`;
    navigator.clipboard.writeText(text);
    setCopiedTelegram(true);
    setTimeout(() => setCopiedTelegram(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-[#101522] border border-[#222F47] rounded-t-2xl sm:rounded-2xl max-h-[92vh] w-full max-w-xl overflow-y-auto shadow-2xl p-4 sm:p-6 text-left">
        {/* Header Row */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-[#F1F5F9]">{signal.pair.symbol}</span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded ${
                  signal.type.startsWith('BUY')
                    ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                    : 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                }`}
              >
                {signal.type}
              </span>
              <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/15 px-2 py-0.5 rounded border border-[#FFD700]/30">
                {signal.confluenceScore}% Confluence
              </span>
            </div>
            <div className="text-[11px] text-[#94A3B8]">{signal.pair.name} • {signal.timeframe}</div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleAlert}
              className={`p-2 rounded-lg border ${
                signal.hasAlert ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]' : 'bg-[#182033] border-[#222F47] text-[#64748B]'
              }`}
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg border ${
                signal.isFavorite ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]' : 'bg-[#182033] border-[#222F47] text-[#64748B]'
              }`}
            >
              <Star className={`w-4 h-4 ${signal.isFavorite ? 'fill-[#FFD700]' : ''}`} />
            </button>
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* State Banner */}
        <div className="my-3 p-3 bg-[#182033] rounded-xl border border-[#222F47] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold">Trade Lifecycle State</div>
            <div className="text-sm font-bold text-[#F1F5F9]">
              {isPending ? 'PENDING LIMIT (Awaiting Fill)' : `ACTIVE / RUNNING (+${signal.pips}p)`}
            </div>
          </div>
          {isPending && (
            <div className="text-right">
              <div className="text-[9px] text-[#64748B] uppercase font-bold">Expires in</div>
              <div className="text-xs font-mono font-bold text-[#FFD700]">{countdown}</div>
            </div>
          )}
        </div>

        {/* Execution Levels Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
            <span className="text-[9px] text-[#64748B] uppercase font-bold">Limit / Entry</span>
            <div className="text-sm font-mono font-bold text-[#F1F5F9]">{formatPrice(signal.pair, signal.entryPrice)}</div>
          </div>
          <div className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
            <span className="text-[9px] text-[#FF3366] uppercase font-bold">Stop Loss</span>
            <div className="text-sm font-mono font-bold text-[#FF3366]">{formatPrice(signal.pair, signal.stopLoss)}</div>
            <div className="text-[9px] text-[#64748B]">Risk: {slPips} pips</div>
          </div>
          <div className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
            <span className="text-[9px] text-[#00E676] uppercase font-bold">Take Profit 1</span>
            <div className="text-sm font-mono font-bold text-[#00E676]">{formatPrice(signal.pair, signal.takeProfit1)}</div>
            <div className="text-[9px] text-[#64748B]">Bank 50% lots</div>
          </div>
          <div className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
            <span className="text-[9px] text-[#2979FF] uppercase font-bold">Risk / Reward</span>
            <div className="text-sm font-mono font-bold text-[#2979FF]">{signal.riskReward}</div>
            <div className="text-[9px] text-[#64748B]">Target asymmetric</div>
          </div>
        </div>

        {/* Additional TPs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
            <span className="text-[9px] text-[#00E676] uppercase font-bold">Take Profit 2 (Extension)</span>
            <div className="text-sm font-mono font-bold text-[#00E676]">{formatPrice(signal.pair, signal.takeProfit2)}</div>
            <div className="text-[9px] text-[#64748B]">Bank 30% lots</div>
          </div>
          <div className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
            <span className="text-[9px] text-[#00E676] uppercase font-bold">Take Profit 3 (Runner)</span>
            <div className="text-sm font-mono font-bold text-[#00E676]">{formatPrice(signal.pair, signal.takeProfit3)}</div>
            <div className="text-[9px] text-[#64748B]">Trailing Stop Runner</div>
          </div>
        </div>

        {/* Institutional Rationale */}
        <div className="bg-[#182033]/60 p-3 rounded-xl border border-[#222F47] mb-4">
          <div className="text-[10px] text-[#FFD700] uppercase font-bold mb-1">Institutional Rationale</div>
          <p className="text-xs text-[#F1F5F9] leading-relaxed">{signal.rationale}</p>
          <div className="text-[10px] text-[#94A3B8] mt-2 font-mono">
            Session: {signal.killzone} • Economic Shield: {signal.economicRisk}
          </div>
        </div>

        {/* Confluence Checklist */}
        {signal.checklist.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-[#64748B] uppercase font-bold mb-2">Confluence Verification Checklist</div>
            <div className="space-y-1.5">
              {signal.checklist.map((item, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#080B11] p-2 rounded-lg border border-[#222F47]/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#F1F5F9]">{item.title}</div>
                    <div className="text-[10px] text-[#94A3B8]">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prop Firm & Retail Mathematical Lot Sizing (1% Risk Model) */}
        <div className="mb-4">
          <div className="text-[10px] text-[#64748B] uppercase font-bold mb-2">
            Mathematical Lot Sizing (Strict 1% Risk Allocation)
          </div>
          <div className="grid grid-cols-4 gap-2 bg-[#080B11] p-2.5 rounded-xl border border-[#222F47] text-center">
            <div>
              <div className="text-[9px] text-[#64748B]">$1,000 Equity</div>
              <div className="text-xs font-mono font-bold text-[#00E676] mt-0.5">{lot1k} Lots</div>
              <div className="text-[8px] text-[#64748B]">Max: $10 risk</div>
            </div>
            <div>
              <div className="text-[9px] text-[#64748B]">$5,000 Equity</div>
              <div className="text-xs font-mono font-bold text-[#00E676] mt-0.5">{lot5k} Lots</div>
              <div className="text-[8px] text-[#64748B]">Max: $50 risk</div>
            </div>
            <div>
              <div className="text-[9px] text-[#64748B]">$10,000 Equity</div>
              <div className="text-xs font-mono font-bold text-[#00E676] mt-0.5">{lot10k} Lots</div>
              <div className="text-[8px] text-[#64748B]">Max: $100 risk</div>
            </div>
            <div>
              <div className="text-[9px] text-[#64748B]">$50,000 Prop</div>
              <div className="text-xs font-mono font-bold text-[#00E676] mt-0.5">{lot50k} Lots</div>
              <div className="text-[8px] text-[#64748B]">Max: $500 risk</div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#222F47]">
          <button
            onClick={copyMt4}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] font-bold text-xs rounded-xl border border-[#222F47] transition-colors"
          >
            {copiedMt4 ? <Check className="w-4 h-4 text-[#00E676]" /> : <Copy className="w-4 h-4 text-[#94A3B8]" />}
            <span>{copiedMt4 ? 'Copied MT4 Order' : 'Copy MT4 / MT5 Order'}</span>
          </button>

          <button
            onClick={copyTelegram}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] font-bold text-xs rounded-xl border border-[#222F47] transition-colors"
          >
            {copiedTelegram ? <Check className="w-4 h-4 text-[#00E676]" /> : <Copy className="w-4 h-4 text-[#94A3B8]" />}
            <span>{copiedTelegram ? 'Copied Telegram' : 'Copy Telegram Signal'}</span>
          </button>

          <button
            onClick={() => onAskAi(signal)}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#2979FF]/20 hover:bg-[#2979FF]/30 text-[#2979FF] font-bold text-xs rounded-xl border border-[#2979FF]/40 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Audit with AI Copilot</span>
          </button>

          <button
            onClick={onTestInBacktest}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] font-bold text-xs rounded-xl border border-[#FFD700]/40 transition-colors"
          >
            <FlaskConical className="w-4 h-4" />
            <span>Test in Quant Lab</span>
          </button>
        </div>
      </div>
    </div>
  );
};
