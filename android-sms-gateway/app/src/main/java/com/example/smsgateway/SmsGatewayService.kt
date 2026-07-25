package com.example.smsgateway

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * SmsGatewayService — Persistent Foreground Service
 *
 * This service runs as a Foreground Service with a persistent notification.
 * Android is NOT allowed to kill foreground services (unlike background services).
 * This ensures the app stays alive even when swiped from recent apps on most phones.
 *
 * The actual SMS processing is done in SmsReceiver (via BroadcastReceiver + goAsync).
 * This service's job is ONLY to keep the process alive so Android wakes up the
 * BroadcastReceiver reliably even on aggressive OEM battery optimizers (Xiaomi, Samsung, etc).
 */
class SmsGatewayService : Service() {

    companion object {
        const val CHANNEL_ID = "zinichat_sms_gateway"
        const val NOTIFICATION_ID = 1001

        fun start(context: Context) {
            val intent = Intent(context, SmsGatewayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, SmsGatewayService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, buildNotification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, buildNotification())
        }
        Log.d("SmsGatewayService", "✅ Foreground Service Started — SMS Gateway Active")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // START_STICKY = if Android kills us (rare), restart automatically
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        // Called when user swipes app from recent apps
        // Reschedule restart — this is the key fix!
        Log.d("SmsGatewayService", "App swiped from recents. Restarting foreground service...")
        val restartIntent = Intent(applicationContext, SmsGatewayService::class.java)
        val pendingIntent = PendingIntent.getService(
            applicationContext,
            1,
            restartIntent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = getSystemService(ALARM_SERVICE) as android.app.AlarmManager
        alarmManager.set(
            android.app.AlarmManager.ELAPSED_REALTIME,
            android.os.SystemClock.elapsedRealtime() + 1000,
            pendingIntent
        )
        super.onTaskRemoved(rootIntent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ZiniChat SMS Gateway",
                NotificationManager.IMPORTANCE_LOW // Low = silent, no sound
            ).apply {
                description = "Keeps the SMS payment sync running in the background"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): android.app.Notification {
        val openAppIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ZiniChat SMS Gateway")
            .setContentText("🟢 Active — Payment SMS sync is running")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setOngoing(true)  // Cannot be dismissed by user swipe
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
