package com.kangnaengbotapp.modules

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.content.ComponentName
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.kangnaengbotapp.widget.ScheduleWidgetProvider
import com.kangnaengbotapp.widget.FullScheduleWidgetProvider
import com.kangnaengbotapp.widget.data.WidgetRepository

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val context: Context = reactContext
    private val repository = WidgetRepository(context)

    override fun getName(): String {
        return "WidgetModule"
    }

    @ReactMethod
    fun updateScheduleData(jsonString: String) {
        try {
            // 1. Save to SharedPrefs
            repository.saveScheduleData(jsonString)

            // 2. Trigger Widget Update
            triggerUpdate()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun deleteScheduleData() {
        try {
            repository.clearData()
            triggerUpdate()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun triggerUpdate() {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            // 1. Update Today Schedule Widget
            val todayWidget = ComponentName(context, ScheduleWidgetProvider::class.java)
            val todayIds = appWidgetManager.getAppWidgetIds(todayWidget)
            if (todayIds.isNotEmpty()) {
                val intent = Intent(context, ScheduleWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, todayIds)
                }
                context.sendBroadcast(intent)
            }

            // 2. Update Full Schedule Widget
            val fullWidget = ComponentName(context, FullScheduleWidgetProvider::class.java)
            val fullIds = appWidgetManager.getAppWidgetIds(fullWidget)
            if (fullIds.isNotEmpty()) {
                val intent = Intent(context, FullScheduleWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, fullIds)
                }
                context.sendBroadcast(intent)
            }
            
            android.util.Log.d("KangNaengWidget", "Triggered updates. Today: ${todayIds.size}, Full: ${fullIds.size}")

        } catch (e: Exception) {
            android.util.Log.e("KangNaengWidget", "Error in triggerUpdate", e)
            e.printStackTrace()
        }
    }
}
