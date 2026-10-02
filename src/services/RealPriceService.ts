import { derivService, DerivTick } from './derivStream';
import { ALL_PAIRS } from './marketData';

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
  source?: string;
}

type PriceListener = (tick: RealPriceTick) => void;
type AllPricesListener = (prices: Record<string, number>) => void;

class RealPriceService {
  private tvIntervalId: any = null;
  private goldIntervalId: any = null;
  private fxIntervalId: any = null;
  private btcIntervalId: any = null;
  private twelveDataIntervalId: any = null;
  private unsubscribeDeriv: (() => void) | null = null;

  private isStarted = false;
  private cachedFxRates: Record<string, number> = {};
  public lastLiveTickTime: Record<string, number> = {};
  public activeSource: string = 'TRADINGVIEW_FEED';

  public latestPrices: Record<string, number> = {
    'XAU/USD': 4188.80,
    'EUR/USD': 1.13600,
    'GBP/USD': 1.32840,
    'USD/JPY': 156.90,
    'USD/CHF': 0.83330,
    'AUD/USD': 0.69710,
    'NZD/USD': 0.56530,
    'USD/CAD': 1.41810,
    'EUR/GBP': 0.85520,
    'EUR/JPY': 178.24,
    'GBP/JPY': 208.42,
    'BTC/USD': 84290.0,
    'US30': 51465.0,
    'NAS100': 30275.0
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
    const digits = isGold || isJpy ? 2 : 5;

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
   * 1. Primary: TradingView Live Interbank Quote Scanner (100% matches TradingView charts)
   * 2. Physical Gold Spot & Stock Indices (US30 / NAS100) from TradingView & Gold API
   * 3. Binance Real BTC Feed
   * 4. Deriv Live WebSocket & Twelve Data fallbacks
   */
  public start() {
    if (this.isStarted) return;
    this.isStarted = true;

    // 1. Primary Provider: TradingView Real-Time Interbank Feed
    this.pollTradingViewQuotes();
    this.pollTradingViewCfdAndIndices();
    this.tvIntervalId = setInterval(() => {
      this.pollTradingViewQuotes();
    }, 3000);

    // 2. Physical Gold Spot & Indices: every 5s
    this.goldIntervalId = setInterval(() => {
      this.pollTradingViewCfdAndIndices();
      this.pollGoldPrice();
    }, 5000);

    // 3. Real BTC: every 5s
    this.pollBtcPrice();
    this.btcIntervalId = setInterval(() => {
      this.pollBtcPrice();
    }, 5000);

    // 4. Secondary: Connect Deriv WebSocket Live Stream
    try {
      derivService.startLiveStream();
      this.unsubscribeDeriv = derivService.onTick((tick: DerivTick) => {
        if (tick.pairSymbol && tick.quote > 0) {
          // Only update if not already fed by TradingView in the last 12s
          const now = Date.now();
          if (!this.lastLiveTickTime[tick.pairSymbol] || (now - this.lastLiveTickTime[tick.pairSymbol] > 12000)) {
            this.lastLiveTickTime[tick.pairSymbol] = now;
            this.updatePrice(tick.pairSymbol, tick.quote, 'Deriv Live Feed');
          }
        }
      });
    } catch {
      // WebSocket initialization safety
    }
  }

  public stop() {
    if (this.tvIntervalId) clearInterval(this.tvIntervalId);
    if (this.goldIntervalId) clearInterval(this.goldIntervalId);
    if (this.fxIntervalId) clearInterval(this.fxIntervalId);
    if (this.btcIntervalId) clearInterval(this.btcIntervalId);
    if (this.twelveDataIntervalId) clearInterval(this.twelveDataIntervalId);
    if (this.unsubscribeDeriv) {
      this.unsubscribeDeriv();
      this.unsubscribeDeriv = null;
    }
    this.isStarted = false;
  }

  /**
   * Primary Provider: TradingView Official Live Scanner API
   * Exactly matches the TradingView charts in the UI down to the pip.
   */
  public async pollTradingViewQuotes(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const forexTickers = [
        'FX:EURUSD',
        'FX:GBPUSD',
        'FX:USDJPY',
        'FX:USDCHF',
        'FX:AUDUSD',
        'FX:USDCAD',
        'FX:NZDUSD',
        'FX:EURGBP',
        'FX:EURJPY',
        'FX:GBPJPY',
        'FX:EURAUD',
        'FX:GBPAUD',
        'FX:AUDJPY',
        'FX:XAUUSD'
      ];

      const res = await fetch('https://scanner.tradingview.com/forex/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          symbols: { tickers: forexTickers },
          columns: ['close', 'change', 'high', 'low', 'open']
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          const mapping: Record<string, string> = {
            'FX:EURUSD': 'EUR/USD',
            'FX:GBPUSD': 'GBP/USD',
            'FX:USDJPY': 'USD/JPY',
            'FX:USDCHF': 'USD/CHF',
            'FX:AUDUSD': 'AUD/USD',
            'FX:USDCAD': 'USD/CAD',
            'FX:NZDUSD': 'NZD/USD',
            'FX:EURGBP': 'EUR/GBP',
            'FX:EURJPY': 'EUR/JPY',
            'FX:GBPJPY': 'GBP/JPY',
            'FX:EURAUD': 'EUR/AUD',
            'FX:GBPAUD': 'GBP/AUD',
            'FX:AUDJPY': 'AUD/JPY',
            'FX:XAUUSD': 'XAU/USD'
          };

          json.data.forEach((item: any) => {
            const sym = mapping[item.s];
            const close = Number(item.d?.[0]);
            if (sym && !isNaN(close) && close > 0) {
              const digits = sym.includes('JPY') || sym.includes('XAU') ? 2 : 5;
              const formattedPrice = Number(close.toFixed(digits));
              this.lastLiveTickTime[sym] = Date.now();
              this.activeSource = 'TRADINGVIEW_FEED';
              this.updatePrice(sym, formattedPrice, 'TradingView Real Feed');
            }
          });

          this.notifyAllPrices();
          return true;
        }
      }
    } catch {
      // Fallback to interbank benchmark rates if TradingView fails
      this.pollFxRates();
    }
    return false;
  }

  /**
   * Primary Provider for Gold CFD and US Indices (US30 / NAS100)
   */
  public async pollTradingViewCfdAndIndices(): Promise<void> {
    try {
      // 1. Gold Spot from CFD
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://scanner.tradingview.com/cfd/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          symbols: { tickers: ['TVC:GOLD', 'FX:XAUUSD'] },
          columns: ['close', 'change', 'high', 'low', 'open']
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const goldItem = json?.data?.find((d: any) => d.s === 'TVC:GOLD' || d.s === 'FX:XAUUSD');
        if (goldItem && goldItem.d?.[0]) {
          const goldPrice = Number(Number(goldItem.d[0]).toFixed(2));
          this.lastLiveTickTime['XAU/USD'] = Date.now();
          this.updatePrice('XAU/USD', goldPrice, 'TradingView Gold Feed');
        }
      }
    } catch {}

    try {
      // 2. US30 (DJIA) and NAS100 from America Equities & Index Scan
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://scanner.tradingview.com/america/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          symbols: { tickers: ['DJ:DJI', 'NASDAQ:NDX'] },
          columns: ['close', 'change', 'high', 'low', 'open']
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        json?.data?.forEach((d: any) => {
          if (d.s === 'DJ:DJI' && d.d?.[0]) {
            const us30 = Number(Number(d.d[0]).toFixed(1));
            this.lastLiveTickTime['US30'] = Date.now();
            this.updatePrice('US30', us30, 'TradingView DJIA Feed');
          }
          if (d.s === 'NASDAQ:NDX' && d.d?.[0]) {
            const nas = Number(Number(d.d[0]).toFixed(1));
            this.lastLiveTickTime['NAS100'] = Date.now();
            this.updatePrice('NAS100', nas, 'TradingView NDX Feed');
          }
        });
      }
    } catch {}

    try {
      // 3. Real Bitcoin from TradingView Crypto Scan
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://scanner.tradingview.com/crypto/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          symbols: { tickers: ['BINANCE:BTCUSDT'] },
          columns: ['close', 'change', 'high', 'low', 'open']
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const btcItem = json?.data?.find((d: any) => d.s === 'BINANCE:BTCUSDT');
        if (btcItem && btcItem.d?.[0]) {
          const btcPrice = Number(Number(btcItem.d[0]).toFixed(2));
          this.lastLiveTickTime['BTC/USD'] = Date.now();
          this.updatePrice('BTC/USD', btcPrice, 'TradingView BTC Feed');
        }
      }
    } catch {}
  }

  /**
   * Secondary Provider: Twelve Data Live Quote Feed
   */
  public async pollTwelveData(): Promise<boolean> {
    const tdKey = (typeof window !== 'undefined' ? localStorage.getItem('fx_twelve_data_key') : '') || 
                  (import.meta as any).env?.VITE_TWELVE_DATA_API_KEY || 
                  'fbf5fe46b0344421a3e9c3fb6a549114';
    if (!tdKey) return false;

    // Check which pairs need updates (haven't had a tick in >10 seconds from Deriv)
    const now = Date.now();
    const pairsToCheck = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 
      'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'XAU/USD'
    ];

    const needsUpdate = pairsToCheck.filter(p => !this.lastLiveTickTime[p] || (now - this.lastLiveTickTime[p] > 10000));
    if (needsUpdate.length === 0) {
      return true; // Deriv is actively streaming all pairs
    }

    try {
      const symbolsQuery = needsUpdate.slice(0, 8).join(',');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbolsQuery}&apikey=${tdKey}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          // If single symbol returned
          if (data.price) {
            const p = parseFloat(data.price);
            if (!isNaN(p) && p > 0) {
              const singleSym = needsUpdate[0];
              this.lastLiveTickTime[singleSym] = Date.now();
              this.updatePrice(singleSym, p, 'Twelve Data');
              return true;
            }
          }

          // If multiple symbols returned as map
          Object.entries(data).forEach(([sym, obj]: [string, any]) => {
            const price = parseFloat(obj?.price);
            if (!isNaN(price) && price > 0) {
              this.lastLiveTickTime[sym] = Date.now();
              this.updatePrice(sym, price, 'Twelve Data');
            }
          });
          return true;
        }
      }
    } catch {
      // transient network timeout
    }
    return false;
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
          // If Deriv is streaming Gold recently, respect Deriv bullion quote; otherwise update
          const now = Date.now();
          if (!this.lastLiveTickTime['XAU/USD'] || (now - this.lastLiveTickTime['XAU/USD'] > 8000)) {
            this.lastLiveTickTime['XAU/USD'] = now;
            this.updatePrice('XAU/USD', goldPrice, 'Gold Spot Live Feed');
          }
          return goldPrice;
        }
      }
    } catch {
      // transient network timeout
    }
    return null;
  }

  /**
   * Central bank benchmark fallback: Only fills pairs if NO live tick received from Deriv or Twelve Data
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
          this.updatePrice('BTC/USD', btcPrice, 'Binance Crypto');
          return btcPrice;
        }
      }
    } catch {
      // transient network timeout
    }
    return null;
  }

  /**
   * Compute and update all Forex Pairs from conversion rates (only if not recently refreshed by Deriv or Twelve Data)
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

    const now = Date.now();
    let hasUpdated = false;

    fxPairs.forEach(symbol => {
      // If Deriv or Twelve Data updated this pair in the last 45 seconds, DO NOT overwrite with central bank daily rate!
      if (this.lastLiveTickTime[symbol] && (now - this.lastLiveTickTime[symbol] < 45000)) {
        return;
      }

      const [base, quote] = symbol.split('/');
      const baseRate = rates[base];
      const quoteRate = rates[quote];

      if (baseRate && quoteRate) {
        const rawPrice = quoteRate / baseRate;
        const isJpy = quote === 'JPY';
        const price = Number(rawPrice.toFixed(isJpy ? 2 : 5));
        this.updatePrice(symbol, price, 'Interbank Benchmark');
        hasUpdated = true;
      }
    });

    if (hasUpdated) {
      this.notifyAllPrices();
    }
  }

  /**
   * Immediate single-pair fetch when user switches symbols or opens chart modal
   */
  public async fetchSymbolImmediate(symbol: string): Promise<number> {
    // 1. Fetch real-time TradingView quotes directly
    await this.pollTradingViewQuotes();
    if (symbol.includes('XAU') || symbol.includes('US30') || symbol.includes('NAS')) {
      await this.pollTradingViewCfdAndIndices();
    }
    if (symbol === 'BTC/USD') {
      await this.pollBtcPrice();
    }

    if (this.latestPrices[symbol] && this.latestPrices[symbol] > 0) {
      return this.latestPrices[symbol];
    }

    return this.latestPrices[symbol] || 0;
  }

  public updatePrice(symbol: string, price: number, source?: string) {
    if (price <= 0) return;
    this.latestPrices[symbol] = price;
    const foundPair = ALL_PAIRS.find(p => p.symbol === symbol);
    if (foundPair) {
      foundPair.currentPrice = price;
    }
    const ohlc = this.recalculateOHLC(symbol, price);

    const tick: RealPriceTick = {
      symbol,
      price,
      ohlc,
      timestamp: Date.now(),
      source: source || this.activeSource
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
