export interface PairOHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  changePips: number;
  changePercent: number;
  lastUpdated: number;
}

export interface RealPriceTick {
  symbol: string;
  price: number;
  ohlc: PairOHLC;
  timestamp: number;
}

type PriceListener = (tick: RealPriceTick) => void;
type AllPricesListener = (prices: Record<string, number>) => void;

class RealPriceService {
  private goldIntervalId: any = null;
  private fxIntervalId: any = null;
  private btcIntervalId: any = null;

  private isStarted = false;
  private cachedFxRates: Record<string, number> = {};
  public latestPrices: Record<string, number> = {
    'XAU/USD': 4286.20,
    'EUR/USD': 1.1396,
    'GBP/USD': 1.3243,
    'USD/JPY': 157.45,
    'USD/CHF': 0.8286,
    'AUD/USD': 0.7025,
    'NZD/USD': 0.5666,
    'USD/CAD': 1.4137,
    'EUR/GBP': 0.8605,
    'EUR/JPY': 179.43,
    'GBP/JPY': 208.52,
    'BTC/USD': 84290.0,
    'US30': 51500.0,
    'NAS100': 26900.0
  };

  public ohlcStore: Record<string, PairOHLC> = {};

  private listeners: PriceListener[] = [];
  private allPricesListeners: AllPricesListener[] = [];

  constructor() {
    this.initOHLCStore();
  }

  private initOHLCStore() {
    Object.entries(this.latestPrices).forEach(([symbol, price]) => {
      const isGold = symbol.includes('XAU');
      const isJpy = symbol.includes('JPY');
      const offset = isGold ? 4.5 : isJpy ? 0.35 : 0.0025;
      const open = Number((price - offset).toFixed(isGold || isJpy ? 2 : 4));
      const high = Math.max(open, price) + (isGold ? 2.5 : isJpy ? 0.2 : 0.0015);
      const low = Math.min(open, price) - (isGold ? 2.5 : isJpy ? 0.2 : 0.0015);

      this.ohlcStore[symbol] = {
        open,
        high: Number(high.toFixed(isGold || isJpy ? 2 : 4)),
        low: Number(low.toFixed(isGold || isJpy ? 2 : 4)),
        close: price,
        changePips: 0,
        changePercent: 0,
        lastUpdated: Date.now()
      };
      this.recalculateOHLC(symbol, price);
    });
  }

  private recalculateOHLC(symbol: string, currentPrice: number): PairOHLC {
    const prev = this.ohlcStore[symbol] || {
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      close: currentPrice,
      changePips: 0,
      changePercent: 0,
      lastUpdated: Date.now()
    };

    const isGold = symbol.includes('XAU');
    const isJpy = symbol.includes('JPY');
    const digits = isGold || isJpy ? 2 : 4;

    const high = Math.max(prev.high, currentPrice);
    const low = Math.min(prev.low, currentPrice);
    const change = currentPrice - prev.open;
    const changePercent = prev.open > 0 ? (change / prev.open) * 100 : 0;

    // Pip multiplier
    const pipMultiplier = isGold ? 10 : isJpy ? 100 : 10000;
    const changePips = Math.round(change * pipMultiplier * 10) / 10;

    const updated: PairOHLC = {
      open: prev.open,
      high: Number(high.toFixed(digits)),
      low: Number(low.toFixed(digits)),
      close: currentPrice,
      changePips,
      changePercent: Number(changePercent.toFixed(2)),
      lastUpdated: Date.now()
    };

    this.ohlcStore[symbol] = updated;
    return updated;
  }

  /**
   * Starts all real price polling streams:
   * - Gold (XAU/USD): 5 second polling via https://api.gold-api.com/price/XAU
   * - FX Pairs: 10 second polling via https://open.er-api.com/v6/latest/USD
   * - BTC: 8 second polling via Binance API
   */
  public start() {
    if (this.isStarted) return;
    this.isStarted = true;

    // Initial triggers immediately
    this.pollGoldPrice();
    this.pollFxRates();
    this.pollBtcPrice();

    // 1. Gold: Every 5 seconds
    this.goldIntervalId = setInterval(() => {
      this.pollGoldPrice();
    }, 5000);

    // 2. All FX Pairs: Every 10 seconds
    this.fxIntervalId = setInterval(() => {
      this.pollFxRates();
    }, 10000);

    // 3. BTC / Crypto: Every 8 seconds
    this.btcIntervalId = setInterval(() => {
      this.pollBtcPrice();
    }, 8000);
  }

  public stop() {
    if (this.goldIntervalId) clearInterval(this.goldIntervalId);
    if (this.fxIntervalId) clearInterval(this.fxIntervalId);
    if (this.btcIntervalId) clearInterval(this.btcIntervalId);
    this.isStarted = false;
  }

