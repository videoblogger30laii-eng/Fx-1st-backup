# Implementation Plan - Weekend Date Filtering & Trade Synchronization

## Problem Statement
1. **Weekend / Closed Market Dates**: Backtesting and trade generation currently produce trades on weekends (e.g., Saturday Oct 11, 2026), even though forex/synthetic markets are closed or should be filtered out.
2. **Trade Discrepancy**: Closed trades count and records between the backtester and live signal scanner / history do not match up cleanly.

## Proposed Changes
1. **Market Schedule & Weekend Filter Service**:
   - Create or update a utility (`marketSchedule.ts`) that checks whether a given timestamp falls on a weekend (Saturday/Sunday) or closed market hours for forex/indices/crypto.
   - Filter out backtest candle generation and historical trade generation on weekends/closed days.
2. **Backtest Engine Date Filtering**:
   - In `strategyBacktester.ts` and `backtestEngine.ts`, ensure generated/simulated trades only occur on valid trading days (excluding weekends like October 11).
3. **Trade Synchronization Store / Service**:
   - Unify closed trade storage and persistence (`persistence.ts`) so that live executed signals and backtested trade logs share or synchronize state accurately without discrepancy in count or results.
4. **UI & Results Display**:
   - Update Backtest tab and Trade History tab to clearly reflect filtered valid trading sessions and synchronized closed trades count.

## Verification Plan
- Run `compile_applet` and `lint_applet` to ensure zero compilation or syntax errors.
- Test backtest runs to verify no trades are generated on weekends (such as Saturday Oct 11).
- Verify closed trades list matches consistently across live logs and backtester results.
