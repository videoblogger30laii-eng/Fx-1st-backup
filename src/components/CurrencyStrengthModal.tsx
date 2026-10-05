import React, { useState, useEffect } from 'react';
import { CurrencyStrengthItem, BestPairingRecommendation } from '../types';
import { currencyStrengthService } from '../services/currencyStrengthService';
import { TelegramAlertService } from '../services/TelegramAlertService';
import {
  X,
  Gauge,
  TrendingUp,
  TrendingDown,
  Zap,
  ArrowRight,
  ShieldCheck,
  Send,
  Check,
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPair?: (pairSymbol: string) => void;
}

export const CurrencyStrengthModal: React.FC<Props> = ({ isOpen, onClose, onSelectPair }) => {
  const [strengths, setStrengths] = useState<CurrencyStrengthItem[]>([]);
  const [pairings, setPairings] = useState<BestPairingRecommendation[]>([]);
  const [sentAlert, setSentAlert] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStrengths(currencyStrengthService.getCurrencyStrengths());
      setPairings(currencyStrengthService.getBestPairings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const refreshData = () => {
    setStrengths(currencyStrengthService.getCurrencyStrengths());
    setPairings(currencyStrengthService.getBestPairings());
  };

  const handleSendToTelegram = async () => {
    if (strengths.length === 0) return;
    const topStrong = strengths[0];
    const topWeak = strengths[strengths.length - 1];

    const lines = strengths.map(s => `${s.currency}: ${s.strength}/10 (${s.status.replace('_', ' ')})`).join('\n');
    const msg = `📊 *LIVE CURRENCY STRENGTH METER (8 MAJORS)*\n\n` +
      `🔥 *Strongest:* ${topStrong.currency} (${topStrong.strength}/10)\n` +
      `❄️ *Weakest:* ${topWeak.currency} (${topWeak.strength}/10)\n\n` +
      `📈 *Full Breakdown:*\n${lines}\n\n` +
      `🎯 *Top Recommended Institutional Pairing:*\n` +
      `👉 *${pairings[0]?.action || 'BUY'} ${pairings[0]?.pair || 'USD/JPY'}* (Strength Diff: ${pairings[0]?.strengthDiff} pts)\n` +
      `💡 *Rationale:* ${pairings[0]?.confluenceReason || 'Dominant institutional order flow divergence.'}`;

    setSentAlert(true);
    await TelegramAlertService.sendAlert(msg);
    setTimeout(() => setSentAlert(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D111C] border border-[#222F47] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2979FF]/20 border border-[#2979FF]/40 flex items-center justify-center text-[#2979FF]">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wide">
                  Live Currency Strength Meter
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-[9.5px] font-bold">
                  8 MAJORS
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Real-time institutional capital flow & relative currency dominance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] rounded-lg transition-colors"
              title="Refresh Quotes"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top Recommendations Banner */}
          <div className="bg-gradient-to-r from-[#2979FF]/15 via-[#101522] to-[#00E676]/15 border border-[#2979FF]/40 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-[#F1F5F9] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                Top High-Confluence Pairings (Strong vs Weak)
              </span>
              <button
                onClick={handleSendToTelegram}
                className="px-2 py-1 rounded-lg bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/40 text-[#0088cc] text-[10px] font-bold flex items-center gap-1 transition-all"
              >
                {sentAlert ? (
                  <>
                    <Check className="w-3 h-3 text-[#00E676]" />
                    <span className="text-[#00E676]">Sent to TG!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Broadcast to TG</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pairings.slice(0, 2).map((rec, i) => (
                <div
                  key={i}
                  onClick={() => onSelectPair && onSelectPair(rec.pair)}
                  className="bg-[#080B11] border border-[#222F47] hover:border-[#00E676]/50 rounded-lg p-2.5 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-sm text-white">{rec.pair}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          rec.action === 'BUY'
                            ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                            : 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                        }`}
                      >
                        {rec.action}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#FFD700]">
                      +{rec.strengthDiff} pt spread
                    </span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1 line-clamp-2">
                    {rec.confluenceReason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 8 Currency Strength Bars */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              Relative Strength Index (0.0 to 10.0)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {strengths.map(item => {
                const pct = (item.strength / 10) * 100;
                const isStrong = item.strength >= 6.5;
                const isWeak = item.strength <= 3.5;

                return (
                  <div
                    key={item.currency}
                    className="bg-[#101522] border border-[#222F47] rounded-xl p-2.5"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#182033] border border-[#222F47] flex items-center justify-center font-mono font-black text-xs text-white">
                          {item.currency}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-[#F1F5F9] block">
                            {item.status.replace('_', ' ')}
                          </span>
                          <span
                            className={`text-[9.5px] font-mono font-bold ${
                              item.change24h >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
                            }`}
                          >
                            {item.change24h >= 0 ? '+' : ''}
                            {item.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-mono font-black ${
                            isStrong
                              ? 'text-[#00E676]'
                              : isWeak
                              ? 'text-[#FF3366]'
                              : 'text-[#FFD700]'
                          }`}
                        >
                          {item.strength.toFixed(1)}
                        </span>
                        <span className="text-[9px] text-[#64748B] block">/ 10.0</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#080B11] rounded-full overflow-hidden border border-[#222F47]/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isStrong
                            ? 'bg-gradient-to-r from-[#00E676]/70 to-[#00E676]'
                            : isWeak
                            ? 'bg-gradient-to-r from-[#FF3366]/70 to-[#FF3366]'
                            : 'bg-gradient-to-r from-[#FFD700]/70 to-[#FFD700]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] text-[11px] text-[#94A3B8] flex items-center justify-between">
          <span>💡 Strategy: Always pair the strongest currency (Green) against the weakest (Red).</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#182033] hover:bg-[#222F47] text-white font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
