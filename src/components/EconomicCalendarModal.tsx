import React, { useState, useEffect } from 'react';
import { EconomicEvent } from '../types';
import { economicCalendarService } from '../services/economicCalendarService';
import { TelegramAlertService } from '../services/TelegramAlertService';
import {
  X,
  Calendar,
  Clock,
  Flame,
  Send,
  Check,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface ActiveSignalSummary {
  symbol: string;
  type: string;
  confluence: number;
  isNewsGenerated: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPair?: (pairSymbol: string) => void;
  activeSignalPairs?: ActiveSignalSummary[];
  onTriggerReleaseNow?: (eventId: string, outcome: 'BEAT_BULLISH' | 'MISSED_BEARISH') => void;
}

export const EconomicCalendarModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectPair,
  activeSignalPairs = [],
  onTriggerReleaseNow
}) => {
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'HIGH' | 'RELEASED'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [sentAlertId, setSentAlertId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>('news-1');
  const [selectedPairByEvent, setSelectedPairByEvent] = useState<Record<string, string>>({});
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Live 1-second clock so timers count down accurately and transition immediately to RELEASED at 00:00
  useEffect(() => {
    if (!isOpen) return;
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const events = economicCalendarService.getAllEvents();
  const filteredEvents = events.filter(e => {
    const isReleased = nowMs >= e.timestamp;
    if (impactFilter === 'HIGH' && e.impact !== 'HIGH') return false;
    if (impactFilter === 'RELEASED' && !isReleased) return false;
    if (currencyFilter !== 'ALL' && e.currency !== currencyFilter) return false;
    return true;
  });

  const currencies = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];

  const formatCountdown = (targetTs: number): string => {
    const diffSec = Math.floor((targetTs - nowMs) / 1000);
    if (diffSec <= 0) {
      const agoMins = Math.max(1, Math.floor(Math.abs(diffSec) / 60));
      if (agoMins < 60) return `Released ${agoMins}m ago`;
      const agoHrs = Math.floor(agoMins / 60);
      return `Released ${agoHrs}h ${agoMins % 60}m ago`;
    }
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const handleSendTelegramNewsAlert = async (evt: EconomicEvent) => {
    const isReleased = nowMs >= evt.timestamp;
    const msg =
      `🔴 *HIGH-IMPACT ECONOMIC NEWS ${isReleased ? 'RELEASED' : 'ALERT'}!*\n\n` +
      `📅 *Event:* ${evt.title}\n` +
      `🌐 *Currency Affected:* ${evt.currency}\n` +
      `⏰ *Release Time:* ${evt.timeFormatted} (${isReleased ? 'RELEASED' : formatCountdown(evt.timestamp)})\n` +
      `📊 *Actual:* ${evt.actual || 'Pending'} | *Forecast:* ${evt.forecast || 'N/A'} | *Previous:* ${evt.previous || 'N/A'}\n` +
      (evt.ifBeatScenario ? `\n🟢 *Bullish Scenario:* ${evt.ifBeatScenario}\n` : '') +
      (evt.ifMissScenario ? `🔴 *Bearish Scenario:* ${evt.ifMissScenario}\n` : '') +
      `\n👉 *Risk Rule:* ${evt.tradingRule || 'Expect rapid spread widening and potential slippage within 15 minutes of release.'}`;

    setSentAlertId(evt.id);
    await TelegramAlertService.sendAlert(msg, undefined, true);
    setTimeout(() => setSentAlertId(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D111C] border border-[#222F47] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF3366]/20 border border-[#FF3366]/40 flex items-center justify-center text-[#FF3366]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wide">
                  Economic Calendar & Pair Impact Guide
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676] text-[9.5px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                  SYNCED TIMER
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Live release countdowns, Actual vs Forecast results & exact pair BUY/SELL reactions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-3 border-b border-[#222F47] bg-[#0A0E17] flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Impact & Status Filter */}
          <div className="flex items-center gap-1 bg-[#101522] p-1 rounded-lg border border-[#222F47]">
            <button
              onClick={() => setImpactFilter('ALL')}
              className={`px-2 py-1 rounded text-[10.5px] font-bold transition-all ${
                impactFilter === 'ALL'
                  ? 'bg-[#2979FF] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setImpactFilter('HIGH')}
              className={`px-2 py-1 rounded text-[10.5px] font-bold flex items-center gap-1 transition-all ${
                impactFilter === 'HIGH'
                  ? 'bg-[#FF3366] text-white shadow-sm'
                  : 'text-[#FF3366] hover:bg-[#FF3366]/10'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>High Impact 🔴</span>
            </button>
            <button
              onClick={() => setImpactFilter('RELEASED')}
              className={`px-2 py-1 rounded text-[10.5px] font-bold flex items-center gap-1 transition-all ${
                impactFilter === 'RELEASED'
                  ? 'bg-[#00E676] text-[#080B11] shadow-sm'
                  : 'text-[#00E676] hover:bg-[#00E676]/10'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Released ({events.filter(e => nowMs >= e.timestamp).length})</span>
            </button>
          </div>

          {/* Currency Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {currencies.map(c => (
              <button
                key={c}
                onClick={() => setCurrencyFilter(c)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  currencyFilter === c
                    ? 'bg-[#FFD700] text-[#080B11]'
                    : 'bg-[#182033] text-[#94A3B8] hover:text-white border border-[#222F47]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-10 text-[#94A3B8] text-xs">
              No economic events found for selected filters.
            </div>
          ) : (
            filteredEvents.map(evt => {
              const diffMs = evt.timestamp - nowMs;
              const diffMinutes = Math.floor(diffMs / 60000);
              const isReleased = diffMs <= 0;
              const isImminent = !isReleased && diffMinutes <= 60;
              const isExpanded = expandedEventId === evt.id;

              return (
                <div
                  key={evt.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isReleased
                      ? 'bg-[#101522] border-[#00E676]/50 shadow-[0_0_12px_rgba(0,230,118,0.08)]'
                      : isImminent
                      ? 'bg-[#FF3366]/10 border-[#FF3366]/60 shadow-[0_0_15px_rgba(255,51,102,0.15)]'
                      : 'bg-[#101522] border-[#222F47] hover:border-[#2979FF]/40'
                  }`}
                >
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {/* Currency Badge */}
                      <span className="px-2.5 py-1 rounded-lg bg-[#182033] border border-[#222F47] font-mono font-black text-xs text-[#F1F5F9] shrink-0">
                        {evt.currency}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-[#F1F5F9]">{evt.title}</h4>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              evt.impact === 'HIGH'
                                ? 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                                : 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40'
                            }`}
                          >
                            {evt.impact === 'HIGH' ? '🔴 HIGH VOLATILITY' : '🟠 MEDIUM'}
                          </span>

                          {/* Live Status Pill: Clearly shows whether News Came In or Countdown */}
                          {isReleased ? (
                            <span className="px-2 py-0.5 rounded bg-[#00E676]/20 border border-[#00E676] text-[#00E676] text-[9.5px] font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>NEWS CAME IN • {formatCountdown(evt.timestamp)}</span>
                            </span>
                          ) : isImminent ? (
                            <span className="px-2 py-0.5 rounded bg-[#FF3366] text-white text-[9.5px] font-mono font-black animate-pulse">
                              ⚡ DUE IN {formatCountdown(evt.timestamp)}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-[#182033] border border-[#222F47] text-[#FFD700] text-[9.5px] font-mono font-bold">
                              ⏳ IN {formatCountdown(evt.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                          {evt.description}
                        </p>
                      </div>
                    </div>

                    {/* Time & Alert Button */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#FFD700]">
                        <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>{evt.timeFormatted}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendTelegramNewsAlert(evt)}
                        className="px-2 py-1 rounded-lg bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/40 text-[#0088cc] text-[10px] font-bold flex items-center gap-1 transition-all"
                        title="Broadcast event & pair impact guide to Telegram"
                      >
                        {sentAlertId === evt.id ? (
                          <>
                            <Check className="w-3 h-3 text-[#00E676]" />
                            <span className="text-[#00E676]">Sent to TG!</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>Alert TG</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 4-Column Data Matrix: ACTUAL | FORECAST | PREVIOUS | RELEASE OUTCOME */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 pt-2.5 border-t border-[#222F47]/60 text-[10px] font-mono">
                    <div className={`p-2 rounded-lg border ${
                      isReleased
                        ? 'bg-[#00E676]/10 border-[#00E676]/50'
                        : 'bg-[#080B11] border-[#222F47]/40'
                    }`}>
                      <span className="text-[#64748B] block text-[9px] uppercase">ACTUAL (RESULT)</span>
                      {isReleased ? (
                        <strong className="text-xs font-black text-[#00E676]">
                          {evt.actual || evt.releasedActualValue || evt.forecast}
                        </strong>
                      ) : (
                        <strong className="text-[#FFD700]">Waiting ({formatCountdown(evt.timestamp)})</strong>
                      )}
                    </div>

                    <div className="bg-[#080B11] p-2 rounded-lg border border-[#222F47]/40">
                      <span className="text-[#64748B] block text-[9px] uppercase">FORECAST</span>
                      <strong className="text-xs text-[#2979FF]">{evt.forecast || 'N/A'}</strong>
                    </div>

                    <div className="bg-[#080B11] p-2 rounded-lg border border-[#222F47]/40">
                      <span className="text-[#64748B] block text-[9px] uppercase">PREVIOUS</span>
                      <strong className="text-xs text-[#94A3B8]">{evt.previous || 'N/A'}</strong>
                    </div>

                    <div className="bg-[#080B11] p-2 rounded-lg border border-[#222F47]/40">
                      <span className="text-[#64748B] block text-[9px] uppercase">NEWS STATUS</span>
                      {isReleased ? (
                        <strong className="text-[#00E676] flex items-center gap-1">
                          <span>✅ Released</span>
                          {evt.surpriseOutcome === 'BEAT_BULLISH' && (
                            <span className="text-[9px] bg-[#00E676]/20 px-1 rounded">Bullish {evt.currency}</span>
                          )}
                        </strong>
                      ) : (
                        <strong className="text-[#FFD700]">⏳ Pending Release</strong>
                      )}
                    </div>
                  </div>

                  {/* If Released: Show Immediate Post-Release Outcome Summary */}
                  {isReleased && evt.releasedSummary && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-[#00E676]/10 border border-[#00E676]/40 text-[11px] text-[#F1F5F9] leading-relaxed">
                      <div className="font-black text-[#00E676] text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Official Release Outcome & Live Pair Reaction</span>
                      </div>
                      <p>{evt.releasedSummary}</p>
                    </div>
                  )}

                  {/* Affected Pairs Chips Row */}
                  {evt.affectedPairs && evt.affectedPairs.length > 0 && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap bg-[#090D16] px-2.5 py-2 rounded-lg border border-[#222F47]/70">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-bold text-[#94A3B8] uppercase">
                          Pairs & Signal Status:
                        </span>
                        {evt.affectedPairs.map(pairSym => {
                          const activeSig = activeSignalPairs.find(s => s.symbol === pairSym);
                          return (
                            <button
                              key={pairSym}
                              type="button"
                              onClick={() => {
                                if (onSelectPair) {
                                  onSelectPair(pairSym);
                                  onClose();
                                }
                              }}
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                                activeSig?.isNewsGenerated
                                  ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676] hover:bg-[#00E676]/30'
                                  : activeSig
                                  ? 'bg-[#2979FF]/20 border-[#2979FF]/60 text-[#F1F5F9] hover:bg-[#2979FF]/30'
                                  : 'bg-[#182033] hover:bg-[#2979FF] text-[#F1F5F9] hover:text-white border-[#222F47]'
                              }`}
                              title={
                                activeSig?.isNewsGenerated
                                  ? `New Signal Generated by News! Click to view ${pairSym} Signal Card`
                                  : activeSig
                                  ? `Active Signal (${activeSig.type.replace('_', ' ')}) — Click to view`
                                  : `Not on Signal Page yet — Will auto-generate signal when news releases!`
                              }
                            >
                              <span>{pairSym}</span>
                              {activeSig?.isNewsGenerated ? (
                                <span className="text-[8.5px] bg-[#00E676] text-[#080B11] px-1 rounded font-black">
                                  NEW {activeSig.type.startsWith('BUY') ? 'BUY' : 'SELL'}
                                </span>
                              ) : activeSig ? (
                                <span className={`text-[8.5px] px-1 rounded font-black ${
                                  activeSig.type.startsWith('BUY') ? 'text-[#00E676]' : 'text-[#FF3366]'
                                }`}>
                                  {activeSig.type.startsWith('BUY') ? 'BUY' : 'SELL'}
                                </span>
                              ) : (
                                <span className="text-[8.5px] text-[#FFD700]">+Auto</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isReleased && onTriggerReleaseNow && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onTriggerReleaseNow(evt.id, 'BEAT_BULLISH');
                                setNowMs(Date.now());
                              }}
                              className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 transition-colors"
                              title="Simulate Bullish news release right now and auto-update/generate signals"
                            >
                              ⚡ Sim Bullish Release
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onTriggerReleaseNow(evt.id, 'MISSED_BEARISH');
                                setNowMs(Date.now());
                              }}
                              className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-[#FF3366]/15 hover:bg-[#FF3366]/25 text-[#FF3366] border border-[#FF3366]/40 transition-colors"
                              title="Simulate Bearish news release right now and auto-update/generate signals"
                            >
                              ⚡ Sim Bearish Release
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                          className="text-[10.5px] font-bold text-[#2979FF] hover:text-[#60a5fa] flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Hide Impact Analysis' : 'Impact Analysis & Strategy'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dedicated 'Impact Analysis' & Trade Strategy Adjustment Section */}
                  {isExpanded && (() => {
                    const pairList = evt.pairImpacts || [];
                    const selectedPairSym =
                      selectedPairByEvent[evt.id] ||
                      pairList[0]?.pair ||
                      evt.affectedPairs?.[0] ||
                      `${evt.currency}/USD`;
                    const selectedPairImpact =
                      pairList.find(p => p.pair === selectedPairSym) || pairList[0];

                    // Determine how the event result maps to Bullish / Bearish / Neutral for the selected pair
                    const beatMakesPairBullish = selectedPairImpact
                      ? selectedPairImpact.ifBullishCurrency.startsWith('BUY')
                      : true;

                    let realizedPairImpact: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null = null;
                    if (isReleased) {
                      if (evt.surpriseOutcome === 'INLINE_NEUTRAL') {
                        realizedPairImpact = 'NEUTRAL';
                      } else if (evt.surpriseOutcome === 'BEAT_BULLISH') {
                        realizedPairImpact = beatMakesPairBullish ? 'BULLISH' : 'BEARISH';
                      } else if (evt.surpriseOutcome === 'MISSED_BEARISH') {
                        realizedPairImpact = beatMakesPairBullish ? 'BEARISH' : 'BULLISH';
                      }
                    }

                    const bullishTriggerCondition = beatMakesPairBullish
                      ? `When ${evt.currency} Actual Beats Forecast (> ${evt.forecast})`
                      : `When ${evt.currency} Actual Misses Forecast (< ${evt.forecast})`;

                    const bearishTriggerCondition = beatMakesPairBullish
                      ? `When ${evt.currency} Actual Misses Forecast (< ${evt.forecast})`
                      : `When ${evt.currency} Actual Beats Forecast (> ${evt.forecast})`;

                    return (
                      <div className="mt-2.5 pt-2.5 border-t border-[#222F47]/70 space-y-3 text-[11px] animate-fadeIn">
                        {/* IMPACT ANALYSIS HEADER & INTERACTIVE PAIR SELECTOR */}
                        <div className="bg-[#080B11] border border-[#2979FF]/40 rounded-xl p-3 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#222F47]/70 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#2979FF]/20 border border-[#2979FF]/40 text-[#2979FF] text-[10px] font-black uppercase tracking-wider">
                                Impact Analysis
                              </span>
                              <span className="text-xs font-bold text-[#F1F5F9]">
                                Market Impact & Trade Strategy Adjustment for{' '}
                                <strong className="text-[#FFD700] font-mono">{selectedPairSym}</strong>
                              </span>
                            </div>

                            {/* Realized / Active Impact Status Badge */}
                            {realizedPairImpact === 'BULLISH' && (
                              <span className="px-2 py-0.5 rounded bg-[#00E676]/20 border border-[#00E676] text-[#00E676] text-[10px] font-black">
                                🟢 RESULT IMPACT: BULLISH ON {selectedPairSym} (BUY BIAS)
                              </span>
                            )}
                            {realizedPairImpact === 'BEARISH' && (
                              <span className="px-2 py-0.5 rounded bg-[#FF3366]/20 border border-[#FF3366] text-[#FF3366] text-[10px] font-black">
                                🔴 RESULT IMPACT: BEARISH ON {selectedPairSym} (SELL BIAS)
                              </span>
                            )}
                            {realizedPairImpact === 'NEUTRAL' && (
                              <span className="px-2 py-0.5 rounded bg-[#FFD700]/20 border border-[#FFD700] text-[#FFD700] text-[10px] font-black">
                                🟡 RESULT IMPACT: NEUTRAL ON {selectedPairSym} (RANGE BIAS)
                              </span>
                            )}
                          </div>

                          {/* Select Pair to Analyze Impact */}
                          {pairList.length > 0 && (
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-[#94A3B8] font-semibold">
                                  Select Pair to Inspect Impact:
                                </span>
                                {pairList.map(pi => {
                                  const isSel = pi.pair === selectedPairSym;
                                  return (
                                    <button
                                      key={pi.pair}
                                      type="button"
                                      onClick={() =>
                                        setSelectedPairByEvent(prev => ({ ...prev, [evt.id]: pi.pair }))
                                      }
                                      className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                                        isSel
                                          ? 'bg-[#2979FF] text-white border-[#2979FF] shadow-sm'
                                          : 'bg-[#121826] text-[#94A3B8] border-[#222F47] hover:text-white'
                                      }`}
                                    >
                                      {pi.pair}
                                    </button>
                                  );
                                })}
                              </div>

                              {onSelectPair && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectPair(selectedPairSym);
                                    onClose();
                                  }}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#182033] hover:bg-[#2979FF] text-[#F1F5F9] hover:text-white border border-[#222F47] transition-colors"
                                >
                                  Open {selectedPairSym} on Signals Page →
                                </button>
                              )}
                            </div>
                          )}

                          {selectedPairImpact && (
                            <div className="text-[10.5px] text-[#94A3B8] bg-[#101522] px-2.5 py-1.5 rounded-lg border border-[#222F47]/60 flex items-center justify-between flex-wrap gap-2">
                              <span>
                                <strong className="text-[#F1F5F9]">Fundamental Relationship:</strong>{' '}
                                {selectedPairImpact.explanation}
                              </span>
                              <span className="font-mono text-[#FFD700] font-bold">
                                Expected Volatility: {selectedPairImpact.expectedPips}
                              </span>
                            </div>
                          )}

                          {/* 3-State Market Impact Breakdown: BULLISH / BEARISH / NEUTRAL */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {/* 1. BULLISH IMPACT ON SELECTED PAIR */}
                            <div
                              className={`rounded-xl p-2.5 border transition-all ${
                                realizedPairImpact === 'BULLISH'
                                  ? 'bg-[#00E676]/15 border-[#00E676] ring-1 ring-[#00E676]/50'
                                  : 'bg-[#00E676]/5 border-[#00E676]/30'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="flex items-center gap-1 text-[#00E676] font-black text-[10.5px] uppercase">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>Bullish ({selectedPairSym} ▲)</span>
                                </span>
                                {realizedPairImpact === 'BULLISH' && (
                                  <span className="text-[8.5px] bg-[#00E676] text-[#080B11] px-1.5 py-0.2 rounded font-black">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[9.5px] font-mono text-[#00E676]/90 mb-1.5 font-semibold">
                                {bullishTriggerCondition}
                              </div>
                              <div className="text-[10px] text-[#E2E8F0] space-y-1 leading-relaxed">
                                <p>
                                  <strong className="text-[#00E676]">Strategy Adjustment:</strong> Switch bias to{' '}
                                  <strong>BUY</strong> on {selectedPairSym}.
                                </p>
                                <p>
                                  • <strong>If in a BUY:</strong> Move Stop Loss to Breakeven (BE) and hold runners for TP2/TP3.
                                </p>
                                <p>
                                  • <strong>If in a SELL:</strong> Exit immediately on M15 candle close above resistance; do not widen SL.
                                </p>
                                <p>
                                  • <strong>New Trade:</strong> Wait 5–10m post-release, then enter BUY on M5/M15 Order Block pullback.
                                </p>
                              </div>
                            </div>

                            {/* 2. BEARISH IMPACT ON SELECTED PAIR */}
                            <div
                              className={`rounded-xl p-2.5 border transition-all ${
                                realizedPairImpact === 'BEARISH'
                                  ? 'bg-[#FF3366]/15 border-[#FF3366] ring-1 ring-[#FF3366]/50'
                                  : 'bg-[#FF3366]/5 border-[#FF3366]/30'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="flex items-center gap-1 text-[#FF3366] font-black text-[10.5px] uppercase">
                                  <TrendingDown className="w-3.5 h-3.5" />
                                  <span>Bearish ({selectedPairSym} ▼)</span>
                                </span>
                                {realizedPairImpact === 'BEARISH' && (
                                  <span className="text-[8.5px] bg-[#FF3366] text-white px-1.5 py-0.2 rounded font-black">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[9.5px] font-mono text-[#FF3366]/90 mb-1.5 font-semibold">
                                {bearishTriggerCondition}
                              </div>
                              <div className="text-[10px] text-[#E2E8F0] space-y-1 leading-relaxed">
                                <p>
                                  <strong className="text-[#FF3366]">Strategy Adjustment:</strong> Switch bias to{' '}
                                  <strong>SELL</strong> on {selectedPairSym}.
                                </p>
                                <p>
                                  • <strong>If in a SELL:</strong> Lock Stop Loss at Breakeven (BE) and trail toward TP2/TP3 targets.
                                </p>
                                <p>
                                  • <strong>If in a BUY:</strong> Close position or tighten SL below M15 structure low to prevent drawdown.
                                </p>
                                <p>
                                  • <strong>New Trade:</strong> Enter SELL after the initial liquidity sweep and M15 bearish displacement.
                                </p>
                              </div>
                            </div>

                            {/* 3. NEUTRAL / IN-LINE IMPACT ON SELECTED PAIR */}
                            <div
                              className={`rounded-xl p-2.5 border transition-all ${
                                realizedPairImpact === 'NEUTRAL'
                                  ? 'bg-[#FFD700]/15 border-[#FFD700] ring-1 ring-[#FFD700]/50'
                                  : 'bg-[#FFD700]/5 border-[#FFD700]/30'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="flex items-center gap-1 text-[#FFD700] font-black text-[10.5px] uppercase">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Neutral ({selectedPairSym} ↔)</span>
                                </span>
                                {realizedPairImpact === 'NEUTRAL' && (
                                  <span className="text-[8.5px] bg-[#FFD700] text-[#080B11] px-1.5 py-0.2 rounded font-black">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[9.5px] font-mono text-[#FFD700]/90 mb-1.5 font-semibold">
                                When {evt.currency} Actual Matches Forecast ({evt.forecast})
                              </div>
                              <div className="text-[10px] text-[#E2E8F0] space-y-1 leading-relaxed">
                                <p>
                                  <strong className="text-[#FFD700]">Strategy Adjustment:</strong> Maintain{' '}
                                  <strong>Range / Pre-News Technical Bias</strong>.
                                </p>
                                <p>
                                  • <strong>Open Trades:</strong> Keep existing technical SL/TP intact; take 50% partial profit at TP1.
                                </p>
                                <p>
                                  • <strong>Whip-Saw Filter:</strong> Expect a 15–25 pip two-way stop sweep before price returns to equilibrium.
                                </p>
                                <p>
                                  • <strong>New Trade:</strong> Trade only confirmed H1/H4 Smart Money Order Blocks; avoid breakout chasing.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Macro Currency Scenarios Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {evt.ifBeatScenario && (
                            <div className="bg-[#00E676]/10 border border-[#00E676]/30 rounded-lg p-2.5">
                              <div className="flex items-center gap-1.5 text-[#00E676] font-black text-[10px] uppercase mb-1">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>If {evt.currency} Beats Forecast (Bullish {evt.currency})</span>
                              </div>
                              <p className="text-[#E2E8F0] leading-relaxed text-[10.5px]">
                                {evt.ifBeatScenario}
                              </p>
                            </div>
                          )}

                          {evt.ifMissScenario && (
                            <div className="bg-[#FF3366]/10 border border-[#FF3366]/30 rounded-lg p-2.5">
                              <div className="flex items-center gap-1.5 text-[#FF3366] font-black text-[10px] uppercase mb-1">
                                <TrendingDown className="w-3.5 h-3.5" />
                                <span>If {evt.currency} Misses Forecast (Bearish {evt.currency})</span>
                              </div>
                              <p className="text-[#E2E8F0] leading-relaxed text-[10.5px]">
                                {evt.ifMissScenario}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Per-Pair Action Table */}
                        {evt.pairImpacts && evt.pairImpacts.length > 0 && (
                          <div className="bg-[#080B11] border border-[#222F47] rounded-lg overflow-hidden">
                            <div className="px-3 py-1.5 bg-[#121826] border-b border-[#222F47] text-[9.5px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
                              <span>All Affected Pairs Reaction Matrix ({evt.currency} Release)</span>
                              <span className="text-[#FFD700]">Expected Pip Move</span>
                            </div>
                            <div className="divide-y divide-[#222F47]/50">
                              {evt.pairImpacts.map(pi => (
                                <div
                                  key={pi.pair}
                                  onClick={() =>
                                    setSelectedPairByEvent(prev => ({ ...prev, [evt.id]: pi.pair }))
                                  }
                                  className={`p-2 text-[10.5px] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                                    pi.pair === selectedPairSym ? 'bg-[#182033]/70' : 'hover:bg-[#121826]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-white bg-[#182033] px-2 py-0.5 rounded border border-[#222F47]">
                                      {pi.pair}
                                    </span>
                                    <span className="text-[#94A3B8] text-[10px]">{pi.explanation}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9.5px]">
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-bold ${
                                        pi.ifBullishCurrency.startsWith('BUY')
                                          ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                                          : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30'
                                      }`}
                                      title={`If ${evt.currency} news beats forecast`}
                                    >
                                      Good {evt.currency}: {pi.ifBullishCurrency.startsWith('BUY') ? '▲ BUY' : '▼ SELL'}
                                    </span>

                                    <span
                                      className={`px-1.5 py-0.5 rounded font-bold ${
                                        pi.ifBearishCurrency.startsWith('BUY')
                                          ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                                          : 'bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30'
                                      }`}
                                      title={`If ${evt.currency} news misses forecast`}
                                    >
                                      Bad {evt.currency}: {pi.ifBearishCurrency.startsWith('BUY') ? '▲ BUY' : '▼ SELL'}
                                    </span>

                                    <span className="text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded border border-[#FFD700]/30 font-bold">
                                      {pi.expectedPips}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Institutional Execution Rule */}
                        {evt.tradingRule && (
                          <div className="flex items-start gap-2 bg-[#182033]/80 border border-[#FFD700]/30 rounded-lg p-2 text-[10.5px] text-[#F1F5F9]">
                            <ShieldAlert className="w-4 h-4 text-[#FFD700] shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-[#FFD700]">Institutional News Execution Rule: </strong>
                              <span>{evt.tradingRule}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Advice */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] text-[11px] text-[#94A3B8] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#2979FF] shrink-0" />
            <span>Timers are anchored to session release times and automatically reveal Actual results at 00:00.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#182033] hover:bg-[#222F47] text-white font-bold rounded-lg transition-colors shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

