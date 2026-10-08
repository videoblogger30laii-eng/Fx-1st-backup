import React, { useState } from 'react';
import { PriceAlert, TriggeredAlertEvent } from '../types';
import { WhatsAppAlertService } from '../services/WhatsAppAlertService';
import {
  Bell,
  BellRing,
  History,
  Plus,
  Trash2,
  Volume2,
  Vibrate,
  Radio,
  CheckCircle2,
  Target,
  AlertTriangle
} from 'lucide-react';

interface Props {
  alerts: PriceAlert[];
  triggeredEvents: TriggeredAlertEvent[];
  onToggleEnabled: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  onClearHistory: () => void;
  onOpenAddModal: () => void;
  onOpenWhatsAppModal?: () => void;
  onOpenSoundSettings?: () => void;
}

export const AlertsScreen: React.FC<Props> = ({
  alerts,
  triggeredEvents,
  onToggleEnabled,
  onDeleteAlert,
  onClearHistory,
  onOpenAddModal,
  onOpenWhatsAppModal,
  onOpenSoundSettings
}) => {
  const [selectedTab, setSelectedTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const activeCount = alerts.filter(a => a.isEnabled).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16 text-left">
      {/* Top Banner Card */}
      <div className="flex items-center justify-between bg-[#101522] border border-[#222F47] rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2979FF]/15 flex items-center justify-center text-[#2979FF]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#F1F5F9]">Market Price Watchdog</div>
            <div className="text-xs text-[#94A3B8]">
              Monitoring institutional triggers & order level sweeps
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSoundSettings && (
            <button
              onClick={onOpenSoundSettings}
              className="flex items-center gap-1.5 bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-[#FFD700] font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Customize audio chimes & sound themes"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sound Chimes</span>
            </button>
          )}

          {onOpenWhatsAppModal && (
            <button
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Configure automated WhatsApp trade alerts"
            >
              <span>💬</span>
              <span className="hidden sm:inline">WhatsApp Alerts</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#080B11] font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Alert</span>
          </button>
        </div>
      </div>

      {/* Native Browser Notification Permission Prompt */}
      {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
        <div className="bg-[#101522] border border-[#2979FF]/40 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-[#00E676] shrink-0" />
            <span className="text-[#F1F5F9]">
              Enable audio & push notifications for your <strong>MT5 pending order fills & invalidations</strong>!
            </span>
          </div>
          <button
            onClick={() => {
              Notification.requestPermission();
            }}
            className="px-3 py-1.5 bg-[#2979FF] hover:bg-[#1E6BFF] text-white rounded-lg font-bold text-xs shrink-0 transition-all shadow"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* Segmented Tab Switcher */}
      <div className="flex bg-[#101522] p-1 rounded-xl border border-[#222F47]">
        <button
          onClick={() => setSelectedTab('ACTIVE')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
            selectedTab === 'ACTIVE'
              ? 'bg-[#182033] text-[#FFD700] border border-[#222F47]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Active Alerts ({activeCount})</span>
        </button>

        <button
          onClick={() => setSelectedTab('HISTORY')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
            selectedTab === 'HISTORY'
              ? 'bg-[#182033] text-[#FFD700] border border-[#222F47]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Triggered Log ({triggeredEvents.length})</span>
        </button>
      </div>

      {/* Active Tab */}
      {selectedTab === 'ACTIVE' && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.isEnabled
                  ? 'bg-[#101522] border-[#222F47]'
                  : 'bg-[#080B11] border-[#222F47]/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-[#F1F5F9]">
                    {alert.pairSymbol}
                  </span>
                  <span className="text-[10px] font-bold text-[#2979FF] bg-[#2979FF]/10 px-2 py-0.5 rounded border border-[#2979FF]/30">
                    {alert.condition}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alert.isEnabled}
                      onChange={() => onToggleEnabled(alert.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#222F47] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E676]"></div>
                  </label>

                  <button
                    onClick={() => onDeleteAlert(alert.id)}
                    className="p-1 text-[#64748B] hover:text-[#FF3366] transition-colors"
                    title="Delete Alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-[#64748B] font-bold uppercase">Target Price</div>
                  <div className="text-lg font-mono font-bold text-[#00E676]">
                    {alert.targetPrice}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#94A3B8]">
                  {alert.soundEnabled && <span title="Sound On"><Volume2 className="w-3.5 h-3.5" /></span>}
                  {alert.vibrateEnabled && <span title="Vibration On"><Vibrate className="w-3.5 h-3.5" /></span>}
                </div>
              </div>

              {alert.note && (
                <div className="mt-2.5 pt-2 border-t border-[#222F47]/60 text-xs text-[#94A3B8]">
                  Note: {alert.note}
                </div>
              )}
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="p-8 text-center bg-[#101522] rounded-xl border border-[#222F47]">
              <p className="text-xs text-[#94A3B8] mb-3">No active price alerts set.</p>
              <button
                onClick={onOpenAddModal}
                className="bg-[#2979FF] text-[#F1F5F9] font-bold text-xs px-3 py-1.5 rounded-lg"
              >
                Create an Alert
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Log Tab */}
      {selectedTab === 'HISTORY' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[#94A3B8]">Historical Triggered Events</span>
            {triggeredEvents.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-[#FF3366] hover:underline font-semibold text-[11px]"
              >
                Clear History
              </button>
            )}
          </div>

          {triggeredEvents.map(event => {
            const isTrig = event.condition === 'PENDING_ORDER_TRIGGERED';
            const isInval = event.condition === 'PENDING_ORDER_INVALIDATED';

            return (
              <div
                key={event.id}
                className={`flex items-center justify-between border rounded-xl p-3.5 transition-all ${
                  isTrig
                    ? 'bg-[#0A1612] border-[#00E676]/40 shadow-sm'
                    : isInval
                    ? 'bg-[#1C0D11] border-[#FF3366]/40 shadow-sm'
                    : 'bg-[#101522] border-[#222F47]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isTrig
                        ? 'bg-[#00E676]/20 text-[#00E676]'
                        : isInval
                        ? 'bg-[#FF3366]/20 text-[#FF3366]'
                        : 'bg-[#FFD700]/15 text-[#FFD700]'
                    }`}
                  >
                    {isTrig ? (
                      <Target className="w-4 h-4" />
                    ) : isInval ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <BellRing className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-left">
                    <div
                      className={`text-xs font-bold ${
                        isTrig
                          ? 'text-[#00E676]'
                          : isInval
                          ? 'text-[#FF3366]'
                          : 'text-[#F1F5F9]'
                      }`}
                    >
                      {event.title}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-0.5">{event.message}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      const url = WhatsAppAlertService.getDirectChatUrl(
                        `*${event.title}*\n\n${event.message}\n\nTime: ${new Date(event.timestamp).toLocaleTimeString()}`
                      );
                      window.open(url, '_blank');
                    }}
                    className="p-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-[10px] font-bold flex items-center gap-1 border border-[#25D366]/30 transition-colors"
                    title="Send alert details to WhatsApp"
                  >
                    <span>💬</span>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  <div className="text-right text-[10px] font-mono text-[#64748B]">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}

          {triggeredEvents.length === 0 && (
            <div className="p-8 text-center bg-[#101522] rounded-xl border border-[#222F47]">
              <CheckCircle2 className="w-8 h-8 text-[#00E676] mx-auto mb-2 opacity-80" />
              <p className="text-xs text-[#94A3B8]">No alerts triggered yet.</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">
                Active alerts will record time & trigger prices here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
