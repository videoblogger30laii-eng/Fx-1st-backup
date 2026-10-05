import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Server-side proxy for TradingView Scanner to avoid browser CORS restrictions
  app.post('/api/market/tv-scan', async (req, res) => {
    try {
      const { market = 'forex', tickers = [], columns = ['close', 'change', 'high', 'low', 'open'] } = req.body || {};
      const allowedMarkets = ['forex', 'cfd', 'america', 'crypto'];
      const safeMarket = allowedMarkets.includes(market) ? market : 'forex';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

      const tvRes = await fetch(`https://scanner.tradingview.com/${safeMarket}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; FXInstitutionalTerminal/1.2)',
        },
        body: JSON.stringify({
          symbols: { tickers },
          columns,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!tvRes.ok) {
        res.status(tvRes.status).json({ error: `TradingView scanner HTTP ${tvRes.status}` });
        return;
      }

      const data = await tvRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: err?.message || 'TradingView scanner proxy error' });
    }
  });

  // Universal & Institutional AI Copilot endpoint powered by Gemini 3.8 Flash
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const {
        prompt,
        persona,
        currentSignals = [],
        bestTrade = null,
        allPairs = [],
        economicEvents = [],
        currencyStrengths = [],
        history = [],
        imageBase64 = null,
        imageMimeType = 'image/jpeg',
      } = req.body || {};

      if ((!prompt || typeof prompt !== 'string') && !imageBase64) {
        res.status(400).json({ error: 'Prompt or image is required' });
        return;
      }

      const effectivePrompt =
        prompt && prompt.trim()
          ? prompt.trim()
          : 'Analyze this uploaded screenshot in detail: identify any currency pairs, chart patterns, MT5 orders/positions, price levels, or news shown, cross-check with live terminal data, and give a clear trading recommendation.';

      const activeSignalsList = Array.isArray(currentSignals)
        ? currentSignals.filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING')
        : [];
      const closedSignalsList = Array.isArray(currentSignals)
        ? currentSignals.filter((s: any) => s.status === 'HIT_SL' || s.status === 'HIT_TP')
        : [];

      const signalsSummary =
        activeSignalsList.length > 0
          ? activeSignalsList
              .slice(0, 15)
              .map(
                (s: any) =>
                  `- ${s.pair?.symbol} (${s.type}, ${s.timeframe}): Status=${s.status}, Entry=${s.entryPrice}, Current=${s.currentPrice || s.pair?.currentPrice}, SL=${s.stopLoss}, TP1=${s.takeProfit1}, R:R=${s.riskReward}, Confluence=${s.confluenceScore}%, Pips=${s.pips}, Rationale="${s.rationale}"`
              )
              .join('\n')
          : 'None';

      const closedSignalsSummary =
        closedSignalsList.length > 0
          ? closedSignalsList
              .map(
                (s: any) =>
                  `- ${s.pair?.symbol} (${s.type}, ${s.timeframe}): Outcome=${s.status}, Entry=${s.entryPrice}, ClosedAt=${s.currentPrice || s.pair?.currentPrice}, SL=${s.stopLoss}, TP1=${s.takeProfit1}, Pips=${s.pips}`
              )
              .join('\n')
          : 'None';

      const pairsSummary = Array.isArray(allPairs)
        ? allPairs
            .map((p: any) => {
              const live = p.currentPrice || p.basePrice || 0;
              const base = p.basePrice || live || 1;
              const pct = base > 0 ? +(((live - base) / base) * 100).toFixed(2) : 0;
              return `${p.symbol}: ${live} (${pct >= 0 ? '+' : ''}${pct}%)`;
            })
            .join(', ')
        : '';

      const eventsSummary = Array.isArray(economicEvents)
        ? economicEvents
            .map(
              (e: any) =>
                `- [${e.currency}] ${e.title} (${e.impact} Impact, Time: ${e.timeFormatted || e.time}): Actual=${e.actual || 'Pending'}, Forecast=${e.forecast}, Previous=${e.previous}, Affected Pairs=${(e.affectedPairs || []).join(', ')}. ${e.ifBeatScenario || ''} ${e.ifMissScenario || ''}`
            )
            .join('\n')
        : '';

      const strengthSummary = Array.isArray(currencyStrengths)
        ? currencyStrengths
            .map((c: any) => `${c.currency}: ${c.strength ?? c.score}/10 (${c.status || c.trend})`)
            .join(', ')
        : '';

      const personaTitle = persona?.title || 'Universal AI Copilot';
      const personaDesc =
        persona?.description ||
        'Universal trading, macroeconomic news, technical analysis, and financial market intelligence assistant.';

      const systemInstruction = `You are "${personaTitle}" (${personaDesc}) inside an institutional Forex, Gold (XAU/USD), Indices (US30, NAS100), and Crypto trading terminal.

CRITICAL DIRECTIVES:
1. DIRECT VERDICT FIRST: When the user asks "Is it buy or sell?", "Analyze [pair]", or asks about any specific asset/trade, ALWAYS provide a clear, definitive institutional verdict (e.g. "**🎯 INSTITUTIONAL VERDICT: SELL (Bearish Trend Continuation)**" or "**🎯 INSTITUTIONAL VERDICT: BUY (Discount Pullback Entry)**" or "**🎯 INSTITUTIONAL VERDICT: WAIT / STANDBY (Mid-Range Consolidation)**") in the very first line!
2. RE-ENTRY / HIT SL INQUIRIES: If the user asks about a trade that hit Stop Loss and whether to re-enter (e.g. "I was trading gbpcad but it hit sl, will it be good to re-enter now?"), directly address that EXACT pair:
   - Provide a clear **🎯 RE-ENTRY VERDICT: [WAIT FOR CONFIRMATION / SECOND CHANCE LIMIT ENTRY / STANDBY]**.
   - Diagnose why the previous SL likely hit (e.g. liquidity sweep / stop hunt into 4H Order Block vs true structural breakdown).
   - Check current Currency Strength and live price action for that pair.
   - Provide concrete re-entry execution levels (Limit Entry, new SL beyond sweep wick, TP1, TP2) and rules (no revenge market orders).
3. NEVER ask the user for current prices, charts, or timeframes — you have the complete LIVE TERMINAL CONTEXT provided below with exact live prices for all 30 assets, active signals, currency strengths, and news events. Use this live data directly!
4. ALWAYS provide concrete price levels in your response:
   - **Live Market Price**
   - **Recommended Entry Zone**
   - **Protective Stop Loss (SL)** with exact pip risk
   - **Take Profit Targets (TP1 & TP2)** with exact pip gains and R:R ratio
   - **Interbank Strength & Technical Driver** (Order Blocks, FVG, EMA trend, and Currency Strength score).
5. If an image is uploaded (such as a chart, MT5 order, or news screenshot), inspect all visible text, candlesticks, positions, and numbers in the image and directly address their question about the image.
6. If the user asks about news, risk calculation, prop firms, or SMC concepts, answer their exact question with structured markdown, formulas, and actionable steps.

=== LIVE TERMINAL CONTEXT ===
Best Trade Now: ${bestTrade ? `${bestTrade.pair?.symbol} ${bestTrade.type} @ ${bestTrade.entryPrice} (SL: ${bestTrade.stopLoss}, TP1: ${bestTrade.takeProfit1}, Confluence: ${bestTrade.confluenceScore}%)` : 'N/A'}

Active Signals on Terminal:
${signalsSummary}

Recently Closed Signals (Hit TP or Hit SL):
${closedSignalsSummary}

Live Market Prices (30 Assets):
${pairsSummary}

Economic Calendar & News Events:
${eventsSummary}

Live Currency Strength Meter:
${strengthSummary}
=============================`;

      const recentHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((h: any) => `${h.isUser ? 'User' : 'Copilot'}: ${h.text}`)
            .join('\n\n')
        : '';

      const fullPrompt = recentHistory
        ? `Previous conversation context:\n${recentHistory}\n\nCurrent User Query: ${effectivePrompt}`
        : effectivePrompt;

      const cleanBase64 =
        typeof imageBase64 === 'string'
          ? imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '')
          : null;

      const contents: any = cleanBase64
        ? [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: imageMimeType || 'image/jpeg',
              },
            },
            {
              text: `The user uploaded an image alongside their question. First, carefully read and analyze everything visible inside the uploaded image (all text, alerts, pairs, entry/SL/TP prices, chart candlesticks, or MT5 trades) and directly answer their question about the image!\n\n${fullPrompt}`,
            },
          ]
        : fullPrompt;

      // Multi-model resilience: prioritize gemini-3.8-flash first and silently fall back if needed
      const modelCandidates = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
      ];

      let responseText = '';

      for (const candidateModel of modelCandidates) {
        try {
          const response = await ai.models.generateContent({
            model: candidateModel,
            contents,
            config: {
              systemInstruction,
            },
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch {
          // Silently try next candidate model
        }
      }

      if (!responseText) {
        res.json({ text: null, fallback: true });
        return;
      }

      res.json({ text: responseText });
    } catch {
      res.json({ text: null, fallback: true });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
