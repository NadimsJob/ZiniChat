package com.example.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.regex.Pattern

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "android.provider.Telephony.SMS_RECEIVED") {
            val bundle = intent.extras ?: return
            try {
                val sharedPref = context.getSharedPreferences("SmsGatewaySettings", Context.MODE_PRIVATE)
                val syncBkash = sharedPref.getBoolean("sync_bkash", true)
                val syncNagad = sharedPref.getBoolean("sync_nagad", true)
                val syncRocket = sharedPref.getBoolean("sync_rocket", true)
                val syncBank = sharedPref.getBoolean("sync_bank", true)

                val pdus = bundle.get("pdus") as? Array<*> ?: return
                for (i in pdus.indices) {
                    val smsMessage = SmsMessage.createFromPdu(pdus[i] as ByteArray)
                    val sender = smsMessage.displayOriginatingAddress ?: ""
                    val body = smsMessage.displayMessageBody ?: ""

                    Log.d("SmsReceiver", "SMS Received from: $sender")

                    val isBkash = syncBkash && (sender.contains("bKash", ignoreCase = true) || sender.contains("16247"))
                    val isNagad = syncNagad && (sender.contains("NAGAD", ignoreCase = true) || sender.contains("16167"))
                    val isRocket = syncRocket && (sender.contains("ROCKET", ignoreCase = true) || sender.contains("16216"))
                    val isBank = syncBank && (
                        sender.contains("CityBank", ignoreCase = true) ||
                        sender.contains("BRACBANK", ignoreCase = true) ||
                        sender.contains("EBL", ignoreCase = true) ||
                        sender.contains("DBBL", ignoreCase = true) ||
                        sender.contains("ISLAMIBANK", ignoreCase = true) ||
                        sender.contains("PRIMEBANK", ignoreCase = true) ||
                        sender.contains("BANK", ignoreCase = true)
                    )

                    if (isBkash || isNagad || isRocket || isBank) {
                        // Parse and sync directly on a background thread (no service needed)
                        // BroadcastReceiver is woken by Android even when app is fully closed
                        parseAndSyncSms(context, sender, body)
                    }
                }
            } catch (e: Exception) {
                Log.e("SmsReceiver", "Error parsing SMS", e)
            }
        }
    }

    private fun parseAndSyncSms(context: Context, sender: String, body: String) {
        var trxId: String? = null
        var amount: Double? = null
        var provider = "BKASH"
        var accountType = "PERSONAL"

        // 1. bKash & Bangla QR parsing
        if (sender.contains("bKash", ignoreCase = true) || sender.contains("16247")) {
            provider = "BKASH"
            if (body.contains("Merchant Pay", ignoreCase = true)) {
                accountType = "MERCHANT"
                val amtPattern = Pattern.compile("received:\\s+Tk\\s+([0-9.,]+)", Pattern.CASE_INSENSITIVE)
                val trxPattern = Pattern.compile("TrxID\\s+([A-Z0-9]+)", Pattern.CASE_INSENSITIVE)
                val amtMatcher = amtPattern.matcher(body)
                val trxMatcher = trxPattern.matcher(body)
                if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
                if (trxMatcher.find()) trxId = trxMatcher.group(1)
            } else {
                accountType = "PERSONAL"
                val amtPattern = Pattern.compile("received\\s+Tk\\s+([0-9.,]+)", Pattern.CASE_INSENSITIVE)
                val trxPattern = Pattern.compile("TrxID\\s+([A-Z0-9]+)", Pattern.CASE_INSENSITIVE)
                val amtMatcher = amtPattern.matcher(body)
                val trxMatcher = trxPattern.matcher(body)
                if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
                if (trxMatcher.find()) trxId = trxMatcher.group(1)
            }
        }
        // 2. Nagad parsing
        else if (sender.contains("NAGAD", ignoreCase = true) || sender.contains("16167")) {
            provider = "NAGAD"
            val amtPattern = Pattern.compile("Received:\\s+Tk\\s+([0-9.,]+)", Pattern.CASE_INSENSITIVE)
            val trxPattern = Pattern.compile("TxnID:\\s+([A-Z0-9]+)", Pattern.CASE_INSENSITIVE)
            val amtMatcher = amtPattern.matcher(body)
            val trxMatcher = trxPattern.matcher(body)
            if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
            if (trxMatcher.find()) trxId = trxMatcher.group(1)
        }
        // 3. Bank & Rocket Universal fallback parser
        else {
            provider = if (sender.contains("ROCKET", ignoreCase = true)) "ROCKET" else "BANK"
            accountType = if (provider == "BANK") "BANK" else "PERSONAL"
            val amtPattern = Pattern.compile("(?:Tk|BDT)\\s*([0-9.,]+)", Pattern.CASE_INSENSITIVE)
            val trxPattern = Pattern.compile("(?:TrxID|TxnID|Ref|Trace|Ref No)\\s*:?\\s*([A-Z0-9]+)", Pattern.CASE_INSENSITIVE)
            val amtMatcher = amtPattern.matcher(body)
            val trxMatcher = trxPattern.matcher(body)
            if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
            if (trxMatcher.find()) trxId = trxMatcher.group(1)
        }

        if (trxId != null && amount != null) {
            val finalTrxId = trxId!!
            val finalAmount = amount!!
            val sharedPref = context.getSharedPreferences("SmsGatewaySettings", Context.MODE_PRIVATE)
            val webhookUrl = sharedPref.getString("webhook_url", "https://api.zinichat.com/mfs-payments/sms-webhook") ?: return
            val apiKey = sharedPref.getString("api_key", "sms-gateway-secret-token") ?: return

            // Run HTTP call on a background thread directly — works even when app is closed
            // because BroadcastReceiver itself is alive until onReceive() returns.
            // We use a daemon thread so it doesn't block the receiver.
            val goAsync = goAsync()
            Thread {
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

                    val jsonParam = JSONObject().apply {
                        put("trxId", finalTrxId)
                        put("amount", finalAmount)
                        put("provider", provider)
                        put("accountType", accountType)
                        put("smsBody", body)
                        put("senderNumber", sender)
                        put("webhookUrl", webhookUrl)
                        put("apiKey", apiKey)
                    }

                    val writer = OutputStreamWriter(conn.outputStream, "UTF-8")
                    writer.write(jsonParam.toString())
                    writer.flush()
                    writer.close()

                    val responseCode = conn.responseCode
                    if (responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_CREATED) {
                        Log.d("SmsReceiver", "✅ Sync Successful: TrxID=$finalTrxId, Amount=$finalAmount BDT")
                    } else {
                        Log.e("SmsReceiver", "❌ Sync Failed. Server returned: $responseCode. Buffering locally...")
                        SmsBufferManager.savePendingSms(context, jsonParam)
                        PendingSmsSyncWorker.enqueueSyncWork(context)
                    }
                    conn.disconnect()
                } catch (e: Exception) {
                    Log.e("SmsReceiver", "🔴 Network Error during SMS sync. Buffering locally...", e)
                    val jsonParam = JSONObject().apply {
                        put("trxId", finalTrxId)
                        put("amount", finalAmount)
                        put("provider", provider)
                        put("accountType", accountType)
                        put("smsBody", body)
                        put("senderNumber", sender)
                        put("webhookUrl", webhookUrl)
                        put("apiKey", apiKey)
                    }
                    SmsBufferManager.savePendingSms(context, jsonParam)
                    PendingSmsSyncWorker.enqueueSyncWork(context)
                } finally {
                    goAsync.finish()
                }
            }.start()
        } else {
            Log.w("SmsReceiver", "⚠️ Could not parse TrxID or Amount from SMS body: $body")
        }
    }
}
