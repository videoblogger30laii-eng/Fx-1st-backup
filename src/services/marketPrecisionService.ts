import { derivService, DerivTick } from './derivStream';
import { realPriceService } from './RealPriceService';

class MarketPrecisionService {
  private isActive: boolean = true;
  private precisionTickCount: number = 0;
  private lastTickTimestamp: number = Date.now();
  private listeners: ((symbol: string, price: number, source: string) => void)[] = [];
  private unsubscribeDeriv: (() => void) | null = null;

  constructor() {
    this.init();
  }

  public init() {
    try {
      if (this.unsubscribeDeriv) {
        this.unsubscribeDeriv();
      }
      derivService.startLiveStream();
      this.unsubscribeDeriv = derivService.onTick((tick: DerivTick) => {
        if (this.isActive && tick.pairSymbol && tick.quote > 0) {
          this.precisionTickCount++;
          this.lastTickTimestamp = Date.now();
          // Only route via raw socket if TradingView primary feed hasn't updated this pair in the last 8s
          const lastTv = realPriceService.lastLiveTickTime[tick.pairSymbol] || 0;
          if (Date.now() - lastTv > 8000) {
            realPriceService.lastLiveTickTime[tick.pairSymbol] = Date.now();
            realPriceService.updatePrice(tick.pairSymbol, tick.quote, 'Raw WebSocket Precision Feed');
          }
        }
      });
    } catch {}
  }

  public setPrecisionMode(active: boolean) {
    this.isActive = active;
    if (active) {
      this.init();
    }
  }

  public getPrecisionMode(): boolean {
    return this.isActive;
  }

  public getPrecisionMetrics(): { count: number; lagMs: number; source: string } {
    return {
      count: this.precisionTickCount,
      lagMs: Math.max(0, Date.now() - this.lastTickTimestamp),
      source: this.isActive ? 'Raw WebSocket (Sub-ms)' : 'Polled REST'
    };
  }

  public onPrecisionTick(listener: (symbol: string, price: number, source: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const marketPrecisionService = new MarketPrecisionService();
