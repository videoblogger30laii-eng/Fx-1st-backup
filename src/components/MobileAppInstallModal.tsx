import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  Share2,
  Send,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Layers,
  Loader2
} from 'lucide-react';
import { TelegramAlertService } from '../services/TelegramAlertService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  viewMode: 'MOBILE' | 'DESKTOP';
  onChangeViewMode: (mode: 'MOBILE' | 'DESKTOP') => void;
  deferredPrompt: any;
  onTriggerInstall: () => Promise<boolean>;
}

export const MobileAppInstallModal: React.FC<Props> = ({
  isOpen,
  onClose,
  viewMode,
  onChangeViewMode
}) => {
  const [activeTab, setActiveTab] = useState<'APK' | 'QR' | 'LAYOUT'>('APK');
  const [qrTarget, setQrTarget] = useState<'APK' | 'WEB'>('APK');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [ isSendingTelegram, setIsSendingTelegram ] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const basePublicOrigin = 'https://ais-pre-khyxbhrliwbprp5vdzyqd6-952034086177.asia-southeast1.run.app';
  const directApkUrl = `${basePublicOrigin}/FX-Signals-Pro.apk`;
  const activeQrUrl = qrTarget === 'APK' ? directApkUrl : basePublicOrigin;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=230x230&margin=10&data=${encodeURIComponent(activeQrUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(activeQrUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  // Share the actual FX-Signals-Pro.apk binary via Android/iOS Native Share Sheet
  const handleNativeShareApkFile = async () => {
    setIsSharing(true);
    setActionMessage(null);
    try {
      const res = await fetch('/FX-Signals-Pro.apk');
      if (!res.ok) throw new Error('Could not load APK package');
      const blob = await res.blob();
      const apkFile = new File([blob], 'FX-Signals-Pro.apk', {
        type: 'application/vnd.android.package-archive'
      });

      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [apkFile] })) {
        await nav.share({
          title: 'FX Signals Pro — Android App (.APK)',
          text: 'Install FX Signals Pro Institutional Trading App (.APK)',
          files: [apkFile]
        });
        setActionMessage({
          type: 'ok',
          text: '✅ Shared FX-Signals-Pro.apk! You can save it to Files/Downloads or send via WhatsApp/Telegram.'
        });
      } else if (nav.share) {
        await nav.share({
          title: 'FX Signals Pro — Android App (.APK)',
          text: 'Download FX Signals Pro Android APK:',
          url: directApkUrl
        });
        setActionMessage({
          type: 'ok',
          text: '✅ Shareable APK link shared!'
        });
      } else {
        await navigator.clipboard.writeText(directApkUrl);
        setActionMessage({
          type: 'ok',
          text: '✅ Shareable APK link copied to clipboard!'
        });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setActionMessage({
          type: 'err',
          text: 'Use the Direct Download button or Send to Telegram below.'
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Send FX-Signals-Pro.apk directly into the user's Telegram app via Bot sendDocument API
  const handleSendApkToTelegram = async () => {
    setIsSendingTelegram(true);
    setActionMessage(null);
    try {
      const cfg = TelegramAlertService.getConfig();
      if (!cfg.botToken || !cfg.chatId) {
        setActionMessage({
          type: 'err',
          text: '⚠️ Set your Telegram Chat ID in the Alerts tab first, or use the Direct Download / Share buttons above!'
        });
        setIsSendingTelegram(false);
        return;
      }

      const res = await fetch('/FX-Signals-Pro.apk');
      if (!res.ok) throw new Error('Failed to read APK');
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('chat_id', cfg.chatId.trim());
      formData.append('document', blob, 'FX-Signals-Pro.apk');
      formData.append(
        'caption',
        '📲 *FX Signals Pro — Native Android App (FX-Signals-Pro.apk)*\n\nTap this file in Telegram to install the app directly on your Android phone!'
      );
      formData.append('parse_mode', 'Markdown');

      const tgRes = await fetch(`https://api.telegram.org/bot${cfg.botToken.trim()}/sendDocument`, {
        method: 'POST',
        body: formData
      });
      const tgJson = await tgRes.json();
      if (tgJson.ok) {
        setActionMessage({
          type: 'ok',
          text: '✅ Sent FX-Signals-Pro.apk to your Telegram! Open Telegram on your phone and tap the APK file to install!'
        });
      } else {
        throw new Error(tgJson.description || 'Telegram upload failed');
      }
    } catch (err: any) {
      setActionMessage({
        type: 'err',
        text: `Telegram error: ${err?.message || 'Check Chat ID in Alerts tab'}`
      });
    } finally {
      setIsSendingTelegram(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D111C] border border-[#222F47] rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 border-b border-[#222F47] flex items-center justify-between bg-[#101522]">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.svg"
              alt="FX Signals Pro"
              className="w-9 h-9 rounded-xl border border-[#FFD700]/40"
            />
            <div>
              <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-wide">
                Shareable Android App (.APK)
              </h3>
              <p className="text-[11px] text-[#00E676] font-semibold">
                FX-Signals-Pro.apk • Signed Native Package
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#182033] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex bg-[#101522] px-3 pt-2.5 border-b border-[#222F47] gap-1">
          <button
            onClick={() => setActiveTab('APK')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'APK'
                ? 'bg-[#182033] text-[#00E676] border-[#00E676]'
                : 'text-[#94A3B8] hover:text-white border-transparent'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download & Share .APK</span>
          </button>

          <button
            onClick={() => setActiveTab('QR')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'QR'
                ? 'bg-[#182033] text-[#FFD700] border-[#FFD700]'
                : 'text-[#94A3B8] hover:text-white border-transparent'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('LAYOUT')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'LAYOUT'
                ? 'bg-[#182033] text-[#2979FF] border-[#2979FF]'
                : 'text-[#94A3B8] hover:text-white border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layout</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: Direct Download + Share APK File + Send APK to Telegram */}
          {activeTab === 'APK' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-[#00E676]/15 via-[#101522] to-[#2979FF]/15 border border-[#00E676]/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-[#00E676]">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>FX-Signals-Pro.apk (Signed Android App)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#00E676]/20 text-[#00E676] px-2 py-0.5 rounded">
                    v1.2.0 • 360 KB
                  </span>
                </div>

                <p className="text-[11px] text-[#E2E8F0] leading-relaxed">
                  Download, share, or send <strong>FX-Signals-Pro.apk</strong> directly to your phone. Installs as a real native Android application with your app icon!
                </p>

                {/* 1. Direct HTTP APK Download */}
                <a
                  href="/FX-Signals-Pro.apk"
                  download="FX-Signals-Pro.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00E676] to-[#10B981] hover:opacity-95 text-[#080B11] font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg no-underline"
                >
                  <Download className="w-4 h-4" />
                  <span>⬇️ Direct Download FX-Signals-Pro.apk</span>
                </a>

                {/* 2. Native OS Share APK File (WhatsApp, Telegram, Save to Files, Quick Share) */}
                <button
                  onClick={handleNativeShareApkFile}
                  disabled={isSharing}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2979FF] hover:bg-[#2979FF]/90 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing Shareable .APK File...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>📤 Share FX-Signals-Pro.apk File (WhatsApp / Files)</span>
                    </>
                  )}
                </button>

                {/* 3. Send APK Directly to Telegram Chat */}
                <button
                  onClick={handleSendApkToTelegram}
                  disabled={isSendingTelegram}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#2979FF]/50 text-[#F1F5F9] font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  {isSendingTelegram ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#2979FF]" />
                      <span>Uploading FX-Signals-Pro.apk to Telegram...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#2979FF]" />
                      <span>✈️ Send FX-Signals-Pro.apk to My Telegram</span>
                    </>
                  )}
                </button>

                {/* 4. Instant Standalone App File (Opens immediately without APK installer permissions) */}
                <a
                  href="/api/download/mobile-app"
                  download="FX-Signals-Pro-Mobile-App.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-4 rounded-xl bg-[#101522] hover:bg-[#182033] border border-[#FFD700]/40 text-[#FFD700] font-bold text-[11px] flex items-center justify-center gap-2 transition-all no-underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>⚡ Instant Open Portable App (No APK Install Needed)</span>
                </a>

                {actionMessage && (
                  <div
                    className={`rounded-lg p-2.5 text-[11px] font-semibold border ${
                      actionMessage.type === 'ok'
                        ? 'bg-[#00E676]/10 border-[#00E676]/40 text-[#00E676]'
                        : 'bg-[#FF3366]/10 border-[#FF3366]/40 text-[#FF3366]'
                    }`}
                  >
                    {actionMessage.text}
                  </div>
                )}

                <div className="bg-[#080B11] border border-[#222F47] rounded-lg p-3 space-y-1 text-[11px] text-[#CBD5E1]">
                  <div className="font-bold text-[#FFD700]">Installation Steps on Android:</div>
                  <ol className="list-decimal list-inside space-y-1 text-[#94A3B8]">
                    <li>Download or share <strong>FX-Signals-Pro.apk</strong> to your phone (or transfer from PC via USB cable).</li>
                    <li>Tap <strong>FX-Signals-Pro.apk</strong> to open the Android installer.</li>
                    <li>If Play Protect prompts, tap <strong>"More details" &gt; "Install anyway"</strong> and tap <strong>Open</strong>!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Direct APK Download QR Code */}
          {activeTab === 'QR' && (
            <div className="space-y-3">
              <div className="bg-[#101522] border border-[#222F47] rounded-xl p-4 flex flex-col items-center text-center space-y-3">
                <div className="grid grid-cols-2 gap-1.5 w-full bg-[#080B11] p-1 rounded-xl border border-[#222F47]">
                  <button
                    onClick={() => setQrTarget('APK')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                      qrTarget === 'APK'
                        ? 'bg-[#00E676] text-[#080B11]'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    📲 Direct .APK QR Code
                  </button>
                  <button
                    onClick={() => setQrTarget('WEB')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                      qrTarget === 'WEB'
                        ? 'bg-[#2979FF] text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    🌐 Live App QR Code
                  </button>
                </div>

                <div className="bg-white p-3 rounded-2xl shadow-xl border-2 border-[#00E676]">
                  <img
                    src={qrImageUrl}
                    alt="FX Signals Pro APK QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>

                <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                  {qrTarget === 'APK'
                    ? 'Scan with your Android camera to directly download FX-Signals-Pro.apk!'
                    : 'Scan with your phone camera to open FX Signals Pro.'}
                </p>

                <button
                  onClick={handleCopyUrl}
                  className="w-full py-2 px-3 rounded-xl bg-[#182033] hover:bg-[#222F47] border border-[#222F47] text-xs font-bold text-[#F1F5F9] flex items-center justify-center gap-1.5 transition-all"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00E676]" />
                      <span className="text-[#00E676]">Shareable APK Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>Copy Shareable {qrTarget === 'APK' ? '.APK' : 'App'} Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Layout Switcher */}
          {activeTab === 'LAYOUT' && (
            <div className="bg-[#101522] border border-[#222F47] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F1F5F9]">
                  Select Screen Layout
                </span>
                <span className="text-[10px] font-bold text-[#00E676] bg-[#00E676]/15 px-2 py-0.5 rounded border border-[#00E676]/30">
                  {viewMode === 'MOBILE' ? '📱 Mobile App Active' : '🖥️ Wide View'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onChangeViewMode('MOBILE');
                    onClose();
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    viewMode === 'MOBILE'
                      ? 'bg-[#2979FF]/20 border-[#2979FF] text-white'
                      : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Smartphone className="w-4 h-4 text-[#00E676]" />
                    {viewMode === 'MOBILE' && <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />}
                  </div>
                  <div className="text-xs font-black mt-1">📱 Mobile App</div>
                  <div className="text-[10px] text-[#94A3B8]">
                    Native smartphone layout
                  </div>
                </button>

                <button
                  onClick={() => {
                    onChangeViewMode('DESKTOP');
                    onClose();
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    viewMode === 'DESKTOP'
                      ? 'bg-[#2979FF]/20 border-[#2979FF] text-white'
                      : 'bg-[#080B11] border-[#222F47] text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Layers className="w-4 h-4 text-[#FFD700]" />
                    {viewMode === 'DESKTOP' && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD700]" />}
                  </div>
                  <div className="text-xs font-black mt-1">🖥️ Wide Screen</div>
                  <div className="text-[10px] text-[#94A3B8]">
                    Multi-column desktop layout
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10.5px] text-[#94A3B8] bg-[#101522] p-2.5 rounded-xl border border-[#222F47]">
            <ShieldCheck className="w-4 h-4 text-[#00E676] shrink-0" />
            <span>
              <strong>FX-Signals-Pro.apk</strong> is a v1+v2 signed Android package (`com.fxsignals.pro`) ready to install or share across devices.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#101522] border-t border-[#222F47] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#00E676] hover:bg-[#00E676]/90 text-[#080B11] text-xs font-black rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
