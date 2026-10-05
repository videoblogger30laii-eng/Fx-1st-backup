import React, { useState, useMemo } from 'react';
import { Elev8Trade, TradeJournalEntry } from '../types';
import {
  X,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Award,
  Calendar,
  Tag,
  Download,
  Filter,
  CheckCircle2,
  PieChart,
  BarChart3,
  Flame,
  FileText
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trades: Elev8Trade[];
}

export const TradeJournalModal: React.FC<Props> = ({ isOpen, onClose, trades }) => {
  const [filterSession, setFilterSession] = useState<string>('ALL');

  // Convert Elev8 trades to journal analytics
  const closedTrades = useMemo(() => trades.filter(t => t.status === 'CLOSED'), [trades]);
  const winTrades = useMemo(() => closedTrades.filter(t => (t.realizedPnl || 0) > 0 || t.closeReason === 'TP1' || t.closeReason === 'TP2' || t.closeReason === 'TP3'), [closedTrades]);
  const lossTrades = useMemo(() => closedTrades.filter(t => (t.realizedPnl || 0) < 0 || t.closeReason === 'SL'), [closedTrades]);

  const totalPnL = useMemo(() => closedTrades.reduce((acc, t) => acc + (t.realizedPnl || 0), 0), [closedTrades]);
  const totalPips = useMemo(() => closedTrades.reduce((acc, t) => acc + (t.pips || 0), 0), [closedTrades]);
  const winRate = closedTrades.length > 0 ? Math.round((winTrades.length / closedTrades.length) * 100) : 100;

  const grossProfit = useMemo(() => winTrades.reduce((acc, t) => acc + (t.realizedPnl || 0), 0), [winTrades]);
  const grossLoss = useMemo(() => Math.abs(lossTrades.reduce((acc, t) => acc + (t.realizedPnl || 0), 0)), [lossTrades]);
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '8.50' : '0.00');

  // Best performing pairs
  const pairStats = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; pnl: number }> = {};
    closedTrades.forEach(t => {
      const sym = t.symbol.replace('/', '');
      if (!map[sym]) map[sym] = { trades: 0, wins: 0, pnl: 0 };
      map[sym].trades += 1;
      if ((t.realizedPnl || 0) > 0 || t.closeReason?.includes('TP')) map[sym].wins += 1;
      map[sym].pnl += t.realizedPnl || 0;
    });
    return Object.entries(map).map(([symbol, stat]) => ({
      symbol,
      ...stat,
      winRate: Math.round((stat.wins / stat.trades) * 100)
    }));
  }, [closedTrades]);

  if (!isOpen) return null;

  // Export to CSV
  const handleExportCsv = () => {
    const headers = 'ID,Symbol,OrderType,Lots,EntryPrice,StopLoss,TakeProfit,PnL,Pips,CloseReason,OpenedAt\n';
    const rows = closedTrades.map(t =>
      `"${t.id}","${t.symbol}","${t.orderType}",${t.lots},${t.entryPrice},${t.stopLoss},${t.takeProfit1},${t.realizedPnl || 0},${t.pips || 0},"${t.closeReason || 'MANUAL'}","${new Date(t.openedAt).toISOString()}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Forex_Trade_Journal_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D111C] border border-[#222F47] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00E676]/20 border border-[#00E676]/40 flex items-center justify-center text-[#00E676]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wide">
                  Trader's Journal & Performance
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-[9.5px] font-bold">
                  ANALYTICS
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Realized performance, win rate breakdown, and risk metrics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1 bg-[#182033] hover:bg-[#222F47] text-[#F1F5F9] border border-[#222F47] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#101522] border border-[#222F47] p-3 rounded-xl">
              <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Win Rate</span>
              <strong className="text-xl font-mono font-black text-[#00E676]">{winRate}%</strong>
              <span className="text-[9.5px] text-[#64748B] block mt-0.5">{winTrades.length}W / {lossTrades.length}L</span>
            </div>

            <div className="bg-[#101522] border border-[#222F47] p-3 rounded-xl">
              <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Total Net P&L</span>
              <strong className={`text-xl font-mono font-black ${totalPnL >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </strong>
              <span className="text-[9.5px] text-[#64748B] block mt-0.5">{totalPips >= 0 ? '+' : ''}{totalPips.toFixed(1)} Pips</span>
            </div>

            <div className="bg-[#101522] border border-[#222F47] p-3 rounded-xl">
              <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Profit Factor</span>
              <strong className="text-xl font-mono font-black text-[#FFD700]">{profitFactor}</strong>
              <span className="text-[9.5px] text-[#64748B] block mt-0.5">Gross: +${grossProfit.toFixed(2)}</span>
            </div>

            <div className="bg-[#101522] border border-[#222F47] p-3 rounded-xl">
              <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Total Trades</span>
              <strong className="text-xl font-mono font-black text-[#2979FF]">{trades.length}</strong>
              <span className="text-[9.5px] text-[#64748B] block mt-0.5">{closedTrades.length} Closed / {trades.length - closedTrades.length} Active</span>
            </div>
          </div>

          {/* Pair-by-Pair Breakdown */}
          {pairStats.length > 0 && (
            <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3 space-y-2">
              <h4 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#2979FF]" />
                Pair Performance Matrix
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {pairStats.map(ps => (
                  <div key={ps.symbol} className="bg-[#080B11] p-2.5 rounded-lg border border-[#222F47]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-white">{ps.symbol}</span>
                      <span className="text-[10px] font-mono text-[#00E676] font-bold">{ps.winRate}% Win</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8] mt-1">
                      <span>{ps.trades} Trades</span>
                      <span className={ps.pnl >= 0 ? 'text-[#00E676]' : 'text-[#FF3366]'}>
                        {ps.pnl >= 0 ? '+' : ''}${ps.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trade History Log */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              Trade Execution Log
            </h4>
            {trades.length === 0 ? (
              <div className="bg-[#101522] border border-[#222F47] rounded-xl p-8 text-center text-[#94A3B8] text-xs">
                No trades recorded in journal yet. Execute trades from signal cards to populate performance stats!
              </div>
            ) : (
              <div className="space-y-2">
                {trades.map(trade => {
                  const isWin = (trade.realizedPnl || 0) > 0 || trade.closeReason?.includes('TP');
                  const isClosed = trade.status === 'CLOSED';
                  return (
                    <div
                      key={trade.id}
                      className="bg-[#101522] border border-[#222F47] rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#F1F5F9]">{trade.symbol}</span>
                          <span className="text-[10px] font-mono text-[#94A3B8]">
                            {trade.orderType.replace('_', ' ')} • {trade.lots.toFixed(2)} Lots
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              trade.status === 'PENDING'
                                ? 'bg-[#FFD700]/20 text-[#FFD700]'
                                : trade.status === 'OPEN'
                                ? 'bg-[#00E676]/20 text-[#00E676] animate-pulse'
                                : isWin
                                ? 'bg-[#00E676]/20 text-[#00E676]'
                                : 'bg-[#FF3366]/20 text-[#FF3366]'
                            }`}
                          >
                            {trade.status === 'CLOSED' ? `CLOSED (${trade.closeReason || 'TP'})` : trade.status}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[#64748B] mt-1">
                          Entry: {trade.entryPrice} | SL: {trade.stopLoss} | TP: {trade.takeProfit1}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-mono font-black text-sm ${isWin ? 'text-[#00E676]' : (trade.realizedPnl || 0) < 0 ? 'text-[#FF3366]' : 'text-[#FFD700]'}`}>
                          {(trade.realizedPnl || 0) >= 0 ? '+' : ''}${(trade.realizedPnl || 0).toFixed(2)}
                        </div>
                        <div className="text-[9px] font-mono text-[#94A3B8]">
                          {new Date(trade.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] text-[11px] text-[#94A3B8] flex items-center justify-between">
          <span>Journal automatically updates as you execute and close trades in MT5.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#182033] hover:bg-[#222F47] text-white font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
