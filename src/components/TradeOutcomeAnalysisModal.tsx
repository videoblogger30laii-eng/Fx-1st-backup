import React, { useState } from 'react';
import { ForexSignal, Elev8Trade } from '../types';
import { generateTradeForensicAnalysis, TradeForensicAnalysis } from '../services/tradeOutcomeAnalysisEngine';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Compass,
  Zap,
  BookOpen,
  ArrowRight,
  Flame,
  Lightbulb,
  Copy,
  Check,
  SlidersHorizontal,
  Layers,
  Award,
  DollarSign
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tradeOrSignal: ForexSignal | Elev8Trade | null;
}

type TabType = 'ALL' | 'REASON' | 'RIGHT_WRONG' | 'LIFECYCLE' | 'PLAYBOOK';

export const TradeOutcomeAnalysisModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tradeOrSignal
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !tradeOrSignal) return null;

  const analysis: TradeForensicAnalysis = generateTradeForensicAnalysis(tradeOrSignal);
  const isWin = analysis.outcomeType === 'TP_HIT';

  const copyAnalysis = () => {
    const text = `🔍 FOREX TRADE POST-MORTEM & OUTCOME ANALYSIS 🔍
----------------------------------------
Instrument: ${analysis.symbol} (${analysis.orderType})
Strategy: ${analysis.strategyName} (${analysis.timeframe})
Outcome: ${analysis.outcomeTitle}
P&L: ${analysis.pips >= 0 ? `+${analysis.pips}` : analysis.pips} pips ($${analysis.realizedPnl.toFixed(2)})
Held Duration: ${analysis.durationFormatted} | Risk/Reward: ${analysis.riskReward}
Entry: ${analysis.entryPriceFormatted} | Exit: ${analysis.exitPriceFormatted} | SL: ${analysis.slPriceFormatted} | TP: ${analysis.tpPriceFormatted}

📌 PRIMARY CAUSE FOR ${isWin ? 'TP' : 'SL'} HIT:
${analysis.primaryReasonTitle}
${analysis.primaryReasonExplanation}

✅ WHAT WENT RIGHT:
${analysis.whatWentRight.map(r => `• ${r.title}: ${r.detail}`).join('\n')}

⚠️ WHAT WENT WRONG:
${analysis.whatWentWrong.map(w => `• ${w.title}: ${w.detail}`).join('\n')}

📘 KEY LESSONS & TAKEAWAYS:
${analysis.keyLessons.map(l => `• ${l.lessonTitle}: ${l.takeaway}`).join('\n')}

🎯 FUTURE PLAYBOOK:
${analysis.futureActionPlan.rules.map(p => `• ${p.rule}: ${p.practicalImplementation}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn text-left">
      <div className="bg-[#0B0F19] border border-[#222F47] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522] flex-wrap gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                isWin
                  ? 'bg-[#00E676]/20 border-[#00E676]/40 text-[#00E676]'
                  : 'bg-[#FF3366]/20 border-[#FF3366]/40 text-[#FF3366]'
              }`}
            >
              {isWin ? <Target className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-sm sm:text-base font-black text-[#F1F5F9]">
                  {analysis.symbol}
                </span>
                <span
                  className={`text-[9.5px] font-black px-1.5 py-0.5 rounded leading-none ${
                    analysis.orderType === 'BUY'
                      ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                      : 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                  }`}
                >
                  {analysis.orderType}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${analysis.badgeColor}`}
                >
                  {isWin ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>{isWin ? 'TAKE PROFIT HIT' : 'STOP LOSS HIT'}</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded border border-[#FFD700]/25">
                  {analysis.pips >= 0 ? `+${analysis.pips}p` : `${analysis.pips}p`} (${analysis.realizedPnl >= 0 ? `+$${analysis.realizedPnl.toFixed(2)}` : `-$${Math.abs(analysis.realizedPnl).toFixed(2)}`})
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                {analysis.strategyName} • {analysis.timeframe} Timeframe • {analysis.killzone} • Held {analysis.durationFormatted}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyAnalysis}
              className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] hover:text-[#F1F5F9] bg-[#182033] hover:bg-[#222F47] px-2.5 py-1.5 rounded-lg border border-[#222F47] transition-all cursor-pointer"
              title="Copy Trade Post-Mortem Audit to Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Audit'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-4 pt-2.5 pb-2 bg-[#0E1320] border-b border-[#222F47] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'Complete Post-Mortem', icon: Layers },
            { id: 'REASON', label: isWin ? 'Why Hit TP' : 'Why Hit SL', icon: Lightbulb },
            { id: 'RIGHT_WRONG', label: 'What Went Right / Wrong', icon: SlidersHorizontal },
            { id: 'LIFECYCLE', label: 'Timeline & Circumstances', icon: Clock },
            { id: 'PLAYBOOK', label: isWin ? 'Repeat This Setup' : 'Avoid This SL', icon: BookOpen }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2979FF] text-white shadow-sm'
                    : 'bg-[#141B2D] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1C263B] border border-[#222F47]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5 text-xs">
          {/* SECTION: 6-Metric Terminal Strip & SL-to-TP Timeline */}
          <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 divide-y sm:divide-y-0 sm:divide-x divide-[#222F47]/60 text-center font-mono">
              <div className="p-1">
                <span className="text-[9px] text-[#64748B] uppercase block font-bold">Entry Price</span>
                <span className="text-xs font-bold text-[#F1F5F9]">{analysis.entryPriceFormatted}</span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-[#64748B] uppercase block font-bold">Terminal Exit</span>
                <span className={`text-xs font-bold ${isWin ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                  {analysis.exitPriceFormatted}
                </span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-[#FF3366] uppercase block font-bold">Stop Loss</span>
                <span className="text-xs font-bold text-[#FF3366]">{analysis.slPriceFormatted}</span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-[#00E676] uppercase block font-bold">Take Profit</span>
                <span className="text-xs font-bold text-[#00E676]">{analysis.tpPriceFormatted}</span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-[#2979FF] uppercase block font-bold">Risk : Reward</span>
                <span className="text-xs font-bold text-[#2979FF]">{analysis.riskReward}</span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-[#FFD700] uppercase block font-bold">Confluence</span>
                <span className="text-xs font-bold text-[#FFD700]">{analysis.confluenceScore}%</span>
              </div>
            </div>

            {/* Visual SL vs Entry vs TP Spatial Timeline */}
            <div className="pt-2 border-t border-[#222F47]/60 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#FF3366] font-bold">🛑 SL ({analysis.slPriceFormatted})</span>
                <span className="text-[#F1F5F9] font-bold">📍 Entry ({analysis.entryPriceFormatted})</span>
                <span className="text-[#00E676] font-bold">🎯 TP ({analysis.tpPriceFormatted})</span>
              </div>
              <div className="relative h-2.5 bg-[#080B11] rounded-full overflow-hidden border border-[#222F47] flex items-center">
                {/* Risk zone */}
                <div
                  className={`h-full ${isWin ? 'w-1/3 bg-[#FF3366]/30' : 'w-1/3 bg-[#FF3366]'}`}
                  title="Stop Loss Risk Corridor"
                />
                {/* Entry marker */}
                <div
                  className="w-1.5 h-full bg-[#F1F5F9] shadow-[0_0_8px_#FFF] z-10"
                  title={`Entry Level: ${analysis.entryPriceFormatted}`}
                />
                {/* Reward zone */}
                <div
                  className={`h-full flex-1 ${isWin ? 'bg-[#00E676]' : 'bg-[#00E676]/30'}`}
                  title="Take Profit Expansion Target"
                />
              </div>
            </div>
          </div>

          {/* SECTION 1: PRIMARY ROOT CAUSE (Why it hit SL / Why it hit TP) */}
          {(activeTab === 'ALL' || activeTab === 'REASON') && (
            <div
              className={`rounded-xl p-4 border space-y-2.5 ${
                isWin
                  ? 'bg-[#00E676]/10 border-[#00E676]/30'
                  : 'bg-[#FF3366]/10 border-[#FF3366]/30'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {isWin ? (
                    <Award className="w-4 h-4 text-[#00E676]" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-[#FF3366]" />
                  )}
                  <h4 className="text-xs sm:text-sm font-black text-[#F1F5F9] uppercase tracking-wide">
                    {isWin ? 'Primary Success Factor (Why it Hit TP)' : 'Root Cause Breakdown (Why it Hit SL)'}
                  </h4>
                </div>
                <span
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                    isWin
                      ? 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/40'
                      : 'bg-[#FF3366]/20 text-[#FF3366] border-[#FF3366]/40'
                  }`}
                >
                  {analysis.primaryMechanismTag}
                </span>
              </div>

              <div className="font-bold text-xs text-[#F1F5F9]">
                {analysis.primaryReasonTitle}
              </div>

              <p className="text-[11.5px] text-[#CBD5E1] leading-relaxed">
                {analysis.primaryReasonExplanation}
              </p>

              {/* Anti-Loss Feedback Loop Confirmation */}
              {!isWin && (
                <div className="mt-3 p-3 rounded-xl bg-[#00E676]/10 border border-[#00E676]/40 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#00E676] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black text-[#00E676] uppercase tracking-wide">
                        ✨ Learned & Implemented in Future Trades
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#00E676]/20 text-[#00E676] text-[8.5px] font-bold">
                        ACTIVE IN SCANNER
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#CBD5E1] leading-relaxed">
                      This trade's mistake pattern (<strong>{analysis.primaryMechanismTag}</strong>) has been cataloged by the Adaptive Anti-Loss Engine. All future trade setups on <strong>{analysis.symbol}</strong> and <strong>{analysis.strategyName}</strong> now automatically enforce dynamic ATR buffers (+1.28x), H4/D1 EMA trend locks, and pre-sweep liquidity checks to eliminate repeat stop-outs.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: WHAT WENT RIGHT & WHAT WENT WRONG AUDIT */}
          {(activeTab === 'ALL' || activeTab === 'RIGHT_WRONG') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* What Went RIGHT */}
              <div className="bg-[#101522] border border-[#00E676]/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#00E676] uppercase tracking-wider pb-2 border-b border-[#222F47]">
                  <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                  <span>What Went RIGHT in this Trade</span>
                </div>
                <div className="space-y-2.5">
                  {analysis.whatWentRight.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-[11px] text-[#F1F5F9] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-[10.5px] text-[#94A3B8] pl-3 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* What Went WRONG / Areas of Vulnerability */}
              <div className="bg-[#101522] border border-[#FF3366]/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#FF3366] uppercase tracking-wider pb-2 border-b border-[#222F47]">
                  <AlertTriangle className="w-4 h-4 text-[#FF3366]" />
                  <span>{isWin ? 'Minor Flaws & Areas of Improvement' : 'What Went WRONG (The Flaws)'}</span>
                </div>
                <div className="space-y-2.5">
                  {analysis.whatWentWrong.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-[11px] text-[#F1F5F9] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3366] shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-[10.5px] text-[#94A3B8] pl-3 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CHRONOLOGICAL CIRCUMSTANCES (Entry to Exit Journey) */}
          {(activeTab === 'ALL' || activeTab === 'LIFECYCLE') && (
            <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#222F47]">
                <div className="flex items-center gap-2 text-xs font-black text-[#F1F5F9] uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-[#2979FF]" />
                  <span>Market Anatomy & Circumstances (Entry Level to Exit Level)</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">
                  Total Elapsed: {analysis.durationFormatted}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.circumstances.map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-[#080B11] border border-[#222F47] rounded-xl p-3 space-y-1.5 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold">
                      <span className="text-[#2979FF]">{c.phase}</span>
                      <span className="px-1.5 py-0.2 rounded bg-[#182033] text-[#94A3B8] border border-[#222F47]">
                        {c.marketState}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-[#F1F5F9]">
                      {c.stageTitle}
                    </div>

                    <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                      {c.priceActionDetail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: LESSONS & TACTICAL PLAYBOOK */}
          {(activeTab === 'ALL' || activeTab === 'PLAYBOOK') && (
            <div className="space-y-4">
              {/* Key Lessons Learned */}
              <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#FFD700] uppercase tracking-wider pb-2 border-b border-[#222F47]">
                  <Lightbulb className="w-4 h-4 text-[#FFD700]" />
                  <span>Crucial Lessons Learned from this Particular Trade</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {analysis.keyLessons.map((l, idx) => (
                    <div key={idx} className="bg-[#080B11] border border-[#222F47] rounded-xl p-3 space-y-1">
                      <div className="font-bold text-[11px] text-[#F1F5F9] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] shrink-0" />
                        <span>{l.lessonTitle}</span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] pl-3 leading-relaxed">
                        {l.takeaway}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Playbook: How to Avoid SL or How to Setup TP in Future */}
              <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#2979FF] uppercase tracking-wider pb-2 border-b border-[#222F47]">
                  <BookOpen className="w-4 h-4 text-[#2979FF]" />
                  <span>{analysis.futureActionPlan.sectionTitle}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.futureActionPlan.rules.map((r, idx) => (
                    <div key={idx} className="bg-[#080B11] border border-[#222F47] rounded-xl p-3 space-y-1">
                      <div className="font-bold text-[11px] text-[#F1F5F9]">
                        {r.rule}
                      </div>
                      <p className="text-[10.5px] text-[#94A3B8] leading-relaxed">
                        {r.practicalImplementation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profit Maximization & Pre-Trade Filter Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Maximize Future Profits */}
                <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-[#00E676] uppercase tracking-wider pb-2 border-b border-[#222F47]">
                    <DollarSign className="w-4 h-4 text-[#00E676]" />
                    <span>How to Maximize Profit in Future Trades</span>
                  </div>
                  <div className="space-y-2.5">
                    {analysis.profitMaximizationTips.map((tip, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-bold text-[11px] text-[#F1F5F9] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shrink-0" />
                          <span>{tip.tip}</span>
                        </div>
                        <p className="text-[10.5px] text-[#94A3B8] pl-3 leading-relaxed">
                          {tip.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-Trade Filter Checklist */}
                <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-[#FFD700] uppercase tracking-wider pb-2 border-b border-[#222F47]">
                    <ShieldCheck className="w-4 h-4 text-[#FFD700]" />
                    <span>How to Identify TP Trades vs Avoid SL Trades Ahead of Time</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.preTradeChecklist.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-2 p-2 rounded-lg bg-[#080B11] border border-[#222F47]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-[10.5px] text-[#F1F5F9] block">
                            {idx + 1}. {c.check}
                          </span>
                          <span className="text-[9.5px] text-[#94A3B8] block">
                            {c.standard}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-[#00E676] shrink-0 px-1.5 py-0.5 rounded bg-[#00E676]/10 border border-[#00E676]/30">
                          REQUIRED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] text-[#64748B] font-mono">
            Forex Institutional Post-Mortem Engine • Realized PnL ${analysis.realizedPnl.toFixed(2)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={copyAnalysis}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#94A3B8] hover:text-[#F1F5F9] bg-[#182033] hover:bg-[#222F47] border border-[#222F47] transition-all cursor-pointer"
            >
              {copied ? '✓ Copied to Clipboard' : 'Copy Full Analysis'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-[#080B11] bg-[#00E676] hover:bg-[#00E676]/90 transition-all cursor-pointer shadow-md"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
