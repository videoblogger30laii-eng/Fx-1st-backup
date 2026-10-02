import React, { useState, useEffect } from 'react';
import { TradingSession } from '../types';
import { getCurrentGmtTimeFormatted, getTradingSessions, isForexMarketOpen } from '../services/marketData';
import { Clock, Zap, Radio, CheckCircle2 } from 'lucide-react';

interface Props {
  sessions?: TradingSession[];
}

export const TradingSessionsClock: React.FC<Props> = ({ sessions: initialSessions }) => {
  const [gmtTime, setGmtTime] = useState(() => getCurrentGmtTimeFormatted());
  const [currentSessions, setCurrentSessions] = useState<TradingSession[]>(() => {
    return initialSessions && initialSessions.length > 0 ? initialSessions : getTradingSessions();
  });
  const [marketOpen, setMarketOpen] = useState(() => isForexMarketOpen());

  // Continuously recalculate active/closed states based on current system clock
  useEffect(() => {
    const updateTick = () => {
      const now = new Date();
      setGmtTime(getCurrentGmtTimeFormatted(now));
      setCurrentSessions(getTradingSessions(now));
      setMarketOpen(isForexMarketOpen(now));
    };

    updateTick();
    const timer = setInterval(updateTick, 1000);
    return () => clearInterval(timer);
  }, []);

  const openSessionsCount = currentSessions.filter(s => s.isOpen).length;
  const isLondonNyOverlap = currentSessions.some(s => s.id === 'LONDON' && s.isOpen) &&
    currentSessions.some(s => s.id === 'NEW_YORK' && s.isOpen);

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 sm:p-3.5 shadow-sm space-y-3">
      {/* Top Header: Clock, Active Count & Market State */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#2979FF]" />
          <span className="text-[12px] font-black text-[#F1F5F9] tracking-wider uppercase">
            Global Trading Sessions
          </span>
          <span
            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
              marketOpen
                ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                : 'bg-[#FF3366]/15 border-[#FF3366]/40 text-[#FF3366]'
            }`}
          >
            {marketOpen ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]"></span>
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#FF3366]" />
            )}
            <span>
              {marketOpen
                ? `${openSessionsCount} Active Session${openSessionsCount !== 1 ? 's' : ''}`
                : 'Market Closed (Weekend)'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#FFD700] font-bold bg-[#182033] px-2.5 py-0.5 rounded-md border border-[#222F47]">
            {gmtTime}
          </span>
        </div>
      </div>

      {/* London / New York High Volume Overlap Banner */}
      {isLondonNyOverlap && (
        <div className="bg-gradient-to-r from-[#2979FF]/20 via-[#00E676]/20 to-[#FFD700]/20 border border-[#00E676]/50 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]"></span>
            </span>
            <Zap className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
            <span className="font-bold text-[#F1F5F9] text-[11px]">
              London / New York Overlap Active • Peak Institutional Liquidity (~70% Global Volume)
            </span>
          </div>
          <span className="text-[9.5px] font-black uppercase text-[#00E676] bg-[#00E676]/20 border border-[#00E676]/40 px-2 py-0.5 rounded shrink-0">
            Active Pulse
          </span>
        </div>
      )}

      {/* 4 Session Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {currentSessions.map(s => {
          return (
            <div
              key={s.name}
              className={`p-2.5 rounded-xl border text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                s.isOpen
                  ? 'bg-gradient-to-b from-[#182436] via-[#121a28] to-[#0d131f] border-[#00E676]/60 shadow-[0_0_18px_rgba(0,230,118,0.12)] ring-1 ring-[#00E676]/30'
                  : 'bg-[#0D121D] border-[#222F47]/70 opacity-90'
              }`}
            >
              {/* Luminous Top Accent Line for Open/Active Session */}
              {s.isOpen && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00E676] via-[#00E676]/90 to-[#2979FF]" />
              )}

              {/* Card Header: Flag, City, Local Time & Active Pulse Indicator */}
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{s.flag}</span>
                      <span className="text-xs font-black text-[#F1F5F9]">{s.city}</span>
                    </div>
                    {s.localTime && (
                      <span className="text-[10px] font-mono text-[#94A3B8]">
                        Local: {s.localTime}
                      </span>
                    )}
                  </div>

                  {/* Visual 'Active' Pulse Indicator */}
                  {s.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-[#00E676]/20 border border-[#00E676]/60 text-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.3)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]"></span>
                      </span>
                      <span>ACTIVE</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase bg-[#182033] border border-[#222F47] text-[#64748B]">
                      CLOSED
                    </span>
                  )}
                </div>

                {/* GMT Operating Hours */}
                <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-[#94A3B8]">
                  <span>{s.gmtHours}</span>
                </div>

                {/* Dynamic Countdown Text */}
                <div className="mt-1">
                  <span
                    className={`text-[10px] font-bold font-mono ${
                      s.isOpen ? 'text-[#00E676]' : 'text-[#FFD700]'
                    }`}
                  >
                    {s.countdownText || (s.isOpen ? 'Session in progress' : 'Awaiting open')}
                  </span>
                </div>

                {/* Session Progress Bar (Only visible when active) */}
                {s.isOpen && typeof s.progressPercent === 'number' && (
                  <div className="w-full bg-[#182033] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#222F47]/50">
                    <div
                      className="bg-gradient-to-r from-[#00E676] to-[#2979FF] h-full transition-all duration-1000 relative"
                      style={{ width: `${s.progressPercent}%` }}
                      title={`${s.progressPercent}% elapsed`}
                    >
                      <span className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-full animate-pulse" />
                    </div>
                  </div>
                )}
              </div>

              {/* Active Traded Pairs & Volatility */}
              <div className="mt-2.5 pt-2 border-t border-[#222F47]/60">
                {s.activePairs && (
                  <div className="text-[8.5px] font-mono text-[#94A3B8] truncate mb-0.5" title={s.activePairs}>
                    <strong className="text-[#CBD5E1]">Pairs:</strong> {s.activePairs}
                  </div>
                )}
                <div
                  className={`text-[8.5px] font-semibold truncate ${
                    s.isOpen ? 'text-[#00E676]' : 'text-[#64748B]'
                  }`}
                  title={s.volatility}
                >
                  {s.volatility}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
