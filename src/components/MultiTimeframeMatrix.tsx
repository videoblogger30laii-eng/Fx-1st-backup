import React, { useState, useMemo } from 'react';
import { ForexPair, AssetCategory, getAssetCategory } from '../types';
import { ALL_PAIRS } from '../services/marketData';
import {
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  LineChart,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  Zap
} from 'lucide-react';

interface Props {
  selectedPair?: ForexPair;
  allPairs?: ForexPair[];
  onSelectPair?: (pair: ForexPair) => void;
  onOpenLiveChart?: (pair: ForexPair) => void;
  onAskAi?: (pairSymbol: string) => void;
}

export const MultiTimeframeMatrix: React.FC<Props> = ({
  selectedPair,
  allPairs = ALL_PAIRS,
  onSelectPair,
  onOpenLiveChart,
  onAskAi
}) => {
  const [viewMode, setViewMode] = useState<'CURRENT' | 'ALL_30'>('CURRENT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const currentPair = selectedPair || allPairs[0];

  // Mock computed MTF for a specific pair
  const generatePairMtf = (symbol: string) => {
    const isGold = symbol.includes('XAU');
    const isJpy = symbol.includes('JPY');
    const isUsd = symbol.includes('USD');

    // Deterministic pseudo-confluence based on symbol
    const charCodeSum = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const isBull = charCodeSum % 2 === 0;

    return [
      { tf: '5M', trend: isBull ? 'BULLISH' : 'BEARISH', rsi: isBull ? 58.4 : 42.1, status: isBull ? 'BUY PULLBACK' : 'SELL RETEST', isBull },
      { tf: '15M', trend: isBull ? 'BULLISH' : 'BEARISH', rsi: isBull ? 62.1 : 39.5, status: isBull ? 'FVG MITIGATION' : 'FVG BREAKDOWN', isBull },
      { tf: '1H', trend: isBull ? 'BULLISH' : 'BEARISH', rsi: isBull ? 54.0 : 44.8, status: isBull ? 'ORDER BLOCK FILL' : 'SUPPLY REJECTION', isBull },
      { tf: '4H', trend: isBull ? 'BULLISH' : 'BEARISH', rsi: isBull ? 67.8 : 36.2, status: isBull ? 'STRUCTURE SHIFT' : 'LIQUIDITY SWEEP', isBull },
      { tf: '1D', trend: isBull ? 'BULLISH' : 'BEARISH', rsi: isBull ? 59.2 : 41.0, status: isBull ? 'MACRO EXPANSION' : 'MACRO DOWNTREND', isBull },
    ];
  };

  const currentMtf = useMemo(() => generatePairMtf(currentPair.symbol), [currentPair.symbol]);
  const currentBullCount = currentMtf.filter(m => m.isBull).length;

  // 30 Assets Matrix Data
  const fullMatrix = useMemo(() => {
    return allPairs.map(p => {
      const mtf = generatePairMtf(p.symbol);
      const bulls = mtf.filter(m => m.isBull).length;
      const bears = 5 - bulls;
      const confluenceScore = Math.round((Math.max(bulls, bears) / 5) * 100);
      const overallBias = bulls >= 3 ? 'BULLISH' : 'BEARISH';
      const category = getAssetCategory(p.symbol);

      return {
        pair: p,
        category,
        bulls,
        bears,
        confluenceScore,
        overallBias,
        isAligned: bulls === 5 || bears === 5,
        mtf
      };
    });
  }, [allPairs]);

  const filteredMatrix = useMemo(() => {
    return fullMatrix.filter(item => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.pair.symbol.toLowerCase().includes(q) || item.pair.name.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => b.confluenceScore - a.confluenceScore);
  }, [fullMatrix, selectedCategory, searchQuery]);

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-2xl p-4 space-y-3.5 text-left shadow-lg">
      {/* Header with Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222F47]/70 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#FFD700]" />
          <h3 className="text-xs sm:text-sm font-black text-[#F1F5F9] uppercase tracking-wider">
            Multi-Timeframe Heatmap Matrix
          </h3>
          <span className="text-[10px] font-bold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-full border border-[#00E676]/30">
            M5 • M15 • H1 • H4 • D1
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#090d16] p-1 rounded-xl border border-[#222F47]">
          <button
            type="button"
            onClick={() => setViewMode('CURRENT')}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'CURRENT'
                ? 'bg-[#2979FF] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {currentPair.symbol} View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ALL_30')}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'ALL_30'
                ? 'bg-[#00E676] text-[#080B11] shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            30-Asset Heatmap
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: SINGLE PAIR INSPECTION */}
      {viewMode === 'CURRENT' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F1F5F9]">{currentPair.symbol} Timeframe Alignment:</span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  currentBullCount >= 4
                    ? 'bg-[#00E676]/20 text-[#00E676]'
                    : currentBullCount <= 1
                    ? 'bg-[#FF3366]/20 text-[#FF3366]'
                    : 'bg-[#FFD700]/20 text-[#FFD700]'
                }`}
              >
                {currentBullCount}/5 {currentBullCount >= 3 ? 'Bullish Flow' : 'Bearish Flow'}
              </span>
            </div>

            {onAskAi && (
              <button
                type="button"
                onClick={() => onAskAi(currentPair.symbol)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#2979FF] hover:text-white bg-[#182033] hover:bg-[#2979FF]/20 px-2 py-1 rounded-lg border border-[#222F47] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#2979FF]" />
                <span>Audit in AI</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {currentMtf.map(m => (
              <div
                key={m.tf}
                className="bg-[#090d16] border border-[#222F47] rounded-xl p-2.5 text-center transition-all hover:border-[#222F47]/90"
              >
                <div className="text-[10px] font-mono font-bold text-[#94A3B8]">{m.tf} Timeframe</div>
                <div
                  className={`flex items-center justify-center gap-0.5 my-1 font-black text-xs ${
                    m.isBull ? 'text-[#00E676]' : 'text-[#FF3366]'
                  }`}
                >
                  {m.isBull ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>{m.trend}</span>
                </div>
                <div className="text-[9px] text-[#64748B] font-mono">RSI: {m.rsi}</div>
                <div
                  className={`text-[8.5px] truncate font-bold mt-1 px-1 py-0.5 rounded ${
                    m.isBull ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-[#FF3366]/10 text-[#FF3366]'
                  }`}
                >
                  {m.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL 30 ASSETS HEATMAP MATRIX */}
      {viewMode === 'ALL_30' && (
        <div className="space-y-3">
          {/* Search & Category Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['ALL', 'MAJORS', 'MINORS', 'METALS'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#2979FF] border-[#2979FF] text-white'
                      : 'bg-[#090d16] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative min-w-[140px]">
              <Search className="w-3 h-3 text-[#64748B] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter symbol..."
                className="w-full bg-[#090d16] border border-[#222F47] rounded-lg pl-7 pr-2 py-1 text-xs text-[#F1F5F9] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Grid of 30 Asset Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredMatrix.map(item => (
              <div
                key={item.pair.symbol}
                onClick={() => {
                  if (onSelectPair) onSelectPair(item.pair);
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  selectedPair?.symbol === item.pair.symbol
                    ? 'bg-[#182033] border-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.2)]'
                    : 'bg-[#090d16] border-[#222F47]/80 hover:border-[#222F47]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#F1F5F9]">{item.pair.symbol}</span>
                    <span className="text-[8.5px] font-bold text-[#64748B] uppercase px-1 py-0.2 rounded bg-[#101522]">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.isAligned && (
                      <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-[#00E676] text-[#080B11]">
                        100% ALIGNED
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        item.overallBias === 'BULLISH' ? 'text-[#00E676]' : 'text-[#FF3366]'
                      }`}
                    >
                      {item.bulls}/5 {item.overallBias === 'BULLISH' ? 'BUY' : 'SELL'}
                    </span>
                  </div>
                </div>

                {/* 5-Timeframe Mini Squares */}
                <div className="grid grid-cols-5 gap-1">
                  {item.mtf.map(m => (
                    <div
                      key={m.tf}
                      className={`p-1 rounded text-center font-mono text-[9px] font-bold ${
                        m.isBull
                          ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                          : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30'
                      }`}
                    >
                      {m.tf}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
