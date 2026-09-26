package com.example.forexsignals

import com.example.forexsignals.engine.MarketDataEngine
import com.example.forexsignals.model.MarketDataProvider
import com.example.forexsignals.model.SignalQuality
import com.example.forexsignals.model.SignalType
import org.junit.Assert.*
import org.junit.Test

class ForexSignalEnhancementTest {

    @Test
    fun testSignalLotSizeCalculation() {
        val signals = MarketDataEngine.getInitialSignals()
        val goldSignal = signals.first { it.pair.symbol.contains("XAU") }

        // Test with $10,000 balance and 1% risk ($100 risk)
        val lots = goldSignal.calculateLotSize(accountBalance = 10000.0, riskPercent = 1.0)
        assertTrue("Lot size should be positive and reasonable", lots > 0.0 && lots < 10.0)

        val riskUsd = goldSignal.calculateRiskUsd(10000.0, 1.0)
        assertEquals(100.0, riskUsd, 0.01)

        val slPips = goldSignal.calculateSlPips()
        assertTrue("Stop loss distance in pips should be positive", slPips > 0)
    }

    @Test
    fun testSignalMt4OrderFormatting() {
        val signals = MarketDataEngine.getInitialSignals()
        val goldSignal = signals.first { it.pair.symbol.contains("XAU") }

        val order = goldSignal.formatMt4Order(lots = 0.25)
        assertTrue("Order string should contain BUY", order.contains("BUY"))
        assertTrue("Order string should contain XAUUSD", order.contains("XAUUSD"))
        assertTrue("Order string should contain SL", order.contains("SL:"))
        assertTrue("Order string should contain TP", order.contains("TP:"))
        assertTrue("Order string should contain Lots", order.contains("Lots: 0.25"))
    }

    @Test
    fun testTelegramSignalFormatting() {
        val signals = MarketDataEngine.getInitialSignals()
        val goldSignal = signals.first { it.pair.symbol.contains("XAU") }

        val telegram = goldSignal.formatTelegramSignal(lots = 0.50)
        assertTrue("Telegram signal must include instrument", telegram.contains("XAU/USD"))
        assertTrue("Telegram signal must include session killzone", telegram.contains(goldSignal.killzone))
        assertTrue("Telegram signal must include confluence", telegram.contains("Confluence"))
    }

    @Test
    fun testVipSignalConfluenceAndQuality() {
        val signals = MarketDataEngine.getInitialSignals()
        val vipSignals = signals.filter { it.confluenceScore >= 90 }

        assertTrue("Should have multiple A+ VIP signals", vipSignals.isNotEmpty())
        vipSignals.forEach { signal ->
            assertEquals(SignalQuality.A_PLUS, signal.quality)
            assertTrue("Win probability should be >= 85%", signal.winProbability >= 85)
            assertNotNull("Killzone must be defined", signal.killzone)
            assertNotNull("Economic risk must be defined", signal.economicRisk)
        }
    }

    @Test
    fun testPendingOrderValidityAndTimeframeMetadata() {
        val signals = MarketDataEngine.getInitialSignals()
        val pendingSignals = signals.filter { it.status == com.example.forexsignals.model.SignalStatus.PENDING || it.isPending }

        assertTrue("Should have pending signals", pendingSignals.isNotEmpty())
        pendingSignals.forEach { signal ->
            assertTrue("Order kind should describe Limit or Stop", signal.getOrderKindDescription().contains("Limit") || signal.getOrderKindDescription().contains("Stop"))
            assertTrue("Validity time left should not be empty", signal.validityTimeLeft.isNotBlank())
            assertTrue("Validity expiry session should not be empty", signal.validityExpiresAt.isNotBlank())
            assertTrue("Invalidation trigger should not be empty", signal.invalidationTrigger.isNotBlank())
            assertNotNull("Timeframe must exist", signal.timeframe)
        }
    }

