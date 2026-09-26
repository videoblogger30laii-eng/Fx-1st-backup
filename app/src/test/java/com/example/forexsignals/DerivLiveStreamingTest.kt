package com.example.forexsignals

import com.example.forexsignals.engine.DerivMarketService
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class DerivLiveStreamingTest {

    @Test
    fun testDerivMarketServiceWithUserCredentials() = runBlocking {
        val userKey = "34rrbBZpDDNQYIXT3LrK5"
        val rates = DerivMarketService.fetchDerivRates(appId = userKey, token = "")
        assertNotNull("Rates should not be null", rates)
        assertTrue("Provider name should indicate Deriv", rates.providerName.contains("Deriv"))
    }
}
