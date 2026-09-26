package com.example.forexsignals.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Vibration
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.engine.MarketDataEngine
import com.example.forexsignals.model.AlertCondition
import com.example.forexsignals.model.ForexPair

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddAlertDialog(
    initialPair: ForexPair?,
    initialPrice: Double?,
    onDismiss: () -> Unit,
    onAddAlert: (
        pairSymbol: String,
        condition: AlertCondition,
        targetPrice: Double,
        note: String,
        soundEnabled: Boolean,
        vibrateEnabled: Boolean
    ) -> Unit
) {
    val pairs = MarketDataEngine.ALL_PAIRS
    var selectedPair by remember { mutableStateOf(initialPair ?: pairs.first()) }
    var selectedCondition by remember { mutableStateOf(AlertCondition.PRICE_ABOVE) }
    var targetPriceText by remember {
        mutableStateOf(
            if (initialPrice != null && initialPrice > 0) {
                selectedPair.formatPrice(initialPrice)
            } else {
                selectedPair.formatPrice(selectedPair.currentPrice)
            }
        )
    }
    var noteText by remember { mutableStateOf("") }
    var soundEnabled by remember { mutableStateOf(true) }
    var vibrateEnabled by remember { mutableStateOf(true) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        dragHandle = { BottomSheetDefaults.DragHandle() },
        modifier = Modifier.testTag("add_alert_modal")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "New Alert",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "Create Price & Signal Alert",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                        Text(
                            text = "Instant notification on target price or breakout",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                IconButton(onClick = onDismiss) {
                    Icon(imageVector = Icons.Default.Close, contentDescription = "Close")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Pair Selector
            Text(
                text = "Select Asset / Pair",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                pairs.take(4).forEach { pair ->
                    val isSelected = pair.symbol == selectedPair.symbol
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            selectedPair = pair
                            targetPriceText = pair.formatPrice(pair.currentPrice)
                        },
                        label = { Text(pair.symbol, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceContainer, RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Base Price: ${selectedPair.formattedBasePrice}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Current Price: ${selectedPair.formattedCurrentPrice}",
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Trigger Condition Selector
            Text(
                text = "Trigger Condition",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(6.dp))
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf(
                    AlertCondition.PRICE_ABOVE,
                    AlertCondition.PRICE_BELOW,
                    AlertCondition.TP_HIT,
                    AlertCondition.VIP_SIGNAL
                ).forEach { cond ->
                    val isSelected = cond == selectedCondition
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceContainer,
                        border = if (isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedCondition = cond }
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(horizontal = 14.dp, vertical = 10.dp)
                                .fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = cond.iconSymbol,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = cond.label,
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                )
                            }
                            RadioButton(
                                selected = isSelected,
                                onClick = { selectedCondition = cond }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Target Price Input
            Text(
                text = "Target Price Level",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(6.dp))
            OutlinedTextField(
                value = targetPriceText,
                onValueChange = { targetPriceText = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("target_price_input"),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyLarge.copy(
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                ),
                prefix = {
                    Text(
                        text = "${selectedPair.symbol}: ",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            )

            // Quick adjustment chips (+10 pips, -10 pips, reset)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val currentParsed = targetPriceText.toDoubleOrNull() ?: selectedPair.basePrice
                val pipValue = if (selectedPair.pipDigits == 2) 0.10 else 0.0010

                SuggestionChip(
                    onClick = {
                        val newP = currentParsed + pipValue * 10
                        targetPriceText = selectedPair.formatPrice(newP)
                    },
                    label = { Text("+10 pips", fontSize = 12.sp) }
                )
                SuggestionChip(
                    onClick = {
                        val newP = currentParsed - pipValue * 10
                        targetPriceText = selectedPair.formatPrice(newP)
                    },
                    label = { Text("-10 pips", fontSize = 12.sp) }
                )
                SuggestionChip(
                    onClick = {
                        targetPriceText = selectedPair.formatPrice(selectedPair.basePrice)
                    },
                    label = { Text("Current Price", fontSize = 12.sp) }
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Optional Note
            Text(
                text = "Strategy Note (Optional)",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(6.dp))
            OutlinedTextField(
                value = noteText,
                onValueChange = { noteText = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("alert_note_input"),
                placeholder = { Text("e.g., Check 15M FVG retest before executing buy") },
                singleLine = true
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Notification preferences
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(imageVector = Icons.Default.VolumeUp, contentDescription = null, modifier = Modifier.size(20.dp))
                    Text("Sound Alert", style = MaterialTheme.typography.bodyMedium)
                }
                Switch(checked = soundEnabled, onCheckedChange = { soundEnabled = it })
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(imageVector = Icons.Default.Vibration, contentDescription = null, modifier = Modifier.size(20.dp))
                    Text("Vibrate on Trigger", style = MaterialTheme.typography.bodyMedium)
                }
                Switch(checked = vibrateEnabled, onCheckedChange = { vibrateEnabled = it })
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Confirm Button
            Button(
                onClick = {
                    val price = targetPriceText.toDoubleOrNull() ?: selectedPair.basePrice
                    onAddAlert(
                        selectedPair.symbol,
                        selectedCondition,
                        price,
                        noteText,
                        soundEnabled,
                        vibrateEnabled
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("confirm_create_alert_button"),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "Activate Alert",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                )
            }
        }
    }
}
