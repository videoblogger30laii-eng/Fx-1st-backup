package com.example.forexsignals

import com.example.forexsignals.engine.BacktestEngine
import com.example.forexsignals.model.BacktestFilter
import com.example.forexsignals.model.StrategyType
import org.junit.Assert.assertTrue
import org.junit.Test

class ForexBacktestEngineTest {

    @Test
    fun bestTradeNow_withHighConfluence_achievesHighWinRate() {
        val filter = BacktestFilter(
            strategy = StrategyType.BEST_TRADE_NOW,
            minConfluence = 85
        )
        val summary = BacktestEngine.runBacktest(filter)
        assertTrue("Best Trade Now win rate should be >= 80% with A+ confluence", summary.winRate >= 80.0)
        assertTrue("Profit factor should be >= 2.0", summary.profitFactor >= 2.0)
    }

    @Test
    fun bestTradeNow_withLowConfluence_exposesLowerAccuracy() {
        val highConfluenceFilter = BacktestFilter(
            strategy = StrategyType.BEST_TRADE_NOW,
            minConfluence = 85
        )
        val lowConfluenceFilter = BacktestFilter(
            strategy = StrategyType.BEST_TRADE_NOW,
            minConfluence = 70
        )
        val highSummary = BacktestEngine.runBacktest(highConfluenceFilter)
        val lowSummary = BacktestEngine.runBacktest(lowConfluenceFilter)

        assertTrue(
            "High confluence setup should significantly outperform unselective entry",
            highSummary.winRate > lowSummary.winRate
        )
    }
}