    @Test
    fun testPendingOrderElapsedCountdownDoesNotReset() {
        // Setup an M15 pending signal (90 minutes validity = 5,400,000 ms)
        val initialTime = 1000000000L
        val testSignal = com.example.forexsignals.model.ForexSignal(
            id = "TEST-SIG-M15",
            pair = MarketDataEngine.PAIR_EURUSD,
            type = com.example.forexsignals.model.SignalType.BUY_LIMIT,
            status = com.example.forexsignals.model.SignalStatus.PENDING,
            entryPrice = 1.1370,
            currentPrice = 1.1400,
            stopLoss = 1.1335,
            takeProfit1 = 1.1440,
            takeProfit2 = 1.1490,
            takeProfit3 = 1.1560,
            pips = 0.0,
            riskReward = "1:3.4",
            confluenceScore = 91,
            rationale = "Pending buy limit test",
            timeframe = com.example.forexsignals.model.Timeframe.M15,
            timestamp = "Just now",
            institutionalFlow = "FVG",
            isPending = true,
            createdAtMs = initialTime
        )

        // At t = 0 min: remaining = 90 mins (1h 30m)
        assertEquals(90 * 60 * 1000L, testSignal.getEffectiveDurationMs())
        assertEquals(90 * 60 * 1000L, testSignal.getRemainingValidityMs(initialTime))
        assertEquals("01h 30m 00s", testSignal.getFormattedCountdown(initialTime))

        // Reopening app after 30 minutes (elapsed = 30 min): remaining must be 60 min (1h 00m), NOT reset to 1h 30m!
        val after30Min = initialTime + (30 * 60 * 1000L)
        assertEquals(60 * 60 * 1000L, testSignal.getRemainingValidityMs(after30Min))
        assertEquals("01h 00m 00s", testSignal.getFormattedCountdown(after30Min))

        // Reopening app after 85 minutes: remaining must be 5 minutes
        val after85Min = initialTime + (85 * 60 * 1000L)
        assertEquals(5 * 60 * 1000L, testSignal.getRemainingValidityMs(after85Min))
        assertEquals("05m 00s", testSignal.getFormattedCountdown(after85Min))

        // Reopening app after 95 minutes: order is expired
        val after95Min = initialTime + (95 * 60 * 1000L)
        assertEquals(0L, testSignal.getRemainingValidityMs(after95Min))
        assertTrue("Formatted string must indicate expired window", testSignal.getFormattedCountdown(after95Min).contains("Expired"))
    }

    @Test
    fun testBestTradeNowMetadata() {
        val signals = MarketDataEngine.getInitialSignals()
        val bestTrade = signals.firstOrNull { it.isBestTradeNow }

        assertNotNull("Best trade now must exist", bestTrade)
        assertTrue("Trade state title should describe status", bestTrade!!.getTradeStateTitle().isNotBlank())
        assertTrue("Order kind description should be clear", bestTrade.getOrderKindDescription().isNotBlank())
        assertEquals(com.example.forexsignals.model.Timeframe.H1, bestTrade.timeframe)
    }

