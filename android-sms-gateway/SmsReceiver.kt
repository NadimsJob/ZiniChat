package com.example.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage
import android.util.Log
import java.util.regex.Pattern

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Int) {
        // Overloaded signature fallback
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "android.provider.Telephony.SMS_RECEIVED") {
            val bundle = intent.extras
            if (bundle != null) {
                try {
                    val pdus = bundle.get("pdus") as Array<*>
                    for (i in pdus.indices) {
                        val smsMessage = SmsMessage.createFromPdu(pdus[i] as ByteArray)
                        val sender = smsMessage.displayOriginatingAddress ?: ""
                        val body = smsMessage.displayMessageBody ?: ""

                        Log.d("SmsReceiver", "SMS Received from: $sender")

                        // Local Whitelist filter
                        val isMfsSender = sender.contains("bKash", ignoreCase = true) ||
                                          sender.contains("16247") ||
                                          sender.contains("NAGAD", ignoreCase = true) ||
                                          sender.contains("16167") ||
                                          sender.contains("ROCKET", ignoreCase = true) ||
                                          sender.contains("CityBank", ignoreCase = true) ||
                                          sender.contains("BRACBANK", ignoreCase = true) ||
                                          sender.contains("EBL", ignoreCase = true)

                        if (isMfsSender) {
                            parseAndSyncSms(context, sender, body)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("SmsReceiver", "Error parsing SMS", e)
                }
            }
        }
    }

    private fun parseAndSyncSms(context: Context, sender: String, body: String) {
        var trxId: String? = null
        var amount: Double? = null
        var provider = "BKASH"
        var accountType = "PERSONAL"

        // 1. bKash parsing
        if (sender.contains("bKash", ignoreCase = true) || sender.contains("16247")) {
            provider = "BKASH"
            // Check if merchant pay or personal
            if (body.contains("Merchant Pay", ignoreCase = true)) {
                accountType = "MERCHANT"
                // Regex for Merchant amount & TrxID
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
        // 3. Bank/Rocket fallback parser
        else {
            provider = if (sender.contains("ROCKET", ignoreCase = true)) "ROCKET" else "BANK"
            accountType = if (provider == "BANK") "BANK" else "PERSONAL"
            
            // Generic amount extract: e.g. "Tk 500" or "BDT 500"
            val amtPattern = Pattern.compile("(?:Tk|BDT)\\s*([0-9.,]+)", Pattern.CASE_INSENSITIVE)
            val trxPattern = Pattern.compile("(?:TrxID|TxnID|Ref|Trace|Ref No)\\s*:?\\s*([A-Z0-9]+)", Pattern.CASE_INSENSITIVE)
            
            val amtMatcher = amtPattern.matcher(body)
            val trxMatcher = trxPattern.matcher(body)
            
            if (amtMatcher.find()) amount = amtMatcher.group(1)?.replace(",", "")?.toDoubleOrNull()
            if (trxMatcher.find()) trxId = trxMatcher.group(1)
        }

        if (trxId != null && amount != null) {
            // Trigger Intent Service to post data asynchronously
            val serviceIntent = Intent(context, SmsGatewayService::class.java).apply {
                putExtra("trxId", trxId)
                putExtra("amount", amount)
                putExtra("provider", provider)
                putExtra("accountType", accountType)
                putExtra("smsBody", body)
                putExtra("senderNumber", sender)
            }
            context.startService(serviceIntent)
        }
    }
}
