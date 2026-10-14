import { soundFx } from './soundFxService';

export type VisualTheme =
  | 'CLAYMORPHISM_WHITE'
  | 'NEUMORPHISM'
  | 'SKEUOMORPHIC'
  | 'CYBERPUNK'
  | 'DARK_PRO';

export interface VisualThemeConfig {
  id: VisualTheme;
  dataTheme: string;
  name: string;
  shortLabel: string;
  tagline: string;
  category: 'White Clay 3D' | 'Soft UI 3D' | 'Tactile Hardware' | 'Synthwave HUD' | 'Institutional OLED';
  description: string;
  badge: string;
  accentColor: string;
  glowColor: string;
  isLight?: boolean;
  cardStyleSample: {
    canvasBg: string;
    bg: string;
    insetBg: string;
    border: string;
    shadow: string;
    radius: string;
    buttonBg: string;
    buttonBorder: string;
    buttonShadow: string;
  };
  keyFeatures: string[];
}

export const VISUAL_THEMES: VisualThemeConfig[] = [
  {
    id: 'CLAYMORPHISM_WHITE',
    dataTheme: 'claymorphism_white',
    name: 'Claymorphism (Pure White 3D)',
    shortLabel: 'White Clay',
    tagline: 'Sculpted Porcelain White Clay & Fluffy 3D Inner Rims',
    category: 'White Clay 3D',
    description: 'Airy porcelain-white 3D clay surfaces with puffy 24px rounded geometry, dual inner clay rim shadows, soft floating ambient drop shadows, and sculpted concave price wells.',
    badge: '3D White Clay',
    accentColor: '#2563EB',
    glowColor: 'rgba(37, 99, 235, 0.28)',
    isLight: true,
    cardStyleSample: {
      canvasBg: '#EEF2F9',
      bg: 'linear-gradient(145deg, #FFFFFF 0%, #F5F8FF 100%)',
      insetBg: '#E6ECF7',
      border: '1.5px solid rgba(255, 255, 255, 0.95)',
      shadow: '0 14px 28px rgba(148, 163, 184, 0.32), inset 3px 3px 7px #FFFFFF, inset -5px -5px 12px rgba(186, 198, 218, 0.65)',
      radius: '24px',
      buttonBg: 'linear-gradient(145deg, #FFFFFF, #E9EFFA)',
      buttonBorder: '1px solid rgba(255, 255, 255, 0.9)',
      buttonShadow: '0 6px 12px rgba(148, 163, 184, 0.28), inset 2px 2px 4px #FFFFFF, inset -3px -3px 6px rgba(176, 190, 212, 0.55)'
    },
    keyFeatures: [
      'Pure porcelain-white 3D clay cards with dual inner rim shadows',
      'Fluffy 24px sculpted corners & floating pastel drop shadows',
      'Concave porcelain inset price trays & tactile 3D clay buttons',
      'High-contrast deep slate typography with emerald & cobalt accents'
    ]
  },
  {
    id: 'NEUMORPHISM',
    dataTheme: 'neumorphism',
    name: 'Neumorphism (Soft UI)',
    shortLabel: 'Neumorphic',
    tagline: 'Embossed 3D Clay Surfaces & Deep Sunken Wells',
    category: 'Soft UI 3D',
    description: 'Velvety matte slate-clay surfaces with dramatic dual opposing light & dark shadows. Cards extrude outward from the canvas while price grids and search bars are carved inward as concave sunken wells.',
    badge: '3D Soft Extrusion',
    accentColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    cardStyleSample: {
      canvasBg: '#21293A',
      bg: 'linear-gradient(145deg, #263044, #1e2535)',
      insetBg: '#19202E',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      shadow: '8px 8px 16px #11161f, -6px -6px 14px rgba(255, 255, 255, 0.09)',
      radius: '20px',
      buttonBg: 'linear-gradient(145deg, #283248, #1d2434)',
      buttonBorder: '1px solid rgba(255,255,255,0.09)',
      buttonShadow: '4px 4px 8px #11161f, -3px -3px 7px rgba(255,255,255,0.08)'
    },
    keyFeatures: [
      'True dual-shadow 3D extrusion (upper-left light, lower-right shadow)',
      'Deeply carved concave inset price & timer trays',
      'Pillowy 22px soft rounded corners & tactile cushion buttons',
      'Velvety mid-tone slate canvas so both shadows & highlights pop'
    ]
  },
  {
    id: 'SKEUOMORPHIC',
    dataTheme: 'skeuomorphic',
    name: 'Skeuomorphic (Tactile Hardware)',
    shortLabel: 'Skeuomorphic',
    tagline: 'Brushed Metal Chassis, Recessed LCDs & 3D Push Keys',
    category: 'Tactile Hardware',
    description: 'Physical institutional hardware console with brushed gunmetal steel plates, 3D beveled metallic rims, dark emerald/amber backlit LCD digital readouts, and chunky mechanical keys that physically press down.',
    badge: '3D Metal & LCD',
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    cardStyleSample: {
      canvasBg: '#181B20',
      bg: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px), linear-gradient(180deg, #323846 0%, #1F242D 55%, #171A21 100%)',
      insetBg: '#07120C',
      border: '2px solid #4A5264',
      shadow: '0 10px 22px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.8)',
      radius: '10px',
      buttonBg: 'linear-gradient(180deg, #40485A 0%, #242934 100%)',
      buttonBorder: '1px solid rgba(255,255,255,0.35)',
      buttonShadow: '0 4px 0 #0B0D12, 0 6px 10px rgba(0,0,0,0.7)'
    },
    keyFeatures: [
      'Brushed gunmetal steel texture with 3D machined bevels',
      'Recessed dark emerald LCD instrument display trays',
      'Chunky 3D mechanical push-buttons with 4px physical travel',
      'Warm amber & phosphor green hardware instrument telemetry'
    ]
  },
  {
    id: 'CYBERPUNK',
    dataTheme: 'cyberpunk',
    name: 'Cyberpunk Neon Matrix',
    shortLabel: 'Cyberpunk',
    tagline: 'Laser Cyan & Hot Pink Synthwave HUD Grid',
    category: 'Synthwave HUD',
    description: 'High-octane synthwave algorithmic HUD over an ultraviolet laser perspective grid. Sharp chamfered 4px corners, electric cyan & hot magenta dual neon borders, and glowing plasma shadows.',
    badge: 'Neon Laser HUD',
    accentColor: '#00F0FF',
    glowColor: 'rgba(0, 240, 255, 0.5)',
    cardStyleSample: {
      canvasBg: '#090314',
      bg: 'linear-gradient(135deg, rgba(22, 9, 48, 0.94) 0%, rgba(6, 18, 38, 0.96) 100%)',
      insetBg: '#05020C',
      border: '1px solid #00F0FF',
      shadow: '0 0 20px rgba(0, 240, 255, 0.32), inset 0 0 14px rgba(255, 0, 127, 0.18)',
      radius: '4px',
      buttonBg: 'linear-gradient(90deg, rgba(0, 240, 255, 0.25), rgba(255, 0, 127, 0.25))',
      buttonBorder: '1px solid #00F0FF',
      buttonShadow: '0 0 12px rgba(0, 240, 255, 0.4)'
    },
    keyFeatures: [
      'Ultraviolet synthwave perspective laser grid canvas',
      'Electric Cyan (#00F0FF) & Hot Pink (#FF007F) neon borders',
      'Sharp 4px tactical HUD corners & glowing plasma shadows',
      'High-frequency algorithmic cyber telemetry feel'
    ]
  },
  {
    id: 'DARK_PRO',
    dataTheme: 'dark_pro',
    name: 'Bloomberg Dark Pro',
    shortLabel: 'Dark Pro',
    tagline: 'Classic Institutional High-Contrast OLED Terminal',
    category: 'Institutional OLED',
    description: 'The classic institutional trading terminal baseline with pitch-black OLED surfaces (#05070B), deep navy cards (#101522), and razor-sharp #222F47 hairline borders.',
    badge: 'Classic Terminal',
    accentColor: '#00E676',
    glowColor: 'rgba(0, 230, 118, 0.3)',
    cardStyleSample: {
      canvasBg: '#05070B',
      bg: '#101522',
      insetBg: '#080B11',
      border: '1px solid #222F47',
      shadow: '0 4px 12px rgba(0,0,0,0.5)',
      radius: '12px',
      buttonBg: '#182033',
      buttonBorder: '1px solid #222F47',
      buttonShadow: 'none'
    },
    keyFeatures: [
      'OLED pitch-black #05070B & deep navy #101522 surfaces',
      'Crisp #222F47 1px hairline institutional grid',
      'Zero distraction, maximum tabular data legibility',
      'Standard Wall Street & TradingView dark pro layout'
    ]
  }
];

