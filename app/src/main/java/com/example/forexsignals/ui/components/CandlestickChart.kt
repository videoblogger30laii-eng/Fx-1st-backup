package com.example.forexsignals.ui.components

import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.forexsignals.model.CandleStick
import com.example.forexsignals.model.ForexPair
import com.example.forexsignals.model.Timeframe
import com.example.forexsignals.theme.*
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.sqrt

@Composable
fun CandlestickChart(
    candles: List<CandleStick>,
    selectedPair: ForexPair,
    timeframe: Timeframe = Timeframe.H1,
    showEma: Boolean = true,
    showBollinger: Boolean = true,
    showRsi: Boolean = true,
    providerLabel: String = "Interbank / Yahoo",
    modifier: Modifier = Modifier
) {
    if (candles.isEmpty()) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .height(260.dp)
                .background(SurfaceDark, RoundedCornerShape(12.dp))
                .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text("Loading real-time candlestick data...", color = TextSecondary, fontSize = 12.sp)
        }
        return
    }

    val livePrice = if (selectedPair.currentPrice > 0.0) selectedPair.currentPrice else candles.last().close
    val lastCandle = candles.last()
    val isLiveBullish = livePrice >= lastCandle.open

    // Price scaling with safe visual buffer
    val rawMin = minOf(candles.minOf { it.low }, livePrice)
    val rawMax = maxOf(candles.maxOf { it.high }, livePrice)
    val span = rawMax - rawMin
    val buffer = maxOf(span * 0.08, if (selectedPair.isGoldOrCrypto) 0.8 else 0.0003)
    val minPrice = rawMin - buffer
    val maxPrice = rawMax + buffer
    val priceRange = maxOf(maxPrice - minPrice, 0.00001)

    // Dedicated provider label for candlesticks
    val candleSyncSource = when {
        selectedPair.symbol == "BTC/USD" -> "Binance Klines (Real-time)"
        selectedPair.symbol == "XAU/USD" -> "Binance PAXG / Gold Feed"
        else -> "Yahoo Interbank OHLC"
    }

    // Compute RSI values
    val rsiValues = remember(candles) { calculateRsi(candles, 14) }
    val currentRsi = rsiValues.lastOrNull() ?: 50.0

    // Paints for text labels on Canvas
    val axisTextPaint = remember {
        Paint().apply {
            color = android.graphics.Color.parseColor("#8E9AA8")
            textSize = 25f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            isAntiAlias = true
        }
    }

    val liveBadgePaint = remember {
        Paint().apply {
            color = android.graphics.Color.WHITE
            textSize = 24f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            isAntiAlias = true
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(SurfaceDark, RoundedCornerShape(12.dp))
            .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Chart Status Header with Active Overlays & Live Price Match
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    modifier = Modifier
                        .background(if (isLiveBullish) TradingGreen.copy(alpha = 0.18f) else TradingRed.copy(alpha = 0.18f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "LIVE CANDLE: ${selectedPair.formatPrice(livePrice)}",
                        color = if (isLiveBullish) TradingGreen else TradingRed,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black
                    )
                }

                if (showEma) {
                    Text("EMA(9)", color = ElectricBlue, fontSize = 9.5.sp, fontWeight = FontWeight.Bold)
                }
                if (showBollinger) {
                    Text("BB(20,2)", color = GoldAccent, fontSize = 9.5.sp, fontWeight = FontWeight.Bold)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(
                    modifier = Modifier
                        .background(SurfaceElevated, RoundedCornerShape(4.dp))
                        .border(0.5.dp, SurfaceBorder, RoundedCornerShape(4.dp))
                        .padding(horizontal = 5.dp, vertical = 1.5.dp)
                ) {
                    Text(
                        text = candleSyncSource,
                        color = ElectricBlue,
                        fontSize = 8.5.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Text(
                    text = "${timeframe.label} • ${candles.size} BARS",
                    color = TextMuted,
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        // Main Candlestick Canvas
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(250.dp)
                .testTag("candlestick_chart_canvas")
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val canvasWidth = size.width
                val canvasHeight = size.height

                val rightAxisWidth = 68.dp.toPx()
                val bottomTimeHeight = 20.dp.toPx()
                val chartWidth = canvasWidth - rightAxisWidth
                val chartHeight = canvasHeight - bottomTimeHeight

                val candleCount = candles.size
                val candleSpacing = chartWidth / candleCount
                val candleWidth = (candleSpacing * 0.70f).coerceIn(4.dp.toPx(), 18.dp.toPx())

                val dashEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f), 0f)

                // 1. Right axis separator
                drawLine(
                    color = SurfaceBorder,
                    start = Offset(chartWidth, 0f),
                    end = Offset(chartWidth, chartHeight),
                    strokeWidth = 1f
                )

                // 2. Horizontal Grid Lines & Price Labels
                val gridLineCount = 4
                for (i in 0..gridLineCount) {
                    val y = chartHeight * (i.toFloat() / gridLineCount)
                    drawLine(
                        color = SurfaceBorder.copy(alpha = 0.5f),
                        start = Offset(0f, y),
                        end = Offset(chartWidth, y),
                        strokeWidth = 0.8f,
                        pathEffect = dashEffect
                    )

                    val gridPrice = maxPrice - (i.toFloat() / gridLineCount) * priceRange
                    val priceStr = selectedPair.formatPrice(gridPrice)
                    drawContext.canvas.nativeCanvas.drawText(
                        priceStr,
                        chartWidth + 5.dp.toPx(),
                        y + 4.dp.toPx(),
                        axisTextPaint
                    )
                }

                // 3. Subtle Institutional Volume Sub-bars (Bottom 18% of canvas)
                val maxVol = candles.maxOfOrNull { it.volume }?.coerceAtLeast(1.0) ?: 1.0
                val volAreaHeight = chartHeight * 0.16f
                candles.forEachIndexed { idx, candle ->
                    val isBull = candle.close >= candle.open
                    val volColor = if (isBull) TradingGreen.copy(alpha = 0.20f) else TradingRed.copy(alpha = 0.20f)
                    val cx = (idx * candleSpacing) + (candleSpacing / 2f)
                    val vh = ((candle.volume / maxVol) * volAreaHeight).toFloat().coerceAtLeast(1.5f)
                    drawRoundRect(
                        color = volColor,
                        topLeft = Offset(cx - (candleWidth / 2f), chartHeight - vh),
                        size = Size(candleWidth, vh),
                        cornerRadius = CornerRadius(1.dp.toPx(), 1.dp.toPx())
                    )
                }

                // 4. Bollinger Bands Overlay (Smooth continuous envelope across all bars)
                if (showBollinger && candleCount >= 3) {
                    val bbPeriod = minOf(20, candleCount)
                    val upperPoints = mutableListOf<Offset>()
                    val lowerPoints = mutableListOf<Offset>()
                    val middlePoints = mutableListOf<Offset>()

                    for (i in 0 until candleCount) {
                        val startIdx = maxOf(0, i - bbPeriod + 1)
                        val sublist = candles.subList(startIdx, i + 1).map { it.close }
                        val sma = sublist.average()
                        val variance = if (sublist.size > 1) {
                            sublist.map { (it - sma) * (it - sma) }.average()
                        } else 0.0
                        val stdDev = sqrt(variance)
                        val upper = sma + 2 * stdDev
                        val lower = sma - 2 * stdDev

                        val x = (i * candleSpacing) + (candleSpacing / 2f)
                        val yUpper = chartHeight - ((upper - minPrice) / priceRange * chartHeight).toFloat()
                        val yLower = chartHeight - ((lower - minPrice) / priceRange * chartHeight).toFloat()
                        val yMid = chartHeight - ((sma - minPrice) / priceRange * chartHeight).toFloat()

                        upperPoints.add(Offset(x, yUpper))
                        lowerPoints.add(Offset(x, yLower))
                        middlePoints.add(Offset(x, yMid))
                    }

                    if (upperPoints.isNotEmpty()) {
                        val upperPath = Path().apply {
                            moveTo(upperPoints.first().x, upperPoints.first().y)
                            upperPoints.forEach { lineTo(it.x, it.y) }
                        }
                        val lowerPath = Path().apply {
                            moveTo(lowerPoints.first().x, lowerPoints.first().y)
                            lowerPoints.forEach { lineTo(it.x, it.y) }
                        }

                        drawPath(upperPath, color = GoldAccent.copy(alpha = 0.55f), style = Stroke(width = 1.2.dp.toPx()))
                        drawPath(lowerPath, color = GoldAccent.copy(alpha = 0.55f), style = Stroke(width = 1.2.dp.toPx()))

                        // Fill area between bands smoothly
                        val fillPath = Path().apply {
                            moveTo(upperPoints.first().x, upperPoints.first().y)
                            upperPoints.forEach { lineTo(it.x, it.y) }
                            for (k in lowerPoints.indices.reversed()) {
                                lineTo(lowerPoints[k].x, lowerPoints[k].y)
                            }
                            close()
                        }
                        drawPath(fillPath, color = GoldAccent.copy(alpha = 0.05f))
                    }
                }

                // 5. EMA(9) Overlay
                if (showEma && candleCount >= 3) {
                    val emaPoints = mutableListOf<Offset>()
                    val kMultiplier = 2.0 / (9.0 + 1.0)
                    var ema = candles.first().close

                    candles.forEachIndexed { i, candle ->
                        ema = (candle.close * kMultiplier) + (ema * (1.0 - kMultiplier))
                        val x = (i * candleSpacing) + (candleSpacing / 2f)
                        val y = chartHeight - ((ema - minPrice) / priceRange * chartHeight).toFloat()
                        emaPoints.add(Offset(x, y))
                    }

                    val emaPath = Path().apply {
                        moveTo(emaPoints.first().x, emaPoints.first().y)
                        emaPoints.forEach { lineTo(it.x, it.y) }
                    }
                    drawPath(emaPath, color = ElectricBlue.copy(alpha = 0.85f), style = Stroke(width = 1.6.dp.toPx()))
                }

                // 6. Draw Candlesticks with Real Visible Bodies & Crisp Wicks
                candles.forEachIndexed { index, candle ->
                    val isLast = index == candleCount - 1
                    val effClose = if (isLast) livePrice else candle.close
                    val effHigh = if (isLast) maxOf(candle.high, livePrice) else candle.high
                    val effLow = if (isLast) minOf(candle.low, livePrice) else candle.low

                    val centerX = (index * candleSpacing) + (candleSpacing / 2f)
                    val highY = chartHeight - ((effHigh - minPrice) / priceRange * chartHeight).toFloat()
                    val lowY = chartHeight - ((effLow - minPrice) / priceRange * chartHeight).toFloat()
                    val openY = chartHeight - ((candle.open - minPrice) / priceRange * chartHeight).toFloat()
                    val closeY = chartHeight - ((effClose - minPrice) / priceRange * chartHeight).toFloat()

                    val isBullish = effClose >= candle.open
                    val candleColor = if (isBullish) TradingGreen else TradingRed

                    // High to Low wick (Bold, clean 1.5dp stroke)
                    drawLine(
                        color = candleColor.copy(alpha = 0.90f),
                        start = Offset(centerX, highY),
                        end = Offset(centerX, lowY),
                        strokeWidth = 1.4.dp.toPx()
                    )

                    // Candle Body: Enforce minimum visible height so dojis and daily candles never collapse into hairlines
                    val rawBodyHeight = kotlin.math.abs(closeY - openY)
                    val minBodyHeight = 3.5.dp.toPx()
                    val bodyHeight = maxOf(rawBodyHeight, minBodyHeight)
                    val topY = minOf(openY, closeY)
                    val adjustedTopY = if (rawBodyHeight < minBodyHeight) {
                        topY - ((minBodyHeight - rawBodyHeight) / 2f)
                    } else {
                        topY
                    }

                    // Filled rounded body
                    drawRoundRect(
                        color = candleColor,
                        topLeft = Offset(centerX - (candleWidth / 2f), adjustedTopY),
                        size = Size(candleWidth, bodyHeight),
                        cornerRadius = CornerRadius(1.5.dp.toPx(), 1.5.dp.toPx())
                    )

                    // Crisp body edge contour
                    drawRoundRect(
                        color = candleColor.copy(alpha = 1.0f),
                        topLeft = Offset(centerX - (candleWidth / 2f), adjustedTopY),
                        size = Size(candleWidth, bodyHeight),
                        cornerRadius = CornerRadius(1.5.dp.toPx(), 1.5.dp.toPx()),
                        style = Stroke(width = 0.8.dp.toPx())
                    )
                }

                // 7. High & Low Peak Markers
                val maxCandle = candles.maxByOrNull { it.high }
                val minCandle = candles.minByOrNull { it.low }
                if (maxCandle != null) {
                    val maxIdx = candles.indexOf(maxCandle)
                    val maxX = (maxIdx * candleSpacing) + (candleSpacing / 2f)
                    val maxY = chartHeight - ((maxCandle.high - minPrice) / priceRange * chartHeight).toFloat()
                    drawCircle(TradingGreen, radius = 3.dp.toPx(), center = Offset(maxX, maxY))
                }
                if (minCandle != null) {
                    val minIdx = candles.indexOf(minCandle)
                    val minX = (minIdx * candleSpacing) + (candleSpacing / 2f)
                    val minY = chartHeight - ((minCandle.low - minPrice) / priceRange * chartHeight).toFloat()
                    drawCircle(TradingRed, radius = 3.dp.toPx(), center = Offset(minX, minY))
                }

                // 8. CURRENT LIVE PRICE DASHED LINE & RIGHT-AXIS BADGE
                val liveY = (chartHeight - ((livePrice - minPrice) / priceRange * chartHeight))
                    .toFloat()
                    .coerceIn(8f, chartHeight - 8f)

                val liveLineColor = if (isLiveBullish) TradingGreen else TradingRed
                drawLine(
                    color = liveLineColor,
                    start = Offset(0f, liveY),
                    end = Offset(chartWidth, liveY),
                    strokeWidth = 1.5.dp.toPx(),
                    pathEffect = dashEffect
                )

                // Live price badge on right axis
                val badgeHeight = 18.dp.toPx()
                val badgeWidth = rightAxisWidth - 6.dp.toPx()
                val badgeLeft = chartWidth + 3.dp.toPx()
                val badgeTop = liveY - (badgeHeight / 2f)

                drawRoundRect(
                    color = liveLineColor,
                    topLeft = Offset(badgeLeft, badgeTop),
                    size = Size(badgeWidth, badgeHeight),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
                )

                val liveText = selectedPair.formatPrice(livePrice)
                drawContext.canvas.nativeCanvas.drawText(
                    liveText,
                    badgeLeft + 4.dp.toPx(),
                    badgeTop + 13.dp.toPx(),
                    liveBadgePaint
                )

                // 9. Time labels along bottom
                val timeFormat = when (timeframe) {
                    Timeframe.D1 -> SimpleDateFormat("MMM dd", Locale.US)
                    Timeframe.H4 -> SimpleDateFormat("MM/dd HH:mm", Locale.US)
                    else -> SimpleDateFormat("HH:mm", Locale.US)
                }
                val step = maxOf(candleCount / 4, 1)
                for (k in 0 until candleCount step step) {
                    val candle = candles[k]
                    val x = (k * candleSpacing) + 2.dp.toPx()
                    val timeStr = timeFormat.format(Date(candle.timestamp))
                    drawContext.canvas.nativeCanvas.drawText(
                        timeStr,
                        x,
                        chartHeight + 15.dp.toPx(),
                        axisTextPaint
                    )
                }
            }
        }

        // RSI(14) Sub-Panel
        if (showRsi) {
            HorizontalDivider(color = SurfaceBorder, thickness = 0.5.dp)
            RsiSubPanel(
                rsiValues = rsiValues,
                currentRsi = currentRsi,
                modifier = Modifier.fillMaxWidth().height(64.dp)
            )
        }
    }
}

