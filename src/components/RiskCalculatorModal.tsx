import React, { useState } from 'react';
import { X, Calculator, ShieldCheck, DollarSign } from 'lucide-react';

interface Props {
  onDismiss: () => void;
}

export const RiskCalculatorModal: React.FC<Props> = ({ onDismiss }) => {
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [slPips, setSlPips] = useState<number>(25.0);
  const [instrument, setInstrument] = useState<'FOREX' | 'GOLD' | 'INDICES'>('GOLD');

  const riskAmountUsd = balance * (riskPercent / 100);

  // Lot calculation:
  // Forex: 1 lot = $10/pip
  // Gold: 1 lot = 100 oz. $1.00 move = $100 -> $0.10/pip on 0.01 lot -> $10/pip on 1.0 lot.
  // US30: 1 point = $1
  let lotSize = 0.01;
  if (slPips > 0) {
    if (instrument === 'FOREX') {
      lotSize = riskAmountUsd / (slPips * 10);
    } else if (instrument === 'GOLD') {
      lotSize = riskAmountUsd / (slPips * 10);
    } else {
      lotSize = riskAmountUsd / (slPips * 1.0);
    }
  }

  const roundedLots = Math.max(0.01, Math.min(50.0, Math.round(lotSize * 100) / 100));

  const reward1_2 = riskAmountUsd * 2.0;
  const reward1_3 = riskAmountUsd * 3.3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#101522] border border-[#222F47] rounded-2xl max-w-md w-full p-5 shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47] mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#00E676]" />
            <span className="text-base font-bold text-[#F1F5F9]">Institutional Risk Calculator</span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instrument Switcher */}
        <div className="flex gap-2 mb-4">
          {(['GOLD', 'FOREX', 'INDICES'] as const).map(inst => (
            <button
              key={inst}
              onClick={() => setInstrument(inst)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                instrument === inst
                  ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676]'
                  : 'bg-[#182033] border-[#222F47] text-[#94A3B8]'
              }`}
            >
              {inst === 'GOLD' ? 'Gold (XAU)' : inst === 'FOREX' ? 'Forex Pairs' : 'US30 / Indices'}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">
              Account Balance (USD)
            </label>
            <input
              type="number"
              value={balance}
              onChange={e => setBalance(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-sm font-mono text-[#F1F5F9] focus:outline-hidden focus:border-[#00E676]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={e => setRiskPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-sm font-mono text-[#F1F5F9] focus:outline-hidden focus:border-[#00E676]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">
                Stop Loss (Pips / Pts)
              </label>
              <input
                type="number"
                step="1"
                value={slPips}
                onChange={e => setSlPips(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-sm font-mono text-[#F1F5F9] focus:outline-hidden focus:border-[#00E676]"
              />
            </div>
          </div>
        </div>

        {/* Recommended Result Card */}
        <div className="bg-[#182033] border border-[#00E676]/40 rounded-xl p-4 text-center mb-4">
          <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Recommended Position Size</div>
          <div className="text-3xl font-black font-mono text-[#00E676] my-1">
            {roundedLots.toFixed(2)} <span className="text-sm font-normal text-[#94A3B8]">Lots</span>
          </div>
          <div className="text-xs text-[#94A3B8]">
            Max Dollar Risk: <span className="text-[#FF3366] font-bold font-mono">${riskAmountUsd.toFixed(2)}</span>
          </div>
        </div>

        {/* Expected Yield Scenarios */}
        <div className="grid grid-cols-2 gap-2 text-left mb-4">
          <div className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
            <div className="text-[9px] text-[#94A3B8] uppercase">1:2 Target Yield (TP1)</div>
            <div className="text-sm font-mono font-bold text-[#00E676]">+${reward1_2.toFixed(2)}</div>
            <div className="text-[9px] text-[#64748B]">+{ (riskPercent * 2).toFixed(1) }% Account Gain</div>
          </div>

          <div className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
            <div className="text-[9px] text-[#94A3B8] uppercase">1:3.3 Asymmetric (TP2)</div>
            <div className="text-sm font-mono font-bold text-[#FFD700]">+${reward1_3.toFixed(2)}</div>
            <div className="text-[9px] text-[#64748B]">+{ (riskPercent * 3.3).toFixed(1) }% Account Gain</div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-2.5 bg-[#00E676] hover:bg-[#00E676]/90 text-[#080B11] font-black text-xs rounded-xl transition-colors"
        >
          APPLY & CLOSE
        </button>
      </div>
    </div>
  );
};
