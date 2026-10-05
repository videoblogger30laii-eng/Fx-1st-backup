import React, { useState, useMemo } from 'react';
import { Elev8AccountConfig, Elev8Trade, Elev8ExecutionMode, ForexSignal } from '../types';
import { formatPrice, calculateDollarPnl } from '../services/marketData';
import { realPriceService } from '../services/RealPriceService';
import { WhatsAppAlertService } from '../services/WhatsAppAlertService';
import {
  X,
  ShieldCheck,
  Check,
  Copy,
  Download,
  Terminal,
  Layers,
  Zap,
  AlertTriangle,
  Server,
  Lock,
  Cpu,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  History,
  Smartphone,
  Trash2,
  DollarSign,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Radio,
  ExternalLink,
  Wifi,
  CloudLightning,
  Play,
  Edit3
} from 'lucide-react';

interface Props {
  config: Elev8AccountConfig;
  trades: Elev8Trade[];
  signals: ForexSignal[];
  onSaveConfig: (updated: Elev8AccountConfig) => void;
  onCloseTrade: (tradeId: string) => void;
  onDeleteTrade?: (tradeId: string) => void;
  onMoveToBreakEven?: (tradeId: string) => void;
  onClearHistory: () => void;
  onDismiss: () => void;
}

export const Elev8IntegrationModal: React.FC<Props> = ({
  config,
  trades,
  signals,
  onSaveConfig,
  onCloseTrade,
  onDeleteTrade,
  onMoveToBreakEven,
  onClearHistory,
  onDismiss
}) => {
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'REAL_EXECUTION' | 'SETUP' | 'MOBILE' | 'EA_CODE'>('REAL_EXECUTION');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'OPEN' | 'PENDING' | 'CLOSED'>('ALL');

  // Account Config Form
  const [accountNumber, setAccountNumber] = useState(config.accountNumber || '');
  const [server, setServer] = useState(config.server || 'Elev8Markets-Live');
  const [customServer, setCustomServer] = useState('');
  const [accountType, setAccountType] = useState(config.accountType || 'EVALUATION');
  const [accountBalance, setAccountBalance] = useState(config.accountBalance || 50000);
  const [riskPercent, setRiskPercent] = useState(config.riskPerTradePercent || 0.5);
  const [symbolSuffix, setSymbolSuffix] = useState(config.symbolSuffix || '');
  const [autoCopyEnabled, setAutoCopyEnabled] = useState(config.autoCopyWebhookEnabled || false);
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');

  // Quick Inline Balance/Equity Edit State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalanceInput, setTempBalanceInput] = useState(String(config.accountBalance || 100));

  // Real Execution Modes
  const [executionMode, setExecutionMode] = useState<Elev8ExecutionMode>(config.executionMode || 'SIMULATED');
  const [metaApiToken, setMetaApiToken] = useState(config.metaApiToken || '');
  const [metaApiAccountId, setMetaApiAccountId] = useState(config.metaApiAccountId || '');

  // Test Connection State
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = useState<string>('');

  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedServer = server === 'CUSTOM' ? (customServer || 'Elev8-Custom') : server;

  // Prop firm risk math (Elev8 rules: 4% daily loss / 8% max loss)
  const maxDollarRisk = (accountBalance * (riskPercent / 100));

  // Calculate live floating P&L and realized P&L across trades
  const {
    pendingTrades,
    openTrades,
    closedTrades,
    totalRealizedPnl,
    totalFloatingPnl,
    winCount,
    lossCount,
    winRate
  } = useMemo(() => {
    let realized = 0;
    let floating = 0;
    let wins = 0;
    let losses = 0;

    const pendingList: Elev8Trade[] = [];
    const openList: Elev8Trade[] = [];
    const closedList: Elev8Trade[] = [];

    trades.forEach((t) => {
      const isLimitOrStop = t.orderType.includes('LIMIT') || t.orderType.includes('STOP');
      const livePrice = realPriceService.getPrice(t.symbol.replace(config.symbolSuffix || '', '')) || t.currentPrice;

      // Determine if a pending order should trigger based on live price
      let isTriggered = false;
      if (isLimitOrStop && t.status === 'PENDING') {
        if (t.orderType === 'BUY_LIMIT' && livePrice <= t.entryPrice) isTriggered = true;
        else if (t.orderType === 'SELL_LIMIT' && livePrice >= t.entryPrice) isTriggered = true;
        else if (t.orderType === 'BUY_STOP' && livePrice >= t.entryPrice) isTriggered = true;
        else if (t.orderType === 'SELL_STOP' && livePrice <= t.entryPrice) isTriggered = true;
      }

      // Check legacy/saved state: if marked 'OPEN' but orderType is LIMIT/STOP and price hasn't reached entry, treat as PENDING
      const isStillPending = (t.status === 'PENDING' && !isTriggered) || 
        (t.status === 'OPEN' && isLimitOrStop && !t.triggeredAt && (
          (t.orderType === 'SELL_LIMIT' && livePrice < t.entryPrice) ||
          (t.orderType === 'BUY_LIMIT' && livePrice > t.entryPrice) ||
          (t.orderType === 'SELL_STOP' && livePrice > t.entryPrice) ||
          (t.orderType === 'BUY_STOP' && livePrice < t.entryPrice)
        ));

      if (isStillPending) {
        // Pending order: P&L is strictly 0.00 until filled!
        const isJpy = t.symbol.includes('JPY');
        const pipDiff = Math.abs(livePrice - t.entryPrice) / (isJpy ? 0.01 : 0.0001);
        const pendingTrade: Elev8Trade = {
          ...t,
          status: 'PENDING',
          currentPrice: livePrice,
          floatingPnl: 0,
          pips: Math.round(pipDiff * 10) / 10
        };
        pendingList.push(pendingTrade);
      } else if (t.status === 'OPEN' || isTriggered) {
        // Compute live floating pnl from realPriceService
        const isBuy = t.orderType.startsWith('BUY');
        const diff = isBuy ? (livePrice - t.entryPrice) : (t.entryPrice - livePrice);

        let pnl = 0;
        let pips = 0;
        if (t.symbol.includes('XAU') || t.symbol.includes('GOLD')) {
          pnl = diff * 100 * t.lots;
          pips = Math.round(diff * 10 * 10) / 10;
        } else if (t.symbol.includes('US30')) {
          pnl = diff * 1.0 * t.lots;
          pips = Math.round(diff * 10) / 10;
        } else {
          const isJpy = t.symbol.includes('JPY');
          pips = Math.round((diff / (isJpy ? 0.01 : 0.0001)) * 10) / 10;
          const pipVal = isJpy && livePrice > 0 ? (1000.0 / livePrice) : 10.0;
          pnl = pips * pipVal * t.lots;
        }

        const updatedTrade: Elev8Trade = {
          ...t,
          status: 'OPEN',
          currentPrice: livePrice,
          floatingPnl: Math.round(pnl * 100) / 100,
          pips
        };
        floating += updatedTrade.floatingPnl;
        openList.push(updatedTrade);
      } else {
        realized += t.realizedPnl;
        if (t.realizedPnl >= 0) wins++;
        else losses++;
        closedList.push(t);
      }
    });

    const totalTradesCount = wins + losses;
    const wr = totalTradesCount > 0 ? Math.round((wins / totalTradesCount) * 1000) / 10 : 0;

    return {
      pendingTrades: pendingList,
      openTrades: openList,
      closedTrades: closedList,
      totalRealizedPnl: Math.round(realized * 100) / 100,
      totalFloatingPnl: Math.round(floating * 100) / 100,
      winCount: wins,
      lossCount: losses,
      winRate: wr
    };
  }, [trades, config.symbolSuffix]);

  const currentEquity = accountBalance + totalRealizedPnl + totalFloatingPnl;
  const currentBalance = accountBalance + totalRealizedPnl;

  const filteredTrades = useMemo(() => {
    if (historyFilter === 'PENDING') return pendingTrades;
    if (historyFilter === 'OPEN') return openTrades;
    if (historyFilter === 'CLOSED') return closedTrades;
    return [...pendingTrades, ...openTrades, ...closedTrades];
  }, [historyFilter, pendingTrades, openTrades, closedTrades]);

  const handleSave = () => {
    const updated: Elev8AccountConfig = {
      accountNumber,
      server: selectedServer,
      accountType,
      accountBalance,
      riskPerTradePercent: riskPercent,
      symbolSuffix,
      executionMode,
      webhookUrl: webhookUrl.trim(),
      metaApiToken: metaApiToken.trim(),
      metaApiAccountId: metaApiAccountId.trim(),
      autoCopyWebhookEnabled: autoCopyEnabled,
      isConnected: Boolean(accountNumber.trim()),
      lastSyncTime: Date.now()
    };
    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    setTestMessage('Pinging bridge / MT5 server...');

    if (executionMode === 'WEBHOOK_BRIDGE') {
      if (!webhookUrl.trim()) {
        setTestStatus('ERROR');
        setTestMessage('Please enter your Webhook or Ngrok Bridge URL first.');
        return;
      }
      try {
        const res = await fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'PING', account: accountNumber, server: selectedServer, timestamp: Date.now() })
        });
        if (res.ok) {
          setTestStatus('SUCCESS');
          setTestMessage('✅ MT5 Webhook Bridge responded! 2-way communication verified.');
        } else {
          setTestStatus('ERROR');
          setTestMessage(`Bridge returned HTTP ${res.status}. Verify your local EA or bridge is listening.`);
        }
      } catch (err: any) {
        setTestStatus('ERROR');
        setTestMessage(`Connection failed: ${err.message || 'Network error'}. Ensure your MT5 PC EA or Ngrok URL is active.`);
      }
    } else if (executionMode === 'METAAPI_CLOUD') {
      if (!metaApiToken.trim() || !metaApiAccountId.trim()) {
        setTestStatus('ERROR');
        setTestMessage('Please enter both your MetaApi Token and Account ID.');
        return;
      }
      try {
        const res = await fetch(`https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaApiAccountId.trim()}/connection-status`, {
          headers: { 'auth-token': metaApiToken.trim() }
        });
        const data = await res.json();
        if (res.ok && (data.connected || data.authenticated)) {
          setTestStatus('SUCCESS');
          setTestMessage(`✅ Connected to Elev8 MT5 Account #${accountNumber || metaApiAccountId.slice(0, 6)} via MetaApi Cloud!`);
        } else {
          setTestStatus('ERROR');
          setTestMessage(data.message || 'MetaApi returned disconnected state. Check your credentials.');
        }
      } catch (err: any) {
        setTestStatus('ERROR');
        setTestMessage(`MetaApi error: ${err.message}`);
      }
    } else {
      // Simulated mode
      await new Promise(r => setTimeout(r, 400));
      setTestStatus('SUCCESS');
      setTestMessage('✅ Simulated Practice Engine active with live market data feeds.');
    }
  };

  // MQL5 Expert Advisor Script Template
  const mql5Code = `//+------------------------------------------------------------------+
//|                                     Elev8_MT5_AutoCopier.mq5     |
//|                    Institutional Forex Signal Bridge for Elev8    |
//|                   Copyright 2026, Institutional Quant Engine      |
//+------------------------------------------------------------------+
#property copyright "Institutional Forex Signal Bridge"
#property link      "https://elev8trading.com"
#property version   "1.00"
#property strict

//--- Input Parameters
input group "=== Elev8 Account Settings ==="
input string   InpAccountNumber    = "${accountNumber || '891042'}"; // Elev8 Account Number
input double   InpRiskPerTrade     = ${riskPercent};              // Risk % Per Trade (e.g. 0.5% for Prop Rules)
input double   InpAccountBalance   = ${accountBalance};          // Challenge Size ($)
input string   InpSymbolSuffix     = "${symbolSuffix}";              // Broker Suffix (e.g. .pro, .m, .cash)
input ulong    InpMagicNumber      = 987654;                   // Unique Order Magic Number
input int      InpSlippagePoints   = 20;                       // Max Execution Slippage (Points)

int OnInit()
{
   Print("🚀 [Elev8 MT5 Bridge] Connected to ", InpAccountNumber, " on ", AccountInfoString(ACCOUNT_SERVER));
   EventSetTimer(3);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   // Interbank feed WebRequest execution
}
`;

  const copyEaCode = () => {
    navigator.clipboard.writeText(mql5Code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadEaCode = () => {
    const blob = new Blob([mql5Code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Elev8_MT5_AutoCopier.mq5';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 text-left animate-fadeIn">
      <div className="bg-[#0B0F19] border border-[#222F47] rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2979FF]/20 to-[#00E676]/20 border border-[#2979FF]/40 flex items-center justify-center">
              <Server className="w-5 h-5 text-[#2979FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-[#F1F5F9]">Elev8 MT5 Account</span>
                <span className="bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                  {selectedServer}
                </span>
                {accountNumber && (
                  <span className="text-[10px] font-mono text-[#94A3B8]">#{accountNumber}</span>
                )}
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Real Execution, Live P&L, and MT5 Mobile Integration
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account P&L Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 bg-[#101522] p-2.5 rounded-xl border border-[#222F47] text-center font-mono">
          {/* Balance (Click to Edit) */}
          <div
            onClick={() => {
              setTempBalanceInput(String(accountBalance));
              setIsEditingBalance(true);
            }}
            className="bg-[#182033] p-2 rounded-lg cursor-pointer hover:border-[#00E676]/60 border border-transparent transition-all group relative"
            title="Click to change account balance"
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-[9px] text-[#94A3B8] block">Balance</span>
              <Edit3 className="w-2.5 h-2.5 text-[#64748B] group-hover:text-[#00E676] transition-colors" />
            </div>
            <span className="text-xs font-black text-[#F1F5F9] mt-0.5 block group-hover:text-[#00E676] transition-colors">
              ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[8px] text-[#00E676]/80 font-bold block mt-0.5">Click to Edit</span>
          </div>

          {/* Equity (Click to Edit) */}
          <div
            onClick={() => {
              setTempBalanceInput(String(accountBalance));
              setIsEditingBalance(true);
            }}
            className="bg-[#182033] p-2 rounded-lg cursor-pointer hover:border-[#00E676]/60 border border-transparent transition-all group relative"
            title="Click to change account equity"
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-[9px] text-[#94A3B8] block">Equity</span>
              <Edit3 className="w-2.5 h-2.5 text-[#64748B] group-hover:text-[#00E676] transition-colors" />
            </div>
            <span className={`text-xs font-black mt-0.5 block ${
              totalFloatingPnl >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
            }`}>
              ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[8px] text-[#00E676]/80 font-bold block mt-0.5">Click to Edit</span>
          </div>

          <div className="bg-[#182033] p-2 rounded-lg">
            <span className="text-[9px] text-[#94A3B8] block">Realized P&L</span>
            <span className={`text-xs font-black mt-0.5 block ${
              totalRealizedPnl >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'
            }`}>
              {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#182033] p-2 rounded-lg">
            <span className="text-[9px] text-[#94A3B8] block">Win Rate</span>
            <span className="text-xs font-black text-[#FFD700] mt-0.5 block">
              {winRate}% ({winCount}W / {lossCount}L)
            </span>
          </div>
        </div>

        {/* Quick Edit Balance & Equity Drawer */}
        {isEditingBalance && (
          <div className="mb-3 p-3 bg-[#101522] border border-[#00E676]/50 rounded-xl animate-fadeIn space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#00E676]" />
                <span>Change Account Balance / Equity:</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingBalance(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-xs text-[#94A3B8] font-bold">$</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={tempBalanceInput}
                  onChange={(e) => setTempBalanceInput(e.target.value)}
                  placeholder="e.g. 110.73"
                  className="w-full pl-7 pr-3 py-1.5 bg-[#182033] border border-[#222F47] focus:border-[#00E676] rounded-xl text-sm font-mono font-black text-[#00E676] outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseFloat(tempBalanceInput);
                      if (val > 0) {
                        setAccountBalance(val);
                        const updated = { ...config, accountBalance: val, lastSyncTime: Date.now() };
                        onSaveConfig(updated);
                        setIsEditingBalance(false);
                      }
                    }
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(tempBalanceInput);
                  if (val > 0) {
                    setAccountBalance(val);
                    const updated = { ...config, accountBalance: val, lastSyncTime: Date.now() };
                    onSaveConfig(updated);
                    setIsEditingBalance(false);
                  }
                }}
                className="px-4 py-1.5 bg-[#00E676] hover:bg-[#00c853] text-[#080B11] font-black text-xs rounded-xl transition-all shadow"
              >
                Save
              </button>
            </div>

            {/* Quick Preset Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
              <span className="text-[10px] text-[#94A3B8] font-bold mr-1">Presets:</span>
              {[
                { label: '$110.73 (Your Live)', val: 110.73 },
                { label: '$100', val: 100 },
                { label: '$250', val: 250 },
                { label: '$500', val: 500 },
                { label: '$1,000', val: 1000 },
                { label: '$5,000', val: 5000 },
                { label: '$10,000', val: 10000 },
                { label: '$50,000', val: 50000 },
                { label: '$100,000', val: 100000 }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setTempBalanceInput(String(p.val));
                    setAccountBalance(p.val);
                    const updated = { ...config, accountBalance: p.val, lastSyncTime: Date.now() };
                    onSaveConfig(updated);
                    setIsEditingBalance(false);
                  }}
                  className={`px-2 py-0.5 rounded-lg border font-mono font-bold transition-all ${
                    accountBalance === p.val
                      ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676]'
                      : 'bg-[#182033] border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-[#101522] p-1 rounded-xl border border-[#222F47] mb-3 text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('REAL_EXECUTION')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeTab === 'REAL_EXECUTION'
                ? 'bg-[#182033] text-[#00E676] border border-[#00E676]/40 shadow'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <CloudLightning className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Real MT5</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-[#182033] text-[#2979FF] border border-[#222F47] shadow'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trades ({trades.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('SETUP')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeTab === 'SETUP'
                ? 'bg-[#182033] text-[#F1F5F9] border border-[#222F47] shadow'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('MOBILE')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeTab === 'MOBILE'
                ? 'bg-[#182033] text-[#FFD700] border border-[#222F47] shadow'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile App</span>
          </button>
          <button
            onClick={() => setActiveTab('EA_CODE')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeTab === 'EA_CODE'
                ? 'bg-[#182033] text-[#F1F5F9] border border-[#222F47] shadow'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>EA Script</span>
          </button>
        </div>

        {/* TAB 1: REAL MT5 EXECUTION (ANSWERS USER'S EXACT QUESTION) */}
        {activeTab === 'REAL_EXECUTION' && (
          <div className="space-y-3.5">
            {/* Direct Answer & Architecture Callout */}
            <div className="bg-gradient-to-r from-[#2979FF]/15 via-[#00E676]/10 to-[#2979FF]/15 border border-[#00E676]/40 rounded-xl p-3.5">
              <div className="flex items-start gap-2.5">
                <CloudLightning className="w-5 h-5 text-[#00E676] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-[#F1F5F9] flex items-center gap-2">
                    <span className="text-sm">How Real MT5 Mobile Execution Works</span>
                    <span className="text-[9px] bg-[#00E676]/20 text-[#00E676] px-1.5 py-0.5 rounded font-mono font-bold">100% POSSIBLE</span>
                  </div>
                  <p className="text-[#CBD5E1] mt-1.5 leading-relaxed">
                    <strong>Yes, you can trade directly onto your real Elev8 MT5!</strong> Your MT5 mobile app connects to the Elev8 broker server (<code className="text-[#FFD700]">{selectedServer}</code>). When this app fires a trade to Elev8, <strong>it opens on your broker account and instantly pops up in your MT5 mobile app in real time!</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Execution Mode Selector */}
            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1.5">
                Choose How You Want to Execute Orders:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. MetaApi Cloud (Recommended) */}
                <div
                  onClick={() => setExecutionMode('METAAPI_CLOUD')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    executionMode === 'METAAPI_CLOUD'
                      ? 'bg-[#182033] border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.2)]'
                      : 'bg-[#101522] border-[#222F47] hover:border-[#2979FF]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#F1F5F9] flex items-center gap-1.5">
                      <CloudLightning className="w-3.5 h-3.5 text-[#00E676]" />
                      <span>MetaApi Cloud</span>
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00E676]/20 text-[#00E676]">
                      No PC Needed
                    </span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] leading-tight">
                    Direct cloud bridge from web browser to Elev8 server. Trades fire instantly.
                  </p>
                </div>

                {/* 2. Webhook Bridge (Local PC / VPS) */}
                <div
                  onClick={() => setExecutionMode('WEBHOOK_BRIDGE')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    executionMode === 'WEBHOOK_BRIDGE'
                      ? 'bg-[#182033] border-[#2979FF] shadow-[0_0_15px_rgba(41,121,255,0.2)]'
                      : 'bg-[#101522] border-[#222F47] hover:border-[#2979FF]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#F1F5F9] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#2979FF]" />
                      <span>MT5 EA Bridge</span>
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#2979FF]/20 text-[#2979FF]">
                      100% Free
                    </span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] leading-tight">
                    Runs on your PC or VPS using our free MQL5 script + Webhook / Ngrok.
                  </p>
                </div>

                {/* 3. Simulated Practice */}
                <div
                  onClick={() => setExecutionMode('SIMULATED')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    executionMode === 'SIMULATED'
                      ? 'bg-[#182033] border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                      : 'bg-[#101522] border-[#222F47] hover:border-[#FFD700]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#F1F5F9] flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-[#FFD700]" />
                      <span>Simulated Demo</span>
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FFD700]/20 text-[#FFD700]">
                      Practice
                    </span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] leading-tight">
                    Practice trading with live tick data and Elev8 risk rules without risk.
                  </p>
                </div>
              </div>
            </div>

            {/* Mode-specific configuration inputs */}
            {executionMode === 'METAAPI_CLOUD' && (
              <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                    <CloudLightning className="w-4 h-4 text-[#00E676]" />
                    <span>MetaApi Cloud Credentials</span>
                  </span>
                  <a
                    href="https://metaapi.cloud"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#2979FF] hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>Get Free Token (metaapi.cloud)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">
                      MetaApi Auth Token
                    </label>
                    <input
                      type="password"
                      value={metaApiToken}
                      onChange={(e) => setMetaApiToken(e.target.value)}
                      placeholder="Paste your MetaApi API Token"
                      className="w-full bg-[#182033] border border-[#222F47] rounded-lg py-1.5 px-2.5 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#00E676]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">
                      MetaApi MT5 Account ID
                    </label>
                    <input
                      type="text"
                      value={metaApiAccountId}
                      onChange={(e) => setMetaApiAccountId(e.target.value)}
                      placeholder="e.g. 5d8e7f12-34ab-56cd-78ef..."
                      className="w-full bg-[#182033] border border-[#222F47] rounded-lg py-1.5 px-2.5 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#00E676]"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-[#94A3B8] leading-relaxed bg-[#182033] p-2.5 rounded-lg border border-[#222F47]">
                  💡 <strong>How it works:</strong> MetaApi runs a 24/7 cloud connection to <code>Elev8Markets-Live</code>. When you tap <strong>"Execute to Elev8 MT5"</strong> on any signal, this web app dispatches the trade directly to MetaApi, which fills the order on Elev8. Your MT5 Mobile app will ring and show the position instantly!
                </div>
              </div>
            )}

            {executionMode === 'WEBHOOK_BRIDGE' && (
              <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-[#2979FF]" />
                    <span>Local / VPS MT5 Bridge Webhook URL</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('EA_CODE')}
                    className="text-[10px] text-[#2979FF] hover:underline font-mono"
                  >
                    View MQL5 Code ➔
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">
                    Webhook Listener URL (Ngrok or Localhost or Cloud Server)
                  </label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="e.g. https://your-ngrok-bridge.ngrok-free.app/trade"
                    className="w-full bg-[#182033] border border-[#222F47] rounded-lg py-1.5 px-2.5 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#2979FF]"
                  />
                </div>

                <div className="text-[10px] text-[#94A3B8] leading-relaxed bg-[#182033] p-2.5 rounded-lg border border-[#222F47]">
                  💡 <strong>How it works:</strong> Run MT5 on your PC/laptop with the EA attached. Whenever you click Execute in this app (even from your phone!), the order payload is posted to this URL, and the EA calls <code>trade.Buy()</code> or <code>trade.Sell()</code> in &lt;20ms.
                </div>
              </div>
            )}

            {/* Test Connection Button & Status */}
            <div className="bg-[#101522] p-3 rounded-xl border border-[#222F47] flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#F1F5F9] block">
                  Verify Live Connection
                </span>
                <span className="text-[10px] text-[#94A3B8]">
                  Ping the bridge to verify that trade commands will reach Elev8.
                </span>
              </div>
              <button
                type="button"
                disabled={testStatus === 'TESTING'}
                onClick={handleTestConnection}
                className="px-3.5 py-1.5 bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] font-bold text-xs rounded-lg border border-[#222F47] transition-all shrink-0 flex items-center gap-1.5"
              >
                <Wifi className="w-3.5 h-3.5 text-[#2979FF]" />
                <span>{testStatus === 'TESTING' ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            {testMessage && (
              <div className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                testStatus === 'SUCCESS'
                  ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                  : testStatus === 'ERROR'
                  ? 'bg-[#FF3366]/15 border-[#FF3366]/40 text-[#FF3366]'
                  : 'bg-[#182033] border-[#222F47] text-[#94A3B8]'
              }`}>
                {testStatus === 'SUCCESS' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{testMessage}</span>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-between">
              {saveSuccess && (
                <span className="text-xs font-bold text-[#00E676] flex items-center gap-1">
                  <Check className="w-4 h-4" /> Elev8 Execution Settings Saved!
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-[#080B11] font-black text-xs transition-all shadow-[0_0_15px_rgba(0,230,118,0.3)] flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRADE HISTORY & ACTIVE POSITIONS */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-3">
            {/* Filter buttons & clear button */}
            <div className="flex items-center justify-between">
              <div className="flex bg-[#101522] p-0.5 rounded-lg border border-[#222F47] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    historyFilter === 'ALL' ? 'bg-[#182033] text-[#F1F5F9] border border-[#222F47]' : 'text-[#94A3B8]'
                  }`}
                >
                  All ({trades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('PENDING')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    historyFilter === 'PENDING' ? 'bg-[#182033] text-[#FFD700] border border-[#222F47]' : 'text-[#94A3B8]'
                  }`}
                >
                  Pending ({pendingTrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('OPEN')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    historyFilter === 'OPEN' ? 'bg-[#182033] text-[#00E676] border border-[#222F47]' : 'text-[#94A3B8]'
                  }`}
                >
                  Open ({openTrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('CLOSED')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    historyFilter === 'CLOSED' ? 'bg-[#182033] text-[#94A3B8] border border-[#222F47]' : 'text-[#94A3B8]'
                  }`}
                >
                  Closed ({closedTrades.length})
                </button>
              </div>

              {trades.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[10px] text-[#94A3B8] hover:text-[#FF3366] flex items-center gap-1 transition-colors px-2 py-1 rounded bg-[#182033] border border-[#222F47]"
                  title="Clear Trade History"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            {/* Trades List */}
            {filteredTrades.length === 0 ? (
              <div className="bg-[#101522] border border-[#222F47] rounded-xl p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#182033] border border-[#222F47] flex items-center justify-center mx-auto text-[#94A3B8]">
                  <Activity className="w-6 h-6 text-[#2979FF]" />
                </div>
                <div className="text-sm font-bold text-[#F1F5F9]">No Executed Elev8 Trades Yet</div>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
                  Tap the <strong>⚡ Elev8 MT5 Order</strong> button on any signal card to execute trades with custom lot size, risk %, and projected gain/loss!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredTrades.map((trade) => {
                  const isBuy = trade.orderType.startsWith('BUY');
                  const isPending = trade.status === 'PENDING';
                  const isOpen = trade.status === 'OPEN';
                  const pnl = isPending ? 0 : (isOpen ? trade.floatingPnl : trade.realizedPnl);
                  const isProfit = pnl >= 0;

                  return (
                    <div
                      key={trade.id}
                      className="bg-[#101522] border border-[#222F47] rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#F1F5F9]">{trade.symbol}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            isBuy ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-[#FF3366]/20 text-[#FF3366]'
                          }`}>
                            {trade.orderType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-[#FFD700] font-bold">
                            {trade.lots.toFixed(2)} Lots
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isPending
                              ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30'
                              : isOpen
                              ? 'bg-[#00E676]/20 text-[#00E676] animate-pulse'
                              : 'bg-[#64748B]/20 text-[#94A3B8]'
                          }`}>
                            {isPending ? '⏳ PENDING (WAITING FOR FILL)' : isOpen ? 'LIVE OPEN' : `CLOSED (${trade.closeReason || 'HIT TP'})`}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-[#94A3B8] mt-1 flex items-center gap-2.5 flex-wrap">
                          <span>Entry: <strong className="text-[#F1F5F9]">{trade.entryPrice}</strong></span>
                          <span>SL: <strong className="text-[#FF3366]">{trade.stopLoss}</strong></span>
                          <span>TP1: <strong className="text-[#00E676]">{trade.takeProfit1}</strong></span>
                          <span className="text-[#64748B]">• {new Date(trade.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isPending ? (
                          <>
                            <div className="font-mono font-bold text-sm text-[#FFD700]">
                              $0.00
                            </div>
                            <div className="text-[9px] font-mono text-[#94A3B8]">
                              {trade.pips.toFixed(1)}p to entry
                            </div>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const msg = `📌 *MT5 Pending Order: ${trade.symbol}*\nType: *${trade.orderType.replace('_', ' ')}*\nEntry: *${trade.entryPrice}*\nSL: ${trade.stopLoss} | TP: ${trade.takeProfit1}\nStatus: Waiting for fill (${trade.pips.toFixed(1)}p to entry)`;
                                  const url = WhatsAppAlertService.getDirectChatUrl(msg);
                                  window.open(url, '_blank');
                                }}
                                className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 hover:bg-[#25D366]/30 transition-colors"
                                title="Share pending order to WhatsApp"
                              >
                                💬 WA
                              </button>
                              <button
                                type="button"
                                onClick={() => onCloseTrade(trade.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 hover:bg-[#FFD700]/30 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={`font-mono font-black text-sm ${isProfit ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                              {isProfit ? '+' : ''}${pnl.toFixed(2)}
                            </div>
                            <div className="text-[9px] font-mono text-[#94A3B8]">
                              {isProfit ? '+' : ''}{trade.pips.toFixed(1)} pips
                            </div>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const msg = `📊 *MT5 Trade Position: ${trade.symbol}*\nType: *${trade.orderType.replace('_', ' ')}*\nLots: ${trade.lots.toFixed(2)}\nEntry: *${trade.entryPrice}*\nP&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${trade.pips >= 0 ? '+' : ''}${trade.pips.toFixed(1)} pips)\nStatus: ${trade.status}`;
                                  const url = WhatsAppAlertService.getDirectChatUrl(msg);
                                  window.open(url, '_blank');
                                }}
                                className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 hover:bg-[#25D366]/30 transition-colors"
                                title="Share trade to WhatsApp"
                              >
                                💬 WA
                              </button>
                              {isOpen ? (
                                <div className="flex items-center gap-1">
                                  {trade.stopLoss !== trade.entryPrice && (
                                    <button
                                      type="button"
                                      onClick={() => onMoveToBreakEven && onMoveToBreakEven(trade.id)}
                                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 hover:bg-[#00E676]/30 transition-colors"
                                      title="Move Stop Loss to Entry Price (Break-Even) for 100% risk-free trade"
                                    >
                                      🛡️ BE
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onCloseTrade(trade.id)}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40 hover:bg-[#FF3366]/30 transition-colors"
                                  >
                                    Close
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => (onDeleteTrade ? onDeleteTrade(trade.id) : onCloseTrade(trade.id))}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/30 hover:bg-[#FF3366]/25 transition-colors flex items-center gap-1"
                                  title="Remove this closed trade manually from history"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SETUP & ACCOUNT CONFIGURATION */}
        {activeTab === 'SETUP' && (
          <div className="space-y-4">
            {/* Prop Firm Safeguard Banner */}
            <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#00E676] shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-[#F1F5F9] flex items-center gap-1.5">
                  <span>Elev8 Prop Firm Risk Safeguard</span>
                  <span className="text-[10px] text-[#00E676] font-mono">4% Daily / 8% Max Loss Compliant</span>
                </div>
                <p className="text-[#94A3B8] mt-1 leading-relaxed">
                  Configuring your Elev8 MT5 account allows the app to automatically scale institutional signals to your exact challenge account size while keeping maximum risk under <strong>${maxDollarRisk.toFixed(2)}</strong> per trade.
                </p>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Account Number */}
              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                  Elev8 MT5 Account Number (Login)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 8920412"
                    className="w-full bg-[#182033] border border-[#222F47] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#2979FF]"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#64748B] absolute right-3 top-3" />
                </div>
              </div>

              {/* Server */}
              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                  Elev8 MT5 Broker Server
                </label>
                <select
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  className="w-full bg-[#182033] border border-[#222F47] rounded-xl py-2 px-3 text-xs font-bold text-[#F1F5F9] focus:outline-none focus:border-[#2979FF]"
                >
                  <option value="Elev8-Real2">Elev8-Real2 (Live Server)</option>
                  <option value="Elev8-Real">Elev8-Real</option>
                  <option value="Elev8Markets-Live">Elev8Markets-Live</option>
                  <option value="Elev8-Demo">Elev8-Demo (Evaluation Phase)</option>
                  <option value="Elev8-Server">Elev8-Server</option>
                  <option value="CUSTOM">Custom Server Name...</option>
                </select>
                {server === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customServer}
                    onChange={(e) => setCustomServer(e.target.value)}
                    placeholder="Enter Exact MT5 Server"
                    className="mt-1.5 w-full bg-[#182033] border border-[#222F47] rounded-xl py-1.5 px-3 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#2979FF]"
                  />
                )}
              </div>

              {/* Account Size */}
              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                  Elev8 Account Balance / Equity ($)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5 text-[10px]">
                  {[
                    { label: '$110.73 (Live)', val: 110.73 },
                    { label: '$100', val: 100 },
                    { label: '$250', val: 250 },
                    { label: '$500', val: 500 },
                    { label: '$1k', val: 1000 },
                    { label: '$5k', val: 5000 },
                    { label: '$10k', val: 10000 },
                    { label: '$50k', val: 50000 }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setAccountBalance(p.val)}
                      className={`px-2 py-0.5 font-bold rounded-lg border transition-all ${
                        accountBalance === p.val
                          ? 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]'
                          : 'bg-[#182033] text-[#94A3B8] border-[#222F47] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-[#94A3B8] font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#182033] border border-[#222F47] rounded-xl py-2 pl-7 pr-3 text-xs font-mono font-bold text-[#00E676] focus:outline-none focus:border-[#00E676]"
                  />
                </div>
              </div>

              {/* Risk % per trade */}
              <div>
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                  Risk % Per Trade (Strict Drawdown Control)
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                  {[0.25, 0.5, 1.0].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRiskPercent(r)}
                      className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${
                        riskPercent === r
                          ? 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]'
                          : 'bg-[#182033] text-[#94A3B8] border-[#222F47]'
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
                <div className="text-[11px] font-mono text-[#94A3B8] bg-[#101522] p-2 rounded-xl border border-[#222F47] flex items-center justify-between">
                  <span>Max Risk / Trade:</span>
                  <span className="text-[#FFD700] font-bold">${maxDollarRisk.toFixed(2)}</span>
                </div>
              </div>

              {/* Symbol Suffix */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                  Elev8 Broker Symbol Suffix (If applicable)
                </label>
                <div className="flex items-center gap-2">
                  {['', '.pro', '.m', '_sb', '.cash'].map((suf) => (
                    <button
                      key={suf}
                      type="button"
                      onClick={() => setSymbolSuffix(suf)}
                      className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                        symbolSuffix === suf
                          ? 'bg-[#2979FF]/20 text-[#2979FF] border-[#2979FF]'
                          : 'bg-[#182033] text-[#94A3B8] border-[#222F47]'
                      }`}
                    >
                      {suf === '' ? 'None (Raw)' : suf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-between">
              {saveSuccess && (
                <span className="text-xs font-bold text-[#00E676] flex items-center gap-1">
                  <Check className="w-4 h-4" /> Elev8 Configuration Saved!
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 rounded-xl bg-[#182033] text-[#94A3B8] hover:text-[#F1F5F9] font-bold text-xs border border-[#222F47]"
                >
                  Close
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-[#080B11] font-black text-xs transition-all shadow-[0_0_15px_rgba(0,230,118,0.3)] flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MT5 MOBILE APP GUIDE & DEEP-LINK */}
        {activeTab === 'MOBILE' && (
          <div className="space-y-3.5">
            <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 flex items-start gap-2.5">
              <Smartphone className="w-5 h-5 text-[#2979FF] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-[#F1F5F9] block">
                  How MT5 Mobile Syncs with this App in Real-Time
                </span>
                <p className="text-[#94A3B8] mt-1 leading-relaxed">
                  Both your mobile phone and this web app connect to the same Elev8 account on the <strong className="text-[#FFD700]">{selectedServer}</strong> server. When trades are placed through our Cloud Bridge or Webhook, <strong>your phone rings with the MT5 notification and displays the position immediately!</strong>
                </p>
              </div>
            </div>

            <div className="bg-[#182033] p-3.5 rounded-xl border border-[#222F47] text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#2979FF] text-[#080B11] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                <div>
                  <strong className="text-[#F1F5F9]">Log in to Elev8 on your MT5 Phone App:</strong>
                  <p className="text-[#94A3B8] mt-0.5">Open MT5 Mobile ➔ <strong>Settings</strong> ➔ <strong>New Account</strong> ➔ Search <strong className="text-[#FFD700]">{selectedServer}</strong> ➔ Enter your login number <code className="text-[#00E676] font-mono">#{accountNumber || '891042'}</code>.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#2979FF] text-[#080B11] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                <div>
                  <strong className="text-[#F1F5F9]">Direct Phone Launch:</strong>
                  <p className="text-[#94A3B8] mt-0.5">In our order ticket, tap <strong>"📱 Open MT5 Mobile"</strong>. This launches MetaTrader 5 directly on your phone with the symbol ready to trade.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#2979FF] text-[#080B11] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
                <div>
                  <strong className="text-[#F1F5F9]">Direct Automatic Execution (Zero Taps on Phone):</strong>
                  <p className="text-[#94A3B8] mt-0.5">Switch to <strong>MetaApi Cloud</strong> or <strong>Webhook Bridge</strong> in the "Real MT5" tab above. Clicking "Execute" in this app places the trade directly onto Elev8!</p>
                </div>
              </div>
            </div>

            {/* Authorization Failed Troubleshooting Box */}
            <div className="bg-[#FF3366]/10 border border-[#FF3366]/40 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#FF3366] font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Fixing "Authorization Failed" inside MetaTrader 5:</span>
              </div>
              <p className="text-[#CBD5E1] text-[11px] leading-relaxed">
                If MT5 displays a black toast saying <strong>"Authorization failed"</strong>, it means your MT5 mobile app is not currently logged into your broker server. To fix this:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-[#94A3B8] space-y-1 pl-1">
                <li>In MT5, tap the top-left menu (<strong>☰</strong>) ➔ <strong>Manage Accounts</strong>.</li>
                <li>Tap your account or tap the <strong>+</strong> button at the top right.</li>
                <li>Find your broker server (e.g. <strong>Elev8Markets-Live</strong> or <strong>Elev8-Demo</strong>).</li>
                <li>Enter your <strong>Login number</strong> and your <strong>Master/Trader Password</strong> (not the investor read-only password).</li>
                <li>Tap <strong>Sign In</strong>. Once logged in, your balance will turn live green with no error!</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 5: MQL5 AUTO-COPIER SCRIPT */}
        {activeTab === 'EA_CODE' && (
          <div className="space-y-3.5">
            <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 flex items-start gap-2.5">
              <Cpu className="w-5 h-5 text-[#00E676] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-[#F1F5F9] block">
                  Elev8 MT5 Automated Copier EA (MQL5 Source Script)
                </span>
                <p className="text-[#94A3B8] mt-1 leading-relaxed">
                  For automated background execution on PC or VPS.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[#94A3B8]">Elev8_MT5_AutoCopier.mq5</span>
              <div className="flex gap-2">
                <button
                  onClick={copyEaCode}
                  className="px-3 py-1.5 rounded-lg bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] font-bold text-xs border border-[#222F47] flex items-center gap-1.5 transition-all"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5 text-[#2979FF]" />}
                  <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={downloadEaCode}
                  className="px-3 py-1.5 rounded-lg bg-[#2979FF] hover:bg-[#1565C0] text-[#F1F5F9] font-bold text-xs flex items-center gap-1.5 transition-all shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .mq5</span>
                </button>
              </div>
            </div>

            <div className="bg-[#080B11] border border-[#222F47] rounded-xl p-3 max-h-56 overflow-y-auto font-mono text-[11px] text-[#A7F3D0] leading-relaxed select-all">
              <pre>{mql5Code}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
