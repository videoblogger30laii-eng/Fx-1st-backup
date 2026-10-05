import { ForexSignal, TelegramAlertConfig } from '../types';

const STORAGE_KEY = 'elev8_telegram_alert_config';
const SENT_SIGNALS_STORAGE_KEY = 'elev8_telegram_sent_signals_v1';

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
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(SENT_SIGNALS_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  }

  static markSignalKeySent(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      const set = this.getSentSignalKeys();
      set.add(key);
      const arr = Array.from(set).slice(-150);
      localStorage.setItem(SENT_SIGNALS_STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }

  static getSignalSignature(signal: ForexSignal): string {
    return `${signal.id}:${signal.type}:${signal.entryPrice}`;
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
   * Automatically sends a newly formed or updated signal to Telegram (deduplicated unless force=true)
   */
  static async sendNewSignalAlert(
    signal: ForexSignal,
    customHeader?: string,
    force: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig();
    if (!config.enabled || config.notifyOnNewSignal === false) {
      return { success: false, message: 'Telegram new-signal alerts are disabled.' };
    }

    const sigKey = this.getSignalSignature(signal);
    if (!force && this.getSentSignalKeys().has(sigKey)) {
      return { success: false, message: 'Signal already dispatched to Telegram.' };
    }

    const msg = this.formatSignalMessage(signal, customHeader);
    const res = await this.sendAlert(msg, config);
    if (res.success) {
      this.markSignalKeySent(sigKey);
    }
    return res;
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
   * Dispatches real-time alert directly to user's Telegram via Official Telegram Bot API
   * Automatically falls back to plain text if Markdown entity parsing fails.
   */
  static async sendAlert(
    message: string,
    configOverride?: TelegramAlertConfig
  ): Promise<{ success: boolean; message: string }> {
    const config = configOverride || this.getConfig();

    if (!config.enabled) {
      return { success: false, message: 'Telegram alerts are disabled.' };
    }

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
