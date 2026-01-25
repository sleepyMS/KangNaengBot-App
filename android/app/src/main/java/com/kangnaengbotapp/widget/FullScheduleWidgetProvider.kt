package com.kangnaengbotapp.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.view.View
import android.widget.RemoteViews
import com.kangnaengbotapp.MainActivity
import com.kangnaengbotapp.R
import com.kangnaengbotapp.widget.data.WidgetRepository
import com.kangnaengbotapp.widget.utils.TimetableDrawer

/**
 * FullScheduleWidgetProvider
 * Displays the full weekly timetable grid.
 */
class FullScheduleWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisAppWidget = ComponentName(context, FullScheduleWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget)
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            try {
                val repository = WidgetRepository(context)
                val widgetData = repository.getScheduleData()
                val views = RemoteViews(context.packageName, R.layout.widget_full_timetable)
                
                android.util.Log.d("KangNaengWidget", "FullProvider: Loaded Data. isEmpty=${widgetData?.classes.isNullOrEmpty()}")

                if (widgetData?.classes != null && widgetData.classes.isNotEmpty()) {
                    // 1. Draw the bitmap
                    // We need dimensions. For a widget, it's tricky to get exact pixels.
                    // Estimate based on options or standard density.
                    // A 4x3 widget is approx 300-400dp width.
                    val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
                    val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
                    val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
                    
                    // Convert dp to px
                    val density = context.resources.displayMetrics.density
                    val widthPx = if (minWidth > 0) (minWidth * density).toInt() else (300 * density).toInt()
                    val heightPx = if (minHeight > 0) (minHeight * density).toInt() else (300 * density).toInt()
                    
                    android.util.Log.d("KangNaengWidget", "FullProvider: Drawing bitmap size ${widthPx}x${heightPx} for ${widgetData.classes.size} classes")

                    val drawer = TimetableDrawer(context)
                    val bitmap = drawer.drawTimetable(widgetData.classes, widthPx, heightPx)

                    views.setImageViewBitmap(R.id.widget_timetable_image, bitmap)
                    views.setViewVisibility(R.id.widget_empty_text, View.GONE)
                    views.setTextViewText(R.id.widget_updated_at, widgetData.updatedAtDisplay ?: "")
                } else {
                    views.setViewVisibility(R.id.widget_empty_text, View.VISIBLE)
                    views.setImageViewBitmap(R.id.widget_timetable_image, null)
                    views.setTextViewText(R.id.widget_updated_at, "")
                }
                
                // Click to open app
                val appIntent = Intent(context, MainActivity::class.java)
                val appPendingIntent = PendingIntent.getActivity(
                    context, 0, appIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_timetable_image, appPendingIntent)
                views.setOnClickPendingIntent(R.id.widget_btn_refresh, appPendingIntent)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
