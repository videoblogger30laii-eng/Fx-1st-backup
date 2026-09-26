package com.example.forexsignals.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.forexsignals.theme.*

@Composable
fun RiskCalculatorModal(
    onDismiss: () -> Unit
) {
    var balanceText by remember { mutableStateOf("10000") }
    var riskPercentText by remember { mutableStateOf("1.5") }
    var slPipsText by remember { mutableStateOf("25") }

    val balance = balanceText.toDoubleOrNull() ?: 10000.0
    val riskPercent = riskPercentText.toDoubleOrNull() ?: 1.5
    val slPips = slPipsText.toDoubleOrNull() ?: 25.0

    val riskAmount = balance * (riskPercent / 100.0)
    // 1 standard lot = $10 per pip for EUR/USD
    val lotSize = if (slPips > 0.0) riskAmount / (slPips * 10.0) else 0.0

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = SurfaceElevated,
            modifier = Modifier.fillMaxWidth().testTag("risk_calculator_dialog")
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Institutional Risk Calculator",
                    color = TextPrimary,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Calculate exact lot sizing according to 1-2% institutional rules.",
                    color = TextSecondary,
                    fontSize = 11.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = balanceText,
                    onValueChange = { balanceText = it },
                    label = { Text("Account Balance ($)") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = TradingGreen,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    modifier = Modifier.fillMaxWidth().testTag("calc_balance_input")
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = riskPercentText,
                        onValueChange = { riskPercentText = it },
                        label = { Text("Risk %") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = TradingGreen,
                            unfocusedBorderColor = SurfaceBorder
                        ),
                        modifier = Modifier.weight(1f).testTag("calc_risk_input")
                    )

                    OutlinedTextField(
                        value = slPipsText,
                        onValueChange = { slPipsText = it },
                        label = { Text("SL (Pips)") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = TradingGreen,
                            unfocusedBorderColor = SurfaceBorder
                        ),
                        modifier = Modifier.weight(1f).testTag("calc_sl_input")
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Result Box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Max Risk ($):", color = TextSecondary, fontSize = 12.sp)
                            Text(
                                "$${String.format("%.2f", riskAmount)}",
                                color = TradingRed,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Recommended Lot Size:", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Text(
                                String.format("%.2f Lots", lotSize),
                                color = TradingGreen,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = TradingGreen, contentColor = BackgroundDark),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Apply & Close", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
