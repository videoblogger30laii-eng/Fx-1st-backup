import React, { useState, useMemo, useEffect } from 'react';
import { ForexPair, Timeframe, CandleStick } from '../types';
import { formatPrice } from '../services/marketData';
import { realPriceService, PairOHLC } from '../services/RealPriceService';

interface Props {
  selectedPair: ForexPair;
  timeframe: Timeframe;
  providerLabel?: string;
  isLoading?: boolean;
  candles?: CandleStick[];
}

export const TRADINGVIEW_SYMBOL_MAP: Record<string, string> = {
  'XAU/USD': 'FOREXCOM:XAUUSD',
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  'USD/CHF': 'FX:USDCHF',
  'AUD/USD': 'FX:AUDUSD',
  'NZD/USD': 'FX:NZDUSD',
  'USD/CAD': 'FX:USDCAD',
  'EUR/GBP': 'FX:EURGBP',
  'EUR/JPY': 'FX:EURJPY',
  'GBP/JPY': 'FX:GBPJPY',
  'BTC/USD': 'BINANCE:BTCUSDT',
  'US30': 'FOREXCOM:DJI',
  'NAS100': 'FOREXCOM:NAS100'
};

export const TRADINGVIEW_INTERVAL_MAP: Record<Timeframe, string> = {
  M5: '5',
  M15: '15',
  H1: '60',
  H4: '240',
  D1: 'D'
};

const TIMEFRAME_DISPLAY_LABELS: Record<Timeframe, string> = {
  M5: '5 Min',
  M15: '15 Min',
  H1: '1 Hour',
  H4: '4 Hours',
  D1: 'Daily'
};

export const CandlestickChart: React.FC<Props> = ({
  selectedPair,
  timeframe
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [ohlc, setOhlc] = useState<PairOHLC>(() => realPriceService.getOHLC(selectedPair.symbol));

  // Sync OHLC when selected pair changes or price updates
  useEffect(() => {
    setOhlc(realPriceService.getOHLC(selectedPair.symbol));

    const unsubscribe = realPriceService.onPrice(tick => {
      if (tick.symbol === selectedPair.symbol) {
        setOhlc(tick.ohlc);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedPair.symbol]);

  // Exact symbol & interval mapping
  const tvSymbol = TRADINGVIEW_SYMBOL_MAP[selectedPair.symbol] || `FX:${selectedPair.symbol.replace('/', '')}`;
  const tvInterval = TRADINGVIEW_INTERVAL_MAP[timeframe] || '60';

  const livePrice = selectedPair.currentPrice > 0 ? selectedPair.currentPrice : selectedPair.basePrice;
  const isPos = livePrice >= (ohlc.open || selectedPair.basePrice);
  const changePercent = ohlc.open > 0 ? ((livePrice - ohlc.open) / ohlc.open) * 100 : 0;

  // Direct, high-performance TradingView Advanced Chart iframe URL
  // Eliminates external wrapper scripts that cause contentWindow/resize errors in iframe sandboxes
  const iframeSrc = useMemo(() => {
    const settings = {
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1', // 1 = Candlesticks
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false, // Pure price action with volume bars at bottom
      studies: [], // Clean chart: No indicators inside
      backgroundColor: '#0B0F19',
      gridColor: 'rgba(255, 255, 255, 0.05)',
      support_host: 'https://www.tradingview.com'
    };

    return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(JSON.stringify(settings))}`;
  }, [tvSymbol, tvInterval]);

  return (
    <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header: Pair Info, MT5 Broker Feed Tag & Existing Live Feed Price */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#101726] border-b border-[#1E293B] gap-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#F8FAFC] tracking-tight">{selectedPair.symbol}</span>
            <span className="text-[10px] font-bold text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-2 py-0.5 rounded">
              {tvSymbol}
            </span>
          </div>

          {/* O: H: L: C: Readouts matching TradingView Real Time Price */}
          <div className="flex items-center gap-2.5 text-[11px] font-mono">
            <span className="text-[#64748B]">O: <strong className="text-[#E2E8F0] font-semibold">{formatPrice(selectedPair, ohlc.open)}</strong></span>
            <span className="text-[#64748B]">H: <strong className="text-[#E2E8F0] font-semibold">{formatPrice(selectedPair, Math.max(ohlc.high, livePrice))}</strong></span>
            <span className="text-[#64748B]">L: <strong className="text-[#E2E8F0] font-semibold">{formatPrice(selectedPair, Math.min(ohlc.low, livePrice))}</strong></span>
            <span className="text-[#64748B]">C: <strong className={isPos ? 'text-[#00E676] font-semibold' : 'text-[#FF3366] font-semibold'}>{formatPrice(selectedPair, livePrice)}</strong></span>
            <span className={`font-semibold hidden sm:inline ${isPos ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
              ({isPos ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Real-time Live Price Badge & MT5 Broker Sync Tag */}
        <div className="flex items-center gap-2.5">
          <div className="text-[10px] font-mono text-[#94A3B8] bg-[#182033] px-2 py-0.5 rounded border border-[#222F47]">
            Spread: <strong className="text-[#F1F5F9]">{selectedPair.spreadPips}p</strong>
          </div>

          <div
            className={`text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-2 transition-all ${
              isPos
                ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 shadow-[0_0_12px_rgba(0,230,118,0.2)]'
                : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30 shadow-[0_0_12px_rgba(255,51,102,0.2)]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isPos ? 'bg-[#00E676]' : 'bg-[#FF3366]'} animate-pulse`} />
            <span>LIVE: {formatPrice(selectedPair, livePrice)}</span>
          </div>

          <div className="text-[10px] font-bold bg-[#182033] text-[#2979FF] border border-[#222F47] px-2 py-1 rounded">
            TradingView MT5
          </div>
        </div>
      </div>

      {/* TradingView Advanced Real-Time Chart Container */}
      <div className="relative w-full h-[520px] sm:h-[560px] bg-[#0B0F19]">
        {/* Direct native iframe: Resizes cleanly with 100% width/height without external script errors */}
        <iframe
          key={`${tvSymbol}-${tvInterval}`}
          src={iframeSrc}
          title={`TradingView ${selectedPair.symbol} Chart`}
          className="w-full h-full border-0 block"
          allow="autoplay; fullscreen; clipboard-read; clipboard-write"
          loading="eager"
          onLoad={() => setIframeLoaded(true)}
        />

        {/* Smooth loading overlay before iframe renders */}
        {!iframeLoaded && (
          <div className="absolute inset-0 bg-[#0B0F19] flex flex-col items-center justify-center z-10 transition-opacity duration-300">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#141C2E] border border-[#222F47] shadow-2xl">
              <div className="w-5 h-5 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
              <div className="text-left">
                <div className="text-xs font-bold text-[#F1F5F9]">
                  Loading TradingView Advanced Chart...
                </div>
                <div className="text-[10px] text-[#64748B] font-mono">
                  {tvSymbol} • {TIMEFRAME_DISPLAY_LABELS[timeframe]} • 100% Real MT5 Price
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TradingViewChart = CandlestickChart;
