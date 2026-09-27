import React, { useState } from 'react';
import { MacroMarketData, EconomicEvent, CurrencyStrength, ImpactLevel } from '../types';
import { Globe, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Newspaper } from 'lucide-react';

interface Props {
  macroData: MacroMarketData;
  economicEvents: EconomicEvent[];
  currencyStrengths: CurrencyStrength[];
  onRefreshMacro: () => void;
}

export const FundamentalsScreen: React.FC<Props> = ({
  macroData,
  economicEvents,
  currencyStrengths,
  onRefreshMacro
}) => {
  const [expandedNewsId, setExpandedNewsId] = useState<number | null>(null);

  const getImpactBadge = (impact: ImpactLevel) => {
    switch (impact) {
      case 'HIGH':
        return 'bg-[#FF3366]/20 text-[#FF3366] border-[#FF3366]/40';
      case 'MEDIUM':
        return 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/40';
      case 'LOW':
        return 'bg-[#2979FF]/20 text-[#2979FF] border-[#2979FF]/40';
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16 text-left">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#FFD700]" />
            <h2 className="text-lg font-black text-[#F1F5F9] uppercase tracking-wider">
              Macro Factors & Fundamentals
            </h2>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Finnhub macro indicators, risk sentiment regime, central bank stances & news wire
          </p>
        </div>

        <button
          onClick={onRefreshMacro}
          className="p-2 rounded-xl bg-[#101522] border border-[#222F47] text-[#FFD700] hover:bg-[#182033] transition-colors"
          title="Refresh Macro Data"
        >
          <RefreshCw className={`w-4 h-4 ${macroData.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Section 1: Live Macro Benchmarks Carousel */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">
            Live Macro Benchmarks (Finnhub)
          </span>
          <span className="text-[9px] font-bold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
            FINNHUB API
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {macroData.assets.map(asset => {
            const isPos = asset.changePercent >= 0;
            return (
              <div
                key={asset.symbol}
                className="bg-[#101522] border border-[#222F47] rounded-xl p-3 shrink-0 min-w-[130px]"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-[#F1F5F9]">{asset.symbol}</span>
                  <span
                    className={`text-[9px] font-bold px-1 rounded ${
                      isPos ? 'bg-[#00E676]/15 text-[#00E676]' : 'bg-[#FF3366]/15 text-[#FF3366]'
                    }`}
                  >
                    {isPos ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-sm font-mono font-black text-[#F1F5F9]">
                  {asset.price.toFixed(2)}
                </div>
                <div className="text-[8.5px] text-[#64748B] truncate mt-0.5">{asset.role}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Macro Regime & Assessment Card */}
      <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider">
            Institutional Market Regime
          </span>
          <span className="text-[10px] font-bold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
            {macroData.marketRegime}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-[#222F47]/60 text-xs">
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold">Risk Sentiment</div>
            <div className="text-xs font-semibold text-[#F1F5F9] mt-0.5">{macroData.riskSentiment}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold">US Dollar (DXY) Stance</div>
            <div className="text-xs text-[#94A3B8] mt-0.5">{macroData.dxyAssessment}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold">Gold (XAU) Catalyst</div>
            <div className="text-xs text-[#FFD700] font-medium mt-0.5">{macroData.goldFundamentalDriver}</div>
          </div>
        </div>
      </div>

      {/* Section 3: Central Bank Interest Rate Matrix */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">
          G4 Central Bank Policy Trajectory
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {macroData.centralBankStances.map(cb => (
            <div
              key={cb.bank}
              className="bg-[#101522] border border-[#222F47] rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-[#F1F5F9]">{cb.bank}</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">{cb.marketImpliedAction}</div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded border border-[#FFD700]/30 block mb-0.5">
                  {cb.rate}
                </span>
                <span className="text-[9px] text-[#2979FF] font-semibold">{cb.stance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Live Forex & Macro News Wire (Finnhub) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] px-1">
          <div className="flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5 text-[#FFD700]" />
            <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">
              Real-Time Forex News Wire
            </span>
          </div>
          <span className="text-[9px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded border border-[#FFD700]/30">
            POWERED BY FINNHUB
          </span>
        </div>

        <div className="space-y-2">
          {macroData.newsArticles.map(news => {
            const isExpanded = expandedNewsId === news.id;
            return (
              <div
                key={news.id}
                onClick={() => setExpandedNewsId(isExpanded ? null : news.id)}
                className="bg-[#101522] border border-[#222F47] rounded-xl p-3 cursor-pointer hover:border-[#222F47]/80 transition-all"
              >
                <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
                  <span className="text-[#2979FF] font-bold bg-[#2979FF]/10 px-2 py-0.5 rounded">
                    {news.source}
                  </span>
                  <span>{new Date(news.datetime * 1000).toLocaleTimeString()}</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[#F1F5F9] leading-snug">{news.headline}</h4>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[#64748B] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#64748B] shrink-0" />}
                </div>

                {isExpanded && news.summary && (
                  <p className="text-xs text-[#94A3B8] mt-2 pt-2 border-t border-[#222F47]/50 leading-relaxed">
                    {news.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5: Live Currency Relative Strength */}
      <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider">
            Live Currency Relative Strength Heatmap
          </span>
          <span className="text-[10px] text-[#64748B]">Interbank Flow</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center">
          {currencyStrengths.map(c => (
            <div key={c.currency} className="bg-[#182033] p-2 rounded-lg border border-[#222F47]">
              <div className="text-xs font-bold text-[#F1F5F9]">{c.currency}</div>
              <div
                className={`text-base font-black font-mono my-0.5 ${
                  c.score >= 70 ? 'text-[#00E676]' : c.score <= 40 ? 'text-[#FF3366]' : 'text-[#FFD700]'
                }`}
              >
                {c.score}
              </div>
              <div className="text-[9px] text-[#94A3B8]">{c.change24h}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 6: Upcoming High-Impact Releases */}
      <div className="space-y-2">
        <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">
          Upcoming High-Impact Economic Calendar
        </div>

        <div className="space-y-2">
          {economicEvents.map(event => (
            <div
              key={event.id}
              className="bg-[#101522] border border-[#222F47] rounded-xl p-3 flex items-start justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-[#F1F5F9] bg-[#182033] px-2 py-0.5 rounded border border-[#222F47]">
                    {event.currency}
                  </span>
                  <span className="text-xs font-bold text-[#F1F5F9]">{event.title}</span>
                </div>
                <div className="text-[10px] text-[#94A3B8]">
                  Time: {event.time} • Forecast: {event.forecast} • Prior: {event.previous}
                </div>
                <div className="text-[10px] text-[#2979FF] mt-1 font-medium">{event.bias}</div>
              </div>

              <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${getImpactBadge(event.impact)}`}>
                {event.impact}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
