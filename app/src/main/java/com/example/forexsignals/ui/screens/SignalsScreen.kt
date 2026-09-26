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
import com.example.forexsignals.model.ForexSignal
import com.example.forexsignals.theme.*
import com.example.forexsignals.ui.components.*
import com.example.forexsignals.viewmodel.ForexUiState

@Composable
fun SignalsScreen(
    uiState: ForexUiState,
    onFilterSelect: (String) -> Unit,
    onSearchChange: (String) -> Unit,
    onSortSelect: (String) -> Unit,
    onInspectSignal: (ForexSignal?) -> Unit,
    onToggleFavorite: (String) -> Unit,
    onToggleAlert: (String) -> Unit,
    onTestBacktestClick: () -> Unit,
    onOpenRiskModal: () -> Unit,
    onCloseRiskModal: () -> Unit,
    onOpenProviderModal: () -> Unit,
    onOpenRefreshModal: () -> Unit,
    onManualRefresh: () -> Unit,
    onAskAiClick: (ForexSignal) -> Unit = {},
    onOpenAlertsClick: () -> Unit = {},
    onSetCustomAlert: (ForexSignal) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val activeSignals = remember(uiState.signals) { uiState.signals.filter { it.isActive } }
    val filters = listOf(
        "ALL" to "Active (${activeSignals.size})",
        "VIP" to "🔥 A+ VIP (${activeSignals.count { it.confluenceScore >= 90 }})",
        "RUNNING" to "Running (${activeSignals.count { it.status.name == "RUNNING" }})",
        "PENDING" to "Pending (${activeSignals.count { it.status.name == "PENDING" }})",
        "GOLD" to "Gold XAU",
        "INDICES" to "US30 / Indices",
        "FAVORITES" to "Watchlist (${activeSignals.count { it.isFavorite }})",
        "HISTORY" to "Closed / History (${uiState.signals.count { it.isClosed }})"
    )

    val bestTrade = activeSignals.firstOrNull { it.isBestTradeNow } ?: activeSignals.firstOrNull()

    Box(modifier = modifier.fillMaxSize().background(BackgroundDark)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Live Feed Provider & Refresh Interval Bar
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Feed Provider Pill
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(SurfaceElevated)
                            .border(1.dp, SurfaceBorder, RoundedCornerShape(20.dp))
                            .clickable { onOpenProviderModal() }
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .background(if (uiState.isMarketOpen) TradingGreen else TextMuted, RoundedCornerShape(50))
                        )
                        Text(
                            text = if (uiState.isMarketOpen) uiState.marketDataProvider.displayName else "Market Closed (Friday Rates)",
                            color = if (uiState.isMarketOpen) TextPrimary else TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        // Quick Refresh Button
                        IconButton(
                            onClick = onManualRefresh,
                            modifier = Modifier
                                .size(32.dp)
                                .background(SurfaceElevated, RoundedCornerShape(8.dp))
                                .border(1.dp, SurfaceBorder, RoundedCornerShape(8.dp))
                                .testTag("top_refresh_btn")
                        ) {
                            if (uiState.isRefreshing) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    color = ElectricBlue,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = "Sync Live Interbank Rates",
                                    tint = ElectricBlue,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }

                        // Refresh interval pill
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(SurfaceElevated)
                                .border(1.dp, SurfaceBorder, RoundedCornerShape(20.dp))
                                .clickable { onOpenRefreshModal() }
                                .padding(horizontal = 8.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = uiState.refreshInterval.label,
                                color = ElectricBlue,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        // Alerts Button with badge
                        BadgedBox(
                            badge = {
                                val activeAlertsCount = uiState.alerts.count { it.isEnabled }
                                if (activeAlertsCount > 0) {
                                    Badge(containerColor = GoldAccent, contentColor = BackgroundDark) {
                                        Text("$activeAlertsCount", fontSize = 9.sp, fontWeight = FontWeight.Black)
                                    }
                                }
                            }
                        ) {
                            IconButton(
                                onClick = onOpenAlertsClick,
                                modifier = Modifier
                                    .size(32.dp)
                                    .background(SurfaceElevated, RoundedCornerShape(8.dp))
                                    .testTag("top_alerts_btn")
                            ) {
                                Icon(
                                    imageVector = Icons.Default.NotificationsActive,
                                    contentDescription = "Alerts Center",
                                    tint = GoldAccent,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        // AI Copilot Fast Launch Button
                        IconButton(
                            onClick = { if (bestTrade != null) onAskAiClick(bestTrade) else onAskAiClick(uiState.signals.first()) },
                            modifier = Modifier
                                .size(32.dp)
                                .background(SurfaceElevated, RoundedCornerShape(8.dp))
                                .testTag("top_ai_copilot_btn")
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = "AI Copilot",
                                tint = ElectricBlue,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        // Risk Calculator Button
                        IconButton(
                            onClick = onOpenRiskModal,
                            modifier = Modifier
                                .size(32.dp)
                                .background(SurfaceElevated, RoundedCornerShape(8.dp))
                                .testTag("open_risk_calc_btn")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Calculate,
                                contentDescription = "Risk Calculator",
                                tint = TradingGreen,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        // Manual Refresh Button
                        IconButton(
                            onClick = onManualRefresh,
                            modifier = Modifier
                                .size(32.dp)
                                .background(SurfaceElevated, RoundedCornerShape(8.dp))
                                .testTag("manual_refresh_btn")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = TextPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            // Global Trading Sessions Clock
            item {
                TradingSessionsClock(sessions = uiState.tradingSessions)
            }

            // Live Forex & Crypto Pairs: Base Price vs Current Price Carousel
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(modifier = Modifier.size(7.dp).background(TradingGreen, RoundedCornerShape(50)))
                            Text(
                                text = "LIVE PAIR RATES",
                                color = TextPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Text(
                            text = "Streaming Ticks",
                            color = TextMuted,
                            fontSize = 10.sp
                        )
                    }

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(uiState.allPairs) { pair ->
                            val isPos = pair.isPositive
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(SurfaceDark)
                                    .border(1.dp, SurfaceBorder, RoundedCornerShape(10.dp))
                                    .padding(horizontal = 10.dp, vertical = 7.dp)
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = pair.symbol,
                                            color = TextPrimary,
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
                                    Text(
                                        text = pair.formattedCurrentPrice,
                                        color = TextPrimary,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // BEST TRADE NOW Highlight Hero Card
            if (bestTrade != null) {
                item {
                    BestTradeHeroCard(
                        signal = bestTrade,
                        onTestBacktestClick = onTestBacktestClick,
                        onInspect = { onInspectSignal(bestTrade) },
                        onAskAi = { onAskAiClick(bestTrade) },
                        nowClockMs = uiState.nowClockMs
                    )
                }
            }

            // Multi-Timeframe Matrix Preview
            item {
                MultiTimeframeMatrix()
            }

            // Search Bar & Sort Row
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Search text field
                    OutlinedTextField(
                        value = uiState.searchQuery,
                        onValueChange = { onSearchChange(it) },
                        placeholder = { Text("Search pairs, gold, rationale...", color = TextMuted, fontSize = 12.sp) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted, modifier = Modifier.size(18.dp)) },
                        trailingIcon = {
                            if (uiState.searchQuery.isNotEmpty()) {
                                IconButton(onClick = { onSearchChange("") }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Clear", tint = TextMuted, modifier = Modifier.size(16.dp))
                                }
                            }
                        },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = GoldAccent,
                            unfocusedBorderColor = SurfaceBorder,
                            focusedContainerColor = SurfaceDark,
                            unfocusedContainerColor = SurfaceDark,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    )

                    // Sort Chips
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Sort by:", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(
                                "CONFLUENCE" to "Confluence",
                                "PIPS" to "Top Pips",
                                "RECENT" to "Newest"
                            ).forEach { (key, label) ->
                                val isSelected = uiState.sortOption == key
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (isSelected) SurfaceElevated else SurfaceDark)
                                        .border(1.dp, if (isSelected) GoldAccent else SurfaceBorder, RoundedCornerShape(6.dp))
                                        .clickable { onSortSelect(key) }
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Text(
                                        text = label,
                                        color = if (isSelected) GoldAccent else TextSecondary,
                                        fontSize = 10.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Filter Tabs (All, Running, Pending, Won, Gold, Indices, Favorites)
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(filters) { (key, label) ->
                        val isSelected = uiState.selectedSignalFilter == key
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (isSelected) TradingGreen else SurfaceDark)
                                .border(
                                    1.dp,
                                    if (isSelected) TradingGreen else SurfaceBorder,
                                    RoundedCornerShape(20.dp)
                                )
                                .clickable { onFilterSelect(key) }
                                .padding(horizontal = 14.dp, vertical = 7.dp)
                                .testTag("filter_tab_$key")
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) BackgroundDark else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium
                            )
                        }
                    }
                }
            }

            // Section Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "LIVE SIGNALS FEED",
                        color = TextMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "${uiState.filteredSignals.size} Signals Active",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )
                }
            }

            // Signal Cards
            items(uiState.filteredSignals) { signal ->
                SignalCard(
                    signal = signal,
                    onClick = { onInspectSignal(signal) },
                    onToggleFavorite = { onToggleFavorite(signal.id) },
                    onToggleAlert = { onToggleAlert(signal.id) },
                    onAskAi = { onAskAiClick(signal) },
                    nowClockMs = uiState.nowClockMs
                )
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
            }
        }

        // Signal Detail Bottom Sheet
        if (uiState.selectedSignalForDetail != null) {
            SignalDetailSheet(
                signal = uiState.selectedSignalForDetail,
                onDismiss = { onInspectSignal(null) },
                onTestInBacktest = {
                    onInspectSignal(null)
                    onTestBacktestClick()
                },
                onToggleAlert = { onToggleAlert(uiState.selectedSignalForDetail.id) },
                onToggleFavorite = { onToggleFavorite(uiState.selectedSignalForDetail.id) },
                onAskAi = { sig ->
                    onInspectSignal(null)
                    onAskAiClick(sig)
                },
                onSetCustomAlert = { sig ->
                    onInspectSignal(null)
                    onSetCustomAlert(sig)
                },
                nowClockMs = uiState.nowClockMs
            )
        }

        // Risk Modal
        if (uiState.isRiskModalOpen) {
            RiskCalculatorModal(onDismiss = onCloseRiskModal)
        }
    }
}
