import { AiPersona, CurrencyStrengthItem, ForexPair, ForexSignal } from '../types';
import { calculateSlPips, calculateLotSize, formatPrice, ALL_PAIRS } from './marketData';
import { economicCalendarService } from './economicCalendarService';
import { currencyStrengthService } from './currencyStrengthService';

export const GeminiChatEngine = {
  async generateResponse(
    prompt: string,
    persona: AiPersona,
    currentSignals: ForexSignal[],
    bestTrade: ForexSignal | null,
    history: { text: string; isUser: boolean }[] = [],
    allPairs?: ForexPair[],
    imageDataUrl?: string | null
  ): Promise<string> {
    const pairsList = allPairs && allPairs.length > 0 ? allPairs : ALL_PAIRS;
    const economicEvents = economicCalendarService.getAllEvents();
    const currencyStrengths = currencyStrengthService.getCurrencyStrengths();

    let imageBase64: string | null = null;
    let imageMimeType = 'image/jpeg';
    if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
      const mimeMatch = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      if (mimeMatch) imageMimeType = mimeMatch[1];
      imageBase64 = imageDataUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    }

    // Try server-side Gemini 3.8 Flash endpoint (/api/gemini/chat) first
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          persona,
          currentSignals,
          bestTrade,
          allPairs: pairsList,
          economicEvents,
          currencyStrengths,
          history,
          imageBase64,
          imageMimeType
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.text && typeof data.text === 'string' && data.text.trim().length > 0) {
          return data.text;
        }
      }
    } catch {
      // Fallback to Universal Local Intelligence Engine below
    }

    return this.generateLocalInstitutionalAnalysis(
      prompt,
      persona,
      currentSignals,
      bestTrade,
      pairsList
    );
  },

  generateLocalInstitutionalAnalysis(
    prompt: string,
    persona: AiPersona,
    signals: ForexSignal[],
    bestTrade: ForexSignal | null,
    allPairs: ForexPair[]
  ): string {
    const p = prompt.toLowerCase().trim();

    // 1. Normalize common mobile typos and pair abbreviations
    const normalizedPrompt = p
      .replace(/gpbcad/g, 'gbp/cad')
      .replace(/gpb/g, 'gbp')
      .replace(/gbpcad/g, 'gbp/cad')
      .replace(/xauusd/g, 'xau/usd')
      .replace(/gold/g, 'xau/usd')
      .replace(/silver/g, 'xag/usd')
      .replace(/xagusd/g, 'xag/usd')
      .replace(/eurusd/g, 'eur/usd')
      .replace(/gbpusd/g, 'gbp/usd')
      .replace(/usdjpy/g, 'usd/jpy')
      .replace(/gbpjpy/g, 'gbp/jpy')
      .replace(/gbpaud/g, 'gbp/aud')
      .replace(/euraud/g, 'eur/aud')
      .replace(/eurcad/g, 'eur/cad')
      .replace(/eurjpy/g, 'eur/jpy')
      .replace(/eurgbp/g, 'eur/gbp')
      .replace(/usdcad/g, 'usd/cad')
      .replace(/audusd/g, 'aud/usd')
      .replace(/nzdusd/g, 'nzd/usd')
      .replace(/usdchf/g, 'usd/chf')
      .replace(/eurchf/g, 'eur/chf')
      .replace(/gbpchf/g, 'gbp/chf')
      .replace(/cadjpy/g, 'cad/jpy')
      .replace(/chfjpy/g, 'chf/jpy')
      .replace(/audjpy/g, 'aud/jpy')
      .replace(/audcad/g, 'aud/cad')
      .replace(/audnzd/g, 'aud/nzd')
      .replace(/gbpnzd/g, 'gbp/nzd')
      .replace(/eurnzd/g, 'eur/nzd')
      .replace(/nzdjpy/g, 'nzd/jpy')
      .replace(/nzdcad/g, 'nzd/cad')
      .replace(/btcusd/g, 'btc/usd')
      .replace(/ethusd/g, 'eth/usd');

    const promptClean = normalizedPrompt.replace(/[\/\s\-_]/g, '');
    const events = economicCalendarService.getAllEvents();
    const strengths = currencyStrengthService.getCurrencyStrengths();
    const bestPairings = currencyStrengthService.getBestPairings();

    // 2. Identify target pair if mentioned
    const matchedPair = allPairs.find(pair => {
      const symClean = pair.symbol.toLowerCase().replace('/', '');
      const symSlash = pair.symbol.toLowerCase();
      const pairName = pair.name.toLowerCase();
      return (
        promptClean.includes(symClean) ||
        normalizedPrompt.includes(symSlash) ||
        p.includes(symSlash) ||
        p.includes(symClean) ||
        p.includes(pairName) ||
        (p.includes('gold') && pair.symbol === 'XAU/USD') ||
        (p.includes('silver') && pair.symbol === 'XAG/USD') ||
        (p.includes('oil') && pair.symbol === 'WTI/USD')
      );
    });

    // 3. Check for RE-ENTRY query (e.g., "hit sl and thinking to re-enter. Will it be good to enter gbpcad now?")
    const isReEntryQuery =
      p.includes('re-enter') ||
      p.includes('reenter') ||
      p.includes('re entry') ||
      p.includes('enter again') ||
      p.includes('re-entering') ||
      p.includes('reentering') ||
      p.includes('good to enter') ||
      p.includes('thinking to enter') ||
      p.includes('thinking to re-enter') ||
      p.includes('thinking to reenter') ||
      p.includes('should i enter') ||
      p.includes('can i enter') ||
      p.includes('enter now') ||
      p.includes('entry now') ||
      (matchedPair && (p.includes('enter') || p.includes('buy') || p.includes('sell')) && (p.includes('sl') || p.includes('loss') || p.includes('stopped')));

    if (isReEntryQuery) {
      const targetPair = matchedPair || (bestTrade ? bestTrade.pair : allPairs[0]);
      return this.buildReEntryAnalysis(targetPair, prompt, signals, events, strengths);
    }

    // 4. Check for News / Economic Impact queries
    const isNewsQuery =
      p.includes('news') ||
      p.includes('calendar') ||
      p.includes('nfp') ||
      p.includes('cpi') ||
      p.includes('inflation') ||
      p.includes('fomc') ||
      p.includes('fed') ||
      p.includes('gdp') ||
      p.includes('powell') ||
      p.includes('interest rate') ||
      p.includes('central bank') ||
      p.includes('economic') ||
      p.includes('fundamental') ||
      p.includes('release') ||
      p.includes('impact');

    if (isNewsQuery) {
      return this.buildNewsAndImpactResponse(prompt, events, matchedPair, signals);
    }

    // 5. If specific pair is mentioned (and not a pure lot size calculator query)
    if (matchedPair && !p.includes('calculate') && !p.includes('lot size')) {
      const activeSignal = signals.find(s => s.pair.symbol === matchedPair.symbol);
      if (activeSignal) {
        const isBest = bestTrade?.id === activeSignal.id || p.includes('best trade');
        return this.buildDeepSignalAnalysis(activeSignal, isBest);
      } else {
        return this.buildUniversalPairAnalysis(matchedPair, events, strengths);
      }
    }

    // 6. Best Trade Now / VIP Signal inquiry
    if (p.includes('best trade') || p.includes('vip') || p.includes('top signal') || p.includes('what should i trade')) {
      const trade = bestTrade || signals.find(s => s.pair.symbol.includes('XAU')) || signals[0];
      return this.buildDeepSignalAnalysis(trade, true);
    }

    // 7. General Stop Loss / Losing Streak Diagnostic (ONLY when NO specific pair was requested)
    if (
      p.includes('stop loss') ||
      p.includes('stoploss') ||
      p.includes('hit sl') ||
      p.includes('hits sl') ||
      p.includes('hitting sl') ||
      p.includes('losing streak') ||
      p.includes('too many losses') ||
      p.includes('why sl hit')
    ) {
      return this.buildGeneralStopLossDiagnostic(signals, strengths);
    }

    // 8. Currency Strength / Strongest vs Weakest Currency inquiry
    if (p.includes('strength') || p.includes('strongest') || p.includes('weakest') || p.includes('currency meter') || p.includes('best pair')) {
      const sorted = [...strengths].sort((a, b) => b.strength - a.strength);
      const top2 = sorted.slice(0, 2);
      const bottom2 = sorted.slice(-2);
      return `### 💪 Live Interbank Currency Strength & Best Pairings

**Strongest Currencies Right Now:**
${top2.map(c => `- 🟢 **${c.currency}**: \`${c.strength.toFixed(1)} / 10\` (${c.status.replace('_', ' ')} • 24h: ${c.change24h >= 0 ? '+' : ''}${c.change24h}%)`).join('\n')}

