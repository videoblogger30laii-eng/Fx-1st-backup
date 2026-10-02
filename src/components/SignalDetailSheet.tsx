import React, { useState, useEffect } from 'react';
import { ForexSignal } from '../types';
import {
  formatPrice,
  calculatePips,
  calculateSlPips,
  calculateLotSize,
  getFormattedCountdown,
  getFormattedTimeElapsed,
  getFormattedTotalValidity,
  getValidityProgress
} from '../services/marketData';
import { realPriceService } from '../services/RealPriceService';
import { getSignalDetailedAnalysis } from '../services/signalAnalysisEngine';
import { PersistenceManager } from '../services/persistence';
import {
  X,
  Copy,
  Check,
  Sparkles,
  FlaskConical,
  Bell,
  Star,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  BarChart3,
  Cpu,
  Globe2,
  SlidersHorizontal,
  Compass,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';

interface Props {
  signal: ForexSignal;
  onDismiss: () => void;
  onTestInBacktest: () => void;
  onToggleAlert: () => void;
  onToggleFavorite: () => void;
  onAskAi: (signal: ForexSignal) => void;
  onSetCustomAlert: (signal: ForexSignal) => void;
  onOpenElev8Order?: (signal: ForexSignal) => void;
  nowClockMs: number;
}

type DetailTab = 'LEVELS' | 'INDICATORS' | 'MACRO' | 'RISK';

export const SignalDetailSheet: React.FC<Props> = ({
  signal,
  onDismiss,
  onTestInBacktest,
  onToggleAlert,
  onToggleFavorite,
  onAskAi,
  onSetCustomAlert,
  onOpenElev8Order,
  nowClockMs
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('LEVELS');
  const [copiedMt4, setCopiedMt4] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  const slPips = calculateSlPips(signal);
  const countdown = getFormattedCountdown(signal, nowClockMs);
  const isPending = signal.status === 'PENDING' || signal.isPending;
  const isBuy = signal.type.startsWith('BUY');

  // Compute full institutional analysis
  const analysis = getSignalDetailedAnalysis(signal);

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

  const livePips = calculatePips(signal.pair, signal.entryPrice, livePrice, isBuy);
  const isProfit = livePips >= 0;

  const lot1k = calculateLotSize(signal, 1000, 1.0).toFixed(2);
  const lot5k = calculateLotSize(signal, 5000, 1.0).toFixed(2);
  const lot10k = calculateLotSize(signal, 10000, 1.0).toFixed(2);
  const lot50k = calculateLotSize(signal, 50000, 1.0).toFixed(2);

  const copyMt4 = () => {
    const elev8Config = PersistenceManager.getElev8Config();
    const suffix = elev8Config?.symbolSuffix || '';
    const cleanSym = signal.pair.symbol.replace('/', '') + suffix;
    const lotStr = elev8Config?.accountBalance
      ? ` | Lot: ${calculateLotSize(signal, elev8Config.accountBalance, elev8Config.riskPerTradePercent || 0.5).toFixed(2)}`
      : '';
    const text = `${signal.type} ${cleanSym}${lotStr} @ ${formatPrice(signal.pair, signal.entryPrice)} | SL: ${formatPrice(signal.pair, signal.stopLoss)} | TP1: ${formatPrice(signal.pair, signal.takeProfit1)}`;
    navigator.clipboard.writeText(text);
    setCopiedMt4(true);
    setTimeout(() => setCopiedMt4(false), 2000);
  };

  const copyTelegram = () => {
    const text = `⚡ INSTITUTIONAL FOREX SIGNAL ⚡
Instrument: ${signal.pair.symbol} (${signal.type})
Strategy: ${analysis.strategyModel}
Session: ${signal.killzone}
Tier: ${signal.quality} (${signal.confluenceScore}% Confluence)
--------------------------------
🎯 Entry: ${formatPrice(signal.pair, signal.entryPrice)}
🛑 Stop Loss: ${formatPrice(signal.pair, signal.stopLoss)} (${slPips} pips)
✅ Take Profit 1: ${formatPrice(signal.pair, signal.takeProfit1)}
✅ Take Profit 2: ${formatPrice(signal.pair, signal.takeProfit2)}
✅ Take Profit 3: ${formatPrice(signal.pair, signal.takeProfit3)}
📊 Risk/Reward: ${signal.riskReward}
--------------------------------
📍 Why Entry: ${analysis.entryReason}
🛡️ Why Stop Loss: ${analysis.stopLossReason}
🎯 Why Take Profit: ${analysis.takeProfitReason.replace(/\n/g, ' ')}
🏛️ Macro Catalyst: ${analysis.macroAnalysis.fundamentalCatalyst}`;
    navigator.clipboard.writeText(text);
    setCopiedTelegram(true);
    setTimeout(() => setCopiedTelegram(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-[#0B0F19] border border-[#222F47] rounded-t-2xl sm:rounded-2xl max-h-[94vh] w-full max-w-2xl overflow-y-auto shadow-2xl p-4 sm:p-6 text-left flex flex-col">
        {/* Header Row */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47]">
          <div>
            <div className="flex items-center flex-wrap gap-2">
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

              {/* Real-Time Live Price Chip */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-mono text-xs font-bold transition-all duration-300 ${
                  flashDir === 'up'
                    ? 'bg-[#00E676]/30 border-[#00E676] text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.25)]'
                    : flashDir === 'down'
                    ? 'bg-[#FF3366]/30 border-[#FF3366] text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)]'
                    : 'bg-[#182033] border-[#222F47] text-[#F8FAFC]'
                }`}
                title="Real-Time Deriv Live Tick"
              >
                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                <span>{formatPrice(signal.pair, livePrice)}</span>
                {flashDir === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-[#00E676]" />
                ) : flashDir === 'down' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-[#FF3366]" />
                ) : null}
              </div>

              <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/15 px-2 py-0.5 rounded border border-[#FFD700]/30">
                {signal.confluenceScore}% Confluence
              </span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">
              {signal.pair.name} • {signal.timeframe} Timeframe • {signal.killzone}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleAlert}
              className={`p-2 rounded-lg border ${
                signal.hasAlert ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]' : 'bg-[#182033] border-[#222F47] text-[#64748B]'
              }`}
              title="Toggle Price Alert"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg border ${
                signal.isFavorite ? 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]' : 'bg-[#182033] border-[#222F47] text-[#64748B]'
              }`}
              title="Add to Watchlist"
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

        {/* Strategy Title Banner */}
        <div className="my-2.5 p-2.5 bg-gradient-to-r from-[#182033] to-[#121927] rounded-xl border border-[#222F47] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#2979FF] shrink-0" />
            <div>
              <div className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">
                Strategy & Execution Model
              </div>
              <div className="text-xs font-black text-[#F1F5F9]">
                {analysis.strategyModel}
              </div>
            </div>
          </div>
          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-[#2979FF]/15 border border-[#2979FF]/40 text-[#2979FF] shrink-0">
            {analysis.smcParameters.pricingZone}
          </span>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 mb-3 bg-[#101522] p-1 rounded-xl border border-[#222F47]">
          <button
            onClick={() => setActiveTab('LEVELS')}
            className={`py-1.5 px-2 text-[10.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'LEVELS'
                ? 'bg-[#2979FF] text-white shadow-[0_0_10px_rgba(41,121,255,0.3)]'
                : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Why This Trade</span>
          </button>

          <button
            onClick={() => setActiveTab('INDICATORS')}
            className={`py-1.5 px-2 text-[10.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'INDICATORS'
                ? 'bg-[#2979FF] text-white shadow-[0_0_10px_rgba(41,121,255,0.3)]'
                : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>SMC & Indicators</span>
          </button>

          <button
            onClick={() => setActiveTab('MACRO')}
            className={`py-1.5 px-2 text-[10.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'MACRO'
                ? 'bg-[#2979FF] text-white shadow-[0_0_10px_rgba(41,121,255,0.3)]'
                : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Macro & Funda</span>
          </button>

          <button
            onClick={() => setActiveTab('RISK')}
            className={`py-1.5 px-2 text-[10.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'RISK'
                ? 'bg-[#2979FF] text-white shadow-[0_0_10px_rgba(41,121,255,0.3)]'
                : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Lot & Risk</span>
          </button>
        </div>

        {/* Tab 1: Trade Setup & Valid Reasons (Why Entry, SL, TP) */}
        {activeTab === 'LEVELS' && (
          <div className="space-y-3">
            {/* Execution Levels Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className={`p-2.5 rounded-lg border transition-colors ${
                flashDir === 'up'
                  ? 'bg-[#00E676]/15 border-[#00E676]/40'
                  : flashDir === 'down'
                  ? 'bg-[#FF3366]/15 border-[#FF3366]/40'
                  : 'bg-[#101522] border-[#222F47]'
              }`}>
                <span className="text-[9px] text-[#94A3B8] uppercase font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                  Live Price
                </span>
                <div className={`text-sm font-mono font-black ${
                  flashDir === 'up' ? 'text-[#00E676]' : flashDir === 'down' ? 'text-[#FF3366]' : 'text-[#F1F5F9]'
                }`}>
                  {formatPrice(signal.pair, livePrice)}
                </div>
                <div className={`text-[9px] font-semibold ${isProfit ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                  {isProfit ? `+${livePips} pips` : `${livePips} pips`}
                </div>
              </div>

              <div className="bg-[#101522] p-2.5 rounded-lg border border-[#222F47]">
                <span className="text-[9px] text-[#64748B] uppercase font-bold">Limit / Entry</span>
                <div className="text-sm font-mono font-bold text-[#F1F5F9]">{formatPrice(signal.pair, signal.entryPrice)}</div>
                <div className="text-[9px] text-[#64748B]">Order Level</div>
              </div>

              <div className="bg-[#101522] p-2.5 rounded-lg border border-[#222F47]">
                <span className="text-[9px] text-[#FF3366] uppercase font-bold">Stop Loss</span>
                <div className="text-sm font-mono font-bold text-[#FF3366]">{formatPrice(signal.pair, signal.stopLoss)}</div>
                <div className="text-[9px] text-[#64748B]">Risk: {slPips} pips</div>
              </div>

              <div className="bg-[#101522] p-2.5 rounded-lg border border-[#222F47]">
                <span className="text-[9px] text-[#00E676] uppercase font-bold">Take Profit 1</span>
                <div className="text-sm font-mono font-bold text-[#00E676]">{formatPrice(signal.pair, signal.takeProfit1)}</div>
                <div className="text-[9px] text-[#64748B]">Bank 50% lots</div>
              </div>

              <div className="bg-[#101522] p-2.5 rounded-lg border border-[#222F47]">
                <span className="text-[9px] text-[#2979FF] uppercase font-bold">Risk / Reward</span>
                <div className="text-sm font-mono font-bold text-[#2979FF]">{signal.riskReward}</div>
                <div className="text-[9px] text-[#64748B]">Target asymmetric</div>
              </div>
            </div>

            {/* Why Entry Level at this Point */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47] border-l-4 border-l-[#2979FF]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2979FF] uppercase mb-1">
                <Target className="w-4 h-4" />
                <span>1. Why Entry Level at {formatPrice(signal.pair, signal.entryPrice)}?</span>
              </div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                {analysis.entryReason}
              </p>
            </div>

            {/* Why Stop Loss at this Level */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47] border-l-4 border-l-[#FF3366]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF3366] uppercase mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>2. Why Stop Loss at {formatPrice(signal.pair, signal.stopLoss)} ({slPips} Pips)?</span>
              </div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                {analysis.stopLossReason}
              </p>
            </div>

            {/* Why Take Profit Targets */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47] border-l-4 border-l-[#00E676]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#00E676] uppercase mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>3. Why Take Profit 1, 2, 3 at These Levels?</span>
              </div>
              <div className="text-xs text-[#CBD5E1] leading-relaxed space-y-1 font-mono">
                {analysis.takeProfitReason.split('\n').map((line, i) => (
                  <div key={i} className="text-xs">{line}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SMC & Indicator Parameters */}
        {activeTab === 'INDICATORS' && (
          <div className="space-y-3">
            {/* Technical Indicators Matrix */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47]">
              <div className="text-[11px] font-bold text-[#FFD700] uppercase mb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>Quantitative & Technical Indicator Parameters</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <span className="font-bold text-[#2979FF]">EMA Multi-Timeframe Alignment: </span>
                  <span className="text-[#CBD5E1]">{analysis.indicatorAnalysis.emaAlignment}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <span className="font-bold text-[#00E676]">RSI(14) Momentum & Divergence: </span>
                  <span className="text-[#CBD5E1]">{analysis.indicatorAnalysis.rsiReading}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <span className="font-bold text-[#FFD700]">14-Period ATR & Broker Spread: </span>
                  <span className="text-[#CBD5E1]">{analysis.indicatorAnalysis.atrVolatility}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <span className="font-bold text-[#A855F7]">Candlestick Displacement: </span>
                  <span className="text-[#CBD5E1]">{analysis.indicatorAnalysis.displacement}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <span className="font-bold text-[#00E676]">Volume Profile & POC: </span>
                  <span className="text-[#CBD5E1]">{analysis.indicatorAnalysis.volumeProfile}</span>
                </div>
              </div>
            </div>

            {/* Smart Money Concepts (SMC) Architecture */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47]">
              <div className="text-[11px] font-bold text-[#2979FF] uppercase mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Smart Money Concepts (SMC) Structural Mapping</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <div className="text-[9px] text-[#94A3B8] font-bold uppercase">Order Block (OB) Zone</div>
                  <div className="font-bold text-[#F1F5F9] mt-0.5">{analysis.smcParameters.orderBlockZone}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <div className="text-[9px] text-[#94A3B8] font-bold uppercase">Fair Value Gap (FVG)</div>
                  <div className="font-bold text-[#F1F5F9] mt-0.5">{analysis.smcParameters.fvgImbalance}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <div className="text-[9px] text-[#94A3B8] font-bold uppercase">Structure Shift / ChoCH</div>
                  <div className="font-bold text-[#00E676] mt-0.5">{analysis.smcParameters.structureShift}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <div className="text-[9px] text-[#94A3B8] font-bold uppercase">Liquidity Target (BSL/SSL)</div>
                  <div className="font-bold text-[#FFD700] mt-0.5">{analysis.smcParameters.liquidityTarget}</div>
                </div>
              </div>
            </div>

            {/* Confluence Verification Checklist */}
            {signal.checklist.length > 0 && (
              <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47]">
                <div className="text-[11px] text-[#00E676] uppercase font-bold mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Confluence Checklist ({signal.confluenceScore}% Score)</span>
                </div>
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
          </div>
        )}

        {/* Tab 3: Macro & Fundamental Analysis */}
        {activeTab === 'MACRO' && (
          <div className="space-y-3">
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47]">
              <div className="text-[11px] font-bold text-[#2979FF] uppercase mb-2 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" />
                <span>Macroeconomic Drivers & Fundamental Catalyst</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <div className="text-[9.5px] text-[#2979FF] font-bold uppercase mb-0.5">
                    Central Bank Policy Stance & Monetary Flow
                  </div>
                  <p className="text-[#CBD5E1] leading-relaxed">
                    {analysis.macroAnalysis.fundamentalCatalyst}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <div className="text-[9.5px] text-[#00E676] font-bold uppercase mb-0.5">
                    US Dollar Index (DXY) Correlation
                  </div>
                  <p className="text-[#CBD5E1] leading-relaxed">
                    {analysis.macroAnalysis.dxyBias}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <div className="text-[9.5px] text-[#FFD700] font-bold uppercase mb-0.5">
                    Sovereign Bond Yield Differentials
                  </div>
                  <p className="text-[#CBD5E1] leading-relaxed">
                    {analysis.macroAnalysis.rateDifferential}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080B11] border border-[#222F47]/60">
                  <div className="text-[9.5px] text-[#A855F7] font-bold uppercase mb-0.5">
                    Economic Calendar Risk Window
                  </div>
                  <p className="text-[#CBD5E1] leading-relaxed">
                    {analysis.macroAnalysis.economicCalendar}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Killzone Analysis */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47]">
              <div className="text-[11px] font-bold text-[#FFD700] uppercase mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Interbank Session Timing & Killzone</span>
              </div>
              <div className="text-xs text-[#CBD5E1] leading-relaxed">
                Triggered during <strong className="text-[#F1F5F9]">{signal.killzone}</strong>. Institutional order flow algorithms execute bulk block orders during London and New York overlaps, providing peak volatility and minimal slippage.
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Lot Sizing & Risk Management */}
        {activeTab === 'RISK' && (
          <div className="space-y-3">
            {/* Prop Firm & Retail Mathematical Lot Sizing */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47]">
              <div className="text-[11px] text-[#00E676] uppercase font-bold mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Mathematical Lot Sizing (Strict 1% Risk Allocation)</span>
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

            {/* Setup Invalidation (Pending) or Stop Loss Protection (Running) */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47]">
              <div className="text-[11px] font-bold text-[#FF3366] uppercase mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isPending ? 'Setup Invalidation & Risk Trigger' : 'Stop Loss Protection'}</span>
              </div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                {isPending
                  ? (signal.invalidationTrigger || `Setup immediately invalidates if price registers a sustained candle close beyond ${formatPrice(signal.pair, signal.stopLoss)}.`)
                  : `Position is protected with Stop Loss at ${formatPrice(signal.pair, signal.stopLoss)}. Running position remains active until TP or SL is triggered.`
                }
              </p>
              <div className="mt-2.5 text-[10px] text-[#F1F5F9] font-mono bg-[#182033] p-2.5 rounded-lg border border-[#222F47] space-y-1.5">
                {isPending ? (
                  <>
                    <div className="flex items-center justify-between text-[#FFD700] font-bold">
                      <span>Pending Order Entry Window:</span>
                      <span>{getFormattedTotalValidity(signal)} ({signal.timeframe})</span>
                    </div>
                    <div className="flex items-center justify-between text-[#94A3B8]">
                      <span>Time Posted / Age:</span>
                      <span className="text-[#2979FF] font-semibold">{getFormattedTimeElapsed(signal, nowClockMs)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#94A3B8]">
                      <span>Entry Timeout Countdown:</span>
                      <span className="text-[#FFD700] font-bold">{countdown}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#101522] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#FFD700] rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, getValidityProgress(signal, nowClockMs) * 100))}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[#00E676] font-bold">
                      <span>Active Trade Status:</span>
                      <span>🟢 LIVE POSITION</span>
                    </div>
                    <div className="flex items-center justify-between text-[#94A3B8]">
                      <span>TP1 Target Progress:</span>
                      <span className="text-[#00E676] font-bold">
                        {Math.round((signal.pips > 0 ? signal.pips : 0) / Math.max(1, Math.abs(signal.takeProfit1 - signal.entryPrice) * (signal.pair.pipDigits === 2 ? 100 : 10000)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#101522] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#00E676] rounded-full"
                        style={{ width: `${Math.max(5, Math.min(100, Math.max(0, signal.pips) / Math.max(1, Math.abs(signal.takeProfit1 - signal.entryPrice) * (signal.pair.pipDigits === 2 ? 100 : 10000)) * 100))}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Elev8 MT5 Order Bar */}
        {onOpenElev8Order && (
          <button
            onClick={() => onOpenElev8Order(signal)}
            className="w-full mt-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2979FF]/20 via-[#00E676]/20 to-[#2979FF]/20 hover:from-[#2979FF]/30 hover:to-[#00E676]/30 border border-[#00E676]/40 text-[#F1F5F9] font-black text-xs flex items-center justify-between transition-all shadow-[0_0_15px_rgba(0,230,118,0.15)] group"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#00E676] group-hover:scale-110 transition-transform" />
              <span className="text-sm">⚡ Elev8 MT5 Order Execution Ticket</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#00E676]">
              <span>Choose Risk % & Lots</span>
              <span>➔</span>
            </div>
          </button>
        )}

        {/* Action Buttons Footer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-[#222F47]">
          <button
            onClick={copyMt4}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] font-bold text-xs rounded-xl border border-[#222F47] transition-colors"
          >
            {copiedMt4 ? <Check className="w-4 h-4 text-[#00E676]" /> : <Copy className="w-4 h-4 text-[#94A3B8]" />}
            <span>{copiedMt4 ? 'Copied Order' : 'Copy MT4 / MT5'}</span>
          </button>

          <button
            onClick={copyTelegram}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] font-bold text-xs rounded-xl border border-[#222F47] transition-colors"
          >
            {copiedTelegram ? <Check className="w-4 h-4 text-[#00E676]" /> : <Copy className="w-4 h-4 text-[#94A3B8]" />}
            <span>{copiedTelegram ? 'Copied Telegram' : 'Copy Full Analysis'}</span>
          </button>

          <button
            onClick={() => onAskAi(signal)}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#2979FF]/20 hover:bg-[#2979FF]/30 text-[#2979FF] font-bold text-xs rounded-xl border border-[#2979FF]/40 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Copilot Audit</span>
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
