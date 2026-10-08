import React, { useState, useEffect } from 'react';
import { CurrencyStrengthItem, BestPairingRecommendation, PairStrengthItem } from '../types';
import { currencyStrengthService } from '../services/currencyStrengthService';
import { TelegramAlertService } from '../services/TelegramAlertService';
import {
  X,
  Gauge,
  TrendingUp,
  TrendingDown,
  Send,
  Check,
  RefreshCw,
  Sparkles,
  Minus
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPair?: (pairSymbol: string) => void;
}

type MeterFilterTab = 'ALL' | 'METALS_OIL' | 'FX' | 'PAIRS_30';

export const CurrencyStrengthModal: React.FC<Props> = ({ isOpen, onClose, onSelectPair }) => {
  const [strengths, setStrengths] = useState<CurrencyStrengthItem[]>([]);
  const [pairStrengths, setPairStrengths] = useState<PairStrengthItem[]>([]);
  const [pairings, setPairings] = useState<BestPairingRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<MeterFilterTab>('ALL');
  const [sentAlert, setSentAlert] = useState(false);

  const loadStrengthData = () => {
    setStrengths(currencyStrengthService.getCurrencyStrengths());
    setPairStrengths(currencyStrengthService.getAllPairStrengths());
    setPairings(currencyStrengthService.getBestPairings());
  };

  useEffect(() => {
    if (!isOpen) return;
    loadStrengthData();
    const timer = setInterval(loadStrengthData, 3000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredStrengths = strengths.filter(item => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'FX') return item.group === 'FX';
    if (activeTab === 'METALS_OIL') return item.group === 'METALS' || item.group === 'COMMODITIES';
    return true;
  });

  const handleSendToTelegram = async () => {
    if (strengths.length === 0) return;
    const topStrong = strengths[0];
    const topWeak = strengths[strengths.length - 1];

    const lines = strengths
      .slice(0, 12)
      .map(s => `${s.currency} (${s.group || 'FX'}): ${s.strength}/10 (${s.status.replace('_', ' ')})`)
      .join('\n');
    const msg =
      `📊 *LIVE MULTI-ASSET & CURRENCY STRENGTH METER*\n\n` +
      `🔥 *Strongest Asset:* ${topStrong.currency} (${topStrong.strength}/10)\n` +
      `❄️ *Weakest Currency:* ${topWeak.currency} (${topWeak.strength}/10)\n\n` +
      `📈 *Live Strength Ranking (Gold, Silver, FX & Macro):*\n${lines}\n\n` +
      `🎯 *Top Recommended Institutional Setup:*\n` +
      `👉 *${pairings[0]?.action || 'BUY'} ${pairings[0]?.pair || 'XAU/USD'}* (+${pairings[0]?.strengthDiff} pt spread)\n` +
      `💡 *Rationale:* ${pairings[0]?.confluenceReason || 'Dominant institutional order flow divergence.'}`;

    setSentAlert(true);
    await TelegramAlertService.sendAlert(msg, undefined, true);
    setTimeout(() => setSentAlert(false), 3000);
  };

  const getGroupBadge = (group?: CurrencyStrengthItem['group']) => {
    switch (group) {
      case 'METALS':
        return { label: 'METAL', cls: 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/40' };
      case 'COMMODITIES':
        return { label: 'ENERGY', cls: 'bg-[#FF9100]/20 text-[#FF9100] border-[#FF9100]/40' };
      default:
        return { label: 'FX MAJOR', cls: 'bg-[#2979FF]/20 text-[#2979FF] border-[#2979FF]/40' };
    }
  };

  const formatAssetPrice = (currency: string, price?: number) => {
    if (!price || price <= 0) return '';
    if (currency === 'XAU' || currency === 'XAG' || currency === 'USOIL' || currency === 'UKOIL') {
      return `$${price.toFixed(2)}`;
    }
    if (currency === 'JPY') {
      return price.toFixed(2);
    }
    return price.toFixed(4);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D111C] border border-[#222F47] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2979FF]/20 border border-[#2979FF]/40 flex items-center justify-center text-[#2979FF]">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wide">
                  Live Currency, Gold & Silver Strength Meter
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#FFD700]/20 border border-[#FFD700]/40 text-[#FFD700] text-[9.5px] font-bold">
                  GOLD • SILVER • 8 FX • 30 PAIRS
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Real-time institutional capital flow across Gold (XAU), Silver (XAG), 8 FX Majors & Energy Commodities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStrengthData}
              className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] rounded-lg transition-colors"
              title="Refresh Live Strength Scores"
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
                Top High-Confluence Institutional Pairings (Gold, Silver & FX)
              </span>
              <button
                onClick={handleSendToTelegram}
                className="px-2.5 py-1 rounded-lg bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/40 text-[#0088cc] text-[10px] font-bold flex items-center gap-1 transition-all"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {pairings.map((rec, i) => (
                <div
                  key={i}
                  onClick={() => onSelectPair && onSelectPair(rec.pair)}
                  className="bg-[#080B11] border border-[#222F47] hover:border-[#00E676]/50 rounded-lg p-2.5 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs text-white">{rec.pair}</span>
                      <span
                        className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${
                          rec.action === 'BUY'
                            ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                            : 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                        }`}
                      >
                        {rec.action}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono font-bold text-[#FFD700]">
                      +{rec.strengthDiff}p
                    </span>
                  </div>
                  <p className="text-[9.5px] text-[#94A3B8] mt-1 line-clamp-2">
                    {rec.confluenceReason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'ALL' as MeterFilterTab, label: `🌐 All Assets (${strengths.length})` },
              { id: 'METALS_OIL' as MeterFilterTab, label: '🥇 Gold, Silver & Oil (4)' },
              { id: 'FX' as MeterFilterTab, label: '💱 8 FX Currencies' },
              { id: 'PAIRS_30' as MeterFilterTab, label: `⚡ All ${pairStrengths.length} Tradable Pairs` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#2979FF] text-white border-[#2979FF] shadow-[0_0_12px_rgba(41,121,255,0.3)]'
                    : 'bg-[#101522] text-[#94A3B8] border-[#222F47] hover:text-[#F1F5F9] hover:bg-[#182033]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'PAIRS_30' ? (
            /* All 30 Tradable Pairs Matrix (Majors, 21 Crosses, Gold & Silver) */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                  All 30 Tradable Pairs Strength Divergence Matrix
                </h4>
                <span className="text-[10px] text-[#64748B] font-mono">
                  Click any pair to open chart & signal analysis
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {pairStrengths.map(ps => {
                  const isBuyBias = ps.bias.includes('BUY');
                  const isSellBias = ps.bias.includes('SELL');
                  const barPct = Math.min(100, Math.max(12, (ps.compositeScore / 10) * 100));

                  return (
                    <div
                      key={ps.pairSymbol}
                      onClick={() => onSelectPair && onSelectPair(ps.pairSymbol)}
                      className="bg-[#101522] border border-[#222F47] hover:border-[#2979FF]/60 rounded-xl p-2.5 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-[#F1F5F9]">
                            {ps.pairSymbol}
                          </span>
                          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-[#182033] text-[#94A3B8] border border-[#222F47]">
                            {ps.category}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                            isBuyBias
                              ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/40'
                              : isSellBias
                              ? 'bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/40'
                              : 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/40'
                          }`}
                        >
                          {ps.bias}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-mono mb-1.5">
                        <span>
                          {ps.baseAsset} ({ps.baseStrength}) vs {ps.quoteAsset} ({ps.quoteStrength})
                        </span>
                        <span className="text-[#F1F5F9] font-bold">
                          {ps.netStrengthDiff > 0 ? `+${ps.netStrengthDiff}` : ps.netStrengthDiff} pts
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-[#080B11] rounded-full overflow-hidden border border-[#222F47]/50">
                        <div
                          className={`h-full rounded-full ${
                            isBuyBias
                              ? 'bg-[#00E676]'
                              : isSellBias
                              ? 'bg-[#FF3366]'
                              : 'bg-[#FFD700]'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Individual Assets Strength Bars (Gold, Silver, FX, Oil, Indices, Crypto) */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                  Relative Strength Index (0.0 to 10.0) — {filteredStrengths.length} Assets
                </h4>
                <span className="text-[10px] text-[#64748B]">Sorted Strongest to Weakest</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredStrengths.map(item => {
                  const pct = (item.strength / 10) * 100;
                  const isStrong = item.strength >= 6.5;
                  const isWeak = item.strength <= 4.5;
                  const badge = getGroupBadge(item.group);
                  const priceLabel = formatAssetPrice(item.currency, item.livePrice);

                  return (
                    <div
                      key={item.currency}
                      onClick={() => item.pairSymbol && onSelectPair && onSelectPair(item.pairSymbol)}
                      className="bg-[#101522] border border-[#222F47] hover:border-[#2979FF]/50 rounded-xl p-2.5 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 h-8 rounded-lg border flex items-center justify-center font-mono font-black text-xs ${
                              item.currency === 'XAU'
                                ? 'bg-[#FFD700]/20 border-[#FFD700]/50 text-[#FFD700]'
                                : item.currency === 'XAG'
                                ? 'bg-[#CBD5E1]/20 border-[#CBD5E1]/50 text-[#F8FAFC]'
                                : 'bg-[#182033] border-[#222F47] text-white'
                            }`}
                          >
                            {item.currency}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#F1F5F9]">
                                {item.name || item.currency}
                              </span>
                              <span
                                className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9.5px] font-bold text-[#94A3B8]">
                                {item.status.replace('_', ' ')}
                              </span>
                              {priceLabel && (
                                <span className="text-[9.5px] font-mono text-[#CBD5E1]">
                                  • {priceLabel}
                                </span>
                              )}
                              <span
                                className={`text-[9.5px] font-mono font-bold flex items-center gap-0.5 ${
                                  item.change24h >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
                                }`}
                              >
                                {item.momentum === 'RISING' ? (
                                  <TrendingUp className="w-2.5 h-2.5" />
                                ) : item.momentum === 'FALLING' ? (
                                  <TrendingDown className="w-2.5 h-2.5" />
                                ) : (
                                  <Minus className="w-2.5 h-2.5" />
                                )}
                                {item.change24h >= 0 ? '+' : ''}
                                {item.change24h.toFixed(2)}%
                              </span>
                            </div>
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
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] text-[11px] text-[#94A3B8] flex items-center justify-between">
          <span>
            💡 Strategy: Pair the strongest assets (Gold, Silver, USD, GBP) against the weakest (JPY, NZD, CAD).
          </span>
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
