package com.example.forexsignals.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.theme.*

@Composable
fun MultiTimeframeMatrix(modifier: Modifier = Modifier) {
    val pairs = listOf("XAU/USD", "EUR/USD", "GBP/USD", "USD/JPY")
    val matrix = mapOf(
        "XAU/USD" to listOf("BUY", "BUY", "BUY", "BUY"), // 4/4 Full Bullish Alignment!
        "EUR/USD" to listOf("BUY", "BUY", "NEUTRAL", "BUY"),
        "GBP/USD" to listOf("BUY", "BUY", "BUY", "NEUTRAL"),
        "USD/JPY" to listOf("SELL", "SELL", "SELL", "SELL")
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(SurfaceDark, RoundedCornerShape(12.dp))
            .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Multi-Timeframe Trend Matrix",
                    color = TextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "M15  /  H1  /  H4  /  D1",
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            pairs.forEach { pair ->
                val tfTrends = matrix[pair] ?: listOf("NEUTRAL", "NEUTRAL", "NEUTRAL", "NEUTRAL")
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = pair,
                        color = TextPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.width(72.dp)
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        tfTrends.forEach { trend ->
                            val color = when (trend) {
                                "BUY" -> TradingGreen
                                "SELL" -> TradingRed
                                else -> TextMuted
                            }
                            Box(
                                modifier = Modifier
                                    .width(48.dp)
                                    .background(color.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                    .padding(vertical = 3.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = trend,
                                    color = color,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
