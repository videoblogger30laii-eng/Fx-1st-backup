package com.example.forexsignals.model

enum class SignalType(
    val label: String,
    val isBuy: Boolean,
    val executionKind: String,
    val isPendingOrder: Boolean
) {
    BUY_LIMIT("BUY LIMIT", true, "Limit Order (Pullback to Discount)", true),
    SELL_LIMIT("SELL LIMIT", false, "Limit Order (Pullback to Premium)", true),
    BUY_STOP("BUY STOP", true, "Stop Order (Momentum Breakout)", true),
    SELL_STOP("SELL STOP", false, "Stop Order (Momentum Breakdown)", true),
    BUY_MARKET("BUY (MARKET)", true, "Market Execution (Instant Buy)", false),
    SELL_MARKET("SELL (MARKET)", false, "Market Execution (Instant Sell)", false),
    BUY("BUY (MARKET)", true, "Market Execution (Instant Buy)", false),
    SELL("SELL (MARKET)", false, "Market Execution (Instant Sell)", false)
}

enum class SignalStatus(val label: String) {
    PENDING("PENDING"),
    RUNNING("RUNNING"),
    HIT_TP("HIT TP"),
    HIT_SL("HIT SL")
}

enum class SignalQuality(val label: String) {
    A_PLUS("A+ VIP (90%+)"),
    A("A High Prob"),
    B("B Moderate")
}

enum class Timeframe(val label: String) {
    M5("5M"),
    M15("15M"),
    H1("1H"),
    H4("4H"),
    D1("1D")
}

data class ConfluenceChecklistItem(
    val title: String,
    val isConfirmed: Boolean,
    val detail: String
)

data class ForexPair(
    val symbol: String,
    val name: String,
    val basePrice: Double,
    val currentPrice: Double = basePrice,
    val pipDigits: Int = 4,
    val isGoldOrCrypto: Boolean = false,
    val spreadPips: Double = 0.8
) {
    val changePips: Double get() = calculatePips(basePrice, currentPrice, isBuy = currentPrice >= basePrice)
    val changePercent: Double get() = if (basePrice > 0.0) ((currentPrice - basePrice) / basePrice) * 100.0 else 0.0
    val isPositive: Boolean get() = currentPrice >= basePrice

    val formattedBasePrice: String get() = formatPrice(basePrice)
    val formattedCurrentPrice: String get() = formatPrice(currentPrice)

    fun formatPrice(price: Double): String {
        return when (pipDigits) {
            0 -> String.format(java.util.Locale.US, "%.0f", price)
            1 -> String.format(java.util.Locale.US, "%.1f", price)
            2 -> String.format(java.util.Locale.US, "%.2f", price)
            else -> String.format(java.util.Locale.US, "%.5f", price)
        }
    }

    fun calculatePips(entry: Double, current: Double, isBuy: Boolean): Double {
        val diff = if (isBuy) current - entry else entry - current
        val multiplier = when {
            isGoldOrCrypto && pipDigits == 1 -> 1.0 // US30 / Indices points
            isGoldOrCrypto && pipDigits == 2 -> 10.0 // Gold: $0.10 per pip
            pipDigits == 2 -> 100.0 // JPY pairs
            else -> 10000.0 // 4/5 decimal Forex pairs
        }
        val pips = diff * multiplier
        return (pips * 10.0).toInt() / 10.0
    }
}

enum class SignalDirection {
    BUY,
    SELL,
    BUY_LIMIT,
    SELL_LIMIT
}

