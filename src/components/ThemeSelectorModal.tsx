import React, { useState, useEffect } from 'react';
import {
  visualThemeService,
  VISUAL_THEMES,
  VisualTheme,
  VisualThemeConfig
} from '../services/themeService';
import {
  X,
  Palette,
  CheckCircle2,
  Layers,
  Cpu,
  Zap,
  Sliders,
  TrendingUp
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTheme, setActiveTheme] = useState<VisualTheme>(() => visualThemeService.getTheme());

  useEffect(() => {
    return visualThemeService.subscribe((theme) => {
      setActiveTheme(theme);
    });
  }, []);

  if (!isOpen) return null;

  const handleSelectTheme = (themeId: VisualTheme) => {
    setActiveTheme(themeId);
    visualThemeService.setTheme(themeId, true);
  };

  const getThemeIcon = (theme: VisualThemeConfig) => {
    switch (theme.id) {
      case 'CLAYMORPHISM_WHITE':
        return <Palette className="w-5 h-5 text-[#2563EB]" />;
      case 'NEUMORPHISM':
        return <Layers className="w-5 h-5 text-[#38BDF8]" />;
      case 'SKEUOMORPHIC':
        return <Sliders className="w-5 h-5 text-[#F59E0B]" />;
      case 'CYBERPUNK':
        return <Zap className="w-5 h-5 text-[#00F0FF]" />;
      case 'DARK_PRO':
      default:
        return <Cpu className="w-5 h-5 text-[#00E676]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn text-left">
      <div className="bg-[#0D111C] border border-[#222F47] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2979FF]/20 to-[#FFD700]/20 border border-[#2979FF]/40 flex items-center justify-center text-[#2979FF]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#F1F5F9] tracking-wide">
                  Visual Theme Studio & Surface Physics
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2979FF]/15 border border-[#2979FF]/30 text-[#60A5FA]">
                  {VISUAL_THEMES.length} Live Architectures
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Click any theme to transform cards, inset wells, shadows, and buttons in real time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Horizontal Preset Switcher Strip */}
        <div className="px-4 py-2.5 bg-[#080B11] border-b border-[#222F47] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-[#94A3B8] whitespace-nowrap mr-1">
            Live Switch:
          </span>
          {VISUAL_THEMES.map((theme) => {
            const isSelected = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#2979FF] text-white shadow-md'
                    : 'bg-[#182033] text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isSelected ? '#FFFFFF' : theme.accentColor }}
                />
                <span>{theme.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Theme Grid */}
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VISUAL_THEMES.map((theme) => {
              const isSelected = activeTheme === theme.id;
              const isLight = Boolean(theme.isLight);

              return (
                <div
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  style={{
                    background: theme.cardStyleSample.canvasBg,
                    borderColor: isSelected ? theme.accentColor : isLight ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.12)',
                    boxShadow: isSelected ? `0 0 22px ${theme.glowColor}` : 'none'
                  }}
                  className="p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Active Ribbon / Indicator */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold text-[#00E676] bg-black/65 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#00E676]/50">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ACTIVE</span>
                    </div>
                  )}

                  {/* Theme Header Info */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center border"
                        style={{
                          backgroundColor: `${theme.accentColor}22`,
                          borderColor: `${theme.accentColor}50`,
                        }}
                      >
                        {getThemeIcon(theme)}
                      </div>
                      <div>
                        <h4
                          className="text-xs font-black tracking-wide"
                          style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}
                        >
                          {theme.name}
                        </h4>
                        <p
                          className="text-[10px] font-medium leading-tight"
                          style={{ color: isLight ? '#475569' : '#CBD5E1' }}
                        >
                          {theme.tagline}
                        </p>
                      </div>
                    </div>

                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: isLight ? '#334155' : 'rgba(203, 213, 225, 0.9)' }}
                    >
                      {theme.description}
                    </p>
                  </div>

                  {/* True-to-Life Miniature Theme Surface Card */}
                  <div
                    className="p-3 mb-3 transition-all"
                    style={{
                      background: theme.cardStyleSample.bg,
                      border: theme.cardStyleSample.border,
                      boxShadow: theme.cardStyleSample.shadow,
                      borderRadius: theme.cardStyleSample.radius
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                      <div
                        className="flex items-center gap-1.5 font-black"
                        style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}
                      >
                        <span>XAU/USD</span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                          style={{
                            backgroundColor: isLight ? 'rgba(5, 150, 105, 0.15)' : 'rgba(0, 230, 118, 0.2)',
                            color: isLight ? '#059669' : '#00E676'
                          }}
                        >
                          BUY
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-bold flex items-center gap-0.5"
                        style={{ color: isLight ? '#059669' : '#00E676' }}
                      >
                        <TrendingUp className="w-3 h-3" />
                        +120.0 pips
                      </span>
                    </div>

                    {/* Recessed Inset Well Preview */}
                    <div
                      className="p-2 mb-2 flex items-center justify-between text-[10px] font-mono"
                      style={{
                        color: isLight ? '#1E293B' : '#E2E8F0',
                        background: theme.cardStyleSample.insetBg,
                        borderRadius: isLight ? '12px' : '8px',
                        boxShadow:
                          theme.id === 'CLAYMORPHISM_WHITE'
                            ? 'inset 3px 3px 7px rgba(163, 177, 198, 0.55), inset -3px -3px 7px #FFFFFF'
                            : theme.id === 'NEUMORPHISM'
                            ? 'inset 4px 4px 8px #0e131c, inset -3px -3px 7px #273248'
                            : theme.id === 'SKEUOMORPHIC'
                            ? 'inset 0 3px 8px rgba(0,0,0,0.95)'
                            : 'inset 0 1px 3px rgba(0,0,0,0.5)',
                        border:
                          theme.id === 'CYBERPUNK'
                            ? '1px solid rgba(255,0,127,0.5)'
                            : isLight
                            ? '1px solid rgba(255,255,255,0.85)'
                            : '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      <span>Entry: 4,838.20</span>
                      <span
                        className="font-bold"
                        style={{ color: isLight ? '#059669' : '#00E676' }}
                      >
                        TP1: 4,885.00
                      </span>
                    </div>

                    {/* Tactile Button Preview */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[9.5px] font-bold px-2 py-1 rounded"
                        style={{
                          color: isLight ? '#1E293B' : '#FFFFFF',
                          background: theme.cardStyleSample.buttonBg,
                          border: theme.cardStyleSample.buttonBorder,
                          boxShadow: theme.cardStyleSample.buttonShadow
                        }}
                      >
                        {theme.badge}
                      </span>
                      <span
                        className="text-[10px] font-black"
                        style={{ color: theme.accentColor }}
                      >
                        {isSelected ? '✓ Applied' : 'Click to Apply →'}
                      </span>
                    </div>
                  </div>

                  {/* Key Feature Bullets */}
                  <div
                    className="space-y-1 text-[10px]"
                    style={{ color: isLight ? '#334155' : '#CBD5E1' }}
                  >
                    {theme.keyFeatures.slice(0, 2).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span>Active Design System:</span>
            <span className="font-black text-white">
              {visualThemeService.getThemeConfig(activeTheme).name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#2979FF] hover:bg-[#1E60D0] text-white text-xs font-bold active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Done & View Live Terminal
          </button>
        </div>
      </div>
    </div>
  );
};
