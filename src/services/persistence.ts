const STORAGE_KEYS = {
  SIGNAL_ANCHORS: 'fx_signal_session_store_anchors',
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
  getOrAnchorCreatedAt(signalId: string, durationMs: number): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGNAL_ANCHORS);
      const store: Record<string, number> = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const storedTime = store[signalId];

      if (storedTime && storedTime > 0) {
        const elapsed = now - storedTime;
        if (elapsed < 0) {
          store[signalId] = now;
          localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
          return now;
        }

        // If expired beyond validity duration, auto-renew with fresh active anchor
        if (elapsed >= durationMs) {
          store[signalId] = now - 5 * 60 * 1000;
          localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
          return now - 5 * 60 * 1000;
        }

        return storedTime;
      }

      store[signalId] = now;
      localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
      return now;
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
  }
};
