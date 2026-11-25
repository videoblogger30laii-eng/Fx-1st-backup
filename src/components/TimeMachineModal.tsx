import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  History,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  FastForward,
  TrendingUp,
  TrendingDown,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Compass,
  BarChart3,
  Loader2
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { ForexSignal, CandleStick, Timeframe } from '../types';
import { RealCandleFetcherService } from '../services/realCandleFetcher';
import { StrategyBacktester } from '../services/strategyBacktester';
import { getRealPairBacktestStats, RealPairBacktestStats } from '../services/realBacktestStatsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  signal: ForexSignal;
  onOpenElev8Order?: (signal: ForexSignal) => void;
}

type TimeMachineTab = 'REPLAY' | 'BACKTEST_STATS' | 'HISTORICAL_MATCHES';

interface ReplayBarPoint {
  timeStr: string;
  barIndex: number;
  open: number;
  high: number;
  low: number;
  close: number;
  isPre: boolean;
  pipsFromEntry: number;
  mfe: number;
  mae: number;
  hitTp1: boolean;
  hitSl: boolean;
}

export const TimeMachineModal: React.FC<Props> = ({
  isOpen,
  onClose,
  signal,
  onOpenElev8Order
}) => {
  const [activeTab, setActiveTab] = useState<TimeMachineTab>('REPLAY');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [realCandles, setRealCandles] = useState<CandleStick[]>([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);
  const [candleError, setCandleError] = useState<string | null>(null);
  const [candleProvider, setCandleProvider] = useState<string>('NONE');
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBuy = signal.type.startsWith('BUY');
  const pairSymbol = signal.pair.symbol;
  const tf: Timeframe = signal.timeframe || 'H1';
  const entryPrice = signal.entryPrice;
  const stopLoss = signal.stopLoss;
  const takeProfit1 = signal.takeProfit1;
  const pipMult = StrategyBacktester.getPipMultiplier(pairSymbol, entryPrice);

  const slPips = Math.round(Math.abs(entryPrice - stopLoss) * pipMult * 10) / 10;
  const tp1Pips = Math.round(Math.abs(takeProfit1 - entryPrice) * pipMult * 10) / 10;
  const rrRatio = slPips > 0 ? (tp1Pips / slPips).toFixed(2) : '2.50';

  const formattedEntry = StrategyBacktester.formatPriceStr(entryPrice, pairSymbol);
  const formattedTp1 = StrategyBacktester.formatPriceStr(takeProfit1, pairSymbol);
  const formattedSl = StrategyBacktester.formatPriceStr(stopLoss, pairSymbol);

  // Real Historical Backtest Statistics (ZERO fake deterministic win% or invented 5 examples)
  const backtestStats: RealPairBacktestStats = useMemo(
    () => getRealPairBacktestStats(pairSymbol),
    [pairSymbol, signal.id]
  );

  // Fetch REAL candles strictly when modal opens; NEVER synthesize fake bars
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      return;
    }

    let cancelled = false;
    setIsPlaying(false);
    setCurrentStep(0);
    setIsLoadingCandles(true);
    setCandleError(null);

    RealCandleFetcherService.fetchRealCandlesStrict(pairSymbol, tf, 120, { minBars: 20 })
      .then(res => {
        if (cancelled) return;
        if (!res.ok || res.candles.length < 20) {
          setRealCandles([]);
          setCandleProvider(res.providerName);
          setCandleError(res.error || 'NO CANDLES - CANNOT REPLAY');
        } else {
          setRealCandles(res.candles);
          setCandleProvider(res.providerName);
          setCandleError(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setRealCandles([]);
        setCandleError('NO CANDLES - CANNOT REPLAY');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCandles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, pairSymbol, tf, signal.id]);

  // Build authentic Bar-by-Bar Replay from REAL candles ONLY (stops strictly at TP1 or SL hit)
  const simulationData = useMemo(() => {
    if (realCandles.length === 0) {
      return {
        preCandles: [] as ReplayBarPoint[],
        postCandles: [] as ReplayBarPoint[],
        maxSteps: 0
      };
    }

    const entryMs = signal.createdAtMs || realCandles[realCandles.length - 1].timestamp;
    let splitIdx = realCandles.findIndex(c => c.timestamp >= entryMs);
    if (splitIdx === -1) {
      // Signal created at/after latest bar: all recent bars are pre-entry setup context
      splitIdx = realCandles.length - 1;
    } else if (splitIdx < 5 && realCandles.length > 20) {
      splitIdx = Math.min(realCandles.length - 1, Math.max(5, splitIdx));
    }

    const preStart = Math.max(0, splitIdx - 34);
    const preSlice = realCandles.slice(preStart, splitIdx + 1);
    const postSlice = realCandles.slice(splitIdx + 1);

    const preCandles: ReplayBarPoint[] = preSlice.map((c, idx) => {
      const distFromT0 = preSlice.length - 1 - idx;
      return {
        timeStr: distFromT0 === 0 ? 'T-0' : `T-${distFromT0}`,
        barIndex: -distFromT0,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        isPre: true,
        pipsFromEntry: 0,
        mfe: 0,
        mae: 0,
        hitTp1: false,
        hitSl: false
      };
    });

    const postCandles: ReplayBarPoint[] = [];
    let runningMfe = 0;
    let runningMae = 0;

    for (let j = 0; j < postSlice.length; j++) {
      const c = postSlice[j];
      const stepNum = j + 1;
      const timeStr = `T+${stepNum}`;

      const slTriggered = isBuy ? c.low <= stopLoss : c.high >= stopLoss;
      const tpTriggered = isBuy ? c.high >= takeProfit1 : c.low <= takeProfit1;

      if (slTriggered && (!tpTriggered || signal.status === 'HIT_SL')) {
        runningMae = slPips;
        postCandles.push({
          timeStr,
          barIndex: stepNum,
          open: c.open,
          high: c.high,
          low: c.low,
          close: stopLoss,
          isPre: false,
          pipsFromEntry: -slPips,
          mfe: Math.min(tp1Pips, Math.round(runningMfe * 10) / 10),
          mae: slPips,
          hitTp1: false,
          hitSl: true
        });
        break;
      }

      if (tpTriggered) {
        runningMfe = tp1Pips;
        postCandles.push({
          timeStr,
          barIndex: stepNum,
          open: c.open,
          high: c.high,
          low: c.low,
          close: takeProfit1,
          isPre: false,
          pipsFromEntry: tp1Pips,
          mfe: tp1Pips,
          mae: Math.min(slPips, Math.round(runningMae * 10) / 10),
          hitTp1: true,
          hitSl: false
        });
        break;
      }

      const rawPips = (isBuy ? c.close - entryPrice : entryPrice - c.close) * pipMult;
      const cappedPips = Math.max(-slPips, Math.min(tp1Pips, rawPips));
      const barMfe = Math.min(tp1Pips, Math.max(0, (isBuy ? c.high - entryPrice : entryPrice - c.low) * pipMult));
      const barMae = Math.min(slPips, Math.max(0, (isBuy ? entryPrice - c.low : c.high - entryPrice) * pipMult));

      if (barMfe > runningMfe) runningMfe = barMfe;
      if (barMae > runningMae) runningMae = barMae;

      postCandles.push({
        timeStr,
        barIndex: stepNum,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        isPre: false,
        pipsFromEntry: Math.round(cappedPips * 10) / 10,
        mfe: Math.min(tp1Pips, Math.round(runningMfe * 10) / 10),
        mae: Math.min(slPips, Math.round(runningMae * 10) / 10),
        hitTp1: false,
        hitSl: false
      });
    }

    return {
      preCandles,
      postCandles,
      maxSteps: postCandles.length
    };
  }, [realCandles, signal.createdAtMs, signal.status, entryPrice, stopLoss, takeProfit1, isBuy, pipMult, tp1Pips, slPips]);

  // Play / Pause animation across real post-entry bars
  useEffect(() => {
    if (isPlaying && simulationData.maxSteps > 0) {
      const intervalMs = Math.max(250, 1000 / playSpeed);
      playIntervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= simulationData.maxSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playSpeed, simulationData.maxSteps]);

  const activeReplayData = useMemo(() => {
    const revealedPost = simulationData.postCandles.slice(0, currentStep);
    const combined = [...simulationData.preCandles, ...revealedPost];

    return combined.map(bar => ({
      name: bar.timeStr,
      price: bar.close,
      high: bar.high,
      low: bar.low,
      entry: entryPrice,
      tp1: takeProfit1,
      sl: stopLoss,
      isPre: bar.isPre
    }));
  }, [simulationData, currentStep, entryPrice, takeProfit1, stopLoss]);

  const replayYDomain = useMemo<[number, number]>(() => {
    const allVals = [
      entryPrice,
      takeProfit1,
      stopLoss,
      ...activeReplayData.map(d => d.price)
    ];
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const pad = Math.max((maxVal - minVal) * 0.12, Math.abs(entryPrice) * 0.0005);
    return [minVal - pad, maxVal + pad];
  }, [activeReplayData, entryPrice, takeProfit1, stopLoss]);

  const currentPostBar = currentStep > 0 ? simulationData.postCandles[currentStep - 1] : null;
  const currentFloatingPips = currentPostBar ? currentPostBar.pipsFromEntry : 0;
  const pipVal001 = signal.pair?.pipValue001 || 0.1;
  const currentFloatingDollar = Math.round(currentFloatingPips * pipVal001 * 100) / 100;
  const currentMfe = currentPostBar ? Math.min(tp1Pips, currentPostBar.mfe) : 0;
  const currentMae = currentPostBar ? Math.min(slPips, currentPostBar.mae) : 0;
  const isTp1Hit = currentPostBar ? currentPostBar.hitTp1 : false;
  const isSlHit = currentPostBar ? currentPostBar.hitSl : false;

  const beginnerSummary = useMemo(() => {
    if (candleError || realCandles.length === 0) {
      return {
        tone: 'neutral' as const,
        text: 'NO CANDLES - CANNOT REPLAY. Real historical OHLC candles for this timeframe could not be loaded.'
      };
    }
    if (simulationData.maxSteps === 0) {
      return {
        tone: 'neutral' as const,
        text: `Showing ${simulationData.preCandles.length} real historical ${tf} candles leading up to T-0 (${formattedEntry}). No closed bars have elapsed since entry yet.`
      };
    }

    const maeRounded = Math.round(currentMae);
    const mfeRounded = Math.round(currentMfe);
    const tpRounded = Math.round(tp1Pips);
    const slRounded = Math.round(slPips);
    const curRounded = Math.round(currentFloatingPips);

    if (currentStep === 0) {
      return {
        tone: 'neutral' as const,
        text: `Trade opened at ${formattedEntry}. Press Play or Step Forward to replay ${simulationData.maxSteps} real market bars.`
      };
    }

    if (isTp1Hit) {
      return {
        tone: 'win' as const,
        text: maeRounded >= 3
          ? `Price moved -${maeRounded}p against entry first, then moved to hit TP1 (+${tpRounded}p).`
          : `Price moved directly toward TP1 (+${tpRounded}p) with minimal drawdown.`
      };
    }

    if (isSlHit) {
      return {
        tone: 'loss' as const,
        text: mfeRounded >= 3
          ? `Price moved +${mfeRounded}p in favor first, then reversed and hit SL (-${slRounded}p).`
          : `Price moved against entry and hit SL (-${slRounded}p).`
      };
    }

    return {
      tone: 'running' as const,
      text: curRounded < 0
        ? `After ${currentStep} real ${tf} bar(s), price is ${curRounded}p from entry (SL at -${slRounded}p).`
        : `After ${currentStep} real ${tf} bar(s), price is +${curRounded}p from entry (TP1 at +${tpRounded}p).`
    };
  }, [candleError, realCandles.length, simulationData.maxSteps, simulationData.preCandles.length, currentStep, currentMae, currentMfe, currentFloatingPips, tp1Pips, slPips, isTp1Hit, isSlHit, tf, formattedEntry]);

  if (!isOpen) return null;

  const gradeBadgeText = backtestStats.grade === 'A_PLUS' ? 'A+' : backtestStats.grade;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-[#0B0F19] border border-[#222F47] rounded-2xl shadow-2xl overflow-hidden">

        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1E293B] bg-[#101726]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center shadow-inner">
              <History className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-black text-[#F8FAFC] tracking-tight">{pairSymbol}</span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    isBuy ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/35' : 'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/35'
                  }`}
                >
                  {signal.type}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1E293B] text-[#94A3B8]">
                  [{tf}]
                </span>
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${
                    backtestStats.hasData
                      ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/35'
                      : 'bg-[#FF9100]/15 text-[#FF9100] border-[#FF9100]/40'
                  }`}
                >
                  Grade {gradeBadgeText}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span>Entry: <strong className="text-[#F8FAFC] font-mono">{formattedEntry}</strong></span>
                <span>•</span>
                <span>TP1: <strong className="text-[#00E676] font-mono">{formattedTp1} (+{tp1Pips.toFixed(1)}p)</strong></span>
                <span>•</span>
                <span>SL: <strong className="text-[#FF3B30] font-mono">{formattedSl} (-{slPips.toFixed(1)}p)</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors cursor-pointer"
            title="Close Time Machine"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#0E1524] border-b border-[#1E293B] text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('REPLAY');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'REPLAY'
                ? 'bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/50 shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161F33]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Real Candle Replay (T-0)</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('BACKTEST_STATS');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'BACKTEST_STATS'
                ? 'bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/50 shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161F33]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Real Backtest Stats ({backtestStats.tradeCount})</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('HISTORICAL_MATCHES');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'HISTORICAL_MATCHES'
                ? 'bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/50 shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161F33]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Verified Past Trades ({backtestStats.examples.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* TAB 1: REAL CANDLE REPLAY */}
          {activeTab === 'REPLAY' && (
            <div className="space-y-4">
              {isLoadingCandles ? (
                <div className="p-10 rounded-2xl bg-[#0F172A] border border-[#222F47] flex flex-col items-center justify-center gap-2 text-center">
                  <Loader2 className="w-6 h-6 text-[#A78BFA] animate-spin" />
                  <p className="text-xs font-bold text-[#F8FAFC]">Fetching real {pairSymbol} [{tf}] OHLC candles…</p>
                  <p className="text-[11px] text-[#94A3B8]">Zero synthetic candles allowed.</p>
                </div>
              ) : candleError || realCandles.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#180E14] border border-[#FF3366]/50 text-center space-y-2">
                  <AlertTriangle className="w-7 h-7 text-[#FF5252] mx-auto" />
                  <div className="text-sm font-black text-[#FF5252]">NO CANDLES - CANNOT REPLAY</div>
                  <p className="text-xs text-[#CBD5E1] max-w-md mx-auto">
                    Real market OHLC candles for {pairSymbol} [{tf}] could not be fetched from {candleProvider}. Fake or synthetic replay bars are disabled.
                  </p>
                </div>
              ) : (
                <>
                  {/* Playback Control Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#131B2E] border border-[#222F47]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStep(0);
                        }}
                        className="p-2 rounded-lg bg-[#1E293B] hover:bg-[#2D3F5E] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        title="Reset to T-0 Entry"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (simulationData.maxSteps === 0) return;
                          if (!isPlaying && currentStep >= simulationData.maxSteps) {
                            setCurrentStep(0);
                          }
                          setIsPlaying(!isPlaying);
                        }}
                        disabled={simulationData.maxSteps === 0}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 text-white font-black text-xs shadow-md transition-transform active:scale-95"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isPlaying ? 'Pause' : currentStep === simulationData.maxSteps && simulationData.maxSteps > 0 ? 'Replay' : 'Play Replay'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStep(p => Math.min(simulationData.maxSteps, p + 1));
                        }}
                        disabled={currentStep >= simulationData.maxSteps}
                        className="p-2 rounded-lg bg-[#1E293B] hover:bg-[#2D3F5E] disabled:opacity-40 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        title="Step +1 Bar Forward"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStep(simulationData.maxSteps);
                        }}
                        disabled={simulationData.maxSteps === 0}
                        className="p-2 rounded-lg bg-[#1E293B] hover:bg-[#2D3F5E] disabled:opacity-40 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        title="Jump to Final Available Bar"
                      >
                        <FastForward className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1 ml-2 bg-[#0B0F19] p-0.5 rounded-lg border border-[#222F47] text-[10px] font-bold">
                        {[1, 2, 4].map(spd => (
                          <button
                            key={spd}
                            onClick={() => setPlaySpeed(spd)}
                            className={`px-2 py-1 rounded transition-colors ${
                              playSpeed === spd ? 'bg-[#8B5CF6] text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                      <span className="text-[11px] font-mono text-[#94A3B8] shrink-0">
                        Bar: <strong className="text-[#A78BFA]">{currentStep === 0 ? 'T-0 (Entry)' : `T+${currentStep}`}</strong> / {simulationData.maxSteps}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={simulationData.maxSteps}
                        value={currentStep}
                        disabled={simulationData.maxSteps === 0}
                        onChange={e => {
                          setIsPlaying(false);
                          setCurrentStep(parseInt(e.target.value, 10));
                        }}
                        className="w-full accent-[#8B5CF6] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Replay Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-[#101726] border border-[#1E293B]">
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                        Real Replay P&L
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span
                          className={`text-base font-black font-mono ${
                            currentFloatingPips > 0
                              ? 'text-[#00E676]'
                              : currentFloatingPips < 0
                              ? 'text-[#FF3B30]'
                              : 'text-[#94A3B8]'
                          }`}
                        >
                          {currentFloatingPips > 0 ? `+${currentFloatingPips.toFixed(1)}p` : `${currentFloatingPips.toFixed(1)}p`}
                        </span>
                        <span className="text-xs text-[#94A3B8]">
                          ({currentFloatingDollar >= 0 ? `+$${currentFloatingDollar.toFixed(2)}` : `-$${Math.abs(currentFloatingDollar).toFixed(2)}`})
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#101726] border border-[#1E293B]">
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                        Peak Gain (MFE)
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#00E676]" />
                        <span className="text-base font-black font-mono text-[#00E676]">
                          +{currentMfe.toFixed(1)} pips
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#101726] border border-[#1E293B]">
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                        Max Drawdown (MAE)
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <TrendingDown className="w-3.5 h-3.5 text-[#FF3B30]" />
                        <span className="text-base font-black font-mono text-[#FF3B30]">
                          -{currentMae.toFixed(1)} pips
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#101726] border border-[#1E293B]">
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                        Outcome Status
                      </span>
                      <div className="mt-0.5">
                        {isTp1Hit ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-[#00E676]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            TP1 Hit (+{tp1Pips.toFixed(1)}p)
                          </span>
                        ) : isSlHit ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-[#FF3B30]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            SL Triggered (-{slPips.toFixed(1)}p)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FFD700]">
                            <Activity className="w-3.5 h-3.5" />
                            In Corridor ({candleProvider})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Real OHLC Replay Chart */}
                  <div className="p-3.5 rounded-2xl bg-[#0F172A] border border-[#222F47]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-[#F8FAFC]">
                        Real Market OHLC Feed ({candleProvider} · {simulationData.preCandles.length} Lookback + {currentStep} Forward)
                      </span>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
                        <span className="flex items-center gap-1 text-[#2979FF]">
                          <span className="w-2 h-0.5 bg-[#2979FF]" /> Entry {formattedEntry}
                        </span>
                        <span className="flex items-center gap-1 text-[#00E676]">
                          <span className="w-2 h-0.5 bg-[#00E676]" /> TP1 {formattedTp1}
                        </span>
                        <span className="flex items-center gap-1 text-[#FF3B30]">
                          <span className="w-2 h-0.5 bg-[#FF3B30]" /> SL {formattedSl}
                        </span>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={activeReplayData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke="#64748B"
                            tick={{ fontSize: 9 }}
                            interval={Math.max(1, Math.ceil(activeReplayData.length / 10))}
                          />
                          <YAxis
                            domain={replayYDomain}
                            stroke="#64748B"
                            tick={{ fontSize: 9 }}
                            tickFormatter={(v: any) => StrategyBacktester.formatPriceStr(Number(v) || 0, pairSymbol)}
                            width={70}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0F172A',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              fontSize: '11px'
                            }}
                            formatter={(val: any) => [StrategyBacktester.formatPriceStr(Number(val) || 0, pairSymbol), 'Real Close']}
                          />
                          <ReferenceLine
                            x="T-0"
                            stroke="#8B5CF6"
                            strokeDasharray="2 2"
                            label={{ value: 'T-0 Entry', fill: '#A78BFA', fontSize: 9, position: 'insideTopRight' }}
                          />
                          <ReferenceLine
                            y={entryPrice}
                            stroke="#2979FF"
                            strokeDasharray="4 3"
                            strokeWidth={1.5}
                            label={{ value: `Entry ${formattedEntry}`, fill: '#60A5FA', fontSize: 10, position: 'insideTopLeft' }}
                          />
                          <ReferenceLine
                            y={takeProfit1}
                            stroke="#00E676"
                            strokeDasharray="4 3"
                            strokeWidth={1.5}
                            label={{ value: `TP1 ${formattedTp1}`, fill: '#00E676', fontSize: 10, position: 'insideTopLeft' }}
                          />
                          <ReferenceLine
                            y={stopLoss}
                            stroke="#FF3B30"
                            strokeDasharray="4 3"
                            strokeWidth={1.5}
                            label={{ value: `SL ${formattedSl}`, fill: '#FF3B30', fontSize: 10, position: 'insideBottomLeft' }}
                          />
                          <Area type="monotone" dataKey="price" stroke="#A78BFA" fill="url(#purpleGrad)" strokeWidth={2} isAnimationActive={false} />
                          <defs>
                            <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Plain-English Summary */}
                    <div
                      className={`mt-3 p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-start gap-2.5 ${
                        beginnerSummary.tone === 'win'
                          ? 'bg-[#00E676]/10 border-[#00E676]/35 text-[#E2FBE9]'
                          : beginnerSummary.tone === 'loss'
                          ? 'bg-[#FF3B30]/10 border-[#FF3B30]/35 text-[#FEE2E2]'
                          : beginnerSummary.tone === 'running'
                          ? 'bg-[#2979FF]/10 border-[#2979FF]/35 text-[#E0F2FE]'
                          : 'bg-[#131B2E] border-[#222F47] text-[#CBD5E1]'
                      }`}
                    >
                      {beginnerSummary.tone === 'win' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00E676] shrink-0 mt-0.5" />
                      ) : beginnerSummary.tone === 'loss' ? (
                        <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                      ) : (
                        <Activity className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
                      )}
                      <p className="leading-snug">{beginnerSummary.text}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: REAL BACKTEST STATISTICS */}
          {activeTab === 'BACKTEST_STATS' && (
            <div className="space-y-4">
              {!backtestStats.hasData ? (
                <div className="p-8 rounded-2xl bg-[#16120B] border border-[#FF9100]/45 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-[#FF9100] mx-auto" />
                  <div className="text-base font-black text-[#FFD700]">NO BACKTEST DATA - 0 TRADES</div>
                  <div className="text-sm font-mono font-bold text-[#FF9100]">Grade = C</div>
                  <p className="text-xs text-[#CBD5E1] max-w-md mx-auto">
                    Historical database contains <strong>0 verified trades</strong> for <strong>{pairSymbol}</strong>. Synthetic win rates and projected future curves are disabled.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#101726] border border-[#1E293B]">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Real Historical Win Rate</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-[#00E676]">{backtestStats.winPct}%</span>
                      <span className="text-xs font-mono text-[#FFD700]">Grade {gradeBadgeText}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                      {backtestStats.winCount} Wins / {backtestStats.lossCount} Losses across {backtestStats.tradeCount} verified trades.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#101726] border border-[#1E293B]">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Verified Trade Sample</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-[#38BDF8]">{backtestStats.tradeCount} Trades</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                      Source: {backtestStats.sourceLabel}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#101726] border border-[#1E293B]">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">H4 50 / 9 EMA Audit</span>
                    {signal.generationAudit ? (
                      <>
                        <div className="text-sm font-black font-mono text-[#F8FAFC] mt-1">
                          50 EMA: {signal.generationAudit.ema50} | 9 EMA: {signal.generationAudit.ema9}
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-1">
                          Trend Gate: {signal.generationAudit.h4TrendBias} ({signal.generationAudit.h4CandleCount} real H4 bars)
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-[#94A3B8] mt-1">No H4 EMA snapshot saved on this legacy signal.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VERIFIED PAST TRADES ONLY */}
          {activeTab === 'HISTORICAL_MATCHES' && (
            <div className="space-y-3">
              {backtestStats.examples.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#16120B] border border-[#FF9100]/45 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-[#FF9100] mx-auto" />
                  <div className="text-base font-black text-[#FFD700]">NO BACKTEST DATA - 0 TRADES</div>
                  <div className="text-xs font-mono font-bold text-[#FF9100]">Grade = C • 0 Historical Examples</div>
                  <p className="text-xs text-[#CBD5E1] max-w-md mx-auto">
                    There are 0 verified historical trades in the archive for <strong>{pairSymbol}</strong>. Past examples are never fabricated.
                  </p>
                </div>
              ) : (
                backtestStats.examples.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="p-3.5 rounded-xl bg-[#101726] border border-[#1E293B] space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] font-bold text-[10px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-black text-[#F8FAFC]">{ex.pairSymbol} ({ex.direction})</span>
                        <span className="text-[10px] font-mono text-[#94A3B8]">[{ex.timeframe}] · {ex.entryTime}</span>
                      </div>

                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded ${
                          ex.outcome === 'WIN'
                            ? 'bg-[#00E676]/20 text-[#00E676]'
                            : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                        }`}
                      >
                        {ex.outcome === 'WIN' ? `WIN (+${ex.pips}p)` : `LOSS (${ex.pips}p)`}
                      </span>
                    </div>

                    <p className="text-xs text-[#CBD5E1]">{ex.rationale}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1E293B] text-[11px] font-mono text-[#94A3B8]">
                      <span>Entry: <strong className="text-[#F8FAFC]">{ex.entryPrice}</strong></span>
                      <span>•</span>
                      <span>Exit: <strong className="text-[#F8FAFC]">{ex.exitPrice}</strong></span>
                      <span>•</span>
                      <span>Source: <strong className="text-[#38BDF8]">{ex.source}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#101726] border-t border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] hidden sm:flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#8B5CF6]" />
            <span>Risk-to-Reward: <strong className="text-[#F8FAFC]">1 : {rrRatio}</strong></span>
            <span>•</span>
            {backtestStats.hasData ? (
              <span>
                Real Backtest: <strong className="text-[#00E676]">{backtestStats.winPct}% ({backtestStats.tradeCount} trades • Grade {gradeBadgeText})</strong>
              </span>
            ) : (
              <span className="text-[#FF9100] font-bold">
                NO BACKTEST DATA - 0 TRADES · Grade C
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#2D3F5E] text-[#CBD5E1] font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>

            {onOpenElev8Order && (
              <button
                onClick={() => {
                  onClose();
                  onOpenElev8Order(signal);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2979FF] to-[#8B5CF6] hover:opacity-90 text-white font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Execute on MT5 Ticket</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
