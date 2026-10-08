import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ForexSignal } from '../types';
import { formatPrice } from '../services/marketData';
import { realPriceService } from '../services/RealPriceService';
import {
  X,
  Sparkles,
  Target,
  ShieldAlert,
  SlidersHorizontal,
  Layers,
  Check,
  Copy,
  Activity,
  Flame,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';

interface Props {
  signal: ForexSignal | null;
  isOpen: boolean;
  onClose: () => void;
  onAskAi?: (sig: ForexSignal) => void;
}

export const LIVE_TRADINGVIEW_SYMBOL_MAP: Record<string, string> = {
  // Majors
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  'USD/CHF': 'FX:USDCHF',
  'AUD/USD': 'FX:AUDUSD',
  'NZD/USD': 'FX:NZDUSD',
  'USD/CAD': 'FX:USDCAD',
  // Minors & Crosses
  'EUR/GBP': 'FX:EURGBP',
  'EUR/JPY': 'FX:EURJPY',
  'EUR/AUD': 'FX:EURAUD',
  'EUR/CAD': 'FX:EURCAD',
  'EUR/CHF': 'FX:EURCHF',
  'EUR/NZD': 'FX:EURNZD',
  'GBP/JPY': 'FX:GBPJPY',
  'GBP/AUD': 'FX:GBPAUD',
  'GBP/CAD': 'FX:GBPCAD',
  'GBP/CHF': 'FX:GBPCHF',
  'GBP/NZD': 'FX:GBPNZD',
  'AUD/JPY': 'FX:AUDJPY',
  'AUD/CAD': 'FX:AUDCAD',
  'AUD/CHF': 'FX:AUDCHF',
  'AUD/NZD': 'FX:AUDNZD',
  'CAD/JPY': 'FX:CADJPY',
  'CAD/CHF': 'FX:CADCHF',
  'CHF/JPY': 'FX:CHFJPY',
  'NZD/JPY': 'FX:NZDJPY',
  'NZD/CAD': 'FX:NZDCAD',
  'NZD/CHF': 'FX:NZDCHF',
  // Metals & Commodities
  'XAU/USD': 'FOREXCOM:XAUUSD',
  'XAG/USD': 'FOREXCOM:XAGUSD',
  'USOIL': 'TVC:USOIL',
  'UKOIL': 'TVC:UKOIL'
};

export function getTradingViewSymbol(symbol: string): string {
  if (LIVE_TRADINGVIEW_SYMBOL_MAP[symbol]) return LIVE_TRADINGVIEW_SYMBOL_MAP[symbol];
  const cleaned = symbol.replace('/', '');
  return `FX:${cleaned}`;
}

type TvInterval = '1' | '5' | '15' | '60' | '240' | 'D';

interface IntervalTab {
  key: TvInterval;
  label: string;
}

const INTERVAL_TABS: IntervalTab[] = [
  { key: '1', label: '1m' },
  { key: '5', label: '5m' },
  { key: '15', label: '15m' },
  { key: '60', label: '1H' },
  { key: '240', label: '4H' },
  { key: 'D', label: '1D' }
];

export const LiveChartModal: React.FC<Props> = ({
  signal,
  isOpen,
  onClose,
  onAskAi
}) => {
  const [interval, setIntervalState] = useState<TvInterval>('15');
  const [livePrice, setLivePrice] = useState<number>(0);
  const [copiedLevel, setCopiedLevel] = useState<string | null>(null);
  const [copiedMt4, setCopiedMt4] = useState<boolean>(false);
  const [showAnalysisDrawer, setShowAnalysisDrawer] = useState<boolean>(false);
  const [chartLoaded, setChartLoaded] = useState<boolean>(false);

  // Swipe-down gestures for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync real-time live price from RealPriceService
  useEffect(() => {
    if (!signal) return;
    const initialPrice = realPriceService.getPrice(signal.pair.symbol) || signal.pair.currentPrice || signal.entryPrice;
    setLivePrice(initialPrice);

    // Immediately fetch fresh quotes from TradingView live engine
    realPriceService.fetchSymbolImmediate(signal.pair.symbol).then(price => {
      if (price > 0) setLivePrice(price);
    });

    // Active real-time tick refresh while chart modal is open
    const modalPollInterval = setInterval(() => {
      realPriceService.fetchSymbolImmediate(signal.pair.symbol).then(price => {
        if (price > 0) setLivePrice(price);
      });
    }, 3000);

    const unsubscribe = realPriceService.onPrice(tick => {
      if (tick.symbol === signal.pair.symbol) {
        setLivePrice(tick.price);
      }
    });

    return () => {
      clearInterval(modalPollInterval);
      unsubscribe();
    };
  }, [signal]);

  // Dynamic TradingView Symbol (e.g. FOREXCOM:XAUUSD, FX:EURUSD)
  const tvSymbol = useMemo(() => {
    if (!signal) return 'FOREXCOM:XAUUSD';
    return getTradingViewSymbol(signal.pair.symbol);
  }, [signal]);

  // Pip Multiplier & Calculations
  const pipMultiplier = useMemo(() => {
    if (!signal) return 10000;
    if (signal.pair.pipDigits === 2 && !signal.pair.isGoldOrCrypto) return 100;
    if (signal.pair.isGoldOrCrypto) return 10;
    return 10000;
  }, [signal]);

  const activeSignal = useMemo(() => {
    if (!signal) return null;
    if (signal.id.startsWith('ANALYZE-') && livePrice > 0) {
      const pipOffset = signal.pair.pipDigits === 2 ? (signal.pair.isGoldOrCrypto ? 15.0 : 0.40) : (signal.pair.pipDigits === 1 ? 80.0 : 0.0040);
      const isBuy = signal.type.startsWith('BUY');
      const entry = livePrice;
      const sl = isBuy ? entry - pipOffset : entry + pipOffset;
      const tp1 = isBuy ? entry + pipOffset * 2.5 : entry - pipOffset * 2.5;
      const tp2 = isBuy ? entry + pipOffset * 4.0 : entry - pipOffset * 4.0;
      const tp3 = isBuy ? entry + pipOffset * 6.0 : entry - pipOffset * 6.0;

      return {
        ...signal,
        entryPrice: Number(entry.toFixed(signal.pair.pipDigits)),
        currentPrice: Number(entry.toFixed(signal.pair.pipDigits)),
        stopLoss: Number(sl.toFixed(signal.pair.pipDigits)),
        takeProfit1: Number(tp1.toFixed(signal.pair.pipDigits)),
        takeProfit2: Number(tp2.toFixed(signal.pair.pipDigits)),
        takeProfit3: Number(tp3.toFixed(signal.pair.pipDigits)),
      };
    }
    return signal;
  }, [signal, livePrice]);

  const currentPrice = livePrice > 0 ? livePrice : (activeSignal?.currentPrice || activeSignal?.entryPrice || 0);

  const slPips = activeSignal
    ? Math.round(Math.abs(activeSignal.entryPrice - activeSignal.stopLoss) * pipMultiplier * 10) / 10
    : 0;
  const tp1Pips = activeSignal
    ? Math.round(Math.abs(activeSignal.takeProfit1 - activeSignal.entryPrice) * pipMultiplier * 10) / 10
    : 0;
  const tp2Pips = activeSignal && activeSignal.takeProfit2
    ? Math.round(Math.abs(activeSignal.takeProfit2 - activeSignal.entryPrice) * pipMultiplier * 10) / 10
    : 0;
  const liveToEntryDiff = activeSignal ? (currentPrice - activeSignal.entryPrice) * pipMultiplier : 0;
  const liveToEntryPips = Math.round(Math.abs(liveToEntryDiff) * 10) / 10;

  // Real TradingView Advanced Candlestick Chart (100% Real Live Market Data Feed, No Indicators)
  useEffect(() => {
    if (!isOpen || !signal) return;
    setChartLoaded(false);

    const containerId = `tv_chart_${signal.id.replace(/[^a-zA-Z0-9]/g, '_')}_${interval}`;
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = `<div id="${containerId}" style="height: 480px; width: 100%;"></div>`;

    let isMounted = true;

    const initTvWidget = () => {
      if (!isMounted) return;
      if (typeof (window as any).TradingView !== 'undefined' && (window as any).TradingView.widget) {
        try {
          new (window as any).TradingView.widget({
            autosize: true,
            height: '480',
            symbol: tvSymbol,
            interval: interval,
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1', // Candlestick style
            locale: 'en',
            toolbar_bg: '#0f0f0f',
            enable_publishing: false,
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            container_id: containerId,
            studies: [] // No indicators: pure real price action
          });
          setChartLoaded(true);
        } catch {
          mountIframeFallback();
        }
      } else {
        mountIframeFallback();
      }
    };

    const mountIframeFallback = () => {
      if (!isMounted || !container) return;
      const iframeSettings = {
        autosize: true,
        symbol: tvSymbol,
        interval: interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0f0f0f',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        studies: [],
        backgroundColor: '#0f0f0f'
      };
      const hash = encodeURIComponent(JSON.stringify(iframeSettings));
      container.innerHTML = `<iframe src="https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${hash}" style="width:100%; height:480px; border:0;" allowfullscreen></iframe>`;
      setChartLoaded(true);
    };

    if (typeof (window as any).TradingView === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://s.tradingview.com/tv.js';
      script.async = true;
      script.onload = initTvWidget;
      script.onerror = mountIframeFallback;
      document.head.appendChild(script);
    } else {
      initTvWidget();
    }

    return () => {
      isMounted = false;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [isOpen, signal, tvSymbol, interval]);

  // Copy level helper
  const handleCopyPrice = (label: string, price: number) => {
    navigator.clipboard.writeText(price.toString());
    setCopiedLevel(label);
    setTimeout(() => setCopiedLevel(null), 1500);
  };

  // Mobile Swipe Down
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.touches[0].clientY - touchStart;
    if (delta > 0) setTouchDelta(delta);
  };
  const handleTouchEnd = () => {
    if (touchDelta > 90) onClose();
    setTouchStart(null);
    setTouchDelta(0);
  };

  if (!isOpen || !signal) return null;

  const currentSig = activeSignal || signal;
  const isChartInspectionOnly = currentSig.id.startsWith('ANALYZE-');
  const isBuy = currentSig.type.startsWith('BUY');
  const isPending = currentSig.status === 'PENDING' || Boolean(currentSig.isPending);

  // Copy Full MT4/MT5 order string
  const handleCopyMt4 = () => {
    if (!currentSig || isChartInspectionOnly) return;
    const str = `${currentSig.type} ${currentSig.pair.symbol.replace('/', '')} @ ${formatPrice(currentSig.pair, currentSig.entryPrice)} | SL: ${formatPrice(currentSig.pair, currentSig.stopLoss)} | TP1: ${formatPrice(currentSig.pair, currentSig.takeProfit1)}${currentSig.takeProfit2 ? ` | TP2: ${formatPrice(currentSig.pair, currentSig.takeProfit2)}` : ''}`;
    navigator.clipboard.writeText(str);
    setCopiedMt4(true);
    setTimeout(() => setCopiedMt4(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet Box */}
      <div
        style={{
          transform: touchDelta > 0 ? `translateY(${touchDelta}px)` : undefined,
          transition: touchStart === null ? 'transform 0.2s ease-out' : undefined
        }}
        className="relative z-10 w-full max-w-3xl bg-[#0b0e14] border-t sm:border border-[#222F47] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh]"
      >
        {/* Swipe Handle for Mobile */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden"
        >
          <div className="w-12 h-1.5 rounded-full bg-[#334155]" />
        </div>

        {/* 1. REAL MARKET HEADER: Pair LIVE + Live Real OANDA Feed Badge + Actions */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="px-4 py-3 bg-[#111622] border-b border-[#222F47] flex items-center justify-between gap-3 select-none"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-[#F8FAFC] tracking-tight">
                {currentSig.pair.symbol}
              </span>
              <span className="text-[10px] font-black text-[#00E676] bg-[#00E676]/15 border border-[#00E676]/30 px-2 py-0.5 rounded">
                TRADINGVIEW REAL FEED
              </span>
            </div>

            {/* Pulsing Live Quote */}
            <div className="flex items-center gap-1.5 bg-[#00E676]/10 border border-[#00E676]/30 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(0,230,118,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              <span className="text-xs font-mono font-bold text-[#00E676]">
                {formatPrice(currentSig.pair, currentPrice)}
              </span>
            </div>

            <span className="hidden sm:inline-block text-[10px] font-mono text-[#64748B]">
              Spread: {currentSig.pair.spreadPips}p
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onAskAi && (
              <button
                onClick={() => onAskAi(currentSig)}
                className="flex items-center gap-1 text-xs font-bold text-[#2979FF] bg-[#2979FF]/15 hover:bg-[#2979FF]/25 border border-[#2979FF]/40 px-2.5 py-1 rounded-lg transition-colors"
                title="Deep Institutional AI Audit"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">AI Audit</span>
              </button>
            )}

            {!isChartInspectionOnly && (
              <button
                onClick={handleCopyMt4}
                className="flex items-center gap-1 text-xs font-bold text-[#FFD700] bg-[#FFD700]/15 hover:bg-[#FFD700]/25 border border-[#FFD700]/40 px-2.5 py-1 rounded-lg transition-colors"
                title="Copy Complete MT4/MT5 Order String"
              >
                {copiedMt4 ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMt4 ? 'Copied!' : 'MT4 Order'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#222F47]/60 hover:bg-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. TIMEFRAME SELECTOR & CONFLUENCE EDGE BAR */}
        <div className="px-4 py-2 bg-[#0e131d] border-b border-[#222F47]/80 flex flex-wrap items-center justify-between gap-2">
          {/* Timeframe intervals controlling TradingView */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {INTERVAL_TABS.map(tab => {
              const isSelected = interval === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setIntervalState(tab.key)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all ${
                    isSelected
                      ? 'bg-[#00E676] text-[#080B11] shadow-[0_0_8px_rgba(0,230,118,0.3)]'
                      : 'bg-[#182033]/70 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Trade Direction & Edge Confluence Badge */}
          {isChartInspectionOnly ? (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-0.5 rounded font-black bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30">
                ⚠️ NO ACTIVE SIGNAL — CHART WATCH ONLY
              </span>
              <span className="text-[#94A3B8] bg-[#182033] border border-[#222F47] px-2 py-0.5 rounded font-bold hidden sm:inline">
                0.01 Margin: ${(currentSig.pair.minMargin001 || (currentSig.pair.pipDigits === 2 ? 8.5 : 2.2)).toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`px-2 py-0.5 rounded font-black ${
                  isBuy
                    ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                    : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30'
                }`}
              >
                {currentSig.type}
              </span>

              <span className="text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 px-2 py-0.5 rounded font-bold">
                {currentSig.confluenceScore}% Confluence
              </span>

              <span className="text-[#F1F5F9] bg-[#182033] border border-[#222F47] px-2 py-0.5 rounded font-bold hidden sm:inline">
                R:R {currentSig.riskReward}
              </span>
            </div>
          )}
        </div>

        {/* 3. ESSENTIAL EXECUTION LEVELS HUD OR CHART-ONLY ADVISORY */}
        {isChartInspectionOnly ? (
          <div className="px-4 py-2.5 bg-[#090c12] border-b border-[#222F47] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#F1F5F9]">
              <AlertTriangle className="w-4 h-4 text-[#FFD700] shrink-0" />
              <span>
                <strong className="text-[#FFD700]">Do Not Enter Trade Yet:</strong> {currentSig.pair.symbol} is a tradable 0.01 micro-lot broker asset, but it currently has <strong>no verified institutional signal</strong>. Only enter trades on pairs marked <span className="text-[#00E676] font-bold">SIGNAL</span> with verified Entry, SL & TP cards.
              </span>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 bg-[#090c12] border-b border-[#222F47] grid grid-cols-4 gap-2 text-center text-xs select-none">
            {/* ENTRY LEVEL */}
            <div
              onClick={() => handleCopyPrice('ENTRY', currentSig.entryPrice)}
              className="bg-[#121826] p-2 rounded-xl border border-[#2979FF]/40 hover:border-[#2979FF] cursor-pointer transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between text-[9px] text-[#2979FF] font-bold uppercase tracking-wider">
                <span>ENTRY LEVEL</span>
                {copiedLevel === 'ENTRY' ? (
                  <Check className="w-2.5 h-2.5 text-[#00E676]" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                )}
              </div>
              <div className="font-mono font-black text-[#F1F5F9] text-[13px] mt-0.5">
                {formatPrice(currentSig.pair, currentSig.entryPrice)}
              </div>
              <div className="text-[9.5px] text-[#93c5fd] font-mono mt-0.5">
                {liveToEntryDiff >= 0 ? '+' : ''}{liveToEntryPips}p to entry
              </div>
            </div>

            {/* STOP LOSS (SL) */}
            <div
              onClick={() => handleCopyPrice('SL', currentSig.stopLoss)}
              className="bg-[#121826] p-2 rounded-xl border border-[#FF3366]/40 hover:border-[#FF3366] cursor-pointer transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between text-[9px] text-[#FF3366] font-bold uppercase tracking-wider">
                <span>STOP LOSS (SL)</span>
                {copiedLevel === 'SL' ? (
                  <Check className="w-2.5 h-2.5 text-[#00E676]" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                )}
              </div>
              <div className="font-mono font-black text-[#FF3366] text-[13px] mt-0.5">
                {formatPrice(currentSig.pair, currentSig.stopLoss)}
              </div>
              <div className="text-[9.5px] text-[#FF3366]/90 font-mono mt-0.5">
                Risk: -{slPips} pips
              </div>
            </div>

            {/* TAKE PROFIT 1 (TP1) */}
            <div
              onClick={() => handleCopyPrice('TP1', currentSig.takeProfit1)}
              className="bg-[#121826] p-2 rounded-xl border border-[#00E676]/40 hover:border-[#00E676] cursor-pointer transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between text-[9px] text-[#00E676] font-bold uppercase tracking-wider">
                <span>TAKE PROFIT 1</span>
                {copiedLevel === 'TP1' ? (
                  <Check className="w-2.5 h-2.5 text-[#00E676]" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                )}
              </div>
              <div className="font-mono font-black text-[#00E676] text-[13px] mt-0.5">
                {formatPrice(currentSig.pair, currentSig.takeProfit1)}
              </div>
              <div className="text-[9.5px] text-[#00E676]/90 font-mono mt-0.5">
                Target: +{tp1Pips} pips
              </div>
            </div>

            {/* TAKE PROFIT 2 (TP2) */}
            <div
              onClick={() => currentSig.takeProfit2 && handleCopyPrice('TP2', currentSig.takeProfit2)}
              className="bg-[#121826] p-2 rounded-xl border border-[#00E676]/40 hover:border-[#00E676] cursor-pointer transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between text-[9px] text-[#00E676] font-bold uppercase tracking-wider">
                <span>TAKE PROFIT 2</span>
                {copiedLevel === 'TP2' ? (
                  <Check className="w-2.5 h-2.5 text-[#00E676]" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                )}
              </div>
              <div className="font-mono font-black text-[#00E676] text-[13px] mt-0.5">
                {currentSig.takeProfit2 ? formatPrice(currentSig.pair, currentSig.takeProfit2) : '—'}
              </div>
              <div className="text-[9.5px] text-[#00E676]/90 font-mono mt-0.5">
                {tp2Pips ? `Runner: +${tp2Pips}p` : 'Runner'}
              </div>
            </div>
          </div>
        )}

        {/* 4. REAL TRADINGVIEW CANDLESTICK CHART VIEWPORT */}
        <div className="relative w-full h-[480px] bg-[#0f0f0f] overflow-hidden select-none">
          {/* TradingView Advanced Real-Time Chart Container */}
          <div ref={containerRef} className="w-full h-[480px]" />

          {/* Floating Visual Level Reminder HUD on Top of Real Chart */}
          {!isChartInspectionOnly ? (
            <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 max-w-[85%]">
              <div className="bg-[#2979FF]/90 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow backdrop-blur-xs flex items-center gap-1">
                <span>ENTRY:</span>
                <span>{formatPrice(currentSig.pair, currentSig.entryPrice)}</span>
              </div>

              <div className="bg-[#FF3366]/90 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow backdrop-blur-xs flex items-center gap-1">
                <span>SL:</span>
                <span>{formatPrice(currentSig.pair, currentSig.stopLoss)}</span>
                <span className="opacity-80">(-{slPips}p)</span>
              </div>

              <div className="bg-[#00E676]/90 text-[#080B11] font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow backdrop-blur-xs flex items-center gap-1">
                <span>TP1:</span>
                <span>{formatPrice(currentSig.pair, currentSig.takeProfit1)}</span>
                <span className="opacity-80">(+{tp1Pips}p)</span>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 max-w-[85%]">
              <div className="bg-[#182033]/90 border border-[#222F47] text-[#94A3B8] font-mono font-bold text-[10px] px-2.5 py-0.5 rounded shadow backdrop-blur-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                <span>CHART INSPECTION ONLY • NO ACTIVE ENTRY SIGNAL</span>
              </div>
            </div>
          )}

          {/* Live Data Stream Verification Stamp */}
          <div className="pointer-events-none absolute bottom-2 right-3 z-10 bg-black/70 border border-[#222F47] px-2 py-0.5 rounded text-[9.5px] font-mono text-[#94A3B8] backdrop-blur-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
            <span>TradingView Real Data Feed ({tvSymbol})</span>
          </div>
        </div>

        {/* 5. COMPLETE INSTITUTIONAL SETUP ANALYSIS (Collapsible / Rich Drawer) */}
        <div className="bg-[#0f141f] border-t border-[#222F47]">
          {/* Drawer Toggle Header */}
          <button
            onClick={() => setShowAnalysisDrawer(!showAnalysisDrawer)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#182033]/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#2979FF]" />
              <span className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider">
                {isChartInspectionOnly
                  ? 'Asset Market Specifications & Why No Signal Yet'
                  : 'Institutional Setup Analysis & Confluence Breakdown'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                isChartInspectionOnly
                  ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30'
                  : 'bg-[#2979FF]/15 text-[#2979FF] border-[#2979FF]/30'
              }`}>
                {isChartInspectionOnly
                  ? 'Standby • Wait for Setup'
                  : `${currentSig.checklist?.length || 4} Criteria Verified`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
              <span>{showAnalysisDrawer ? 'Hide Details' : 'View Full Analysis'}</span>
              {showAnalysisDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {/* Expanded Institutional Analysis Details */}
          {showAnalysisDrawer && (
            <div className="px-4 pb-4 pt-1 space-y-3 max-h-[320px] overflow-y-auto border-t border-[#222F47]/60 text-xs animate-fadeIn">
              {/* Institutional Flow & Session */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-[#090d14] p-2.5 rounded-xl border border-[#222F47]">
                  <div className="text-[10px] text-[#64748B] font-bold uppercase mb-1">
                    Institutional Flow & SMC Context
                  </div>
                  <div className="text-[#F1F5F9] font-medium leading-relaxed">
                    {currentSig.institutionalFlow}
                  </div>
                  <div className="mt-2 text-[10px] text-[#94A3B8] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-[#FFD700]" />
                    <span>Session: {currentSig.killzone || 'London / New York Session'}</span>
                  </div>
                </div>

                <div className="bg-[#090d14] p-2.5 rounded-xl border border-[#222F47]">
                  <div className="text-[10px] text-[#64748B] font-bold uppercase mb-1">
                    {isPending ? 'Setup Invalidation & Risk Rule' : 'Stop Loss Protection'}
                  </div>
                  <div className="text-[#FF3366] font-medium leading-relaxed flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{currentSig.invalidationTrigger || `Setup exit upon candle close beyond ${formatPrice(currentSig.pair, currentSig.stopLoss)}.`}</span>
                  </div>
                  {isPending && (
                    <div className="mt-2 text-[10px] text-[#FFD700] font-mono">
                      Entry Window: {currentSig.validityTimeLeft || 'Active for current session'}
                    </div>
                  )}
                </div>
              </div>

              {/* Confluence Checklist */}
              {currentSig.checklist && currentSig.checklist.length > 0 && (
                <div className="bg-[#090d14] p-2.5 rounded-xl border border-[#222F47]">
                  <div className="text-[10px] text-[#00E676] font-bold uppercase tracking-wider mb-2">
                    Verified Confluence Checklist ({currentSig.confluenceScore}% Score)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {currentSig.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-[#F1F5F9]">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${item.isConfirmed ? 'text-[#00E676]' : 'text-[#64748B]'}`} />
                        <span className="font-semibold">{item.title}:</span>
                        <span className="text-[#94A3B8] truncate">{item.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rationale Thesis */}
              {currentSig.rationale && (
                <div className="bg-[#090d14] p-2.5 rounded-xl border border-[#222F47]">
                  <div className="text-[10px] text-[#2979FF] font-bold uppercase mb-1">
                    Analyst Thesis & Strategy Execution
                  </div>
                  <p className="text-[#94A3B8] leading-relaxed">
                    {currentSig.rationale}
                  </p>
                  {currentSig.economicRisk && (
                    <div className="mt-2 text-[10px] text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded border border-[#FFD700]/25">
                      Macro Risk Assessment: {currentSig.economicRisk}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
