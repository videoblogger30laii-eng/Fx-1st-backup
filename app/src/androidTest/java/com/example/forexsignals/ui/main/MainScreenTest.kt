package com.example.forexsignals.ui.main

import androidx.activity.ComponentActivity
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/** UI sanity tests for [com.example.forexsignals.ui.main.MainScreen]. */
class MainScreenTest {

  @get:Rule val composeTestRule = createAndroidComposeRule<ComponentActivity>()

  @Before
  fun setup() {
    composeTestRule.setContent { MainScreen(modifier = Modifier) }
  }

  @Test
  fun bottomNavigation_exists() {
    composeTestRule.onNodeWithTag("main_bottom_nav").assertExists()
  }
}