@Composable
private fun RsiSubPanel(
    rsiValues: List<Double>,
    currentRsi: Double,
    modifier: Modifier = Modifier
) {
    val rsiColor = when {
        currentRsi >= 70.0 -> TradingRed
        currentRsi <= 30.0 -> TradingGreen
        else -> ElectricBlue
    }

    val rsiStatus = when {
        currentRsi >= 70.0 -> "OVERBOUGHT"
        currentRsi <= 30.0 -> "OVERSOLD"
        else -> "NEUTRAL"
    }

    Column(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "RSI (14): ${String.format(Locale.US, "%.1f", currentRsi)}",
                color = rsiColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = rsiStatus,
                color = rsiColor,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(2.dp))

        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            val dash = PathEffect.dashPathEffect(floatArrayOf(4f, 4f), 0f)

            // 70 level
            val y70 = h * 0.3f
            drawLine(TradingRed.copy(alpha = 0.5f), Offset(0f, y70), Offset(w, y70), strokeWidth = 1f, pathEffect = dash)

            // 50 level
            val y50 = h * 0.5f
            drawLine(SurfaceBorder.copy(alpha = 0.6f), Offset(0f, y50), Offset(w, y50), strokeWidth = 0.8f)

            // 30 level
            val y30 = h * 0.7f
            drawLine(TradingGreen.copy(alpha = 0.5f), Offset(0f, y30), Offset(w, y30), strokeWidth = 1f, pathEffect = dash)

            // RSI line
            if (rsiValues.size >= 2) {
                val stepX = w / rsiValues.size
                val path = Path()
                rsiValues.forEachIndexed { i, rsi ->
                    val x = i * stepX + (stepX / 2f)
                    val clamped = rsi.coerceIn(0.0, 100.0)
                    val y = (h - (clamped / 100.0 * h)).toFloat()
                    if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
                }
                drawPath(path, color = rsiColor, style = Stroke(width = 1.5.dp.toPx()))
            }
        }
    }
}

