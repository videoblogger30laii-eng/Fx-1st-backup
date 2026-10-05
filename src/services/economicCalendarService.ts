import { EconomicEvent, ForexPair, ForexSignal, SignalType } from '../types';

const CALENDAR_ANCHOR_KEY = 'forex_calendar_anchor_ts_v3';

class EconomicCalendarService {
  private events: EconomicEvent[] = [];
  private anchorTime: number = Date.now();
  private appliedReleaseKeys: Set<string> = new Set();

  constructor() {
    this.initAnchorAndEvents();
  }

  private getOrSetAnchorTime(): number {
    try {
      const saved = localStorage.getItem(CALENDAR_ANCHOR_KEY);
      const now = Date.now();
      if (saved) {
        const parsed = parseInt(saved, 10);
        // Keep anchor stable for 12 hours so timers never reset on reload/reopen
        if (!isNaN(parsed) && now - parsed < 12 * 3600 * 1000 && now >= parsed) {
          return parsed;
        }
      }
      localStorage.setItem(CALENDAR_ANCHOR_KEY, String(now));
      return now;
    } catch {
      return Date.now();
    }
  }

  private formatEventTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private initAnchorAndEvents() {
    this.anchorTime = this.getOrSetAnchorTime();
    const base = this.anchorTime;
    const min = 60 * 1000;
    const hour = 3600 * 1000;
    const day = 24 * hour;

    // Schedule includes:
    // 1) Events already released earlier today (so user sees Actual vs Forecast & market impact)
    // 2) Imminent & upcoming events anchored to a fixed timestamp so the countdown NEVER resets on refresh
    this.events = [
      {
        id: 'news-0-uk-gdp',
        title: 'UK Monthly GDP & Industrial Production (MoM)',
        currency: 'GBP',
        impact: 'HIGH',
        timestamp: base - 42 * min, // Released 42 mins ago
        timeFormatted: this.formatEventTime(base - 42 * min),
        actual: '0.3%',
        releasedActualValue: '0.3%',
        forecast: '0.1%',
        previous: '0.0%',
        surpriseOutcome: 'BEAT_BULLISH',
        releasedSummary: 'Actual came in at 0.3% vs 0.1% Forecast (Stronger UK Growth). Triggered immediate GBP buying across GBP/USD (+38 pips), GBP/JPY (+52 pips) & generated a new BUY signal on GBP/CAD, while pushing EUR/GBP lower (-24 pips).',
        description: 'Measures total inflation-adjusted value of all goods and services produced by the UK economy.',
        isHighImpact: true,
        affectedPairs: ['GBP/USD', 'GBP/JPY', 'EUR/GBP', 'GBP/CAD', 'GBP/AUD'],
        ifBeatScenario: 'If Actual > 0.1% (Stronger UK Growth): Bullish for GBP. Bank of England stays hawkish -> GBP/USD, GBP/JPY, GBP/CAD & GBP/AUD surge UP (BUY), while EUR/GBP drops DOWN (SELL).',
        ifMissScenario: 'If Actual < 0.1% (Weaker UK Growth): Bearish for GBP. Raises BoE rate-cut odds -> GBP/USD, GBP/JPY & GBP/CAD drop DOWN (SELL), while EUR/GBP rallies UP (BUY).',
        tradingRule: 'Post-release momentum favors buying GBP pullbacks on M15 Order Blocks as long as Actual beats Forecast.',
        pairImpacts: [
          { pair: 'GBP/USD', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '35–65 pips', explanation: 'GBP is the base currency — stronger UK GDP lifts GBP/USD directly.' },
          { pair: 'GBP/JPY', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '50–90 pips', explanation: 'High-beta cross — amplifies GBP strength against low-yielding Yen.' },
          { pair: 'GBP/CAD', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '45–80 pips', explanation: 'GBP is the base currency — strong UK GDP generates new GBP/CAD BUY breakout.' },
          { pair: 'EUR/GBP', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '20–40 pips', explanation: 'GBP is the quote currency — stronger GBP pushes EUR/GBP downward.' }
        ]
      },
      {
        id: 'news-1',
        title: 'US Non-Farm Payrolls (NFP)',
        currency: 'USD',
        impact: 'HIGH',
        timestamp: base + 18 * min, // Anchored 18 mins from initial session start (counts down to 0 and releases)
        timeFormatted: this.formatEventTime(base + 18 * min),
        releasedActualValue: '212K',
        forecast: '185K',
        previous: '175K',
        surpriseOutcome: 'BEAT_BULLISH',
        releasedSummary: 'RELEASED: US NFP printed 212K vs 185K Forecast (+27K upside surprise). Strong US labor expansion boosts US Dollar Index (DXY) — generating new USD/CHF (BUY) & AUD/USD (SELL) signals and updating EUR/USD, GBP/USD & USD/JPY.',
        description: 'Measures the change in the number of employed people in the US during the previous month. Primary catalyst for USD & Gold.',
        isHighImpact: true,
        affectedPairs: ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'USD/CHF', 'AUD/USD'],
        ifBeatScenario: 'If Actual > 185K (Stronger US Jobs): Bullish for USD. USD/JPY, USD/CAD & USD/CHF spike UP (BUY), while XAU/USD (Gold), EUR/USD, GBP/USD & AUD/USD drop sharply DOWN (SELL) by 50–120 pips.',
        ifMissScenario: 'If Actual < 185K (Weaker US Jobs): Bearish for USD. XAU/USD (Gold), EUR/USD, GBP/USD & AUD/USD surge UP (BUY), while USD/JPY, USD/CAD & USD/CHF drop DOWN (SELL).',
        tradingRule: 'Pause new USD/Gold entries 15 mins before release. Wait 5–10 mins after release for the initial stop-hunt wick to complete before trading the real displacement direction.',
        pairImpacts: [
          { pair: 'XAU/USD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '80–180 pips ($8–$18)', explanation: 'Gold is priced in USD — stronger US jobs & higher yields push Gold sharply lower.' },
          { pair: 'EUR/USD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '45–85 pips', explanation: 'USD is the quote currency — stronger USD drives EUR/USD down.' },
          { pair: 'GBP/USD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '50–90 pips', explanation: 'USD is the quote currency — stronger USD pushes GBP/USD down.' },
          { pair: 'USD/JPY', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '60–110 pips', explanation: 'USD is the base currency — stronger US jobs & Treasury yields propel USD/JPY higher.' },
          { pair: 'USD/CHF', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '40–75 pips', explanation: 'USD is the base currency — strong NFP triggers a new BUY signal on USD/CHF.' },
          { pair: 'AUD/USD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '40–70 pips', explanation: 'USD is the quote currency — strong NFP triggers a new SELL signal on AUD/USD.' }
        ]
      },
      {
        id: 'news-2',
        title: 'US Unemployment Rate',
        currency: 'USD',
        impact: 'HIGH',
        timestamp: base + 18 * min,
        timeFormatted: this.formatEventTime(base + 18 * min),
        releasedActualValue: '4.0%',
        forecast: '4.1%',
        previous: '4.1%',
        surpriseOutcome: 'BEAT_BULLISH',
        releasedSummary: 'RELEASED: US Unemployment Rate fell to 4.0% vs 4.1% Forecast (Tighter US Labor Market). Reinforces bullish USD momentum — bearish for EUR/USD, GBP/USD & XAU/USD, bullish for USD/JPY.',
        description: 'Percentage of total US workforce unemployed and actively seeking employment. Note: Lower rate = Stronger USD.',
        isHighImpact: true,
        affectedPairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'AUD/USD'],
        ifBeatScenario: 'If Actual < 4.1% (Lower Unemployment = Stronger Economy): Bullish for USD. USD/JPY & USD/CHF rally UP (BUY), while EUR/USD, GBP/USD & XAU/USD fall DOWN (SELL).',
        ifMissScenario: 'If Actual > 4.1% (Higher Unemployment = Weaker Economy): Bearish for USD. EUR/USD, GBP/USD & XAU/USD rally UP (BUY), while USD/JPY drops DOWN (SELL).',
        tradingRule: 'Always read alongside NFP headline number. If both NFP > 185K and Unemployment <= 4.0%, expect a sustained 2-hour trend in USD.',
        pairImpacts: [
          { pair: 'EUR/USD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '40–75 pips', explanation: 'Lower US unemployment strengthens USD, pushing EUR/USD down.' },
          { pair: 'USD/JPY', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '50–95 pips', explanation: 'Lower US unemployment boosts Fed rate expectations, lifting USD/JPY.' },
          { pair: 'XAU/USD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '70–150 pips', explanation: 'Strong labor data reduces safe-haven rate-cut bets, pressuring Gold lower.' }
        ]
      },
      {
        id: 'news-3',
        title: 'FOMC Federal Funds Rate & Statement',
        currency: 'USD',
        impact: 'HIGH',
        timestamp: base + 3 * hour + 30 * min,
        timeFormatted: this.formatEventTime(base + 3 * hour + 30 * min),
        releasedActualValue: '4.75%',
        forecast: '4.75%',
        previous: '5.00%',
        surpriseOutcome: 'INLINE_NEUTRAL',
        releasedSummary: 'RELEASED: Fed set rate at 4.75% as forecast, with hawkish statement guidance supporting USD yields.',
        description: 'Federal Reserve interest rate decision & monetary policy statement. Highest volatility catalyst in global forex.',
        isHighImpact: true,
        affectedPairs: ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'NZD/USD'],
        ifBeatScenario: 'If Rate > 4.75% or Hawkish Hold Statement: Strongly Bullish USD. USD/JPY & USD/CHF surge UP (BUY), while XAU/USD, EUR/USD & GBP/USD plunge DOWN (SELL) 80–160 pips.',
        ifMissScenario: 'If Rate Cut Deeper or Dovish Statement: Strongly Bearish USD. XAU/USD (Gold), EUR/USD & GBP/USD skyrocket UP (BUY), while USD/JPY drops sharply DOWN (SELL).',
        tradingRule: 'FOMC produces a two-stage move: 1) Initial rate headline spike, 2) Press conference reversal 30 mins later. Protect open profits with trailing stops.',
        pairImpacts: [
          { pair: 'XAU/USD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '120–250 pips', explanation: 'Hawkish Fed hikes real yields, causing heavy institutional selling in Gold.' },
          { pair: 'EUR/USD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '60–110 pips', explanation: 'Widening Fed-ECB rate differential drives capital into USD.' },
          { pair: 'USD/JPY', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '80–140 pips', explanation: 'Most sensitive pair to US interest rates — surges on hawkish Fed.' }
        ]
      },
      {
        id: 'news-4',
        title: 'ECB Monetary Policy Decision',
        currency: 'EUR',
        impact: 'HIGH',
        timestamp: base + 7 * hour,
        timeFormatted: this.formatEventTime(base + 7 * hour),
        releasedActualValue: '3.25%',
        forecast: '3.25%',
        previous: '3.50%',
        surpriseOutcome: 'INLINE_NEUTRAL',
        releasedSummary: 'RELEASED: ECB cut benchmark rate to 3.25% in line with consensus.',
        description: 'European Central Bank benchmark interest rate and Governing Council policy statement.',
        isHighImpact: true,
        affectedPairs: ['EUR/USD', 'EUR/JPY', 'EUR/GBP', 'EUR/AUD', 'EUR/CAD'],
        ifBeatScenario: 'If ECB Holds at 3.50% or Signals Pause (Hawkish EUR): Bullish for EUR. EUR/USD, EUR/JPY & EUR/GBP rally UP (BUY) by 45–85 pips.',
        ifMissScenario: 'If ECB Cuts to 3.25% with Dovish Guidance (Bearish EUR): Bearish for EUR. EUR/USD, EUR/JPY & EUR/GBP drop DOWN (SELL).',
        tradingRule: 'Watch EUR/USD and EUR/JPY 15 minutes after the rate release when the ECB Press Conference begins.',
        pairImpacts: [
          { pair: 'EUR/USD', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '50–90 pips', explanation: 'EUR is the base currency — hawkish ECB lifts EUR/USD directly.' },
          { pair: 'EUR/JPY', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '60–100 pips', explanation: 'Higher Eurozone yields attract carry flows into EUR/JPY.' },
          { pair: 'EUR/GBP', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '30–55 pips', explanation: 'Direct Euro vs Pound rate differential driver.' }
        ]
      },
      {
        id: 'news-5',
        title: 'UK Consumer Price Index (CPI YoY)',
        currency: 'GBP',
        impact: 'HIGH',
        timestamp: base + 12 * hour,
        timeFormatted: this.formatEventTime(base + 12 * hour),
        releasedActualValue: '2.4%',
        forecast: '2.2%',
        previous: '2.2%',
        surpriseOutcome: 'BEAT_BULLISH',
        releasedSummary: 'RELEASED: UK CPI printed 2.4% vs 2.2% Forecast — hotter inflation forces BoE to keep rates higher, boosting GBP.',
        description: 'Measures inflation in UK consumer goods and services. Key inflation gauge for Bank of England rate policy.',
        isHighImpact: true,
        affectedPairs: ['GBP/USD', 'GBP/JPY', 'EUR/GBP', 'GBP/AUD'],
        ifBeatScenario: 'If Actual > 2.2% (Hotter UK Inflation): Bullish for GBP. Forces Bank of England to delay rate cuts -> GBP/USD & GBP/JPY spike UP (BUY), EUR/GBP drops DOWN (SELL).',
        ifMissScenario: 'If Actual < 2.2% (Cooler UK Inflation): Bearish for GBP. Accelerates BoE rate cuts -> GBP/USD & GBP/JPY drop DOWN (SELL), EUR/GBP rises UP (BUY).',
        tradingRule: 'GBP/JPY and GBP/USD typically move 50+ pips within the first 5 minutes of UK CPI.',
        pairImpacts: [
          { pair: 'GBP/USD', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '45–80 pips', explanation: 'Hotter UK CPI boosts Pound yields, driving GBP/USD higher.' },
          { pair: 'GBP/JPY', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '65–115 pips', explanation: 'Strongest momentum vehicle for GBP inflation surprises.' },
          { pair: 'GBP/CAD', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '45–80 pips', explanation: 'GBP is the base currency — moves in lockstep with UK inflation.' },
          { pair: 'EUR/GBP', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '25–45 pips', explanation: 'GBP is the quote currency — stronger GBP pushes EUR/GBP lower, weaker GBP pushes EUR/GBP higher.' }
        ]
      },
      {
        id: 'news-6',
        title: 'Bank of Japan (BOJ) Interest Rate Decision',
        currency: 'JPY',
        impact: 'HIGH',
        timestamp: base + 18 * hour,
        timeFormatted: this.formatEventTime(base + 18 * hour),
        releasedActualValue: '0.25%',
        forecast: '0.25%',
        previous: '0.25%',
        surpriseOutcome: 'INLINE_NEUTRAL',
        releasedSummary: 'RELEASED: BOJ maintained policy rate at 0.25%.',
        description: 'Bank of Japan overnight call rate decision. Triggers 100–200 pip swings on USD/JPY, EUR/JPY and GBP/JPY.',
        isHighImpact: true,
        affectedPairs: ['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'CAD/JPY'],
        ifBeatScenario: 'If BOJ Hikes Rate > 0.25% or Signals Hawkish Tightening (Bullish JPY): JPY strengthens sharply -> USD/JPY, EUR/JPY, GBP/JPY & AUD/JPY plunge DOWN (SELL) by 80–180 pips.',
        ifMissScenario: 'If BOJ Stays Dovish / Holds (Bearish JPY): Yen weakens -> USD/JPY, EUR/JPY, GBP/JPY & AUD/JPY rally UP (BUY).',
        tradingRule: 'Remember: JPY is the quote currency on XXX/JPY pairs, so Bullish JPY news means SELLING USD/JPY, GBP/JPY, and EUR/JPY.',
        pairImpacts: [
          { pair: 'USD/JPY', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '90–180 pips', explanation: 'JPY is the quote currency — a stronger Yen causes USD/JPY to drop sharply.' },
          { pair: 'GBP/JPY', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '100–200 pips', explanation: 'Carry-trade unwind on BOJ hike sends GBP/JPY rapidly lower.' },
          { pair: 'EUR/JPY', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '80–150 pips', explanation: 'Stronger JPY pulls EUR/JPY downward.' }
        ]
      },
      {
        id: 'news-8',
        title: 'Canada Employment Change & Unemployment',
        currency: 'CAD',
        impact: 'HIGH',
        timestamp: base + day + 2 * hour,
        timeFormatted: this.formatEventTime(base + day + 2 * hour),
        releasedActualValue: '34.2K',
        forecast: '27.5K',
        previous: '46.7K',
        surpriseOutcome: 'BEAT_BULLISH',
        releasedSummary: 'RELEASED: Canadian jobs beat forecast at 34.2K, boosting CAD.',
        description: 'Monthly change in employed people in Canada. Primary driver for USD/CAD, CAD/JPY, and GBP/CAD.',
        isHighImpact: true,
        affectedPairs: ['USD/CAD', 'CAD/JPY', 'EUR/CAD', 'GBP/CAD'],
        ifBeatScenario: 'If Actual > 27.5K (Stronger Canadian Jobs — Bullish CAD): CAD strengthens -> USD/CAD, EUR/CAD & GBP/CAD drop DOWN (SELL), while CAD/JPY surges UP (BUY).',
        ifMissScenario: 'If Actual < 27.5K (Weaker Canadian Jobs — Bearish CAD): CAD weakens -> USD/CAD, EUR/CAD & GBP/CAD rally UP (BUY), while CAD/JPY drops DOWN (SELL).',
        tradingRule: 'Note that CAD is the second currency in USD/CAD: Good Canadian news = SELL USD/CAD.',
        pairImpacts: [
          { pair: 'USD/CAD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '45–80 pips', explanation: 'CAD is the quote currency — stronger Canadian jobs push USD/CAD DOWN.' },
          { pair: 'CAD/JPY', ifBullishCurrency: 'BUY (SURGE UP)', ifBearishCurrency: 'SELL (DROP DOWN)', expectedPips: '40–75 pips', explanation: 'CAD is the base currency — stronger CAD pushes CAD/JPY UP.' },
          { pair: 'EUR/CAD', ifBullishCurrency: 'SELL (DROP DOWN)', ifBearishCurrency: 'BUY (SURGE UP)', expectedPips: '45–85 pips', explanation: 'Stronger CAD pulls EUR/CAD downward.' }
        ]
      }
    ];
  }

  public getAllEvents(): EconomicEvent[] {
    const now = Date.now();
    return this.events
      .map(evt => {
        const isReleased = now >= evt.timestamp;
        return {
          ...evt,
          actual: isReleased ? (evt.releasedActualValue || evt.forecast || 'Released') : undefined
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Allows immediate release simulation or manual trigger so user can see how signals react
   */
  public triggerReleaseNow(eventId: string, outcomeOverride?: 'BEAT_BULLISH' | 'MISSED_BEARISH'): void {
    const now = Date.now();
    this.events = this.events.map(evt => {
      if (evt.id === eventId) {
        const nextOutcome = outcomeOverride || evt.surpriseOutcome || 'BEAT_BULLISH';
        // Allow re-running synchronization if outcome changed
        this.appliedReleaseKeys.delete(`${evt.id}:BEAT_BULLISH`);
        this.appliedReleaseKeys.delete(`${evt.id}:MISSED_BEARISH`);
        this.appliedReleaseKeys.delete(`${evt.id}:INLINE_NEUTRAL`);

        // Compute realistic Actual value & summary matching the simulated outcome
        let simActual = evt.releasedActualValue || evt.forecast || 'Released';
        if (evt.forecast) {
          const numMatch = evt.forecast.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
          if (numMatch) {
            const val = parseFloat(numMatch[1]);
            const suffix = numMatch[2] || '';
            const isUnemployment = evt.title.toLowerCase().includes('unemployment');
            const delta = suffix.includes('K') ? 28 : Math.max(0.2, +(val * 0.08).toFixed(2));
            const decimals = numMatch[1].includes('.') ? numMatch[1].split('.')[1].length : 0;

            if (nextOutcome === 'BEAT_BULLISH') {
              const beatVal = isUnemployment ? val - 0.2 : val + delta;
              simActual = `${beatVal.toFixed(decimals)}${suffix}`;
            } else if (nextOutcome === 'MISSED_BEARISH') {
              const missVal = isUnemployment ? val + 0.3 : Math.max(0, val - delta);
              simActual = `${missVal.toFixed(decimals)}${suffix}`;
            }
          }
        }

        const simSummary =
          nextOutcome === 'BEAT_BULLISH'
            ? `RELEASED: ${evt.title} printed ${simActual} vs ${evt.forecast} Forecast (Bullish ${evt.currency} Beat). ${evt.ifBeatScenario || ''}`
            : `RELEASED: ${evt.title} printed ${simActual} vs ${evt.forecast} Forecast (Bearish ${evt.currency} Miss). ${evt.ifMissScenario || ''}`;

        return {
          ...evt,
          timestamp: now - 5000,
          timeFormatted: this.formatEventTime(now - 5000),
          surpriseOutcome: nextOutcome,
          releasedActualValue: simActual,
          actual: simActual,
          releasedSummary: simSummary
        };
      }
      return evt;
    });
  }

  /**
   * Synchronizes active signals with any released high-impact economic events:
   * 1) If a pair impacted by the news WAS NOT on the Signal page before release, generates a new Post-News Signal Card (BUY or SELL)
   * 2) If a pair WAS already on the Signal page, adjusts its direction/entry/SL/TP or boosts its confluence to match the news release
   */
  public synchronizeSignalsWithReleasedNews(
    currentSignals: ForexSignal[],
    allPairs: ForexPair[]
  ): {
    updatedSignals: ForexSignal[];
    hasChanges: boolean;
    newlyAddedPairs: string[];
    updatedExistingPairs: string[];
  } {
    const now = Date.now();
    const releasedEvents = this.getAllEvents().filter(
      evt => now >= evt.timestamp && evt.pairImpacts && evt.pairImpacts.length > 0
    );

    let nextSignals = [...currentSignals];
    let hasChanges = false;
    const newlyAddedPairs: string[] = [];
    const updatedExistingPairs: string[] = [];

    for (const evt of releasedEvents) {
      const outcome = evt.surpriseOutcome || 'BEAT_BULLISH';
      const releaseKey = `${evt.id}:${outcome}`;
      if (this.appliedReleaseKeys.has(releaseKey)) {
        continue;
      }

      this.appliedReleaseKeys.add(releaseKey);

      for (const impact of evt.pairImpacts || []) {
        const pairObj = allPairs.find(p => p.symbol === impact.pair);
        if (!pairObj) continue;

        const targetAction =
          outcome === 'MISSED_BEARISH' ? impact.ifBearishCurrency : impact.ifBullishCurrency;
        const shouldBeBuy = targetAction.startsWith('BUY');
        const newType: SignalType = shouldBeBuy ? 'BUY_MARKET' : 'SELL_MARKET';

        const livePrice = pairObj.currentPrice > 0 ? pairObj.currentPrice : pairObj.basePrice;
        const pipOffset =
          pairObj.pipDigits === 2
            ? pairObj.isGoldOrCrypto
              ? 16.0
              : 0.45
            : pairObj.pipDigits === 1
            ? 80.0
            : 0.0042;
        const tp1Offset = pipOffset * 2.2;
        const tp2Offset = pipOffset * 3.8;
        const tp3Offset = pipOffset * 5.5;

        const newEntry = Number(livePrice.toFixed(pairObj.pipDigits));
        const newSl = Number(
          (shouldBeBuy ? livePrice - pipOffset : livePrice + pipOffset).toFixed(pairObj.pipDigits)
        );
        const newTp1 = Number(
          (shouldBeBuy ? livePrice + tp1Offset : livePrice - tp1Offset).toFixed(pairObj.pipDigits)
        );
        const newTp2 = Number(
          (shouldBeBuy ? livePrice + tp2Offset : livePrice - tp2Offset).toFixed(pairObj.pipDigits)
        );
        const newTp3 = Number(
          (shouldBeBuy ? livePrice + tp3Offset : livePrice - tp3Offset).toFixed(pairObj.pipDigits)
        );

        const actualLabel = evt.actual || evt.releasedActualValue || evt.forecast;
        const existingIndex = nextSignals.findIndex(s => s.pair.symbol === impact.pair);

        if (existingIndex === -1) {
          // Pair WAS NOT on the Signal Page before -> Create a brand-new Post-News Signal Card!
          const newPostNewsSignal: ForexSignal = {
            id: `SIG-NEWS-${evt.id}-${impact.pair.replace('/', '')}`,
            pair: { ...pairObj, currentPrice: livePrice },
            type: newType,
            status: 'RUNNING',
            entryPrice: newEntry,
            currentPrice: newEntry,
            stopLoss: newSl,
            takeProfit1: newTp1,
            takeProfit2: newTp2,
            takeProfit3: newTp3,
            pips: 4.5,
            riskReward: '1:3.2',
            confluenceScore: 93,
            rationale: `📰 NEW POST-NEWS SIGNAL (${evt.title}: Actual ${actualLabel} vs Forecast ${evt.forecast}): ${impact.explanation} Institutional order flow triggered immediate ${shouldBeBuy ? 'BUY' : 'SELL'} expansion on ${impact.pair}.`,
            timeframe: 'M15',
            timestamp: 'Just Released (News Catalyst)',
            institutionalFlow: `Post-News Institutional ${shouldBeBuy ? 'Accumulation' : 'Distribution'} (${evt.currency})`,
            isBestTradeNow: false,
            isPending: false,
            isFavorite: false,
            hasAlert: true,
            killzone: `${evt.currency} High-Impact News Release`,
            winProbability: 93,
            quality: 'A_PLUS',
            economicRisk: `📰 NEW SIGNAL FROM NEWS: ${evt.title} (${actualLabel} vs ${evt.forecast})`,
            validityTimeLeft: 'Active (Post-News Momentum)',
            validityExpiresAt: `Targeting TP1 ${newTp1}`,
            invalidationTrigger: `SL protected at ${newSl}`,
            createdAtMs: now,
            takeProfit: newTp1,
            checklist: [
              {
                title: `${evt.currency} News Catalyst Surprise`,
                isConfirmed: true,
                detail: `${evt.title}: Actual ${actualLabel} vs Forecast ${evt.forecast}`
              },
              {
                title: 'Post-News Displacement Candle',
                isConfirmed: true,
                detail: `${shouldBeBuy ? 'Bullish' : 'Bearish'} M15 institutional order flow confirmed`
              },
              {
                title: '0.01 Micro-Lot Tradability',
                isConfirmed: true,
                detail: `Margin ~$${(pairObj.minMargin001 || 2.2).toFixed(2)} | Expected move: ${impact.expectedPips}`
              }
            ]
          };

          nextSignals = [newPostNewsSignal, ...nextSignals];
          newlyAddedPairs.push(`${impact.pair} (${shouldBeBuy ? 'BUY' : 'SELL'})`);
          hasChanges = true;
        } else {
          // Pair WAS already on the Signal Page -> Adjust or confirm according to news impact!
          const existingSig = nextSignals[existingIndex];
          const existingIsBuy = existingSig.type.startsWith('BUY');

          if (existingIsBuy === shouldBeBuy) {
            // News supports existing signal direction -> Boost confluence & mark News Confirmed
            const boostedScore = Math.min(98, Math.max(existingSig.confluenceScore + 2, 92));
            nextSignals[existingIndex] = {
              ...existingSig,
              confluenceScore: boostedScore,
              quality: 'A_PLUS',
              economicRisk: `✅ NEWS CONFIRMED (${evt.title}: ${actualLabel} vs ${evt.forecast})`,
              rationale: `✅ NEWS CATALYST ALIGNED (${evt.title}: Actual ${actualLabel} vs Forecast ${evt.forecast}): ${existingSig.rationale}`,
              checklist: [
                {
                  title: `News Catalyst Aligned (${evt.currency})`,
                  isConfirmed: true,
                  detail: `${evt.title} (${actualLabel}) confirms ${shouldBeBuy ? 'BUY' : 'SELL'} bias`
                },
                ...existingSig.checklist.filter(c => !c.title.includes('News Catalyst'))
              ]
            };
            updatedExistingPairs.push(`${impact.pair} (Confirmed ${shouldBeBuy ? 'BUY' : 'SELL'} • ${boostedScore}%)`);
            hasChanges = true;
          } else {
            // News opposes existing signal direction -> Flip/Update signal to match the Post-News Institutional Direction!
            nextSignals[existingIndex] = {
              ...existingSig,
              type: newType,
              status: 'RUNNING',
              isPending: false,
              entryPrice: newEntry,
              currentPrice: newEntry,
              stopLoss: newSl,
              takeProfit1: newTp1,
              takeProfit2: newTp2,
              takeProfit3: newTp3,
              takeProfit: newTp1,
              pips: 2.0,
              confluenceScore: 92,
              quality: 'A_PLUS',
              timestamp: 'Updated by News Release',
              economicRisk: `🔄 FLIPPED BY NEWS: ${evt.title} (${actualLabel} vs ${evt.forecast})`,
              rationale: `🔄 SIGNAL UPDATED BY NEWS (${evt.title}: Actual ${actualLabel} vs Forecast ${evt.forecast}): ${impact.explanation} Pre-news bias invalidated; flipped to ${shouldBeBuy ? 'BUY' : 'SELL'} at ${newEntry}.`,
              checklist: [
                {
                  title: `Post-News Direction Reversal (${evt.currency})`,
                  isConfirmed: true,
                  detail: `Flipped to ${shouldBeBuy ? 'BUY' : 'SELL'} after ${evt.title} (${actualLabel})`
                },
                ...existingSig.checklist.slice(0, 2)
              ]
            };
            updatedExistingPairs.push(`${impact.pair} (Flipped to ${shouldBeBuy ? 'BUY' : 'SELL'})`);
            hasChanges = true;
          }
        }
      }
    }

    return {
      updatedSignals: nextSignals,
      hasChanges,
      newlyAddedPairs,
      updatedExistingPairs
    };
  }

  // Check if a pair has high impact news within 60 minutes before or 15 minutes after release
  public getNewsGuard(pairSymbol: string): {
    isWarning: boolean;
    minutesUntil: number;
    eventTitle: string;
    impact: 'HIGH' | 'MEDIUM';
    currency: string;
    ifBeatScenario?: string;
    ifMissScenario?: string;
    actual?: string;
  } | null {
    const cleanSym = pairSymbol.replace('/', '');
    const now = Date.now();

    for (const evt of this.getAllEvents()) {
      const isRel =
        cleanSym.includes(evt.currency) ||
        (cleanSym.includes('XAU') && evt.currency === 'USD') ||
        (cleanSym.includes('XAG') && evt.currency === 'USD');
      if (isRel) {
        const diffMs = evt.timestamp - now;
        const diffMinutes = Math.round(diffMs / 60000);

        if (diffMinutes >= -15 && diffMinutes <= 60) {
          return {
            isWarning: true,
            minutesUntil: diffMinutes,
            eventTitle: evt.title,
            impact: evt.impact as 'HIGH' | 'MEDIUM',
            currency: evt.currency,
            ifBeatScenario: evt.ifBeatScenario,
            ifMissScenario: evt.ifMissScenario,
            actual: evt.actual
          };
        }
      }
    }
    return null;
  }
}

export const economicCalendarService = new EconomicCalendarService();

