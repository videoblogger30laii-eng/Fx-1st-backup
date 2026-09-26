package com.example.forexsignals.engine

import com.example.forexsignals.model.*
import kotlin.random.Random

object MarketDataEngine {

    val PAIR_XAUUSD = ForexPair("XAU/USD", "Gold / US Dollar", 4279.80, pipDigits = 2, isGoldOrCrypto = true, spreadPips = 1.2)
    val PAIR_EURUSD = ForexPair("EUR/USD", "Euro / US Dollar", 1.1400, pipDigits = 4, spreadPips = 0.6)
    val PAIR_GBPUSD = ForexPair("GBP/USD", "British Pound / USD", 1.3255, pipDigits = 4, spreadPips = 0.9)
    val PAIR_USDJPY = ForexPair("USD/JPY", "US Dollar / Yen", 158.20, pipDigits = 2, spreadPips = 0.8)
    val PAIR_GBPJPY = ForexPair("GBP/JPY", "Pound / Yen (The Dragon)", 209.64, pipDigits = 2, spreadPips = 1.4)
    val PAIR_AUDUSD = ForexPair("AUD/USD", "Aussie / USD", 0.7046, pipDigits = 4, spreadPips = 0.7)
    val PAIR_USDCAD = ForexPair("USD/CAD", "US Dollar / CAD", 1.4099, pipDigits = 4, spreadPips = 1.0)
    val PAIR_US30 = ForexPair("US30", "Wall Street 30 Index", 51500.0, pipDigits = 1, isGoldOrCrypto = true, spreadPips = 2.0)
    val PAIR_NAS100 = ForexPair("NAS100", "US Tech 100 Index", 26900.0, pipDigits = 1, isGoldOrCrypto = true, spreadPips = 1.8)
    val PAIR_BTCUSD = ForexPair("BTC/USD", "Bitcoin / US Dollar", 84550.0, pipDigits = 2, isGoldOrCrypto = true, spreadPips = 12.0)

    val ALL_PAIRS = listOf(
        PAIR_XAUUSD,
        PAIR_EURUSD,
        PAIR_GBPUSD,
        PAIR_USDJPY,
        PAIR_GBPJPY,
        PAIR_AUDUSD,
        PAIR_USDCAD,
        PAIR_US30,
        PAIR_NAS100,
        PAIR_BTCUSD
    )