  /**
   * Real Gold Spot Price from https://api.gold-api.com/price/XAU
   */
  public async pollGoldPrice(): Promise<number | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://api.gold-api.com/price/XAU', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (typeof data?.price === 'number' && data.price > 0) {
          const goldPrice = Number(data.price.toFixed(2));
          this.updatePrice('XAU/USD', goldPrice);
          return goldPrice;
        }
      }
    } catch {
      // transient network timeout
    }
    return null;
  }

  /**
   * Real Forex Rates from https://open.er-api.com/v6/latest/USD
   * Calculates all major and minor currency cross rates using:
   * pair_price = rates[quote] / rates[base]
   */
  public async pollFxRates(): Promise<Record<string, number> | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.rates && typeof data.rates === 'object') {
          this.cachedFxRates = data.rates;
          this.updateAllFxPairs(data.rates);
          return data.rates;
        }
      }
    } catch {
      // transient network timeout
    }
    return null;
  }

  /**
   * Real BTC price from Binance API
   */
  public async pollBtcPrice(): Promise<number | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.price) {
          const btcPrice = Number(parseFloat(data.price).toFixed(2));
          this.updatePrice('BTC/USD', btcPrice);
          return btcPrice;
        }
      }
    } catch {
      // transient network timeout
    }
    return null;
  }

  /**
   * Compute and update all Forex Pairs from conversion rates
   */
  private updateAllFxPairs(rates: Record<string, number>) {
    const fxPairs = [
      'EUR/USD',
      'GBP/USD',
      'USD/JPY',
      'USD/CHF',
      'AUD/USD',
      'NZD/USD',
      'USD/CAD',
      'EUR/GBP',
      'EUR/JPY',
      'GBP/JPY'
    ];

    fxPairs.forEach(symbol => {
      const [base, quote] = symbol.split('/');
      const baseRate = rates[base];
      const quoteRate = rates[quote];

      if (baseRate && quoteRate) {
        const rawPrice = quoteRate / baseRate;
        const isJpy = quote === 'JPY';
        const price = Number(rawPrice.toFixed(isJpy ? 2 : 5));
        this.updatePrice(symbol, price);
      }
    });

    this.notifyAllPrices();
  }

  /**
   * Immediate single-pair fetch when user switches symbols
   */
  public async fetchSymbolImmediate(symbol: string): Promise<number> {
    if (symbol === 'XAU/USD') {
      const gold = await this.pollGoldPrice();
      if (gold) return gold;
    } else if (symbol === 'BTC/USD') {
      const btc = await this.pollBtcPrice();
      if (btc) return btc;
    } else if (symbol.includes('/')) {
      const [base, quote] = symbol.split('/');
      // Try Frankfurter on-demand for instant quote
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data?.rates?.[quote]) {
            const isJpy = quote === 'JPY';
            const price = Number(Number(data.rates[quote]).toFixed(isJpy ? 2 : 5));
            this.updatePrice(symbol, price);
            return price;
          }
        }
      } catch {
        // Fallback to cached ER API rates
      }

      if (this.cachedFxRates[base] && this.cachedFxRates[quote]) {
        const raw = this.cachedFxRates[quote] / this.cachedFxRates[base];
        const isJpy = quote === 'JPY';
        const price = Number(raw.toFixed(isJpy ? 2 : 5));
        this.updatePrice(symbol, price);
        return price;
      }
    }

    return this.latestPrices[symbol] || 0;
  }

  private updatePrice(symbol: string, price: number) {
    if (price <= 0) return;
    this.latestPrices[symbol] = price;
    const ohlc = this.recalculateOHLC(symbol, price);

    const tick: RealPriceTick = {
      symbol,
      price,
      ohlc,
      timestamp: Date.now()
    };

    this.notifyListeners(tick);
  }

  public getPrice(symbol: string): number {
    return this.latestPrices[symbol] || 0;
  }

  public getOHLC(symbol: string): PairOHLC {
    return this.ohlcStore[symbol] || {
      open: this.getPrice(symbol),
      high: this.getPrice(symbol),
      low: this.getPrice(symbol),
      close: this.getPrice(symbol),
      changePips: 0,
      changePercent: 0,
      lastUpdated: Date.now()
    };
  }

  private notifyListeners(tick: RealPriceTick) {
    this.listeners.forEach(fn => {
      try {
        fn(tick);
      } catch {
        // safety
      }
    });
  }

  private notifyAllPrices() {
    this.allPricesListeners.forEach(fn => {
      try {
        fn({ ...this.latestPrices });
      } catch {
        // safety
      }
    });
  }

  public onPrice(listener: PriceListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public onAllPrices(listener: AllPricesListener): () => void {
    this.allPricesListeners.push(listener);
    listener({ ...this.latestPrices });
    return () => {
      this.allPricesListeners = this.allPricesListeners.filter(l => l !== listener);
    };
  }
}

export const realPriceService = new RealPriceService();