**Weakest Currencies Right Now:**
${bottom2.map(c => `- 🔴 **${c.currency}**: \`${c.strength.toFixed(1)} / 10\` (${c.status.replace('_', ' ')} • 24h: ${c.change24h >= 0 ? '+' : ''}${c.change24h}%)`).join('\n')}

---

### 🎯 Top High-Probability Divergence Pairings:
${bestPairings.slice(0, 3).map(bp => `- **${bp.pair}** → **${bp.action}** (Spread: \`${bp.strengthDiff.toFixed(1)}\` pts | ${bp.confluenceReason})`).join('\n')}

**How to Use:** Pair the strongest currency against the weakest currency and wait for an M15/H1 Order Block pullback in the direction of the divergence.`;
    }

    // 9. Risk Management / Lot size calculation inquiry
    if (p.includes('risk') || p.includes('lot') || p.includes('calculate') || p.includes('1,000') || p.includes('1000') || p.includes('position size')) {
      return `### 📐 Institutional Lot Size & Capital Preservation Matrix

**Standard 1% Risk Model ($1,000 Account Example):**
- **Account Capital:** \`$1,000.00 USD\`
- **Maximum Dollar Risk (1%):** \`$10.00 USD\`

---

### 🧮 Sizing Formula:
\`Lot Size = Cash at Risk ($) ÷ (Stop Loss in Pips × Pip Value per Lot)\`

- **For XAU/USD (Gold) with 30-pip Stop Loss:**
  - 1 pip on 0.01 lot = \`$0.10\`
  - 30 pips on 0.01 lot = \`$3.00\`
  - Recommended Lot Size = **0.03 Lots** (Total risk: \`$9.00\`, 0.9% equity)
  
- **For EUR/USD, GBP/CAD, or GBP/USD with 25-pip Stop Loss:**
  - 1 pip on 0.01 lot = \`$0.10\`
  - Recommended Lot Size = **0.04 Lots** (Total risk: \`$10.00\`, 1.0% equity)

---

### 🛡️ 3 Golden Rules of Capital Preservation:
1. **Never exceed 2%** total open portfolio risk across all concurrent pairs.
2. **Cut losses without hesitation**: Never move a Stop Loss wider.
3. **Asymmetric Yield**: Only enter when target R:R is at least **1:2.0** or higher.`;
    }

    // 10. Smart Money Concepts / FVG / Order Block inquiry
    if (p.includes('fvg') || p.includes('order block') || p.includes('smc') || p.includes('smart money') || p.includes('ict') || p.includes('liquidity')) {
      return `### 🏦 Smart Money Concepts (SMC / ICT) Master Breakdown

**1. Fair Value Gap (FVG):**
- A 3-candle price imbalance where Candle 1's wick and Candle 3's wick do not overlap.
- Represents rapid institutional displacement that leaves unfilled bank orders.
- **Trading Rule:** Wait for price to retrace into the 50% midpoint (Consequent Encroachment) of the FVG before entering in the trend direction.

**2. Institutional Order Block (OB):**
- The last opposing candle before an impulsive break of structure (BOS/MSS).
- Acts as a high-probability institutional demand/supply zone when price returns to mitigate it.

**3. Liquidity Sweep (Stop Hunt / Judas Swing):**
- Price briefly sweeps above Equal Highs (Buy-Side Liquidity) or below Equal Lows (Sell-Side Liquidity) to trigger retail stops before reversing.

✅ **4-Step Execution Checklist:**
1. Higher Timeframe (4H/1D) Bias Alignment
2. Session Liquidity Sweep (London or NY Open)
3. Market Structure Shift (MSS) with Displacement on M5/M15
4. Limit Entry at FVG / Order Block with SL beyond the sweep wick.`;
    }

    // 11. Technical Indicators / Candlesticks / Price Action queries
    if (
      p.includes('rsi') ||
      p.includes('macd') ||
      p.includes('ema') ||
      p.includes('moving average') ||
      p.includes('bollinger') ||
      p.includes('fibonacci') ||
      p.includes('indicator') ||
      p.includes('candlestick') ||
      p.includes('support') ||
      p.includes('resistance') ||
      p.includes('divergence') ||
      p.includes('breakout')
    ) {
      return `### 📊 Technical Analysis & Indicator Confluence Guide

**Query Topic:** *"${prompt}"*

1. **EMA Structure (20 / 50 / 200 EMA):**
   - **200 EMA** defines the institutional macro trend (Bullish above, Bearish below).
   - **20 & 50 EMA** act as dynamic pullback zones during trending London/NY sessions.

2. **RSI (14) & Institutional Divergence:**
   - Avoid buying simply because RSI < 30 in a crash. Instead, look for **Bullish RSI Divergence** (Price makes a Lower Low inside a 4H Order Block while RSI makes a Higher Low).

3. **Fibonacci Retracement (OTE — Optimal Trade Entry):**
   - The **61.8% to 78.6% retracement zone** (ICT Optimal Trade Entry) combined with an unmitigated Fair Value Gap offers the highest R:R entry (typically 1:3 to 1:5).

4. **Support & Resistance vs. Liquidity Pools:**
   - Retail traders place stops just beyond obvious Support/Resistance. Wait for the **sweep wick** through the level and a candle close back inside before entering.`;
    }

    // 12. Trading Sessions / Killzones
    if (p.includes('session') || p.includes('london') || p.includes('new york') || p.includes('asian') || p.includes('tokyo') || p.includes('time to trade') || p.includes('killzone')) {
      return `### 🌍 Global Forex Trading Sessions & Institutional Killzones

1. **Asian Session (Tokyo):** \`00:00 – 09:00 UTC\`
   - Typically forms the consolidation range (Asia High & Asia Low liquidity pools). Best pairs: **USD/JPY, AUD/JPY, AUD/USD**.

2. **London Killzone:** \`07:00 – 10:00 UTC\`
   - Sweeps the Asian range high/low ("Judas Swing") and establishes the true daily trend. Best pairs: **EUR/USD, GBP/USD, GBP/CAD, GBP/JPY, XAU/USD**.

3. **London / New York Overlap (Peak Volume):** \`12:00 – 16:00 UTC\`
   - **70%+ of daily institutional volume** occurs here. US high-impact news (CPI, NFP, GDP) drops at \`12:30 UTC\`, followed by NYSE equity open at \`13:30 UTC\`. Best for **XAU/USD (Gold) and USD/GBP Majors**.`;
    }

    // 13. Prop Firm / Psychology / Leverage / Spread / General Trading Questions
    if (p.includes('prop') || p.includes('ftmo') || p.includes('elev8') || p.includes('drawdown') || p.includes('psychology') || p.includes('leverage') || p.includes('spread') || p.includes('swap') || p.includes('pips')) {
      return `### 🏆 Prop Firm Rules, Execution Mechanics & Trading Psychology

**Addressing your query:** *"${prompt}"*

- **Prop Firm Survival Rule (5% Daily / 10% Max Drawdown):**
  - Risk **0.5% to 1.0% max per trade**. If you lose 2 trades in a single day (-1% to -2%), stop trading for the next 12 hours to prevent emotional revenge trading.
- **Spread, Slippage & News Protection:**
  - During high-impact news releases, interbank liquidity thins out and spreads widen for 60–180 seconds. Always lock Stop Loss at Breakeven before red-folder releases or wait 5–15 minutes after the release to enter.
- **Partial Profit Scaling:**
  - Close **50% of your position at TP1** and move Stop Loss to Entry (Breakeven). This mathematically eliminates risk while leaving 50% runners for TP2 and TP3.`;
    }

    // 14. Universal Open-Ended Synopsis
    const activeRunning = signals.filter(s => s.status === 'RUNNING');
    const pendingSignals = signals.filter(s => s.status === 'PENDING');
    const upcomingHighImpact = events.filter(e => Date.now() < e.timestamp && e.impact === 'HIGH');
    const releasedRecent = events.filter(e => Date.now() >= e.timestamp);
    const sortedStrengths = [...strengths].sort((a, b) => b.strength - a.strength);

    return `### 🌐 Universal AI Copilot Response
**Your Query:** *"${prompt}"*  
**Active Mode:** \`${persona.title}\`

---

### 🧠 1. Direct Analysis & Market Intelligence:
- **Live Terminal Snapshot:** Currently tracking **${allPairs.length} global instruments** with **${signals.length} active institutional signals** (${activeRunning.length} Running in market, ${pendingSignals.length} Pending limit setups).
- **Top High-Confluence Setup Right Now:** **${bestTrade ? `${bestTrade.pair.symbol} (${bestTrade.type.replace('_', ' ')}) at ${formatPrice(bestTrade.pair, bestTrade.entryPrice)} — ${bestTrade.confluenceScore}% Confluence` : 'XAU/USD'}**.
- **Interbank Currency Flow:** Strongest currency is **${sortedStrengths[0]?.currency || 'USD'} (${sortedStrengths[0]?.strength.toFixed(1)}/10)** | Weakest currency is **${sortedStrengths[sortedStrengths.length - 1]?.currency || 'JPY'} (${sortedStrengths[sortedStrengths.length - 1]?.strength.toFixed(1)}/10)**.

---

### 📰 2. Live Economic Calendar & News Catalyst Status:
${releasedRecent.length > 0 ? `- **Latest Released News:** **${releasedRecent[0].currency} ${releasedRecent[0].title}** → Actual: \`${releasedRecent[0].actual}\` vs Forecast: \`${releasedRecent[0].forecast}\` (${releasedRecent[0].surpriseOutcome === 'BEAT_BULLISH' ? '🟢 Bullish Beat' : releasedRecent[0].surpriseOutcome === 'MISSED_BEARISH' ? '🔴 Bearish Miss' : '🟡 Neutral'})` : ''}
${upcomingHighImpact.length > 0 ? `- **Next High-Impact Release:** **${upcomingHighImpact[0].currency} ${upcomingHighImpact[0].title}** (${upcomingHighImpact[0].timeFormatted || 'Upcoming'}) — Forecast: \`${upcomingHighImpact[0].forecast}\` | Affects: \`${(upcomingHighImpact[0].affectedPairs || []).join(', ')}\`` : '- **Upcoming Schedule:** No immediate red-folder embargo in the next 15 minutes.'}

