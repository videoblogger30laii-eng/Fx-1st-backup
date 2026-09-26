package com.example.forexsignals.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.model.ForexSignal
import com.example.forexsignals.theme.*

@Composable
fun BestTradeHeroCard(
    signal: ForexSignal,
    onTestBacktestClick: () -> Unit,
    onInspect: () -> Unit = {},
    onAskAi: (() -> Unit)? = null,
    nowClockMs: Long = System.currentTimeMillis(),
    modifier: Modifier = Modifier
) {
    val gradient = Brush.linearGradient(
        colors = listOf(
            SurfaceElevated,
            SurfaceDark
        )
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(gradient)
            .border(1.5.dp, GoldAccent.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
            .clickable { onInspect() }
            .padding(16.dp)
            .testTag("best_trade_hero_card")
    ) {
        Column {
            // Header Row: VIP Badge & Backtest Win Rate
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = "VIP Signal",
                        tint = GoldAccent,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "BEST TRADE NOW",
                        color = GoldAccent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )
                    Box(
                        modifier = Modifier
                            .background(GoldAccent.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "A+ VIP",
                            color = GoldAccent,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Win rate badge
                Box(
                    modifier = Modifier
                        .background(TradingGreenDark.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
                        .border(1.dp, TradingGreen.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Win Rate",
                            tint = TradingGreen,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = "84.8% Backtested Win Rate",
                            color = TradingGreen,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            val isPendingTrade = signal.status == com.example.forexsignals.model.SignalStatus.PENDING || signal.isPending

            // Pair, Order Type, Timeframe & State
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = signal.pair.symbol,
                            color = TextPrimary,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black
                        )
                        Box(
                            modifier = Modifier
                                .background(if (signal.type.isBuy) TradingGreen.copy(alpha = 0.2f) else TradingRed.copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                                .border(1.dp, if (signal.type.isBuy) TradingGreen.copy(alpha = 0.5f) else TradingRed.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = signal.type.label,
                                color = if (signal.type.isBuy) TradingGreen else TradingRed,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                        Box(
                            modifier = Modifier
                                .background(ElectricBlue.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = "${signal.timeframe.label} Timeframe",
                                color = ElectricBlue,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = "${signal.pair.name} • ${signal.getOrderKindDescription()}",
                        color = TextSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = signal.pair.formattedCurrentPrice,
                        color = TextPrimary,
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold
                    )
                    if (!isPendingTrade && signal.pips != 0.0) {
                        Text(
                            text = if (signal.pips > 0) "+${signal.pips} pips" else "${signal.pips} pips",
                            color = if (signal.pips > 0) TradingGreen else TradingRed,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            val remainingMs = if (isPendingTrade) signal.getRemainingValidityMs(nowClockMs) else 0L
            val isExpired = isPendingTrade && remainingMs <= 0L
            val bannerTint = when {
                isExpired -> TradingRed
                isPendingTrade -> GoldAccent
                else -> TradingGreen
            }

            // Clarified Trade State Banner: Active/Running vs Pending vs Expired
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isPendingTrade) bannerTint.copy(alpha = 0.12f) else TradingGreenDark.copy(alpha = 0.35f))
                    .border(1.dp, bannerTint.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 7.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = when {
                                isExpired -> "🔴 EXPIRED ORDER"
                                isPendingTrade -> "🟡 PENDING ORDER"
                                else -> "🟢 ACTIVE RUNNING TRADE"
                            },
                            color = bannerTint,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text("•", color = TextMuted, fontSize = 10.sp)
                        Text(
                            text = if (isPendingTrade) "Awaiting fill @ ${signal.pair.formatPrice(signal.entryPrice)}" else "Filled @ ${signal.pair.formatPrice(signal.entryPrice)}",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    Text(
                        text = when {
                            isExpired -> "⚠️ Window Closed"
                            isPendingTrade -> "⏳ ${signal.getFormattedCountdown(nowClockMs)}"
                            else -> "Live In-Market"
                        },
                        color = bannerTint,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Trade Parameters: Entry, SL, TP1, R:R
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                ParameterColumn("ENTRY", signal.pair.formatPrice(signal.entryPrice), TextPrimary)
                ParameterColumn("SL", signal.pair.formatPrice(signal.stopLoss), TradingRed)
                ParameterColumn("TP 1", signal.pair.formatPrice(signal.takeProfit1), TradingGreen)
                ParameterColumn("R:R RATIO", signal.riskReward, ElectricBlue)
                ParameterColumn("CONFLUENCE", "${signal.confluenceScore}%", GoldAccent)
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Buttons: View Details, Ask AI & Test in Backtest Lab
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(
                    onClick = onInspect,
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, GoldAccent.copy(alpha = 0.5f)),
                    modifier = Modifier.weight(1f).height(40.dp)
                ) {
                    Icon(Icons.Default.Visibility, contentDescription = null, tint = GoldAccent, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(3.dp))
                    Text("Setup", color = GoldAccent, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }

                if (onAskAi != null) {
                    OutlinedButton(
                        onClick = onAskAi,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, ElectricBlue.copy(alpha = 0.5f)),
                        modifier = Modifier.weight(1.1f).height(40.dp)
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = ElectricBlue, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("AI Audit", color = ElectricBlue, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                    }
                }

                Button(
                    onClick = onTestBacktestClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GoldAccent,
                        contentColor = BackgroundDark
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                    modifier = Modifier
                        .weight(1.3f)
                        .height(40.dp)
                        .testTag("test_best_trade_backtest_btn")
                ) {
                    Icon(
                        imageVector = Icons.Default.TrendingUp,
                        contentDescription = "Test Backtest",
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        text = "Backtest",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
private fun ParameterColumn(label: String, value: String, valueColor: androidx.compose.ui.graphics.Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = value, color = valueColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}
