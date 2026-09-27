import React from 'react';
import { ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

export const MultiTimeframeMatrix: React.FC = () => {
  const matrix = [
    { tf: '5M', trend: 'BULLISH', rsi: 58.4, macd: '+0.0012', status: 'BUY RETEST', isBull: true },
    { tf: '15M', trend: 'BULLISH', rsi: 62.1, macd: '+0.0028', status: 'FVG MITIGATION', isBull: true },
    { tf: '1H', trend: 'BULLISH', rsi: 54.0, macd: '+0.0041', status: 'ORDER BLOCK FILL', isBull: true },
    { tf: '4H', trend: 'BULLISH', rsi: 67.8, macd: '+0.0094', status: 'STRUCTURE BREAK', isBull: true },
    { tf: '1D', trend: 'BULLISH', rsi: 59.2, macd: '+0.0150', status: 'MACRO EXPANSION', isBull: true },
  ];

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#FFD700]" />
          <span className="text-[11px] font-bold text-[#F1F5F9] uppercase tracking-wider">
            Multi-Timeframe Institutional Matrix
          </span>
        </div>
        <span className="text-[9.5px] font-bold text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5 rounded border border-[#00E676]/30">
          5/5 Strong Confluence
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {matrix.map(m => (
          <div
            key={m.tf}
            className="bg-[#182033] border border-[#222F47] rounded-lg p-2 text-center"
          >
            <div className="text-[10px] font-mono font-bold text-[#94A3B8]">{m.tf}</div>
            <div className="flex items-center justify-center gap-0.5 my-0.5 text-[#00E676]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black">BULL</span>
            </div>
            <div className="text-[8.5px] text-[#64748B] font-mono">RSI: {m.rsi}</div>
            <div className="text-[7.5px] text-[#00E676] truncate font-semibold mt-0.5">
              {m.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