---

### 💡 3. Actionable Guidance for Your Query:
- **To audit any specific pair or re-entry:** Ask e.g. *"Should I re-enter GBP/CAD after hit SL?"* or *"Analyze XAU/USD"* for exact institutional levels.
- **To check news impact:** Ask *"What happens to GBP/CAD if UK CPI beats forecast?"*.
- **To calculate exact risk:** Ask *"Calculate 1% risk on $5,000 for 25 pip SL"*.`;
  },

  /**
   * Dedicated Institutional Re-Entry Diagnostic Engine
   * Directly answers queries like "I was trading gbpcad pair but it hit sl and now thinking to re-enter. Will it be good to enter gbpcad now?"
   */
  buildReEntryAnalysis(
    pair: ForexPair,
    prompt: string,
    signals: ForexSignal[],
    events: ReturnType<typeof economicCalendarService.getAllEvents>,
    strengths: CurrencyStrengthItem[]
  ): string {
    const price = pair.currentPrice || pair.basePrice;
    const [baseCur, quoteCur] = pair.symbol.split('/');
    const baseSt = strengths.find(s => s.currency === baseCur);
    const quoteSt = strengths.find(s => s.currency === quoteCur);

    const baseScore = baseSt ? baseSt.strength : 5.2;
    const quoteScore = quoteSt ? quoteSt.strength : 4.8;
    const strengthDiff = +(baseScore - quoteScore).toFixed(1);

    const isBullishBias = strengthDiff >= 0;
    const isGold = pair.symbol.includes('XAU');
    const isJpy = pair.symbol.includes('JPY');
    const pipMult = isGold ? 10 : isJpy ? 100 : 10000;
    const decimals = isGold || isJpy ? 2 : 4;
    const roundVal = (v: number) => Number(v.toFixed(decimals));

    const slPips = isGold ? 25.0 : 30.0;
    const pullbackOffset = (slPips * 0.4) / pipMult;
    const slOffset = slPips / pipMult;
    const tp1Offset = (slPips * 1.5) / pipMult;
    const tp2Offset = (slPips * 2.8) / pipMult;

    const recommendedEntry = roundVal(
      isBullishBias ? price - pullbackOffset : price + pullbackOffset
    );
    const recommendedSl = roundVal(
      isBullishBias ? recommendedEntry - slOffset : recommendedEntry + slOffset
    );
    const recommendedTp1 = roundVal(
      isBullishBias ? recommendedEntry + tp1Offset : recommendedEntry - tp1Offset
    );
    const recommendedTp2 = roundVal(
      isBullishBias ? recommendedEntry + tp2Offset : recommendedEntry - tp2Offset
    );

    const relatedNews = events.filter(
      e => e.affectedPairs?.includes(pair.symbol) || pair.symbol.includes(e.currency)
    );

    return `### 🎯 INSTITUTIONAL RE-ENTRY AUDIT: **${pair.symbol}** (${pair.name})
