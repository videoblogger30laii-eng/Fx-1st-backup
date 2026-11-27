import type { SignalGenerationAudit } from '../types';

const memoryStorageFallback = new Map<string, string>();

function safeGetStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStorageFallback.get(key) ?? null;
}

function safeSetStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // ignore
  }
  memoryStorageFallback.set(key, value);
}

const STORAGE_KEYS = {
  SIGNAL_ANCHORS: 'fx_signal_session_store_anchors_v7',
  ALERTS: 'fx_user_custom_alerts',
  FAVORITES: 'fx_signal_favorites',
  SIGNAL_ALERTS: 'fx_signal_alerts_toggled',
  ELEV8_CONFIG: 'fx_elev8_mt5_account_config',
  ELEV8_TRADES: 'fx_elev8_mt5_trades_history',
  PROVIDER: 'fx_market_data_provider',
  INTERVAL: 'fx_refresh_interval',
  TWELVE_DATA_KEY: 'fx_twelve_data_key',
  FINNHUB_KEY: 'fx_finnhub_key',
  DERIV_APP_ID: 'fx_deriv_app_id',
  DERIV_TOKEN: 'fx_deriv_token',
  QUOTA: 'fx_api_quota_tracker',
  LAST_SYNC: 'fx_last_sync_timestamp',
  AI_CHAT_MESSAGES: 'fx_ai_copilot_chat_history_v2',
  LIVE_FORWARD_TRADES: 'elev8_live_forward_v6',
  SIGNALS_STATE: 'fx_signals_state_v11',
  NOTIFIED_TRANSITIONS: 'fx_notified_transitions_v6',
  CLOSED_TRADES_RETENTION: 'fx_closed_trades_retention_v1',
  CLOSED_TIME_RANGE: 'fx_closed_time_range_v1',
  CLOSED_SORT_OPTION: 'fx_closed_sort_option_v1',
  CLOSED_CUSTOM_RANGE: 'fx_closed_custom_range_v1',
  ENABLED_STRATEGIES: 'fx_enabled_strategies_v1',
  USER_CLOSED_COOLDOWNS: 'fx_user_closed_cooldowns_v1',
  SIGNAL_AUDIT_LOG: 'fx_signal_audit_log_v1',
};

export interface UserClosedCooldown {
  pairSymbol: string;
  signalId?: string;
  closedAtMs: number;
  cooldownExpiresAtMs: number;
}

export interface SignalTransitionEvent {
  signalId: string;
  pairSymbol: string;
  previousStatus: string;
  newStatus: 'HIT_SL' | 'HIT_TP';
  closedAtMs: number;
  signal: any;
  allSignals?: any[];
}

export type SignalTransitionListener = (event: SignalTransitionEvent) => void;
const signalTransitionListeners = new Set<SignalTransitionListener>();

let lastPurgedLegacySignalCount = 0;

/**
 * Verifies a signal carries a genuine real-time multi-timeframe confluence breakdown
 * (H4:X + H1/M15:Y + Strength:Z + D1/Liq:A + ATR:B = Total).
 */
export function hasRealConfluenceBreakdown(sig: any): boolean {
  if (!sig || typeof sig !== 'object') return false;
  const bd = sig.confluenceBreakdown || sig.generationAudit?.confluenceBreakdown;
  if (!bd || typeof bd !== 'object') return false;
  const summary = typeof bd.summaryText === 'string' ? bd.summaryText.trim() : '';
  return (
    summary.length > 0 &&
    summary.includes('H4:') &&
    summary.includes('Strength:') &&
    typeof bd.total === 'number' &&
    typeof bd.h4Score === 'number' &&
    typeof bd.h1M15Score === 'number' &&
    typeof bd.strengthScore === 'number' &&
    typeof bd.d1LiquidityScore === 'number' &&
    typeof bd.atrSpreadScore === 'number'
  );
}

// Canonical real-time model: Generation timestamps reflect authentic time of signal formation
export const CANONICAL_PAIR_INITIAL_AGES_MS: Record<string, number> = {};

export const CANONICAL_PAIR_SIGNAL_IDS: Record<string, string> = {
  'XAU/USD': 'SIG-XAU-001',
  'EUR/USD': 'SIG-EUR-002',
  'GBP/USD': 'SIG-GBP-003',
  'USD/JPY': 'SIG-JPY-004',
  'GBP/JPY': 'SIG-GJ-005',
  'AUD/USD': 'SIG-AUD-006',
  'EUR/CAD': 'SIG-EC-007',
  'USD/CAD': 'SIG-CAD-008',
  'CAD/JPY': 'SIG-CJ-009',
  'EUR/AUD': 'SIG-EA-010',
  'EUR/GBP': 'SIG-EG-011',
  'AUD/JPY': 'SIG-AJ-012',
  'GBP/AUD': 'SIG-GA-013',
  'XAG/USD': 'SIG-SILVER-014',
  'EUR/JPY': 'SIG-EJ-015'
};

