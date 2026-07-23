package com.example.smsgateway

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val smsPermissionCode = 101
    private lateinit var etUrl: EditText
    private lateinit var etApiKey: EditText
    private lateinit var btnSave: Button
    private lateinit var tvStatus: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Dynamic UI layout via code for easy setup without needing XML layouts
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 60, 40, 40)
            setBackgroundColor(android.graphics.Color.parseColor("#0f0f11"))
        }

        val tvTitle = TextView(this).apply {
            text = "ZiniChat SMS Gateway"
            textSize = 20f
            setTextColor(android.graphics.Color.parseColor("#1F824A"))
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, 40)
        }
        layout.addView(tvTitle)

        etUrl = EditText(this).apply {
            hint = "API Endpoint (Webhook URL)"
            setHintTextColor(android.graphics.Color.GRAY)
            setTextColor(android.graphics.Color.WHITE)
            setText("https://api.zinichat.com/mfs-payments/sms-webhook")
            setPadding(20, 20, 20, 20)
        }
        layout.addView(etUrl)

        etApiKey = EditText(this).apply {
            hint = "X-SMS-GATEWAY-API-KEY"
            setHintTextColor(android.graphics.Color.GRAY)
            setTextColor(android.graphics.Color.WHITE)
            setText("sms-gateway-secret-token")
            setPadding(20, 20, 20, 20)
        }
        layout.addView(etApiKey)

        btnSave = Button(this).apply {
            text = "Start Background Sync"
            setBackgroundColor(android.graphics.Color.parseColor("#1F824A"))
            setTextColor(android.graphics.Color.BLACK)
            setPadding(20, 20, 20, 20)
        }
        layout.addView(btnSave)

        tvStatus = TextView(this).apply {
            text = "Status: Service Stopped. Waiting for configurations."
            setTextColor(android.graphics.Color.GRAY)
            setPadding(0, 40, 0, 0)
        }
        layout.addView(tvStatus)

        setContentView(layout)

        // Load saved configurations
        val sharedPref = getSharedPreferences("SmsGatewaySettings", Context.MODE_PRIVATE)
        etUrl.setText(sharedPref.getString("webhook_url", "https://api.zinichat.com/mfs-payments/sms-webhook"))
        etApiKey.setText(sharedPref.getString("api_key", "sms-gateway-secret-token"))

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
                apply()
            }

            tvStatus.text = "Status: Monitoring SMS & Syncing to backend active."
            tvStatus.setTextColor(android.graphics.Color.parseColor("#1F824A"))
            Toast.makeText(this, "Configurations saved! App running in background.", Toast.LENGTH_LONG).show()
        }

        checkSmsPermissions()
    }

    private fun checkSmsPermissions() {
        val receivePerm = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS)
        val readPerm = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS)
        
        val listPermissionsNeeded = ArrayList<String>()
        if (receivePerm != PackageManager.PERMISSION_GRANTED) {
            listPermissionsNeeded.add(Manifest.permission.RECEIVE_SMS)
        }
        if (readPerm != PackageManager.PERMISSION_GRANTED) {
            listPermissionsNeeded.add(Manifest.permission.READ_SMS)
        }
        
        if (listPermissionsNeeded.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, listPermissionsNeeded.toTypedArray(), smsPermissionCode)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == smsPermissionCode) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "SMS permissions granted", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "SMS permissions are required for the gateway to work", Toast.LENGTH_LONG).show()
            }
        }
    }
}
