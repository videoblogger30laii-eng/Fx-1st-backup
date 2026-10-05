import React, { useState, useEffect } from 'react';
import { TradingSession } from '../types';
import { getCurrentGmtTimeFormatted, getTradingSessions, isForexMarketOpen } from '../services/marketData';
import { Clock, Zap } from 'lucide-react';

interface Props {
  sessions?: TradingSession[];
}

export const TradingSessionsClock: React.FC<Props> = ({ sessions: initialSessions }) => {
  const [gmtTime, setGmtTime] = useState(() => getCurrentGmtTimeFormatted());
  const [currentSessions, setCurrentSessions] = useState<TradingSession[]>(() => {
    return initialSessions && initialSessions.length > 0 ? initialSessions : getTradingSessions();
  });
  const [marketOpen, setMarketOpen] = useState(() => isForexMarketOpen());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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
  const isLondonNyOverlap =
    currentSessions.some(s => s.id === 'LONDON' && s.isOpen) &&
    currentSessions.some(s => s.id === 'NEW_YORK' && s.isOpen);

  // Default inspected session: either user-clicked, or first open session, or London
  const inspectedSession =
    currentSessions.find(s => (selectedSessionId ? s.id === selectedSessionId : s.isOpen)) ||
    currentSessions[0];

  const compactGmt = (gmtHours: string) =>
    gmtHours.replace(':00', '').replace(':00', '').replace(' - ', '–');

  const compactCountdown = (text?: string, isOpen?: boolean) => {
    if (!text) return isOpen ? 'In progress' : 'Closed';
    return text
      .replace('Opens ', '')
      .replace('Closes in ', 'Left: ')
      .replace('Opens in ', 'In ');
  };

  return (
    <div className="bg-[#101522] border border-[#222F47] rounded-xl px-2.5 py-2 shadow-sm space-y-1.5">
      {/* Compact Header Row: Title, Market Status Pill & GMT Clock */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#2979FF] shrink-0" />
          <span className="text-[10.5px] font-black text-[#F1F5F9] tracking-wider uppercase">
            Global Sessions
          </span>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
              marketOpen
                ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                : 'bg-[#FF3366]/15 border-[#FF3366]/40 text-[#FF3366]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                marketOpen ? 'bg-[#00E676] animate-pulse' : 'bg-[#FF3366]'
              }`}
            />
            <span>
              {marketOpen
                ? `${openSessionsCount} Active`
                : 'Weekend Closed'}
            </span>
          </span>

          {isLondonNyOverlap && (
            <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black uppercase text-[#FFD700] bg-[#FFD700]/15 border border-[#FFD700]/40 px-1.5 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5" />
              <span>LDN/NY Overlap</span>
            </span>
          )}
        </div>

        <span className="text-[10px] font-mono text-[#FFD700] font-bold bg-[#182033] px-2 py-0.5 rounded border border-[#222F47]">
          {gmtTime}
        </span>
      </div>

      {/* 4-In-1 Row Compact Strip — All 4 Sessions Side-by-Side */}
      <div className="grid grid-cols-4 gap-1.5">
        {currentSessions.map(s => {
          const isInspected = inspectedSession?.id === s.id;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => setSelectedSessionId(s.id || s.name)}
              className={`p-1.5 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                s.isOpen
                  ? 'bg-gradient-to-b from-[#182436] to-[#0d131f] border-[#00E676]/60 ring-1 ring-[#00E676]/25'
                  : isInspected
                  ? 'bg-[#151D2E] border-[#2979FF]/60'
                  : 'bg-[#0B0F19] border-[#222F47]/70 hover:border-[#2979FF]/40'
              }`}
            >
              {s.isOpen && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00E676] to-[#2979FF]" />
              )}

              {/* Row 1: Flag + City + Status Dot */}
              <div className="flex items-center justify-between gap-0.5 w-full">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] leading-none shrink-0">{s.flag}</span>
                  <span className="text-[10px] font-black text-[#F1F5F9] truncate">
                    {s.city}
                  </span>
                </div>
                <span
                  className={`text-[7.5px] font-black px-1 py-0.2 rounded uppercase shrink-0 ${
                    s.isOpen
                      ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                      : 'bg-[#182033] text-[#64748B]'
                  }`}
                >
                  {s.isOpen ? 'OPEN' : 'CLSD'}
                </span>
              </div>

              {/* Row 2: Local Time & GMT Window */}
              <div className="flex items-center justify-between text-[8.5px] font-mono text-[#94A3B8] mt-1 leading-tight">
                <span>{s.localTime || '--:--'}</span>
                <span className="text-[#64748B]">{compactGmt(s.gmtHours)}</span>
              </div>

              {/* Row 3: Countdown / Next Open */}
              <div
                className={`text-[8.5px] font-mono font-bold truncate mt-0.5 leading-tight ${
                  s.isOpen ? 'text-[#00E676]' : 'text-[#FFD700]'
                }`}
                title={s.countdownText}
              >
                {compactCountdown(s.countdownText, s.isOpen)}
              </div>

              {/* Row 4: Traded Pairs & Volatility */}
              <div className="mt-1 pt-1 border-t border-[#222F47]/50 flex items-center justify-between gap-1 text-[8px] leading-tight">
                <span className="font-mono text-[#CBD5E1] truncate" title={s.activePairs}>
                  {s.activePairs}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Ultra-Sleek 1-Line Full Detail Strip for Inspected Session (Shows Every Aspect Clearly) */}
      {inspectedSession && (
        <div className="bg-[#0B0F19] border border-[#222F47]/80 rounded-lg px-2.5 py-1 flex items-center justify-between gap-2 flex-wrap text-[9.5px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#F1F5F9]">
              {inspectedSession.flag} {inspectedSession.city}:
            </span>
            <span className="font-mono text-[#94A3B8]">
              Local <strong className="text-[#F1F5F9]">{inspectedSession.localTime}</strong> ({inspectedSession.gmtHours})
            </span>
            <span className="text-[#64748B]">•</span>
            <span
              className={`font-mono font-bold ${
                inspectedSession.isOpen ? 'text-[#00E676]' : 'text-[#FFD700]'
              }`}
            >
              {inspectedSession.countdownText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] font-mono">
            <span className="text-[#94A3B8]">
              <strong className="text-[#CBD5E1]">Pairs:</strong> {inspectedSession.activePairs}
            </span>
            <span className="text-[#64748B]">•</span>
            <span className={inspectedSession.isOpen ? 'text-[#00E676] font-semibold' : 'text-[#64748B]'}>
              {inspectedSession.volatility}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
