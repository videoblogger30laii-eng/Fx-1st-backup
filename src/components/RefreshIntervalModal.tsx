import React from 'react';
import { RefreshIntervalSeconds, REFRESH_INTERVALS } from '../types';
import { X, Clock, Check } from 'lucide-react';

interface Props {
  currentInterval: RefreshIntervalSeconds;
  onSelect: (sec: RefreshIntervalSeconds) => void;
  onDismiss: () => void;
}

export const RefreshIntervalModal: React.FC<Props> = ({
  currentInterval,
  onSelect,
  onDismiss
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#101522] border border-[#222F47] rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47] mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2979FF]" />
            <span className="text-base font-bold text-[#F1F5F9]">Refresh Cadence</span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {REFRESH_INTERVALS.map(item => {
            const isSelected = currentInterval === item.seconds;
            return (
              <button
                key={item.seconds}
                onClick={() => {
                  onSelect(item.seconds);
                  onDismiss();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#182033] border-[#2979FF] text-[#2979FF] font-bold'
                    : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <span className="text-xs">{item.label}</span>
                {isSelected && <Check className="w-4 h-4 text-[#2979FF]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
