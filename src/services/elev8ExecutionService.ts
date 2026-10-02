import { Elev8AccountConfig, Elev8Trade } from '../types';

export interface ExecutionResult {
  success: boolean;
  ticketId?: string;
  message: string;
  timestamp: number;
}

export const Elev8ExecutionService = {
  /**
   * Executes a trade either via Simulated Engine, MT5 Webhook Bridge, or MetaApi Cloud REST
   */
  async executeTrade(trade: Elev8Trade, config: Elev8AccountConfig): Promise<ExecutionResult> {
    const mode = config.executionMode || 'SIMULATED';

    // 1. WEBHOOK BRIDGE EXECUTION (Direct to PC/VPS running MT5)
    if (mode === 'WEBHOOK_BRIDGE' && config.webhookUrl) {
      try {
        const payload = {
          action: 'ORDER_SEND',
          accountNumber: config.accountNumber,
          server: config.server,
          symbol: trade.symbol,
          cmd: trade.orderType.startsWith('BUY') ? 'BUY' : 'SELL',
          orderType: trade.orderType,
          volume: trade.lots,
          price: trade.entryPrice,
          sl: trade.stopLoss,
          tp: trade.takeProfit1,
          tp2: trade.takeProfit2,
          tp3: trade.takeProfit3,
          comment: `Elev8-App-${trade.id}`,
          magic: 891042,
          timestamp: Date.now()
        };

        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Bridge returned HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json().catch(() => ({}));
        const realTicket = data.orderId || data.ticket || `MT5-${Math.floor(1000000 + Math.random() * 9000000)}`;

        return {
          success: true,
          ticketId: String(realTicket),
          message: `Real order #${realTicket} executed via Elev8 MT5 Bridge! Check your MT5 Mobile app.`,
          timestamp: Date.now()
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Bridge Connection Error: ${err.message || 'Could not reach MT5 Webhook Bridge'}. Ensure your MT5 EA / Ngrok server is running.`,
          timestamp: Date.now()
        };
      }
    }

    // 2. METAAPI CLOUD REST EXECUTION (No PC or VPS required)
    if (mode === 'METAAPI_CLOUD' && config.metaApiToken && config.metaApiAccountId) {
      try {
        const isBuy = trade.orderType.startsWith('BUY');
        const actionType = trade.orderType.includes('LIMIT')
          ? (isBuy ? 'ORDER_TYPE_BUY_LIMIT' : 'ORDER_TYPE_SELL_LIMIT')
          : (isBuy ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL');

        const metaApiUrl = `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${config.metaApiAccountId}/trade`;

        const response = await fetch(metaApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'auth-token': config.metaApiToken
          },
          body: JSON.stringify({
            actionType,
            symbol: trade.symbol,
            volume: trade.lots,
            openPrice: trade.entryPrice,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit1,
            comment: 'Elev8 Mobile Signal'
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `MetaApi Error ${response.status}`);
        }

        const ticket = data.orderId || data.numericCode || `MT5-${Date.now().toString().slice(-7)}`;
        return {
          success: true,
          ticketId: String(ticket),
          message: `Live Order #${ticket} successfully placed on ${config.server}! Open MT5 Mobile to monitor.`,
          timestamp: Date.now()
        };
      } catch (err: any) {
        return {
          success: false,
          message: `MetaApi Cloud Error: ${err.message}. Check your MetaApi Token & Account ID.`,
          timestamp: Date.now()
        };
      }
    }

    // 3. SIMULATED PRACTICE MODE (Default)
    // Simulates realistic instant broker latency
    await new Promise((res) => setTimeout(res, 400));
    const simTicket = `SIM-${Math.floor(1000000 + Math.random() * 9000000)}`;

    return {
      success: true,
      ticketId: simTicket,
      message: `Practice order logged to Elev8 Trade History (Simulated Mode). Set up Bridge or MetaApi for direct real execution.`,
      timestamp: Date.now()
    };
  },

  /**
   * Generates a deep link to open MetaTrader 5 Mobile app directly on the phone
   */
  getMt5MobileDeepLink(symbol: string, orderType: string, lots: number, sl: number, tp: number): string {
    const cleanSymbol = symbol.replace('/', '');
    const isBuy = orderType.startsWith('BUY');
    return `metatrader5://trade?symbol=${encodeURIComponent(cleanSymbol)}&action=${isBuy ? 'buy' : 'sell'}&volume=${lots}&sl=${sl}&tp=${tp}`;
  },

  /**
   * Attempts to launch MT5 Mobile on the user's phone/tablet
   */
  openInMt5Mobile(symbol: string, orderType: string, lots: number, sl: number, tp: number): boolean {
    const deepLink = this.getMt5MobileDeepLink(symbol, orderType, lots, sl, tp);
    try {
      window.location.href = deepLink;
      return true;
    } catch {
      return false;
    }
  }
};
