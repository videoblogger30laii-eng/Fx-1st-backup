import React, { useState } from 'react';
import { WhatsAppAlertConfig, TelegramAlertConfig, ForexSignal } from '../types';
import { WhatsAppAlertService } from '../services/WhatsAppAlertService';
import { TelegramAlertService } from '../services/TelegramAlertService';
import {
  X,
  Check,
  Send,
  ExternalLink,
  Smartphone,
  AlertCircle,
  Bell,
  Sparkles,
  SendHorizontal
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeSignals?: ForexSignal[];
}

export const WhatsAppAlertModal: React.FC<Props> = ({ isOpen, onClose, activeSignals = [] }) => {
  const [activeTab, setActiveTab] = useState<'WHATSAPP' | 'TELEGRAM'>('TELEGRAM');
  const [config, setConfig] = useState<WhatsAppAlertConfig>(() => WhatsAppAlertService.getConfig());
  const [tgConfig, setTgConfig] = useState<TelegramAlertConfig>(() => {
    const cfg = TelegramAlertService.getConfig();
    return {
      ...cfg,
      notifyOnNewSignal: cfg.notifyOnNewSignal !== undefined ? cfg.notifyOnNewSignal : true,
      botToken: (cfg.botToken || '8750503064:AAHU1FA80-Hqvjwc010oUDI2pgkitH2bJRI').replace(/\s+/g, '')
    };
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'SUCCESS' | 'ERROR'; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isDetectingChatId, setIsDetectingChatId] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    WhatsAppAlertService.saveConfig(config);
    TelegramAlertService.saveConfig(tgConfig);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleBroadcastActiveSignals = async () => {
    if (!tgConfig.botToken || !tgConfig.chatId) {
      setTestResult({
        status: 'ERROR',
        message: 'Please tap "🔍 Auto-Detect ID" or enter your Telegram Chat ID first.'
      });
      return;
    }

    TelegramAlertService.saveConfig({ ...tgConfig, enabled: true, notifyOnNewSignal: true });
    setIsBroadcasting(true);
    setTestResult(null);

    const signalsToSend = activeSignals.slice(0, 5);
    if (signalsToSend.length === 0) {
      setIsBroadcasting(false);
      setTestResult({
        status: 'ERROR',
        message: 'No active signals in the current filter to broadcast.'
      });
      return;
    }

    let sentCount = 0;
    for (const sig of signalsToSend) {
      const res = await TelegramAlertService.sendNewSignalAlert(
        sig,
        sig.isBestTradeNow
          ? '🏆 *BEST TRADE NOW (ACTIVE VIP SIGNAL)*'
          : '📡 *ACTIVE TERMINAL TRADE SIGNAL*',
        true
      );
      if (res.success) sentCount++;
    }

    setIsBroadcasting(false);
    if (sentCount > 0) {
      setTestResult({
        status: 'SUCCESS',
        message: `✅ Sent ${sentCount} active trade signal${sentCount > 1 ? 's' : ''} directly to your Telegram!`
      });
    } else {
      setTestResult({
        status: 'ERROR',
        message: 'Failed to send signals. Ensure you tapped START in @my_fx_trade_bot.'
      });
    }
  };

  const handleAutoDetectChatId = async () => {
    setIsDetectingChatId(true);
    setTestResult(null);
    const res = await TelegramAlertService.autoDetectChatId(tgConfig.botToken);
    setIsDetectingChatId(false);

    if (res.success && res.chatId) {
      setTgConfig(prev => ({ ...prev, chatId: res.chatId!, enabled: true }));
      setTestResult({
        status: 'SUCCESS',
        message: `✅ Found your Chat ID: ${res.chatId}! Now tap "Test Telegram Alert" to verify.`
      });
    } else {
      setTestResult({
        status: 'ERROR',
        message: res.message
      });
    }
  };

  const handleTestWhatsAppAlert = async () => {
    if (!config.phoneNumber) {
      setTestResult({
        status: 'ERROR',
        message: 'Please enter your WhatsApp Phone Number with country code.'
      });
      return;
    }

    // Direct WhatsApp test opening
    const cleanPhone = config.phoneNumber.replace(/[^0-9]/g, '');
    const testMsg = `🔔 *Elev8 MT5 Alerts Test*\n\n✅ Your WhatsApp alerts are active!\nTime: ${new Date().toLocaleTimeString()}\nPair: USDJPY (Pending Watchdog Active)`;

    if (config.apiKey) {
      setIsTesting(true);
      setTestResult(null);
      const res = await WhatsAppAlertService.sendAutomatedAlert(testMsg, { ...config, enabled: true });
      setIsTesting(false);
      if (res.success) {
        setTestResult({
          status: 'SUCCESS',
          message: `Dispatched to +${cleanPhone}! If bot doesn't reply, tap the "Open in WhatsApp" button below.`
        });
        return;
      }
    }

    // Direct chat link test
    const url = WhatsAppAlertService.getDirectChatUrl(testMsg, cleanPhone);
    window.open(url, '_blank');
    setTestResult({
      status: 'SUCCESS',
      message: 'Opening your WhatsApp chat directly with the test alert!'
    });
  };

  const handleTestTelegramAlert = async () => {
    if (!tgConfig.botToken || !tgConfig.chatId) {
      setTestResult({
        status: 'ERROR',
        message: 'Please enter both Telegram Bot Token and Chat ID.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const testMsg = `🎯 *Elev8 MT5 Alert Test*\n\n✅ *Telegram Alerts Connected!*\nTime: \`${new Date().toLocaleTimeString()}\`\nStatus: *24/7 Order Watchdog Active*\n\nYou will receive instant alerts here whenever pending orders fill or become invalidated!`;

    const res = await TelegramAlertService.sendAlert(testMsg, { ...tgConfig, enabled: true });
    setIsTesting(false);

    if (res.success) {
      setTestResult({
        status: 'SUCCESS',
        message: '✅ Telegram test alert delivered to your phone!'
      });
    } else {
      setTestResult({
        status: 'ERROR',
        message: res.message
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 text-left animate-fadeIn">
      <div className="bg-[#0B0F19] border border-[#222F47] rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222F47] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
              <Bell className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-[#F1F5F9]">Mobile Trade Alerts</span>
                <span className="bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                  Instant Phone Alerts
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Instant notifications when your MT5 pending orders fill or become invalidated.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#182033] border border-[#222F47] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Tabs: WhatsApp vs Telegram */}
        <div className="grid grid-cols-2 gap-2 mb-3 bg-[#101522] p-1 rounded-xl border border-[#222F47]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('WHATSAPP');
              setTestResult(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'WHATSAPP'
                ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <span>💬 WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('TELEGRAM');
              setTestResult(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'TELEGRAM'
                ? 'bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/40'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <SendHorizontal className="w-3.5 h-3.5" />
            <span>Telegram Bot (100% Reliable)</span>
          </button>
        </div>

        {/* Tab 1: WhatsApp */}
        {activeTab === 'WHATSAPP' && (
          <div className="space-y-3 mb-4">
            {/* Direct "Message Yourself" Explanation */}
            <div className="bg-[#101522] border border-[#25D366]/40 rounded-xl p-3 text-xs space-y-2">
              <div className="font-black text-[#25D366] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Option A: Direct 1-Tap "Message Yourself" (Best & Zero Setup!)</span>
              </div>
              <p className="text-[#94A3B8] text-[11px] leading-relaxed">
                Save your phone number below. Whenever any alert triggers, tapping the green <strong>💬 WhatsApp</strong> button will immediately open your personal <strong>"Dad (You) - Message yourself"</strong> chat with the formatted trade alert ready to send with 1 click!
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                Your WhatsApp Phone Number (With Country Code)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.phoneNumber}
                  onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                  placeholder="e.g. +9779851188736 or +1234567890"
                  className="w-full bg-[#182033] border border-[#222F47] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#25D366]"
                />
                <Smartphone className="w-3.5 h-3.5 text-[#64748B] absolute right-3 top-3" />
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">
                Include full country code without symbols (e.g. 977... or 1...).
              </p>
            </div>

            {/* Note on Third-Party Bots */}
            <div className="bg-[#182033] border border-[#222F47] rounded-xl p-3 text-[11px] text-[#94A3B8] space-y-1">
              <div className="text-amber-400 font-bold text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Why did CallMeBot show a single grey checkmark?</span>
              </div>
              <p className="leading-relaxed">
                WhatsApp frequently suspends or rate-limits automated bot accounts (which causes the single grey checkmark). For <strong>100% automated background alerts</strong> that never get blocked, switch to the <strong>Telegram Bot tab above</strong>!
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Telegram Bot (100% Automated, Free, Never Blocked) */}
        {activeTab === 'TELEGRAM' && (
          <div className="space-y-3 mb-4">
            {/* Telegram Master Toggle */}
            <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SendHorizontal className={`w-5 h-5 ${tgConfig.enabled ? 'text-[#0088cc]' : 'text-[#64748B]'}`} />
                <div>
                  <div className="text-xs font-bold text-[#F1F5F9]">Enable Automated Telegram Push Alerts</div>
                  <div className="text-[10px] text-[#94A3B8]">Sends instant push alerts directly into your Telegram app</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tgConfig.enabled}
                  onChange={(e) => setTgConfig({ ...tgConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#182033] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#222F47] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0088cc]"></div>
              </label>
            </div>

            {/* Auto-Send New Trade Signals Toggle & Instant Broadcast */}
            <div className="bg-[#101522] border border-[#00E676]/40 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-[#00E676] flex items-center gap-1.5">
                    <span>🚨 Auto-Send Every New Trade Signal</span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8]">
                    Automatically sends full Entry, SL, TP1–TP3 & Rationale to Telegram whenever any new signal forms, updates from News, or triggers from Pending to Running.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={tgConfig.notifyOnNewSignal !== false}
                    onChange={(e) => setTgConfig({ ...tgConfig, notifyOnNewSignal: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#182033] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#222F47] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E676]"></div>
                </label>
              </div>

              {activeSignals.length > 0 && (
                <button
                  type="button"
                  onClick={handleBroadcastActiveSignals}
                  disabled={isBroadcasting}
                  className="w-full py-2 px-3 rounded-lg bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/50 text-[#00E676] font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <SendHorizontal className="w-3.5 h-3.5" />
                  <span>
                    {isBroadcasting
                      ? 'Sending Active Signals to Telegram...'
                      : `📤 Send Active Signals (${Math.min(activeSignals.length, 5)}) to My Telegram Now`}
                  </span>
                </button>
              )}
            </div>

            {/* Telegram 2-Step Setup Guide */}
            <div className="bg-[#101522] border border-[#0088cc]/30 rounded-xl p-3 text-xs space-y-2">
              <div className="font-bold text-[#0088cc] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Your Bot is Created: @my_fx_trade_bot
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#0088cc]/20 text-[#0088cc] font-mono">
                  Token Ready
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Step 1: Open your bot in Telegram by tapping the button below, then tap <strong>START</strong> (or send "hi"):
              </p>
              <a
                href="https://t.me/my_fx_trade_bot"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 rounded-lg bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                <span>Open @my_fx_trade_bot & Tap START</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed pt-1">
                Step 2: After tapping Start in Telegram, tap <strong>"Auto-Detect My Chat ID"</strong> below!
              </p>
            </div>

            {/* Bot Token Input with Paste Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase">
                  Telegram Bot Token
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard) {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setTgConfig(prev => ({ ...prev, botToken: text.replace(/\s+/g, '') }));
                          setTestResult({
                            status: 'SUCCESS',
                            message: 'Pasted token from clipboard! Now tap "Auto-Detect ID" below.'
                          });
                        }
                      }
                    } catch {}
                  }}
                  className="text-[10.5px] font-bold text-[#0088cc] hover:underline flex items-center gap-1"
                >
                  <span>📋 Paste from Clipboard</span>
                </button>
              </div>
              <input
                type="text"
                value={tgConfig.botToken}
                onChange={(e) => setTgConfig({ ...tgConfig, botToken: e.target.value.replace(/\s+/g, '') })}
                placeholder="Tap token in BotFather to copy, then paste here"
                className="w-full bg-[#182033] border border-[#222F47] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#0088cc]"
              />
              <p className="text-[10px] text-[#94A3B8] mt-1 leading-relaxed">
                👉 In Telegram, open your <strong>BotFather</strong> chat and <strong>tap once on the token</strong> (it copies automatically). Then paste it here!
              </p>
            </div>

            {/* Chat ID Input with Auto-Detect Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase">
                  Your Telegram Chat ID
                </label>
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#0088cc] hover:underline flex items-center gap-1"
                >
                  <span>Or get via @userinfobot</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tgConfig.chatId}
                  onChange={(e) => setTgConfig({ ...tgConfig, chatId: e.target.value })}
                  placeholder="e.g. 987654321"
                  className="flex-1 bg-[#182033] border border-[#222F47] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#0088cc]"
                />
                <button
                  type="button"
                  onClick={handleAutoDetectChatId}
                  disabled={isDetectingChatId}
                  className="px-3 py-2 rounded-xl bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/40 text-[#0088cc] text-xs font-bold transition-all shrink-0 flex items-center gap-1 disabled:opacity-50"
                >
                  <span>{isDetectingChatId ? 'Detecting...' : '🔍 Auto-Detect ID'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`mb-3 p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
              testResult.status === 'SUCCESS'
                ? 'bg-[#25D366]/15 border-[#25D366]/40 text-[#25D366]'
                : 'bg-[#FF3366]/15 border-[#FF3366]/40 text-[#FF3366]'
            }`}
          >
            {testResult.status === 'SUCCESS' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#222F47]">
          {activeTab === 'WHATSAPP' ? (
            <button
              type="button"
              onClick={handleTestWhatsAppAlert}
              disabled={isTesting}
              className="px-3.5 py-2 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-[#F1F5F9] font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Test WhatsApp Chat</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTestTelegramAlert}
              disabled={isTesting}
              className="px-3.5 py-2 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-[#F1F5F9] font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <SendHorizontal className="w-3.5 h-3.5 text-[#0088cc]" />
              <span>{isTesting ? 'Sending...' : 'Test Telegram Alert'}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-[#25D366] flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-[#080B11] font-black text-xs transition-all shadow-[0_0_15px_rgba(37,211,102,0.35)] flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
