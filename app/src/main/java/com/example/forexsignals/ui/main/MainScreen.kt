package com.example.forexsignals.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.forexsignals.theme.*
import com.example.forexsignals.ui.components.AddAlertDialog
import com.example.forexsignals.ui.components.MarketDataProviderModal
import com.example.forexsignals.ui.components.RefreshIntervalModal
import com.example.forexsignals.ui.components.TriggeredAlertBanner
import com.example.forexsignals.ui.screens.*
import com.example.forexsignals.viewmodel.ForexViewModel

enum class MainTab(val label: String, val icon: ImageVector) {
    SIGNALS("Signals", Icons.Default.TrendingUp),
    AI_CHAT("AI Copilot", Icons.Default.AutoAwesome),
    ALERTS("Alerts", Icons.Default.NotificationsActive),
    BACKTEST("Backtest", Icons.Default.Science),
    MARKETS("Markets", Icons.Default.ShowChart)
}

enum class MarketsSubTab(val label: String, val icon: ImageVector) {
    CHARTS("Charts", Icons.Default.ShowChart),
    SMC("SMC Flow", Icons.Default.Hub),
    CALENDAR("Calendar", Icons.Default.EventNote)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    modifier: Modifier = Modifier,
    viewModel: ForexViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableStateOf(MainTab.SIGNALS) }
    var selectedMarketsSubTab by remember { mutableStateOf(MarketsSubTab.CHARTS) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = SurfaceDark,
                contentColor = TextSecondary,
                tonalElevation = 8.dp,
                modifier = Modifier.testTag("main_bottom_nav")
            ) {
                MainTab.values().forEach { tab ->
                    val isSelected = selectedTab == tab
                    val badgeCount = if (tab == MainTab.ALERTS) uiState.alerts.count { it.isEnabled } else 0

                    NavigationBarItem(
                        selected = isSelected,
                        onClick = { selectedTab = tab },
                        icon = {
                            BadgedBox(
                                badge = {
                                    if (badgeCount > 0) {
                                        Badge(containerColor = GoldAccent, contentColor = BackgroundDark) {
                                            Text("$badgeCount", fontSize = 9.sp)
                                        }
                                    }
                                }
                            ) {
                                Icon(
                                    imageVector = tab.icon,
                                    contentDescription = tab.label,
                                    tint = if (isSelected) GoldAccent else TextMuted
                                )
                            }
                        },
                        label = {
                            Text(
                                text = tab.label,
                                fontSize = 10.sp,
                                color = if (isSelected) GoldAccent else TextMuted
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = GoldAccent,
                            selectedTextColor = GoldAccent,
                            indicatorColor = SurfaceElevated
                        ),
                        modifier = Modifier.testTag("nav_tab_${tab.name.lowercase()}")
                    )
                }
            }
        },
        containerColor = BackgroundDark,
        modifier = modifier
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (selectedTab) {
                MainTab.SIGNALS -> {
                    SignalsScreen(
                        uiState = uiState,
                        onFilterSelect = { filter -> viewModel.setSignalFilter(filter) },
                        onSearchChange = { q -> viewModel.setSearchQuery(q) },
                        onSortSelect = { sort -> viewModel.setSortOption(sort) },
                        onInspectSignal = { sig -> viewModel.selectSignalForDetail(sig) },
                        onToggleFavorite = { id -> viewModel.toggleFavorite(id) },
                        onToggleAlert = { id -> viewModel.toggleAlert(id) },
                        onTestBacktestClick = { selectedTab = MainTab.BACKTEST },
                        onOpenRiskModal = { viewModel.toggleRiskModal(true) },
                        onCloseRiskModal = { viewModel.toggleRiskModal(false) },
                        onOpenProviderModal = { viewModel.toggleProviderModal(true) },
                        onOpenRefreshModal = { viewModel.toggleRefreshModal(true) },
                        onManualRefresh = { viewModel.manualRefresh() },
                        onAskAiClick = { signal ->
                            val isPending = signal.status == com.example.forexsignals.model.SignalStatus.PENDING || signal.isPending
                            val stateInfo = if (isPending) "Pending Order (Valid for ${signal.validityTimeLeft})" else "Active Running Trade (+${signal.pips} pips)"
                            viewModel.sendAiChatMessage(
                                prompt = "Provide a deep institutional SMC audit for ${signal.pair.symbol} [${signal.type.label} (${signal.getOrderKindDescription()})] on ${signal.timeframe.label} timeframe. Status: $stateInfo. Entry: ${signal.pair.formatPrice(signal.entryPrice)}, SL: ${signal.pair.formatPrice(signal.stopLoss)}, TP1: ${signal.pair.formatPrice(signal.takeProfit1)}, R:R: ${signal.riskReward}, Confluence: ${signal.confluenceScore}%. Detail order type, timeframe, pending validation/invalidation, and exact lot sizing.",
                                signalContext = signal
                            )
                            selectedTab = MainTab.AI_CHAT
                        },
                        onOpenAlertsClick = {
                            selectedTab = MainTab.ALERTS
                        },
                        onSetCustomAlert = { signal ->
                            viewModel.openAddAlertModal(pair = signal.pair, prefillPrice = signal.takeProfit1)
                        }
                    )
                }
                MainTab.AI_CHAT -> {
                    AiChatScreen(
                        uiState = uiState,
                        viewModel = viewModel
                    )
                }
                MainTab.ALERTS -> {
                    AlertsScreen(
                        uiState = uiState,
                        viewModel = viewModel
                    )
                }
                MainTab.BACKTEST -> {
                    BacktestingLabScreen(
                        uiState = uiState,
                        onStrategySelect = { strat -> viewModel.updateBacktestFilter(strategy = strat) },
                        onTimeframeSelect = { tf -> viewModel.updateBacktestFilter(timeframe = tf, clearTimeframe = tf == null) },
                        onConfluenceSelect = { score -> viewModel.updateBacktestFilter(minConfluence = score) },
                        onPairSelect = { pair -> viewModel.updateBacktestFilter(pairSymbol = pair, clearPair = pair == null) },
                        onOutcomeSelect = { outcome -> viewModel.updateBacktestFilter(outcomeFilter = outcome, clearOutcome = outcome == null) }
                    )
                }
                MainTab.MARKETS -> {
                    Column(modifier = Modifier.fillMaxSize()) {
                        PrimaryTabRow(
                            selectedTabIndex = selectedMarketsSubTab.ordinal,
                            containerColor = SurfaceDark,
                            contentColor = GoldAccent
                        ) {
                            MarketsSubTab.values().forEach { subTab ->
                                Tab(
                                    selected = selectedMarketsSubTab == subTab,
                                    onClick = { selectedMarketsSubTab = subTab },
                                    text = {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(subTab.icon, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Text(subTab.label, fontSize = 12.sp)
                                        }
                                    }
                                )
                            }
                        }

                        Box(modifier = Modifier.weight(1f)) {
                            when (selectedMarketsSubTab) {
                                MarketsSubTab.CHARTS -> {
                                    ChartTerminalScreen(
                                        uiState = uiState,
                                        onPairSelect = { pair -> viewModel.selectPair(pair) },
                                        onTimeframeSelect = { tf -> viewModel.selectTimeframe(tf) }
                                    )
                                }
                                MarketsSubTab.SMC -> {
                                    SmartMoneyScreen(uiState = uiState)
                                }
                                MarketsSubTab.CALENDAR -> {
                                    FundamentalsScreen(
                                        uiState = uiState,
                                        onRefreshMacro = { viewModel.refreshMacroData() }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Real-Time Triggered Alert Banner Dropdown
            TriggeredAlertBanner(
                event = uiState.latestTriggeredBanner,
                onDismiss = { viewModel.dismissTriggeredBanner() },
                onClickAlert = {
                    viewModel.dismissTriggeredBanner()
                    selectedTab = MainTab.ALERTS
                },
                modifier = Modifier.align(Alignment.TopCenter)
            )

            // Add Alert Modal BottomSheet
            if (uiState.isAddAlertModalOpen) {
                AddAlertDialog(
                    initialPair = uiState.prefillAlertPair,
                    initialPrice = uiState.prefillAlertPrice,
                    onDismiss = { viewModel.closeAddAlertModal() },
                    onAddAlert = { pairSymbol, condition, targetPrice, note, sound, vibrate ->
                        viewModel.addPriceAlert(
                            pairSymbol = pairSymbol,
                            condition = condition,
                            targetPrice = targetPrice,
                            note = note,
                            soundEnabled = sound,
                            vibrateEnabled = vibrate
                        )
                    }
                )
            }

            // Provider Modal
            if (uiState.isProviderModalOpen) {
                MarketDataProviderModal(
                    currentProvider = uiState.marketDataProvider,
                    twelveDataKey = uiState.twelveDataApiKey,
                    finnhubKey = uiState.finnhubApiKey,
                    derivKey = uiState.derivApiKey,
                    derivAppId = uiState.derivAppId,
                    activeStatus = uiState.activeProviderStatus,
                    viewModel = viewModel,
                    onSelect = { provider -> viewModel.setMarketDataProvider(provider) },
                    onSaveApiKey = { provider, key -> viewModel.updateProviderApiKey(provider, key) },
                    onSaveDerivConfig = { appId, token -> viewModel.updateDerivCredentials(appId, token) },
                    onDismiss = { viewModel.toggleProviderModal(false) }
                )
            }

            // Refresh Interval Modal
            if (uiState.isRefreshModalOpen) {
                RefreshIntervalModal(
                    currentInterval = uiState.refreshInterval,
                    onSelect = { interval -> viewModel.setRefreshInterval(interval) },
                    onDismiss = { viewModel.toggleRefreshModal(false) }
                )
            }
        }
    }
}
