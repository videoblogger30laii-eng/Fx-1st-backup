package com.example.forexsignals.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.model.BacktestFilter
import com.example.forexsignals.model.StrategyType
import com.example.forexsignals.model.Timeframe
import com.example.forexsignals.model.TradeOutcome
import com.example.forexsignals.theme.*
import com.example.forexsignals.ui.components.EquityCurveChart
import com.example.forexsignals.viewmodel.ForexUiState

@Composable
fun BacktestingLabScreen(
    uiState: ForexUiState,
    onStrategySelect: (StrategyType) -> Unit,
    onTimeframeSelect: (Timeframe?) -> Unit,
    onConfluenceSelect: (Int) -> Unit,
    onPairSelect: (String?) -> Unit,
    onOutcomeSelect: (TradeOutcome?) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val summary = uiState.backtestSummary
    val currentFilter = uiState.backtestFilter

    val timeframes = listOf(
        null to "All TFs",
        Timeframe.M15 to "M15",
        Timeframe.H1 to "H1",
        Timeframe.H4 to "H4",
        Timeframe.D1 to "D1"
    )

    val confluenceTiers = listOf(
        85 to "A+ VIP (85%+)",
        90 to "Elite (90%+)",
        80 to "A (80%+)",
        70 to "All (70%+)"
    )

    val pairs = listOf(
        null to "All Pairs",
        "XAU/USD" to "Gold XAU",
        "EUR/USD" to "EUR/USD",
        "GBP/USD" to "GBP/USD",
        "USD/JPY" to "USD/JPY",
        "GBP/JPY" to "GBP/JPY",
        "US30" to "US30"
    )

    val outcomes = listOf(
        null to "All Trades",
        TradeOutcome.WIN to "Wins Only (✓)",
        TradeOutcome.LOSS to "Losses Only (✕)"
    )

    Box(modifier = modifier.fillMaxSize().background(BackgroundDark)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Lab Title & Strategy Switcher
            item {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Science,
                            contentDescription = "Lab",
                            tint = GoldAccent,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "QUANT BACKTESTING LAB",
                            color = TextPrimary,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp
                        )
                    }
                    Text(
                        text = "Dynamic simulation engine with multi-timeframe & confluence filters",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )
                }
            }

            // Strategy Selector Chips
            item {
                Text(
                    text = "SELECT STRATEGY MODEL",
                    color = TextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(StrategyType.values()) { strat ->
                        val isSelected = currentFilter.strategy == strat
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSelected) SurfaceElevated else SurfaceDark)
                                .border(
                                    1.dp,
                                    if (isSelected) GoldAccent else SurfaceBorder,
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { onStrategySelect(strat) }
                                .padding(horizontal = 12.dp, vertical = 8.dp)
                                .testTag("strat_btn_${strat.name}")
                        ) {
                            Column {
                                Text(
                                    text = strat.title,
                                    color = if (isSelected) GoldAccent else TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "${strat.defaultWinRate}% Baseline Win Rate",
                                    color = if (isSelected) TradingGreen else TextMuted,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }
            }

            // Filter Matrix: Timeframe, Confluence, Pair, Outcome
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(12.dp))
                        .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        // Timeframe Row
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Timeframe:", color = TextMuted, fontSize = 11.sp, modifier = Modifier.width(85.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(timeframes) { (tf, label) ->
                                    val isSelected = currentFilter.timeframe == tf
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (isSelected) ElectricBlue else SurfaceElevated)
                                            .clickable { onTimeframeSelect(tf) }
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = label,
                                            color = if (isSelected) TextPrimary else TextSecondary,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }

                        // Confluence Tier Row
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Min Confluence:", color = TextMuted, fontSize = 11.sp, modifier = Modifier.width(85.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(confluenceTiers) { (score, label) ->
                                    val isSelected = currentFilter.minConfluence == score
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (isSelected) GoldAccent else SurfaceElevated)
                                            .clickable { onConfluenceSelect(score) }
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = label,
                                            color = if (isSelected) BackgroundDark else TextSecondary,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }

                        // Pair Filter Row
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Asset / Pair:", color = TextMuted, fontSize = 11.sp, modifier = Modifier.width(85.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(pairs) { (pair, label) ->
                                    val isSelected = currentFilter.pairSymbol == pair
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (isSelected) TradingGreen else SurfaceElevated)
                                            .clickable { onPairSelect(pair) }
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = label,
                                            color = if (isSelected) BackgroundDark else TextSecondary,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }

                        // Trade Outcome Filter Row
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Outcome:", color = TextMuted, fontSize = 11.sp, modifier = Modifier.width(85.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(outcomes) { (outcome, label) ->
                                    val isSelected = currentFilter.outcomeFilter == outcome
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (isSelected) SurfaceBorder else SurfaceElevated)
                                            .clickable { onOutcomeSelect(outcome) }
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = label,
                                            color = if (isSelected) GoldAccent else TextSecondary,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Confluence vs Win Rate Deep Matrix
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(12.dp))
                        .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Default.Analytics, contentDescription = null, tint = GoldAccent, modifier = Modifier.size(16.dp))
                                Text("CONFLUENCE IMPACT ANALYSIS", color = GoldAccent, fontSize = 11.sp, fontWeight = FontWeight.Black)
                            }
                            Text("Tap Tier to Apply", color = TextMuted, fontSize = 9.sp)
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Table Headers
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Confluence Tier", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1.5f))
                            Text("Win Rate", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text("Profit Factor", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text("Net Pips", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        }

                        summary.confluenceMatrix.forEach { tier ->
                            val isCurrentTier = currentFilter.minConfluence == tier.minConfluence
                            val tierBg = if (isCurrentTier) SurfaceElevated else SurfaceDark
                            val winColor = if (tier.winRate >= 80.0) TradingGreen else if (tier.winRate >= 60.0) GoldAccent else TradingRed

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(tierBg)
                                    .border(1.dp, if (isCurrentTier) GoldAccent else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(6.dp))
                                    .clickable { onConfluenceSelect(tier.minConfluence) }
                                    .padding(horizontal = 6.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(tier.label, color = if (isCurrentTier) GoldAccent else TextPrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1.5f))
                                Text("${tier.winRate}%", color = winColor, fontSize = 11.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                                Text("${tier.profitFactor}", color = TextPrimary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                Text("${if (tier.netPips > 0) "+" else ""}${tier.netPips}", color = if (tier.netPips > 0) TradingGreen else TradingRed, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }
            }

            // Stat Cards Grid
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatCard(
                            label = "WIN RATE",
                            value = "${summary.winRate}%",
                            color = if (summary.winRate >= 75.0) TradingGreen else if (summary.winRate >= 50.0) GoldAccent else TradingRed,
                            subtext = "${summary.winTrades}W / ${summary.lossTrades}L (${summary.totalTrades} total)",
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            label = "PROFIT FACTOR",
                            value = "${summary.profitFactor}",
                            color = if (summary.profitFactor >= 2.0) TradingGreen else TextPrimary,
                            subtext = "Gross Gain / Loss",
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            label = "TOTAL PIPS",
                            value = "${if (summary.totalPips > 0) "+" else ""}${summary.totalPips}",
                            color = if (summary.totalPips > 0) TradingGreen else TradingRed,
                            subtext = "Net pip yield",
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatCard(
                            label = "MAX DRAWDOWN",
                            value = "${summary.maxDrawdownPercent}%",
                            color = if (summary.maxDrawdownPercent <= 6.0) TradingGreen else TradingRed,
                            subtext = "Peak-to-valley risk",
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            label = "AVG RISK/REWARD",
                            value = summary.avgRiskReward,
                            color = ElectricBlue,
                            subtext = "Target asymmetric R:R",
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            label = "ESTIMATED ROI",
                            value = "${if (summary.netRoiPercent > 0) "+" else ""}${summary.netRoiPercent}%",
                            color = if (summary.netRoiPercent > 0) TradingGreen else TradingRed,
                            subtext = "Account return",
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatCard(
                            label = "BEST STREAK",
                            value = "${summary.consecutiveWins} Wins",
                            color = TradingGreen,
                            subtext = "Max consecutive wins",
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            label = "AVG WIN",
                            value = "+${summary.avgWinPips} pips",
                            color = TradingGreen,
                            subtext = "Average winning trade",
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            label = "AVG LOSS",
                            value = "-${summary.avgLossPips} pips",
                            color = TradingRed,
                            subtext = "Average losing trade",
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Equity Curve Graph
            item {
                Text(
                    text = "EQUITY GROWTH SIMULATION",
                    color = TextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                EquityCurveChart(equityPoints = summary.equityCurve)
            }

            // Trade-by-Trade Log Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "HISTORICAL TRADE LOG (${summary.filteredTrades.size} Trades)",
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Filtered Results",
                        color = TextSecondary,
                        fontSize = 10.sp
                    )
                }
            }

            // Trade Log Items
            items(summary.filteredTrades) { trade ->
                BacktestTradeRow(trade = trade)
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun StatCard(
    label: String,
    value: String,
    color: androidx.compose.ui.graphics.Color,
    subtext: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(SurfaceDark, RoundedCornerShape(10.dp))
            .border(1.dp, SurfaceBorder, RoundedCornerShape(10.dp))
            .padding(10.dp)
    ) {
        Column {
            Text(text = label, color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(3.dp))
            Text(text = value, color = color, fontSize = 16.sp, fontWeight = FontWeight.Black)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = subtext, color = TextSecondary, fontSize = 9.sp)
        }
    }
}

@Composable
private fun BacktestTradeRow(trade: com.example.forexsignals.model.BacktestTrade) {
    val isWin = trade.outcome == TradeOutcome.WIN
    val outcomeColor = if (isWin) TradingGreen else TradingRed

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(SurfaceDark, RoundedCornerShape(8.dp))
            .border(1.dp, SurfaceBorder, RoundedCornerShape(8.dp))
            .padding(10.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(text = trade.pairSymbol, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Box(
                        modifier = Modifier
                            .background(if (trade.direction.isBuy) TradingGreen.copy(alpha = 0.2f) else TradingRed.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = trade.direction.label,
                            color = if (trade.direction.isBuy) TradingGreen else TradingRed,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(text = trade.timeframe.label, color = TextMuted, fontSize = 10.sp)
                }

                // Outcome & Pips
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(
                        modifier = Modifier
                            .background(outcomeColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = if (isWin) "WIN" else "LOSS",
                            color = outcomeColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                    Text(
                        text = "${if (trade.pips > 0) "+" else ""}${trade.pips} pips",
                        color = outcomeColor,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Rationale
            Text(
                text = trade.rationale,
                color = TextSecondary,
                fontSize = 10.sp
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Price & Confluence
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Entry: ${trade.entryPrice}  ->  Exit: ${trade.exitPrice} (${trade.session})",
                    color = TextMuted,
                    fontSize = 9.sp
                )
                Text(
                    text = "Confluence: ${trade.confluenceScore}%",
                    color = if (trade.confluenceScore >= 85) GoldAccent else TextSecondary,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