const DYNAMIC_THEME_CSS = `
/* ============================================================================
   RUNTIME MULTI-THEME ENGINE (IMMUNE TO CSS BUNDLER STRIPPING)
   ============================================================================ */

/* ----------------------------------------------------------------------------
   0. CLAYMORPHISM WHITE (Pure Porcelain White 3D Clay & Sculpted Inner Rims)
   ---------------------------------------------------------------------------- */
html[data-theme="claymorphism_white"],
html[data-theme="claymorphism_white"] body,
html[data-theme="claymorphism_white"] [class*="bg-[#05070B]"],
html[data-theme="claymorphism_white"] [class*="min-h-screen"][class*="bg-[#080B11]"],
html[data-theme="claymorphism_white"] .terminal-canvas,
html[data-theme="claymorphism_white"] .terminal-app-bg {
  background: #EEF2F9 !important;
  background-color: #EEF2F9 !important;
  color: #0F172A !important;
}

html[data-theme="claymorphism_white"] .mobile-app-shell {
  box-shadow: 0 20px 60px rgba(100, 116, 139, 0.28), inset 2px 2px 6px #FFFFFF !important;
}

/* Claymorphic White Top Header & Bottom Navigation */
html[data-theme="claymorphism_white"] header,
html[data-theme="claymorphism_white"] nav[class*="fixed"] {
  background: rgba(255, 255, 255, 0.92) !important;
  backdrop-filter: blur(16px) !important;
  border-color: rgba(203, 213, 225, 0.8) !important;
  box-shadow:
    0 10px 24px rgba(148, 163, 184, 0.24),
    inset 2px 2px 5px #FFFFFF,
    inset -3px -3px 8px rgba(191, 203, 222, 0.45) !important;
}

/* Claymorphic White 3D Puffy Cards (Hero Card, Signal Cards, Modals, Panels) */
html[data-theme="claymorphism_white"] [class*="bg-[#101522]"],
html[data-theme="claymorphism_white"] [class*="bg-[#0D111C]"],
html[data-theme="claymorphism_white"] [class*="bg-[#141B2D]"],
html[data-theme="claymorphism_white"] [class*="from-[#182033]"][class*="to-[#101522]"],
html[data-theme="claymorphism_white"] [class*="from-[#141C2E]"],
html[data-theme="claymorphism_white"] .terminal-card {
  background: linear-gradient(145deg, #FFFFFF 0%, #F5F8FF 100%) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.96) !important;
  border-radius: 24px !important;
  box-shadow:
    0 14px 28px rgba(148, 163, 184, 0.28),
    0 4px 10px rgba(148, 163, 184, 0.14),
    inset 4px 4px 8px #FFFFFF,
    inset -6px -6px 14px rgba(186, 198, 218, 0.58) !important;
  color: #0F172A !important;
}

/* Claymorphic White Sculpted Concave Wells (Inner Price Matrices, Progress Trays, Inputs) */
html[data-theme="claymorphism_white"] :not([class*="min-h-screen"])[class*="bg-[#080B11]"],
html[data-theme="claymorphism_white"] [class*="bg-[#0D121F]"]:not(nav),
html[data-theme="claymorphism_white"] [class*="bg-[#0A0E17]"],
html[data-theme="claymorphism_white"] input[type="text"],
html[data-theme="claymorphism_white"] input[type="number"],
html[data-theme="claymorphism_white"] input[type="date"],
html[data-theme="claymorphism_white"] select,
html[data-theme="claymorphism_white"] textarea,
html[data-theme="claymorphism_white"] .terminal-inset {
  background: #E7EDF8 !important;
  border: 1px solid rgba(255, 255, 255, 0.85) !important;
  border-radius: 16px !important;
  box-shadow:
    inset 4px 4px 9px rgba(163, 177, 198, 0.55),
    inset -4px -4px 9px #FFFFFF !important;
  color: #0F172A !important;
}

/* Claymorphic Puffy 3D Buttons */
html[data-theme="claymorphism_white"] [class*="bg-[#182033]"]:not([class*="from-[#182033]"]),
html[data-theme="claymorphism_white"] [class*="bg-[#141C2E]"],
html[data-theme="claymorphism_white"] [class*="bg-[#1E293B]"],
html[data-theme="claymorphism_white"] .terminal-btn {
  background: linear-gradient(145deg, #FFFFFF 0%, #E9EFFA 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.92) !important;
  border-radius: 14px !important;
  box-shadow:
    0 6px 12px rgba(148, 163, 184, 0.25),
    inset 2px 2px 5px #FFFFFF,
    inset -3px -3px 7px rgba(176, 190, 212, 0.52) !important;
  color: #1E293B !important;
}

html[data-theme="claymorphism_white"] button:not(:disabled):active {
  box-shadow:
    inset 3px 3px 7px rgba(163, 177, 198, 0.6),
    inset -3px -3px 7px #FFFFFF !important;
  transform: scale(0.97) !important;
}

/* Claymorphic White Dividers & Borders */
html[data-theme="claymorphism_white"] [class*="border-[#222F47]"],
html[data-theme="claymorphism_white"] [class*="border-[#1E293B]"] {
  border-color: rgba(148, 163, 184, 0.32) !important;
}

html[data-theme="claymorphism_white"] [class*="divide-[#222F47]"] > :not([hidden]) ~ :not([hidden]) {
  border-color: rgba(148, 163, 184, 0.28) !important;
}

/* Claymorphic White Typography & High-Contrast Semantic Colors */
html[data-theme="claymorphism_white"] [class*="text-white"]:not([class*="bg-[#2979FF]"]):not([class*="bg-[#00E676]"]):not([class*="bg-[#FF3366]"]):not([class*="from-[#2979FF]"]):not([class*="from-[#00E676]"]),
html[data-theme="claymorphism_white"] [class*="text-[#F1F5F9]"],
html[data-theme="claymorphism_white"] [class*="text-[#E2E8F0]"],
html[data-theme="claymorphism_white"] [class*="text-slate-100"],
html[data-theme="claymorphism_white"] [class*="text-slate-200"] {
  color: #0F172A !important;
}

html[data-theme="claymorphism_white"] [class*="bg-[#2979FF]"] [class*="text-white"],
html[data-theme="claymorphism_white"] [class*="bg-[#2979FF]"][class*="text-white"] {
  color: #FFFFFF !important;
}

html[data-theme="claymorphism_white"] [class*="text-[#94A3B8]"],
html[data-theme="claymorphism_white"] [class*="text-slate-300"],
html[data-theme="claymorphism_white"] [class*="text-slate-400"] {
  color: #475569 !important;
}

html[data-theme="claymorphism_white"] [class*="text-[#64748B]"] {
  color: #64748B !important;
}

html[data-theme="claymorphism_white"] [class*="text-[#FFD700]"] {
  color: #B45309 !important;
}

html[data-theme="claymorphism_white"] [class*="text-[#00E676]"] {
  color: #059669 !important;
}

html[data-theme="claymorphism_white"] [class*="text-[#FF3366]"] {
  color: #E11D48 !important;
}

/* Claymorphic White Active Blue Pills & CTAs */
html[data-theme="claymorphism_white"] [class*="bg-[#2979FF]"]:not([class*="bg-[#2979FF]/"]) {
  background: linear-gradient(145deg, #3B82F6 0%, #2563EB 100%) !important;
  color: #FFFFFF !important;
  box-shadow:
    0 6px 14px rgba(37, 99, 235, 0.35),
    inset 2px 2px 4px rgba(255, 255, 255, 0.45),
    inset -2px -2px 5px rgba(29, 78, 216, 0.6) !important;
}

/* ----------------------------------------------------------------------------
   1. NEUMORPHISM (Soft UI 3D Clay & Deep Sunken Wells)
   ---------------------------------------------------------------------------- */
html[data-theme="neumorphism"],
html[data-theme="neumorphism"] body,
html[data-theme="neumorphism"] [class*="bg-[#05070B]"],
html[data-theme="neumorphism"] [class*="min-h-screen"][class*="bg-[#080B11]"] {
  background: #21293A !important;
  background-color: #21293A !important;
}

/* Neumorphic Top Header & Bottom Nav */
html[data-theme="neumorphism"] header,
html[data-theme="neumorphism"] nav[class*="fixed"] {
  background: rgba(33, 41, 58, 0.92) !important;
  backdrop-filter: blur(16px) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 6px 16px #121722, 0 -2px 8px rgba(255, 255, 255, 0.05) !important;
}

/* Neumorphic 3D Extruded Cards (Hero Card, Signal Cards, Modals, Panels) */
html[data-theme="neumorphism"] [class*="bg-[#101522]"],
html[data-theme="neumorphism"] [class*="bg-[#0D111C]"],
html[data-theme="neumorphism"] [class*="bg-[#141B2D]"],
html[data-theme="neumorphism"] [class*="from-[#182033]"][class*="to-[#101522]"] {
  background: linear-gradient(145deg, #263044, #1d2433) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 22px !important;
  box-shadow: 9px 9px 18px #111620, -7px -7px 16px rgba(255, 255, 255, 0.08) !important;
}

/* Neumorphic Deep Concave Sunken Wells (Inner Price Matrices, Progress Containers, Inputs) */
html[data-theme="neumorphism"] :not([class*="min-h-screen"])[class*="bg-[#080B11]"],
html[data-theme="neumorphism"] [class*="bg-[#0D121F]"]:not(nav),
html[data-theme="neumorphism"] input[type="text"],
html[data-theme="neumorphism"] input[type="number"],
html[data-theme="neumorphism"] textarea {
  background: #181F2D !important;
  border: 1px solid rgba(255, 255, 255, 0.04) !important;
  border-radius: 14px !important;
  box-shadow: inset 5px 5px 10px #0e131c, inset -4px -4px 9px #273248 !important;
}

/* Neumorphic Tactile Extruded Cushion Buttons */
html[data-theme="neumorphism"] [class*="bg-[#182033]"]:not([class*="from-[#182033]"]),
html[data-theme="neumorphism"] [class*="bg-[#141C2E]"] {
  background: linear-gradient(145deg, #283248, #1e2536) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  box-shadow: 5px 5px 10px #111620, -4px -4px 9px rgba(255, 255, 255, 0.07) !important;
}

html[data-theme="neumorphism"] button:not(:disabled):active {
  box-shadow: inset 4px 4px 8px #0e131c, inset -3px -3px 7px #283248 !important;
  transform: scale(0.97) !important;
}

/* ----------------------------------------------------------------------------
   2. SKEUOMORPHIC (Brushed Metal Chassis, Recessed Emerald LCDs & 3D Keys)
   ---------------------------------------------------------------------------- */
html[data-theme="skeuomorphic"],
html[data-theme="skeuomorphic"] body,
html[data-theme="skeuomorphic"] [class*="bg-[#05070B]"],
html[data-theme="skeuomorphic"] [class*="min-h-screen"][class*="bg-[#080B11]"] {
  background:
    repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 2px),
    radial-gradient(circle at 50% 0%, #2a303c 0%, #14171d 85%) !important;
  background-attachment: fixed !important;
}

/* Skeuomorphic Brushed Steel Header & Nav */
html[data-theme="skeuomorphic"] header,
html[data-theme="skeuomorphic"] nav[class*="fixed"] {
  background: linear-gradient(180deg, #323946 0%, #1c2028 100%) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.3) !important;
  border-bottom: 3px solid #090b0e !important;
  box-shadow: 0 8px 20px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.25) !important;
}

/* Skeuomorphic Brushed Gunmetal Hardware Modules */
html[data-theme="skeuomorphic"] [class*="bg-[#101522]"],
html[data-theme="skeuomorphic"] [class*="bg-[#0D111C]"],
html[data-theme="skeuomorphic"] [class*="bg-[#141B2D]"],
html[data-theme="skeuomorphic"] [class*="from-[#182033]"][class*="to-[#101522]"] {
  background:
    repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px),
    linear-gradient(180deg, #313846 0%, #20252F 50%, #171B22 100%) !important;
  border-top: 2px solid #576175 !important;
  border-left: 1px solid #454D5E !important;
  border-right: 1px solid #0E1015 !important;
  border-bottom: 3px solid #07090C !important;
  border-radius: 10px !important;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.32), inset 0 -2px 4px rgba(0, 0, 0, 0.75) !important;
}

/* Skeuomorphic Recessed Backlit LCD Instrument Screens (Price Grids, Timers, Inputs) */
html[data-theme="skeuomorphic"] :not([class*="min-h-screen"])[class*="bg-[#080B11]"],
html[data-theme="skeuomorphic"] [class*="bg-[#0D121F]"]:not(nav),
html[data-theme="skeuomorphic"] input[type="text"],
html[data-theme="skeuomorphic"] input[type="number"] {
  background: linear-gradient(180deg, #06100B 0%, #0A1912 100%) !important;
  border-top: 2px solid #040806 !important;
  border-left: 2px solid #040806 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 6px !important;
  box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.95), 0 1px 0 rgba(255, 255, 255, 0.14) !important;
}

/* Skeuomorphic Chunky 3D Mechanical Push Keys */
html[data-theme="skeuomorphic"] [class*="bg-[#182033]"]:not([class*="from-[#182033]"]),
html[data-theme="skeuomorphic"] [class*="bg-[#141C2E]"] {
  background: linear-gradient(180deg, #424B5E 0%, #272D39 85%, #1D222B 100%) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.42) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-right: 1px solid #11141B !important;
  border-bottom: 4px solid #090B0F !important;
  border-radius: 7px !important;
  box-shadow: 0 4px 7px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
}

html[data-theme="skeuomorphic"] button:not(:disabled):active {
  transform: translateY(2px) !important;
  border-bottom-width: 1px !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 2px 5px rgba(0, 0, 0, 0.9) !important;
}

/* ----------------------------------------------------------------------------
   3. CYBERPUNK (Laser Cyan & Hot Pink Synthwave HUD Matrix)
   ---------------------------------------------------------------------------- */
html[data-theme="cyberpunk"],
html[data-theme="cyberpunk"] body,
html[data-theme="cyberpunk"] [class*="bg-[#05070B]"],
html[data-theme="cyberpunk"] [class*="min-h-screen"][class*="bg-[#080B11]"] {
  background-color: #080212 !important;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 0, 127, 0.08) 1px, transparent 1px),
    radial-gradient(circle at 50% 0%, rgba(255, 0, 127, 0.22) 0%, rgba(0, 240, 255, 0.12) 45%, #06010d 90%) !important;
  background-size: 32px 32px, 32px 32px, 100% 100% !important;
  background-attachment: fixed !important;
}

html[data-theme="cyberpunk"] header,
html[data-theme="cyberpunk"] nav[class*="fixed"] {
  background: rgba(12, 4, 28, 0.92) !important;
  border-color: #00F0FF !important;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.3) !important;
}

html[data-theme="cyberpunk"] [class*="bg-[#101522]"],
html[data-theme="cyberpunk"] [class*="bg-[#0D111C]"],
html[data-theme="cyberpunk"] [class*="bg-[#141B2D]"],
html[data-theme="cyberpunk"] [class*="from-[#182033]"][class*="to-[#101522]"] {
  background: linear-gradient(135deg, rgba(22, 8, 48, 0.92) 0%, rgba(6, 18, 38, 0.94) 100%) !important;
  border: 1px solid #00F0FF !important;
  border-left: 3px solid #FF007F !important;
  border-radius: 4px !important;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.25), inset 0 0 16px rgba(255, 0, 127, 0.14) !important;
}

html[data-theme="cyberpunk"] :not([class*="min-h-screen"])[class*="bg-[#080B11]"],
html[data-theme="cyberpunk"] [class*="bg-[#0D121F]"]:not(nav),
html[data-theme="cyberpunk"] input[type="text"] {
  background: rgba(5, 2, 14, 0.9) !important;
  border: 1px solid rgba(255, 0, 127, 0.5) !important;
  border-radius: 2px !important;
  box-shadow: inset 0 0 12px rgba(0, 240, 255, 0.2) !important;
}

html[data-theme="cyberpunk"] [class*="bg-[#182033]"]:not([class*="from-[#182033]"]),
html[data-theme="cyberpunk"] [class*="bg-[#141C2E]"] {
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.2) 0%, rgba(255, 0, 127, 0.2) 100%) !important;
  border: 1px solid #00F0FF !important;
  border-radius: 3px !important;
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.35) !important;
}
`;