    @Test
    fun testTradingSessionsAndWeekendCalculation() {
        val sessions = MarketDataEngine.getTradingSessions()
        assertEquals(4, sessions.size)
        val sessionNames = sessions.map { it.name }
        assertTrue(sessionNames.contains("London Session"))
        assertTrue(sessionNames.contains("New York Session"))
        assertTrue(sessionNames.contains("Tokyo Session"))
        assertTrue(sessionNames.contains("Sydney Session"))

        val gmtTimeFormatted = MarketDataEngine.getCurrentGmtTimeFormatted()
        assertTrue("GMT time string should contain GMT", gmtTimeFormatted.contains("GMT"))

        // Verify Saturday logic: if today is Saturday, all sessions must be closed
        val calendar = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("GMT"))
        if (calendar.get(java.util.Calendar.DAY_OF_WEEK) == java.util.Calendar.SATURDAY) {
            assertFalse("Forex market must be closed on Saturday", MarketDataEngine.isForexMarketOpen())
            sessions.forEach { session ->
                assertFalse("${session.name} must be closed on Saturday", session.isOpen)
                assertTrue("Status must indicate closed or weekend", session.statusText.contains("CLOSED"))
            }
        }
    }

    @Test
    fun testRealMarketDataRatesIntegrity() {
        // Test that base pairs match realistic institutional market levels
        val eur = MarketDataEngine.PAIR_EURUSD
        assertTrue("EUR/USD rate should be realistic (> 1.00)", eur.basePrice > 1.00 && eur.basePrice < 1.30)

        val gbp = MarketDataEngine.PAIR_GBPUSD
        assertTrue("GBP/USD rate should be realistic (> 1.15)", gbp.basePrice > 1.15 && gbp.basePrice < 1.50)

        val jpy = MarketDataEngine.PAIR_USDJPY
        assertTrue("USD/JPY rate should be realistic (> 130)", jpy.basePrice > 130.0 && jpy.basePrice < 170.0)

        val gold = MarketDataEngine.PAIR_XAUUSD
        assertTrue("XAU/USD Gold rate should be realistic (> 2000)", gold.basePrice > 2000.0 && gold.basePrice < 6000.0)

        val btc = MarketDataEngine.PAIR_BTCUSD
        assertTrue("BTC/USD rate should be realistic (> 40000)", btc.basePrice > 40000.0)
    }

    @Test
    fun testFinnhubProviderMacroRole() {
        // Verify Finnhub is marked for Macro / Live fundamentals, not candlesticks
        assertFalse("Finnhub is not for candlestick charts", MarketDataProvider.FINNHUB.supportsCandlesticks)
        assertTrue("Twelve Data supports candlesticks", MarketDataProvider.TWELVE_DATA.supportsCandlesticks)
        assertTrue("Deriv supports candlesticks", MarketDataProvider.DERIV.supportsCandlesticks)
    }

    @Test
    fun testCandlestickAnchoringToLivePrice() {
        val testPair = MarketDataEngine.PAIR_EURUSD.copy(currentPrice = 1.14776)
        val candles = MarketDataEngine.generateCandles(testPair, com.example.forexsignals.model.Timeframe.M5, 30)

        assertEquals("Should produce exactly 30 candles", 30, candles.size)
        val lastCandle = candles.last()

        // The newest candle close must match currentPrice down to 0.00001
        assertEquals("Latest candle close must match live pair price", 1.14776, lastCandle.close, 0.00001)
        assertTrue("High must be >= close", lastCandle.high >= lastCandle.close)
        assertTrue("Low must be <= close", lastCandle.low <= lastCandle.close)
    }

    @Test
    fun testGoldAndBtcCandleAnchoring() {
        val goldPair = MarketDataEngine.PAIR_XAUUSD.copy(currentPrice = 4345.50)
        val goldCandles = MarketDataEngine.generateCandles(goldPair, com.example.forexsignals.model.Timeframe.H1, 20)
        assertEquals("Gold latest candle must match live gold price", 4345.50, goldCandles.last().close, 0.01)

        val btcPair = MarketDataEngine.PAIR_BTCUSD.copy(currentPrice = 84500.0)
        val btcCandles = MarketDataEngine.generateCandles(btcPair, com.example.forexsignals.model.Timeframe.M15, 20)
        assertEquals("BTC latest candle must match live BTC price", 84500.0, btcCandles.last().close, 0.1)
    }

    @Test
    fun testYahooFinanceProviderCandleSupport() {
        assertTrue("Yahoo Finance supports candlesticks", MarketDataProvider.YAHOO_FINANCE.supportsCandlesticks)
        assertFalse("Yahoo Finance does not require API key", MarketDataProvider.YAHOO_FINANCE.requiresKey)
    }
}
