package com.example.forexsignals.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Numbers
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.forexsignals.model.MarketDataProvider
import com.example.forexsignals.theme.*
import com.example.forexsignals.viewmodel.ForexViewModel

/**
 * Market Data Provider selection and credential configuration dialog.
 * Separates Deriv App ID (strictly 5-digit numeric) and Deriv API Token (PAT format),
 * preventing variable mirroring or state overwriting.
 */
@Composable
fun MarketDataProviderModal(
    currentProvider: MarketDataProvider,
    twelveDataKey: String = "",
    finnhubKey: String = "",
    derivKey: String = "",
    derivAppId: String = "10154",
    activeStatus: String = "Connected",
    viewModel: ForexViewModel? = null,
    onSelect: (MarketDataProvider) -> Unit,
    onSaveApiKey: (MarketDataProvider, String) -> Unit,
    onSaveDerivConfig: ((appId: String, token: String) -> Unit)? = null,
    onDismiss: () -> Unit
) {
    var selectedProvider by remember { mutableStateOf(currentProvider) }

    // Fully separated independent state holders:
    var derivAppIdInput by remember(derivAppId) {
        val cleaned = derivAppId.filter { it.isDigit() }.take(5)
        mutableStateOf(cleaned.ifEmpty { "10154" })
    }

    var derivApiTokenInput by remember(derivKey) {
        val trimmed = derivKey.trim()
        val token = if (trimmed.startsWith("pat_74d") || trimmed.startsWith("34sb") || trimmed.isEmpty()) {
            "pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c"
        } else {
            trimmed
        }
        mutableStateOf(token)
    }

    // Separate text controller for non-Deriv providers (Twelve Data / Finnhub)
    var genericApiKeyInput by remember(selectedProvider, twelveDataKey, finnhubKey) {
        mutableStateOf(
            when (selectedProvider) {
                MarketDataProvider.TWELVE_DATA -> twelveDataKey
                MarketDataProvider.FINNHUB -> finnhubKey
                else -> ""
            }
        )
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = SurfaceElevated,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Live Market Data Provider",
                            color = TextPrimary,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Connect real institutional feeds or enter API tokens.",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                MarketDataProvider.values().forEach { provider ->
                    val isSelected = selectedProvider == provider
                    val hasKey = when (provider) {
                        MarketDataProvider.TWELVE_DATA -> twelveDataKey.isNotBlank()
                        MarketDataProvider.FINNHUB -> finnhubKey.isNotBlank()
                        MarketDataProvider.DERIV -> derivApiTokenInput.isNotBlank() || derivKey.isNotBlank()
                        else -> true
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .background(if (isSelected) SurfaceDark else SurfaceElevated, RoundedCornerShape(8.dp))
                            .border(1.dp, if (isSelected) TradingGreen else SurfaceBorder, RoundedCornerShape(8.dp))
                            .clickable {
                                selectedProvider = provider
                                onSelect(provider)
                            }
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = provider.displayName,
                                        color = if (isSelected) TradingGreen else TextPrimary,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (provider.requiresKey) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        val badgeText = when {
                                            provider == MarketDataProvider.DERIV && (derivApiTokenInput.isNotBlank() || derivKey.isNotBlank()) -> "TOKEN SAVED"
                                            provider == MarketDataProvider.DERIV -> "FREE TICK STREAM"
                                            hasKey -> "KEY SAVED"
                                            else -> "KEY REQ"
                                        }
                                        val badgeColor = if (hasKey || provider == MarketDataProvider.DERIV) TradingGreen else GoldAccent
                                        Box(
                                            modifier = Modifier
                                                .background(badgeColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                                .padding(horizontal = 5.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = badgeText,
                                                color = badgeColor,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = if (provider.description.isNotBlank()) provider.description else "${provider.endpointName} • ${provider.keyHint}",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    lineHeight = 13.sp
                                )
                            }
                            if (isSelected) {
                                Text("ACTIVE", color = TradingGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Deriv Dedicated Configuration Section (Completely independent App ID & Token fields)
                if (selectedProvider == MarketDataProvider.DERIV) {
                    Spacer(modifier = Modifier.height(14.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SurfaceDark, RoundedCornerShape(8.dp))
                            .border(1.dp, TradingGreen.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Key, contentDescription = null, tint = TradingGreen, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Deriv WebSocket Stream Config",
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))

                            // 1. Separate Deriv App ID Text Field (Strictly 5-digit numeric)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Numbers, contentDescription = null, tint = GoldAccent, modifier = Modifier.size(13.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Deriv App ID (Strictly 5 numerical digits, e.g. 10154)",
                                    color = TextSecondary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Spacer(modifier = Modifier.height(3.dp))
                            OutlinedTextField(
                                value = derivAppIdInput,
                                onValueChange = { input ->
                                    // Strictly accept only numeric digits up to 5 digits
                                    val digitsOnly = input.filter { it.isDigit() }.take(5)
                                    derivAppIdInput = digitsOnly
                                },
                                placeholder = { Text("10154", color = TextMuted, fontSize = 11.sp) },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("deriv_app_id_input"),
                                textStyle = LocalTextStyle.current.copy(fontSize = 12.sp, color = TextPrimary),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = TradingGreen,
                                    unfocusedBorderColor = SurfaceBorder,
                                    focusedContainerColor = SurfaceElevated,
                                    unfocusedContainerColor = SurfaceElevated
                                )
                            )
                            Spacer(modifier = Modifier.height(10.dp))

                            // 2. Separate Deriv API Token Text Field (Personal Access Token starting with pat_)
                            Text(
                                text = "Deriv API Token (Personal Access Token, e.g. pat_5b55...)",
                                color = TextSecondary,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            OutlinedTextField(
                                value = derivApiTokenInput,
                                onValueChange = { input ->
                                    // Save the full PAT token independently without modifying App ID
                                    derivApiTokenInput = input.trim()
                                },
                                placeholder = {
                                    Text(
                                        "pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c",
                                        color = TextMuted,
                                        fontSize = 10.sp
                                    )
                                },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("api_key_input"),
                                textStyle = LocalTextStyle.current.copy(fontSize = 11.sp, color = TextPrimary),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = TradingGreen,
                                    unfocusedBorderColor = SurfaceBorder,
                                    focusedContainerColor = SurfaceElevated,
                                    unfocusedContainerColor = SurfaceElevated
                                )
                            )

                            Spacer(modifier = Modifier.height(12.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Status: $activeStatus",
                                    color = TradingGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.weight(1f)
                                )
                                Button(
                                    onClick = {
                                        val finalAppId = derivAppIdInput.filter { it.isDigit() }.take(5).ifEmpty { "10154" }
                                        val finalToken = derivApiTokenInput.trim()
                                        // Execute state updates independently to prevent mirroring
                                        viewModel?.updateDerivCredentials(finalAppId, finalToken)
                                        if (onSaveDerivConfig != null) {
                                            onSaveDerivConfig(finalAppId, finalToken)
                                        } else {
                                            onSaveApiKey(MarketDataProvider.DERIV, finalToken)
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = TradingGreen),
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.testTag("save_api_key_btn"),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp), tint = SurfaceDark)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Connect", fontSize = 11.sp, color = SurfaceDark, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                } else if (selectedProvider.requiresKey) {
                    // Non-Deriv Providers: Twelve Data and Finnhub
                    Spacer(modifier = Modifier.height(14.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SurfaceDark, RoundedCornerShape(8.dp))
                            .border(1.dp, GoldAccent.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Key, contentDescription = null, tint = GoldAccent, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "${selectedProvider.displayName} API Key",
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            if (selectedProvider == MarketDataProvider.FINNHUB) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(SurfaceElevated, RoundedCornerShape(6.dp))
                                        .padding(8.dp)
                                ) {
                                    Text(
                                        text = "ℹ️ Finnhub provides Live Macro Indicators (DXY/UUP, S&P 500, 20Y Yields, Gold Trust), Fundamental Factors Analysis & Real-Time Forex News Wire.",
                                        color = GoldAccent,
                                        fontSize = 10.sp,
                                        lineHeight = 13.sp
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = genericApiKeyInput,
                                onValueChange = { genericApiKeyInput = it },
                                placeholder = { Text("Paste your API Key or Token here...", color = TextMuted, fontSize = 11.sp) },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("api_key_input"),
                                textStyle = LocalTextStyle.current.copy(fontSize = 12.sp, color = TextPrimary),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = TradingGreen,
                                    unfocusedBorderColor = SurfaceBorder,
                                    focusedContainerColor = SurfaceElevated,
                                    unfocusedContainerColor = SurfaceElevated
                                )
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (genericApiKeyInput.isNotBlank()) "Ready to connect" else "Fallback: Free Interbank",
                                    color = TextSecondary,
                                    fontSize = 10.sp
                                )
                                Button(
                                    onClick = {
                                        onSaveApiKey(selectedProvider, genericApiKeyInput.trim())
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = TradingGreen),
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.testTag("save_api_key_btn"),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp), tint = SurfaceDark)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Save & Connect", fontSize = 11.sp, color = SurfaceDark, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Close", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }
    }
}
