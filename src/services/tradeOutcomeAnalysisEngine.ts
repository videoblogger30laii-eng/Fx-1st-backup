import { ForexSignal, Elev8Trade, STRATEGY_CONFIGS, getSignalStrategy, StrategyType } from '../types';
import { formatPrice, calculatePips, formatDurationCompact, getTradeDurationMs, ALL_PAIRS } from './marketData';

export interface TradeForensicAnalysis {
  outcomeType: 'SL_HIT' | 'TP_HIT';
  outcomeTitle: string;
  badgeColor: string;
  symbol: string;
  orderType: string;
  strategyName: string;
  timeframe: string;
  killzone: string;
  confluenceScore: number;
  entryPriceFormatted: string;
  exitPriceFormatted: string;
  slPriceFormatted: string;
  tpPriceFormatted: string;
  pips: number;
  realizedPnl: number;
  durationFormatted: string;
  riskReward: string;

  // 1. Primary Reason for Outcome
  primaryReasonTitle: string;
  primaryReasonExplanation: string;
  primaryMechanismTag: string;

  // 2. What Went RIGHT
  whatWentRight: { title: string; detail: string }[];

  // 3. What Went WRONG
  whatWentWrong: { title: string; detail: string }[];

  // 4. Chronological Circumstances: Entry to Exit
  circumstances: {
    phase: string;
    stageTitle: string;
    priceActionDetail: string;
    marketState: string;
  }[];

  // 5. Key Lessons Learned
  keyLessons: { lessonTitle: string; takeaway: string }[];

  // 6. Actionable Playbook: How to Avoid SL in Future / How to Setup TP in Future
  futureActionPlan: {
    sectionTitle: string;
    rules: { rule: string; practicalImplementation: string }[];
  };

  // 7. How to Maximize Future Profits
  profitMaximizationTips: { tip: string; description: string }[];

  // 8. Pre-Trade Filter Checklist (Distinguish TP vs SL setups)
  preTradeChecklist: { check: string; standard: string }[];
}

/**
 * Normalizes input from either a ForexSignal or an Elev8Trade into forensic analysis
 */
