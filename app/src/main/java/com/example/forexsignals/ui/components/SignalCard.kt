package com.example.forexsignals.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.model.ForexSignal
import com.example.forexsignals.model.SignalStatus
import com.example.forexsignals.theme.*

@Composable
fun SignalCard(
    signal: ForexSignal,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit = {},
    onToggleAlert: () -> Unit = {},
    onAskAi: (() -> Unit)? = null,
    nowClockMs: Long = System.currentTimeMillis(),
    modifier: Modifier = Modifier
) {
    val clipboardManager = LocalClipboardManager.current
    var justCopied by remember { mutableStateOf(false) }

    val isPending = signal.status == SignalStatus.PENDING
    val isRunning = signal.status == SignalStatus.RUNNING
    val isWon = signal.status == SignalStatus.HIT_TP

    val statusBg = when {
        isPending -> ElectricBlue.copy(alpha = 0.15f)
        isRunning -> TradingGreen.copy(alpha = 0.15f)
        isWon -> GoldAccent.copy(alpha = 0.15f)
        else -> TradingRed.copy(alpha = 0.15f)
    }

    val statusColor = when {
        isPending -> ElectricBlue
        isRunning -> TradingGreen
        isWon -> GoldAccent
        else -> TradingRed
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceDark)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(14.dp)
            .testTag("signal_card_${signal.id}")
    ) {
        Column {
            // Header Row: Pair, Type, Status & Timeframe
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = signal.pair.symbol,
                        color = TextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Box(
                        modifier = Modifier
                            .background(
                                if (signal.type.isBuy) TradingGreen.copy(alpha = 0.2f) else TradingRed.copy(alpha = 0.2f),
                                RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = signal.type.label,
                            color = if (signal.type.isBuy) TradingGreen else TradingRed,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Box(
                        modifier = Modifier
                            .background(SurfaceElevated, RoundedCornerShape(4.dp))
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = signal.timeframe.label,
                            color = TextSecondary,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (signal.confluenceScore >= 90) {
                        Box(
                            modifier = Modifier
                                .background(GoldAccent.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 5.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "🔥 A+ VIP",
                                color = GoldAccent,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    // Status Pill
                    Box(
                        modifier = Modifier
                            .background(statusBg, RoundedCornerShape(12.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            val icon = when {
                                isPending -> Icons.Default.Schedule
                                isRunning -> Icons.Default.PlayArrow
                                else -> Icons.Default.Check
                            }
                            Icon(
                                imageVector = icon,
                                contentDescription = signal.status.label,
                                tint = statusColor,
                                modifier = Modifier.size(11.dp)
                            )
                            Text(
                                text = signal.status.label,
                                color = statusColor,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    IconButton(
                        onClick = onToggleFavorite,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = if (signal.isFavorite) Icons.Default.Star else Icons.Default.StarBorder,
                            contentDescription = "Favorite",
                            tint = if (signal.isFavorite) GoldAccent else TextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Order Type & Timeframe Subheader
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = signal.getOrderKindDescription(),
                    color = if (isPending) GoldAccent else TextSecondary,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${signal.timeframe.label} Chart",
                    color = TextMuted,
                    fontSize = 10.sp
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Real-Time Live Price Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(6.dp))
                    .background(SurfaceElevated.copy(alpha = 0.7f))
                    .border(1.dp, SurfaceBorder.copy(alpha = 0.6f), RoundedCornerShape(6.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(modifier = Modifier.size(6.dp).background(TradingGreen, RoundedCornerShape(50)))
                    Text("LIVE PRICE:", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(signal.pair.formattedCurrentPrice, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                val changePips = signal.pair.changePips
                val isPos = signal.pair.isPositive
                Text(
                    text = "${if (isPos) "+" else ""}${changePips}p",
                    color = if (isPos) TradingGreen else TradingRed,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // If Pending: Show dynamic countdown timer based on timeframe volatility
            if (isPending) {
                Spacer(modifier = Modifier.height(6.dp))
                val countdownStr = signal.getFormattedCountdown(nowClockMs)
                val progress = signal.getValidityProgress(nowClockMs)
                val remainingMs = signal.getRemainingValidityMs(nowClockMs)
                val isExpiringSoon = remainingMs < (15 * 60 * 1000L) // Less than 15 mins left
                val timerTint = if (isExpiringSoon) TradingRed else GoldAccent

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(timerTint.copy(alpha = 0.08f))
                        .border(1.dp, timerTint.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 9.dp, vertical = 6.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                Icon(
                                    imageVector = Icons.Default.Timer,
                                    contentDescription = "Setup Validity Countdown",
                                    tint = timerTint,
                                    modifier = Modifier.size(13.dp)
                                )
                                Text(
                                    text = "VALID SETUP:",
                                    color = TextMuted,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = countdownStr,
                                    color = timerTint,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .background(SurfaceElevated, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 5.dp, vertical = 1.dp)
                            ) {
                                Text(
                                    text = "${signal.timeframe.label} Volatility Window",
                                    color = TextSecondary,
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        // Linear countdown gauge
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(3.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(SurfaceBorder)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(fraction = progress)
                                    .fillMaxHeight()
                                    .background(timerTint)
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Awaiting fill @ ${signal.pair.formatPrice(signal.entryPrice)}",
                                color = TextSecondary,
                                fontSize = 9.sp
                            )
                            Text(
                                text = signal.validityExpiresAt,
                                color = TextMuted,
                                fontSize = 8.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Killzone Session & Win Probability Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "⚡ ${signal.killzone}",
                    color = ElectricBlue,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Win Prob: ${signal.winProbability}%",
                    color = if (signal.winProbability >= 85) TradingGreen else TextSecondary,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Parameters Grid
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceElevated.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1.05f)) {
                    Text("ENTRY", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(signal.pair.formatPrice(signal.entryPrice), color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                }
                Column(modifier = Modifier.weight(1.05f)) {
                    Text("SL", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(signal.pair.formatPrice(signal.stopLoss), color = TradingRed, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                }
                Column(modifier = Modifier.weight(1.0f)) {
                    Text("TP 1", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(signal.pair.formatPrice(signal.takeProfit1), color = TradingGreen, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                }
                Column(modifier = Modifier.weight(1.0f)) {
                    Text("TP 2", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(signal.pair.formatPrice(signal.takeProfit2), color = TradingGreen, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                }
                Column(modifier = Modifier.weight(0.9f), horizontalAlignment = Alignment.End) {
                    Text("PIPS", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    val pipsColor = if (signal.pips > 0) TradingGreen else if (signal.pips < 0) TradingRed else TextSecondary
                    Text(
                        text = if (isPending) "Pending" else "${if (signal.pips > 0) "+" else ""}${signal.pips}",
                        color = pipsColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Footer metadata: Confluence, Quick Copy & Timestamp
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Confluence: ${signal.confluenceScore}%",
                        color = if (signal.confluenceScore >= 90) GoldAccent else TextSecondary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text("•", color = TextMuted, fontSize = 10.sp)
                    Text(
                        text = "R:R ${signal.riskReward}",
                        color = ElectricBlue,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (onAskAi != null) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(ElectricBlue.copy(alpha = 0.15f))
                                .border(1.dp, ElectricBlue.copy(alpha = 0.4f), RoundedCornerShape(4.dp))
                                .clickable { onAskAi() }
                                .padding(horizontal = 6.dp, vertical = 3.dp)
                                .testTag("signal_ai_btn_${signal.id}")
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                Icon(
                                    imageVector = Icons.Default.AutoAwesome,
                                    contentDescription = "AI Copilot",
                                    tint = ElectricBlue,
                                    modifier = Modifier.size(11.dp)
                                )
                                Text(
                                    text = "AI Copilot",
                                    color = ElectricBlue,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(SurfaceElevated)
                            .clickable {
                                clipboardManager.setText(AnnotatedString(signal.formatMt4Order()))
                                justCopied = true
                            }
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                            Icon(
                                imageVector = if (justCopied) Icons.Default.Check else Icons.Default.ContentCopy,
                                contentDescription = "Copy Order",
                                tint = if (justCopied) TradingGreen else GoldAccent,
                                modifier = Modifier.size(11.dp)
                            )
                            Text(
                                text = if (justCopied) "Copied!" else "Copy MT4",
                                color = if (justCopied) TradingGreen else GoldAccent,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Text(
                        text = signal.timestamp,
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
