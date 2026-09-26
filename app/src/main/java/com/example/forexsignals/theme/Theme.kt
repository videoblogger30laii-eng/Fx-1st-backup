package com.example.forexsignals.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = TradingGreen,
    onPrimary = BackgroundDark,
    primaryContainer = TradingGreenDark,
    onPrimaryContainer = TradingGreen,
    secondary = ElectricBlue,
    onSecondary = TextPrimary,
    secondaryContainer = SurfaceElevated,
    onSecondaryContainer = ElectricBlue,
    tertiary = GoldAccent,
    onTertiary = BackgroundDark,
    tertiaryContainer = GoldAccentDark,
    onTertiaryContainer = GoldAccent,
    background = BackgroundDark,
    onBackground = TextPrimary,
    surface = SurfaceDark,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceElevated,
    onSurfaceVariant = TextSecondary,
    outline = SurfaceBorder,
    error = TradingRed,
    onError = TextPrimary
)

@Composable
fun ForexSignalsTheme(
    darkTheme: Boolean = true,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
