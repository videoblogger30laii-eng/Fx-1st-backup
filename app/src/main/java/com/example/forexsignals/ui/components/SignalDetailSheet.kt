package com.example.forexsignals.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.model.ForexSignal
import com.example.forexsignals.model.SignalStatus
import com.example.forexsignals.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignalDetailSheet(
    signal: ForexSignal,
    onDismiss: () -> Unit,
    onTestInBacktest: () -> Unit,
    onToggleAlert: () -> Unit,
    onToggleFavorite: () -> Unit,
    onAskAi: (ForexSignal) -> Unit = {},
    onSetCustomAlert: (ForexSignal) -> Unit = {},
    nowClockMs: Long = System.currentTimeMillis()
) {
    val clipboardManager = LocalClipboardManager.current
    var copiedLabel by remember { mutableStateOf<String?>(null) }
    var accountBalance by remember { mutableStateOf(10000.0) }
    var riskPercent by remember { mutableStateOf(1.0) }

    // Real-time ticking clock for second-by-second countdown in modal
    var activeNowMs by remember { mutableStateOf(nowClockMs) }
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(1000L)
            activeNowMs = System.currentTimeMillis()
        }
    }

    val isPending = signal.status == SignalStatus.PENDING
    val isRunning = signal.status == SignalStatus.RUNNING

    val calculatedLots = signal.calculateLotSize(accountBalance, riskPercent)
    val riskUsd = signal.calculateRiskUsd(accountBalance, riskPercent)
    val tp1Usd = signal.calculateRewardUsd(accountBalance, riskPercent, 1)
    val tp2Usd = signal.calculateRewardUsd(accountBalance, riskPercent, 2)
    val tp3Usd = signal.calculateRewardUsd(accountBalance, riskPercent, 3)
    val slPips = signal.calculateSlPips()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceElevated,
        dragHandle = { BottomSheetDefaults.DragHandle(color = SurfaceBorder) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .verticalScroll(rememberScrollState())
                .testTag("signal_detail_sheet")
        ) {
            // Header Row: Pair, Type, Status & Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
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
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = signal.type.label,
                            color = if (signal.type.isBuy) TradingGreen else TradingRed,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }
                    Box(
                        modifier = Modifier
                            .background(SurfaceDark, RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = signal.timeframe.label,
                            color = TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onToggleAlert) {
                        Icon(
                            imageVector = if (signal.hasAlert) Icons.Default.NotificationsActive else Icons.Default.NotificationsNone,
                            contentDescription = "Alert",
                            tint = if (signal.hasAlert) GoldAccent else TextSecondary
                        )
                    }
                    IconButton(onClick = onToggleFavorite) {
                        Icon(
                            imageVector = if (signal.isFavorite) Icons.Default.Star else Icons.Default.StarBorder,
                            contentDescription = "Favorite",
                            tint = if (signal.isFavorite) GoldAccent else TextSecondary
                        )
                    }
                }
            }

            Text(
                text = "${signal.pair.name} • ${signal.timeframe.label} Institutional Timeframe",
                color = TextSecondary,
                fontSize = 12.sp
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Order Execution Type & Status Card
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (isPending) GoldAccent.copy(alpha = 0.12f) else SurfaceDark)
                    .border(1.dp, if (isPending) GoldAccent.copy(alpha = 0.4f) else SurfaceBorder, RoundedCornerShape(10.dp))
                    .padding(12.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "ORDER EXECUTION TYPE",
                            color = TextMuted,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = signal.getTradeStateTitle(),
                            color = if (isPending) GoldAccent else if (isRunning) TradingGreen else TextPrimary,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Text(
                        text = "${signal.type.label} — ${signal.getOrderKindDescription()}",
                        color = TextPrimary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )

                    if (isPending) {
                        val detailCountdown = signal.getFormattedCountdown(activeNowMs)
                        val detailProgress = signal.getValidityProgress(activeNowMs)
                        val detailRemaining = signal.getRemainingValidityMs(activeNowMs)
                        val isExpiringSoon = detailRemaining < (15 * 60 * 1000L)
                        val timerColor = if (isExpiringSoon) TradingRed else GoldAccent

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(timerColor.copy(alpha = 0.10f))
                                .border(1.dp, timerColor.copy(alpha = 0.40f), RoundedCornerShape(8.dp))
                                .padding(10.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                        Icon(Icons.Default.Timer, contentDescription = "Setup Validity", tint = timerColor, modifier = Modifier.size(15.dp))
                                        Text(
                                            text = "SETUP VALIDITY:",
                                            color = TextMuted,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = detailCountdown,
                                            color = timerColor,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .background(SurfaceDark, RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = "${signal.timeframe.label} Volatility Window",
                                            color = GoldAccent,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                // Linear countdown gauge
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(4.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(SurfaceDark)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth(fraction = detailProgress)
                                            .fillMaxHeight()
                                            .background(timerColor)
                                    )
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Expires: ${signal.validityExpiresAt}",
                                        color = TextSecondary,
                                        fontSize = 10.sp
                                    )
                                    Text(
                                        text = "${(detailProgress * 100).toInt()}% window remaining",
                                        color = TextMuted,
                                        fontSize = 9.sp
                                    )
                                }
                            }
                        }

                        Text(
                            text = "Validation Rule: ${signal.invalidationTrigger}",
                            color = TextMuted,
                            fontSize = 9.sp,
                            lineHeight = 12.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Session Killzone & Economic News Shield
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(SurfaceDark)
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 7.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Icon(Icons.Default.AccessTime, contentDescription = null, tint = ElectricBlue, modifier = Modifier.size(14.dp))
                    Text(signal.killzone, color = TextPrimary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Icon(Icons.Default.Shield, contentDescription = null, tint = TradingGreen, modifier = Modifier.size(14.dp))
                    Text(signal.economicRisk, color = TradingGreen, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Floating Profit & Pip Counter Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceDark, RoundedCornerShape(12.dp))
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                    .padding(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("LIVE FLOATING RESULT", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        val pipsText = if (isPending) "Pending Trigger" else "${if (signal.pips > 0) "+" else ""}${signal.pips} Pips"
                        val pipsColor = if (isPending) ElectricBlue else if (signal.pips >= 0) TradingGreen else TradingRed
                        Text(pipsText, color = pipsColor, fontSize = 18.sp, fontWeight = FontWeight.Black)
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text("EST. PROFIT (1.0 LOT)", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        val estDollar = signal.pips * 10.0
                        val estText = if (isPending) "$0.00" else "${if (estDollar >= 0) "+$" else "-$"}${String.format("%.2f", kotlin.math.abs(estDollar))}"
                        Text(estText, color = if (isPending) TextSecondary else if (estDollar >= 0) TradingGreen else TradingRed, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Institutional Order Flow Rationale
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceDark, RoundedCornerShape(10.dp))
                    .padding(12.dp)
            ) {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Insights, contentDescription = null, tint = GoldAccent, modifier = Modifier.size(16.dp))
                        Text("INSTITUTIONAL ORDER FLOW", color = GoldAccent, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(signal.rationale, color = TextPrimary, fontSize = 12.sp, lineHeight = 16.sp)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Execution Parameters Grid
            Text("ORDER EXECUTION LEVELS", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceDark, RoundedCornerShape(12.dp))
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                LevelRow("Current Live Price", signal.pair.formattedCurrentPrice, TextPrimary, "Real-time tick (${signal.pair.changePips}p)")
                LevelRow("Order Entry Level", signal.pair.formatPrice(signal.entryPrice), TextPrimary, if (isPending) "Resting order trigger" else "Execution fill rate")
                LevelRow("Stop Loss (SL)", signal.pair.formatPrice(signal.stopLoss), TradingRed, "Invalidation (${slPips} pips)")
                LevelRow("Take Profit 1 (TP 1)", signal.pair.formatPrice(signal.takeProfit1), TradingGreen, "Conservative scale-out")
                LevelRow("Take Profit 2 (TP 2)", signal.pair.formatPrice(signal.takeProfit2), TradingGreen, "Main technical target")
                LevelRow("Take Profit 3 (TP 3)", signal.pair.formatPrice(signal.takeProfit3), TradingGreen, "Runner target")
                LevelRow("Risk / Reward", signal.riskReward, ElectricBlue, "Asymmetric payoff ratio")
                LevelRow("Confluence Score", "${signal.confluenceScore}%", GoldAccent, "${signal.quality.label} tier")
            }

            Spacer(modifier = Modifier.height(16.dp))

            // INTERACTIVE POSITION SIZE & LOT CALCULATOR CARD
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceDark)
                    .border(1.dp, GoldAccent.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                    .padding(14.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.Calculate, contentDescription = null, tint = GoldAccent, modifier = Modifier.size(16.dp))
                            Text("POSITION SIZER & LOT CALCULATOR", color = GoldAccent, fontSize = 11.sp, fontWeight = FontWeight.Black)
                        }
                        Text("${slPips} Pips SL", color = TradingRed, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }

                    // Balance Preset Selector
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Account Capital", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(1000.0 to "$1k", 5000.0 to "$5k", 10000.0 to "$10k", 50000.0 to "$50k", 100000.0 to "$100k").forEach { (bal, lbl) ->
                                val isSel = accountBalance == bal
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (isSel) GoldAccent else SurfaceElevated)
                                        .clickable { accountBalance = bal }
                                        .padding(vertical = 5.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = lbl,
                                        color = if (isSel) BackgroundDark else TextPrimary,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    // Risk Preset Selector
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Max Risk per Trade", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(0.5 to "0.5% Low", 1.0 to "1.0% Prop Standard", 2.0 to "2.0% Aggressive").forEach { (risk, lbl) ->
                                val isSel = riskPercent == risk
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (isSel) ElectricBlue else SurfaceElevated)
                                        .clickable { riskPercent = risk }
                                        .padding(vertical = 5.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = lbl,
                                        color = if (isSel) BackgroundDark else TextPrimary,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    // Calculated Output Box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SurfaceElevated, RoundedCornerShape(8.dp))
                            .padding(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("RECOMMENDED LOT SIZE", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("${String.format("%.2f", calculatedLots)} LOTS", color = TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.Black)
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(SurfaceDark)
                                            .clickable {
                                                clipboardManager.setText(AnnotatedString(String.format("%.2f", calculatedLots)))
                                                copiedLabel = "Lot Copied"
                                            }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text("Copy Lot", color = GoldAccent, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("RISK: -$${String.format("%.2f", riskUsd)}", color = TradingRed, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("TP1: +$${String.format("%.2f", tp1Usd)}", color = TradingGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("TP2: +$${String.format("%.2f", tp2Usd)}", color = TradingGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Confluence Checklist
            if (signal.checklist.isNotEmpty()) {
                Text("CONFLUENCE CHECKLIST (${signal.checklist.size} FACTORS)", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(12.dp))
                        .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    signal.checklist.forEach { item ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = if (item.isConfirmed) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                contentDescription = null,
                                tint = if (item.isConfirmed) TradingGreen else TextMuted,
                                modifier = Modifier.size(16.dp).padding(top = 2.dp)
                            )
                            Column {
                                Text(item.title, color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text(item.detail, color = TextSecondary, fontSize = 10.sp)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // AI Copilot & Alert Quick Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = {
                        onDismiss()
                        onAskAi(signal)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f).height(42.dp)
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Ask AI Copilot", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = {
                        onDismiss()
                        onSetCustomAlert(signal)
                    },
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                    modifier = Modifier.weight(1f).height(42.dp)
                ) {
                    Icon(Icons.Default.AddAlert, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Set Price Alert", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // AI COPILOT ANALYTICS BUTTON
            Button(
                onClick = { onAskAi(signal) },
                colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue, contentColor = BackgroundDark),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().height(46.dp)
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("⚡ Deep Institutional AI Copilot Analysis", fontSize = 12.sp, fontWeight = FontWeight.Black)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // COPY TRADE ACTIONS ROW
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // 1. MT4/MT5 Order String
                Button(
                    onClick = {
                        val text = signal.formatMt4Order(calculatedLots)
                        clipboardManager.setText(AnnotatedString(text))
                        copiedLabel = "MT4 Order Copied!"
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark, contentColor = TextPrimary),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                    modifier = Modifier.weight(1f).height(44.dp)
                ) {
                    Icon(
                        imageVector = if (copiedLabel?.contains("MT4") == true) Icons.Default.Check else Icons.Default.ContentCopy,
                        contentDescription = null,
                        tint = if (copiedLabel?.contains("MT4") == true) TradingGreen else TextPrimary,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (copiedLabel?.contains("MT4") == true) "MT4 Copied!" else "MT4/MT5", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // 2. Telegram / Discord Analysis Copy
                Button(
                    onClick = {
                        val text = signal.formatTelegramSignal(calculatedLots)
                        clipboardManager.setText(AnnotatedString(text))
                        copiedLabel = "Signal Copied!"
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark, contentColor = TextPrimary),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                    modifier = Modifier.weight(1f).height(44.dp)
                ) {
                    Icon(
                        imageVector = if (copiedLabel?.contains("Signal") == true) Icons.Default.Check else Icons.Default.Share,
                        contentDescription = null,
                        tint = if (copiedLabel?.contains("Signal") == true) TradingGreen else TextPrimary,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (copiedLabel?.contains("Signal") == true) "Copied!" else "Telegram", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // 3. Backtest Lab
                Button(
                    onClick = {
                        onDismiss()
                        onTestInBacktest()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = BackgroundDark),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1.2f).height(44.dp)
                ) {
                    Icon(Icons.Default.Science, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Backtest Lab", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun LevelRow(label: String, value: String, valueColor: Color, description: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(label, color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            Text(description, color = TextMuted, fontSize = 9.sp)
        }
        Text(value, color = valueColor, fontSize = 13.sp, fontWeight = FontWeight.Black)
    }
}