**Your Query:** *"${prompt}"*  
**Direct Verdict:** **⚠️ DO NOT MARKET RE-ENTER IMMEDIATELY — WAIT FOR M15 PULLBACK / LIMIT ORDER RETEST**

---

### 🔍 1. Why Did Your ${pair.symbol} Stop Loss Trigger?
1. **Liquidity Sweep (Judas Swing) Mechanism:**
   - In 78% of retail stop-outs, institutional algorithms run price **5 to 15 pips past the previous session low/high** to grab resting stop-loss liquidity before reversing into the true directional expansion.
2. **Interbank Flow & Strength Status:**
   - **${baseCur} Strength:** \`${baseScore.toFixed(1)} / 10\` (${baseSt?.status || 'Active'})
   - **${quoteCur} Strength:** \`${quoteScore.toFixed(1)} / 10\` (${quoteSt?.status || 'Active'})
   - **Divergence:** \`${strengthDiff >= 0 ? `+${strengthDiff}` : strengthDiff}\` pts (${isBullishBias ? `Bullish ${baseCur} preference` : `Bearish ${quoteCur} preference`}).
   - The higher-timeframe trend is **${isBullishBias ? 'Bullish Buy Bias' : 'Bearish Sell Bias'}**, but entering at market right after an SL creates emotional revenge-trading risk.

---

### ✅ 2. 4-Step Institutional Rules for a Safe 2nd Entry:
1. **No Market Revenge Orders:** Never click Buy or Sell instantly after hitting SL while price is still volatile.
2. **Wait for M15 Candle Close:** Confirm that the M15 candle rejected the sweep level with a wick and closed back inside the range (Market Structure Shift).
3. **Set a Pending Limit Order:** Enter strictly at the **50% Fair Value Gap (FVG)** or Order Block discount rather than chasing the market.
4. **Anchor New SL Beyond the Sweep Extreme:** Place the new SL strictly 5 pips below the lowest sweep wick so you are fully protected.

---

### 📊 3. Precision Re-Entry Parameters for ${pair.symbol}:
- **Current Live Market Price:** \`${formatPrice(pair, price)}\`
- **Recommended 2nd Entry Zone:** \`${formatPrice(pair, recommendedEntry)}\` (${isBullishBias ? 'BUY LIMIT at Discount Order Block' : 'SELL LIMIT at Premium Order Block'})
- **Protective Stop Loss (SL):** \`${formatPrice(pair, recommendedSl)}\` (${slPips} pips risk — placed below the sweep wick)
- **Take Profit 1 (TP1):** \`${formatPrice(pair, recommendedTp1)}\` (+${Math.round(slPips * 1.5)} pips • Close 50% lots & move SL to BE)
- **Take Profit 2 (TP2):** \`${formatPrice(pair, recommendedTp2)}\` (+${Math.round(slPips * 2.8)} pips • Runner)
- **Risk:Reward Ratio:** **1:2.8** (Asymmetric Yield)

---

### 📰 4. News & Macro Catalysts:
${
  relatedNews.length > 0
    ? relatedNews
        .slice(0, 2)
        .map(
          e =>
            `- **[${e.currency}] ${e.title}** (${e.impact} Impact • ${Date.now() >= e.timestamp ? `Released: ${e.actual}` : `Upcoming: ${e.timeFormatted}`})`
        )
        .join('\n')
    : `- No immediate high-impact embargo on ${pair.symbol}. Trade structure remains clean.`
}

---

### 📐 5. Sizing & Risk Management (1% Rule):
- **$1,000 Account:** \`0.03 Lots\` (Total risk: \`$9.00\`)
- **$5,000 Account:** \`0.15 Lots\` (Total risk: \`$45.00\`)
- **$10,000 Account:** \`0.30 Lots\` (Total risk: \`$90.00\`)`;
  },

  buildGeneralStopLossDiagnostic(signals: ForexSignal[], strengths: CurrencyStrengthItem[]): string {
    const hitSlSignals = signals.filter(s => s.status === 'HIT_SL');
    const hitTpSignals = signals.filter(s => s.status === 'HIT_TP');
    const sortedStrengths = [...strengths].sort((a, b) => b.strength - a.strength);

    return `### 🛡️ Institutional Stop Loss (SL) & Drawdown Diagnostic

**Direct Audit & Risk Control Analysis:**
Here is the quantitative breakdown of why Stop Losses trigger and the 3 institutional rules to protect your equity:

---

### 🔍 1. Single-Currency Correlation Risk (Multi-Pair Exposure)
- **The Pitfall:** Opening multiple trades with the same base currency (e.g. buying \`EUR/USD\`, \`EUR/CAD\`, and \`EUR/AUD\` simultaneously) is not 3 independent trades — it is **3x leveraged exposure to the Euro**.
- When that currency undergoes an interbank macro rebalancing, all 3 positions trigger Stop Loss at the exact same minute.
- **Institutional Rule:** Never open more than **1 active trade per base currency** at any time.

---

### 📊 2. Live Terminal Signal Status:
${
  hitSlSignals.length > 0
    ? `**Recently Closed SL Signals (${hitSlSignals.length}):**\n` +
      hitSlSignals
        .map(
          s =>
            `- 🔴 **${s.pair.symbol}** (${s.type.replace('_', ' ')}) — Entry: \`${s.entryPrice}\` | SL: \`${s.stopLoss}\``
        )
        .join('\n')
    : `- 🟢 No active Stop Loss triggers recorded in the current session.`
}
${
  hitTpSignals.length > 0
    ? `\n**Recent Take Profit Winners (${hitTpSignals.length}):**\n` +
      hitTpSignals
        .map(
          s =>
            `- 🟢 **${s.pair.symbol}** (${s.type.replace('_', ' ')}) — Hit TP1 at \`${s.takeProfit1}\` (+${s.pips}p)`
        )
        .join('\n')
    : ''
}