data class ForexSignal(
    val id: String,
    val pair: ForexPair,
    val type: SignalType,
    val status: SignalStatus,
    val entryPrice: Double,
    val currentPrice: Double,
    val stopLoss: Double,
    val takeProfit1: Double,
    val takeProfit2: Double,
    val takeProfit3: Double,
    val pips: Double,
    val riskReward: String,
    val confluenceScore: Int, // e.g. 94
    val rationale: String,
    val timeframe: Timeframe,
    val timestamp: String,
    val institutionalFlow: String = "Order Block + FVG Retest",
    val isBestTradeNow: Boolean = false,
    val isPending: Boolean = false,
    val isFavorite: Boolean = false,
    val hasAlert: Boolean = false,
    val checklist: List<ConfluenceChecklistItem> = emptyList(),
    val killzone: String = "London / NY Overlap",
    val winProbability: Int = 88,
    val quality: SignalQuality = SignalQuality.A_PLUS,
    val economicRisk: String = "Low Impact Window (Safe to Trade)",
    val validityTimeLeft: String = "2h 45m left",
    val validityExpiresAt: String = "NY Session Close (16:00 GMT)",
    val invalidationTrigger: String = "Auto-invalidates if opposite liquidity swept before mitigation",
    val validityDurationMs: Long = 0L,
    val createdAtMs: Long = System.currentTimeMillis(),
    val takeProfit: Double = takeProfit1,
    val isSimulated: Boolean = false
) {
    val direction: SignalDirection
        get() = when (type) {
            SignalType.BUY, SignalType.BUY_MARKET -> SignalDirection.BUY
            SignalType.BUY_LIMIT, SignalType.BUY_STOP -> SignalDirection.BUY_LIMIT
            SignalType.SELL_LIMIT, SignalType.SELL_STOP -> SignalDirection.SELL_LIMIT
            SignalType.SELL, SignalType.SELL_MARKET -> SignalDirection.SELL
        }
    /**
     * Compute remaining validity duration based on timeframe volatility and creation time.
     * Higher timeframe = wider institutional structure and longer validity window.
     */
    fun getEffectiveDurationMs(): Long {
        if (validityDurationMs > 0L) return validityDurationMs
        return when (timeframe) {
            Timeframe.M5 -> 25 * 60 * 1000L      // 25 mins (High M5 volatility)
            Timeframe.M15 -> 90 * 60 * 1000L     // 1h 30m (M15 FVG mitigation window)
            Timeframe.H1 -> 3 * 3600 * 1000L     // 3 hours (H1 Order Block life)
            Timeframe.H4 -> 12 * 3600 * 1000L    // 12 hours (H4 Institutional Swing)
            Timeframe.D1 -> 36 * 3600 * 1000L    // 36 hours (Daily Macro Zone)
        }
    }

    /**
     * Calculates remaining milliseconds before setup expires / invalidates due to market volatility.
     */
    fun getRemainingValidityMs(now: Long = System.currentTimeMillis()): Long {
        val total = getEffectiveDurationMs()
        val elapsed = (now - createdAtMs).coerceAtLeast(0L)
        return (total - elapsed).coerceAtLeast(0L)
    }

    /**
     * Formats real-time remaining countdown like "01h 42m 18s" or "24m 05s"
     */
    fun getFormattedCountdown(now: Long = System.currentTimeMillis()): String {
        val remaining = getRemainingValidityMs(now)
        if (remaining <= 0L) return "Expired (Timeframe Invalidation)"
        val hours = remaining / (3600 * 1000L)
        val minutes = (remaining % (3600 * 1000L)) / (60 * 1000L)
        val seconds = (remaining % (60 * 1000L)) / 1000L
        return if (hours > 0) {
            String.format(java.util.Locale.US, "%02dh %02dm %02ds", hours, minutes, seconds)
        } else {
            String.format(java.util.Locale.US, "%02dm %02ds", minutes, seconds)
        }
    }

    /**
     * Percentage (0.0f .. 1.0f) of validity time remaining.
     */
    fun getValidityProgress(now: Long = System.currentTimeMillis()): Float {
        val total = getEffectiveDurationMs().toFloat()
        if (total <= 0f) return 0f
        val rem = getRemainingValidityMs(now).toFloat()
        return (rem / total).coerceIn(0f, 1f)
    }

    fun getOrderKindDescription(): String = type.executionKind

    fun getTradeStateTitle(): String = when (status) {
        SignalStatus.PENDING -> "PENDING LIMIT (Awaiting Fill)"
        SignalStatus.RUNNING -> "ACTIVE / RUNNING (+${pips}p)"
        SignalStatus.HIT_TP -> "COMPLETED (TP Hit)"
        SignalStatus.HIT_SL -> "CLOSED (SL Hit)"
    }

    /**
     * Whether this signal has concluded (already reached Take Profit or Stop Loss)
     */
    val isClosed: Boolean get() = status == SignalStatus.HIT_TP || status == SignalStatus.HIT_SL

    /**
     * Whether this signal is currently live and actionable (PENDING or RUNNING)
     */
    val isActive: Boolean get() = !isClosed

    fun updateWithLiveMarket(livePrice: Double): ForexSignal {
        if (livePrice <= 0.0) return this

        val updatedPair = pair.copy(currentPrice = livePrice)
        
        // Entry price, Stop Loss, and Take Profits are the FIXED technical order parameters.
        // They must NEVER drift, recalculate or be artificially synthesized on ticks.
        val finalEntry = entryPrice
        val finalStopLoss = stopLoss
        val finalTp1 = takeProfit1
        val finalTp2 = takeProfit2
        val finalTp3 = takeProfit3

        val newStatus: SignalStatus
        val newPips: Double

        when (status) {
            SignalStatus.PENDING -> {
                // Check if live price has reached the entry level to trigger/fill the order
                val isFilled = when (type) {
                    SignalType.BUY_LIMIT -> livePrice <= finalEntry
                    SignalType.SELL_LIMIT -> livePrice >= finalEntry
                    SignalType.BUY_STOP -> livePrice >= finalEntry
                    SignalType.SELL_STOP -> livePrice <= finalEntry
                    else -> true
                }
                if (isFilled) {
                    // Order triggered and is now actively running
                    newStatus = SignalStatus.RUNNING
                    newPips = updatedPair.calculatePips(finalEntry, livePrice, isBuy = type.isBuy)
                } else {
                    newStatus = SignalStatus.PENDING
                    newPips = 0.0
                }
            }
            SignalStatus.RUNNING -> {
                // Actively track floating profit/loss
                newPips = updatedPair.calculatePips(finalEntry, livePrice, isBuy = type.isBuy)
                // Check if trade reached Take Profit or Stop Loss
                newStatus = when {
                    type.isBuy && livePrice >= finalTp1 -> SignalStatus.HIT_TP
                    type.isBuy && livePrice <= finalStopLoss -> SignalStatus.HIT_SL
                    !type.isBuy && livePrice <= finalTp1 -> SignalStatus.HIT_TP
                    !type.isBuy && livePrice >= finalStopLoss -> SignalStatus.HIT_SL
                    else -> SignalStatus.RUNNING
                }
            }
            SignalStatus.HIT_TP -> {
                newStatus = SignalStatus.HIT_TP
                newPips = pips // Preserve completed realized pips
            }
            SignalStatus.HIT_SL -> {
                newStatus = SignalStatus.HIT_SL
                newPips = pips // Preserve completed realized loss pips
            }
        }

        return copy(
            pair = updatedPair,
            entryPrice = finalEntry,
            currentPrice = livePrice,
            stopLoss = finalStopLoss,
            takeProfit1 = finalTp1,
            takeProfit2 = finalTp2,
            takeProfit3 = finalTp3,
            takeProfit = finalTp1,
            pips = (newPips * 10.0).toInt() / 10.0,
            status = newStatus,
            isPending = (newStatus == SignalStatus.PENDING),
            isSimulated = false
        )
    }

    fun calculateSlPips(): Double {
        val diff = kotlin.math.abs(entryPrice - stopLoss)
        val multiplier = if (pair.pipDigits == 2 && !pair.isGoldOrCrypto) 100.0 else if (pair.isGoldOrCrypto) 10.0 else 10000.0
        val pips = diff * multiplier
        return (pips * 10.0).toInt() / 10.0
    }

    fun calculateLotSize(accountBalance: Double, riskPercent: Double): Double {
        val riskUsd = accountBalance * (riskPercent / 100.0)
        val slPips = calculateSlPips()
        if (slPips <= 0.0) return 0.01

        val lotSize = if (pair.isGoldOrCrypto) {
            // Gold: 1 lot = 100 oz, $1.00 move = $100 -> diff in USD
            val diff = kotlin.math.abs(entryPrice - stopLoss)
            if (diff > 0) riskUsd / (diff * 100.0) else 0.01
        } else {
            // Standard FX: 1 lot = $10/pip
            riskUsd / (slPips * 10.0)
        }

        val rounded = (lotSize * 100.0).toInt() / 100.0
        return rounded.coerceIn(0.01, 50.0)
    }

    fun calculateRiskUsd(accountBalance: Double, riskPercent: Double): Double {
        return (accountBalance * (riskPercent / 100.0) * 100.0).toInt() / 100.0
    }

    fun calculateRewardUsd(accountBalance: Double, riskPercent: Double, tpLevel: Int = 1): Double {
        val riskUsd = calculateRiskUsd(accountBalance, riskPercent)
        val targetPrice = when (tpLevel) {
            1 -> takeProfit1
            2 -> takeProfit2
            else -> takeProfit3
        }
        val slDiff = kotlin.math.abs(entryPrice - stopLoss)
        val tpDiff = kotlin.math.abs(targetPrice - entryPrice)
        if (slDiff <= 0.0) return riskUsd * 2.0
        val ratio = tpDiff / slDiff
        return (riskUsd * ratio * 100.0).toInt() / 100.0
    }

    fun formatMt4Order(lots: Double? = null): String {
        val lotStr = if (lots != null && lots > 0) " Lots: ${String.format("%.2f", lots)}" else ""
        return "${type.label} ${pair.symbol.replace("/", "")} @ ${pair.formatPrice(entryPrice)} | SL: ${pair.formatPrice(stopLoss)} | TP: ${pair.formatPrice(takeProfit1)}$lotStr"
    }

    fun formatTelegramSignal(lots: Double? = null): String {
        val lotLine = if (lots != null && lots > 0) "⚖️ Rec Lot: ${String.format("%.2f", lots)}\n" else ""
        return """
            ⚡ INSTITUTIONAL FOREX SIGNAL ⚡
            Instrument: ${pair.symbol} (${type.label})
            Session: $killzone
            Tier: ${quality.label} (${confluenceScore}% Confluence)
            --------------------------------
            🎯 Entry: ${pair.formatPrice(entryPrice)}
            🛑 Stop Loss: ${pair.formatPrice(stopLoss)} (${calculateSlPips()} pips)
            ✅ Take Profit 1: ${pair.formatPrice(takeProfit1)}
            ✅ Take Profit 2: ${pair.formatPrice(takeProfit2)}
            ✅ Take Profit 3: ${pair.formatPrice(takeProfit3)}
            📊 Risk/Reward: $riskReward
            ${lotLine}🛡️ Rationale: $rationale
        """.trimIndent()
    }
}

