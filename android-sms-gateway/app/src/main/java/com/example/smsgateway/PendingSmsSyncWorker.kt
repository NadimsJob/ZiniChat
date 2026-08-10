package com.example.smsgateway

import android.content.Context
import android.util.Log
import androidx.work.*
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class PendingSmsSyncWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        Log.d("PendingSmsSyncWorker", "🔄 Starting background sync of buffered SMS...")
        val pendingList = SmsBufferManager.getPendingSmsList(applicationContext)

        if (pendingList.isEmpty()) {
            Log.d("PendingSmsSyncWorker", "✅ No pending SMS in buffer.")
            return Result.success()
        }

        val sharedPref = applicationContext.getSharedPreferences("SmsGatewaySettings", Context.MODE_PRIVATE)
        val defaultWebhookUrl = sharedPref.getString("webhook_url", "https://api.zinichat.com/mfs-payments/sms-webhook") ?: ""
        val defaultApiKey = sharedPref.getString("api_key", "sms-gateway-secret-token") ?: ""

        var hasFailures = false

        for (item in pendingList) {
            val trxId = item.optString("trxId")
            val webhookUrl = item.optString("webhookUrl", defaultWebhookUrl)
            val apiKey = item.optString("apiKey", defaultApiKey)

            if (trxId.isEmpty() || webhookUrl.isEmpty()) continue

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

                val payload = JSONObject().apply {
                    put("trxId", item.optString("trxId"))
                    put("amount", item.optDouble("amount"))
                    put("provider", item.optString("provider"))
                    put("accountType", item.optString("accountType"))
                    put("smsBody", item.optString("smsBody"))
                    put("senderNumber", item.optString("senderNumber"))
                }

                val writer = OutputStreamWriter(conn.outputStream, "UTF-8")
                writer.write(payload.toString())
                writer.flush()
                writer.close()

                val responseCode = conn.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_CREATED) {
                    Log.d("PendingSmsSyncWorker", "✅ Synced buffered SMS: TrxID=$trxId")
                    SmsBufferManager.removePendingSms(applicationContext, trxId)
                } else {
                    Log.e("PendingSmsSyncWorker", "❌ Failed syncing TrxID=$trxId. HTTP $responseCode")
                    hasFailures = true
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.e("PendingSmsSyncWorker", "🔴 Network error syncing TrxID=$trxId", e)
                hasFailures = true
            }
        }

        return if (hasFailures) Result.retry() else Result.success()
    }

    companion object {
        fun enqueueSyncWork(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncWorkRequest = OneTimeWorkRequestBuilder<PendingSmsSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "PendingSmsSyncWork",
                ExistingWorkPolicy.REPLACE,
                syncWorkRequest
            )
        }
    }
}
