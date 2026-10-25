import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TriggeredAlertEvent } from '../types';
import { BellRing, X, AlertTriangle, Target, Smartphone, ExternalLink } from 'lucide-react';

interface Props {
  event: TriggeredAlertEvent | null;
  onDismiss: () => void;
  onClickAlert: () => void;
}

const AUTO_DISMISS_DURATION_MS = 8000;

export const TriggeredAlertBanner: React.FC<Props> = ({ event, onDismiss, onClickAlert }) => {
  const [remainingPercent, setRemainingPercent] = useState<number>(100);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const handleSafeDismiss = useCallback(() => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss();
      setIsDismissing(false);
      setRemainingPercent(100);
    }, 180);
  }, [onDismiss]);

  // Audio & Haptic Feedback Effect
  useEffect(() => {
    if (!event) return;

    setIsDismissing(false);
    setRemainingPercent(100);

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
        // Standard price / TP alert
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
      // audio context blocked by browser autoplay policy
    }

    // Auto-dismiss countdown timer
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.max(0, 100 - (elapsed / AUTO_DISMISS_DURATION_MS) * 100);
      setRemainingPercent(progress);
      if (progress <= 0) {
        clearInterval(intervalRef.current);
      }
    }, 100);

    timerRef.current = setTimeout(() => {
      handleSafeDismiss();
    }, AUTO_DISMISS_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [event, handleSafeDismiss]);

  if (!event) return null;

  const isTriggered = event.condition === 'PENDING_ORDER_TRIGGERED';
  const isInvalidated = event.condition === 'PENDING_ORDER_INVALIDATED';
  const isTp = event.condition === ('TP_HIT' as any) || event.title.includes('Take Profit');
  const isSl = event.condition === ('SL_HIT' as any) || event.title.includes('Stop Loss');

  return (
    <div
      role="alert"
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg transition-all duration-200 ${
        isDismissing ? 'opacity-0 scale-95 -translate-y-2' : 'opacity-100 scale-100 translate-y-0'
      }`}
    >
      <div
        onClick={onClickAlert}
        className={`relative overflow-hidden rounded-2xl p-3.5 shadow-2xl flex items-center justify-between cursor-pointer transition-all border-2 select-none ${
          isTriggered || isTp
            ? 'bg-[#0A1612] border-[#00E676] shadow-[0_0_30px_rgba(0,230,118,0.35)]'
            : isInvalidated || isSl
            ? 'bg-[#1C0D11] border-[#FF3366] shadow-[0_0_30px_rgba(255,51,102,0.35)]'
            : 'bg-[#141C2E] border-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.3)]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 pr-1">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isTriggered || isTp
                ? 'bg-[#00E676]/20 text-[#00E676]'
                : isInvalidated || isSl
                ? 'bg-[#FF3366]/20 text-[#FF3366]'
                : 'bg-[#FFD700]/20 text-[#FFD700]'
            }`}
          >
            {isTriggered || isTp ? (
              <Target className="w-5 h-5 animate-pulse" />
            ) : isInvalidated || isSl ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <BellRing className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="text-left min-w-0">
            <div
              className={`text-xs font-black flex items-center gap-1.5 truncate ${
                isTriggered || isTp
                  ? 'text-[#00E676]'
                  : isInvalidated || isSl
                  ? 'text-[#FF3366]'
                  : 'text-[#FFD700]'
              }`}
            >
              <span className="truncate">{event.title}</span>
              {(isTriggered || isInvalidated) && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white font-mono flex items-center gap-1 shrink-0">
                  <Smartphone className="w-2.5 h-2.5" /> MT5
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-[#F1F5F9] font-medium mt-0.5 leading-snug line-clamp-2">
              {event.message}
            </div>
          </div>
        </div>

        {/* Action Controls Area */}
        <div className="flex items-center gap-2 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* High-visibility, accessible Close Button with minimum 36x36px touch target */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSafeDismiss();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleSafeDismiss();
            }}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/35 active:scale-90 text-white transition-all border border-white/20 cursor-pointer shadow-sm touch-manipulation"
            title="Close Alert"
            aria-label="Dismiss alert"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Auto-Dismiss Linear Progress Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className={`h-full transition-all duration-100 ${
              isTriggered || isTp
                ? 'bg-[#00E676]'
                : isInvalidated || isSl
                ? 'bg-[#FF3366]'
                : 'bg-[#FFD700]'
            }`}
            style={{ width: `${remainingPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
