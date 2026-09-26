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
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.engine.MarketDataEngine
import com.example.forexsignals.model.ForexPair
import com.example.forexsignals.model.Timeframe
import com.example.forexsignals.theme.*
import com.example.forexsignals.ui.components.CandlestickChart
import com.example.forexsignals.viewmodel.ForexUiState

@Composable
fun ChartTerminalScreen(
    uiState: ForexUiState,
    onPairSelect: (ForexPair) -> Unit,
    onTimeframeSelect: (Timeframe) -> Unit,
    modifier: Modifier = Modifier
) {
    var showEma by remember { mutableStateOf(true) }
    var showBollinger by remember { mutableStateOf(true) }
    var showRsi by remember { mutableStateOf(true) }

    Box(modifier = modifier.fillMaxSize().background(BackgroundDark)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Pair Selector with Live Rates & Base Price
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(uiState.allPairs) { pair ->
                        val isSelected = uiState.selectedPair.symbol == pair.symbol
                        val isPos = pair.isPositive
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) SurfaceElevated else SurfaceDark)
                                .border(
                                    1.dp,
                                    if (isSelected) TradingGreen else SurfaceBorder,
                                    RoundedCornerShape(8.dp)
                                )
                                .clickable { onPairSelect(pair) }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = pair.symbol,
                                        color = if (isSelected) TradingGreen else TextPrimary,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "${if (isPos) "+" else ""}${pair.changePips}p",
                                        color = if (isPos) TradingGreen else TradingRed,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = "Base: ${pair.formattedBasePrice}",
                                        color = TextMuted,
                                        fontSize = 9.sp
                                    )
                                    Text(
                                        text = "Live: ${pair.formattedCurrentPrice}",
                                        color = if (isSelected) TextPrimary else TextSecondary,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Price & Header Info: Showing Base Price & Current Live Price
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = uiState.selectedPair.symbol,
                            color = TextPrimary,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = uiState.selectedPair.name,
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Base Price: ${uiState.selectedPair.formattedBasePrice}",
                            color = TextMuted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = uiState.selectedPair.formattedCurrentPrice,
                            color = TextPrimary,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            val isPos = uiState.selectedPair.isPositive
                            Text(
                                text = "${if (isPos) "+" else ""}${uiState.selectedPair.changePips} pips (${String.format(java.util.Locale.US, "%+.2f%%", uiState.selectedPair.changePercent)})",
                                color = if (isPos) TradingGreen else TradingRed,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "• Spread: ${uiState.selectedPair.spreadPips}p",
                                color = ElectricBlue,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            // Timeframe Selector & Indicator Toggles
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Timeframe.values().forEach { tf ->
                            val isSelected = uiState.selectedTimeframe == tf
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (isSelected) TradingGreen else SurfaceElevated)
                                    .clickable { onTimeframeSelect(tf) }
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = tf.label,
                                    color = if (isSelected) BackgroundDark else TextSecondary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        IndicatorPill("EMA", showEma) { showEma = !showEma }
                        IndicatorPill("BB", showBollinger) { showBollinger = !showBollinger }
                        IndicatorPill("RSI", showRsi) { showRsi = !showRsi }
                    }
                }
            }

            // Candlestick Chart View
            item {
                CandlestickChart(
                    candles = uiState.candles,
                    selectedPair = uiState.selectedPair,
                    timeframe = uiState.selectedTimeframe,
                    showEma = showEma,
                    showBollinger = showBollinger,
                    showRsi = showRsi,
                    providerLabel = uiState.marketDataProvider.displayName
                )
            }

            // Data Providers Sync Breakdown (Explicitly reveals which provider syncs what)
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(12.dp))
                        .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "DATA PROVIDER ROUTING & SYNC MATRIX",
                                color = TextMuted,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Box(
                                modifier = Modifier
                                    .background(TradingGreen.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "SYNCHRONIZED",
                                    color = TradingGreen,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        val candleEngine = when {
                            uiState.selectedPair.symbol == "BTC/USD" -> "Binance Klines (Real-time Spot API)"
                            uiState.selectedPair.symbol == "XAU/USD" -> "Binance PAXG / Spot Gold Bullion Feed"
                            else -> "Yahoo Finance Real-Time OHLC & Interbank Engine"
                        }

                        SyncProviderRow(
                            section = "Candlesticks (${uiState.selectedTimeframe.label})",
                            provider = candleEngine,
                            role = "Syncs historical & forming 5M–1D OHLC bars",
                            accentColor = ElectricBlue
                        )

                        SyncProviderRow(
                            section = "Live Ticks / Streaming",
                            provider = "Deriv WebSocket (App ID: ${uiState.derivAppId})",
                            role = "Syncs real-time quote, Entry, SL, TP & live bar",
                            accentColor = GoldAccent
                        )

                        SyncProviderRow(
                            section = "Macro Indicators & News",
                            provider = "Finnhub Institutional API",
                            role = "Syncs DXY (UUP), SPY, QQQ, TLT & Forex News Wire",
                            accentColor = TradingGreen
                        )
                    }
                }
            }

            // Technical Indicators Dashboard
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(12.dp))
                        .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "TECHNICAL INDICATORS (CONFLUENCE ENGINE)",
                            color = TextMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            IndicatorRow("RSI (14)", "52.4", "Neutral Momentum", TextPrimary)
                            IndicatorRow("MACD", "+0.0018", "Bullish Crossover", TradingGreen)
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            IndicatorRow("EMA 200", "Above Trendline", "Bullish Dominance", TradingGreen)
                            IndicatorRow("ATR (14)", "42 Pips Volatility", "Optimal Range", ElectricBlue)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SyncProviderRow(
    section: String,
    provider: String,
    role: String,
    accentColor: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(SurfaceElevated.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = section, color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Text(text = role, color = TextMuted, fontSize = 9.sp)
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = provider,
            color = accentColor,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun IndicatorPill(label: String, active: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(if (active) ElectricBlue.copy(alpha = 0.2f) else SurfaceElevated)
            .border(1.dp, if (active) ElectricBlue else SurfaceBorder, RoundedCornerShape(6.dp))
            .clickable { onClick() }
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = label,
            color = if (active) ElectricBlue else TextSecondary,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun IndicatorRow(name: String, value: String, signal: String, signalColor: androidx.compose.ui.graphics.Color) {
    Column {
        Text(name, color = TextMuted, fontSize = 10.sp)
        Text(value, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(signal, color = signalColor, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
    }
}
