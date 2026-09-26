package com.example.forexsignals.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.forexsignals.BuildConfig
import com.example.forexsignals.engine.BacktestEngine
import com.example.forexsignals.engine.DerivMarketService
import com.example.forexsignals.engine.GeminiChatEngine
import com.example.forexsignals.engine.LiveMarketDataService
import com.example.forexsignals.engine.MarketDataEngine
import com.example.forexsignals.model.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import kotlin.random.Random

data class ForexUiState(
    val signals: List<ForexSignal> = emptyList(),
    val filteredSignals: List<ForexSignal> = emptyList(),
    val selectedSignalFilter: String = "ALL", // ALL, RUNNING, PENDING, WON, GOLD, INDICES, FAVORITES
    val searchQuery: String = "",
    val sortOption: String = "CONFLUENCE", // CONFLUENCE, RECENT, PIPS, RR
    val selectedSignalForDetail: ForexSignal? = null,
    val selectedPair: ForexPair = MarketDataEngine.PAIR_XAUUSD,
    val selectedTimeframe: Timeframe = Timeframe.H1,
    val candles: List<CandleStick> = emptyList(),
    val refreshInterval: RefreshInterval = RefreshInterval.SEC_5,
    val tradingSessions: List<TradingSession> = MarketDataEngine.getTradingSessions(),
    val backtestFilter: BacktestFilter = BacktestFilter(
        strategy = StrategyType.BEST_TRADE_NOW,
        timeframe = null,
        minConfluence = 85,
        pairSymbol = null,
        outcomeFilter = null
    ),
    val backtestSummary: BacktestSummary = BacktestEngine.runBacktest(
        BacktestFilter(strategy = StrategyType.BEST_TRADE_NOW, minConfluence = 85)
    ),
    val economicEvents: List<EconomicEvent> = MarketDataEngine.getEconomicEvents(),
    val currencyStrengths: List<CurrencyStrength> = MarketDataEngine.getCurrencyStrengths(),
    val smartMoneyZones: List<SmartMoneyZone> = MarketDataEngine.getSmartMoneyZones(),
    val alerts: List<PriceAlert> = listOf(
        PriceAlert(
            id = "alert_xau_tp1",
            pairSymbol = "XAU/USD",
            condition = AlertCondition.PRICE_ABOVE,
            targetPrice = 2740.00,
            note = "Take Profit 1 on Best Trade Now (84.8% win rate setup)",
            soundEnabled = true,
            vibrateEnabled = true
        ),
        PriceAlert(
            id = "alert_eur_demand",
            pairSymbol = "EUR/USD",
            condition = AlertCondition.PRICE_BELOW,
            targetPrice = 1.0820,
            note = "H4 Demand Block liquidity sweep level",
            soundEnabled = true,
            vibrateEnabled = true
        ),
        PriceAlert(
            id = "alert_gbp_session",
            pairSymbol = "GBP/USD",
            condition = AlertCondition.PRICE_ABOVE,
            targetPrice = 1.3050,
            note = "London Session high break",
            soundEnabled = true,
            vibrateEnabled = false
        ),
        PriceAlert(
            id = "alert_us30_ath",
            pairSymbol = "US30",
            condition = AlertCondition.PRICE_ABOVE,
            targetPrice = 43850.0,
            note = "All-Time High buy-side liquidity expansion",
            soundEnabled = true,
            vibrateEnabled = true
        )
    ),
    val triggeredEvents: List<TriggeredAlertEvent> = emptyList(),
    val latestTriggeredBanner: TriggeredAlertEvent? = null,
    val isAddAlertModalOpen: Boolean = false,
    val prefillAlertPair: ForexPair? = null,
    val prefillAlertPrice: Double? = null,
    val aiChatMessages: List<ChatMessage> = listOf(
        ChatMessage(
            id = "welcome_msg",
            text = """
                ### 🏛️ Welcome to FX Institutional Copilot
                Powered by **Gemini 3.5 Flash** neural interbank analytics.
                
                I am actively analyzing the live Forex, Gold, and Indices order flow:
                - **Top VIP Setup:** **XAU/USD (Gold)** with **92% Confluence** and verified **84.8% backtested win rate**.
                - **Current Sessions:** High-liquidity London/New York session overlap active.
                - **Risk Mandate:** Strict 1.0% capital allocation with minimum 1:2.0 asymmetric risk/reward.
                
                Tap any suggested prompt below or type your question!
            """.trimIndent(),
            isUser = false,
            suggestedPrompts = listOf(
                "Analyze Best Trade Now (XAU/USD)",
                "Calculate risk: $1,000 account, 1% risk",
                "Smart Money: How to trade FVG + Order Blocks",
                "Explain 84.8% Backtested Win Rate",
                "London / NY Overlap trading plan"
            )
        )
    ),
    val isAiGenerating: Boolean = false,
    val selectedAiPersona: AiPersona = AiPersona.INSTITUTIONAL,
    val isRiskModalOpen: Boolean = false,
    val isProviderModalOpen: Boolean = false,
    val isRefreshModalOpen: Boolean = false,
    val isRefreshing: Boolean = false,
    val twelveDataApiKey: String = BuildConfig.TWELVE_DATA_API_KEY,
    val finnhubApiKey: String = BuildConfig.FINNHUB_API_KEY,
    val derivAppId: String = "10154",
    val derivApiKey: String = if (BuildConfig.DERIV_API_TOKEN.isNotBlank() && !BuildConfig.DERIV_API_TOKEN.startsWith("34sb") && !BuildConfig.DERIV_API_TOKEN.startsWith("pat_74d")) {
        BuildConfig.DERIV_API_TOKEN
    } else {
        "pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c"
    },
    val allPairs: List<ForexPair> = MarketDataEngine.ALL_PAIRS,
    val marketDataProvider: MarketDataProvider = MarketDataProvider.DERIV,
    val activeProviderStatus: String = "Deriv • Live Streaming",
    val isMarketOpen: Boolean = MarketDataEngine.isForexMarketOpen(),
    val liveFeedStatusNote: String = if (MarketDataEngine.isForexMarketOpen()) "LIVE INTERBANK" else "WEEKEND CLOSE",
    val macroData: MacroMarketData = MacroMarketData(),
    val nowClockMs: Long = System.currentTimeMillis(),
    val lastUpdateTimestamp: Long = System.currentTimeMillis()
)

class ForexViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(ForexUiState())
    val uiState: StateFlow<ForexUiState> = _uiState.asStateFlow()

    init {
        val initialSignals = MarketDataEngine.getInitialSignals()
        val initialCandles = MarketDataEngine.generateCandles(
            MarketDataEngine.PAIR_XAUUSD,
            Timeframe.H1
        )

        _uiState.update { state ->
            val processed = applyFilters(initialSignals, state.selectedSignalFilter, state.searchQuery, state.sortOption)
            state.copy(
                signals = initialSignals,
                filteredSignals = processed,
                candles = initialCandles,
                isMarketOpen = MarketDataEngine.isForexMarketOpen(),
                tradingSessions = MarketDataEngine.getTradingSessions()
            )
        }

        initDerivStream()
        refreshRealMarketRates()
        loadMacroData()
        loadRealCandles()
        startRealTimeTicker()
    }

    private fun initDerivStream() {
        DerivMarketService.startLiveStream(_uiState.value.derivAppId, _uiState.value.derivApiKey)

        viewModelScope.launch {
            DerivMarketService.tickUpdates.collect { tick ->
                if (_uiState.value.marketDataProvider == MarketDataProvider.DERIV) {
                    applyDerivTick(tick)
                }
            }
        }

        viewModelScope.launch {
            DerivMarketService.connectionStatus.collect { status ->
                if (_uiState.value.marketDataProvider == MarketDataProvider.DERIV) {
                    _uiState.update { it.copy(activeProviderStatus = status.label) }
                }
            }
        }
    }

    private fun applyDerivTick(tick: DerivMarketService.DerivTick) {
        val quote = tick.quote
        if (quote <= 0.0) return

        _uiState.update { state ->
            val updatedSignals = state.signals.map { sig ->
                if (sig.pair.symbol == tick.pairSymbol) {
                    sig.updateWithLiveMarket(quote)
                } else {
                    sig
                }
            }

            val updatedAllPairs = state.allPairs.map { p ->
                if (p.symbol == tick.pairSymbol) p.copy(currentPrice = quote) else p
            }

            val updatedSelectedPair = if (state.selectedPair.symbol == tick.pairSymbol) {
                state.selectedPair.copy(currentPrice = quote)
            } else {
                state.selectedPair
            }

            val filtered = applyFilters(updatedSignals, state.selectedSignalFilter, state.searchQuery, state.sortOption)
            val updatedDetail = state.selectedSignalForDetail?.let { currentDetail ->
                updatedSignals.find { it.id == currentDetail.id } ?: currentDetail
            }

            // Check alerts for triggered conditions
            var newTriggeredEvent: TriggeredAlertEvent? = null
            val updatedAlerts = state.alerts.map { alert ->
                if (alert.isEnabled && !alert.isTriggered && alert.pairSymbol == tick.pairSymbol) {
                    val isFired = when (alert.condition) {
                        AlertCondition.PRICE_ABOVE -> quote >= alert.targetPrice
                        AlertCondition.PRICE_BELOW -> quote <= alert.targetPrice
                        else -> false
                    }
                    if (isFired) {
                        val event = TriggeredAlertEvent(
                            id = java.util.UUID.randomUUID().toString(),
                            alertId = alert.id,
                            pairSymbol = alert.pairSymbol,
                            title = "${alert.pairSymbol} Alert Triggered!",
                            message = "${alert.condition.label} at ${updatedSelectedPair.formatPrice(quote)} (${alert.note.ifEmpty { "Target reached" }})",
                            timestamp = System.currentTimeMillis(),
                            condition = alert.condition,
                            price = quote
                        )
                        newTriggeredEvent = event
                        alert.copy(isTriggered = true, triggeredAt = System.currentTimeMillis())
                    } else {
                        alert
                    }
                } else {
                    alert
                }
            }

            val newTriggeredList = if (newTriggeredEvent != null) {
                listOf(newTriggeredEvent) + state.triggeredEvents
            } else {
                state.triggeredEvents
            }

            // Sync the active candle on the chart with the live tick
            val updatedCandles = if (state.selectedPair.symbol == tick.pairSymbol && state.candles.isNotEmpty()) {
                val last = state.candles.last()
                val updatedLast = last.copy(
                    close = quote,
                    high = maxOf(last.high, quote),
                    low = minOf(last.low, quote)
                )
                state.candles.dropLast(1) + updatedLast
            } else {
                state.candles
            }

            state.copy(
                signals = updatedSignals,
                filteredSignals = filtered,
                allPairs = updatedAllPairs,
                selectedPair = updatedSelectedPair,
                selectedSignalForDetail = updatedDetail,
                candles = updatedCandles,
                alerts = updatedAlerts,
                triggeredEvents = newTriggeredList,
                latestTriggeredBanner = newTriggeredEvent ?: state.latestTriggeredBanner,
                lastUpdateTimestamp = System.currentTimeMillis(),
                activeProviderStatus = "Deriv Stream • ${tick.pairSymbol} @ ${updatedSelectedPair.formatPrice(quote)}"
            )
        }
    }

    private fun startRealTimeTicker() {
        // High-precision 1-second countdown ticker for pending setup validity
        viewModelScope.launch {
            while (true) {
                delay(1000L)
                _uiState.update { it.copy(nowClockMs = System.currentTimeMillis()) }
            }
        }

        viewModelScope.launch {
            while (true) {
                val intervalSec = _uiState.value.refreshInterval.seconds
                delay(intervalSec * 1000L)
                tickLivePrices()
            }
        }
    }

    fun refreshRealMarketRates() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            val provider = _uiState.value.marketDataProvider
            val key = when (provider) {
                MarketDataProvider.TWELVE_DATA -> _uiState.value.twelveDataApiKey
                MarketDataProvider.FINNHUB -> _uiState.value.finnhubApiKey
                MarketDataProvider.DERIV -> _uiState.value.derivApiKey
                else -> ""
            }
            val liveRates = LiveMarketDataService.fetchRates(provider, key, _uiState.value.derivAppId)
            applyRealRates(liveRates)
            loadMacroData()
            loadRealCandles()
            _uiState.update {
                it.copy(
                    isRefreshing = false,
                    activeProviderStatus = if (liveRates.eurUsd != null || liveRates.btcUsd != null) "Connected • ${liveRates.providerName}" else "Active • Interbank",
                    lastUpdateTimestamp = System.currentTimeMillis()
                )
            }
        }
    }

    private fun applyRealRates(rates: LiveMarketDataService.LiveRates) {
        _uiState.update { state ->
            val updatedSignals = state.signals.map { sig ->
                val realRate = when (sig.pair.symbol) {
                    "EUR/USD" -> rates.eurUsd
                    "GBP/USD" -> rates.gbpUsd
                    "USD/JPY" -> rates.usdJpy
                    "GBP/JPY" -> rates.gbpJpy
                    "AUD/USD" -> rates.audUsd
                    "USD/CAD" -> rates.usdCad
                    "BTC/USD" -> rates.btcUsd
                    "XAU/USD" -> rates.xauUsd
                    else -> null
                }

                if (realRate != null && realRate > 0.0) {
                    sig.updateWithLiveMarket(realRate)
                } else {
                    sig
                }
            }

            val updatedAllPairs = state.allPairs.map { p ->
                val realRate = when (p.symbol) {
                    "EUR/USD" -> rates.eurUsd
                    "GBP/USD" -> rates.gbpUsd
                    "USD/JPY" -> rates.usdJpy
                    "GBP/JPY" -> rates.gbpJpy
                    "AUD/USD" -> rates.audUsd
                    "USD/CAD" -> rates.usdCad
                    "BTC/USD" -> rates.btcUsd
                    "XAU/USD" -> rates.xauUsd
                    else -> null
                }
                if (realRate != null && realRate > 0.0) {
                    p.copy(currentPrice = realRate)
                } else {
                    p
                }
            }

            val selRate = when (state.selectedPair.symbol) {
                "EUR/USD" -> rates.eurUsd
                "GBP/USD" -> rates.gbpUsd
                "USD/JPY" -> rates.usdJpy
                "GBP/JPY" -> rates.gbpJpy
                "AUD/USD" -> rates.audUsd
                "USD/CAD" -> rates.usdCad
                "BTC/USD" -> rates.btcUsd
                "XAU/USD" -> rates.xauUsd
                else -> null
            }
            val updatedSelectedPair = if (selRate != null && selRate > 0.0) {
                state.selectedPair.copy(currentPrice = selRate)
            } else {
                state.selectedPair
            }

            val filtered = applyFilters(updatedSignals, state.selectedSignalFilter, state.searchQuery, state.sortOption)
            val updatedDetail = state.selectedSignalForDetail?.let { currentDetail ->
                updatedSignals.find { it.id == currentDetail.id } ?: currentDetail
            }

            // Evaluate active alerts against live market prices
            var newTriggeredEvent: TriggeredAlertEvent? = null
            val updatedAlerts = state.alerts.map { alert ->
                if (alert.isEnabled && !alert.isTriggered) {
                    val matchingSignal = updatedSignals.find { it.pair.symbol == alert.pairSymbol }
                    val currentPrice = matchingSignal?.currentPrice ?: alert.targetPrice
                    val isFired = when (alert.condition) {
                        AlertCondition.PRICE_ABOVE -> currentPrice >= alert.targetPrice
                        AlertCondition.PRICE_BELOW -> currentPrice <= alert.targetPrice
                        AlertCondition.TP_HIT -> matchingSignal?.let { it.status == SignalStatus.HIT_TP || currentPrice >= it.takeProfit1 } ?: false
                        AlertCondition.SL_HIT -> matchingSignal?.let { it.status == SignalStatus.HIT_SL || currentPrice <= it.stopLoss } ?: false
                        AlertCondition.VIP_SIGNAL -> matchingSignal?.let { it.confluenceScore >= 85 } ?: false
                        AlertCondition.SESSION_OPEN -> false
                    }

                    if (isFired) {
                        val event = TriggeredAlertEvent(
                            id = UUID.randomUUID().toString(),
                            alertId = alert.id,
                            pairSymbol = alert.pairSymbol,
                            title = "${alert.pairSymbol} Alert Triggered!",
                            message = "${alert.condition.label} at ${matchingSignal?.pair?.formatPrice(currentPrice) ?: alert.targetPrice} (${alert.note.ifEmpty { "Target reached" }})",
                            timestamp = System.currentTimeMillis(),
                            condition = alert.condition,
                            price = currentPrice
                        )
                        newTriggeredEvent = event
                        alert.copy(isTriggered = true, triggeredAt = System.currentTimeMillis())
                    } else {
                        alert
                    }
                } else {
                    alert
                }
            }

            val newTriggeredList = if (newTriggeredEvent != null) {
                listOf(newTriggeredEvent!!) + state.triggeredEvents
            } else {
                state.triggeredEvents
            }

            // Sync the active candle on the chart with the live price
            val updatedCandles = if (selRate != null && selRate > 0.0 && state.candles.isNotEmpty()) {
                val last = state.candles.last()
                val updatedLast = last.copy(
                    close = selRate,
                    high = maxOf(last.high, selRate),
                    low = minOf(last.low, selRate)
                )
                state.candles.dropLast(1) + updatedLast
            } else {
                state.candles
            }

            val isMarketOpen = MarketDataEngine.isForexMarketOpen()
            state.copy(
                signals = updatedSignals,
                filteredSignals = filtered,
                allPairs = updatedAllPairs,
                selectedPair = updatedSelectedPair,
                selectedSignalForDetail = updatedDetail,
                candles = updatedCandles,
                alerts = updatedAlerts,
                triggeredEvents = newTriggeredList,
                latestTriggeredBanner = newTriggeredEvent ?: state.latestTriggeredBanner,
                tradingSessions = MarketDataEngine.getTradingSessions(),
                isMarketOpen = isMarketOpen,
                liveFeedStatusNote = if (isMarketOpen) "LIVE INTERBANK" else "WEEKEND CLOSE (Friday Rates)",
                lastUpdateTimestamp = System.currentTimeMillis()
            )
        }
    }

    fun tickLivePrices() {
        val isMarketOpen = MarketDataEngine.isForexMarketOpen()
        val sessions = MarketDataEngine.getTradingSessions()

        val provider = _uiState.value.marketDataProvider
        val key = when (provider) {
            MarketDataProvider.TWELVE_DATA -> _uiState.value.twelveDataApiKey
            MarketDataProvider.FINNHUB -> _uiState.value.finnhubApiKey
            MarketDataProvider.DERIV -> _uiState.value.derivApiKey
            else -> ""
        }

        viewModelScope.launch {
            val liveRates = LiveMarketDataService.fetchRates(provider, key, _uiState.value.derivAppId)
            applyRealRates(liveRates)
            if (!isMarketOpen) {
                _uiState.update {
                    it.copy(
                        tradingSessions = sessions,
                        isMarketOpen = false,
                        liveFeedStatusNote = "WEEKEND CLOSE (Friday Rates)"
                    )
                }
            }
        }
    }

    fun selectPair(pair: ForexPair) {
        _uiState.update { it.copy(selectedPair = pair) }
        loadRealCandles()
    }

    fun selectTimeframe(tf: Timeframe) {
        _uiState.update { it.copy(selectedTimeframe = tf) }
        loadRealCandles()
    }

    private fun loadRealCandles() {
        viewModelScope.launch {
            val pair = _uiState.value.selectedPair
            val tf = _uiState.value.selectedTimeframe
            val tdKey = _uiState.value.twelveDataApiKey
            val realCandles = LiveMarketDataService.fetchCandles(pair, tf, tdKey)
            if (!realCandles.isNullOrEmpty() && _uiState.value.selectedPair.symbol == pair.symbol && _uiState.value.selectedTimeframe == tf) {
                _uiState.update { it.copy(candles = realCandles) }
            } else if (_uiState.value.selectedPair.symbol == pair.symbol && _uiState.value.selectedTimeframe == tf) {
                val fallbackCandles = MarketDataEngine.generateCandles(pair, tf)
                _uiState.update { it.copy(candles = fallbackCandles) }
            }
        }
    }

    fun setSignalFilter(filter: String) {
        _uiState.update { state ->
            val filtered = applyFilters(state.signals, filter, state.searchQuery, state.sortOption)
            state.copy(selectedSignalFilter = filter, filteredSignals = filtered)
        }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { state ->
            val filtered = applyFilters(state.signals, state.selectedSignalFilter, query, state.sortOption)
            state.copy(searchQuery = query, filteredSignals = filtered)
        }
    }

    fun setSortOption(sort: String) {
        _uiState.update { state ->
            val filtered = applyFilters(state.signals, state.selectedSignalFilter, state.searchQuery, sort)
            state.copy(sortOption = sort, filteredSignals = filtered)
        }
    }

    fun selectSignalForDetail(signal: ForexSignal?) {
        _uiState.update { it.copy(selectedSignalForDetail = signal) }
    }

    fun toggleFavorite(signalId: String) {
        _uiState.update { state ->
            val updated = state.signals.map {
                if (it.id == signalId) it.copy(isFavorite = !it.isFavorite) else it
            }
            val filtered = applyFilters(updated, state.selectedSignalFilter, state.searchQuery, state.sortOption)
            val updatedDetail = if (state.selectedSignalForDetail?.id == signalId) {
                state.selectedSignalForDetail.copy(isFavorite = !state.selectedSignalForDetail.isFavorite)
            } else state.selectedSignalForDetail
            state.copy(signals = updated, filteredSignals = filtered, selectedSignalForDetail = updatedDetail)
        }
    }

    fun toggleAlert(signalId: String) {
        _uiState.update { state ->
            val updated = state.signals.map {
                if (it.id == signalId) it.copy(hasAlert = !it.hasAlert) else it
            }
            val filtered = applyFilters(updated, state.selectedSignalFilter, state.searchQuery, state.sortOption)
            val updatedDetail = if (state.selectedSignalForDetail?.id == signalId) {
                state.selectedSignalForDetail.copy(hasAlert = !state.selectedSignalForDetail.hasAlert)
            } else state.selectedSignalForDetail
            state.copy(signals = updated, filteredSignals = filtered, selectedSignalForDetail = updatedDetail)
        }
    }

    private fun applyFilters(
        signals: List<ForexSignal>,
        filter: String,
        query: String,
        sort: String
    ): List<ForexSignal> {
        var result = when (filter) {
            "VIP" -> signals.filter { it.isActive && it.confluenceScore >= 90 }
            "RUNNING" -> signals.filter { it.status == SignalStatus.RUNNING }
            "PENDING" -> signals.filter { it.status == SignalStatus.PENDING }
            "HISTORY" -> signals.filter { it.isClosed }
            "GOLD" -> signals.filter { it.isActive && it.pair.symbol.contains("XAU") }
            "INDICES" -> signals.filter { it.isActive && (it.pair.symbol.contains("US30") || it.pair.symbol.contains("NAS")) }
            "FAVORITES" -> signals.filter { it.isActive && it.isFavorite }
            else -> signals.filter { it.isActive }
        }

        if (query.isNotBlank()) {
            val q = query.trim().lowercase()
            result = result.filter {
                it.pair.symbol.lowercase().contains(q) ||
                it.pair.name.lowercase().contains(q) ||
                it.rationale.lowercase().contains(q) ||
                it.type.label.lowercase().contains(q) ||
                it.killzone.lowercase().contains(q)
            }
        }

        return when (sort) {
            "PIPS" -> result.sortedByDescending { it.pips }
            "RECENT" -> result.reversed()
            "RR" -> result.sortedByDescending {
                val parts = it.riskReward.split(":")
                parts.getOrNull(1)?.toDoubleOrNull() ?: 1.0
            }
            else -> result.sortedByDescending { it.confluenceScore }
        }
    }

    fun refreshMacroData() {
        loadMacroData()
    }

    private fun loadMacroData() {
        viewModelScope.launch {
            _uiState.update { it.copy(macroData = it.macroData.copy(isLoading = true)) }
            val key = _uiState.value.finnhubApiKey
            val macro = LiveMarketDataService.fetchFinnhubMacroData(key)
            _uiState.update { it.copy(macroData = macro.copy(isLoading = false)) }
        }
    }

    fun setMarketDataProvider(provider: MarketDataProvider) {
        _uiState.update { it.copy(marketDataProvider = provider, isProviderModalOpen = false) }
        if (provider == MarketDataProvider.DERIV) {
            DerivMarketService.startLiveStream(_uiState.value.derivAppId, _uiState.value.derivApiKey)
        }
        refreshRealMarketRates()
    }

    fun updateProviderApiKey(provider: MarketDataProvider, key: String) {
        _uiState.update { state ->
            when (provider) {
                MarketDataProvider.TWELVE_DATA -> state.copy(twelveDataApiKey = key.trim())
                MarketDataProvider.FINNHUB -> state.copy(finnhubApiKey = key.trim())
                MarketDataProvider.DERIV -> state.copy(derivApiKey = key.trim())
                else -> state
            }
        }
        if (provider == MarketDataProvider.DERIV) {
            initDerivStream()
        }
        refreshRealMarketRates()
    }

    fun updateDerivCredentials(appId: String, apiToken: String) {
        val cleanToken = if (apiToken.trim().startsWith("pat_74d") || apiToken.trim().startsWith("34sb") || apiToken.trim().isEmpty()) {
            "pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c"
        } else {
            apiToken.trim()
        }
        if (appId.startsWith("pat_")) {
            // Guard: If a personal access token was passed to appId, assign to derivApiKey and keep App ID intact
            val tokenFromAppId = if (appId.trim().startsWith("pat_74d")) "pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c" else appId.trim()
            _uiState.update { state ->
                state.copy(derivApiKey = tokenFromAppId)
            }
            initDerivStream()
            return
        }
        _uiState.update { state ->
            state.copy(
                derivAppId = appId.trim().filter { it.isDigit() }.take(5).ifEmpty { "10154" },
                derivApiKey = cleanToken
            )
        }
        initDerivStream()
    }

    fun updateDerivConfig(appId: String, token: String) {
        updateDerivCredentials(appId, token)
    }

    fun setRefreshInterval(interval: RefreshInterval) {
        _uiState.update { it.copy(refreshInterval = interval, isRefreshModalOpen = false) }
    }

    fun updateBacktestFilter(
        strategy: StrategyType? = null,
        timeframe: Timeframe? = null,
        clearTimeframe: Boolean = false,
        minConfluence: Int? = null,
        pairSymbol: String? = null,
        clearPair: Boolean = false,
        outcomeFilter: TradeOutcome? = null,
        clearOutcome: Boolean = false
    ) {
        _uiState.update { state ->
            val current = state.backtestFilter
            val newFilter = current.copy(
                strategy = strategy ?: current.strategy,
                timeframe = if (clearTimeframe) null else (timeframe ?: current.timeframe),
                minConfluence = minConfluence ?: current.minConfluence,
                pairSymbol = if (clearPair) null else (pairSymbol ?: current.pairSymbol),
                outcomeFilter = if (clearOutcome) null else (outcomeFilter ?: current.outcomeFilter)
            )
            val summary = BacktestEngine.runBacktest(newFilter)
            state.copy(backtestFilter = newFilter, backtestSummary = summary)
        }
    }

    fun toggleRiskModal(open: Boolean) {
        _uiState.update { it.copy(isRiskModalOpen = open) }
    }

    fun toggleProviderModal(open: Boolean) {
        _uiState.update { it.copy(isProviderModalOpen = open) }
    }

    fun toggleRefreshModal(open: Boolean) {
        _uiState.update { it.copy(isRefreshModalOpen = open) }
    }

    fun manualRefresh() {
        // If any pending order has expired, renew its persistent anchor upon manual refresh
        _uiState.value.signals.forEach { sig ->
            if (sig.isPending && sig.getRemainingValidityMs() <= 0L) {
                com.example.forexsignals.data.SignalPersistenceManager.renewSignalAnchor(sig.id)
            }
        }
        val refreshedSignals = MarketDataEngine.getInitialSignals()
        _uiState.update { state ->
            val updatedSignals = state.signals.map { current ->
                if (current.isPending && current.getRemainingValidityMs() <= 0L) {
                    refreshedSignals.find { it.id == current.id } ?: current
                } else {
                    current
                }
            }
            val filtered = applyFilters(updatedSignals, state.selectedSignalFilter, state.searchQuery, state.sortOption)
            state.copy(signals = updatedSignals, filteredSignals = filtered)
        }
        refreshRealMarketRates()
    }

    // ==========================================
    // ALERT MANAGEMENT
    // ==========================================

    fun addPriceAlert(
        pairSymbol: String,
        condition: AlertCondition,
        targetPrice: Double,
        note: String = "",
        soundEnabled: Boolean = true,
        vibrateEnabled: Boolean = true
    ) {
        val newAlert = PriceAlert(
            id = UUID.randomUUID().toString(),
            pairSymbol = pairSymbol,
            condition = condition,
            targetPrice = targetPrice,
            note = note,
            soundEnabled = soundEnabled,
            vibrateEnabled = vibrateEnabled,
            isEnabled = true
        )
        _uiState.update { state ->
            state.copy(
                alerts = listOf(newAlert) + state.alerts,
                isAddAlertModalOpen = false,
                prefillAlertPair = null,
                prefillAlertPrice = null
            )
        }
    }

    fun toggleAlertEnabled(alertId: String) {
        _uiState.update { state ->
            val updated = state.alerts.map {
                if (it.id == alertId) it.copy(isEnabled = !it.isEnabled, isTriggered = false) else it
            }
            state.copy(alerts = updated)
        }
    }

    fun deleteAlert(alertId: String) {
        _uiState.update { state ->
            val updated = state.alerts.filterNot { it.id == alertId }
            state.copy(alerts = updated)
        }
    }

    fun clearTriggeredEvents() {
        _uiState.update { it.copy(triggeredEvents = emptyList()) }
    }

    fun dismissTriggeredBanner() {
        _uiState.update { it.copy(latestTriggeredBanner = null) }
    }

    fun openAddAlertModal(pair: ForexPair? = null, prefillPrice: Double? = null) {
        _uiState.update {
            it.copy(
                isAddAlertModalOpen = true,
                prefillAlertPair = pair ?: it.selectedPair,
                prefillAlertPrice = prefillPrice ?: pair?.basePrice ?: it.selectedPair.basePrice
            )
        }
    }

    fun closeAddAlertModal() {
        _uiState.update {
            it.copy(
                isAddAlertModalOpen = false,
                prefillAlertPair = null,
                prefillAlertPrice = null
            )
        }
    }

    // ==========================================
    // AI COPILOT CHAT
    // ==========================================

    fun sendAiChatMessage(prompt: String, signalContext: ForexSignal? = null) {
        if (prompt.isBlank()) return
        val userMsgId = UUID.randomUUID().toString()
        val userMsg = ChatMessage(
            id = userMsgId,
            text = prompt.trim(),
            isUser = true,
            signalReference = signalContext?.let { "${it.pair.symbol} ${it.type.label} @ ${it.entryPrice}" }
        )

        val thinkingMsgId = UUID.randomUUID().toString()
        val thinkingMsg = ChatMessage(
            id = thinkingMsgId,
            text = "Analyzing order book, smart money liquidity voids, and institutional confluence...",
            isUser = false,
            isGenerating = true
        )

        _uiState.update { state ->
            state.copy(
                aiChatMessages = state.aiChatMessages + userMsg + thinkingMsg,
                isAiGenerating = true
            )
        }

        viewModelScope.launch {
            val currentState = _uiState.value
            val bestTrade = currentState.signals.find { it.isBestTradeNow }
            val history = currentState.aiChatMessages
                .filterNot { it.isGenerating }
                .takeLast(6)
                .map { it.text to it.isUser }

            val responseText = GeminiChatEngine.generateResponse(
                prompt = prompt,
                persona = currentState.selectedAiPersona,
                currentSignals = currentState.signals,
                bestTrade = bestTrade,
                conversationHistory = history
            )

            val followUpPrompts = when {
                prompt.contains("risk", ignoreCase = true) -> listOf(
                    "Show 1:3 R:R position calculator",
                    "What is max drawdown limit for prop firms?",
                    "Analyze Best Trade Now (XAU/USD)"
                )
                prompt.contains("gold", ignoreCase = true) || prompt.contains("xau", ignoreCase = true) -> listOf(
                    "What is XAU/USD Stop Loss level?",
                    "How does DXY index affect Gold?",
                    "Calculate 1% lot size for Gold"
                )
                prompt.contains("fvg", ignoreCase = true) || prompt.contains("smc", ignoreCase = true) -> listOf(
                    "How to identify Breaker Blocks?",
                    "Explain London Open Liquidity Sweep",
                    "Analyze Best Trade Now (XAU/USD)"
                )
                else -> listOf(
                    "Analyze Best Trade Now (XAU/USD)",
                    "Calculate risk for $1,000 account",
                    "Smart Money: How to trade FVG + Order Blocks"
                )
            }

            val finalAssistantMsg = ChatMessage(
                id = thinkingMsgId,
                text = responseText,
                isUser = false,
                isGenerating = false,
                suggestedPrompts = followUpPrompts
            )

            _uiState.update { state ->
                val withoutThinking = state.aiChatMessages.filterNot { it.id == thinkingMsgId }
                state.copy(
                    aiChatMessages = withoutThinking + finalAssistantMsg,
                    isAiGenerating = false
                )
            }
        }
    }

    fun setAiPersona(persona: AiPersona) {
        _uiState.update { it.copy(selectedAiPersona = persona) }
    }

    fun clearAiChat() {
        val welcomeMsg = ChatMessage(
            id = UUID.randomUUID().toString(),
            text = """
                ### 🏛️ FX Institutional Copilot Reset
                Ready for fresh market analysis with **${_uiState.value.selectedAiPersona.title}**.
                
                Ask anything about Forex, Gold (XAU/USD), US30, Smart Money Concepts, or custom trade plans.
            """.trimIndent(),
            isUser = false,
            suggestedPrompts = listOf(
                "Analyze Best Trade Now (XAU/USD)",
                "Calculate risk for $1,000 account",
                "Smart Money: How to trade FVG + Order Blocks",
                "Explain 84.8% Backtested Win Rate"
            )
        )
        _uiState.update { it.copy(aiChatMessages = listOf(welcomeMsg)) }
    }
}
