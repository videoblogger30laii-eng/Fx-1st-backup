import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Shield } from 'lucide-react';

interface Props {
  equityPoints: number[];
  initialBalance?: number;
}

export const RealEquityCurveChart: React.FC<Props> = ({
  equityPoints,
  initialBalance = 10000
}) => {
  const points = equityPoints && equityPoints.length > 0 ? equityPoints : [initialBalance];
  const currentBalance = points[points.length - 1];
  const netPnl = currentBalance - initialBalance;
  const netPnlPercent = ((netPnl / initialBalance) * 100).toFixed(1);
  const isProfitable = netPnl >= 0;

  const minEquity = Math.min(...points, initialBalance * 0.95);
  const maxEquity = Math.max(...points, initialBalance * 1.05);
  const range = maxEquity - minEquity || 1;

  // Generate SVG path coordinates
  const width = 600;
  const height = 180;
  const paddingY = 20;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1 || 1)) * width;
    const y = height - paddingY - ((val - minEquity) / range) * (height - paddingY * 2);
    return { x, y };
  });

  const pathD = coords.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  // Baseline Y for initial balance ($10,000)
  const baselineY = height - paddingY - ((initialBalance - minEquity) / range) * (height - paddingY * 2);

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-3">
      {/* Title & Real Account Balance Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222F47]/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#00E676]" />
            <h3 className="text-xs font-black text-[#F1F5F9] uppercase tracking-wider">
              Real Account Balance & Equity Curve
            </h3>
            <span className="text-[10px] font-mono text-[#94A3B8] bg-[#182033] px-2 py-0.5 rounded border border-[#222F47]">
              Fixed 1.5R | 1% Risk ($100/trade)
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Mathematical account balance progression derived from real closed trades.
          </p>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-[#64748B] uppercase font-bold">Simulated Balance</div>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-lg font-mono font-black text-[#F1F5F9]">
              ${currentBalance.toLocaleString()}
            </span>
            <span
              className={`text-xs font-mono font-bold flex items-center ${
                isProfitable ? 'text-[#00E676]' : 'text-[#FF3366]'
              }`}
            >
              {isProfitable ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
              {netPnl >= 0 ? `+$${netPnl.toLocaleString()} (+${netPnlPercent}%)` : `-$${Math.abs(netPnl).toLocaleString()} (${netPnlPercent}%)`}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Equity Progression Chart */}
      <div className="relative w-full h-[180px] bg-[#090d16] rounded-lg overflow-hidden border border-[#222F47]/40">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="equityGradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E676" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00E676" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="equityGradRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF3366" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF3366" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={paddingY} x2={width} y2={paddingY} stroke="#222F47" strokeDasharray="3 3" opacity="0.4" />
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#222F47" strokeDasharray="3 3" opacity="0.4" />
          <line x1="0" y1={height - paddingY} x2={width} y2={height - paddingY} stroke="#222F47" strokeDasharray="3 3" opacity="0.4" />

          {/* Initial Balance $10,000 Baseline */}
          <line
            x1="0"
            y1={baselineY}
            x2={width}
            y2={baselineY}
            stroke="#64748B"
            strokeDasharray="4 4"
            strokeWidth="1.2"
            opacity="0.6"
          />

          {/* Gradient Fill under curve */}
          <path
            d={areaD}
            fill={isProfitable ? 'url(#equityGradGreen)' : 'url(#equityGradRed)'}
          />

          {/* Line curve */}
          <path
            d={pathD}
            fill="none"
            stroke={isProfitable ? '#00E676' : '#FF3366'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* End point marker */}
          {coords.length > 0 && (
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r="4.5"
              fill={isProfitable ? '#00E676' : '#FF3366'}
              stroke="#080B11"
              strokeWidth="2"
            />
          )}
        </svg>

        {/* Floating Labels on Chart */}
        <div className="absolute top-2 left-3 text-[10px] font-mono text-[#64748B] flex items-center gap-1.5">
          <span>Peak: ${Math.round(maxEquity).toLocaleString()}</span>
          <span>•</span>
          <span>Base: ${initialBalance.toLocaleString()}</span>
        </div>

        <div className="absolute bottom-2 right-3 text-[10px] font-mono text-[#94A3B8]">
          {points.length - 1} Closed Real Trades
        </div>
      </div>
    </div>
  );
};
