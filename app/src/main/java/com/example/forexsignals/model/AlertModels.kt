package com.example.forexsignals.model

enum class AlertCondition(val label: String, val iconSymbol: String) {
    PRICE_ABOVE("Price Crosses Above", "↑"),
    PRICE_BELOW("Price Crosses Below", "↓"),
    TP_HIT("Take Profit 1 Target Reached", "🎯"),
    SL_HIT("Stop Loss Triggered", "🛑"),
    VIP_SIGNAL("A+ VIP Confluence Posted (85%+)", "★"),
    SESSION_OPEN("Session Open / Overlap", "⚡")
}

data class PriceAlert(
    val id: String,
    val pairSymbol: String,
    val condition: AlertCondition,
    val targetPrice: Double,
    val isEnabled: Boolean = true,
    val isTriggered: Boolean = false,
    val triggeredAt: Long? = null,
    val note: String = "",
    val soundEnabled: Boolean = true,
    val vibrateEnabled: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

data class TriggeredAlertEvent(
    val id: String,
    val alertId: String,
    val pairSymbol: String,
    val title: String,
    val message: String,
    val timestamp: Long = System.currentTimeMillis(),
    val condition: AlertCondition,
    val price: Double
)
