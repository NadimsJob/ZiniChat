package com.example.smsgateway

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

object SmsBufferManager {
    private const val PREF_NAME = "SmsGatewayBuffer"
    private const val KEY_QUEUE = "pending_sms_queue"

    fun savePendingSms(context: Context, smsJsonObject: JSONObject) {
        synchronized(this) {
            try {
                val pref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
                val existingJsonStr = pref.getString(KEY_QUEUE, "[]") ?: "[]"
                val array = JSONArray(existingJsonStr)

                val newTrxId = smsJsonObject.optString("trxId")
                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    if (item.optString("trxId") == newTrxId) {
                        Log.d("SmsBufferManager", "ℹ️ SMS already buffered: trxId=$newTrxId")
                        return
                    }
                }

                array.put(smsJsonObject)
                pref.edit().putString(KEY_QUEUE, array.toString()).apply()
                Log.d("SmsBufferManager", "💾 Buffered pending SMS locally: trxId=$newTrxId (Total in queue: ${array.length()})")
            } catch (e: Exception) {
                Log.e("SmsBufferManager", "Error saving pending SMS", e)
            }
        }
    }

    fun getPendingSmsList(context: Context): List<JSONObject> {
        synchronized(this) {
            try {
                val pref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
                val existingJsonStr = pref.getString(KEY_QUEUE, "[]") ?: "[]"
                val array = JSONArray(existingJsonStr)
                val list = mutableListOf<JSONObject>()
                for (i in 0 until array.length()) {
                    list.add(array.getJSONObject(i))
                }
                return list
            } catch (e: Exception) {
                Log.e("SmsBufferManager", "Error reading pending SMS list", e)
                return emptyList()
            }
        }
    }

    fun removePendingSms(context: Context, trxId: String) {
        synchronized(this) {
            try {
                val pref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
                val existingJsonStr = pref.getString(KEY_QUEUE, "[]") ?: "[]"
                val array = JSONArray(existingJsonStr)
                val newArray = JSONArray()
                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    if (item.optString("trxId") != trxId) {
                        newArray.put(item)
                    }
                }
                pref.edit().putString(KEY_QUEUE, newArray.toString()).apply()
                Log.d("SmsBufferManager", "🗑️ Removed synced SMS from buffer: trxId=$trxId (Remaining: ${newArray.length()})")
            } catch (e: Exception) {
                Log.e("SmsBufferManager", "Error removing pending SMS", e)
            }
        }
    }
}
