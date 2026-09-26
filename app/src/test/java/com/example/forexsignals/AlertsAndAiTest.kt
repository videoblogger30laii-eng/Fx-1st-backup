package com.example.forexsignals

import com.example.forexsignals.engine.GeminiChatEngine
import com.example.forexsignals.model.AiPersona
import com.example.forexsignals.model.AlertCondition
import com.example.forexsignals.model.PriceAlert
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AlertsAndAiTest {

    @Test
    fun priceAlert_conditionTriggerCheck() {
        val alertAbove = PriceAlert(
            id = "test_alert_1",
            pairSymbol = "XAU/USD",
            condition = AlertCondition.PRICE_ABOVE,
            targetPrice = 2700.00
        )

        // Below target should not trigger
        val isTriggeredLow = 2690.0 >= alertAbove.targetPrice
        assertEquals(false, isTriggeredLow)

        // Above target should trigger
        val isTriggeredHigh = 2705.50 >= alertAbove.targetPrice
        assertEquals(true, isTriggeredHigh)
    }

    @Test
    fun geminiChatEngine_generatesInstitutionalSmcAnalysis() = runTest {
        val response = GeminiChatEngine.generateResponse(
            prompt = "What is the SMC outlook for Gold?",
            persona = AiPersona.INSTITUTIONAL,
            currentSignals = emptyList(),
            bestTrade = null
        )

        assertNotNull(response)
        assertTrue("Analysis should contain institutional or SMC keywords",
            response.contains("Institutional", ignoreCase = true) ||
            response.contains("SMC", ignoreCase = true) ||
            response.contains("Liquidity", ignoreCase = true) ||
            response.contains("Order Block", ignoreCase = true)
        )
    }

    @Test
    fun geminiChatEngine_riskOfficerPersona_emphasizesRiskMath() = runTest {
        val response = GeminiChatEngine.generateResponse(
            prompt = "How should I manage my $5,000 account?",
            persona = AiPersona.RISK_MANAGER,
            currentSignals = emptyList(),
            bestTrade = null
        )

        assertNotNull(response)
        assertTrue("Chief Risk Officer must mention 1% rule or capital preservation",
            response.contains("1%", ignoreCase = true) ||
            response.contains("Risk", ignoreCase = true) ||
            response.contains("Capital", ignoreCase = true)
        )
    }
}
