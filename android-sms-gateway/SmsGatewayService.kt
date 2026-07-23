package com.example.smsgateway

import android.app.IntentService
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class SmsGatewayService : IntentService("SmsGatewayService") {

    override fun onHandleIntent(intent: Intent?) {
        if (intent == null) return

        val trxId = intent.getStringExtra("trxId") ?: return
        val amount = intent.getDoubleExtra("amount", 0.0)
        val provider = intent.getStringExtra("provider") ?: "BKASH"
        val accountType = intent.getStringExtra("accountType") ?: "PERSONAL"
        val smsBody = intent.getStringExtra("smsBody") ?: ""
        val senderNumber = intent.getStringExtra("senderNumber") ?: ""

        Log.d("SmsGatewayService", "Syncing Transaction ID: $trxId, Amount: $amount BDT")

        // Load configs from SharedPreferences
        val sharedPref = getSharedPreferences("SmsGatewaySettings", Context.MODE_PRIVATE)
        val webhookUrl = sharedPref.getString("webhook_url", "https://api.zinichat.com/mfs-payments/sms-webhook") ?: return
        val apiKey = sharedPref.getString("api_key", "sms-gateway-secret-token") ?: return

        try {
            val url = URL(webhookUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; utf-8")
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("X-SMS-GATEWAY-API-KEY", apiKey)
            conn.doOutput = true
            conn.connectTimeout = 15000
            conn.readTimeout = 15000

            // Create JSON payload
            val jsonParam = JSONObject().apply {
                put("trxId", trxId)
                put("amount", amount)
                put("provider", provider)
                put("accountType", accountType)
                put("smsBody", smsBody)
                put("senderNumber", senderNumber)
            }

            val os = conn.outputStream
            val writer = OutputStreamWriter(os, "UTF-8")
            writer.write(jsonParam.toString())
            writer.flush()
            writer.close()
            os.close()

            val responseCode = conn.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_CREATED) {
                Log.d("SmsGatewayService", "Sync Successful for TrxID: $trxId")
            } else {
                Log.e("SmsGatewayService", "Failed to sync. Server returned: $responseCode")
            }
            conn.disconnect()
        } catch (e: Exception) {
            Log.e("SmsGatewayService", "Network Error during SMS sync", e)
        }
    }
}
