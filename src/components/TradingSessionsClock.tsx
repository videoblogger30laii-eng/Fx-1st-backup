import React, { useState, useEffect } from 'react';
import { TradingSession } from '../types';
import { getCurrentGmtTimeFormatted } from '../services/marketData';
import { Clock } from 'lucide-react';

interface Props {
  sessions: TradingSession[];
}

export const TradingSessionsClock: React.FC<Props> = ({ sessions }) => {
  const [gmtTime, setGmtTime] = useState(getCurrentGmtTimeFormatted());

  useEffect(() => {
    const timer = setInterval(() => {
      setGmtTime(getCurrentGmtTimeFormatted());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#2979FF]" />
          <span className="text-[11px] font-bold text-[#F1F5F9] tracking-wider uppercase">
            Global Trading Sessions
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#FFD700] font-semibold bg-[#182033] px-2 py-0.5 rounded border border-[#222F47]">
          {gmtTime}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sessions.map(s => (
          <div
            key={s.name}
            className={`p-2 rounded-lg border text-left transition-all ${
              s.isOpen
                ? 'bg-[#182033] border-[#00E676]/30 shadow-[0_0_10px_rgba(0,230,118,0.06)]'
                : 'bg-[#101522] border-[#222F47]/60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#F1F5F9]">{s.city}</span>
              <span
                className={`text-[8.5px] font-black px-1.5 py-0.2 rounded ${
                  s.isOpen ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-[#222F47] text-[#64748B]'
                }`}
              >
                {s.isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <div className="text-[9.5px] text-[#94A3B8] font-mono">{s.gmtHours}</div>
            <div
              className={`text-[8.5px] truncate mt-1 ${
                s.isOpen ? 'text-[#00E676]' : 'text-[#64748B]'
              }`}
            >
              {s.volatility}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
