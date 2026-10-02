import React, { useState } from 'react';
import { MarketDataProvider, PROVIDER_CONFIGS } from '../types';
import { X, Database, Check, ShieldCheck } from 'lucide-react';

interface Props {
  currentProvider: MarketDataProvider;
  twelveDataKey: string;
  finnhubKey: string;
  derivKey: string;
  derivAppId: string;
  activeStatus: string;
  onSelect: (provider: MarketDataProvider) => void;
  onSaveApiKey: (provider: MarketDataProvider, key: string) => void;
  onSaveDerivConfig: (appId: string, token: string) => void;
  onDismiss: () => void;
}

export const MarketDataProviderModal: React.FC<Props> = ({
  currentProvider,
  twelveDataKey,
  finnhubKey,
  derivKey,
  derivAppId,
  activeStatus,
  onSelect,
  onSaveApiKey,
  onSaveDerivConfig,
  onDismiss
}) => {
  const [tdKeyInput, setTdKeyInput] = useState(twelveDataKey);
  const [fhKeyInput, setFhKeyInput] = useState(finnhubKey);
  const [derivTokenInput, setDerivTokenInput] = useState(derivKey);
  const [derivAppIdInput, setDerivAppIdInput] = useState(derivAppId);

  const saveAndApply = (provider: MarketDataProvider) => {
    onSelect(provider);
    if (provider === 'TWELVE_DATA') onSaveApiKey(provider, tdKeyInput);
    if (provider === 'FINNHUB') onSaveApiKey(provider, fhKeyInput);
    if (provider === 'DERIV') onSaveDerivConfig(derivAppIdInput, derivTokenInput);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#101522] border border-[#222F47] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47] mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#2979FF]" />
            <div>
              <span className="text-base font-bold text-[#F1F5F9] block">Market Data Pipeline</span>
              <span className="text-[11px] text-[#94A3B8]">Deriv WebSocket Primary • Twelve Data Secondary Fallback</span>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Status Pill */}
        <div className="bg-[#182033] border border-[#222F47] rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="text-xs text-[#94A3B8] flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
            Active Feed Status:
          </div>
          <div className="text-xs font-bold text-[#00E676] bg-[#00E676]/10 px-2.5 py-0.5 rounded border border-[#00E676]/30">
            {activeStatus}
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {(Object.keys(PROVIDER_CONFIGS) as MarketDataProvider[]).map(provider => {
            const config = PROVIDER_CONFIGS[provider];
            const isSelected = currentProvider === provider;

            return (
              <div
                key={provider}
                onClick={() => onSelect(provider)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#182033] border-[#2979FF] shadow-[0_0_12px_rgba(41,121,255,0.1)]'
                    : 'bg-[#080B11] border-[#222F47] hover:border-[#222F47]/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#F1F5F9]">{config.displayName}</span>
                    {config.isPrimary && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                        PRIMARY
                      </span>
                    )}
                    {config.isSecondary && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2979FF]/20 text-[#2979FF] border border-[#2979FF]/40">
                        FALLBACK
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-[#2979FF]" />}
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B]">{config.endpointName}</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] mb-2">{config.description}</p>

                {/* Inline Credentials inputs if this provider is selected */}
                {isSelected && provider === 'DERIV' && (
                  <div className="mt-3 pt-3 border-t border-[#222F47] space-y-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#00E676] flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Credentials Configured & Active
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#94A3B8] block mb-0.5">Deriv App ID</label>
                        <input
                          id="derivAppId"
                          type="text"
                          value={derivAppIdInput}
                          onChange={e => setDerivAppIdInput(e.target.value)}
                          placeholder="1089"
                          className="w-full bg-[#101522] border border-[#222F47] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F1F5F9]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#94A3B8] block mb-0.5">Deriv API Token</label>
                        <input
                          id="derivApiToken"
                          type="password"
                          value={derivTokenInput}
                          onChange={e => setDerivTokenInput(e.target.value)}
                          placeholder="Token loaded"
                          className="w-full bg-[#101522] border border-[#222F47] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F1F5F9]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isSelected && provider === 'TWELVE_DATA' && (
                  <div className="mt-3 pt-3 border-t border-[#222F47]" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-[#94A3B8]">Twelve Data API Key</label>
                      <span className="text-[10px] text-[#00E676] flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Key Active
                      </span>
                    </div>
                    <input
                      type="password"
                      value={tdKeyInput}
                      onChange={e => setTdKeyInput(e.target.value)}
                      placeholder="Twelve Data Key loaded"
                      className="w-full bg-[#101522] border border-[#222F47] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F1F5F9]"
                    />
                  </div>
                )}

                {isSelected && provider === 'FINNHUB' && (
                  <div className="mt-3 pt-3 border-t border-[#222F47]" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-[#94A3B8]">Finnhub API Key</label>
                      <span className="text-[10px] text-[#00E676] flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Key Active
                      </span>
                    </div>
                    <input
                      type="password"
                      value={fhKeyInput}
                      onChange={e => setFhKeyInput(e.target.value)}
                      placeholder="Finnhub Key loaded"
                      className="w-full bg-[#101522] border border-[#222F47] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F1F5F9]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => saveAndApply(currentProvider)}
          className="w-full py-2.5 bg-[#2979FF] hover:bg-[#2979FF]/90 text-[#F1F5F9] font-bold text-xs rounded-xl transition-colors"
        >
          CONFIRM PROVIDER SELECTION
        </button>
      </div>
    </div>
  );
};

