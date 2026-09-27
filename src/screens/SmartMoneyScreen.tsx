import React from 'react';
import { SmartMoneyZone, SmartMoneyType } from '../types';
import { Layers, ShieldCheck, Star } from 'lucide-react';

interface Props {
  zones: SmartMoneyZone[];
}

const BADGE_COLORS: Record<SmartMoneyType, { bg: string; text: string; border: string }> = {
  ORDER_BLOCK: { bg: 'bg-[#00E676]/15', text: 'text-[#00E676]', border: 'border-[#00E676]/30' },
  FAIR_VALUE_GAP: { bg: 'bg-[#2979FF]/15', text: 'text-[#2979FF]', border: 'border-[#2979FF]/30' },
  LIQUIDITY_SWEEP: { bg: 'bg-[#FFD700]/15', text: 'text-[#FFD700]', border: 'border-[#FFD700]/30' },
  BREAK_OF_STRUCTURE: { bg: 'bg-[#A855F7]/15', text: 'text-[#A855F7]', border: 'border-[#A855F7]/30' },
  CHANGE_OF_CHARACTER: { bg: 'bg-[#FF3366]/15', text: 'text-[#FF3366]', border: 'border-[#FF3366]/30' }
};

export const SmartMoneyScreen: React.FC<Props> = ({ zones }) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16 text-left">
      <div>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#2979FF]" />
          <h2 className="text-lg font-black text-[#F1F5F9] uppercase tracking-wider">
            Smart Money Concepts (SMC)
          </h2>
        </div>
        <p className="text-xs text-[#94A3B8]">
          Institutional Order Blocks, Liquidity Sweeps, Fair Value Gaps, and Structure Breaks
        </p>
      </div>

      <div className="space-y-3">
        {zones.map(zone => {
          const colors = BADGE_COLORS[zone.type] || BADGE_COLORS.ORDER_BLOCK;
          return (
            <div
              key={zone.id}
              className="bg-[#101522] border border-[#222F47] rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-[#F1F5F9]">{zone.pairSymbol}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {zone.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#64748B] bg-[#182033] px-2 py-0.5 rounded border border-[#222F47]">
                  {zone.timeframe}
                </span>
              </div>

              <p className="text-xs text-[#94A3B8] mb-3">{zone.description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-[#222F47]/60 text-xs">
                <span className="font-mono text-[#F1F5F9] font-bold">
                  Zone: {zone.lowPrice} - {zone.highPrice}
                </span>

                <span
                  className={`text-[10px] font-bold ${
                    zone.isMitigated ? 'text-[#64748B]' : 'text-[#00E676]'
                  }`}
                >
                  {zone.isMitigated ? 'Mitigated' : 'Unmitigated (Active)'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