data class CandleStick(
    val timestamp: Long,
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Double = 1000.0
) {
    val isBullish: Boolean get() = close >= open
}

data class TradingSession(
    val name: String,
    val city: String,
    val gmtHours: String,
    val isOpen: Boolean,
    val volatility: String,
    val statusText: String = if (isOpen) "OPEN • ACTIVE" else "CLOSED"
)

data class MacroAssetQuote(
    val symbol: String,
    val name: String,
    val price: Double,
    val changePercent: Double,
    val high24h: Double = 0.0,
    val low24h: Double = 0.0,
    val role: String = ""
) {
    val isPositive: Boolean get() = changePercent >= 0.0
    val formattedPrice: String get() = String.format(java.util.Locale.US, "%.2f", price)
    val formattedChange: String get() = String.format(java.util.Locale.US, "%s%.2f%%", if (isPositive) "+" else "", changePercent)
}

data class ForexNewsItem(
    val id: Long,
    val headline: String,
    val summary: String,
    val source: String,
    val url: String,
    val datetime: Long,
    val category: String = "forex"
) {
    val timeAgo: String get() {
        val diffMs = System.currentTimeMillis() - (datetime * 1000L)
        val mins = (diffMs / (60 * 1000L)).coerceAtLeast(1)
        return when {
            mins < 60 -> "${mins}m ago"
            mins < 1440 -> "${mins / 60}h ago"
            else -> "${mins / 1440}d ago"
        }
    }
}

