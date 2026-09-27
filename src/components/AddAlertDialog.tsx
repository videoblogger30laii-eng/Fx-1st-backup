import React, { useState } from 'react';
import { AlertCondition, ALERT_CONDITIONS, ForexPair } from '../types';
import { ALL_PAIRS, formatPrice } from '../services/marketData';
import { X, BellPlus, Volume2, Vibrate } from 'lucide-react';

interface Props {
  initialPair?: ForexPair | null;
  initialPrice?: number | null;
  onDismiss: () => void;
  onAddAlert: (
    pairSymbol: string,
    condition: AlertCondition,
    targetPrice: number,
    note: string,
    sound: boolean,
    vibrate: boolean
  ) => void;
}

export const AddAlertDialog: React.FC<Props> = ({
  initialPair,
  initialPrice,
  onDismiss,
  onAddAlert
}) => {
  const [selectedPair, setSelectedPair] = useState<string>(initialPair?.symbol || ALL_PAIRS[0].symbol);
  const [condition, setCondition] = useState<AlertCondition>('PRICE_ABOVE');
  const [priceInput, setPriceInput] = useState<string>(
    initialPrice ? initialPrice.toString() : (initialPair ? initialPair.currentPrice.toString() : ALL_PAIRS[0].currentPrice.toString())
  );
  const [note, setNote] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(priceInput);
    if (!parsedPrice || parsedPrice <= 0) return;
    onAddAlert(selectedPair, condition, parsedPrice, note, soundEnabled, vibrateEnabled);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#101522] border border-[#222F47] rounded-2xl max-w-md w-full p-5 shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47] mb-4">
          <div className="flex items-center gap-2">
            <BellPlus className="w-5 h-5 text-[#FFD700]" />
            <span className="text-base font-bold text-[#F1F5F9]">Create Custom Price Alert</span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Trading Instrument</label>
            <select
              value={selectedPair}
              onChange={e => {
                const sym = e.target.value;
                setSelectedPair(sym);
                const p = ALL_PAIRS.find(x => x.symbol === sym);
                if (p) setPriceInput(p.currentPrice.toString());
              }}
              className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-hidden focus:border-[#FFD700]"
            >
              {ALL_PAIRS.map(p => (
                <option key={p.symbol} value={p.symbol}>
                  {p.symbol} - {p.name} ({formatPrice(p, p.currentPrice)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Trigger Condition</label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as AlertCondition)}
              className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-hidden focus:border-[#FFD700]"
            >
              {(Object.keys(ALERT_CONDITIONS) as AlertCondition[]).map(cond => (
                <option key={cond} value={cond}>
                  {ALERT_CONDITIONS[cond].iconSymbol} {ALERT_CONDITIONS[cond].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Target Price</label>
            <input
              type="number"
              step="any"
              value={priceInput}
              onChange={e => setPriceInput(e.target.value)}
              placeholder="e.g. 2740.00"
              required
              className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-sm font-mono text-[#F1F5F9] focus:outline-hidden focus:border-[#FFD700]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Alert Note / Rationale</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Demand zone liquidity sweep level"
              className="w-full bg-[#080B11] border border-[#222F47] rounded-xl px-3 py-2 text-xs text-[#F1F5F9] focus:outline-hidden focus:border-[#FFD700]"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94A3B8]">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={e => setSoundEnabled(e.target.checked)}
                className="rounded border-[#222F47] text-[#FFD700] focus:ring-0"
              />
              <Volume2 className="w-3.5 h-3.5" />
              <span>Chime Audio</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94A3B8]">
              <input
                type="checkbox"
                checked={vibrateEnabled}
                onChange={e => setVibrateEnabled(e.target.checked)}
                className="rounded border-[#222F47] text-[#FFD700] focus:ring-0"
              />
              <Vibrate className="w-3.5 h-3.5" />
              <span>Vibrate</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 mt-2 bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#080B11] font-black text-xs rounded-xl transition-colors"
          >
            ARM ALERT WATCHDOG
          </button>
        </form>
      </div>
    </div>
  );
};
