package com.example.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BootReceiver — Auto-start SMS Gateway after phone reboot
 *
 * When the phone restarts, Android fires BOOT_COMPLETED broadcast.
 * This receiver catches it and restarts our Foreground Service automatically,
 * so the user doesn't need to manually open the app after a reboot.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            Log.d("BootReceiver", "📱 Phone rebooted — Auto-starting ZiniChat SMS Gateway...")
            SmsGatewayService.start(context)
        }
    }
}
