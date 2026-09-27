export interface DerivTick {
  rawSymbol: string;
  pairSymbol: string;
  quote: number;
  bid: number;
  ask: number;
  epoch: number;
}

export type DerivConnectionStatus = 
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'AUTHENTICATING'
  | 'AUTHORIZED'
  | 'STREAMING'
  | 'ERROR';

export const DERIV_STATUS_LABELS: Record<DerivConnectionStatus, string> = {
  DISCONNECTED: 'Deriv • Disconnected',
  CONNECTING: 'Deriv • Connecting...',
  CONNECTED: 'Deriv • Connected (App ID)',
  AUTHENTICATING: 'Deriv • Authenticating Token...',
  AUTHORIZED: 'Deriv • Authorized & Live',
  STREAMING: 'Deriv • Live Streaming',
  ERROR: 'Deriv • Connection Issue'
};

const SYMBOL_MAPPING: Record<string, string> = {
  frxEURUSD: 'EUR/USD',
  frxGBPUSD: 'GBP/USD',
  frxUSDJPY: 'USD/JPY',
  frxGBPJPY: 'GBP/JPY',
  frxAUDUSD: 'AUD/USD',
  frxUSDCAD: 'USD/CAD',
  frxXAUUSD: 'XAU/USD',
  cryBTCUSD: 'BTC/USD',
  OTC_DJI: 'US30',
  OTC_NDX: 'NAS100'
};

class DerivMarketService {
  private ws: WebSocket | null = null;
  private appId: string = '10154';
  private token: string = '';
  private pingIntervalId: any = null;
  private reconnectTimeoutId: any = null;
  private listeners: ((tick: DerivTick) => void)[] = [];
  private statusListeners: ((status: DerivConnectionStatus) => void)[] = [];
  private currentStatus: DerivConnectionStatus = 'DISCONNECTED';
  public latestQuotes: Record<string, number> = {};

  startLiveStream(appId: string = '10154', token: string = '') {
    const cleanAppId = appId.trim() ? appId.replace(/\D/g, '').slice(0, 5) || '10154' : '10154';
    const cleanToken = token.trim().startsWith('pat_74d') || token.trim().startsWith('34sb')
      ? 'pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c'
      : (token.trim() || 'pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c');

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.appId === cleanAppId && this.token === cleanToken) {
      return;
    }

    this.appId = cleanAppId;
    this.token = cleanToken;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }

    this.setStatus('CONNECTING');

    try {
      const url = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('CONNECTED');

        if (this.token) {
          this.setStatus('AUTHENTICATING');
          this.send({ authorize: this.token });
        }

        // Request initial snapshots
        Object.keys(SYMBOL_MAPPING).forEach(sym => {
          this.send({
            ticks_history: sym,
            end: 'latest',
            count: 1,
            style: 'ticks'
          });
        });

        // Subscribe to live tick stream
        Object.keys(SYMBOL_MAPPING).forEach(sym => {
          this.send({
            ticks: sym,
            subscribe: 1
          });
        });

        // Heartbeat every 20s
        if (this.pingIntervalId) clearInterval(this.pingIntervalId);
        this.pingIntervalId = setInterval(() => {
          this.send({ ping: 1 });
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const msgType = data.msg_type;

          if (data.error) {
            const code = data.error.code;
            if (code === 'InvalidToken' || code === 'AuthorizationRequired') {
              this.setStatus('STREAMING');
              Object.keys(SYMBOL_MAPPING).forEach(sym => {
                this.send({ ticks: sym, subscribe: 1 });
              });
            }
          }

          if (msgType === 'authorize' && data.authorize) {
            this.setStatus('AUTHORIZED');
          }

          if (msgType === 'tick' && data.tick) {
            const rawSym = data.tick.symbol;
            const quote = Number(data.tick.quote);
            const bid = Number(data.tick.bid || quote);
            const ask = Number(data.tick.ask || quote);
            const epoch = Number(data.tick.epoch || Math.floor(Date.now() / 1000));

            if (quote > 0) {
              const pairSymbol = SYMBOL_MAPPING[rawSym] || rawSym;
              this.latestQuotes[rawSym] = quote;
              this.latestQuotes[pairSymbol] = quote;
              this.setStatus('STREAMING');

              const tick: DerivTick = { rawSymbol: rawSym, pairSymbol, quote, bid, ask, epoch };
              this.notifyTick(tick);
            }
          }

          if (msgType === 'history' && data.history) {
            const rawSym = data.echo_req?.ticks_history || '';
            const prices = data.history.prices;
            if (rawSym && Array.isArray(prices) && prices.length > 0) {
              const quote = Number(prices[prices.length - 1]);
              if (quote > 0) {
                const pairSymbol = SYMBOL_MAPPING[rawSym] || rawSym;
                this.latestQuotes[rawSym] = quote;
                this.latestQuotes[pairSymbol] = quote;
                this.setStatus('STREAMING');

                const tick: DerivTick = {
                  rawSymbol: rawSym,
                  pairSymbol,
                  quote,
                  bid: quote,
                  ask: quote,
                  epoch: Math.floor(Date.now() / 1000)
                };
                this.notifyTick(tick);
              }
            }
          }

        } catch {
          // ignore parsing error
        }
      };

      this.ws.onerror = () => {
        this.setStatus('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.ws.onclose = () => {
        this.setStatus('DISCONNECTED');
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  private send(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch {
        // ignore
      }
    }
  }

  private setStatus(status: DerivConnectionStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  private notifyTick(tick: DerivTick) {
    this.listeners.forEach(listener => listener(tick));
  }

  private scheduleReconnect() {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    this.reconnectTimeoutId = setTimeout(() => {
      this.startLiveStream(this.appId, this.token);
    }, 4000);
  }

  onTick(listener: (tick: DerivTick) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onStatusChange(listener: (status: DerivConnectionStatus) => void) {
    this.statusListeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }
}

export const derivService = new DerivMarketService();
