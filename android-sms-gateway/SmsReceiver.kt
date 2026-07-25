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

        if (sender.contains("bKash", ignoreCase = true) || sender.contains("16247")) {
            provider = "BKASH"
            if (body.contains("Merchant Pay", ignoreCase = true)) {
                accountType = "MERCHANT"
                val amtMatcher = Pattern.compile("received:\\s+Tk\\s+([0-9.,]+)", Pattern.CASE_INSENSITIVE).matcher(body)
                val trxMatcher = Pattern.compile("TrxID\\s+([A-Z0-9]+)", Pattern.CASE_INSENSITIVE).matcher(body)
                if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
                if (trxMatcher.find()) trxId = trxMatcher.group(1)
            } else {
                accountType = "PERSONAL"
                val amtMatcher = Pattern.compile("received\\s+Tk\\s+([0-9.,]+)", Pattern.CASE_INSENSITIVE).matcher(body)
                val trxMatcher = Pattern.compile("TrxID\\s+([A-Z0-9]+)", Pattern.CASE_INSENSITIVE).matcher(body)
                if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
                if (trxMatcher.find()) trxId = trxMatcher.group(1)
            }
        } else if (sender.contains("NAGAD", ignoreCase = true) || sender.contains("16167")) {
            provider = "NAGAD"
            val amtMatcher = Pattern.compile("Received:\\s+Tk\\s+([0-9.,]+)", Pattern.CASE_INSENSITIVE).matcher(body)
            val trxMatcher = Pattern.compile("TxnID:\\s+([A-Z0-9]+)", Pattern.CASE_INSENSITIVE).matcher(body)
            if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
            if (trxMatcher.find()) trxId = trxMatcher.group(1)
        } else {
            provider = if (sender.contains("ROCKET", ignoreCase = true)) "ROCKET" else "BANK"
            accountType = if (provider == "BANK") "BANK" else "PERSONAL"
            val amtMatcher = Pattern.compile("(?:Tk|BDT)\\s*([0-9.,]+)", Pattern.CASE_INSENSITIVE).matcher(body)
            val trxMatcher = Pattern.compile("(?:TrxID|TxnID|Ref|Trace|Ref No)\\s*:?\\s*([A-Z0-9]+)", Pattern.CASE_INSENSITIVE).matcher(body)
            if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
            if (trxMatcher.find()) trxId = trxMatcher.group(1)
        }

        if (trxId != null && amount != null) {
            val finalTrxId = trxId!!
            val finalAmount = amount!!
            val sharedPref = context.getSharedPreferences("SmsGatewaySettings", Context.MODE_PRIVATE)
            val webhookUrl = sharedPref.getString("webhook_url", "https://api.zinichat.com/mfs-payments/sms-webhook") ?: return
            val apiKey = sharedPref.getString("api_key", "sms-gateway-secret-token") ?: return

            val goAsync = goAsync()
            Thread {
                try {
                    val conn = (URL(webhookUrl).openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        setRequestProperty("Content-Type", "application/json; utf-8")
                        setRequestProperty("Accept", "application/json")
                        setRequestProperty("X-SMS-GATEWAY-API-KEY", apiKey)
                        doOutput = true
                        connectTimeout = 15000
                        readTimeout = 15000
                    }
                    val json = JSONObject().apply {
                        put("trxId", finalTrxId)
                        put("amount", finalAmount)
                        put("provider", provider)
                        put("accountType", accountType)
                        put("smsBody", body)
                        put("senderNumber", sender)
                    }
                    OutputStreamWriter(conn.outputStream, "UTF-8").use {
                        it.write(json.toString()); it.flush()
                    }
                    val code = conn.responseCode
                    if (code == 200 || code == 201) {
                        Log.d("SmsReceiver", "✅ Sync OK: TrxID=$finalTrxId, Amount=$finalAmount")
                    } else {
                        Log.e("SmsReceiver", "❌ Server returned: $code")
                    }
                    conn.disconnect()
                } catch (e: Exception) {
                    Log.e("SmsReceiver", "🔴 Network Error", e)
                } finally {
                    goAsync.finish()
                }
            }.start()
        } else {
            Log.w("SmsReceiver", "⚠️ Could not parse from: $body")
        }
    }
}
