import React, { useState } from 'react';
import { soundFx, SOUND_THEMES, SoundTheme } from '../services/soundFxService';
import {
  X,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  Bell,
  ShieldAlert,
  Sparkles,
  Zap,
  Sliders
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState<SoundTheme>(() => soundFx.getTheme());
  const [volume, setVolume] = useState<number>(() => soundFx.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFx.getMuted());

  if (!isOpen) return null;

  const handleSelectTheme = (theme: SoundTheme) => {
    setSelectedTheme(theme);
    soundFx.setTheme(theme);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundFx.setVolume(newVol);
  };

  const handleToggleMute = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn text-left">
      <div className="bg-[#0D111C] border border-[#222F47] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2979FF]/20 border border-[#2979FF]/40 flex items-center justify-center text-[#2979FF]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wide">
                Institutional Audio Chimes & Sound FX
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Select acoustic theme and preview terminal trade event alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Master Volume & Mute Row */}
          <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-[#FF3366]/20 border-[#FF3366]/50 text-[#FF3366]'
                    : 'bg-[#00E676]/20 border-[#00E676]/50 text-[#00E676]'
                }`}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div>
                <div className="text-xs font-bold text-[#F1F5F9]">
                  {isMuted ? 'Sound Alerts Muted' : 'Sound Alerts Active'}
                </div>
                <div className="text-[10px] text-[#64748B]">
                  {isMuted ? 'Tap to unmute' : `Volume: ${Math.round(volume * 100)}%`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-[160px]">
              <VolumeX className="w-3 h-3 text-[#64748B]" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={isMuted}
                value={volume}
                onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#182033] rounded-lg appearance-none cursor-pointer accent-[#00E676]"
              />
              <Volume2 className="w-3 h-3 text-[#00E676]" />
            </div>
          </div>

          {/* Sound Themes Grid */}
          <div className="space-y-2">
            <div className="text-[10.5px] font-bold uppercase text-[#64748B] tracking-wider">
              Select Sound Chime Theme
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SOUND_THEMES.map(theme => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#182033] border-[#00E676] text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.15)]'
                        : 'bg-[#101522] border-[#222F47] text-[#94A3B8] hover:border-[#222F47]/90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#F1F5F9]">{theme.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />}
                    </div>
                    <p className="text-[10px] text-[#94A3B8] leading-relaxed">{theme.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio Chime Previews */}
          <div className="space-y-2 pt-1">
            <div className="text-[10.5px] font-bold uppercase text-[#64748B] tracking-wider">
              Test & Preview Chimes
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => soundFx.playTpChime()}
                className="p-2.5 rounded-lg bg-[#101522] hover:bg-[#182033] border border-[#222F47] hover:border-[#00E676]/40 flex items-center justify-between text-xs text-[#F1F5F9] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#00E676]" />
                  <span className="font-bold">Take Profit (TP)</span>
                </div>
                <Play className="w-3 h-3 text-[#00E676]" />
              </button>

              <button
                type="button"
                onClick={() => soundFx.playStopLossSound()}
                className="p-2.5 rounded-lg bg-[#101522] hover:bg-[#182033] border border-[#222F47] hover:border-[#FF3366]/40 flex items-center justify-between text-xs text-[#F1F5F9] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#FF3366]" />
                  <span className="font-bold">Stop Loss (SL)</span>
                </div>
                <Play className="w-3 h-3 text-[#FF3366]" />
              </button>

              <button
                type="button"
                onClick={() => soundFx.playOrderFilled()}
                className="p-2.5 rounded-lg bg-[#101522] hover:bg-[#182033] border border-[#222F47] hover:border-[#2979FF]/40 flex items-center justify-between text-xs text-[#F1F5F9] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#2979FF]" />
                  <span className="font-bold">Order Filled</span>
                </div>
                <Play className="w-3 h-3 text-[#2979FF]" />
              </button>

              <button
                type="button"
                onClick={() => soundFx.playVipSignalPing()}
                className="p-2.5 rounded-lg bg-[#101522] hover:bg-[#182033] border border-[#222F47] hover:border-[#FFD700]/40 flex items-center justify-between text-xs text-[#F1F5F9] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span className="font-bold">VIP Alert</span>
                </div>
                <Play className="w-3 h-3 text-[#FFD700]" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-[#080B11] bg-[#00E676] hover:bg-[#00E676]/90 transition-all cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