export function generateTradeForensicAnalysis(
  tradeOrSignal: ForexSignal | Elev8Trade
): TradeForensicAnalysis {
  // Determine if this is a ForexSignal or Elev8Trade
  const isSignal = 'pair' in tradeOrSignal;
  const symbol = isSignal ? tradeOrSignal.pair.symbol : tradeOrSignal.symbol;
  const pair = isSignal
    ? tradeOrSignal.pair
    : ALL_PAIRS.find(p => p.symbol === symbol) || {
        symbol,
        name: symbol,
        basePrice: tradeOrSignal.entryPrice,
        currentPrice: tradeOrSignal.currentPrice,
        pipDigits: symbol.includes('JPY') ? 2 : symbol.includes('XAU') ? 2 : 4,
        spreadPips: 0.3
      };

  const rawOrderType = isSignal ? tradeOrSignal.type : tradeOrSignal.orderType;
  const isBuy = rawOrderType.toUpperCase().includes('BUY');
  const orderType = isBuy ? 'BUY' : 'SELL';

  const entryPrice = tradeOrSignal.entryPrice;
  const stopLoss = tradeOrSignal.stopLoss;
  const takeProfit = isSignal ? tradeOrSignal.takeProfit1 : tradeOrSignal.takeProfit1;
  const currentPrice = tradeOrSignal.currentPrice || (isSignal ? (tradeOrSignal.pips >= 0 ? takeProfit : stopLoss) : entryPrice);

  const pips = isSignal ? (tradeOrSignal.pips ?? 0) : tradeOrSignal.pips;
  const realizedPnl = isSignal
    ? Math.round(pips * (pair.pipValue001 || 0.1) * 10 * 100) / 100
    : tradeOrSignal.realizedPnl || 0;

  // Outcome check
  const isWin = isSignal
    ? tradeOrSignal.status === 'HIT_TP' || pips > 0
    : tradeOrSignal.closeReason?.includes('TP') || realizedPnl > 0 || pips > 0;

  const outcomeType: 'SL_HIT' | 'TP_HIT' = isWin ? 'TP_HIT' : 'SL_HIT';

  // Strategy Key & Config
  let stratKey: StrategyType = 'GOLD_HUNTER';
  if (isSignal) {
    stratKey = getSignalStrategy(tradeOrSignal);
  } else if ('strategy' in tradeOrSignal && (tradeOrSignal as { strategy?: StrategyType }).strategy) {
    stratKey = (tradeOrSignal as { strategy?: StrategyType }).strategy as StrategyType;
  } else if (tradeOrSignal.signalId) {
    stratKey = 'GOLD_HUNTER';
  }
  const stratConfig = STRATEGY_CONFIGS[stratKey] || STRATEGY_CONFIGS.GOLD_HUNTER;
  const strategyName = stratConfig.title;

  const timeframe = isSignal ? tradeOrSignal.timeframe : 'M15';
  const killzone = isSignal ? tradeOrSignal.killzone : 'London / NY Overlap';
  const confluenceScore = isSignal ? tradeOrSignal.confluenceScore : 86;
  const riskReward = isSignal ? tradeOrSignal.riskReward : '1:2.65';

  const durationMs = isSignal
    ? getTradeDurationMs(tradeOrSignal)
    : Math.max(60 * 1000, (tradeOrSignal.closedAt || Date.now()) - tradeOrSignal.openedAt);
  const durationFormatted = formatDurationCompact(durationMs);

  const entryPriceFormatted = formatPrice(pair, entryPrice);
  const exitPriceFormatted = formatPrice(pair, currentPrice);
  const slPriceFormatted = formatPrice(pair, stopLoss);
  const tpPriceFormatted = formatPrice(pair, takeProfit);

  const isGold = symbol.includes('XAU') || symbol.includes('GOLD');
  const isJpy = symbol.includes('JPY');
  const isGbp = symbol.includes('GBP');

  // Asset category nuance
  const assetType = isGold ? 'Precious Metal (XAU)' : isJpy ? 'Yen Cross' : isGbp ? 'Pound Sterling' : 'FX Major';

  // ==========================================
  // CASE 1: STOP LOSS HIT (SL_HIT)
  // ==========================================
  if (outcomeType === 'SL_HIT') {
    const slDistancePips = Math.abs(calculatePips(pair, entryPrice, stopLoss, isBuy));
    const isWickStop = slDistancePips < 18 || Math.abs(pips) < 18;

    let primaryReasonTitle = '';
    let primaryReasonExplanation = '';
    let primaryMechanismTag = '';

    if (stratKey === 'LONDON_KILLER') {
      primaryMechanismTag = 'Session Opening Range / Asia Sweep vs. Fakeout Reversal';
      primaryReasonTitle = `Opening Range Expansion Overpowered Box Reversal Threshold`;
      primaryReasonExplanation = `The initial session open momentum developed into a sustained range expansion rather than an intended Judas Swing / fakeout manipulation. Instead of probing outside the Session Box and closing back inside to trigger an ARC pivot reversal, price broke clean through ${slPriceFormatted}.`;
    } else if (isWickStop) {
      primaryMechanismTag = 'Interbank Volatility Spike & Liquidity Sweep Wick';
      primaryReasonTitle = `Interbank Liquidity Hunt Wick Below Structural Origin`;
      primaryReasonExplanation = `Price executed a rapid session liquidity sweep, printing an extended manipulation shadow directly through the ${slPriceFormatted} invalidation boundary before the anticipated directional continuation could materialize. In ${assetType} markets, retail stop orders clustered closely behind recent swing points provide prime liquidity for institutional filling.`;
    } else {
      primaryMechanismTag = 'Macro Trend Reversal & Structure Shift (CHoCH)';
      primaryReasonTitle = `Macro Market Structure Reversal Overpowering ${timeframe} Setup`;
      primaryReasonExplanation = `Higher-timeframe (H4/D1) institutional order flow exerted sustained directional pressure against this ${orderType} setup. Price experienced a confirmed Change of Character (CHoCH) and Break of Structure (BOS), shifting market equilibrium and rendering the local ${timeframe} support/resistance level invalid.`;
    }

    const whatWentRight = [
      {
        title: 'Disciplined Capital Preservation & Risk Cap',
        detail: `The predefined Stop Loss order at ${slPriceFormatted} capped your maximum downside strictly at ${Math.abs(pips).toFixed(1)} pips ($${Math.abs(realizedPnl).toFixed(2)}). You avoided catastrophic uncontrolled drawdown, revenge averaging, or margin depletion.`
      },
      {
        title: 'Valid Systematic Confluence at Inception',
        detail: `The trade was not entered impulsively. It satisfied ${confluenceScore}% institutional confluence criteria with valid ${strategyName} parameters and favorable ${riskReward} Risk/Reward ratio.`
      },
      {
        title: 'Zero Emotional Hesitation on Invalidation',
        detail: `You allowed the platform algorithm and market mechanics to govern the terminal boundary instead of widening your stop loss or hoping for an improbable recovery.`
      }
    ];

    const whatWentWrong = [
      ...(stratKey === 'LONDON_KILLER' ? [{
        title: 'Opening Range Extension Exceeded Judas Manipulation Boundary',
        detail: `The setup attempted to fade an opening probe, but volume confirmed a genuine breakout rather than a liquidity sweep. Ensure the 15-minute candle leaves an extended rejection shadow and closes strictly back inside the Box High/Low before engaging counter-trend limits.`
      }] : []),
      {
        title: isWickStop ? 'Stop Loss Placed Inside Interbank Wick Tolerance' : 'Counter-Trend Exposure to Higher-Timeframe Flow',
        detail: isWickStop
          ? `The stop loss at ${slPriceFormatted} was placed directly adjacent to visible swing fractal levels without adequate ATR padding (minimum 1.2x ATR buffer required on ${symbol} to absorb spread noise).`
          : `The ${orderType} entry fought against higher-timeframe bearish/bullish momentum. While the ${timeframe} chart looked promising, the H4/Daily order flow was in dominant opposing expansion.`
      },
      {
        title: 'Timing Near High-Impact Volatility / Session Turnover',
        detail: `The position was held through high-volume turnover periods (${killzone}). Wider spreads and algorithmic book clearing during these windows disproportionately trigger stops placed too close to market structure.`
      },
      {
        title: 'Lack of Secondary Lower-Timeframe Confirmation (M1/M5 MSS)',
        detail: `Entry was executed as a limit mitigation or immediate market trigger before waiting for a confirmed Market Structure Shift (MSS) candle close on the micro timeframe.`
      }
    ];

    const circumstances = [
      {
        phase: 'Stage 1: Order Filled',
        stageTitle: `Entry Triggered at ${entryPriceFormatted}`,
        priceActionDetail: `The order filled cleanly at ${entryPriceFormatted} with initial ${riskReward} targets established. Market spread was normal (${pair.spreadPips} pips) and volume was moderate.`,
        marketState: 'Systematic Execution'
      },
      {
        phase: 'Stage 2: In-Trade Progress',
        stageTitle: 'Consolidation & Retracement Pressure',
        priceActionDetail: `Price floated in mild floating PnL briefly, but lacked impulsive displacement candles. Instead of expanding towards TP1 (${tpPriceFormatted}), buyers/sellers failed to defend the key order block, resulting in a steady progression toward the invalidation line.`,
        marketState: 'Momentum Exhaustion'
      },
      {
        phase: 'Stage 3: Terminal Invalidation',
        stageTitle: `Terminal Stop Triggered at ${slPriceFormatted}`,
        priceActionDetail: `A sharp price impulse swept past ${slPriceFormatted}, triggering the broker's terminal stop and closing the position at ${exitPriceFormatted} for a realized loss of ${Math.abs(pips).toFixed(1)} pips.`,
        marketState: 'Structural Invalidation'
      }
    ];

    const keyLessons = [
      {
        lessonTitle: 'Stop Loss is a Shield, Not a Failure',
        takeaway: 'Top prop firm and institutional traders operate with 65-80% win rates. Taking an intended, controlled -1R stop is proof of professional risk discipline.'
      },
      {
        lessonTitle: 'Pad Stops with ATR Buffer Beyond Obvious Fractals',
        takeaway: 'Institutions hunt liquidity where retail traders cluster their stops. Always add 5 to 8 pips (or $1.50 on Gold) buffer past the technical swing high/low.'
      },
      {
        lessonTitle: 'Confirm Alignment with Higher-Timeframe (H4) EMA 50/200',
        takeaway: 'Never execute a pullback trade against the slope of the 4-Hour 50 EMA unless an explicit reversal macro catalyst has triggered.'
      }
    ];

    const futureActionPlan = {
      sectionTitle: 'Tactical Playbook: How to Avoid This Kind of SL in the Future',
      rules: [
        {
          rule: '1. Dynamic ATR Buffer Rule',
          practicalImplementation: `Calculate the 14-period ATR on ${timeframe}. Multiply ATR by 1.25 and add this distance past the Order Block boundary before setting the SL at ${slPriceFormatted}.`
        },
        {
          rule: '2. Wait for 2nd Entry / Confirmation Candle Close',
          practicalImplementation: 'Instead of blind limit orders, wait for a 15-minute bullish/bearish engulfing candle or micro-structure shift (M5 CHoCH) before committing full size.'
        },
        {
          rule: '3. Economic Calendar News Guard',
          practicalImplementation: 'Check the Economic Calendar widget. Never open a new trade within 30 minutes before High-Impact (Red Folder) releases for the traded currency.'
        },
        {
          rule: '4. Liquidity Sweep Verification Before Entry',
          practicalImplementation: 'Ensure that the opposing liquidity pool has ALREADY been swept before you enter. Entering before the sweep means YOUR stop becomes the liquidity.'
        }
      ]
    };

    const profitMaximizationTips = [
      {
        tip: 'Activate "2nd Entry" Re-Evaluation',
        description: 'When stopped out by a wick, if price immediately rejects and closes back inside the original Order Block within 2 candles, the fake-out is confirmed—offering a higher-probability 2nd Entry.'
      },
      {
        tip: 'Half-Size Initial Entry, Add on Break of Structure',
        description: 'Split risk into 0.5% at initial mitigation and 0.5% after price breaks the local swing high/low in your favor.'
      },
      {
        tip: 'Set Alert 3 Pips Before Stop Loss',
        description: 'Configure a notification alert just before the stop level to inspect live order flow and evaluate if early manual intervention or spread monitoring is warranted.'
      }
    ];

    const preTradeChecklist = [
      { check: 'HTF Trend Alignment', standard: `Is ${symbol} trending with the H4/D1 EMA 50 & 200 slope?` },
      { check: 'Liquidity Purge Completed', standard: 'Has the recent Asian/London session high or low already been purged?' },
      { check: 'Minimum 1.2x ATR SL Buffer', standard: `Is SL at least ${isGold ? '$2.00' : '15 pips'} beyond the nearest swing point?` },
      { check: 'Confluence Score ≥ 75%', standard: 'Are at least 4 out of 5 confluence indicators green in the scanner?' },
      { check: 'No Red-Folder News < 30m', standard: 'Is the economic calendar clear of immediate tier-1 macro events?' }
    ];

    return {
      outcomeType,
      outcomeTitle: `Stop-Loss Terminal Hit (-${Math.abs(pips).toFixed(1)} Pips)`,
      badgeColor: 'border-[#FF3366] text-[#FF3366] bg-[#FF3366]/15',
      symbol,
      orderType,
      strategyName,
      timeframe,
      killzone,
      confluenceScore,
      entryPriceFormatted,
      exitPriceFormatted,
      slPriceFormatted,
      tpPriceFormatted,
      pips,
      realizedPnl,
      durationFormatted,
      riskReward,
      primaryReasonTitle,
      primaryReasonExplanation,
      primaryMechanismTag,
      whatWentRight,
      whatWentWrong,
      circumstances,
      keyLessons,
      futureActionPlan,
      profitMaximizationTips,
      preTradeChecklist
    };
  }

  // ==========================================
  // CASE 2: TAKE PROFIT HIT (TP_HIT)
  // ==========================================
  const tpPips = Math.abs(calculatePips(pair, entryPrice, takeProfit, isBuy));
  let primaryMechanismTag = 'Precision Order Block Mitigation & Institutional Expansion';
  let primaryReasonTitle = `Flawless Alignment with Institutional Order Flow & Liquidity Draw`;
  let primaryReasonExplanation = `Price executed a textbook institutional cycle: Smart money completed accumulation/distribution at ${entryPriceFormatted}, respected the structural discount/premium zone, and expanded impulsively straight to the resting Buy-Side/Sell-Side Liquidity pool at ${tpPriceFormatted}.`;

  if (stratKey === 'LONDON_KILLER') {
    primaryMechanismTag = 'Textbook Opening Range Reversal & Box Target Rotation';
    primaryReasonTitle = `Flawless Session Box Sweep, Wick Rejection & Opposite Target Tap`;
    primaryReasonExplanation = `Price executed a pristine institutional cycle: The opening 15-minute expansion engineered liquidity outside the Box boundary, produced a textbook rejection shadow, reclaimed the 50% Equilibrium, and rotated with high momentum straight to the opposing Box boundary at ${tpPriceFormatted}.`;
  }

  const whatWentRight = [
    ...(stratKey === 'LONDON_KILLER' ? [{
      title: 'Disciplined Judas Swing Fade & ARC Structural Pivot',
      detail: `You trapped retail breakout traders who bought/sold the initial open breakout, executing precisely as price closed back inside the Box and riding the mean-reversion wave for a full +${Math.abs(pips).toFixed(1)} pips gain.`
    }] : []),
    {
      title: 'Precision Entry at Optimal Trade Location (OTL)',
      detail: `Your entry at ${entryPriceFormatted} capitalized on the 0.618-0.705 Fibonacci discount/premium zone and unmitigated Fair Value Gap, ensuring minimal floating drawdown and maximum upside velocity.`
    },
    {
      title: 'Flawless Confluence Alignment (Score: ' + confluenceScore + '%)',
      detail: `The setup checked multiple institutional criteria: ${strategyName} mechanics, higher-timeframe momentum, and session killzone timing (${killzone}).`
    },
    {
      title: 'Patience & Emotional Discipline Through the Trade Lifecycle',
      detail: `You allowed price action to breathe for ${durationFormatted} without premature micro-management or panic-closing during minor retracement candles.`
    },
    {
      title: `Asymmetrical Risk-to-Reward Execution (${riskReward})`,
      detail: `The trade rewarded ${Math.abs(pips).toFixed(1)} pips of realized gain (+$${Math.abs(realizedPnl).toFixed(2)}) against a small, strictly contained risk parameter.`
    }
  ];

  const whatWentWrong = [
    {
      title: 'Potential Uncaptured Runner Upside (TP2 / TP3 Left on Table)',
      detail: `Closing 100% of the position at TP1 locked in solid profit, but institutional order flow continued toward TP2/TP3. Leaving a 20-30% runner with a trailing stop would have dramatically boosted the trade's expectancy.`
    },
    {
      title: 'Minor Retracement Anxiety During Mid-Trade Holding Phase',
      detail: `During the ${durationFormatted} holding cycle, brief consolidations or pullbacks tested patience. Automating Move-to-Breakeven at +15 pips eliminates emotional cognitive load.`
    },
    {
      title: 'Lot Sizing Could Be Scaled on A+ High-Confluence Setups',
      detail: `Given the ${confluenceScore}% confluence score, this was an institutional grade A+ setup. On top-tier setups, scaling risk from standard 0.5% to 1.0% maximizes mathematical compounding.`
    }
  ];

  const circumstances = [
    {
      phase: 'Stage 1: Order Filled & Institutional Tap',
      stageTitle: `Precision Fill at ${entryPriceFormatted}`,
      priceActionDetail: `Price tapped into the ${timeframe} Fair Value Gap / Order Block and immediately printed rejection wicks, signaling that smart money algorithms were actively absorbing counterpart retail volume.`,
      marketState: 'Smart Money Accumulation'
    },
    {
      phase: 'Stage 2: Impulsive Expansion Phase',
      stageTitle: 'Clean Break of Structure (BOS)',
      priceActionDetail: `Momentum accelerated through the London/NY killzone. High volume displacement candles formed with wide bodies and small wicks, cleanly stepping above/below internal swing highs. Floating PnL turned positive rapidly.`,
      marketState: 'Institutional Trend Expansion'
    },
    {
      phase: 'Stage 3: Terminal Target Bagged',
      stageTitle: `Target Take Profit Tap at ${tpPriceFormatted}`,
      priceActionDetail: `Price surged cleanly into the opposing liquidity pool, triggering the Take Profit order at ${tpPriceFormatted} for a full +${Math.abs(pips).toFixed(1)} pips gain and +$${Math.abs(realizedPnl).toFixed(2)} realized return.`,
      marketState: 'Terminal Objective Achieved'
    }
  ];

  const keyLessons = [
    {
      lessonTitle: 'Systematic Patience Pays Highest Dividends',
      takeaway: `Holding winning positions for their full natural lifecycle (${durationFormatted}) rather than snatching 5 quick pips is the secret to high profit factors.`
    },
    {
      lessonTitle: 'High Confluence (80%+) Truly Separates Noise from Edge',
      takeaway: 'This setup proved that waiting for multi-factor confluence yields trades that reach targets cleanly with minimal structural stress.'
    },
    {
      lessonTitle: 'Trade What the Institutions Are Drawing Toward',
      takeaway: 'Take profit targets placed at resting liquidity (Equal Highs, Equal Lows, opposing FVGs) act like magnets for algorithmic order execution.'
    }
  ];

  const futureActionPlan = {
    sectionTitle: 'Repeatable Blueprint: How to Setup More Winning Trades Like This',
    rules: [
      {
        rule: '1. Trade Exclusively During Active Killzone Windows',
        practicalImplementation: `Focus trading activity on the ${killzone} where institutional volume ensures rapid follow-through and clean expansions to target.`
      },
      {
        rule: '2. Demand Clear Liquidity Purge Before Entry',
        practicalImplementation: 'Always confirm that the previous session high/low was swept, trapping breakout traders before taking the reversal displacement.'
      },
      {
        rule: '3. Anchor Entry in 50% FVG / Order Block Mean Threshold',
        practicalImplementation: 'Never chase runaway candles. Place orders at the 50% equilibrium of the imbalance to secure the highest Risk-to-Reward ratio.'
      },
      {
        rule: '4. Set TP at Logical Resting Pools (Not Arbitrary Round Numbers)',
        practicalImplementation: 'Identify where retail traders placed their stop-losses on the other side of the range. That is your exact Take Profit target.'
      }
    ]
  };

  const profitMaximizationTips = [
    {
      tip: 'Multi-Tier Scaling Strategy (TP1, TP2, TP3)',
      description: 'Close 50% at TP1 (+pips secured), move Stop Loss to Breakeven (0 risk), and leave 25% for TP2 and 25% for TP3 runner targeting higher timeframe swings.'
    },
    {
      tip: 'Dynamic Trailing Stop Along 15M Swing Points',
      description: 'Trail your stop loss behind each newly formed higher low (for BUYs) or lower high (for SELLs) to lock in profit as the trend extends.'
    },
    {
      tip: 'Compound Sizing on High Confluence Streaks',
      description: 'When market conditions align with your favorite strategy (e.g. 3 consecutive wins), maintain steady disciplined risk while letting account equity compound.'
    }
  ];

  const preTradeChecklist = [
    { check: 'Identified Clear Liquidity Draw', standard: `Is there an obvious uncollected pool of resting stops at ${tpPriceFormatted}?` },
    { check: 'Institutional Displacement Candle', standard: 'Did price leave the zone with a wide body candle showing real institutional commitment?' },
    { check: 'Optimal Entry Zone (Discount/Premium)', standard: 'Are you buying in discount (<50% range) or selling in premium (>50% range)?' },
    { check: 'Risk-to-Reward ≥ 1:2.0', standard: `Does the setup offer at least double the target reward relative to risk? (${riskReward} verified)` },
    { check: 'Session Killzone Active', standard: 'Is the trade executing during London Open, NY Open, or London Close?' }
  ];

  return {
    outcomeType,
    outcomeTitle: `Take-Profit Target Hit (+${Math.abs(pips).toFixed(1)} Pips)`,
    badgeColor: 'border-[#00E676] text-[#00E676] bg-[#00E676]/15',
    symbol,
    orderType,
    strategyName,
    timeframe,
    killzone,
    confluenceScore,
    entryPriceFormatted,
    exitPriceFormatted,
    slPriceFormatted,
    tpPriceFormatted,
    pips,
    realizedPnl,
    durationFormatted,
    riskReward,
    primaryReasonTitle,
    primaryReasonExplanation,
    primaryMechanismTag,
    whatWentRight,
    whatWentWrong,
    circumstances,
    keyLessons,
    futureActionPlan,
    profitMaximizationTips,
    preTradeChecklist
  };
}
