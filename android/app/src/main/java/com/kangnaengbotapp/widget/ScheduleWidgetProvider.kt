package com.kangnaengbotapp.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.kangnaengbotapp.MainActivity
import com.kangnaengbotapp.R
import com.kangnaengbotapp.widget.data.WidgetRepository

/**
 * ScheduleWidgetProvider
 * Handles widget updates and user interactions.
 */
class ScheduleWidgetProvider : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        android.util.Log.d("KangNaengWidget", "onReceive called with action: ${intent.action}")
        super.onReceive(context, intent)
        
        val action = intent.action
        
        // Handle list view data change updates or System Events (Boot/Time)
        if (action == AppWidgetManager.ACTION_APPWIDGET_UPDATE || 
            action == ACTION_AUTO_UPDATE_MIDNIGHT ||
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_TIME_CHANGED ||
            action == Intent.ACTION_TIMEZONE_CHANGED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisAppWidget = ComponentName(context.packageName, ScheduleWidgetProvider::class.java.name)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget)
            
            // Only perform View Update for UPDATE or MIDNIGHT actions
            // For Boot/Time, we just need to reschedule (Views will update if the system calls UPDATE, but checking doesn't hurt)
            if (appWidgetIds.isNotEmpty()) {
                android.util.Log.d("KangNaengWidget", "onReceive: processing system event [$action]")
                
                // Update views if it's a visual update trigger
                if (action == AppWidgetManager.ACTION_APPWIDGET_UPDATE || action == ACTION_AUTO_UPDATE_MIDNIGHT) {
                    onUpdate(context, appWidgetManager, appWidgetIds)
                    appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view)
                }

                // Reschedule Alarm for ALL events to ensure robustness
                // (e.g. Boot clears alarm, TimeZone change shifts midnight)
                scheduleNextMidnightAlarm(context)
                
                // Also Refresh Notifications for "Today"
                com.kangnaengbotapp.notification.NotificationScheduler.scheduleTodayAlarms(context)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        android.util.Log.d("KangNaengWidget", "onUpdate called for IDs: ${appWidgetIds.contentToString()}")
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleNextMidnightAlarm(context)
        com.kangnaengbotapp.notification.NotificationScheduler.scheduleTodayAlarms(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        cancelMidnightAlarm(context)
    }

    companion object {
        private const val ACTION_AUTO_UPDATE_MIDNIGHT = "com.kangnaengbotapp.widget.ACTION_AUTO_UPDATE_MIDNIGHT"

        private fun scheduleNextMidnightAlarm(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? android.app.AlarmManager ?: return
            
            val intent = Intent(context, ScheduleWidgetProvider::class.java).apply {
                action = ACTION_AUTO_UPDATE_MIDNIGHT
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Calculate next midnight
            val calendar = java.util.Calendar.getInstance().apply {
                timeInMillis = System.currentTimeMillis()
                add(java.util.Calendar.DAY_OF_YEAR, 1)
                set(java.util.Calendar.HOUR_OF_DAY, 0)
                set(java.util.Calendar.MINUTE, 0)
                set(java.util.Calendar.SECOND, 0)
                set(java.util.Calendar.MILLISECOND, 0)
            }

            // Robust Scheduling
            try {
                // Try Exact Alarm (Ideal)
                alarmManager.setExactAndAllowWhileIdle(
                    android.app.AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
                android.util.Log.d("KangNaengWidget", "Scheduled EXACT midnight alarm for: ${calendar.time}")
            } catch (e: SecurityException) {
                // Fallback for Android 12+ without permission
                android.util.Log.w("KangNaengWidget", "Exact alarm permission missing. Falling back to inexact alarm.")
                alarmManager.set(
                    android.app.AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            }
        }

        private fun cancelMidnightAlarm(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? android.app.AlarmManager ?: return
            val intent = Intent(context, ScheduleWidgetProvider::class.java).apply {
                action = ACTION_AUTO_UPDATE_MIDNIGHT
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)
        }

        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            try {
                android.util.Log.d("KangNaengWidget", "updateAppWidget called for ID: $appWidgetId")
                val repository = WidgetRepository(context)
                val widgetData = repository.getScheduleData()
                
                android.util.Log.d("KangNaengWidget", "Loaded Data: $widgetData")

                // Construct the RemoteViews object
                val views = RemoteViews(context.packageName, R.layout.widget_schedule_layout)

                if (widgetData != null) {
                    // Update Date Display based on CURRENT system time, not just what's in widgetData
                    // widgetData.formattedDate might be old (from when RN last ran).
                    // Let's re-format current date here for accuracy.
                    val now = java.util.Calendar.getInstance()
                    val month = now.get(java.util.Calendar.MONTH) + 1
                    val day = now.get(java.util.Calendar.DAY_OF_MONTH)
                    val dayOfWeekStr = when(now.get(java.util.Calendar.DAY_OF_WEEK)) {
                        1 -> "일"
                        2 -> "월"
                        3 -> "화"
                        4 -> "수"
                        5 -> "목"
                        6 -> "금"
                        7 -> "토"
                        else -> ""
                    }
                    val dateStr = "${month}월 ${day}일 ($dayOfWeekStr)"
                    
                    android.util.Log.d("KangNaengWidget", "Setting date text to: $dateStr")
                    views.setTextViewText(R.id.widget_date, dateStr)
                    views.setTextViewText(R.id.widget_updated_at, widgetData.updatedAtDisplay ?: "")

                    // Filter for Empty State Logic (Today)
                    val dayOfWeek = now.get(java.util.Calendar.DAY_OF_WEEK) - 1 // 0=Sun...
                    val todayItems = widgetData.classes?.filter { it.day == dayOfWeek } ?: emptyList()

                    // Handle Empty State
                    if (todayItems.isEmpty()) {
                        views.setViewVisibility(R.id.widget_list_view, View.GONE)
                        views.setViewVisibility(R.id.widget_empty_view, View.VISIBLE)
                        views.setTextViewText(R.id.widget_empty_text, "일정이 없습니다")
                    } else {
                        views.setViewVisibility(R.id.widget_list_view, View.VISIBLE)
                        views.setViewVisibility(R.id.widget_empty_view, View.GONE)
                    }
                } else {
                    // No Data State (First install or logged out)
                    views.setTextViewText(R.id.widget_date, "강냉봇")
                    views.setTextViewText(R.id.widget_updated_at, "")
                    views.setViewVisibility(R.id.widget_list_view, View.GONE)
                    views.setViewVisibility(R.id.widget_empty_view, View.VISIBLE)
                    views.setTextViewText(R.id.widget_empty_text, "로그인이 필요합니다")
                }

                // Set up the intent that starts the ScheduleRemoteViewsService, which will
                // provide the views for this collection.
                val intent = Intent(context, ScheduleRemoteViewsService::class.java).apply {
                    // Add appWidgetId to the intent extras.
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                    data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
                }
                
                views.setRemoteAdapter(R.id.widget_list_view, intent)
                views.setEmptyView(R.id.widget_list_view, R.id.widget_empty_view)

                // General click listener to open the app (Header click or Refresh btn)
                val appIntent = Intent(context, MainActivity::class.java)
                val appPendingIntent = PendingIntent.getActivity(
                    context, 
                    0, 
                    appIntent, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_btn_refresh, appPendingIntent)
                views.setOnClickPendingIntent(R.id.widget_date, appPendingIntent)

                // Setup template for individual item clicks (Deep Links)
                // The collection items will fill in the specific URI
                val clickIntentTemplate = Intent(Intent.ACTION_VIEW)
                clickIntentTemplate.setPackage(context.packageName) // Make Explicit to satisfy Android 14 (U+) security

                val clickPendingIntentTemplate = PendingIntent.getActivity(
                    context, 
                    0, 
                    clickIntentTemplate, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE // Mutable needed for fillInIntent
                )
                views.setPendingIntentTemplate(R.id.widget_list_view, clickPendingIntentTemplate)

                // Instruct the widget manager to update the widget
                appWidgetManager.updateAppWidget(appWidgetId, views)
                android.util.Log.d("KangNaengWidget", "AppWidgetManager.updateAppWidget executed.")
            } catch (e: Exception) {
                android.util.Log.e("KangNaengWidget", "Error in updateAppWidget", e)
                e.printStackTrace()
            }
        }
    }
}
