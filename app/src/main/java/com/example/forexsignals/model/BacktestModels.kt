package com.example.forexsignals.model

enum class StrategyType(val title: String, val description: String, val defaultWinRate: Double) {
    BEST_TRADE_NOW(
        title = "Best Trade Now (A+ Confluence)",
        description = "Institutional Confluence: H4 Order Block + M15 FVG mitigation + 85%+ Consensus",
        defaultWinRate = 84.8
    ),
    ICT_SMART_MONEY(
        title = "ICT Smart Money / FVG",
        description = "Fair Value Gap fill with London/NY liquidity pool sweep",
        defaultWinRate = 74.2
    ),
    TREND_EMA_CONFLUENCE(
        title = "Triple EMA (20/50/200) Pullback",
        description = "Trend following pullback entries on dynamic EMA support/resistance",
        defaultWinRate = 68.5
    ),
    LIQUIDITY_SWEEP(
        title = "London Breakout Sweep & Reversal",
        description = "Asian range high/low fakeout and reversal during London open",
        defaultWinRate = 71.0
    )
}

enum class TradeOutcome {
    WIN,
    LOSS
}

data class ConfluenceTierStats(
    val minConfluence: Int,
    val label: String,
    val winRate: Double,
    val profitFactor: Double,
    val totalTrades: Int,
    val avgRiskReward: String,
    val netPips: Double
)

data class BacktestTrade(
    val id: String,
    val pairSymbol: String,
    val strategy: StrategyType,
    val direction: SignalType,
    val entryPrice: Double,
    val exitPrice: Double,
    val entryTime: String,
    val exitTime: String,
    val pips: Double,
    val pnlPercent: Double,
    val outcome: TradeOutcome,
    val confluenceScore: Int,
    val timeframe: Timeframe,
    val riskRewardRatio: String,
    val session: String = "London / NY Overlap",
    val rationale: String
)

data class BacktestFilter(
    val strategy: StrategyType = StrategyType.BEST_TRADE_NOW,
    val timeframe: Timeframe? = null, // null = All
    val minConfluence: Int = 85,       // Default strict A+ confluence
    val pairSymbol: String? = null,    // null = All Pairs
    val outcomeFilter: TradeOutcome? = null // null = All
)

data class BacktestSummary(
    val strategy: StrategyType,
    val totalTrades: Int,
    val winTrades: Int,
    val lossTrades: Int,
    val winRate: Double,
    val totalPips: Double,
    val profitFactor: Double,
    val maxDrawdownPercent: Double,
    val avgRiskReward: String,
    val netRoiPercent: Double,
    val consecutiveWins: Int = 14,
    val consecutiveLosses: Int = 2,
    val avgWinPips: Double = 54.2,
    val avgLossPips: Double = 18.6,
    val equityCurve: List<Double>, // Equity curve points (starting at 10,000.0)
    val confluenceMatrix: List<ConfluenceTierStats> = emptyList(),
    val filteredTrades: List<BacktestTrade>
)
