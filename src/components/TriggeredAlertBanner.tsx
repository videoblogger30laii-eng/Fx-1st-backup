import React, { useEffect } from 'react';
import { TriggeredAlertEvent } from '../types';
import { WhatsAppAlertService } from '../services/WhatsAppAlertService';
import { BellRing, X, CheckCircle2, AlertTriangle, Target, Smartphone } from 'lucide-react';

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

        if (event.condition === 'PENDING_ORDER_TRIGGERED') {
          // Double upbeat fanfare for order fill
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5
          osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.24); // D6
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.5);

          // Mobile device vibration
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([120, 80, 150]);
          }
        } else if (event.condition === 'PENDING_ORDER_INVALIDATED') {
          // Low descending warning chime
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
          osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.35); // A3
          gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.45);

          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([250, 100, 250]);
          }
        } else {
          // Standard price alert
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // A6
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);

          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(100);
          }
        }
      } catch {
        // audio context failed or blocked by policy
      }
    }
  }, [event]);

  if (!event) return null;

  const isTriggered = event.condition === 'PENDING_ORDER_TRIGGERED';
  const isInvalidated = event.condition === 'PENDING_ORDER_INVALIDATED';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-bounce">
      <div
        onClick={onClickAlert}
        className={`rounded-2xl p-3.5 shadow-2xl flex items-center justify-between cursor-pointer transition-all border-2 ${
          isTriggered
            ? 'bg-[#0A1612] border-[#00E676] shadow-[0_0_25px_rgba(0,230,118,0.35)]'
            : isInvalidated
            ? 'bg-[#1C0D11] border-[#FF3366] shadow-[0_0_25px_rgba(255,51,102,0.35)]'
            : 'bg-[#182033] border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.25)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isTriggered
                ? 'bg-[#00E676]/20 text-[#00E676]'
                : isInvalidated
                ? 'bg-[#FF3366]/20 text-[#FF3366]'
                : 'bg-[#FFD700]/20 text-[#FFD700]'
            }`}
          >
            {isTriggered ? (
              <Target className="w-5 h-5 animate-pulse" />
            ) : isInvalidated ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <BellRing className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="text-left">
            <div
              className={`text-xs font-black flex items-center gap-1.5 ${
                isTriggered
                  ? 'text-[#00E676]'
                  : isInvalidated
                  ? 'text-[#FF3366]'
                  : 'text-[#FFD700]'
              }`}
            >
              <span>{event.title}</span>
              {(isTriggered || isInvalidated) && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white font-mono flex items-center gap-1">
                  <Smartphone className="w-2.5 h-2.5" /> MT5 Mobile
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-[#F1F5F9] font-medium mt-0.5 leading-snug">
              {event.message}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const waUrl = WhatsAppAlertService.getDirectChatUrl(
                `*${event.title}*\n\n${event.message}\n\nTime: ${new Date(event.timestamp).toLocaleTimeString()}`
              );
              window.open(waUrl, '_blank');
            }}
            className="px-2 py-1 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] transition-colors flex items-center gap-1 text-[10.5px] font-bold border border-[#25D366]/40"
            title="Open or Send Alert to WhatsApp"
          >
            <span>💬</span>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

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
    </div>
  );
};