---

### 🏛️ 3. Strongest vs Weakest Interbank Divergence:
- **Strongest Currency:** **${sortedStrengths[0]?.currency || 'USD'} (${sortedStrengths[0]?.strength.toFixed(1)}/10)**
- **Weakest Currency:** **${sortedStrengths[sortedStrengths.length - 1]?.currency || 'JPY'} (${sortedStrengths[sortedStrengths.length - 1]?.strength.toFixed(1)}/10)**
- **Best Practice:** Only trade setups where the Currency Strength spread is **≥ 2.5 points** (e.g. ${sortedStrengths[0]?.currency}/${sortedStrengths[sortedStrengths.length - 1]?.currency}).

---

### ✅ 3 Golden Rules to Prevent Premature Stopouts:
1. **Never Chase Market Orders:** Place Limit orders at the 50% Fair Value Gap (FVG) or H1 Order Block discount.
2. **Anchor SL Beyond Sweep Wicks:** Give trades 5–10 pips of breathing room beyond the session high/low.
3. **Lock Breakeven at TP1:** Once TP1 (+1.5R) is achieved, immediately move your Stop Loss to the Entry Price (BE) to eliminate open risk.`;
  },

  buildNewsAndImpactResponse(
    prompt: string,
    events: ReturnType<typeof economicCalendarService.getAllEvents>,
    matchedPair: ForexPair | undefined,
    signals: ForexSignal[]
  ): string {
    const now = Date.now();
    const relevantEvents = matchedPair
      ? events.filter(
          e =>
            e.affectedPairs?.includes(matchedPair.symbol) ||
            matchedPair.symbol.includes(e.currency)
        )
      : events;

    const displayEvents = relevantEvents.length > 0 ? relevantEvents : events;
    const released = displayEvents.filter(e => now >= e.timestamp);
    const upcoming = displayEvents.filter(e => now < e.timestamp);

    let out = `### 📰 Universal News & Economic Impact Intelligence\n`;
    if (matchedPair) {
      const sig = signals.find(s => s.pair.symbol === matchedPair.symbol);
      out += `**Target Pair:** **${matchedPair.symbol}** (Live Price: \`${formatPrice(matchedPair, matchedPair.currentPrice || matchedPair.basePrice)}\`) • Signal Status: ${sig ? `**${sig.type.replace('_', ' ')} (${sig.confluenceScore}% Confluence)**` : '**Standby / Auto-Generates on High-Impact Release**'}\n\n---\n\n`;
    } else {
      out += `**Query:** *"${prompt}"*\n\n---\n\n`;
    }

    if (released.length > 0) {
      out += `### ✅ Recently Released News & Realized Pair Impact:\n`;
      for (const evt of released.slice(0, 3)) {
        const outcomeLabel =
          evt.surpriseOutcome === 'BEAT_BULLISH'
            ? `🟢 BEAT FORECAST (Bullish ${evt.currency})`
            : evt.surpriseOutcome === 'MISSED_BEARISH'
            ? `🔴 MISSED FORECAST (Bearish ${evt.currency})`
            : `🟡 IN-LINE WITH FORECAST (Neutral)`;
        out += `- **[${evt.currency}] ${evt.title}** (${evt.timeFormatted})\n`;
        out += `  - **Result:** Actual \`${evt.actual}\` vs Forecast \`${evt.forecast}\` (Prior: \`${evt.previous}\`) → **${outcomeLabel}**\n`;
        if (evt.releasedSummary) {
          out += `  - **Market Reaction:** ${evt.releasedSummary}\n`;
        }
        if (evt.pairImpacts && evt.pairImpacts.length > 0) {
          const targetImpacts = matchedPair
            ? evt.pairImpacts.filter(pi => pi.pair === matchedPair.symbol)
            : evt.pairImpacts.slice(0, 3);
          for (const pi of targetImpacts) {
            const realizedDir =
              evt.surpriseOutcome === 'BEAT_BULLISH'
                ? pi.ifBullishCurrency
                : pi.ifBearishCurrency;
            out += `  - **${pi.pair} Impact:** **${realizedDir}** (${pi.expectedPips}) — *${pi.explanation}*\n`;
          }
        }
      }
      out += `\n---\n\n`;
    }

    if (upcoming.length > 0) {
      out += `### ⏳ Upcoming Scheduled News & Strategy Playbook:\n`;
      for (const evt of upcoming.slice(0, 4)) {
        const minsLeft = Math.max(1, Math.round((evt.timestamp - now) / 60000));
        out += `- **[${evt.currency}] ${evt.title}** (${evt.impact} Impact • In \`${minsLeft}m\` at ${evt.timeFormatted})\n`;
        out += `  - **Consensus Forecast:** \`${evt.forecast}\` | **Previous:** \`${evt.previous}\`\n`;
        out += `  - **🟢 If Actual Beats Forecast:** ${evt.ifBeatScenario}\n`;
        out += `  - **🔴 If Actual Misses Forecast:** ${evt.ifMissScenario}\n`;
        out += `  - **🛡️ Trade Strategy Adjustment:** ${evt.tradingRule}\n\n`;
      }
    }

    out += `### ⚡ Automatic Signal Page Synchronization:\nWhen any High-Impact event timer hits \`00:00\`, the terminal automatically:\n1. **Generates new Signal Cards** for impacted pairs that weren't previously on the Signals page.\n2. **Boosts Confluence (+5%)** on existing signals aligned with the news outcome.\n3. **Flips/Updates opposing pending setups** so you never trade against a fresh macro catalyst.`;

    return out;
  },

  buildUniversalPairAnalysis(
    pair: ForexPair,
    events: ReturnType<typeof economicCalendarService.getAllEvents>,
    strengths: CurrencyStrengthItem[]
  ): string {
    const price = pair.currentPrice || pair.basePrice;
    const [baseCur, quoteCur] = pair.symbol.split('/');
    const baseSt = strengths.find((s: CurrencyStrengthItem) => s.currency === baseCur);
    const quoteSt = strengths.find((s: CurrencyStrengthItem) => s.currency === quoteCur);
    const relatedNews = events.filter(
      e => e.affectedPairs?.includes(pair.symbol) || pair.symbol.includes(e.currency)
    );

    const baseScore = baseSt ? baseSt.strength : 5.0;
    const quoteScore = quoteSt ? quoteSt.strength : 5.0;
    const strengthDiff = +(baseScore - quoteScore).toFixed(1);
    const priceDeltaPct = pair.basePrice > 0
      ? +(((price - pair.basePrice) / pair.basePrice) * 100).toFixed(2)
      : 0;

    const isBullish = strengthDiff > 0 || (strengthDiff === 0 && priceDeltaPct >= 0);
    const verdict = isBullish ? 'BUY (Bullish Flow)' : 'SELL (Bearish Flow)';
    const isJpy = pair.symbol.includes('JPY');
    const isGold = pair.symbol.includes('XAU');
    const pipMult = isGold ? 10 : isJpy ? 100 : 10000;
    const decimals = isGold || isJpy ? 2 : 4;
    const roundVal = (v: number) => Number(v.toFixed(decimals));

    const slPips = isGold ? 25.0 : 40.0;
    const tp1Pips = slPips * 1.5;
    const tp2Pips = slPips * 2.8;

    const slOffset = slPips / pipMult;
    const tp1Offset = tp1Pips / pipMult;
    const tp2Offset = tp2Pips / pipMult;

    const suggestedSl = roundVal(isBullish ? price - slOffset : price + slOffset);
    const suggestedTp1 = roundVal(isBullish ? price + tp1Offset : price - tp1Offset);
    const suggestedTp2 = roundVal(isBullish ? price + tp2Offset : price - tp2Offset);

    return `### 🎯 INSTITUTIONAL VERDICT: **${verdict}**
**Asset:** **${pair.symbol}** (${pair.name})  
**Live Price:** \`${formatPrice(pair, price)}\` (${priceDeltaPct >= 0 ? '+' : ''}${priceDeltaPct}% 24h)

---

### 📊 1. Actionable Trade Execution Levels:
- **Direction:** **${isBullish ? '🟢 BUY / LONG' : '🔴 SELL / SHORT'}**
- **Optimal Entry Zone:** \`${formatPrice(pair, price)}\` (or limit pullback to order block)
- **Protective Stop Loss (SL):** \`${formatPrice(pair, suggestedSl)}\` (${slPips} pips risk)
- **Take Profit 1 (TP1):** \`${formatPrice(pair, suggestedTp1)}\` (+${tp1Pips} pips • Close 50% lots)
- **Take Profit 2 (TP2):** \`${formatPrice(pair, suggestedTp2)}\` (+${tp2Pips} pips • Runner)
- **Risk:Reward Ratio:** **1:2.8** (Asymmetric Institutional Yield)

---

### 🏛️ 2. Macro & Currency Strength Driver:
- **${baseCur} Strength:** \`${baseScore.toFixed(1)}/10\` (${baseSt?.status || 'Neutral'})
- **${quoteCur} Strength:** \`${quoteScore.toFixed(1)}/10\` (${quoteSt?.status || 'Neutral'})
- **Divergence:** **${strengthDiff >= 0 ? `+${strengthDiff}` : strengthDiff} points** (${isBullish ? `${baseCur} is outperforming ${quoteCur}` : `${quoteCur} is outperforming ${baseCur}`})
- **Technical Bias:** ${isBullish ? 'Price holding above session liquidity; buyers defending demand.' : 'Price rejecting higher liquidity; sellers pushing lower highs.'}

---

### 📰 3. Upcoming News Catalysts for ${pair.symbol}:
${
  relatedNews.length > 0
    ? relatedNews
        .slice(0, 2)
        .map(
          e =>
            `- **[${e.currency}] ${e.title}** (${e.impact} Impact • ${Date.now() >= e.timestamp ? `Released: ${e.actual}` : `Upcoming: ${e.timeFormatted}`})`
        )
        .join('\n')
    : '- No high-impact embargo scheduled for this session.'
}

---

### 📐 4. 1% Risk Micro-Lot Sizing ($1,000 Account):
- **Cash Risk (1%):** \`$10.00 USD\`
- **Recommended Size:** **0.02 to 0.03 Lots** on 0.01 micro-lot broker margin (~$${(pair.minMargin001 || 2.5).toFixed(2)}).`;
  },

  buildDeepSignalAnalysis(signal: ForexSignal, isBestTrade: boolean = false): string {
    const isPending = signal.status === 'PENDING' || signal.isPending;
    const slPips = calculateSlPips(signal) || 15;
    const tfLabel = signal.timeframe;

    const lot1k = calculateLotSize(signal, 1000, 1.0).toFixed(2);
    const lot5k = calculateLotSize(signal, 5000, 1.0).toFixed(2);
    const lot10k = calculateLotSize(signal, 10000, 1.0).toFixed(2);
    const lot50k = calculateLotSize(signal, 50000, 1.0).toFixed(2);

    return `### 🏛️ Institutional Audit: ${signal.pair.symbol} (${signal.pair.name})
${isBestTrade ? '⭐ **AI BEST TRADE NOW — A+ VIP INSTITUTIONAL TIER**\n' : ''}
---

### 📌 1. Execution Mode & Order Classification:
- **Order Execution Type:** **${signal.type}**
- **Chart Timeframe:** **${tfLabel}**
- **Trade Lifecycle State:** ${isPending ? '🟡 **PENDING ORDER** (Awaiting Limit Fill)' : '🟢 **ACTIVE RUNNING TRADE** (Filled & Floating)'}
- **Floating Performance:** ${isPending ? 'Awaiting price touch at entry zone' : `**+${signal.pips} Pips** floating in profit`}

---

${isPending ? `### ⏳ 2. Pending Order Entry Window (${signal.timeframe === 'M15' ? '1 Hour' : signal.timeframe === 'H1' ? '4 Hours' : `${signal.timeframe} cycle`}):
- **Remaining Validation Time:** **${signal.validityTimeLeft}**
- **Session Deadline:** \`${signal.validityExpiresAt}\`
- **Auto-Cancellation Trigger:** ${signal.invalidationTrigger}` : `### 🛡️ 2. Trade Execution & Stop Loss Protection:
- **Trade State:** Active running trade (Open until TP or SL reached — no fixed time expiration).
- **Stop Loss Protection:** Immediate manual/automatic exit if price closes beyond Stop Loss at ${formatPrice(signal.pair, signal.stopLoss)} on the ${tfLabel} candle close.
- **Protective Trailing Rule:** Once TP1 is secured, shift Stop Loss to Entry price (Break-Even).`}

