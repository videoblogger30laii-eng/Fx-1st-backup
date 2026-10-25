import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertTriangle, ShieldCheck, Key, MessageSquare, RefreshCw, X } from 'lucide-react';
import { TelegramAlertConfig, ForexSignal } from '../types';
import { TelegramAlertService } from '../services/TelegramAlertService';

interface TelegramAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSignals?: ForexSignal[];
}

export const TelegramAlertModal: React.FC<TelegramAlertModalProps> = ({
  isOpen,
  onClose,
  activeSignals = []
}) => {
  const [config, setConfig] = useState<TelegramAlertConfig>(TelegramAlertService.getConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(TelegramAlertService.getConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    TelegramAlertService.saveConfig(config);
    setTestResult({ success: true, message: '✅ Telegram configuration saved successfully!' });
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      TelegramAlertService.saveConfig(config);
      const res = await TelegramAlertService.sendAlert(
        '🔔 *Test Alert from FX Signals Pro*\n\nYour Telegram bot connection is successfully configured and active!',
        config,
        true
      );
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: `❌ Test failed: ${err.message || 'Unknown network error'}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setTestResult(null);
    try {
      const detection = await TelegramAlertService.autoDetectChatId(config.botToken);
      if (detection.success && detection.chatId) {
        const foundChatId = detection.chatId;
        setConfig(prev => ({ ...prev, chatId: foundChatId }));
        TelegramAlertService.saveConfig({ ...config, chatId: foundChatId });
        setTestResult({ success: true, message: `✅ Successfully detected Chat ID: ${foundChatId}!` });
      } else {
        setTestResult({
          success: false,
          message: detection.message || '⚠️ No recent message found. Send /start or any message to your Telegram Bot first, then click Auto-Detect again.'
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `❌ Detection error: ${err.message}` });
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#0D1117] border border-[#222F47] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222F47] bg-[#101522]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0088cc]/20 border border-[#0088cc]/40 flex items-center justify-center text-[#38bdf8]">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#F1F5F9] tracking-wider uppercase">
                Telegram Bot Alerts
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Instant push notifications for live signals, TP/SL, and MT5 orders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#182033] hover:bg-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-left text-xs">
          
          {/* Status banner */}
          <div className="bg-[#182033]/80 border border-[#222F47] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F1F5F9] uppercase tracking-wide">
                Bot Connection Status
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#222F47] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#222F47] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0088cc]"></div>
                <span className="ml-2 font-bold text-xs text-[#F1F5F9]">
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              Receive real-time trade execution alerts and 1-tap copy triggers directly in your Telegram channel, group, or private chat.
            </p>
          </div>

          {/* Bot Token Input */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Telegram Bot Token</span>
            </label>
            <input
              type="text"
              value={config.botToken}
              onChange={e => setConfig({ ...config, botToken: e.target.value })}
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              className="w-full bg-[#161D2E] border border-[#222F47] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#38bdf8] font-mono text-xs"
            />
            <p className="text-[10px] text-[#94A3B8]">
              Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[#38bdf8] underline">@BotFather</a> on Telegram and paste the HTTP API token here.
            </p>
          </div>

          {/* Chat ID Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Telegram Chat ID / Channel ID</span>
              </label>
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={isDetecting || !config.botToken.trim()}
                className="text-[10.5px] font-bold text-[#38bdf8] hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isDetecting ? 'animate-spin' : ''}`} />
                <span>{isDetecting ? 'Detecting...' : 'Auto-Detect Chat ID'}</span>
              </button>
            </div>
            <input
              type="text"
              value={config.chatId}
              onChange={e => setConfig({ ...config, chatId: e.target.value })}
              placeholder="e.g. 987654321 or -1001234567890"
              className="w-full bg-[#161D2E] border border-[#222F47] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#38bdf8] font-mono text-xs"
            />
            <p className="text-[10px] text-[#94A3B8]">
              Your personal chat ID, group chat ID, or channel ID (with minus prefix). Send any message to your bot first, then click Auto-Detect.
            </p>
          </div>

          {/* Notification Triggers Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-[#222F47]">
            <span className="block font-bold text-[#F1F5F9] uppercase tracking-wider">
              Alert Trigger Events
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#161D2E] border border-[#222F47] cursor-pointer hover:border-[#38bdf8]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyOnNewSignal !== false}
                  onChange={e => setConfig({ ...config, notifyOnNewSignal: e.target.checked })}
                  className="rounded bg-[#0D1117] border-[#222F47] text-[#38bdf8] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-[#F1F5F9]">New Signals & Setups</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#161D2E] border border-[#222F47] cursor-pointer hover:border-[#38bdf8]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyOnPendingTrigger}
                  onChange={e => setConfig({ ...config, notifyOnPendingTrigger: e.target.checked })}
                  className="rounded bg-[#0D1117] border-[#222F47] text-[#38bdf8] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-[#F1F5F9]">Watchdog Triggers</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#161D2E] border border-[#222F47] cursor-pointer hover:border-[#38bdf8]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyOnTakeProfit}
                  onChange={e => setConfig({ ...config, notifyOnTakeProfit: e.target.checked })}
                  className="rounded bg-[#0D1117] border-[#222F47] text-[#38bdf8] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-[#F1F5F9]">Take Profit (TP Hits)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#161D2E] border border-[#222F47] cursor-pointer hover:border-[#38bdf8]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.notifyOnStopLoss}
                  onChange={e => setConfig({ ...config, notifyOnStopLoss: e.target.checked })}
                  className="rounded bg-[#0D1117] border-[#222F47] text-[#38bdf8] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-[#F1F5F9]">Stop Loss (SL Hits)</span>
              </label>
            </div>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${
              testResult.success
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#34d399]'
                : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#f87171]'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#222F47] bg-[#101522]">
          <button
            type="button"
            onClick={handleTestAlert}
            disabled={isTesting || !config.botToken.trim() || !config.chatId.trim()}
            className="px-4 py-2 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-[#38bdf8] font-bold text-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce' : ''}`} />
            <span>{isTesting ? 'Sending Test...' : 'Send Test Alert'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-[#94A3B8] font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b3] text-white font-black text-xs transition-colors cursor-pointer shadow-md shadow-[#0088cc]/20 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
