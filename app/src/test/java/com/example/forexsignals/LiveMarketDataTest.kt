package com.example.forexsignals

import com.example.forexsignals.engine.DerivMarketService
import com.example.forexsignals.engine.LiveMarketDataService
import com.example.forexsignals.model.MarketDataProvider
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class LiveMarketDataTest {

    @Test
    fun testMarketDataProviderEnumValues() {
        val providers = MarketDataProvider.values()
        assertTrue("Should include TWELVE_DATA", providers.contains(MarketDataProvider.TWELVE_DATA))
        assertTrue("Should include FINNHUB", providers.contains(MarketDataProvider.FINNHUB))
        assertTrue("Should include DERIV", providers.contains(MarketDataProvider.DERIV))

        val twelveData = MarketDataProvider.TWELVE_DATA
        assertTrue(twelveData.requiresKey)
        assertEquals("api.twelvedata.com", twelveData.endpointName)
    }

    @Test
    fun testTwelveDataParserIntegration() = runBlocking {
        val key = "fbf5fe46b0344421a3e9c3fb6a549114"
        val rates = LiveMarketDataService.fetchTwelveDataRates(key)
        assertNotNull("Rates should not be null", rates)
        assertTrue("Provider name should be set", rates.providerName.isNotEmpty())
    }

    @Test
    fun testDerivMarketServiceWebSocketLiveStream() = runBlocking {
        assertNotNull(DerivMarketService.latestQuotes)
        assertEquals("10154", DerivMarketService.DEFAULT_DERIV_APP_ID)

        // Verify symbol mappings cover all institutional pairs
        assertTrue(DerivMarketService.symbolMapping.containsKey("frxEURUSD"))
        assertTrue(DerivMarketService.symbolMapping.containsKey("frxGBPUSD"))
        assertTrue(DerivMarketService.symbolMapping.containsKey("frxUSDJPY"))
        assertTrue(DerivMarketService.symbolMapping.containsKey("frxGBPJPY"))
        assertTrue(DerivMarketService.symbolMapping.containsKey("frxAUDUSD"))
        assertTrue(DerivMarketService.symbolMapping.containsKey("frxUSDCAD"))
        assertTrue(DerivMarketService.symbolMapping.containsKey("frxXAUUSD"))
        assertTrue(DerivMarketService.symbolMapping.containsKey("cryBTCUSD"))

        // Fetch Deriv rates
        val rates = DerivMarketService.fetchDerivRates(appId = "10154", token = "")
        assertNotNull(rates)
        assertTrue(rates.providerName.contains("Deriv"))
    }

    @Test
    fun testDerivCredentialsIndependentStateSeparation() {
        val viewModel = com.example.forexsignals.viewmodel.ForexViewModel()
        val testAppId = "10154"
        val testToken = "pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c"

        viewModel.updateDerivCredentials(appId = testAppId, apiToken = testToken)

        val state = viewModel.uiState.value
        assertEquals("10154", state.derivAppId)
        assertEquals("pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c", state.derivApiKey)
        assertNotEquals(state.derivAppId, state.derivApiKey)

        // Guard test: Even if pat_ token is accidentally passed as appId, derivAppId must not be overwritten
        viewModel.updateDerivCredentials(appId = testToken, apiToken = "")
        assertEquals("10154", viewModel.uiState.value.derivAppId)
    }
}
