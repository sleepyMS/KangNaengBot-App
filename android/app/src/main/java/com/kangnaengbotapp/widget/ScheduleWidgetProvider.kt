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
        
        // Handle list view data change updates
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisAppWidget = ComponentName(context.packageName, ScheduleWidgetProvider::class.java.name)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget)
            
            android.util.Log.d("KangNaengWidget", "onReceive: notifying list view data changed for IDs: ${appWidgetIds.contentToString()}")
            // Notify ListView that data has changed (onDataSetChanged)
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view)
            
            // super.onReceive will call onUpdate automatically because we now pass IDs
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        android.util.Log.d("KangNaengWidget", "onUpdate called for IDs: ${appWidgetIds.contentToString()}")
        // Perform this loop for every App Widget that belongs to this provider
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            try {
                android.util.Log.d("KangNaengWidget", "updateAppWidget called for ID: $appWidgetId")
                val repository = WidgetRepository(context)
                val widgetData = repository.getScheduleData()
                
                android.util.Log.d("KangNaengWidget", "Loaded Data: $widgetData")

                // Construct the RemoteViews object
                val views = RemoteViews(context.packageName, R.layout.widget_schedule_layout)

                if (widgetData != null) {
                    // Bind Header Data
                    val date = widgetData.formattedDate ?: "오늘"
                    android.util.Log.d("KangNaengWidget", "Setting date text to: $date")
                    views.setTextViewText(R.id.widget_date, date)
                    views.setTextViewText(R.id.widget_updated_at, widgetData.updatedAtDisplay ?: "")

                    // Filter for Empty State Logic (Today)
                    val calendar = java.util.Calendar.getInstance()
                    val dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK) - 1
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