---

### 🎯 3. Precision Institutional Price Levels:
- **Limit/Entry Price:** \`${formatPrice(signal.pair, signal.entryPrice)}\`
- **Protective Stop Loss:** \`${formatPrice(signal.pair, signal.stopLoss)}\` (${slPips} pips risk)
- **Take Profit 1 (TP1):** \`${formatPrice(signal.pair, signal.takeProfit1)}\` (Bank 50% lots)
- **Take Profit 2 (TP2):** \`${formatPrice(signal.pair, signal.takeProfit2)}\` (Bank 30% lots)
- **Take Profit 3 (TP3):** \`${formatPrice(signal.pair, signal.takeProfit3)}\` (Runner)
- **Risk / Reward Ratio:** **${signal.riskReward}**
- **Confluence Quality:** **${signal.confluenceScore}%**

---

### 🔍 4. Smart Money Concepts (ICT/SMC) Audit:
- **Setup Rationale:** ${signal.rationale}
- **Interbank Session:** Active during **${signal.killzone}** for peak market depth.
- **Liquidity Footprint:** Order Block & Fair Value Gap mitigation with institutional order flow confluence.
- **Economic Shield Status:** ${signal.economicRisk}

---

### 📐 5. Prop Firm & Retail Mathematical Lot Sizing (1% Risk Model):
- **Account Capital $1,000:** Recommended size: **${lot1k} Lots** (Max risk: $10.00)
- **Account Capital $5,000:** Recommended size: **${lot5k} Lots** (Max risk: $50.00)
- **Account Capital $10,000:** Recommended size: **${lot10k} Lots** (Max risk: $100.00)
- **Account Capital $50,000 (Prop Firm):** Recommended size: **${lot50k} Lots** (Max risk: $500.00)

---

### 🛡️ 6. Professional Execution Directive:
1. Copy the exact order parameters using the **Copy MT4** button.
2. Set your Take Profit 1 alert and never move your Stop Loss wider.
3. If news volatility spikes or the setup invalidation trigger occurs, delete/cancel order immediately.`;
  }
};
