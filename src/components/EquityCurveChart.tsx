import React, { useRef, useEffect } from 'react';

interface Props {
  equityPoints: number[];
}

export const EquityCurveChart: React.FC<Props> = ({ equityPoints }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const minEquity = Math.min(...equityPoints, 10000);
  const maxEquity = Math.max(...equityPoints, 10000);
  const range = maxEquity - minEquity > 0 ? maxEquity - minEquity : 1;
  const finalEquity = equityPoints[equityPoints.length - 1] || 10000;
  const isProfit = finalEquity >= 10000;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || equityPoints.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const stepX = width / (equityPoints.length - 1);

    // Gradient fill path
    ctx.beginPath();
    ctx.moveTo(0, height);

    equityPoints.forEach((eq, i) => {
      const x = i * stepX;
      const normalizedY = (eq - minEquity) / range;
      const y = height - normalizedY * (height * 0.82) - height * 0.08;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(width, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 230, 118, 0.28)');
    gradient.addColorStop(1, 'rgba(0, 230, 118, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    equityPoints.forEach((eq, i) => {
      const x = i * stepX;
      const normalizedY = (eq - minEquity) / range;
      const y = height - normalizedY * (height * 0.82) - height * 0.08;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#00E676';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }, [equityPoints, minEquity, range]);

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#94A3B8]">
          Simulated Account Growth ($10,000 Starting)
        </span>
        <span
          className={`text-sm font-bold font-mono ${
            isProfit ? 'text-[#00E676]' : 'text-[#FF3366]'
          }`}
        >
          ${finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="w-full h-40 relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
