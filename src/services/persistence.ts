const STORAGE_KEYS = {
  SIGNAL_ANCHORS: 'fx_signal_session_store_anchors_v6',
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
  SIGNALS_STATE: 'fx_signals_state_v6',
  NOTIFIED_TRANSITIONS: 'fx_notified_transitions_v6',
  CLOSED_TRADES_RETENTION: 'fx_closed_trades_retention_v1',
  CLOSED_TIME_RANGE: 'fx_closed_time_range_v1',
  CLOSED_SORT_OPTION: 'fx_closed_sort_option_v1',
  CLOSED_CUSTOM_RANGE: 'fx_closed_custom_range_v1',
  ENABLED_STRATEGIES: 'fx_enabled_strategies_v1',
};

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
          // Auto-migrate legacy 8-strategy array to include OPENING_RANGE_BOX_PIVOT
          if (!parsed.includes('OPENING_RANGE_BOX_PIVOT') && parsed.length >= 7) {
            parsed.splice(1, 0, 'OPENING_RANGE_BOX_PIVOT');
            this.saveEnabledStrategies(parsed);
          }
          return parsed;
        }
      }
      return [
        'MASTER_OMNI_CONFLUENCE',
        'OPENING_RANGE_BOX_PIVOT',
        'BEST_TRADE_NOW',
        'ICT_SMART_MONEY',
        'ICT_SILVER_BULLET',
        'MTF_FRACTAL_ALIGNMENT',
        'TREND_EMA_CONFLUENCE',
        'VOLATILITY_SQUEEZE_BREAKOUT',
        'LIQUIDITY_SWEEP'
      ];
    } catch {
      return [
        'MASTER_OMNI_CONFLUENCE',
        'OPENING_RANGE_BOX_PIVOT',
        'BEST_TRADE_NOW',
        'ICT_SMART_MONEY',
        'ICT_SILVER_BULLET',
        'MTF_FRACTAL_ALIGNMENT',
        'TREND_EMA_CONFLUENCE',
        'VOLATILITY_SQUEEZE_BREAKOUT',
        'LIQUIDITY_SWEEP'
      ];
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
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      const store: Record<string, number> = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const storedTime = store[signalId];

      const nowDate = new Date(now);
      const day = nowDate.getUTCDay();
      const hour = nowDate.getUTCHours();
      const minute = nowDate.getUTCMinutes();
      const totalMins = hour * 60 + minute;
      const isWeekend = (day === 5 && totalMins >= 1320) || day === 6 || (day === 0 && totalMins < 1320);

      // Once a signal's creation time is anchored, keep it locked for up to 7 days
      if (storedTime && storedTime > 0) {
        if (!isWeekend && now - storedTime < 7 * 24 * 3600 * 1000 && storedTime <= now) {
          return storedTime;
        }
        if (isWeekend) {
          // If stored during weekend, verify it is anchored on or prior to Friday 22:00 GMT close
          const lastFridayClose = new Date(now);
          const daysBack = day === 5 ? 0 : day === 6 ? 1 : 2;
          lastFridayClose.setUTCDate(lastFridayClose.getUTCDate() - daysBack);
          lastFridayClose.setUTCHours(22, 0, 0, 0);
          if (storedTime <= lastFridayClose.getTime()) {
            return storedTime;
          }
        }
      }

      let seed = 0;
      for (let i = 0; i < signalId.length; i++) {
        seed = (seed * 31 + signalId.charCodeAt(i)) & 0x7fffffff;
      }

      if (isWeekend) {
        // Anchor to Friday active session before 22:00 GMT close (e.g. 15:30 - 18:30 GMT during London/NY overlap)
        const fridayAnchor = new Date(now);
        const daysBack = day === 5 ? 0 : day === 6 ? 1 : 2;
        fridayAnchor.setUTCDate(fridayAnchor.getUTCDate() - daysBack);
        const sessionHour = 15 + (seed % 4); // 15:00 to 18:00 GMT
        const sessionMin = 10 + (seed % 40);
        fridayAnchor.setUTCHours(sessionHour, sessionMin, 0, 0);
        const initialAnchor = fridayAnchor.getTime();
        store[signalId] = initialAnchor;
        localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
        return initialAnchor;
      }

      const safeDuration = Math.max(15 * 60 * 1000, durationMs || 4 * 3600 * 1000);
      const jitterFraction = 0.12 + ((seed % 14) / 100);
      const defaultAgeMs =
        typeof initialAgeMs === 'number' && initialAgeMs > 0
          ? initialAgeMs
          : Math.round(safeDuration * jitterFraction);

      const initialAnchor = now - defaultAgeMs;
      store[signalId] = initialAnchor;
      localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
      return initialAnchor;
    } catch {
      return Date.now() - 25 * 60 * 1000;
    }
  },

  getAnchoredCreatedAt(signalId: string): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      if (!raw) return null;
      const store: Record<string, number> = JSON.parse(raw);
      const val = store[signalId];
      return typeof val === 'number' && val > 0 ? val : null;
    } catch {
      return null;
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

  setExplicitSignalAnchor(signalId: string, timestamp: number): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      const store: Record<string, number> = raw ? JSON.parse(raw) : {};
      store[signalId] = timestamp;
      localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
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
      if (!Array.isArray(signals) || signals.length === 0) return;
      const now = Date.now();
      const existing = this.getSavedSignalsState();
      const map: Record<string, any> = { ...existing };
      const pendingTransitionEvents: SignalTransitionEvent[] = [];

      signals.forEach(s => {
        if (!s || !s.id) return;
        const sym = String(s.pair?.symbol || '').toUpperCase();
        const isClosed = s.status === 'HIT_SL' || s.status === 'HIT_TP' || s.status === 'EXPIRED';
        if (isClosed && (sym.includes('XAG') || sym.includes('SILVER') || s.id.toUpperCase().includes('XAG') || s.id.toUpperCase().includes('SILVER'))) {
          delete map[s.id];
          return;
        }

        const prior = existing[s.id] || {};
        const prevStatus = prior.status;
        const anchored = this.getAnchoredCreatedAt(s.id);
        const candidates = [
          typeof prior.createdAtMs === 'number' && prior.createdAtMs > 0 ? prior.createdAtMs : Infinity,
          typeof anchored === 'number' && anchored > 0 ? anchored : Infinity,
          typeof s.createdAtMs === 'number' && s.createdAtMs > 0 ? s.createdAtMs : Infinity
        ].filter(v => v !== Infinity && v <= now + 5000);

        let lockedCreatedAt = candidates.length > 0 ? Math.min(...candidates) : now;

        // If this is an active signal, check if there were earlier active signals for the same pair in map
        if (!isClosed && sym) {
          Object.entries(map).forEach(([otherId, otherItem]: [string, any]) => {
            if (otherId !== s.id && otherItem && String(otherItem.pair?.symbol || '').toUpperCase() === sym) {
              const otherClosed = otherItem.status === 'HIT_SL' || otherItem.status === 'HIT_TP' || otherItem.status === 'EXPIRED';
              if (!otherClosed) {
                const otherCreated = typeof otherItem.createdAtMs === 'number' && otherItem.createdAtMs > 0
                  ? otherItem.createdAtMs
                  : (typeof otherItem.savedAt === 'number' && otherItem.savedAt > 0 ? otherItem.savedAt : Infinity);
                if (otherCreated < lockedCreatedAt) {
                  lockedCreatedAt = otherCreated;
                }
                delete map[otherId];
              }
            }
          });
        }

        this.renewSignalAnchor(s.id, lockedCreatedAt);

        const resolvedClosedAtMs = s.closedAtMs || prior.closedAtMs || (isClosed ? now : undefined);
        const updatedRecord = {
          ...prior,
          ...s,
          createdAtMs: lockedCreatedAt,
          savedAt: prior.savedAt || now,
          closedAtMs: resolvedClosedAtMs
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
      localStorage.setItem(STORAGE_KEYS.SIGNALS_STATE, JSON.stringify(map));

      if (pendingTransitionEvents.length > 0) {
        pendingTransitionEvents.forEach(evt => this.emitSignalTransition(evt));
      }
    } catch {
      // ignore
    }
  },

  getSavedSignalsState(): Record<string, any> {
    try {
      const rawV6 = localStorage.getItem(STORAGE_KEYS.SIGNALS_STATE);
      const rawV5 = localStorage.getItem('fx_signals_state_v5');
      const parsedV6 = rawV6 ? JSON.parse(rawV6) : {};
      const parsedV5 = rawV5 ? JSON.parse(rawV5) : {};
      const merged = { ...(typeof parsedV5 === 'object' ? parsedV5 : {}), ...(typeof parsedV6 === 'object' ? parsedV6 : {}) };

      const rawAnchors = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      const anchorStore: Record<string, number> = rawAnchors ? JSON.parse(rawAnchors) : {};
      let anchorsModified = false;

      const canonicalPairAnchorIds: Record<string, string> = {
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

      const now = Date.now();
      const valid: Record<string, any> = {};

      const retention = this.getClosedTradesRetention();
      const maxClosedAgeMs =
        retention === '24H' ? 24 * 3600 * 1000 :
        retention === '48H' ? 48 * 3600 * 1000 :
        retention === '1W' ? 7 * 24 * 3600 * 1000 :
        retention === '1M' ? 30 * 24 * 3600 * 1000 :
        retention === 'ALL' ? Number.MAX_SAFE_INTEGER :
        90 * 24 * 3600 * 1000; // default 90 days retention

      const activeByPair = new Map<string, { id: string; item: any; earliestCreatedAt: number; latestSavedAt: number }>();

      Object.entries(merged).forEach(([id, item]: [string, any]) => {
        if (item && typeof item === 'object') {
          if (id.includes('USDCHF') && id.startsWith('SIG-NEWS-')) {
            return;
          }
          // Ignore legacy broken SIG-XAU-LIVE fallback duplicates
          if (id.startsWith('SIG-XAU-LIVE-')) {
            return;
          }
          const savedAt = item.savedAt || now;
          const isClosed = item.status === 'HIT_SL' || item.status === 'HIT_TP' || item.status === 'EXPIRED';
          const itemSym = String(item.pair?.symbol || '').toUpperCase();
          if (isClosed && (itemSym.includes('XAG') || itemSym.includes('SILVER') || id.toUpperCase().includes('XAG') || id.toUpperCase().includes('SILVER'))) {
            return;
          }
          const maxAge = isClosed ? maxClosedAgeMs : 7 * 24 * 3600 * 1000;

          if (now - savedAt < maxAge) {
            if (isClosed || !itemSym) {
              valid[id] = item;
            } else {
              const anchoredForId = anchorStore[id];
              const itemCreated =
                typeof item.createdAtMs === 'number' && item.createdAtMs > 0
                  ? item.createdAtMs
                  : savedAt;
              const effectiveItemCreated =
                typeof anchoredForId === 'number' && anchoredForId > 0
                  ? Math.min(itemCreated, anchoredForId)
                  : itemCreated;

              const existingPairEntry = activeByPair.get(itemSym);
              if (!existingPairEntry) {
                activeByPair.set(itemSym, {
                  id,
                  item,
                  earliestCreatedAt: Math.min(effectiveItemCreated, savedAt),
                  latestSavedAt: savedAt
                });
              } else {
                const earliestCreatedAt = Math.min(
                  existingPairEntry.earliestCreatedAt,
                  effectiveItemCreated,
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
        }
      });

      const defaultPairInitialAgeMs: Record<string, number> = {
        'XAU/USD': 18 * 60 * 1000,
        'EUR/USD': 12 * 60 * 1000,
        'GBP/USD': 45 * 60 * 1000,
        'USD/JPY': 25 * 60 * 1000,
        'GBP/JPY': 60 * 60 * 1000,
        'AUD/USD': 25 * 60 * 1000,
        'EUR/CAD': 30 * 60 * 1000,
        'USD/CAD': 45 * 60 * 1000,
        'CAD/JPY': 45 * 60 * 1000,
        'EUR/AUD': 50 * 60 * 1000,
        'EUR/GBP': 60 * 60 * 1000,
        'AUD/JPY': 40 * 60 * 1000,
        'GBP/AUD': 20 * 60 * 1000,
        'XAG/USD': 60 * 60 * 1000,
        'EUR/JPY': 25 * 60 * 1000
      };

      activeByPair.forEach(({ id, item, earliestCreatedAt }, itemSym) => {
        let resolvedCreatedAt = earliestCreatedAt;

        // If this active signal was spawned by a prior browser refresh without an explicit anchor in SIGNAL_ANCHORS,
        // recover its original session generation time from the pair's canonical anchor in SIGNAL_ANCHORS
        if (!anchorStore[id]) {
          const canonicalId = canonicalPairAnchorIds[itemSym];
          const canonicalAnchor = canonicalId ? anchorStore[canonicalId] : undefined;
          if (
            typeof canonicalAnchor === 'number' &&
            canonicalAnchor > 0 &&
            canonicalAnchor < resolvedCreatedAt &&
            now - canonicalAnchor < 7 * 24 * 3600 * 1000
          ) {
            resolvedCreatedAt = canonicalAnchor;
          }
          // If it still appears < 5 minutes old due to prior refresh regeneration, restore the pair's session age
          if (now - resolvedCreatedAt < 5 * 60 * 1000) {
            const fallbackAge = defaultPairInitialAgeMs[itemSym] || 25 * 60 * 1000;
            resolvedCreatedAt = Math.min(resolvedCreatedAt, now - fallbackAge);
          }
          anchorStore[id] = resolvedCreatedAt;
          anchorsModified = true;
        } else if (anchorStore[id] < resolvedCreatedAt) {
          resolvedCreatedAt = anchorStore[id];
        } else if (resolvedCreatedAt < anchorStore[id]) {
          anchorStore[id] = resolvedCreatedAt;
          anchorsModified = true;
        }

        valid[id] = {
          ...item,
          createdAtMs: resolvedCreatedAt
        };
      });

      if (anchorsModified) {
        try {
          localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(anchorStore));
        } catch {
          // ignore
        }
      }

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
  }
};