class VisualThemeService {
  private currentTheme: VisualTheme = 'NEUMORPHISM';
  private listeners: Set<(theme: VisualTheme) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    try {
      const saved = localStorage.getItem('fx_visual_theme') as VisualTheme;
      if (saved && VISUAL_THEMES.some(t => t.id === saved)) {
        this.currentTheme = saved;
      } else {
        this.currentTheme = 'NEUMORPHISM';
      }
    } catch {
      this.currentTheme = 'NEUMORPHISM';
    }
    this.injectStyleSheet();
    this.applyToDOM(this.currentTheme);
  }

  private injectStyleSheet() {
    if (typeof document === 'undefined') return;
    const styleId = 'fx-runtime-theme-engine';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = DYNAMIC_THEME_CSS;
  }

  public getTheme(): VisualTheme {
    return this.currentTheme;
  }

  public getThemeConfig(id: VisualTheme = this.currentTheme): VisualThemeConfig {
    return VISUAL_THEMES.find(t => t.id === id) || VISUAL_THEMES[0];
  }

  public setTheme(theme: VisualTheme, playSound: boolean = true) {
    this.currentTheme = theme;
    try {
      localStorage.setItem('fx_visual_theme', theme);
    } catch {
      // ignore
    }
    this.injectStyleSheet();
    this.applyToDOM(theme);
    this.notify();

    if (playSound) {
      soundFx.playTpChime();
    }
  }

  private applyToDOM(theme: VisualTheme) {
    if (typeof document === 'undefined') return;
    const config = this.getThemeConfig(theme);
    document.documentElement.setAttribute('data-theme', config.dataTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', config.dataTheme);
    }
  }

  public subscribe(listener: (theme: VisualTheme) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.currentTheme));
  }
}

export const visualThemeService = new VisualThemeService();