private fun calculateRsi(candles: List<CandleStick>, period: Int = 14): List<Double> {
    if (candles.size < 2) return listOf(50.0)

    val rsiList = mutableListOf<Double>()
    var avgGain = 0.0
    var avgLoss = 0.0

    val initialCount = minOf(period, candles.size - 1)
    for (i in 1..initialCount) {
        val change = candles[i].close - candles[i - 1].close
        if (change >= 0) avgGain += change else avgLoss += -change
    }
    avgGain /= initialCount
    avgLoss /= initialCount

    val firstRs = if (avgLoss == 0.0) 100.0 else avgGain / avgLoss
    val firstRsi = if (avgLoss == 0.0) 100.0 else 100.0 - (100.0 / (1.0 + firstRs))
    rsiList.add(firstRsi)

    for (i in (initialCount + 1) until candles.size) {
        val change = candles[i].close - candles[i - 1].close
        val gain = if (change > 0) change else 0.0
        val loss = if (change < 0) -change else 0.0

        avgGain = (avgGain * (period - 1) + gain) / period
        avgLoss = (avgLoss * (period - 1) + loss) / period

        val rs = if (avgLoss == 0.0) 100.0 else avgGain / avgLoss
        val rsi = if (avgLoss == 0.0) 100.0 else 100.0 - (100.0 / (1.0 + rs))
        rsiList.add(rsi)
    }

    return rsiList
}
