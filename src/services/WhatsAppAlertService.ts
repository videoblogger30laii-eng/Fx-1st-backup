import { WhatsAppAlertConfig } from '../types';

const STORAGE_KEY = 'elev8_whatsapp_alert_config';

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppAlertConfig = {
  enabled: false,
  phoneNumber: '',
  apiKey: '',
  customWebhookUrl: '',
  notifyOnPendingTrigger: true,
  notifyOnPendingInvalidate: true,
  notifyOnTakeProfit: true,
  notifyOnStopLoss: true
};

export class WhatsAppAlertService {
  static getConfig(): WhatsAppAlertConfig {
    if (typeof window === 'undefined') return DEFAULT_WHATSAPP_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_WHATSAPP_CONFIG;
  }

  static saveConfig(config: WhatsAppAlertConfig): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }

  /**
   * Generates a direct WhatsApp link that opens WhatsApp with text pre-filled
   */
  static getDirectChatUrl(text: string, phone?: string): string {
    const targetPhone = phone || this.getConfig().phoneNumber;
    const cleanPhone = (targetPhone || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(text);
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encoded}`;
    }
    return `https://api.whatsapp.com/send?text=${encoded}`;
  }

  /**
   * Silently dispatches automated WhatsApp alert to the user's phone via CallMeBot or Custom Webhook
   */
  static async sendAutomatedAlert(
    message: string,
    configOverride?: WhatsAppAlertConfig
  ): Promise<{ success: boolean; message: string }> {
    const config = configOverride || this.getConfig();

    if (!config.enabled) {
      return { success: false, message: 'WhatsApp alerts are currently disabled.' };
    }

    const cleanPhone = (config.phoneNumber || '').replace(/[^0-9]/g, '');

    // 1. Try CallMeBot (Free personal WhatsApp bot)
    if (cleanPhone && config.apiKey) {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(message)}&apikey=${config.apiKey.trim()}`;
        // Using no-cors mode to ensure browser doesn't block request from executing
        await fetch(url, { mode: 'no-cors' });
        return { success: true, message: `✅ WhatsApp alert sent to +${cleanPhone}!` };
      } catch (err: any) {
        return { success: false, message: `Failed to send CallMeBot alert: ${err.message || 'Network error'}` };
      }
    }

    // 2. Try Custom Webhook if configured
    if (config.customWebhookUrl) {
      try {
        const res = await fetch(config.customWebhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            message,
            timestamp: Date.now()
          })
        });
        if (res.ok) {
          return { success: true, message: '✅ WhatsApp custom webhook dispatched!' };
        }
        return { success: false, message: `Webhook returned status ${res.status}` };
      } catch (err: any) {
        return { success: false, message: `Webhook error: ${err.message}` };
      }
    }

    return {
      success: false,
      message: 'Please provide your WhatsApp Phone Number and CallMeBot API Key.'
    };
  }
}
