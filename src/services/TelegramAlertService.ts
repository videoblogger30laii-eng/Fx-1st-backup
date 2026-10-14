import { ForexSignal, TelegramAlertConfig } from '../types';
import { isForexMarketOpen } from './marketData';

const STORAGE_KEY = 'elev8_telegram_alert_config';
const SENT_SIGNALS_STORAGE_KEY = 'elev8_telegram_sent_signals_v2';
const SENT_ALERTS_STORAGE_KEY = 'elev8_telegram_sent_alerts_v3';

// Synchronous in-memory lock sets to block concurrent / StrictMode / multi-tick duplicate calls before network completion
const inFlightAndSentSignalKeys = new Set<string>();
const inFlightAndSentMessageFingerprints = new Map<string, number>();

export const DEFAULT_TELEGRAM_CONFIG: TelegramAlertConfig = {
  enabled: true,
  botToken: '8750503064:AAHU1FA80-Hqvjwc010oUDI2pgkitH2bJRI',
  chatId: '',
  notifyOnNewSignal: true,
  notifyOnPendingTrigger: true,
  notifyOnPendingInvalidate: true,
  notifyOnTakeProfit: true,
  notifyOnStopLoss: true
};

export class TelegramAlertService {
  static getConfig(): TelegramAlertConfig {
    if (typeof window === 'undefined') return DEFAULT_TELEGRAM_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const rawToken = parsed.botToken || DEFAULT_TELEGRAM_CONFIG.botToken;
        return {
          ...DEFAULT_TELEGRAM_CONFIG,
          ...parsed,
          notifyOnNewSignal: parsed.notifyOnNewSignal !== undefined ? parsed.notifyOnNewSignal : true,
          botToken: rawToken.replace(/\s+/g, '')
        };
      }
    } catch {}
    return DEFAULT_TELEGRAM_CONFIG;
  }

  static saveConfig(config: TelegramAlertConfig): void {
    if (typeof window === 'undefined') return;
    try {
      const sanitized: TelegramAlertConfig = {
        ...config,
        notifyOnNewSignal: config.notifyOnNewSignal !== undefined ? config.notifyOnNewSignal : true,
        botToken: config.botToken.replace(/\s+/g, ''),
        chatId: config.chatId.replace(/\s+/g, '')
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {}
  }

  static getSentSignalKeys(): Set<string> {
    const combined = new Set<string>(inFlightAndSentSignalKeys);
    if (typeof window === 'undefined') return combined;
    try {
      const raw = localStorage.getItem(SENT_SIGNALS_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((k: string) => {
            combined.add(k);
            inFlightAndSentSignalKeys.add(k);
          });
        }
      }
    } catch {}
    return combined;
  }

  static markSignalKeySent(key: string): void {
    inFlightAndSentSignalKeys.add(key);
    if (typeof window === 'undefined') return;
    try {
      const set = this.getSentSignalKeys();
      set.add(key);
      const arr = Array.from(set).slice(-300);
      localStorage.setItem(SENT_SIGNALS_STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }

  static getSignalSignature(signal: ForexSignal): string {
    return `${signal.id}:${signal.type}:${signal.entryPrice}`;
  }

  static getSignalPairDirectionKey(signal: ForexSignal): string {
    return `PAIR_DIR:${signal.pair.symbol}:${signal.type}:${signal.status}`;
  }

  /**
   * Checks if a signal has already been sent (by base signature, pair+direction+status, or custom header).
   */
  static hasSignalBeenSent(signal: ForexSignal, customHeader?: string): boolean {
    const sentKeys = this.getSentSignalKeys();
    const baseSig = this.getSignalSignature(signal);
    const pairDirKey = this.getSignalPairDirectionKey(signal);
    const headerSig = `${baseSig}:${customHeader || 'NEW'}`;

    if (sentKeys.has(baseSig) || sentKeys.has(headerSig)) {
      return true;
    }

    // Also check if this exact pair + direction + status was dispatched within the last 4 hours
    if (this.isDuplicateAlert(pairDirKey, 4 * 3600 * 1000)) {
      return true;
    }

    return false;
  }

  /**
   * Marks all canonical keys for a signal as sent so no other effect or sync loop can re-send it.
   */
  static markSignalSent(signal: ForexSignal, customHeader?: string): void {
    const baseSig = this.getSignalSignature(signal);
    const pairDirKey = this.getSignalPairDirectionKey(signal);
    const headerSig = `${baseSig}:${customHeader || 'NEW'}`;

    this.markSignalKeySent(baseSig);
    this.markSignalKeySent(headerSig);
    this.markSignalKeySent(pairDirKey);
    this.recordAlertSent(pairDirKey);
  }

  /**
   * Generates a canonical deduplication fingerprint for any alert message.
   * Strips volatile live tick quotes, pip fluctuations, and header variations so two rapid ticks
   * or two code paths on the same pair (e.g., EUR/USD) produce the exact same fingerprint.
   */
  static getAlertFingerprint(message: string): string {
    // 1. Canonical fingerprint for Price Watchdog Alerts (e.g. EUR/USD PRICE_BELOW H4 Demand Block)
    if (message.includes('PRICE ALERT TRIGGERED') || message.includes('Alert Triggered!')) {
      const pairMatch = message.match(/Pair:\s*\*?([A-Z0-9/]+)\*?/i);
      const condMatch = message.match(/(PRICE_BELOW|PRICE_ABOVE)/i);
      const noteMatch = message.match(/\(([^)]+)\)/);
      const pair = pairMatch ? pairMatch[1].toUpperCase() : 'UNKNOWN_PAIR';
      const cond = condMatch ? condMatch[1].toUpperCase() : 'COND';
      const note = noteMatch ? noteMatch[1].trim() : 'TARGET';
      return `PRICE_ALERT_CANONICAL:${pair}:${cond}:${note}`;
    }

    // 2. Canonical fingerprint for Trade Signal cards (prevents header variations from double-sending same pair signal)
    if (message.includes('*Entry Price:*') && message.includes('*Pair:*')) {
      const pairMatch = message.match(/\*Pair:\*\s*([A-Z0-9/]+)/i);
      const actionMatch = message.match(/\*Action:\*\s*([^\n]+)/i);
      const statusMatch = message.match(/\*Status:\*\s*([^\n]+)/i);
      const entryMatch = message.match(/\*Entry Price:\*\s*([0-9.,]+)/i);
      if (pairMatch && actionMatch) {
        const pair = pairMatch[1].trim().toUpperCase();
        const action = actionMatch[1].trim().toUpperCase();
        const status = statusMatch ? statusMatch[1].trim().toUpperCase() : 'STATUS';
        const entry = entryMatch ? entryMatch[1].trim() : 'ENTRY';
        return `SIGNAL_CARD_CANONICAL:${pair}:${action}:${status}:${entry}`;
      }
    }

    // 3. General normalized message fingerprint
    return message
      .replace(/Price:\s*\*?[0-9.,]+\*?/gi, 'Price:NORM')
      .replace(/Filled at:\s*\*?[0-9.,]+\*?/gi, 'FilledAt:NORM')
      .replace(/Exit Price:\s*\*?[0-9.,]+\*?/gi, 'ExitPrice:NORM')
      .replace(/TP1 Reached:\s*\*?[0-9.,]+\*?\s*(\([^)]*\))?/gi, 'TP1Reached:NORM')
      .replace(/SL Hit at:\s*\*?[0-9.,]+\*?/gi, 'SLHitAt:NORM')
      .replace(/Profit:\s*\*?[^\n]+\*?/gi, 'Profit:NORM')
      .replace(/Loss:\s*\*?[^\n]+\*?/gi, 'Loss:NORM')
      .replace(/Time:\s*[^\n]+/gi, 'Time:NORM')
      .replace(/(PRICE_BELOW|PRICE_ABOVE)\s+at\s+[0-9.,]+/gi, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Checks if an alert fingerprint was already sent (in-memory or in localStorage) within the cooldown window.
   */
  static isDuplicateAlert(fingerprint: string, cooldownMs: number = 6 * 3600 * 1000): boolean {
    const now = Date.now();

    // 1. Check synchronous in-memory map first (blocks sub-millisecond concurrent calls)
    const memTime = inFlightAndSentMessageFingerprints.get(fingerprint);
    if (memTime && now - memTime < cooldownMs) {
      return true;
    }

    // 2. Check persisted localStorage map (blocks reload re-triggers)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SENT_ALERTS_STORAGE_KEY);
        if (raw) {
          const store: Record<string, number> = JSON.parse(raw);
          const savedTime = store[fingerprint];
          if (savedTime && now - savedTime < cooldownMs) {
            inFlightAndSentMessageFingerprints.set(fingerprint, savedTime);
            return true;
          }
        }
      } catch {}
    }

    return false;
  }

  /**
   * Synchronously records the alert fingerprint BEFORE network dispatch so concurrent calls cannot race.
   */
  static recordAlertSent(fingerprint: string): void {
    const now = Date.now();
    inFlightAndSentMessageFingerprints.set(fingerprint, now);

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SENT_ALERTS_STORAGE_KEY);
        const store: Record<string, number> = raw ? JSON.parse(raw) : {};
        store[fingerprint] = now;

        // Prune entries older than 24 hours to keep localStorage lean
        const cutoff = now - 24 * 3600 * 1000;
        const pruned: Record<string, number> = {};
        Object.entries(store).forEach(([k, ts]) => {
          if (ts >= cutoff) pruned[k] = ts;
        });

        localStorage.setItem(SENT_ALERTS_STORAGE_KEY, JSON.stringify(pruned));
      } catch {}
    }
  }

  /**
   * Formats a complete ForexSignal into a clean Telegram alert card
   */
  static formatSignalMessage(signal: ForexSignal, customHeader?: string): string {
    const isBuy = signal.type.startsWith('BUY');
    const dirIcon = isBuy ? '🟢' : '🔴';
    const orderLabel = signal.type.replace('_', ' ');
    const statusLabel = signal.status === 'PENDING' ? '⏳ PENDING ORDER' : '⚡ RUNNING (MARKET)';
    const header =
      customHeader ||
      (signal.isBestTradeNow
        ? '🏆 *NEW BEST TRADE NOW (VIP SIGNAL)!*'
        : '🚨 *NEW TRADE SIGNAL FORMED!*');

    const marginStr = signal.pair.minMargin001
      ? `~$${signal.pair.minMargin001.toFixed(2)}`
      : '~$2.50';

    const cleanRationale = (signal.rationale || '').replace(/[_*`[\]]/g, '');
    const cleanKillzone = (signal.killzone || 'Active Session').replace(/[_*`[\]]/g, '');

    return (
      `${header}\n\n` +
      `${dirIcon} *Pair:* ${signal.pair.symbol} (${signal.pair.name})\n` +
      `📌 *Action:* ${orderLabel}\n` +
      `📡 *Status:* ${statusLabel}\n` +
      `⏱️ *Timeframe:* ${signal.timeframe} • *Confluence:* ${signal.confluenceScore}% (${signal.quality === 'A_PLUS' ? 'A+ VIP' : 'High Prob'})\n\n` +
      `📍 *Entry Price:* ${signal.entryPrice}\n` +
      `🛑 *Stop Loss (SL):* ${signal.stopLoss}\n` +
      `🎯 *Take Profit 1 (TP1):* ${signal.takeProfit1}\n` +
      `🎯 *Take Profit 2 (TP2):* ${signal.takeProfit2}\n` +
      `🎯 *Take Profit 3 (TP3):* ${signal.takeProfit3}\n\n` +
      `⚖️ *Risk:Reward:* ${signal.riskReward} | *0.01 Lot Margin:* ${marginStr}\n` +
      `🕐 *Session:* ${cleanKillzone}\n` +
      `🧠 *Rationale:* ${cleanRationale}`
    );
  }

  /**
   * Automatically sends a newly formed or updated signal to Telegram (strictly deduplicated unless manual user click)
   */
  static async sendNewSignalAlert(
    signal: ForexSignal,
    customHeader?: string,
    userInitiated: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig();
    if (!config.enabled || config.notifyOnNewSignal === false) {
      return { success: false, message: 'Telegram new-signal alerts are disabled.' };
    }

    // Never send automated signal alerts during weekend market closure
    if (!userInitiated && !isForexMarketOpen(new Date())) {
      this.markSignalSent(signal, customHeader);
      return {
        success: false,
        message: 'Weekend market closed — automated Telegram alerts paused until Sunday 22:00 GMT open.'
      };
    }

    if (!userInitiated && this.hasSignalBeenSent(signal, customHeader)) {
      return { success: false, message: 'Signal already dispatched to Telegram.' };
    }

    // Lock synchronously BEFORE network request to prevent duplicate in-flight dispatches
    this.markSignalSent(signal, customHeader);

    const msg = this.formatSignalMessage(signal, customHeader);
    return await this.sendAlert(msg, config, userInitiated);
  }

  /**
   * Automatically detects the user's Chat ID from recent bot updates after they tap /start
   */
  static async autoDetectChatId(token: string): Promise<{ success: boolean; chatId?: string; message: string }> {
    const cleanToken = token.replace(/\s+/g, '');
    if (!cleanToken) {
      return { success: false, message: 'Please enter Bot Token first.' };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates`);
      const data = await res.json();
      if (!data.ok) {
        return { success: false, message: data.description || 'Could not fetch updates.' };
      }
      if (!data.result || data.result.length === 0) {
        return {
          success: false,
          message: 'No messages received yet. Please open t.me/my_fx_trade_bot and tap START first!'
        };
      }
      const lastUpdate = data.result[data.result.length - 1];
      const foundId =
        lastUpdate.message?.chat?.id ||
        lastUpdate.channel_post?.chat?.id ||
        lastUpdate.my_chat_member?.chat?.id;

      if (foundId) {
        return { success: true, chatId: String(foundId), message: `Found Chat ID: ${foundId}` };
      }
      return {
        success: false,
        message: 'Could not extract Chat ID. Please send "hi" to @my_fx_trade_bot and try again.'
      };
    } catch (err: any) {
      return { success: false, message: `Error detecting Chat ID: ${err.message}` };
    }
  }

  /**
   * Dispatches real-time alert directly to user's Telegram via Official Telegram Bot API.
   * Synchronously deduplicates identical alerts so rapid ticks or React StrictMode never send duplicates.
   */
  static async sendAlert(
    message: string,
    configOverride?: TelegramAlertConfig,
    userInitiated: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const config = configOverride || this.getConfig();

    if (!config.enabled) {
      return { success: false, message: 'Telegram alerts are disabled.' };
    }

    // Never send automated alerts during weekend market closure
    if (!userInitiated && !isForexMarketOpen(new Date())) {
      return {
        success: false,
        message: 'Weekend market closed — automated Telegram alerts paused until Sunday 22:00 GMT open.'
      };
    }

    const fingerprint = this.getAlertFingerprint(message);
    // Even for manual user-initiated clicks, block sub-15-second accidental double-triggers;
    // for all automated triggers, enforce full 6-hour deduplication window.
    const cooldownWindow = userInitiated ? 15 * 1000 : 6 * 3600 * 1000;
    if (this.isDuplicateAlert(fingerprint, cooldownWindow)) {
      return { success: false, message: 'Duplicate alert suppressed.' };
    }

    // Lock synchronously BEFORE network await so parallel calls cannot race
    this.recordAlertSent(fingerprint);

    const token = config.botToken.replace(/\s+/g, '');
    let chatId = config.chatId.replace(/\s+/g, '');

    // Auto-detect chatId if not yet configured
    if (token && !chatId) {
      try {
        const detectRes = await this.autoDetectChatId(token);
        if (detectRes.success && detectRes.chatId) {
          chatId = detectRes.chatId;
          this.saveConfig({ ...config, chatId });
        }
      } catch {}
    }

    if (!token || !chatId) {
      return {
        success: false,
        message: 'Please tap START in @my_fx_trade_bot on Telegram first so the bot knows your chat!'
      };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const data = await res.json();
      if (data.ok) {
        return { success: true, message: '✅ Telegram alert sent successfully!' };
      }

      // Fallback without parse_mode if Markdown characters caused a parse error
      const plainRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.replace(/\*/g, '')
        })
      });
      const plainData = await plainRes.json();
      if (plainData.ok) {
        return { success: true, message: '✅ Telegram alert sent successfully!' };
      }

      return {
        success: false,
        message: data.description || 'Failed to send to Telegram.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Network error sending to Telegram: ${err.message}`
      };
    }
  }
}
