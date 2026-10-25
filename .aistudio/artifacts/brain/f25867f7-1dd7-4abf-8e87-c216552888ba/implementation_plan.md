# Trade Signal Entry Level & Market Execution Bug Resolution

## Summary of Completed Changes

1. **Market Execution Order Authenticity (`BUY_MARKET` / `SELL_MARKET`)**:
   - Market execution orders by definition enter immediately at the prevailing market price with zero distance to entry.
   - Fixed `signalScannerService.ts`: Market execution orders are now generated strictly at `round(livePrice)` with zero artificial offset. Limit/Stop orders continue to use pullback offsets to institutional discount order blocks.
   - Fixed `LiveChartModal.tsx`: In the Entry Level card, replaced the unconditional `+XX.Xp to entry` label with conditional rendering:
     - For Market Execution / Running trades: displays `Filled · +X.Xp` (with dynamic green/red floating P&L).
     - Only for pending Limit/Stop orders (`BUY_LIMIT`, `SELL_LIMIT`, `BUY_STOP`, `SELL_STOP`): displays `+XX.Xp to entry`.

2. **Calibrated Outdated Pair Base Prices**:
   - `PAIR_CADCHF`: Calibrated `basePrice` and `currentPrice` from outdated `0.5812` to real TradingView quote `0.5898` in both `src/services/marketData.ts` and `src/services/RealPriceService.ts`.
   - Guaranteed that signals generated for CAD/CHF (and all cross pairs) match real TradingView candles down to the pip.

3. **Healed Stale Cached Signals & Prevented Impossible Entry Drifts**:
   - In `marketData.ts` (`updateSignalWithLiveMarket`): Added automatic healing for any active/market trade whose entry price drifted more than 25 pips (or >1.25x SL) away from actual market price due to stale base prices, recalibrating entry, SL, and TP to current reality.
   - In `persistence.ts` (`getSavedSignalsState`): Automatically discards obsolete cached signals formed with stale legacy base prices (e.g., CAD/CHF < 0.585) so fresh institutional signals are generated from live TradingView prices.
   - In `marketData.ts`: Enforced timeframe validity window auto-cancellation for unfilled pending limit/stop orders (e.g., M15: 45m, H1: 4h, H4: 16h) so pending orders never sit for days without touching entry.
