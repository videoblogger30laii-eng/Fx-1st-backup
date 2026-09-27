import React, { useEffect } from 'react';
import { TriggeredAlertEvent } from '../types';
import { BellRing, X } from 'lucide-react';

interface Props {
  event: TriggeredAlertEvent | null;
  onDismiss: () => void;
  onClickAlert: () => void;
}

export const TriggeredAlertBanner: React.FC<Props> = ({ event, onDismiss, onClickAlert }) => {
  useEffect(() => {
    if (event) {
      // Audio chime via Web Audio API synthesizer
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // A6
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch {
        // audio context failed or blocked by policy
      }
    }
  }, [event]);

  if (!event) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce">
      <div
        onClick={onClickAlert}
        className="bg-[#182033] border-2 border-[#FFD700] rounded-xl p-3 shadow-2xl flex items-center justify-between cursor-pointer hover:bg-[#222F47] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FFD700]/20 text-[#FFD700]">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black text-[#FFD700]">{event.title}</div>
            <div className="text-[11px] text-[#F1F5F9] font-medium">{event.message}</div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