data class CentralBankStance(
    val bank: String,
    val rate: String,
    val stance: String,
    val nextMeeting: String,
    val marketImpliedAction: String
)

data class MacroMarketData(
    val assets: List<MacroAssetQuote> = emptyList(),
    val newsArticles: List<ForexNewsItem> = emptyList(),
    val centralBankStances: List<CentralBankStance> = emptyList(),
    val marketRegime: String = "Moderate Risk-On • Balancing",
    val riskSentiment: String = "Risk-On (Equities steady, Yields stabilizing)",
    val dxyAssessment: String = "UUP Dollar Bullish Index testing 28.40; yield differential floor",
    val goldFundamentalDriver: String = "De-dollarization & central bank reserves pushing Gold above $4,350/oz",
    val lastUpdatedUtc: String = "Finnhub Live Macro Feed",
    val isLoading: Boolean = false,
    val error: String? = null
)

enum class MarketDataProvider(
    val displayName: String,
    val endpointName: String,
    val requiresKey: Boolean = false,
    val keyHint: String = "",
    val supportsCandlesticks: Boolean = true,
    val description: String = ""
) {
    TWELVE_DATA(
        "Twelve Data Live",
        "api.twelvedata.com",
        true,
        "Enter Twelve Data API Key",
        supportsCandlesticks = true,
        description = "Forex & Crypto Real-Time Spot Rates & Time-Series Candlestick Feed"
    ),
    FINNHUB(
        "Finnhub Macro & Fundamentals",
        "api.finnhub.io",
        true,
        "Enter Finnhub API Key",
        supportsCandlesticks = false,
        description = "Macro Indicators (DXY, SPY, TLT, GLD), Fundamental Factors Analysis & Real-Time News Wire"
    ),
    DERIV(
        "Deriv Live Stream",
        "ws.derivws.com",
        true,
        "Works without key (App ID 1089) or enter private token",
        supportsCandlesticks = true,
        description = "Institutional WebSocket Tick Stream for all Major FX pairs, Gold & BTC"
    ),
    INTERBANK_FEED(
        "Interbank Free Feed",
        "open.er-api.com",
        false,
        "No API Key required",
        supportsCandlesticks = true,
        description = "Free global central bank interbank rates + Binance Crypto & Spot Gold"
    ),
    YAHOO_FINANCE(
        "Yahoo Real-Time",
        "wss://stream.finance.yahoo.com",
        false,
        "Global Interbank Feed",
        supportsCandlesticks = true,
        description = "High-frequency interbank FX quotes"
    ),
    TRADING_VIEW(
        "TradingView Fastfeed",
        "data.tradingview.com/forex",
        false,
        "Institutional Feed",
        supportsCandlesticks = true,
        description = "Technical institutional charting feed"
    )
}

enum class RefreshInterval(val seconds: Int, val label: String) {
    SEC_5(5, "5s Real-Time"),
    SEC_15(15, "15s Dynamic"),
    SEC_30(30, "30s Balanced"),
    SEC_60(60, "1m Battery-Saver")
}
