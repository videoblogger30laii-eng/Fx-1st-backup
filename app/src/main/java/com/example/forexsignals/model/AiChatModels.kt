package com.example.forexsignals.model

enum class AiPersona(val title: String, val badge: String, val description: String) {
    INSTITUTIONAL(
        "Institutional SMC Mentor",
        "ICT / Bank Flow",
        "Expert in Fair Value Gaps (FVG), Order Blocks, Liquidity Sweeps, and Institutional Order Flow."
    ),
    RISK_MANAGER(
        "Chief Risk Officer",
        "Capital Preservation",
        "Mathematical lot sizing, 1% risk rule, Drawdown mitigation, and asymmetrical Risk/Reward setups."
    ),
    SCALPER(
        "Momentum Scalper",
        "London/NY Overlap",
        "High-frequency M5/M15 breakout setups, session volume surges, and fast target executions."
    )
}

data class ChatMessage(
    val id: String,
    val text: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    val isGenerating: Boolean = false,
    val isError: Boolean = false,
    val signalReference: String? = null,
    val suggestedPrompts: List<String> = emptyList()
)
