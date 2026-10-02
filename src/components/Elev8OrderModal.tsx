import React, { useState, useEffect, useMemo } from 'react';
import { ForexSignal, Elev8AccountConfig, Elev8Trade } from '../types';
import { formatPrice, calculateDollarPnl, calculateSlPips } from '../services/marketData';
import { realPriceService } from '../services/RealPriceService';
import { Elev8ExecutionService } from '../services/elev8ExecutionService';
import {
  X,
  Zap,
  Check,
  Copy,
  ShieldAlert,
  Target,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Percent,
  Sliders,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Clock,
  Layers
} from 'lucide-react';

interface Props {
  signal: ForexSignal;
  config: Elev8AccountConfig;
  isOpen: boolean;
  onClose: () => void;
  onExecuteTrade: (trade: Elev8Trade) => void;
  onOpenElev8Dashboard: () => void;
}

export const Elev8OrderModal: React.FC<Props> = ({
  signal,
  config,
  isOpen,
  onClose,
  onExecuteTrade,
  onOpenElev8Dashboard
}) => {
  const isBuy = signal.type.startsWith('BUY');
  const symbolWithSuffix = signal.pair.symbol.replace('/', '') + (config.symbolSuffix || '');
  const balance = config.accountBalance || 50000;

  // Order Parameters State (editable)
  const [orderType, setOrderType] = useState<string>(signal.type);
  const [entryPrice, setEntryPrice] = useState<number>(signal.entryPrice);
  const [stopLoss, setStopLoss] = useState<number>(signal.stopLoss);
  const [takeProfit1, setTakeProfit1] = useState<number>(signal.takeProfit1);
  const [takeProfit2, setTakeProfit2] = useState<number>(signal.takeProfit2);
  const [takeProfit3, setTakeProfit3] = useState<number>(signal.takeProfit3);

  // Sizing mode: 'RISK_PERCENT' | 'MANUAL_LOTS'
  const [sizingMode, setSizingMode] = useState<'RISK_PERCENT' | 'MANUAL_LOTS'>('RISK_PERCENT');
  const [riskPercent, setRiskPercent] = useState<number>(config.riskPerTradePercent || 0.5);
  const [manualLots, setManualLots] = useState<number>(1.0);

  // Real-time live price hook
  const [livePrice, setLivePrice] = useState<number>(() => {
    const cur = realPriceService.getPrice(signal.pair.symbol);
    return cur > 0 ? cur : signal.currentPrice;
  });

  const [copiedMobile, setCopiedMobile] = useState(false);
  const [executedSuccess, setExecutedSuccess] = useState(false);

  useEffect(() => {
    const cur = realPriceService.getPrice(signal.pair.symbol);
    if (cur > 0) setLivePrice(cur);

    const unsub = realPriceService.onPrice((tick) => {
      if (tick.symbol === signal.pair.symbol && tick.price > 0) {
        setLivePrice(tick.price);
      }
    });
    return () => unsub();
  }, [signal.pair.symbol]);

  // Price step for inputs
  const priceStep = signal.pair.isGoldOrCrypto
    ? 0.1
    : signal.pair.symbol.includes('JPY')
    ? 0.01
    : signal.pair.symbol.includes('US30')
    ? 1.0
    : 0.0001;

  // Calculate SL distance
  const slDist = Math.abs(entryPrice - stopLoss);
  const isOrderBuy = orderType.startsWith('BUY');

  // Compute active lot size based on mode
  const calculatedLots = useMemo(() => {
    if (sizingMode === 'MANUAL_LOTS') {
      return Math.max(0.01, manualLots);
    }
    // Calculate lots from risk %
    const riskDollars = balance * (riskPercent / 100);
    if (slDist <= 0) return 0.01;

    let lots = 0.01;
    if (signal.pair.symbol.includes('XAU') || signal.pair.symbol.includes('GOLD')) {
      // 100 oz per lot
      lots = riskDollars / (slDist * 100.0);
    } else if (signal.pair.symbol.includes('US30')) {
      lots = riskDollars / (slDist * 1.0);
    } else {
      const isJpy = signal.pair.symbol.includes('JPY');
      const pipDist = slDist / (isJpy ? 0.01 : 0.0001);
      const pipValuePerLot = isJpy && entryPrice > 0 ? (1000.0 / entryPrice) : 10.0;
      lots = riskDollars / (pipDist * pipValuePerLot);
    }
    return Math.max(0.01, Math.min(50.0, Math.round(lots * 100) / 100));
  }, [sizingMode, manualLots, riskPercent, balance, slDist, signal.pair.symbol, entryPrice]);

  // Compute projected Dollar Gain / Loss for SL, TP1, TP2, TP3
  const slMetrics = useMemo(() => {
    const res = calculateDollarPnl(signal.pair, entryPrice, stopLoss, calculatedLots, isOrderBuy);
    const lossDollars = Math.abs(res.dollarPnl);
    const lossPercent = (lossDollars / balance) * 100;
    return {
      lossDollars,
      lossPercent,
      pips: Math.abs(res.pips)
    };
  }, [signal.pair, entryPrice, stopLoss, calculatedLots, isOrderBuy, balance]);

  const tp1Metrics = useMemo(() => {
    const res = calculateDollarPnl(signal.pair, entryPrice, takeProfit1, calculatedLots, isOrderBuy);
    const gainDollars = Math.max(0, res.dollarPnl);
    const gainPercent = (gainDollars / balance) * 100;
    const rr = slMetrics.lossDollars > 0 ? (gainDollars / slMetrics.lossDollars).toFixed(2) : '1:3.0';
    return {
      gainDollars,
      gainPercent,
      pips: Math.abs(res.pips),
      rr
    };
  }, [signal.pair, entryPrice, takeProfit1, calculatedLots, isOrderBuy, balance, slMetrics.lossDollars]);

  const tp2Metrics = useMemo(() => {
    const res = calculateDollarPnl(signal.pair, entryPrice, takeProfit2, calculatedLots, isOrderBuy);
    const gainDollars = Math.max(0, res.dollarPnl);
    const gainPercent = (gainDollars / balance) * 100;
    const rr = slMetrics.lossDollars > 0 ? (gainDollars / slMetrics.lossDollars).toFixed(2) : '1:5.0';
    return {
      gainDollars,
      gainPercent,
      pips: Math.abs(res.pips),
      rr
    };
  }, [signal.pair, entryPrice, takeProfit2, calculatedLots, isOrderBuy, balance, slMetrics.lossDollars]);

  const tp3Metrics = useMemo(() => {
    const res = calculateDollarPnl(signal.pair, entryPrice, takeProfit3, calculatedLots, isOrderBuy);
    const gainDollars = Math.max(0, res.dollarPnl);
    const gainPercent = (gainDollars / balance) * 100;
    const rr = slMetrics.lossDollars > 0 ? (gainDollars / slMetrics.lossDollars).toFixed(2) : '1:8.0';
    return {
      gainDollars,
      gainPercent,
      pips: Math.abs(res.pips),
      rr
    };
  }, [signal.pair, entryPrice, takeProfit3, calculatedLots, isOrderBuy, balance, slMetrics.lossDollars]);

  if (!isOpen) return null;

  // Format order for mobile MT5
  const mobileCommand = `${symbolWithSuffix} ${orderType.replace('_', ' ')} ${calculatedLots.toFixed(2)} Lots\n` +
    `Entry: ${formatPrice(signal.pair, entryPrice)}\n` +
    `SL: ${formatPrice(signal.pair, stopLoss)}\n` +
    `TP1: ${formatPrice(signal.pair, takeProfit1)}\n` +
    `TP2: ${formatPrice(signal.pair, takeProfit2)}`;

  const [isExecutingWebhook, setIsExecutingWebhook] = useState(false);
  const [bridgeMessage, setBridgeMessage] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const copySingleValue = (val: string | number, label: string) => {
    navigator.clipboard.writeText(String(val));
    setCopiedValue(label);
    setTimeout(() => setCopiedValue(null), 1800);
  };

  const handleCopyMobile = () => {
    navigator.clipboard.writeText(mobileCommand);
    setCopiedMobile(true);
    setTimeout(() => setCopiedMobile(false), 2000);
  };

  const handleOpenInMt5Mobile = () => {
    navigator.clipboard.writeText(mobileCommand);
    setCopiedMobile(true);
    setTimeout(() => setCopiedMobile(false), 2000);

    // Deep link protocol for MetaTrader 5 Mobile (iOS & Android)
    const cleanSym = symbolWithSuffix.replace('/', '');
    const mt5DeepLink = `metatrader5://trade?symbol=${encodeURIComponent(cleanSym)}`;
    window.location.href = mt5DeepLink;
  };

  const handleExecute = async () => {
    setIsExecutingWebhook(true);
    setBridgeMessage(null);

    const trade: Elev8Trade = {
      id: 'ELEV8-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      signalId: signal.id,
      symbol: symbolWithSuffix,
      orderType,
      lots: calculatedLots,
      entryPrice,
      currentPrice: livePrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      status: 'OPEN',
      realizedPnl: 0,
      floatingPnl: 0,
      pips: 0,
      slRiskDollars: slMetrics.lossDollars,
      tp1GainDollars: tp1Metrics.gainDollars,
      tp2GainDollars: tp2Metrics.gainDollars,
      tp3GainDollars: tp3Metrics.gainDollars,
      openedAt: Date.now()
    };

    // Execute via Service (supports Webhook Bridge, MetaApi Cloud, or Simulation)
    const result = await Elev8ExecutionService.executeTrade(trade, config);

    onExecuteTrade(trade);
    setIsExecutingWebhook(false);
    setBridgeMessage(result.message);
    setExecutedSuccess(true);
    setTimeout(() => {
      setExecutedSuccess(false);
      onClose();
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-xs p-0 sm:p-4 text-left animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-[#0B0F19] border border-[#222F47] rounded-t-2xl sm:rounded-2xl max-w-xl w-full max-h-[94vh] overflow-y-auto p-4 sm:p-5 shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47] mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              isOrderBuy ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40' : 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
            }`}>
              {isOrderBuy ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-[#F1F5F9]">{symbolWithSuffix}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isOrderBuy ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-[#FF3366]/20 text-[#FF3366]'
                }`}>
                  {orderType.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono text-[#94A3B8]">
                  Live: <strong className="text-[#FFD700]">{formatPrice(signal.pair, livePrice)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] mt-0.5">
                <span>Elev8 Server: <strong className="text-[#2979FF]">{config.server || 'Elev8Markets-Live'}</strong></span>
                <span>• Balance: <strong className="text-[#00E676]">${balance.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Type Buttons */}
        <div className="mb-3">
          <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">
            Order Execution Type
          </label>
          <div className="grid grid-cols-4 gap-1.5 bg-[#101522] p-1 rounded-xl border border-[#222F47]">
            {['BUY_MARKET', 'SELL_MARKET', 'BUY_LIMIT', 'SELL_LIMIT'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-all ${
                  orderType === t
                    ? t.startsWith('BUY')
                      ? 'bg-[#00E676] text-[#080B11] shadow'
                      : 'bg-[#FF3366] text-white shadow'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Price Inputs: Entry, SL, TP1, TP2, TP3 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {/* Entry */}
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-0.5">
              Entry Price
            </label>
            <input
              type="number"
              step={priceStep}
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#182033] border border-[#222F47] rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#F1F5F9] focus:outline-none focus:border-[#2979FF]"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="text-[10px] font-bold text-[#FF3366] uppercase block mb-0.5">
              Stop Loss (SL)
            </label>
            <input
              type="number"
              step={priceStep}
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#182033] border border-[#FF3366]/40 rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#FF3366] focus:outline-none focus:border-[#FF3366]"
            />
          </div>

          {/* TP1 */}
          <div>
            <label className="text-[10px] font-bold text-[#00E676] uppercase block mb-0.5">
              Take Profit 1
            </label>
            <input
              type="number"
              step={priceStep}
              value={takeProfit1}
              onChange={(e) => setTakeProfit1(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#182033] border border-[#00E676]/40 rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#00E676] focus:outline-none focus:border-[#00E676]"
            />
          </div>

          {/* TP2 */}
          <div>
            <label className="text-[10px] font-bold text-[#00E676]/80 uppercase block mb-0.5">
              Take Profit 2
            </label>
            <input
              type="number"
              step={priceStep}
              value={takeProfit2}
              onChange={(e) => setTakeProfit2(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#182033] border border-[#222F47] rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#00E676]/90 focus:outline-none focus:border-[#00E676]"
            />
          </div>

          {/* TP3 */}
          <div>
            <label className="text-[10px] font-bold text-[#00E676]/60 uppercase block mb-0.5">
              Take Profit 3 (Runner)
            </label>
            <input
              type="number"
              step={priceStep}
              value={takeProfit3}
              onChange={(e) => setTakeProfit3(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#182033] border border-[#222F47] rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#00E676]/80 focus:outline-none focus:border-[#00E676]"
            />
          </div>

          {/* Computed Lots badge */}
          <div className="bg-[#101522] border border-[#222F47] rounded-xl p-1.5 flex flex-col justify-center">
            <span className="text-[9px] text-[#94A3B8] font-bold uppercase">Calculated Position</span>
            <span className="text-xs font-mono font-black text-[#FFD700]">
              {calculatedLots.toFixed(2)} Lots
            </span>
          </div>
        </div>

        {/* Sizing Mode Toggle & Controls */}
        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#2979FF]" />
              <span>Choose Risk % or Manual Lots:</span>
            </span>
            <div className="flex bg-[#182033] p-0.5 rounded-lg border border-[#222F47] text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setSizingMode('RISK_PERCENT')}
                className={`px-2 py-0.5 rounded transition-all ${
                  sizingMode === 'RISK_PERCENT' ? 'bg-[#2979FF] text-white shadow' : 'text-[#94A3B8]'
                }`}
              >
                Risk %
              </button>
              <button
                type="button"
                onClick={() => setSizingMode('MANUAL_LOTS')}
                className={`px-2 py-0.5 rounded transition-all ${
                  sizingMode === 'MANUAL_LOTS' ? 'bg-[#2979FF] text-white shadow' : 'text-[#94A3B8]'
                }`}
              >
                Manual Lots
              </button>
            </div>
          </div>

          {sizingMode === 'RISK_PERCENT' ? (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                {[0.25, 0.5, 1.0, 2.0].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRiskPercent(r)}
                    className={`flex-1 py-1 text-xs font-bold font-mono rounded-lg border transition-all ${
                      riskPercent === r
                        ? 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]'
                        : 'bg-[#182033] text-[#94A3B8] border-[#222F47]'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
                <span>Risk Allocation:</span>
                <span className="text-[#F1F5F9]">
                  <strong className="text-[#FFD700]">${slMetrics.lossDollars.toFixed(2)}</strong> ({riskPercent}% of ${balance.toLocaleString()}) ➔ <strong className="text-[#00E676]">{calculatedLots.toFixed(2)} Lots</strong>
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                {[0.10, 0.50, 1.00, 2.00, 5.00].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setManualLots(l)}
                    className={`flex-1 py-1 text-xs font-bold font-mono rounded-lg border transition-all ${
                      manualLots === l
                        ? 'bg-[#2979FF]/20 text-[#2979FF] border-[#2979FF]'
                        : 'bg-[#182033] text-[#94A3B8] border-[#222F47]'
                    }`}
                  >
                    {l.toFixed(2)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#94A3B8]">Custom Lots:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={manualLots}
                  onChange={(e) => setManualLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                  className="w-24 bg-[#182033] border border-[#222F47] rounded-lg py-1 px-2 text-xs font-mono font-bold text-[#FFD700] focus:outline-none focus:border-[#2979FF]"
                />
                <span className="text-[11px] font-mono text-[#94A3B8] ml-auto">
                  Risk: <strong className="text-[#FF3366]">${slMetrics.lossDollars.toFixed(2)}</strong> ({slMetrics.lossPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic P&L Projection Matrix (Loss if SL hit, Gain if TP1/TP2/TP3 hit) */}
        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 mb-3">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Projected P&L Matrix ({calculatedLots.toFixed(2)} Lots)</span>
            <span className="text-[9px] text-[#00E676] font-mono">100% Mathematically Calculated</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
            {/* STOP LOSS */}
            <div className="bg-[#182033] border border-[#FF3366]/30 p-2 rounded-xl">
              <span className="text-[9px] text-[#FF3366] font-bold block">🛑 IF SL HIT</span>
              <span className="text-xs font-black text-[#FF3366] mt-0.5 block">
                -${slMetrics.lossDollars.toFixed(2)}
              </span>
              <span className="text-[9px] text-[#94A3B8] block mt-0.5">
                -{slMetrics.lossPercent.toFixed(2)}%
              </span>
              <span className="text-[8px] text-[#64748B] block mt-0.5">
                -{slMetrics.pips.toFixed(1)}p
              </span>
            </div>

            {/* TP1 */}
            <div className="bg-[#182033] border border-[#00E676]/30 p-2 rounded-xl">
              <span className="text-[9px] text-[#00E676] font-bold block">🎯 IF TP1 HIT</span>
              <span className="text-xs font-black text-[#00E676] mt-0.5 block">
                +${tp1Metrics.gainDollars.toFixed(2)}
              </span>
              <span className="text-[9px] text-[#00E676]/80 block mt-0.5">
                +{tp1Metrics.gainPercent.toFixed(2)}%
              </span>
              <span className="text-[8px] text-[#FFD700] block mt-0.5">
                R:R {tp1Metrics.rr}
              </span>
            </div>

            {/* TP2 */}
            <div className="bg-[#182033] border border-[#00E676]/30 p-2 rounded-xl">
              <span className="text-[9px] text-[#00E676] font-bold block">🎯 IF TP2 HIT</span>
              <span className="text-xs font-black text-[#00E676] mt-0.5 block">
                +${tp2Metrics.gainDollars.toFixed(2)}
              </span>
              <span className="text-[9px] text-[#00E676]/80 block mt-0.5">
                +{tp2Metrics.gainPercent.toFixed(2)}%
              </span>
              <span className="text-[8px] text-[#FFD700] block mt-0.5">
                R:R {tp2Metrics.rr}
              </span>
            </div>

            {/* TP3 */}
            <div className="bg-[#182033] border border-[#00E676]/30 p-2 rounded-xl">
              <span className="text-[9px] text-[#00E676] font-bold block">🎯 IF TP3 HIT</span>
              <span className="text-xs font-black text-[#00E676] mt-0.5 block">
                +${tp3Metrics.gainDollars.toFixed(2)}
              </span>
              <span className="text-[9px] text-[#00E676]/80 block mt-0.5">
                +{tp3Metrics.gainPercent.toFixed(2)}%
              </span>
              <span className="text-[8px] text-[#FFD700] block mt-0.5">
                R:R {tp3Metrics.rr}
              </span>
            </div>
          </div>

          {/* Elev8 Prop Firm Safety Assessment */}
          <div className="mt-2.5 pt-2 border-t border-[#222F47] flex items-center justify-between text-[10px]">
            <span className="text-[#94A3B8] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
              <span>Elev8 4% Daily Drawdown Limit:</span>
            </span>
            <span className={`font-mono font-bold ${
              slMetrics.lossPercent <= 4.0 ? 'text-[#00E676]' : 'text-[#FF3366]'
            }`}>
              ${slMetrics.lossDollars.toFixed(2)} / ${(balance * 0.04).toFixed(0)} ({slMetrics.lossPercent <= 4.0 ? 'SAFE' : 'EXCEEDS LIMIT'})
            </span>
          </div>
        </div>

        {/* Execution Mode Banner */}
        <div className="bg-[#101522] border border-[#222F47] rounded-xl p-2.5 mb-3 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              config.executionMode === 'METAAPI_CLOUD' || config.executionMode === 'WEBHOOK_BRIDGE'
                ? 'bg-[#00E676] animate-pulse'
                : 'bg-[#FFD700]'
            }`} />
            <span className="text-[#F1F5F9] font-medium">
              {config.executionMode === 'METAAPI_CLOUD' ? (
                <>Real MT5: <strong className="text-[#00E676]">MetaApi Cloud Live</strong> (Fires directly to Elev8)</>
              ) : config.executionMode === 'WEBHOOK_BRIDGE' ? (
                <>Real MT5: <strong className="text-[#00E676]">Webhook Bridge Active</strong> (Syncs with Mobile)</>
              ) : (
                <>Mode: <strong className="text-[#FFD700]">Practice Simulation</strong> (Tap right to link Real MT5)</>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenElev8Dashboard();
            }}
            className="text-[10px] text-[#2979FF] hover:underline font-bold shrink-0 ml-2"
          >
            {config.executionMode === 'SIMULATED' ? 'Connect Real MT5 ➔' : 'Change Mode'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mt-auto">
          {executedSuccess ? (
            <div className="p-3 bg-[#00E676]/20 border border-[#00E676] rounded-xl text-center text-xs font-bold text-[#00E676] flex items-center justify-center gap-2">
              <Check className="w-5 h-5 shrink-0" />
              <span>{bridgeMessage || 'Trade Executed & Saved to Elev8 Trade History!'}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Open in MT5 Mobile App Directly */}
                <button
                  type="button"
                  onClick={handleOpenInMt5Mobile}
                  className="py-2.5 px-3 bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] font-bold text-xs rounded-xl border border-[#2979FF]/40 hover:border-[#2979FF] transition-all flex items-center justify-center gap-1.5 shadow"
                  title="Opens MetaTrader 5 Mobile app on your phone and copies parameters"
                >
                  <Smartphone className="w-4 h-4 text-[#2979FF]" />
                  <span>{copiedMobile ? 'Copied & Opening MT5...' : '📱 Open MT5 Mobile'}</span>
                </button>

                {/* 2. Execute to Real Elev8 MT5 (Bridge or In-App) */}
                <button
                  type="button"
                  disabled={isExecutingWebhook}
                  onClick={handleExecute}
                  className="py-2.5 px-3 bg-[#00E676] hover:bg-[#00c853] disabled:opacity-50 text-[#080B11] font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(0,230,118,0.3)] flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isExecutingWebhook ? 'Sending to MT5...' : '🚀 Execute to Elev8 MT5'}</span>
                </button>
              </div>

              {/* 1-Tap Copy Values for MT5 Mobile */}
              <div className="bg-[#101522] border border-[#222F47] rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#94A3B8]">
                  <span>📋 1-Tap Copy for MT5 (No Typing Needed):</span>
                  {copiedValue && (
                    <span className="text-[#00E676] font-mono animate-pulse">Copied {copiedValue}! Paste into MT5</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => copySingleValue(calculatedLots.toFixed(2), 'Lots')}
                    className="p-1.5 rounded-lg bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-left transition-all"
                  >
                    <span className="text-[9px] text-[#94A3B8] block">LOTS</span>
                    <strong className="text-[#FFD700] text-xs">{calculatedLots.toFixed(2)}</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => copySingleValue(stopLoss, 'SL')}
                    className="p-1.5 rounded-lg bg-[#182033] hover:bg-[#222F47] border border-[#FF3366]/30 text-left transition-all"
                  >
                    <span className="text-[9px] text-[#FF3366] block">STOP LOSS</span>
                    <strong className="text-[#FF3366] text-xs">{stopLoss}</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => copySingleValue(takeProfit1, 'TP1')}
                    className="p-1.5 rounded-lg bg-[#182033] hover:bg-[#222F47] border border-[#00E676]/30 text-left transition-all"
                  >
                    <span className="text-[9px] text-[#00E676] block">TAKE PROFIT</span>
                    <strong className="text-[#00E676] text-xs">{takeProfit1}</strong>
                  </button>
                </div>
              </div>

              {/* Quick copy command for manual entry */}
              <div className="flex items-center justify-between text-[10px] text-[#94A3B8] px-1">
                <span>Want 100% automated trading without manual typing?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenElev8Dashboard();
                  }}
                  className="text-[#00E676] hover:underline font-bold"
                >
                  Use Cloud / EA Bridge ➔
                </button>
              </div>

              {/* Troubleshooting hint for MT5 login */}
              <div className="bg-[#182033]/60 border border-[#222F47] rounded-lg p-2 text-[10px] text-[#94A3B8] flex items-start gap-1.5 leading-tight">
                <span className="text-[#FFD700] shrink-0 font-bold">💡 Tip:</span>
                <span>
                  If MT5 mobile shows <strong className="text-[#FF3366]">"Authorization failed"</strong>, log in first inside MT5 ➔ <strong className="text-[#F1F5F9]">Manage Accounts</strong> with your login #, trader password, and exact broker server.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-[11px] text-[#94A3B8]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenElev8Dashboard();
              }}
              className="hover:text-[#2979FF] flex items-center gap-1 transition-colors"
            >
              <Layers className="w-3 h-3" />
              <span>View Elev8 Account & Trade History</span>
            </button>
            <span className="font-mono text-[10px] text-[#64748B]">Ticket ID: {signal.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
