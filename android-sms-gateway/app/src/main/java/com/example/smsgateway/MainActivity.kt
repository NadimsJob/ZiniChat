package com.example.smsgateway

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val smsPermissionCode = 101
    private val notifPermissionCode = 102
    private lateinit var etUrl: EditText
    private lateinit var etApiKey: EditText
    private lateinit var swBkash: Switch
    private lateinit var swNagad: Switch
    private lateinit var swRocket: Switch
    private lateinit var swBank: Switch
    private lateinit var btnSave: Button
    private lateinit var btnStop: Button
    private lateinit var tvStatus: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 60, 40, 40)
            setBackgroundColor(android.graphics.Color.parseColor("#0f0f11"))
        }

        val tvTitle = TextView(this).apply {
            text = "ZiniChat Official SMS Gateway"
            textSize = 22f
            setTextColor(android.graphics.Color.parseColor("#1F824A"))
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, 8)
        }
        layout.addView(tvTitle)

        val tvSubtitle = TextView(this).apply {
            text = "Zero-Config Automatic Payment Reader.\nRuns persistently — even when app is closed."
            textSize = 12f
            setTextColor(android.graphics.Color.GRAY)
            setPadding(0, 0, 0, 32)
        }
        layout.addView(tvSubtitle)

        // Webhook URL
        etUrl = EditText(this).apply {
            hint = "API Endpoint (Webhook URL)"
            setHintTextColor(android.graphics.Color.GRAY)
            setTextColor(android.graphics.Color.WHITE)
            setText("https://api.zinichat.com/mfs-payments/sms-webhook")
            setPadding(20, 20, 20, 20)
        }
        layout.addView(etUrl)

        // Secret Token
        etApiKey = EditText(this).apply {
            hint = "Secret Token (API Key)"
            setHintTextColor(android.graphics.Color.GRAY)
            setTextColor(android.graphics.Color.WHITE)
            setText("sms-gateway-secret-token")
            setPadding(20, 20, 20, 20)
        }
        layout.addView(etApiKey)

        val tvTogglesHeader = TextView(this).apply {
            text = "Automated Payment Provider Toggles:"
            textSize = 14f
            setTextColor(android.graphics.Color.parseColor("#EE8D27"))
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(0, 30, 0, 15)
        }
        layout.addView(tvTogglesHeader)

        // bKash Switch
        swBkash = Switch(this).apply {
            text = "🟢 bKash & Bangla QR SMS Auto-Sync"
            setTextColor(android.graphics.Color.WHITE)
            isChecked = true
            textSize = 14f
            setPadding(0, 10, 0, 10)
        }
        layout.addView(swBkash)

        // Nagad Switch
        swNagad = Switch(this).apply {
            text = "🟢 Nagad SMS Auto-Sync"
            setTextColor(android.graphics.Color.WHITE)
            isChecked = true
            textSize = 14f
            setPadding(0, 10, 0, 10)
        }
        layout.addView(swNagad)

        // Rocket Switch
        swRocket = Switch(this).apply {
            text = "🟢 Rocket SMS Auto-Sync"
            setTextColor(android.graphics.Color.WHITE)
            isChecked = true
            textSize = 14f
            setPadding(0, 10, 0, 10)
        }
        layout.addView(swRocket)

        // Bank Switch
        swBank = Switch(this).apply {
            text = "🟢 All BD Banks (City, BRAC, EBL, DBBL, etc.)"
            setTextColor(android.graphics.Color.WHITE)
            isChecked = true
            textSize = 14f
            setPadding(0, 10, 0, 20)
        }
        layout.addView(swBank)

        // Start Button
        btnSave = Button(this).apply {
            text = "🚀 Start & Keep Running (Even When Closed)"
            setBackgroundColor(android.graphics.Color.parseColor("#1F824A"))
            setTextColor(android.graphics.Color.WHITE)
            setPadding(20, 20, 20, 20)
        }
        layout.addView(btnSave)

        // Stop Button
        btnStop = Button(this).apply {
            text = "⛔ Stop Background Sync"
            setBackgroundColor(android.graphics.Color.parseColor("#7A1A1A"))
            setTextColor(android.graphics.Color.WHITE)
            setPadding(20, 16, 20, 16)
        }
        layout.addView(btnStop)

        tvStatus = TextView(this).apply {
            text = "Status: Checking..."
            setTextColor(android.graphics.Color.parseColor("#1F824A"))
            setPadding(0, 30, 0, 0)
        }
        layout.addView(tvStatus)

        // Info box
        val tvInfo = TextView(this).apply {
            text = "ℹ️ Tip: After starting, you can close this app. " +
                   "The persistent notification means SMS sync is still active. " +
                   "On Xiaomi/Samsung, go to Battery Settings → Allow background activity for this app."
            textSize = 11f
            setTextColor(android.graphics.Color.parseColor("#888888"))
            setPadding(0, 20, 0, 0)
        }
        layout.addView(tvInfo)

        setContentView(layout)

        // Load saved preferences
        val sharedPref = getSharedPreferences("SmsGatewaySettings", Context.MODE_PRIVATE)
        etUrl.setText(sharedPref.getString("webhook_url", "https://api.zinichat.com/mfs-payments/sms-webhook"))
        etApiKey.setText(sharedPref.getString("api_key", "sms-gateway-secret-token"))
        swBkash.isChecked = sharedPref.getBoolean("sync_bkash", true)
        swNagad.isChecked = sharedPref.getBoolean("sync_nagad", true)
        swRocket.isChecked = sharedPref.getBoolean("sync_rocket", true)
        swBank.isChecked = sharedPref.getBoolean("sync_bank", true)

        updateStatusUI()

        btnSave.setOnClickListener {
            val url = etUrl.text.toString().trim()
            val apiKey = etApiKey.text.toString().trim()

            if (url.isEmpty() || apiKey.isEmpty()) {
                Toast.makeText(this, "Please fill in all details", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Save to shared preferences
            sharedPref.edit().apply {
                putString("webhook_url", url)
                putString("api_key", apiKey)
                putBoolean("sync_bkash", swBkash.isChecked)
                putBoolean("sync_nagad", swNagad.isChecked)
                putBoolean("sync_rocket", swRocket.isChecked)
                putBoolean("sync_bank", swBank.isChecked)
                putBoolean("service_running", true)
                apply()
            }

            // Start Foreground Service — persists even when app is closed/swiped
            SmsGatewayService.start(this)

            tvStatus.text = "Status: 🟢 Gateway Running — Safe to close app"
            tvStatus.setTextColor(android.graphics.Color.parseColor("#1F824A"))
            Toast.makeText(this, "✅ Saved! Gateway running. You can close the app.", Toast.LENGTH_LONG).show()
        }

        btnStop.setOnClickListener {
            sharedPref.edit().putBoolean("service_running", false).apply()
            SmsGatewayService.stop(this)
            tvStatus.text = "Status: ⛔ Gateway Stopped"
            tvStatus.setTextColor(android.graphics.Color.RED)
            Toast.makeText(this, "SMS Gateway stopped.", Toast.LENGTH_SHORT).show()
        }

        checkSmsPermissions()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            checkNotificationPermission()
        }
    }

    private fun updateStatusUI() {
        val sharedPref = getSharedPreferences("SmsGatewaySettings", Context.MODE_PRIVATE)
        val isRunning = sharedPref.getBoolean("service_running", false)
        if (isRunning) {
            tvStatus.text = "Status: 🟢 Gateway Active — Running persistently"
            tvStatus.setTextColor(android.graphics.Color.parseColor("#1F824A"))
        } else {
            tvStatus.text = "Status: ⚪ Not started. Press Start to begin."
            tvStatus.setTextColor(android.graphics.Color.GRAY)
        }
    }

    private fun checkSmsPermissions() {
        val listPermissionsNeeded = ArrayList<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            listPermissionsNeeded.add(Manifest.permission.RECEIVE_SMS)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            listPermissionsNeeded.add(Manifest.permission.READ_SMS)
        }
        if (listPermissionsNeeded.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, listPermissionsNeeded.toTypedArray(), smsPermissionCode)
        }
    }

    private fun checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), notifPermissionCode)
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            smsPermissionCode -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "✅ SMS permissions granted", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "❌ SMS permissions are required for the gateway to work", Toast.LENGTH_LONG).show()
                }
            }
            notifPermissionCode -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "✅ Notification permission granted (needed for persistent service)", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
