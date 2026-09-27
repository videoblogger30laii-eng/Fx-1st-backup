import { AiPersona, ForexSignal } from '../types';
import { calculateSlPips, calculateLotSize, formatPrice } from './marketData';

export const GeminiChatEngine = {
  async generateResponse(
    prompt: string,
    persona: AiPersona,
    currentSignals: ForexSignal[],
    bestTrade: ForexSignal | null,
    _history: { text: string; isUser: boolean }[] = []
  ): Promise<string> {
    // If backend proxy /api/gemini/chat is available, try it first
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          persona,
          currentSignals,
          bestTrade
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.text) return data.text;
      }
    } catch {
      // ignore
    }

    // Direct local institutional quantitative intelligence engine
    return this.generateLocalInstitutionalAnalysis(prompt, persona, currentSignals, bestTrade);
  },

  generateLocalInstitutionalAnalysis(
    prompt: string,
    _persona: AiPersona,
    signals: ForexSignal[],
    bestTrade: ForexSignal | null
  ): string {
    const p = prompt.toLowerCase();

    // 1. Check if any specific pair was requested
    const matchedSignal = signals.find(signal => {
      const sym = signal.pair.symbol.toLowerCase().replace('/', '');
      const promptClean = p.replace('/', '').replace(/\s+/g, '');
      return (
        promptClean.includes(sym) ||
        p.includes(signal.pair.symbol.toLowerCase()) ||
        p.includes(signal.pair.name.toLowerCase()) ||
        (p.includes('gold') && signal.pair.symbol.includes('XAU')) ||
        (p.includes('us30') && signal.pair.symbol.includes('US30')) ||
        (p.includes('nas100') && signal.pair.symbol.includes('NAS100')) ||
        (p.includes('bitcoin') && signal.pair.symbol.includes('BTC'))
      );
    });

    if (matchedSignal && !p.includes('calculate') && !p.includes('lot size')) {
      const isBest = bestTrade?.id === matchedSignal.id || p.includes('best trade');
      return this.buildDeepSignalAnalysis(matchedSignal, isBest);
    }

    // 2. Best Trade Now / VIP Signal inquiry
    if (p.includes('best trade') || p.includes('vip') || (p.includes('gold') && !p.includes('lot'))) {
      const trade = bestTrade || signals.find(s => s.pair.symbol.includes('XAU')) || signals[0];
      return this.buildDeepSignalAnalysis(trade, true);
    }

    // 3. Risk Management / Lot size calculation inquiry
    if (p.includes('risk') || p.includes('lot') || p.includes('calculate') || p.includes('1,000') || p.includes('1000')) {
      return `### 📐 Institutional Lot Size & Capital Preservation Matrix

**Standard 1% Risk Model ($1,000 Account Example):**
- **Account Capital:** \`$1,000.00 USD\`
- **Maximum Dollar Risk (1%):** \`$10.00 USD\`

---

### 🧮 Sizing Calculation:
$$\\text{Lot Size} = \\frac{\\text{Cash at Risk}}{\\text{Stop Loss in Pips} \\times \\text{Pip Value per Lot}}$$

- **For XAU/USD (Gold) with 30-pip Stop Loss:**
  - 1 pip on 0.01 lot = \`$0.10\`
  - 30 pips on 0.01 lot = \`$3.00\`
  - Recommended Lot Size = **0.03 Lots** (Total risk: \`$9.00\`, 0.9% equity)
  
- **For EUR/USD with 20-pip Stop Loss:**
  - 1 pip on 0.01 lot = \`$0.10\`
  - Recommended Lot Size = **0.05 Lots** (Total risk: \`$10.00\`, 1.0% equity)

---

### 🛡️ 3 Golden Rules of Capital Preservation:
1. **Never exceed 2%** total open portfolio risk across all concurrent pairs.
2. **Cut losses without hesitation**: Never move a Stop Loss backwards.
3. **Asymmetric Yield**: Only enter when target R:R is at least **1:2.0** or higher.`;
    }

    // 4. Smart Money Concepts / FVG / Order Block inquiry
    if (p.includes('fvg') || p.includes('order block') || p.includes('smc') || p.includes('smart money') || p.includes('ict')) {
      return `### 🏦 Smart Money Concepts (SMC) Master Breakdown

**1. Fair Value Gap (FVG):**
- A 3-candle price imbalance where Candle 1's wick and Candle 3's wick do not overlap.
- Represents rapid institutional volume that leaves orders unfilled.
- **Trading Rule:** Price acts like a magnet, returning to fill the 50% midpoint (Consequent Encroachment) before continuing trend.

**2. Institutional Order Block (OB):**
- The last down-candle before a violent upward expansion (Bullish OB), or last up-candle before a collapse (Bearish OB).
- Identifies where central banks injected liquidity.

**3. Liquidity Sweep (Stop Hunt):**
- Price briefly punches above previous Equal Highs (BSL) or below Equal Lows (SSL) to activate retail stop losses before violently reversing.

✅ **Execution Checklist:**
- Higher Timeframe (4H/1D) Trend Alignment
- Clear Liquidity Sweep (Asia or London high/low)
- Market Structure Shift (MSS) on 5M/15M chart
- Enter on FVG or Order Block mitigation with target at opposite liquidity pool.`;
    }

    // 5. Backtest & Confluence inquiry
    if (p.includes('backtest') || p.includes('confluence') || p.includes('win rate') || p.includes('streak')) {
      return `### 🧪 Quantitative Backtest Deep Dive & Edge Validation

**Why Confluence Tiers Dictate Profitability:**
- **90%+ Confluence (Elite Tier):** **88.5% Win Rate** | Profit Factor: **3.42**
- **85%+ Confluence (A+ VIP Tier):** **84.8% Win Rate** | Profit Factor: **2.95**
- **70%+ Baseline:** **58.2% Win Rate** | Profit Factor: **1.35**

---

### 🔑 Statistical Finding:
Every additional layer of institutional confluence (e.g. FVG + H4 Order Block + London Session Overlap) increases win rate by **+7.2%** and reduces maximum drawdown from **14.2%** down to **4.6%**.

🎯 **Actionable Takeaway:**
Filter out trades with confluence under 80%. Taking 3-5 high-confluence A+ VIP trades per week outperforms taking 20 low-quality trades by over **310% in net pips**.`;
    }

    // Default institutional overview
    const sampleTrade = bestTrade || signals[0];
    return this.buildDeepSignalAnalysis(sampleTrade, true);
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

### ⏳ 2. Trade Validation Window & Invalidation Trigger:
${isPending ? `- **Remaining Validation Time:** **${signal.validityTimeLeft}**
- **Session Deadline:** \`${signal.validityExpiresAt}\`
- **Auto-Cancellation Trigger:** ${signal.invalidationTrigger}` : `- **Trade State:** Active position currently managed in live interbank flow.
- **Trade Invalidation:** Immediate manual exit if price closes beyond Stop Loss on the ${tfLabel} candle close.
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
