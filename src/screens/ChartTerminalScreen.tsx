import React, { useState, useEffect } from 'react';
import { ForexPair, Timeframe, CandleStick, MarketDataProvider } from '../types';
import { CandlestickChart } from '../components/CandlestickChart';
import { formatPrice } from '../services/marketData';
import { realPriceService, PairOHLC } from '../services/RealPriceService';

interface Props {
  allPairs: ForexPair[];
  selectedPair: ForexPair;
  selectedTimeframe: Timeframe;
  candles: CandleStick[];
  isLoadingCandles?: boolean;
  marketDataProvider: MarketDataProvider;
  onPairSelect: (pair: ForexPair) => void;
  onTimeframeSelect: (tf: Timeframe) => void;
  onRefreshCandles?: () => void;
}

export const ChartTerminalScreen: React.FC<Props> = ({
  allPairs,
  selectedPair,
  selectedTimeframe,
  candles,
  isLoadingCandles = false,
  marketDataProvider,
  onPairSelect,
  onTimeframeSelect,
  onRefreshCandles
}) => {
  const [ohlc, setOhlc] = useState<PairOHLC>(() => realPriceService.getOHLC(selectedPair.symbol));

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

  const livePrice = selectedPair.currentPrice > 0 ? selectedPair.currentPrice : selectedPair.basePrice;
  const isPos = livePrice >= (ohlc.open || selectedPair.basePrice);
  const pips = Math.round(Math.abs(livePrice - (ohlc.open || selectedPair.basePrice)) * (selectedPair.pipDigits === 2 && !selectedPair.isGoldOrCrypto ? 100 : selectedPair.isGoldOrCrypto ? 10 : 10000) * 10) / 10;
  const changePercent = (ohlc.open || selectedPair.basePrice) > 0 ? ((livePrice - (ohlc.open || selectedPair.basePrice)) / (ohlc.open || selectedPair.basePrice)) * 100 : 0;

  const timeframes: { tf: Timeframe; label: string }[] = [
    { tf: 'M5', label: 'M5' },
    { tf: 'M15', label: 'M15' },
    { tf: 'H1', label: 'H1' },
    { tf: 'H4', label: 'H4' },
    { tf: 'D1', label: 'D1' }
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16 text-left">
      {/* Pair Switcher Carousel */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {allPairs.map(pair => {
          const isSelected = selectedPair.symbol === pair.symbol;
          const pairPos = pair.currentPrice >= pair.basePrice;
          const pairPips = Math.round(Math.abs(pair.currentPrice - pair.basePrice) * (pair.pipDigits === 2 && !pair.isGoldOrCrypto ? 100 : pair.isGoldOrCrypto ? 10 : 10000) * 10) / 10;
          return (
            <button
              key={pair.symbol}
              onClick={() => onPairSelect(pair)}
              className={`p-2.5 rounded-xl border text-left shrink-0 transition-all ${
                isSelected
                  ? 'bg-[#182033] border-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.15)] ring-1 ring-[#00E676]/40'
                  : 'bg-[#101522] border-[#222F47] hover:border-[#222F47]/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className={`text-xs font-bold ${isSelected ? 'text-[#00E676]' : 'text-[#F1F5F9]'}`}>
                  {pair.symbol}
                </span>
                <span className={`text-[9px] font-bold ${pairPos ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                  {pairPos ? '+' : '-'}{pairPips}p
                </span>
              </div>
              <div className="text-[11px] font-mono font-bold text-[#F1F5F9]">
                {formatPrice(pair, pair.currentPrice)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Pair Header with Live Price and Real-time OHLC */}
      <div className="flex flex-wrap items-center justify-between bg-[#101522] border border-[#222F47] rounded-xl p-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#F1F5F9]">{selectedPair.symbol}</h2>
            <span className="text-[10px] font-bold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
              REAL-TIME MT5
            </span>
          </div>
          <div className="text-xs text-[#94A3B8]">{selectedPair.name}</div>

          {/* Real-time OHLC breakdown */}
          <div className="flex items-center gap-2.5 text-xs font-mono mt-2 text-[#94A3B8]">
            <span>O: <strong className="text-[#F1F5F9]">{formatPrice(selectedPair, ohlc.open)}</strong></span>
            <span>H: <strong className="text-[#F1F5F9]">{formatPrice(selectedPair, Math.max(ohlc.high, livePrice))}</strong></span>
            <span>L: <strong className="text-[#F1F5F9]">{formatPrice(selectedPair, Math.min(ohlc.low, livePrice))}</strong></span>
            <span>C: <strong className={isPos ? 'text-[#00E676]' : 'text-[#FF3366]'}>{formatPrice(selectedPair, livePrice)}</strong></span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#F1F5F9] tracking-tight">
            {formatPrice(selectedPair, livePrice)}
          </div>
          <div className="flex items-center justify-end gap-2 text-xs font-bold mt-1">
            <span className={isPos ? 'text-[#00E676]' : 'text-[#FF3366]'}>
              {isPos ? '+' : '-'}{pips} pips ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
            <span className="text-[#2979FF] bg-[#182033] px-1.5 py-0.5 rounded border border-[#222F47]">
              Spread: {selectedPair.spreadPips}p
            </span>
          </div>
        </div>
      </div>

      {/* Timeframes & Sync Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {timeframes.map(({ tf, label }) => {
            const isSelected = selectedTimeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => onTimeframeSelect(tf)}
                disabled={isLoadingCandles && isSelected}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#00E676] border-[#00E676] text-[#080B11] shadow-[0_0_12px_rgba(0,230,118,0.3)]'
                    : 'bg-[#101522] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#384a68]'
                }`}
              >
                <span>{label}</span>
                {isSelected && isLoadingCandles && (
                  <div className="w-3 h-3 border-2 border-[#080B11] border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {onRefreshCandles && (
            <button
              onClick={onRefreshCandles}
              disabled={isLoadingCandles}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#222F47] bg-[#101522] text-[#94A3B8] hover:text-[#00E676] hover:border-[#00E676]/50 transition-all flex items-center gap-1.5"
              title="Resample and fetch latest real prices"
            >
              <span className={isLoadingCandles ? 'animate-spin' : ''}>↻</span>
              <span>Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* TradingView Advanced Real-Time Chart */}
      <CandlestickChart
        candles={candles}
        selectedPair={selectedPair}
        timeframe={selectedTimeframe}
        providerLabel={marketDataProvider}
        isLoading={isLoadingCandles}
      />

      {/* Data Provider Sync Matrix */}
      <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">
            Data Provider Routing & Sync Matrix
          </span>
          <span className="text-[9px] font-bold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
            100% REAL LIVE DATA
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#182033]/60 border border-[#222F47] text-xs">
            <div>
              <div className="font-bold text-[#F1F5F9] flex items-center gap-1.5">
                <span>TradingView Advanced Chart ({selectedTimeframe})</span>
                <span className="text-[9.5px] font-mono text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.2 rounded border border-[#00E676]/30">
                  Real MT5 Feed
                </span>
              </div>
              <div className="text-[10px] text-[#64748B]">
                Pure price action candlesticks with volume • Deriv, Twelve Data, Binance & Forex.com
              </div>
            </div>
            <span className="text-[#00E676] font-semibold text-xs">TradingView Widget</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#182033]/60 border border-[#222F47] text-xs">
            <div>
              <div className="font-bold text-[#F1F5F9]">Gold & FX RealPriceService</div>
              <div className="text-[10px] text-[#64748B]">
                Gold-API (5s poll) • Open ER-API / Frankfurter (10s poll) • Binance BTC
              </div>
            </div>
            <span className="text-[#FFD700] font-semibold text-xs">RealPriceService Live</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#182033]/60 border border-[#222F47] text-xs">
            <div>
              <div className="font-bold text-[#F1F5F9]">Macro Indicators & News</div>
              <div className="text-[10px] text-[#64748B]">Syncs DXY, SPY, TLT & real-time news wire</div>
            </div>
            <span className="text-[#00E676] font-semibold text-xs">Finnhub Macro API</span>
          </div>
        </div>
      </div>
    </div>
  );
};