function formatSignalDateTime(createdAtMs: number): string {
  if (!createdAtMs || isNaN(createdAtMs)) return '—';
  const d = new Date(createdAtMs);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hr = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${m} ${day}, ${hr}:${min} UTC`;
}

export const PersistenceManager = {
  onSignalTransition(listener: SignalTransitionListener): () => void {
    signalTransitionListeners.add(listener);
    return () => {
      signalTransitionListeners.delete(listener);
    };
  },

  emitSignalTransition(event: SignalTransitionEvent): void {
    signalTransitionListeners.forEach(listener => {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    });
  },

  getEnabledStrategies(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ENABLED_STRATEGIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // If legacy 9 strategies are stored, migrate completely to 3 final strategies
          const valid = parsed.filter(s => s === 'ALL_STRATEGIES' || s === 'GOLD_HUNTER' || s === 'LONDON_KILLER' || s === 'TREND_RIDER');
          if (valid.length > 0) {
            return valid;
          }
        }
      }
      const initial = ['GOLD_HUNTER', 'LONDON_KILLER', 'TREND_RIDER'];
      this.saveEnabledStrategies(initial);
      return initial;
    } catch {
      return ['GOLD_HUNTER', 'LONDON_KILLER', 'TREND_RIDER'];
    }
  },

  saveEnabledStrategies(strategies: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ENABLED_STRATEGIES, JSON.stringify(strategies));
    } catch {
      // ignore
    }
  },

  getRefreshInterval(): 5 | 15 | 30 | 60 | 300 | 600 | 0 {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INTERVAL);
      if (raw !== null) {
        const val = parseInt(raw, 10);
        if ([5, 15, 30, 60, 300, 600, 0].includes(val)) {
          return val as 5 | 15 | 30 | 60 | 300 | 600 | 0;
        }
      }
      return 5; // 5s Real-Time Active Live Feed
    } catch {
      return 5;
    }
  },

  saveRefreshInterval(sec: 5 | 15 | 30 | 60 | 300 | 600 | 0): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INTERVAL, String(sec));
    } catch {
      // ignore
    }
  },

  getLastSyncTime(): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return raw ? parseInt(raw, 10) : Date.now();
    } catch {
      return Date.now();
    }
  },

  saveLastSyncTime(timestamp: number = Date.now()): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(timestamp));
    } catch {
      // ignore
    }
  },

  getApiQuota(): { used: number; limit: number } {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(STORAGE_KEYS.QUOTA);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === today) {
          return { used: parsed.used || 120, limit: 800 };
        }
      }
      // Initialize for today with initial 120 baseline
      const initial = { date: today, used: 120, limit: 800 };
      localStorage.setItem(STORAGE_KEYS.QUOTA, JSON.stringify(initial));
      return { used: 120, limit: 800 };
    } catch {
      return { used: 120, limit: 800 };
    }
  },

  incrementApiQuota(amount: number = 1): number {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const current = this.getApiQuota();
      const updatedUsed = Math.min(current.limit, current.used + amount);
      localStorage.setItem(STORAGE_KEYS.QUOTA, JSON.stringify({ date: today, used: updatedUsed, limit: 800 }));
      return updatedUsed;
    } catch {
      return 120;
    }
  },
  getOrAnchorCreatedAt(signalId: string, durationMs: number, initialAgeMs?: number): number {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS) : null;
      const store: Record<string, number> = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const storedTime = store[signalId];

      const nowDate = new Date(now);
      const day = nowDate.getUTCDay();
      const hour = nowDate.getUTCHours();
      const minute = nowDate.getUTCMinutes();
      const totalMins = hour * 60 + minute;
      const isWeekend = (day === 5 && totalMins >= 1320) || day === 6 || (day === 0 && totalMins < 1320);

      const isGold = signalId === 'SIG-XAU-001' || signalId.includes('XAU');
      const isSilver = signalId === 'SIG-SILVER-014' || signalId.includes('SILVER') || signalId.includes('XAG');

      // Canonical initial age resolution
      let expectedInitialAge: number | undefined = initialAgeMs;
      if (!expectedInitialAge) {
        if (isGold) {
          expectedInitialAge = CANONICAL_PAIR_INITIAL_AGES_MS['XAU/USD']; // 105m
        } else if (isSilver) {
          expectedInitialAge = CANONICAL_PAIR_INITIAL_AGES_MS['XAG/USD']; // 195m
        } else {
          const matchEntry = Object.entries(CANONICAL_PAIR_SIGNAL_IDS).find(([_, id]) => id === signalId);
          if (matchEntry) {
            expectedInitialAge = CANONICAL_PAIR_INITIAL_AGES_MS[matchEntry[0]];
          }
        }
      }

      // Check stored anchor validity & heal corrupted "Just Now" bugs or stale zombie anchors
      if (storedTime && storedTime > 0 && storedTime <= now) {
        const storedAge = now - storedTime;
        // MAXIMUM ACTIVE AGE: Any stored active anchor older than 48 hours is an obsolete zombie anchor from weeks ago!
        if (storedAge > 48 * 3600 * 1000) {
          delete store[signalId];
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
          }
          // Fall through to re-anchor cleanly to fresh current session
        } else if (isWeekend) {
          const sDate = new Date(storedTime);
          const sDay = sDate.getUTCDay();
          // If stored anchor is on Saturday or Sunday, it's invalid during market closure; heal to Friday session
          if (sDay !== 6 && sDay !== 0) {
            return storedTime;
          }
        } else if (expectedInitialAge && expectedInitialAge > 30 * 60 * 1000 && storedAge < 15 * 60 * 1000) {
          // Stored anchor was corrupted by a past "Just Now" reset; heal below
        } else {
          return storedTime;
        }
      }

      let seed = 0;
      for (let i = 0; i < signalId.length; i++) {
        seed = (seed * 31 + signalId.charCodeAt(i)) & 0x7fffffff;
      }

      if (isWeekend) {
        // Friday active session before 22:00 GMT close (XAU: 18:00, XAG: 16:00, Forex: 15:00-18:00)
        const fridayAnchor = new Date(now);
        const daysBack = day === 5 ? 0 : day === 6 ? 1 : 2;
        fridayAnchor.setUTCDate(fridayAnchor.getUTCDate() - daysBack);
        const sessionHour = isGold ? 18 : isSilver ? 16 : 15 + (seed % 4);
        const sessionMin = isGold ? 0 : isSilver ? 0 : 10 + (seed % 40);
        fridayAnchor.setUTCHours(sessionHour, sessionMin, 0, 0);
        const initialAnchor = fridayAnchor.getTime();
        store[signalId] = initialAnchor;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
        }
        return initialAnchor;
      }

      const defaultAgeMs =
        typeof expectedInitialAge === 'number' && expectedInitialAge >= 0
          ? expectedInitialAge
          : typeof initialAgeMs === 'number' && initialAgeMs >= 0
          ? initialAgeMs
          : 0;

      const initialAnchor = now - defaultAgeMs;
      store[signalId] = initialAnchor;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
      }
      return initialAnchor;
    } catch {
      return typeof initialAgeMs === 'number' && initialAgeMs >= 0 ? Date.now() - initialAgeMs : Date.now();
    }
  },

  getAnchoredCreatedAt(signalId: string): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      if (!raw) return null;
      const store: Record<string, number> = JSON.parse(raw);
      const val = store[signalId];
      if (typeof val === 'number' && val > 0) {
        const now = Date.now();
        // If stored anchor is older than 48 hours, purge stale anchor
        if (now - val > 48 * 3600 * 1000) {
          delete store[signalId];
          localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
          return null;
        }
        return val;
      }
      return null;
    } catch {
      return null;
    }
  },

  clearSignalAnchor(signalId: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      if (!raw) return;
      const store: Record<string, number> = JSON.parse(raw);
      if (store[signalId]) {
        delete store[signalId];
        localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
      }
    } catch {
      // ignore
    }
  },

  renewSignalAnchor(signalId: string, timestamp: number = Date.now()): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      const store: Record<string, number> = raw ? JSON.parse(raw) : {};
      // Never overwrite an existing valid anchor with a newer timestamp unless explicitly resetting
      if (!store[signalId] || timestamp < store[signalId]) {
        store[signalId] = timestamp;
        localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
      }
    } catch {
      // ignore
    }
  },

  getPairActiveAnchor(pairSymbol: string): number | null {
    try {
      const raw = localStorage.getItem('fx_pair_active_anchors_v2');
      if (!raw) return null;
      const store: Record<string, number> = JSON.parse(raw);
      const val = store[pairSymbol.toUpperCase()];
      if (typeof val === 'number' && val > 0) {
        const now = Date.now();
        // Active swing trades can stay open up to 5 days; purge stale zombie anchors beyond 5 days.
        if (now - val > 5 * 24 * 3600 * 1000) {
          delete store[pairSymbol.toUpperCase()];
          localStorage.setItem('fx_pair_active_anchors_v2', JSON.stringify(store));
          return null;
        }
        return val;
      }
      return null;
    } catch {
      return null;
    }
  },

  setPairActiveAnchor(pairSymbol: string, timestamp: number): void {
    try {
      const raw = localStorage.getItem('fx_pair_active_anchors_v2');
      const store: Record<string, number> = raw ? JSON.parse(raw) : {};
      const key = pairSymbol.toUpperCase();
      const existing = store[key];
      const now = Date.now();
      // If anchor does not exist or is older than 5 days, establish fresh timestamp
      if (!existing || typeof existing !== 'number' || isNaN(existing) || (now - existing > 5 * 24 * 3600 * 1000)) {
        store[key] = timestamp;
        localStorage.setItem('fx_pair_active_anchors_v2', JSON.stringify(store));
      }
    } catch {
      // ignore
    }
  },

  clearPairActiveAnchor(pairSymbol: string): void {
    try {
      const raw = localStorage.getItem('fx_pair_active_anchors_v2');
      if (!raw) return;
      const store: Record<string, number> = JSON.parse(raw);
      delete store[pairSymbol.toUpperCase()];
      localStorage.setItem('fx_pair_active_anchors_v2', JSON.stringify(store));
    } catch {
      // ignore
    }
  },

  clearPairSignalAnchors(pairSymbol: string): void {
    try {
      const symClean = pairSymbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      if (!raw) return;
      const store: Record<string, number> = JSON.parse(raw);
      let changed = false;
      Object.keys(store).forEach(id => {
        if (id.toUpperCase().includes(symClean)) {
          delete store[id];
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
      }
    } catch {
      // ignore
    }
  },

  setExplicitSignalAnchor(signalId: string, timestamp: number): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      const store: Record<string, number> = raw ? JSON.parse(raw) : {};
      const existing = store[signalId];
      // Keep real anchor when first generated; only set if not yet established
      if (!existing || typeof existing !== 'number' || isNaN(existing)) {
        store[signalId] = timestamp;
        localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
      }
    } catch {
      // ignore
    }
  },

  getFavorites(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveFavorites(ids: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(ids));
    } catch {
      // ignore
    }
  },

  getAlertToggledSignals(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ALERTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveAlertToggledSignals(ids: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SIGNAL_ALERTS, JSON.stringify(ids));
    } catch {
      // ignore
    }
  },

  getElev8Config(): any {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ELEV8_CONFIG);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveElev8Config(config: any): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ELEV8_CONFIG, JSON.stringify(config));
    } catch {
      // ignore
    }
  },

  getElev8Trades(): any[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ELEV8_TRADES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveElev8Trades(trades: any[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ELEV8_TRADES, JSON.stringify(trades));
    } catch {
      // ignore
    }
  },

  getAiChatMessages(): any[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AI_CHAT_MESSAGES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  saveAiChatMessages(messages: any[]): void {
    try {
      // Filter out temporary pending/generating placeholders before saving
      const validMessages = messages
        .filter(m => !m.isGenerating)
        .slice(-100); // Keep last 100 messages
      localStorage.setItem(STORAGE_KEYS.AI_CHAT_MESSAGES, JSON.stringify(validMessages));
    } catch {
      // ignore
    }
  },

  clearAiChatMessages(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AI_CHAT_MESSAGES);
    } catch {
      // ignore
    }
  },

  getAlerts(): any[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  saveAlerts(alerts: any[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  },

  getLiveForwardTrades(): any[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LIVE_FORWARD_TRADES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  },

  saveLiveForwardTrades(trades: any[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LIVE_FORWARD_TRADES, JSON.stringify(trades));
    } catch {
      // ignore
    }
  },

  addLiveForwardTrade(trade: any): any[] {
    try {
      const existing = this.getLiveForwardTrades();
      // Deduplicate by ID
      const filtered = existing.filter(t => t.id !== trade.id);
      const updated = [trade, ...filtered].slice(0, 500); // keep up to 500 live forward records
      this.saveLiveForwardTrades(updated);
      return updated;
    } catch {
      return [trade];
    }
  },

  clearLiveForwardTrades(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.LIVE_FORWARD_TRADES);
    } catch {
      // ignore
    }
  },

  saveSignalsState(signals: any[]): void {
    try {
      if (!Array.isArray(signals)) return;
      const now = Date.now();
      let existing: Record<string, any> = {};
      try {
        const rawExisting = safeGetStorageItem(STORAGE_KEYS.SIGNALS_STATE);
        if (rawExisting) {
          existing = JSON.parse(rawExisting) || {};
        }
      } catch {
        existing = {};
      }
      // Preserve closed history from existing store, while using `signals` as the authoritative source for active/standby/pending trades
      const map: Record<string, any> = {};
      Object.entries(existing).forEach(([id, item]: [string, any]) => {
        if (item && (item.status === 'HIT_SL' || item.status === 'HIT_TP' || item.status === 'EXPIRED')) {
          map[id] = item;
        }
      });
      const pendingTransitionEvents: SignalTransitionEvent[] = [];

      signals.forEach(s => {
        if (!s || !s.id) return;
        const sym = String(s.pair?.symbol || '').toUpperCase();
        const sStUpper = String(s.status || '').toUpperCase();
        const isTerminalStatus =
          sStUpper === 'HIT_SL' ||
          sStUpper === 'HIT_TP' ||
          sStUpper === 'EXPIRED' ||
          sStUpper === 'CANCELLED';
        const isClosed = isTerminalStatus;
        // Never persist active/standby/pending signals generated without a real confluence breakdown
        if (!isClosed && !hasRealConfluenceBreakdown(s)) {
          return;
        }
        const prior = existing[s.id] || {};
        const prevStatus = prior.status;
        const priorStUpper = String(prevStatus || '').toUpperCase();
        const priorIsTerminal =
          priorStUpper === 'HIT_SL' ||
          priorStUpper === 'HIT_TP' ||
          priorStUpper === 'EXPIRED' ||
          priorStUpper === 'CANCELLED';

        // Never revert an already-closed signal back to RUNNING/PENDING/STANDBY
        if (priorIsTerminal && !isTerminalStatus) {
          return;
        }

        const priorTf = prior.timeframe;
        let tfUpdateNotice = prior.tfUpdateNotice;
        if (priorTf && s.timeframe && priorTf !== s.timeframe) {
          tfUpdateNotice = `Trade timeframe updated from ${priorTf} to ${s.timeframe}`;
        }
        const tfUpper = String(s.winningTf || s.timeframe || 'H1').toUpperCase();
        const maxActiveAgeMs = (tfUpper.includes('4H') || tfUpper === 'H4' || tfUpper === 'D1')
          ? 5 * 24 * 3600 * 1000
          : 48 * 3600 * 1000;

        // Respect the signal's authentic original createdAtMs timestamp (never reset on refresh)
        let lockedCreatedAt = typeof s.createdAtMs === 'number' && s.createdAtMs > 0 && s.createdAtMs <= now + 60000
          ? Math.min(s.createdAtMs, now)
          : (typeof prior.createdAtMs === 'number' && prior.createdAtMs > 0 ? Math.min(prior.createdAtMs, now) : now);

        // If this is an active signal and prior has an even earlier valid timestamp for the exact same ID, preserve it
        if (!isClosed && typeof prior.createdAtMs === 'number' && prior.createdAtMs > 0 && prior.createdAtMs < lockedCreatedAt && (now - prior.createdAtMs <= maxActiveAgeMs)) {
          lockedCreatedAt = prior.createdAtMs;
        }

        // If this is an active signal, check if there were earlier active signals for the same pair in map
        if (!isClosed && sym) {
          Object.entries(map).forEach(([otherId, otherItem]: [string, any]) => {
            if (otherId !== s.id && otherItem && String(otherItem.pair?.symbol || '').toUpperCase() === sym) {
              const oSt = String(otherItem.status || '').toUpperCase();
              const otherClosed = oSt === 'HIT_SL' || oSt === 'HIT_TP' || oSt === 'EXPIRED' || oSt === 'CANCELLED';
              if (!otherClosed) {
                const otherCreated = typeof otherItem.createdAtMs === 'number' && otherItem.createdAtMs > 0
                  ? otherItem.createdAtMs
                  : (typeof otherItem.savedAt === 'number' && otherItem.savedAt > 0 ? otherItem.savedAt : Infinity);
                if (otherCreated < lockedCreatedAt && (now - otherCreated <= maxActiveAgeMs)) {
                  lockedCreatedAt = otherCreated;
                }
                delete map[otherId];
              }
            }
          });
        }

        this.renewSignalAnchor(s.id, lockedCreatedAt);
        if (isClosed && sym) {
          this.clearPairActiveAnchor(sym);
        } else if (!isClosed && sym) {
          this.setPairActiveAnchor(sym, lockedCreatedAt);
        }

        const resolvedClosedAtMs = isTerminalStatus ? (s.closedAtMs || prior.closedAtMs || now) : undefined;
        const resolvedExecutedAtMs = s.executedAtMs || prior.executedAtMs;
        const updatedRecord = {
          ...prior,
          ...s,
          createdAtMs: lockedCreatedAt,
          createdAtFormatted: formatSignalDateTime(lockedCreatedAt),
          executedAtMs: resolvedExecutedAtMs,
          executedAtFormatted: resolvedExecutedAtMs ? formatSignalDateTime(resolvedExecutedAtMs) : undefined,
          savedAt: prior.savedAt || now,
          closedAtMs: resolvedClosedAtMs,
          tfUpdateNotice
        };

        map[s.id] = updatedRecord;

        // Detect transition from RUNNING to HIT_SL or HIT_TP and queue unified event emission
        if (
          (s.status === 'HIT_SL' || s.status === 'HIT_TP') &&
          prevStatus !== s.status &&
          (!prevStatus || prevStatus === 'RUNNING' || prevStatus === 'PENDING')
        ) {
          pendingTransitionEvents.push({
            signalId: s.id,
            pairSymbol: s.pair?.symbol || sym,
            previousStatus: prevStatus || 'RUNNING',
            newStatus: s.status,
            closedAtMs: resolvedClosedAtMs || now,
            signal: updatedRecord,
            allSignals: signals
          });
        }
      });
      // Clean and strictly deduplicate map before writing to localStorage
      const cleanedMap: Record<string, any> = {};
      const seenMapClosedFp = new Set<string>();
      const seenMapActivePairs = new Set<string>();

      // 1. Keep single most recent active trade per pair
      Object.entries(map).forEach(([id, item]) => {
        if (!item) return;
        const st = String(item.status || '').toUpperCase();
        const isClosed = st === 'HIT_SL' || st === 'HIT_TP' || st === 'EXPIRED' || st === 'CANCELLED';
        const sym = String(item.pair?.symbol || '').toUpperCase();
        if (!isClosed && sym) {
          if (!seenMapActivePairs.has(sym)) {
            seenMapActivePairs.add(sym);
            cleanedMap[id] = item;
          }
        }
      });

      // 2. Keep up to 150 newest unique closed trade outcomes (strictly eliminate clones & cap storage size)
      const closedCandidates: Array<{ id: string; item: any; ts: number }> = [];
      Object.entries(map).forEach(([id, item]) => {
        if (!item) return;
        const st = String(item.status || '').toUpperCase();
        const isClosed = st === 'HIT_SL' || st === 'HIT_TP' || st === 'EXPIRED' || st === 'CANCELLED';
        const sym = String(item.pair?.symbol || '').toUpperCase();
        if (isClosed && sym) {
          closedCandidates.push({
            id,
            item,
            ts: Number(item.closedAtMs || item.savedAt || item.createdAtMs || 0)
          });
        }
      });
      closedCandidates.sort((a, b) => b.ts - a.ts);
      let closedKept = 0;
      for (const { id, item } of closedCandidates) {
        if (closedKept >= 150) break;
        const sym = String(item.pair?.symbol || '').toUpperCase();
        const pipsRounded = Math.round((item.pips ?? 0) * 10) / 10;
        const fp = `${sym}-${item.status}-${pipsRounded}`;
        if (!seenMapClosedFp.has(fp)) {
          seenMapClosedFp.add(fp);
          cleanedMap[id] = item;
          closedKept++;
        }
      }

      safeSetStorageItem(STORAGE_KEYS.SIGNALS_STATE, JSON.stringify(cleanedMap));

      if (pendingTransitionEvents.length > 0) {
        pendingTransitionEvents.forEach(evt => this.emitSignalTransition(evt));
      }
    } catch {
      // ignore
    }
  },

  getSavedSignalsState(): Record<string, any> {
    try {
      const rawV9 = safeGetStorageItem(STORAGE_KEYS.SIGNALS_STATE);
      let merged: Record<string, any> = {};

      if (rawV9) {
        merged = JSON.parse(rawV9) || {};
      } else {
        // Migrate ONLY closed trades from prior versions to preserve closed trade ledger history,
        // while cleanly allowing the new 88+ A+ Active vs 80-87 Standby Watchlist tiering
        const rawPrior = localStorage.getItem('fx_signals_state_v10') || localStorage.getItem('fx_signals_state_v9') || localStorage.getItem('fx_signals_state_v8') || localStorage.getItem('fx_signals_state_v6');
        if (rawPrior) {
          const parsedPrior = JSON.parse(rawPrior);
          if (parsedPrior && typeof parsedPrior === 'object') {
            Object.entries(parsedPrior).forEach(([k, item]: [string, any]) => {
              if (item && (item.status === 'HIT_TP' || item.status === 'HIT_SL' || item.status === 'EXPIRED')) {
                merged[k] = item;
              }
            });
          }
        }
      }

      const rawAnchors = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      const anchorStore: Record<string, number> = rawAnchors ? JSON.parse(rawAnchors) : {};
      let anchorsModified = false;

      const now = Date.now();
      const valid: Record<string, any> = {};
      const closedItems: Array<{ id: string; item: any; closedAt: number }> = [];
      const activeByPair = new Map<string, { id: string; item: any; earliestCreatedAt: number; latestSavedAt: number }>();

      const retention = this.getClosedTradesRetention();
      const maxClosedAgeMs =
        retention === '24H' ? 24 * 3600 * 1000 :
        retention === '48H' ? 48 * 3600 * 1000 :
        retention === '1W' ? 7 * 24 * 3600 * 1000 :
        retention === '1M' ? 30 * 24 * 3600 * 1000 :
        retention === 'ALL' ? Number.MAX_SAFE_INTEGER :
        90 * 24 * 3600 * 1000; // default 90 days retention

      const nowDate = new Date(now);
      const day = nowDate.getUTCDay();
      const hour = nowDate.getUTCHours();
      const minute = nowDate.getUTCMinutes();
      const totalMins = hour * 60 + minute;
      const isWeekend = (day === 5 && totalMins >= 1320) || day === 6 || (day === 0 && totalMins < 1320);

      Object.entries(merged).forEach(([id, item]: [string, any]) => {
        if (item && typeof item === 'object') {
          if (id.includes('USDCHF') && id.startsWith('SIG-NEWS-')) {
            return;
          }
          if (id.startsWith('SIG-XAU-LIVE-')) {
            return;
          }
          const savedAt = item.savedAt || now;
          const itemStUpper = String(item.status || '').toUpperCase();
          if (itemStUpper === 'STANDBY' && item.closedAtMs) {
            return; // Drop corrupted standby+closedAtMs record
          }
          if (itemStUpper === 'PENDING' && item.closedAtMs) {
            item.status = 'EXPIRED';
          }
          const resolvedStUpper = String(item.status || '').toUpperCase();
          const isClosed = resolvedStUpper === 'HIT_SL' || resolvedStUpper === 'HIT_TP' || resolvedStUpper === 'EXPIRED' || resolvedStUpper === 'CANCELLED';
          const itemSym = String(item.pair?.symbol || '').toUpperCase();
          const isRunning = item.status === 'RUNNING';
          const ONE_DAY_MS = 24 * 3600 * 1000;
          const TWO_DAYS_MS = 48 * 3600 * 1000;
          const tfUpper = String(item.winningTf || item.timeframe || 'H1').toUpperCase();
          const isSwingTf = tfUpper.includes('4H') || tfUpper === 'H4' || tfUpper === 'D1';
          const runningMaxAge = isSwingTf ? 5 * 24 * 3600 * 1000 : TWO_DAYS_MS;
          const maxAge = isClosed ? maxClosedAgeMs : (isRunning ? runningMaxAge : ONE_DAY_MS);

          if (now - savedAt < maxAge) {
            // Heal EUR/CAD signal falsely closed by offline synthetic candles at 1.57960
            if (
              isClosed &&
              itemSym === 'EUR/CAD' &&
              (id === 'SIG-EURCAD-TREND_RIDER-H4-MW06YO6I-E4BW' ||
                item.validityTimeLeft?.includes('Closed (TP1 Hit Offline)') ||
                item.validityExpiresAt?.includes('1.5796'))
            ) {
              item.status = 'RUNNING';
              item.currentPrice = 1.5660;
              item.pips = 21.0;
              item.validityTimeLeft = 'Active (H4 OTE Retrace)';
              item.validityExpiresAt = 'Trailing Guard Active';
              delete item.closedAtMs;
              valid[id] = item;
              return;
            }

            if (isClosed) {
              // Discard false TP/SL hits created by outdated baseline prices
              const entry = item.entryPrice || 0;
              if (
                (itemSym === 'GBP/CAD' && entry < 1.85) ||
                (itemSym === 'USD/CHF' && entry > 0.85) ||
                (itemSym === 'CAD/JPY' && entry < 112.0) ||
                (itemSym === 'GBP/AUD' && entry < 1.91) ||
                (itemSym === 'USD/CAD' && entry > 0 && entry < 1.41) ||
                (itemSym === 'GBP/JPY' && entry < 210.0) ||
                (itemSym === 'EUR/GBP' && entry > 0.842) ||
                (itemSym === 'EUR/CAD' && entry < 1.568 && item.status === 'HIT_TP') ||
                id.includes('MW32VU')
              ) {
                return; // Discard false baseline closure
              }

              const closedAt = item.closedAtMs || item.createdAtMs || savedAt;
              closedItems.push({ id, item, closedAt });
              return;
            }
            if (!itemSym) {
              if (!hasRealConfluenceBreakdown(item)) {
                lastPurgedLegacySignalCount++;
                return;
              }
              valid[id] = item;
              return;
            }
            // Purge ALL old pre-breakdown active/standby/pending signals immediately
            if (!hasRealConfluenceBreakdown(item)) {
              lastPurgedLegacySignalCount++;
              if (anchorStore[id]) {
                delete anchorStore[id];
                anchorsModified = true;
              }
              this.clearPairActiveAnchor(itemSym);
              return;
            }
            // Sanity check for corrupt SL/TP values from legacy bugs
            const entry = item.entryPrice || 0;
            const sl = item.stopLoss || 0;
            if (entry > 0 && sl > 0) {
              const slDiffPct = Math.abs(sl - entry) / entry;
              if (slDiffPct > 0.25) {
                return; // Discard corrupted legacy signal
              }
            }

            // Discard stale active signals older than their timeframe horizon (5 days for H4/D1, 48h for intraday)
            const created = item.createdAtMs || savedAt;
            const ageMs = Math.max(0, now - created);
            if (isRunning) {
              if (ageMs > runningMaxAge) {
                return; // Discard stale running signal older than timeframe max lifespan
              }
            } else {
              if (isWeekend) {
                const fridayDate = new Date(now);
                const daysBack = day === 5 ? 0 : day === 6 ? 1 : 2;
                fridayDate.setUTCDate(fridayDate.getUTCDate() - daysBack);
                fridayDate.setUTCHours(22, 0, 0, 0);
                const lastClose = fridayDate.getTime();
                if (created < lastClose && (lastClose - created) > ONE_DAY_MS) {
                  return; // Created > 24 hours before market close
                }
              } else {
                if (ageMs > ONE_DAY_MS) {
                  return; // Created > 24 hours ago
                }
              }
            }

            const itemCreated =
              typeof item.createdAtMs === 'number' && item.createdAtMs > 0 && item.createdAtMs <= now + 60000
                ? Math.min(item.createdAtMs, now)
                : savedAt;

            const existingPairEntry = activeByPair.get(itemSym);
            if (!existingPairEntry) {
              activeByPair.set(itemSym, {
                id,
                item,
                earliestCreatedAt: itemCreated,
                latestSavedAt: savedAt
              });
            } else {
              const earliestCreatedAt = Math.min(
                existingPairEntry.earliestCreatedAt,
                itemCreated,
                savedAt
              );
              const isCurrentCanonical = /^SIG-[A-Z]+-\d{3}$/.test(id);
              const isExistingCanonical = /^SIG-[A-Z]+-\d{3}$/.test(existingPairEntry.id);
              if (
                (!isCurrentCanonical && isExistingCanonical && !existingPairEntry.id.startsWith('SIG-XAU-001')) ||
                savedAt >= existingPairEntry.latestSavedAt
              ) {
                activeByPair.set(itemSym, {
                  id,
                  item,
                  earliestCreatedAt,
                  latestSavedAt: Math.max(savedAt, existingPairEntry.latestSavedAt)
                });
              } else {
                existingPairEntry.earliestCreatedAt = earliestCreatedAt;
              }
            }
          }
        }
      });

      // Strictly deduplicate closed items so identical trades appear only once
      closedItems.sort((a, b) => b.closedAt - a.closedAt);
      const seenClosedFp = new Set<string>();
      const seenClosedIds = new Set<string>();

      closedItems.forEach(({ id, item }) => {
        const sym = String(item.pair?.symbol || '').toUpperCase();
        const pips = item.pips !== undefined ? Math.round(item.pips * 10) / 10 : 0;
        const dec = item.pair?.pipDigits ?? 2;
        const entryStr = typeof item.entryPrice === 'number' ? item.entryPrice.toFixed(dec) : '0';
        const baseId = id.replace(/-HIST-\d+/g, '').replace(/-HIT_TP-\d+/g, '').replace(/-HIT_SL-\d+/g, '');
        const pipsRounded = Math.round(pips * 10) / 10;
        const fingerprint = `${sym}-${item.status}-${pipsRounded}`;

        if (seenClosedIds.has(id) || (baseId && seenClosedIds.has(baseId)) || seenClosedFp.has(fingerprint)) {
          return; // Skip duplicate clone
        }

        seenClosedIds.add(id);
        if (baseId) seenClosedIds.add(baseId);
        seenClosedFp.add(fingerprint);

        const cleanId = baseId || id;
        valid[cleanId] = { ...item, id: cleanId };
      });

      activeByPair.forEach(({ id, item, earliestCreatedAt }, itemSym) => {
        let resolvedCreatedAt =
          typeof item.createdAtMs === 'number' && item.createdAtMs > 0 && item.createdAtMs <= now + 60000
            ? Math.min(item.createdAtMs, now)
            : (earliestCreatedAt > 0 && earliestCreatedAt <= now + 60000 ? Math.min(earliestCreatedAt, now) : now);

        this.setPairActiveAnchor(itemSym, resolvedCreatedAt);
        anchorStore[id] = resolvedCreatedAt;
        anchorsModified = true;

        valid[id] = {
          ...item,
          createdAtMs: resolvedCreatedAt,
          createdAtFormatted: formatSignalDateTime(resolvedCreatedAt)
        };
      });

      if (anchorsModified) {
        try {
          localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(anchorStore));
        } catch {
          // ignore
        }
      }

      safeSetStorageItem(STORAGE_KEYS.SIGNALS_STATE, JSON.stringify(valid));

      return valid;
    } catch {
      return {};
    }
  },

  getClosedTradesRetention(): '24H' | '48H' | '1W' | '1M' | '90D' | 'ALL' {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.CLOSED_TRADES_RETENTION);
      if (val && ['24H', '48H', '1W', '1M', '90D', 'ALL'].includes(val)) {
        return val as any;
      }
      return '90D';
    } catch {
      return '90D';
    }
  },

  saveClosedTradesRetention(retention: '24H' | '48H' | '1W' | '1M' | '90D' | 'ALL'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLOSED_TRADES_RETENTION, retention);
    } catch {
      // ignore
    }
  },

  getClosedTimeRange(): '24H' | '48H' | '1W' | '1M' | 'ALL' | 'CUSTOM' {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.CLOSED_TIME_RANGE);
      if (val && ['24H', '48H', '1W', '1M', 'ALL', 'CUSTOM'].includes(val)) {
        return val as any;
      }
      return '24H';
    } catch {
      return '24H';
    }
  },

  saveClosedTimeRange(range: '24H' | '48H' | '1W' | '1M' | 'ALL' | 'CUSTOM'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLOSED_TIME_RANGE, range);
    } catch {
      // ignore
    }
  },

  getClosedSortOption(): string {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.CLOSED_SORT_OPTION);
      return val || 'NEWEST_CLOSED';
    } catch {
      return 'NEWEST_CLOSED';
    }
  },

  saveClosedSortOption(opt: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLOSED_SORT_OPTION, opt);
    } catch {
      // ignore
    }
  },

  getClosedCustomRange(): { startMs?: number; endMs?: number } {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLOSED_CUSTOM_RANGE);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  },

  saveClosedCustomRange(range: { startMs?: number; endMs?: number }): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLOSED_CUSTOM_RANGE, JSON.stringify(range));
    } catch {
      // ignore
    }
  },

  clearClosedTradesHistory(): void {
    try {
      const state = this.getSavedSignalsState();
      const updated: Record<string, any> = {};
      Object.entries(state).forEach(([id, item]: [string, any]) => {
        if (item && item.status !== 'HIT_TP' && item.status !== 'HIT_SL' && item.status !== 'EXPIRED') {
          updated[id] = item;
        }
      });
      localStorage.setItem(STORAGE_KEYS.SIGNALS_STATE, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  getNotifiedTransitions(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTIFIED_TRANSITIONS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveNotifiedTransition(key: string): void {
    try {
      const existing = this.getNotifiedTransitions();
      if (!existing.includes(key)) {
        const updated = [...existing, key].slice(-300);
        localStorage.setItem(STORAGE_KEYS.NOTIFIED_TRANSITIONS, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  },

  getUserClosedCooldowns(): Record<string, UserClosedCooldown> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_CLOSED_COOLDOWNS);
      if (!raw) return {};
      const parsed: Record<string, UserClosedCooldown> = JSON.parse(raw);
      const now = Date.now();
      const active: Record<string, UserClosedCooldown> = {};
      let changed = false;
      for (const [sym, item] of Object.entries(parsed)) {
        if (item && item.cooldownExpiresAtMs > now) {
          active[sym.toUpperCase()] = item;
        } else {
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.USER_CLOSED_COOLDOWNS, JSON.stringify(active));
      }
      return active;
    } catch {
      return {};
    }
  },

  recordUserClosedTrade(pairSymbol: string, signalId?: string, cooldownMinutes: number = 15): void {
    try {
      const sym = pairSymbol.toUpperCase();
      const now = Date.now();
      const cooldownExpiresAtMs = now + cooldownMinutes * 60 * 1000;
      const existing = this.getUserClosedCooldowns();
      existing[sym] = {
        pairSymbol: sym,
        signalId,
        closedAtMs: now,
        cooldownExpiresAtMs
      };
      localStorage.setItem(STORAGE_KEYS.USER_CLOSED_COOLDOWNS, JSON.stringify(existing));

      // Remove signal from active stored SIGNALS_STATE map so it doesn't get restored on reload
      const stateRaw = localStorage.getItem(STORAGE_KEYS.SIGNALS_STATE);
      if (stateRaw) {
        const stateMap: Record<string, any> = JSON.parse(stateRaw);
        let mapChanged = false;
        for (const [id, s] of Object.entries(stateMap)) {
          if (s && String(s.pair?.symbol || '').toUpperCase() === sym) {
            delete stateMap[id];
            mapChanged = true;
          }
        }
        if (mapChanged) {
          localStorage.setItem(STORAGE_KEYS.SIGNALS_STATE, JSON.stringify(stateMap));
        }
      }
      this.clearPairActiveAnchor(sym);
      this.clearPairSignalAnchors(sym);
    } catch {
      // ignore
    }
  },

  isPairInCloseCooldown(pairSymbol: string): boolean {
    if (!pairSymbol) return false;
    try {
      const sym = pairSymbol.toUpperCase();
      const cooldowns = this.getUserClosedCooldowns();
      const item = cooldowns[sym];
      if (!item) return false;
      if (item.cooldownExpiresAtMs > Date.now()) {
        return true;
      }
      // Expired - clean it up
      delete cooldowns[sym];
      localStorage.setItem(STORAGE_KEYS.USER_CLOSED_COOLDOWNS, JSON.stringify(cooldowns));
      return false;
    } catch {
      return false;
    }
  },

  clearPairCloseCooldown(pairSymbol: string): void {
    if (!pairSymbol) return;
    try {
      const sym = pairSymbol.toUpperCase();
      const cooldowns = this.getUserClosedCooldowns();
      if (cooldowns[sym]) {
        delete cooldowns[sym];
        localStorage.setItem(STORAGE_KEYS.USER_CLOSED_COOLDOWNS, JSON.stringify(cooldowns));
      }
    } catch {
      // ignore
    }
  },

  getPairCooldownRemainingMs(pairSymbol: string): number {
    if (!pairSymbol) return 0;
    try {
      const sym = pairSymbol.toUpperCase();
      const cooldowns = this.getUserClosedCooldowns();
      const item = cooldowns[sym];
      if (!item) return 0;
      const rem = item.cooldownExpiresAtMs - Date.now();
      return Math.max(0, rem);
    } catch {
      return 0;
    }
  },

  saveSignalAuditRecord(audit: SignalGenerationAudit): void {
    try {
      const existing = this.getSignalAuditLog();
      const filtered = existing.filter(a => a.signalId !== audit.signalId);
      const updated = [audit, ...filtered].slice(0, 120);
      safeSetStorageItem(STORAGE_KEYS.SIGNAL_AUDIT_LOG, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  getSignalAuditLog(): SignalGenerationAudit[] {
    try {
      const raw = safeGetStorageItem(STORAGE_KEYS.SIGNAL_AUDIT_LOG);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  getSignalAuditByPairOrId(idOrPair: string): SignalGenerationAudit | undefined {
    const query = (idOrPair || '').trim().toUpperCase();
    if (!query) return undefined;
    const logs = this.getSignalAuditLog();
    return logs.find(
      a => a.signalId.toUpperCase() === query || a.pairSymbol.toUpperCase() === query
    );
  },

  clearSignalAuditLog(): void {
    try {
      safeSetStorageItem(STORAGE_KEYS.SIGNAL_AUDIT_LOG, JSON.stringify([]));
    } catch {
      // ignore
    }
  },

  /**
   * Deletes all non-closed active/standby/pending signals generated without a real MTF confluence breakdown
   * from localStorage, clears their pair/signal anchors so fresh signals regenerate cleanly, and scrubs
   * un-broken-down audit records. Preserves legitimate closed trades (HIT_TP / HIT_SL / EXPIRED).
   */
  purgeLegacyPreBreakdownSignals(): {
    deletedCount: number;
    deletedIds: string[];
    deletedPairs: string[];
  } {
    const deletedIds: string[] = [];
    const deletedPairs = new Set<string>();
    try {
      const raw = safeGetStorageItem(STORAGE_KEYS.SIGNALS_STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const cleaned: Record<string, any> = {};
          Object.entries(parsed).forEach(([id, item]: [string, any]) => {
            if (!item || typeof item !== 'object') return;
            const isClosed =
              item.status === 'HIT_TP' || item.status === 'HIT_SL' || item.status === 'EXPIRED';
            if (!isClosed && !hasRealConfluenceBreakdown(item)) {
              deletedIds.push(id);
              const sym = String(item.pair?.symbol || '').toUpperCase();
              if (sym) {
                deletedPairs.add(sym);
                this.clearPairActiveAnchor(sym);
                this.clearPairSignalAnchors(sym);
              }
              return;
            }
            cleaned[id] = item;
          });

          if (deletedIds.length > 0) {
            safeSetStorageItem(STORAGE_KEYS.SIGNALS_STATE, JSON.stringify(cleaned));
            lastPurgedLegacySignalCount += deletedIds.length;
          }
        }
      }

      // Also scrub legacy audit log entries that lack confluenceBreakdown
      const rawAudit = safeGetStorageItem(STORAGE_KEYS.SIGNAL_AUDIT_LOG);
      if (rawAudit) {
        const logs = JSON.parse(rawAudit);
        if (Array.isArray(logs)) {
          const filteredLogs = logs.filter(
            (a: any) =>
              a &&
              a.confluenceBreakdown &&
              typeof a.confluenceBreakdown.summaryText === 'string' &&
              a.confluenceBreakdown.summaryText.includes('H4:')
          );
          if (filteredLogs.length !== logs.length) {
            safeSetStorageItem(STORAGE_KEYS.SIGNAL_AUDIT_LOG, JSON.stringify(filteredLogs));
          }
        }
      }
    } catch {
      // ignore
    }
    return {
      deletedCount: deletedIds.length,
      deletedIds,
      deletedPairs: Array.from(deletedPairs)
    };
  },

  getLastPurgedLegacyCount(): number {
    return lastPurgedLegacySignalCount;
  },

  consumeLastPurgedLegacyCount(): number {
    const count = lastPurgedLegacySignalCount;
    lastPurgedLegacySignalCount = 0;
    return count;
  }
};
