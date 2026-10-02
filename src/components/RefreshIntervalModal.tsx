import React from 'react';
import { RefreshIntervalSeconds, REFRESH_INTERVALS } from '../types';
import { X, Clock, Check, Zap, BatteryCharging, PauseCircle, Activity, Gauge } from 'lucide-react';

interface Props {
  currentInterval: RefreshIntervalSeconds;
  onSelect: (sec: RefreshIntervalSeconds) => void;
  onDismiss: () => void;
  quotaUsed: number;
  quotaLimit: number;
  lastSyncFormatted: string;
}

export const RefreshIntervalModal: React.FC<Props> = ({
  currentInterval,
  onSelect,
  onDismiss,
  quotaUsed,
  quotaLimit,
  lastSyncFormatted
}) => {
  const percentUsed = Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));
  const isPaused = currentInterval === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0B0F19] border border-[#222F47] rounded-2xl max-w-md w-full p-5 shadow-2xl text-left flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47] mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2979FF]" />
            <div>
              <span className="text-base font-black text-[#F1F5F9]">Refresh Cadence & Quota Saver</span>
              <div className="text-[11px] text-[#94A3B8]">Manage API polling frequency & conserve daily quota</div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quota Progress Bar */}
        <div className="mb-4 bg-[#101522] p-3 rounded-xl border border-[#222F47]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-bold text-[#F1F5F9]">
              <Gauge className="w-4 h-4 text-[#2979FF]" />
              <span>Daily Rate Quota:</span>
            </span>
            <span className="font-mono font-bold text-[#FFD700]">
              Used: {quotaUsed}/{quotaLimit} today
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-[#182033] h-2 rounded-full overflow-hidden mb-1.5 border border-[#222F47]/50">
            <div
              className={`h-full transition-all duration-500 ${
                percentUsed > 85
                  ? 'bg-[#FF3366]'
                  : percentUsed > 60
                  ? 'bg-[#FFD700]'
                  : 'bg-gradient-to-r from-[#00E676] to-[#2979FF]'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
            <span>{quotaLimit - quotaUsed} calls remaining</span>
            <span>Last sync: <strong className="text-[#F1F5F9] font-mono">{lastSyncFormatted}</strong></span>
          </div>
        </div>

        {/* Cadence Options */}
        <div className="space-y-1.5 mb-2 max-h-[52vh] overflow-y-auto pr-0.5">
          {REFRESH_INTERVALS.map(item => {
            const isSelected = currentInterval === item.seconds;
            return (
              <button
                key={item.seconds}
                onClick={() => {
                  onSelect(item.seconds);
                  onDismiss();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? item.seconds === 0
                      ? 'bg-[#FF3366]/15 border-[#FF3366] text-[#FF3366] font-bold shadow-[0_0_12px_rgba(255,51,102,0.2)]'
                      : 'bg-[#2979FF]/15 border-[#2979FF] text-[#2979FF] font-bold shadow-[0_0_12px_rgba(41,121,255,0.2)]'
                    : 'bg-[#101522] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.seconds === 0 ? (
                    <PauseCircle className={`w-4 h-4 ${isSelected ? 'text-[#FF3366]' : 'text-[#94A3B8]'}`} />
                  ) : item.seconds >= 300 ? (
                    <BatteryCharging className={`w-4 h-4 ${isSelected ? 'text-[#00E676]' : 'text-[#00E676]/70'}`} />
                  ) : (
                    <Activity className={`w-4 h-4 ${isSelected ? 'text-[#2979FF]' : 'text-[#64748B]'}`} />
                  )}
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {item.isDefault && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                          Recommended
                        </span>
                      )}
                      {item.isPaused && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40">
                          0 Calls
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <Check className={`w-4 h-4 shrink-0 ${item.seconds === 0 ? 'text-[#FF3366]' : 'text-[#2979FF]'}`} />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-[#222F47]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Quick Status Note */}
        <div className="pt-2 border-t border-[#222F47] text-[10.5px] text-[#94A3B8] flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#FFD700]" />
            Auto-pauses when tab is hidden or minimized
          </span>
          <span className="font-mono text-[#F1F5F9]">
            {isPaused ? 'Current: PAUSED' : `Active: ${currentInterval >= 60 ? `${currentInterval / 60}m` : `${currentInterval}s`}`}
          </span>
        </div>
      </div>
    </div>
  );
};
