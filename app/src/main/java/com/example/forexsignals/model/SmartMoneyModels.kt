package com.example.forexsignals.model

enum class SmartMoneyType(val displayName: String, val badgeColorHex: Long) {
    ORDER_BLOCK("Bullish / Bearish OB", 0xFF00E676),
    FAIR_VALUE_GAP("Fair Value Gap (FVG)", 0xFF2979FF),
    LIQUIDITY_SWEEP("Liquidity Pool Sweep", 0xFFFFD700),
    BREAK_OF_STRUCTURE("Break of Structure (BOS)", 0xFFA855F7),
    CHANGE_OF_CHARACTER("Change of Character (CHoCH)", 0xFFFF3366)
}

data class SmartMoneyZone(
    val id: String,
    val pairSymbol: String,
    val type: SmartMoneyType,
    val highPrice: Double,
    val lowPrice: Double,
    val timeframe: Timeframe,
    val isMitigated: Boolean,
    val strengthStars: Int,
    val description: String
)

enum class ImpactLevel {
    HIGH,
    MEDIUM,
    LOW
}

data class EconomicEvent(
    val id: String,
    val currency: String,
    val title: String,
    val time: String,
    val impact: ImpactLevel,
    val actual: String,
    val forecast: String,
    val previous: String,
    val bias: String
)

data class CurrencyStrength(
    val currency: String,
    val score: Int, // 0 - 100
    val change24h: String,
    val trend: String
)
