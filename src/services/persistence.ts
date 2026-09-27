const STORAGE_KEYS = {
  SIGNAL_ANCHORS: 'fx_signal_session_store_anchors',
  ALERTS: 'fx_user_custom_alerts',
  FAVORITES: 'fx_signal_favorites',
  SIGNAL_ALERTS: 'fx_signal_alerts_toggled',
  PROVIDER: 'fx_market_data_provider',
  INTERVAL: 'fx_refresh_interval',
  TWELVE_DATA_KEY: 'fx_twelve_data_key',
  FINNHUB_KEY: 'fx_finnhub_key',
  DERIV_APP_ID: 'fx_deriv_app_id',
  DERIV_TOKEN: 'fx_deriv_token',
};

export const PersistenceManager = {
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

        // Rollover if expired for > 2 hours
        const rolloverThreshold = durationMs + 2 * 3600 * 1000;
        if (elapsed > rolloverThreshold) {
          store[signalId] = now;
          localStorage.setItem(STORAGE_KEYS.SIGNAL_ANCHORS, JSON.stringify(store));
          return now;
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
  }
};
