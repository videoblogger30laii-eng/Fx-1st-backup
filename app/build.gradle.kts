import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.forexsignals"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.forexsignals.xalgue"
        minSdk = 24
        targetSdk = 36
        versionCode = 3
        versionName = "1.2"

        val envFile = rootProject.file(".env")
        val envExampleFile = rootProject.file(".env.example")
        val props = Properties()
        if (envFile.exists()) {
            props.load(envFile.inputStream())
        } else if (envExampleFile.exists()) {
            props.load(envExampleFile.inputStream())
        }

        val geminiKey = props.getProperty("GEMINI_API_KEY", System.getenv("GEMINI_API_KEY") ?: "")
        val twelveDataKey = props.getProperty("TWELVE_DATA_API_KEY", System.getenv("TWELVE_DATA_API_KEY") ?: "")
        val finnhubKey = props.getProperty("FINNHUB_API_KEY", System.getenv("FINNHUB_API_KEY") ?: "")
        val rawDerivToken = props.getProperty("DERIV_API_TOKEN", "")
        val derivToken = if (rawDerivToken.isNotBlank() && !rawDerivToken.startsWith("pat_74d") && !rawDerivToken.startsWith("34sb")) {
            rawDerivToken
        } else {
            "pat_5b55ef16adcb17f24d53c26842e6ba8426a003918d8f0a9c9393f8d39a7cb16c"
        }
        val derivAppId = "10154"

        buildConfigField("String", "GEMINI_API_KEY", "\"$geminiKey\"")
        buildConfigField("String", "TWELVE_DATA_API_KEY", "\"$twelveDataKey\"")
        buildConfigField("String", "FINNHUB_API_KEY", "\"$finnhubKey\"")
        buildConfigField("String", "DERIV_API_TOKEN", "\"$derivToken\"")
        buildConfigField("String", "DERIV_APP_ID", "\"$derivAppId\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)
    androidTestImplementation(composeBom)

    // Core Android dependencies
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)

    // Arch Components
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    // Networking & WebSockets
    implementation(libs.okhttp)

    // Compose
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)

    // Tooling
    debugImplementation(libs.androidx.compose.ui.tooling)

    // Tests
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