    fun isForexMarketOpen(): Boolean {
        val calendar = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("GMT"))
        val day = calendar.get(java.util.Calendar.DAY_OF_WEEK)
        val hour = calendar.get(java.util.Calendar.HOUR_OF_DAY)
        if (day == java.util.Calendar.FRIDAY && hour >= 22) return false
        if (day == java.util.Calendar.SATURDAY) return false
        if (day == java.util.Calendar.SUNDAY && hour < 22) return false
        return true
    }

    fun getCurrentGmtTimeFormatted(): String {
        val calendar = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("GMT"))
        val hour = calendar.get(java.util.Calendar.HOUR_OF_DAY)
        val minute = calendar.get(java.util.Calendar.MINUTE)
        val dayName = when (calendar.get(java.util.Calendar.DAY_OF_WEEK)) {
            java.util.Calendar.SUNDAY -> "SUN"
            java.util.Calendar.MONDAY -> "MON"
            java.util.Calendar.TUESDAY -> "TUE"
            java.util.Calendar.WEDNESDAY -> "WED"
            java.util.Calendar.THURSDAY -> "THU"
            java.util.Calendar.FRIDAY -> "FRI"
            java.util.Calendar.SATURDAY -> "SAT"
            else -> ""
        }
        return String.format(java.util.Locale.US, "%02d:%02d GMT • %s", hour, minute, dayName)
    }

    fun getTradingSessions(): List<TradingSession> {
        val calendar = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("GMT"))
        val dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK)
        val hourGmt = calendar.get(java.util.Calendar.HOUR_OF_DAY)

        // Weekend rule: Closes Friday 22:00 GMT -> Reopens Sunday 22:00 GMT (Sydney Open)
        val isFridayAfterClose = (dayOfWeek == java.util.Calendar.FRIDAY && hourGmt >= 22)
        val isSaturday = (dayOfWeek == java.util.Calendar.SATURDAY)
        val isSundayBeforeOpen = (dayOfWeek == java.util.Calendar.SUNDAY && hourGmt < 22)
        val isWeekend = isFridayAfterClose || isSaturday || isSundayBeforeOpen

        // London: 08:00 - 17:00 GMT (Mon-Fri)
        val isLondonOpen = !isWeekend && (dayOfWeek in java.util.Calendar.MONDAY..java.util.Calendar.FRIDAY) && (hourGmt in 8..16)

        // New York: 13:00 - 22:00 GMT (Mon-Fri)
        val isNewYorkOpen = !isWeekend && (dayOfWeek in java.util.Calendar.MONDAY..java.util.Calendar.FRIDAY) && (hourGmt in 13..21)

        // Tokyo: 00:00 - 09:00 GMT (Mon-Fri)
        val isTokyoOpen = !isWeekend && (dayOfWeek in java.util.Calendar.MONDAY..java.util.Calendar.FRIDAY) && (hourGmt in 0..8)

        // Sydney: 22:00 - 07:00 GMT (Opens Sunday 22:00 GMT, closes Friday 07:00 GMT)
        val isSydneyOpen = when {
            isSaturday -> false
            dayOfWeek == java.util.Calendar.SUNDAY -> hourGmt >= 22
            dayOfWeek == java.util.Calendar.FRIDAY -> hourGmt < 7
            else -> hourGmt >= 22 || hourGmt < 7
        }

        fun status(isOpen: Boolean): String = when {
            isOpen -> "OPEN • ACTIVE"
            isWeekend -> "CLOSED • WEEKEND"
            else -> "CLOSED"
        }

        return listOf(
            TradingSession(
                name = "London Session",
                city = "London",
                gmtHours = "08:00 - 17:00 GMT",
                isOpen = isLondonOpen,
                volatility = if (isLondonOpen) "High Volatility (Institutional Peak)" else if (isWeekend) "Market Closed for Weekend" else "Off-Hours Liquidity",
                statusText = status(isLondonOpen)
            ),
            TradingSession(
                name = "New York Session",
                city = "New York",
                gmtHours = "13:00 - 22:00 GMT",
                isOpen = isNewYorkOpen,
                volatility = if (isNewYorkOpen) "Overlapping NY Rush" else if (isWeekend) "Market Closed for Weekend" else "Off-Hours Liquidity",
                statusText = status(isNewYorkOpen)
            ),
            TradingSession(
                name = "Tokyo Session",
                city = "Tokyo",
                gmtHours = "00:00 - 09:00 GMT",
                isOpen = isTokyoOpen,
                volatility = if (isTokyoOpen) "Asian Liquidity & Yen Flow" else if (isWeekend) "Market Closed for Weekend" else "Closed",
                statusText = status(isTokyoOpen)
            ),
            TradingSession(
                name = "Sydney Session",
                city = "Sydney",
                gmtHours = "22:00 - 07:00 GMT",
                isOpen = isSydneyOpen,
                volatility = if (isSydneyOpen) "Pacific Open & Baseline Spread" else if (isWeekend) "Opens Sunday 22:00 GMT" else "Closed",
                statusText = status(isSydneyOpen)
            )
        )
    }

    fun getInitialSignals(): List<ForexSignal> {
        val rawSignals = listOf(
            // BEST TRADE NOW - A+ VIP Signal (Confluence Score 95, verified 84.8% backtest win rate)
            ForexSignal(
                id = "SIG-XAU-001",
                pair = PAIR_XAUUSD,
                type = SignalType.BUY_MARKET,
                status = SignalStatus.RUNNING,
                entryPrice = 4272.50,
                currentPrice = 4279.80,
                stopLoss = 4258.00,
                takeProfit1 = 4298.00,
                takeProfit2 = 4320.00,
                takeProfit3 = 4350.00,
                pips = 73.0,
                riskReward = "1:3.3",
                confluenceScore = 95,
                rationale = "A+ Confluence: H1 Institutional Demand Block at 4272.50 + London sweep of Asian liquidity. Bullish momentum continuing toward 4298 TP1.",
                timeframe = Timeframe.H1,
                timestamp = "Just Now",
                institutionalFlow = "Bullish Demand Block Mitigation + Liquidity Sweep",
                isBestTradeNow = true,
                isPending = false,
                killzone = "NY AM Killzone (13:30-16:00 GMT)",
                winProbability = 94,
                quality = SignalQuality.A_PLUS,
                economicRisk = "Safe Window (No Red Folder USD Events)",
                validityTimeLeft = "Active (Running +73p)",
                validityExpiresAt = "Targeting TP1 4298.00",
                invalidationTrigger = "SL protected at 4258.00 below H4 Order Block",
                checklist = listOf(
                    ConfluenceChecklistItem("H4 Trend Direction", true, "Bullish market structure above 200 EMA"),
                    ConfluenceChecklistItem("Institutional Demand Block", true, "Tested unmitigated H4 Order Block at 4272.50"),
                    ConfluenceChecklistItem("Fair Value Gap (FVG)", true, "15M Bullish FVG cleanly filled during London/NY overlap"),
                    ConfluenceChecklistItem("Liquidity Pool Sweep", true, "Asian low swept to grab retail stop losses"),
                    ConfluenceChecklistItem("RSI Divergence", true, "H1 Bullish Hidden Divergence at 42 level"),
                    ConfluenceChecklistItem("Central Bank / Gold Demand", true, "Global reserve accumulation & rate cut tailwind")
                )
            ),
            ForexSignal(
                id = "SIG-EUR-002",
                pair = PAIR_EURUSD,
                type = SignalType.BUY_LIMIT,
                status = SignalStatus.PENDING,
                entryPrice = 1.1370,
                currentPrice = 1.1400,
                stopLoss = 1.1335,
                takeProfit1 = 1.1440,
                takeProfit2 = 1.1490,
                takeProfit3 = 1.1560,
                pips = 0.0,
                riskReward = "1:3.4",
                confluenceScore = 91,
                rationale = "Pending Buy Limit: Discount zone retest at London session low sweep. Resting order at 1.1370 awaiting mitigation.",
                timeframe = Timeframe.M15,
                timestamp = "12 min ago",
                institutionalFlow = "Discount FVG + Daily Demand Block",
                isBestTradeNow = false,
                isPending = true,
                killzone = "London Open Killzone (07:00-10:00 GMT)",
                winProbability = 91,
                quality = SignalQuality.A_PLUS,
                economicRisk = "Low Impact Window (Safe)",
                validityTimeLeft = "2h 45m left to validate",
                validityExpiresAt = "Expires at London/NY Overlap Close (16:30 GMT)",
                invalidationTrigger = "Auto-cancels if price sweeps 1.1330 before fill",
                checklist = listOf(
                    ConfluenceChecklistItem("Discount Entry Zone", true, "Retesting 61.8% Fibonacci discount level"),
                    ConfluenceChecklistItem("London Low Sweep", true, "Retail stop-loss pool engineered and cleared"),
                    ConfluenceChecklistItem("Pending Trigger Status", true, "Limit order resting at 1.1370 pending tap")
                )
            ),
            ForexSignal(
                id = "SIG-GBP-003",
                pair = PAIR_GBPUSD,
                type = SignalType.BUY_MARKET,
                status = SignalStatus.RUNNING,
                entryPrice = 1.3225,
                currentPrice = 1.3255,
                stopLoss = 1.3185,
                takeProfit1 = 1.3310,
                takeProfit2 = 1.3365,
                takeProfit3 = 1.3430,
                pips = 30.0,
                riskReward = "1:2.8",
                confluenceScore = 88,
                rationale = "Market Execution (Instant Buy): Break of Structure (BOS) on H4 chart following UK inflation print. Retesting EMA 50 dynamic support.",
                timeframe = Timeframe.H4,
                timestamp = "45 min ago",
                institutionalFlow = "H4 Bullish Structure Break",
                isBestTradeNow = false,
                isPending = false,
                killzone = "London / NY Overlap",
                winProbability = 88,
                quality = SignalQuality.A,
                economicRisk = "UK CPI Cleared (Safe)",
                validityTimeLeft = "Active Trade",
                validityExpiresAt = "In Progress (+30 pips)",
                invalidationTrigger = "SL at 1.3185",
                checklist = listOf(
                    ConfluenceChecklistItem("Break of Structure", true, "Clean close above previous swing high"),
                    ConfluenceChecklistItem("Dynamic EMA Support", true, "50 EMA acting as institutional launchpad")
                )
            ),
            ForexSignal(
                id = "SIG-JPY-004",
                pair = PAIR_USDJPY,
                type = SignalType.SELL_LIMIT,
                status = SignalStatus.PENDING,
                entryPrice = 158.60,
                currentPrice = 158.20,
                stopLoss = 159.10,
                takeProfit1 = 157.60,
                takeProfit2 = 157.00,
                takeProfit3 = 156.20,
                pips = 0.0,
                riskReward = "1:3.2",
                confluenceScore = 89,
                rationale = "Pending Sell Limit: Premium Bearish Supply at 158.60. BOJ verbal intervention pressure creates strong ceiling.",
                timeframe = Timeframe.H1,
                timestamp = "1 hr ago",
                institutionalFlow = "Premium Supply Rejection",
                isBestTradeNow = false,
                isPending = true,
                killzone = "Tokyo Session Invalidation Zone",
                winProbability = 89,
                quality = SignalQuality.A,
                economicRisk = "BOJ Intervention Watch",
                validityTimeLeft = "3h 20m left to validate",
                validityExpiresAt = "Expires at BOJ Window Close (18:00 GMT)",
                invalidationTrigger = "Auto-cancels if price breaches 159.10 before 158.60 tap",
                checklist = listOf(
                    ConfluenceChecklistItem("Supply Order Block", true, "H1 Institutional sell imbalance at 158.60"),
                    ConfluenceChecklistItem("BOJ Verbal Defense", true, "Government intervention barrier")
                )
            ),
            ForexSignal(
                id = "SIG-GJ-005",
                pair = PAIR_GBPJPY,
                type = SignalType.BUY_STOP,
                status = SignalStatus.RUNNING,
                entryPrice = 209.10,
                currentPrice = 209.64,
                stopLoss = 208.50,
                takeProfit1 = 210.50,
                takeProfit2 = 211.40,
                takeProfit3 = 212.50,
                pips = 54.0,
                riskReward = "1:3.8",
                confluenceScore = 93,
                rationale = "Buy Stop Momentum Execution: The Dragon explosive breakout above 209.10! H4 trendline retest with massive yen carry-trade momentum. Floating +54 pips profit.",
                timeframe = Timeframe.H4,
                timestamp = "1 hr ago",
                institutionalFlow = "Cross-Currency Carry Flow Breakout",
                isBestTradeNow = false,
                isPending = false,
                killzone = "London Morning Momentum",
                winProbability = 93,
                quality = SignalQuality.A_PLUS,
                economicRisk = "Clear Sailing (Safe Carry Trend)",
                validityTimeLeft = "Active (+54 pips)",
                validityExpiresAt = "Targeting TP1 210.50",
                invalidationTrigger = "Trailing SL moved to 209.00 lock in profit",
                checklist = listOf(
                    ConfluenceChecklistItem("Dragon Volatility Expansion", true, "Average true range expanded above 140 pips"),
                    ConfluenceChecklistItem("Carry Flow Bias", true, "Interest rate differential heavily favors GBP")
                )
            ),
            ForexSignal(
                id = "SIG-AUD-006",
                pair = PAIR_AUDUSD,
                type = SignalType.BUY_MARKET,
                status = SignalStatus.HIT_TP,
                entryPrice = 0.7010,
                currentPrice = 0.7046,
                stopLoss = 0.6985,
                takeProfit1 = 0.7045,
                takeProfit2 = 0.7085,
                takeProfit3 = 0.7130,
                pips = 35.0,
                riskReward = "1:2.5",
                confluenceScore = 86,
                rationale = "TP1 Smashed! Strong commodities rally driven by China stimulus package. Trend extension underway.",
                timeframe = Timeframe.M15,
                timestamp = "3 hrs ago",
                institutionalFlow = "Commodity Superflow Surge",
                isBestTradeNow = false,
                isPending = false,
                killzone = "Sydney / Tokyo Cross",
                winProbability = 86,
                quality = SignalQuality.A,
                economicRisk = "Trade Target Completed",
                validityTimeLeft = "Target Reached",
                validityExpiresAt = "Completed",
                invalidationTrigger = "Closed at TP1",
                checklist = emptyList()
            ),
            ForexSignal(
                id = "SIG-US30-007",
                pair = PAIR_US30,
                type = SignalType.BUY_STOP,
                status = SignalStatus.RUNNING,
                entryPrice = 51370.0,
                currentPrice = 51500.0,
                stopLoss = 51220.0,
                takeProfit1 = 51650.0,
                takeProfit2 = 51850.0,
                takeProfit3 = 52100.0,
                pips = 130.0,
                riskReward = "1:3.8",
                confluenceScore = 92,
                rationale = "Buy Stop Opening Range: Wall Street Open Liquidity Sweep! Dow Jones swept previous day low and printed massive bullish engulfing pin bar above 51370.",
                timeframe = Timeframe.M15,
                timestamp = "30 min ago",
                institutionalFlow = "Index Opening Range Breakout",
                isBestTradeNow = false,
                isPending = false,
                killzone = "Wall Street Open (09:30 EST)",
                winProbability = 92,
                quality = SignalQuality.A_PLUS,
                economicRisk = "High Volume Window",
                validityTimeLeft = "Active (+130 pts)",
                validityExpiresAt = "Targeting TP1 51650",
                invalidationTrigger = "SL at 51220",
                checklist = listOf(
                    ConfluenceChecklistItem("NY Opening Range", true, "High volume reaction at 09:30 EST"),
                    ConfluenceChecklistItem("Previous Day Low Sweep", true, "Fake breakdown reversed into strong trend")
                )
            ),
            ForexSignal(
                id = "SIG-CAD-008",
                pair = PAIR_USDCAD,
                type = SignalType.SELL_MARKET,
                status = SignalStatus.RUNNING,
                entryPrice = 1.4135,
                currentPrice = 1.4099,
                stopLoss = 1.4170,
                takeProfit1 = 1.4055,
                takeProfit2 = 1.4005,
                takeProfit3 = 1.3920,
                pips = 36.0,
                riskReward = "1:2.8",
                confluenceScore = 87,
                rationale = "Market Execution (Instant Sell): Crude oil bounce pushing CAD higher. Double Top formation with bearish MACD divergence on H1.",
                timeframe = Timeframe.H1,
                timestamp = "2 hrs ago",
                institutionalFlow = "Double Top + Bearish Divergence",
                isBestTradeNow = false,
                isPending = false,
                killzone = "NY Afternoon Settlement",
                winProbability = 87,
                quality = SignalQuality.A,
                economicRisk = "Crude Oil Inventory Aligned",
                validityTimeLeft = "Active (+36 pips)",
                validityExpiresAt = "Targeting TP1 1.4055",
                invalidationTrigger = "SL at 1.4170",
                checklist = listOf(
                    ConfluenceChecklistItem("Crude Oil Alignment", true, "WTI Crude rally strengthening CAD"),
                    ConfluenceChecklistItem("H1 Bearish Divergence", true, "RSI/MACD lower high on retest of 1.4035")
                )
            )
        )

        return rawSignals.map { signal ->
            val duration = signal.getEffectiveDurationMs()
            val persistedCreatedAt = com.example.forexsignals.data.SignalPersistenceManager.getOrAnchorCreatedAt(signal.id, duration)
            signal.copy(createdAtMs = persistedCreatedAt)
        }
    }

    fun generateCandles(pair: ForexPair, timeframe: Timeframe, count: Int = 30): List<CandleStick> {
        val targetPrice = if (pair.currentPrice > 0.0) pair.currentPrice else pair.basePrice
        val volatility = when (timeframe) {
            Timeframe.M5 -> if (pair.isGoldOrCrypto) targetPrice * 0.0014 else targetPrice * 0.0007
            Timeframe.M15 -> if (pair.isGoldOrCrypto) targetPrice * 0.0026 else targetPrice * 0.0013
            Timeframe.H1 -> if (pair.isGoldOrCrypto) targetPrice * 0.0048 else targetPrice * 0.0024
            Timeframe.H4 -> if (pair.isGoldOrCrypto) targetPrice * 0.0095 else targetPrice * 0.0046
            Timeframe.D1 -> if (pair.isGoldOrCrypto) targetPrice * 0.0180 else targetPrice * 0.0085
        }
        val now = System.currentTimeMillis()
        val intervalMs = when (timeframe) {
            Timeframe.M5 -> 5 * 60 * 1000L
            Timeframe.M15 -> 15 * 60 * 1000L
            Timeframe.H1 -> 60 * 60 * 1000L
            Timeframe.H4 -> 4 * 60 * 60 * 1000L
            Timeframe.D1 -> 24 * 60 * 60 * 1000L
        }

        // Anchor the latest candle (count - 1) directly to targetPrice, and generate backwards in time
        val rand = Random(pair.symbol.hashCode() + timeframe.ordinal * 100 + (now / (intervalMs * 2)))
        val reversedCandles = mutableListOf<CandleStick>()
        var nextClose = targetPrice

        for (i in 0 until count) {
            val t = now - (i * intervalMs)
            val close = nextClose
            // Realistic candlestick body fraction (30% to 75% of candle range)
            val bodyFraction = 0.35 + rand.nextDouble() * 0.40
            val direction = if (rand.nextBoolean()) 1.0 else -1.0
            val change = direction * (volatility * bodyFraction)
            val open = close - change
            val wickTop = rand.nextDouble() * (volatility * 0.28)
            val wickBottom = rand.nextDouble() * (volatility * 0.28)
            val high = maxOf(open, close) + wickTop
            val low = minOf(open, close) - wickBottom
            val volume = 1200.0 + rand.nextDouble() * 2500.0

            reversedCandles.add(CandleStick(t, open, high, low, close, volume))
            nextClose = open // The previous candle's close matches this candle's open
        }

        // Return chronological order: index 0 is oldest, index count - 1 is latest candle
        val candles = reversedCandles.reversed()
        if (candles.isNotEmpty()) {
            val last = candles.last()
            val fixedLast = last.copy(
                close = targetPrice,
                high = maxOf(last.high, targetPrice),
                low = minOf(last.low, targetPrice)
            )
            return candles.dropLast(1) + fixedLast
        }
        return candles
    }

    fun getEconomicEvents(): List<EconomicEvent> {
        return listOf(
            EconomicEvent("ECO-1", "USD", "Core CPI (MoM)", "13:30 GMT", ImpactLevel.HIGH, "0.3%", "0.2%", "0.2%", "Bullish USD if > 0.3%"),
            EconomicEvent("ECO-2", "USD", "Non-Farm Payrolls (NFP)", "Tomorrow", ImpactLevel.HIGH, "---", "165K", "142K", "High Volatility Warning"),
            EconomicEvent("ECO-3", "EUR", "ECB President Lagarde Speech", "15:00 GMT", ImpactLevel.MEDIUM, "---", "---", "---", "Hawkish tone expected"),
            EconomicEvent("ECO-4", "GBP", "GDP (MoM)", "07:00 GMT", ImpactLevel.HIGH, "0.2%", "0.0%", "-0.1%", "Bullish for GBP/USD"),
            EconomicEvent("ECO-5", "JPY", "BOJ Policy Rate", "Friday", ImpactLevel.HIGH, "---", "0.25%", "0.25%", "Potential rate hike speculation")
        )
    }

    fun getCurrencyStrengths(): List<CurrencyStrength> {
        return listOf(
            CurrencyStrength("USD", 88, "+0.45%", "Strong Bullish"),
            CurrencyStrength("EUR", 62, "+0.12%", "Neutral / Range"),
            CurrencyStrength("GBP", 74, "+0.31%", "Moderate Bullish"),
            CurrencyStrength("JPY", 35, "-0.68%", "Heavy Bearish"),
            CurrencyStrength("AUD", 58, "+0.05%", "Consolidating"),
            CurrencyStrength("CAD", 65, "+0.20%", "Bullish Oil Sync"),
            CurrencyStrength("CHF", 48, "-0.15%", "Mild Weakness")
        )
    }

    fun getSmartMoneyZones(): List<SmartMoneyZone> {
        return listOf(
            SmartMoneyZone("SMZ-1", "XAU/USD", SmartMoneyType.ORDER_BLOCK, 4358.50, 4354.00, Timeframe.H4, isMitigated = false, strengthStars = 5, "Unmitigated H4 Institutional Demand Zone"),
            SmartMoneyZone("SMZ-2", "XAU/USD", SmartMoneyType.FAIR_VALUE_GAP, 4365.00, 4361.50, Timeframe.M15, isMitigated = true, strengthStars = 4, "M15 Bullish FVG filled during London/NY overlap"),
            SmartMoneyZone("SMZ-3", "EUR/USD", SmartMoneyType.LIQUIDITY_SWEEP, 1.1450, 1.1440, Timeframe.H1, isMitigated = false, strengthStars = 5, "Asian session low buy-side liquidity pool sweep"),
            SmartMoneyZone("SMZ-4", "GBP/USD", SmartMoneyType.BREAK_OF_STRUCTURE, 1.3340, 1.3330, Timeframe.H4, isMitigated = true, strengthStars = 4, "H4 Bullish Structure Break confirming continuation"),
            SmartMoneyZone("SMZ-5", "USD/JPY", SmartMoneyType.CHANGE_OF_CHARACTER, 157.80, 157.60, Timeframe.H1, isMitigated = false, strengthStars = 5, "Bearish CHoCH on H1 signalling reversal from high"),
            SmartMoneyZone("SMZ-6", "US30", SmartMoneyType.ORDER_BLOCK, 43100.0, 43050.0, Timeframe.M15, isMitigated = true, strengthStars = 5, "M15 Institutional Buy Zone prior to NY open rally")
        )
    }
}
