// Enhanced Institutional Audio Sound FX Synthesizer with Selectable Sound Themes (Web Audio API)

export type SoundTheme = 'BLOOMBERG' | 'FINTECH' | 'STEALTH' | 'CYBERPUNK';

export interface SoundThemeConfig {
  id: SoundTheme;
  label: string;
  description: string;
}

export const SOUND_THEMES: SoundThemeConfig[] = [
  { id: 'BLOOMBERG', label: '🏛️ Institutional Terminal', description: 'Classic financial terminal harmonic bells & alerts' },
  { id: 'FINTECH', label: '💳 Modern Gold & Cash', description: 'Upbeat major chords & gold bell dings for winning trades' },
  { id: 'STEALTH', label: '🔕 Stealth & Subtle', description: 'Muted high-frequency micro-ticks for discreet trading' },
  { id: 'CYBERPUNK', label: '⚡ Cyber Synthwave', description: 'Dynamic synth sweeps & digital radar acoustics' },
];

class SoundFxService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private currentTheme: SoundTheme = 'BLOOMBERG';

  constructor() {
    try {
      const savedMute = localStorage.getItem('fx_sound_muted');
      if (savedMute !== null) this.isMuted = JSON.parse(savedMute);

      const savedVol = localStorage.getItem('fx_sound_volume');
      if (savedVol !== null) this.volume = parseFloat(savedVol) || 0.5;

      const savedTheme = localStorage.getItem('fx_sound_theme') as SoundTheme;
      if (savedTheme && SOUND_THEMES.some(t => t.id === savedTheme)) {
        this.currentTheme = savedTheme;
      }
    } catch {
      // ignore
    }
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('fx_sound_muted', JSON.stringify(this.isMuted));
    } catch {}
    if (!this.isMuted) {
      this.playAlertPing();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('fx_sound_volume', String(this.volume));
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setTheme(theme: SoundTheme) {
    this.currentTheme = theme;
    try {
      localStorage.setItem('fx_sound_theme', theme);
    } catch {}
    this.playTpChime();
  }

  public getTheme(): SoundTheme {
    return this.currentTheme;
  }

  // 1. Upbeat Take Profit 1 / 2 / 3 Chime
  public playTpChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (this.currentTheme === 'FINTECH') {
      // Cash Register Gold Ding (C6 -> G6 -> C7)
      [1046.5, 1567.98, 2093.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.28 * this.volume, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.55);
      });
    } else if (this.currentTheme === 'STEALTH') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now);
      gain.gain.setValueAtTime(0.15 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (this.currentTheme === 'CYBERPUNK') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.2 * this.volume, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } else {
      // Default BLOOMBERG Major Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.25 * this.volume, now + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    }
  }

  // 2. Crisp Dual Ping for Order Execution / Filled
  public playOrderFilled() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [440, 880];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.3 * this.volume, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  }

  // 3. Subdued Warning Tone for Stop Loss
  public playStopLossSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [220, 185]; // A3 -> F#3

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.18 * this.volume, now + idx * 0.15 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.4);
    });
  }

  // 4. Subtle Radar Ping for Price Alert Triggered
  public playAlertPing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22 * this.volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // 5. VIP A+ Confluence Alert Ping
  public playVipSignalPing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.24 * this.volume, now + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.4);
    });
  }

  // 6. Protective Break-Even (Risk-Free Shield) Chime
  public playBreakEvenSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.22 * this.volume, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  }
}

export const soundFx = new SoundFxService();
