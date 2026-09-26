package com.example.forexsignals.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.theme.*

@Composable
fun EquityCurveChart(
    equityPoints: List<Double>,
    modifier: Modifier = Modifier
) {
    if (equityPoints.isEmpty()) return

    val minEquity = equityPoints.minOrNull() ?: 10000.0
    val maxEquity = equityPoints.maxOrNull() ?: 10000.0
    val range = if (maxEquity - minEquity > 0.0) maxEquity - minEquity else 1.0

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(180.dp)
            .background(SurfaceDark, RoundedCornerShape(12.dp))
            .padding(12.dp)
            .testTag("equity_curve_chart")
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Simulated Account Growth ($10,000 Starting)",
                    color = TextSecondary,
                    fontSize = 11.sp
                )
                val finalEquity = equityPoints.last()
                val isProfit = finalEquity >= 10000.0
                Text(
                    text = "$${String.format("%,.0f", finalEquity)}",
                    color = if (isProfit) TradingGreen else TradingRed,
                    fontSize = 13.sp,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Canvas(modifier = Modifier.fillMaxSize()) {
                val width = size.width
                val height = size.height
                val pointCount = equityPoints.size
                if (pointCount < 2) return@Canvas

                val stepX = width / (pointCount - 1)
                val path = Path()
                val fillPath = Path()

                equityPoints.forEachIndexed { i, eq ->
                    val x = i * stepX
                    val normalizedY = ((eq - minEquity) / range).toFloat()
                    val y = height - (normalizedY * height * 0.85f) - (height * 0.07f)

                    if (i == 0) {
                        path.moveTo(x, y)
                        fillPath.moveTo(x, height)
                        fillPath.lineTo(x, y)
                    } else {
                        path.lineTo(x, y)
                        fillPath.lineTo(x, y)
                    }
                }

                fillPath.lineTo(width, height)
                fillPath.close()

                // Gradient Area Fill
                drawPath(
                    path = fillPath,
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            TradingGreen.copy(alpha = 0.25f),
                            TradingGreen.copy(alpha = 0.0f)
                        ),
                        startY = 0f,
                        endY = height
                    )
                )

                // Stroke Line
                drawPath(
                    path = path,
                    color = TradingGreen,
                    style = Stroke(width = 2.5f)
                )
            }
        }
    }
}
