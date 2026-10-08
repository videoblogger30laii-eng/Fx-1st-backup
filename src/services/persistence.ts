const STORAGE_KEYS = {
  SIGNAL_ANCHORS: 'fx_signal_session_store_anchors_v3',
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
  LIVE_FORWARD_TRADES: 'elev8_live_forward',
  SIGNALS_STATE: 'fx_signals_state_v5',
  NOTIFIED_TRANSITIONS: 'fx_notified_transitions_v5',
};

export const PersistenceManager = {
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

      if (storedTime && storedTime > 0) {
        return storedTime;
      }

      // Compute a deterministic, timeframe-proportional initial age
      let seed = 0;
      for (let i = 0; i < signalId.length; i++) {
        seed = (seed * 31 + signalId.charCodeAt(i)) & 0x7fffffff;
      }
      const jitterFraction = 0.12 + ((seed % 17) / 100);
      const defaultAgeMs =
        typeof initialAgeMs === 'number' && initialAgeMs > 0
          ? initialAgeMs
          : Math.round(durationMs * jitterFraction);

      const initialAnchor = now - defaultAgeMs;
      store[signalId] = initialAnchor;
      localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
      return initialAnchor;
    } catch {
      return Date.now();
    }
  },

  renewSignalAnchor(signalId: string, timestamp: number = Date.now()): void {
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
      const map: Record<string, any> = {};
      signals.forEach(s => {
        if (!s || !s.id) return;
        if (s.isLiveSynced || s.status === 'HIT_SL' || s.status === 'HIT_TP' || s.id.startsWith('SIG-NEWS-')) {
          map[s.id] = {
            ...s,
            savedAt: now
          };
        }
      });
      localStorage.setItem(STORAGE_KEYS.SIGNALS_STATE, JSON.stringify(map));
    } catch {
      // ignore
    }
  },

  getSavedSignalsState(): Record<string, any> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNALS_STATE);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      const now = Date.now();
      const valid: Record<string, any> = {};
      Object.entries(parsed).forEach(([id, item]: [string, any]) => {
        if (item && typeof item === 'object') {
          const savedAt = item.savedAt || now;
          // Keep state valid for 12 hours
          if (now - savedAt < 12 * 3600 * 1000) {
            valid[id] = item;
          }
        }
      });
      return valid;
    } catch {
      return {};
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
