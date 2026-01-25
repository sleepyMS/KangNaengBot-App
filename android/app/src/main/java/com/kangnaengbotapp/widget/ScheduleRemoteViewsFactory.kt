package com.kangnaengbotapp.widget

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.kangnaengbotapp.R
import com.kangnaengbotapp.widget.data.WidgetClassItem
import com.kangnaengbotapp.widget.data.WidgetRepository

class ScheduleRemoteViewsFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {
    private val repository = WidgetRepository(context)
    private var classItems: List<WidgetClassItem> = emptyList()

    override fun onCreate() {
        // Initial load
    }

    override fun onDataSetChanged() {
        // Data updated -> Refresh list
        val data = repository.getScheduleData()
        
        // Filter for TODAY's classes
        // Note: Java/Kotlin Calendar.SUNDAY is 1, our data uses 0=Sun. 
        // Let's use java.util.Calendar to be safe or assuming 0=Sun from dayjs.
        // Dayjs 0=Sun, 1=Mon. 
        // Java Calendar: SUNDAY=1, MONDAY=2. So Calendar.DAY_OF_WEEK - 1 = our index.
        val calendar = java.util.Calendar.getInstance()
        val dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK) - 1 // 0=Sun ... 6=Sat
        
        classItems = data?.classes?.filter { it.day == dayOfWeek }
            ?.sortedBy { it.startTime } 
            ?: emptyList()
    }

    override fun onDestroy() {
        classItems = emptyList()
    }

    override fun getCount(): Int = classItems.size

    override fun getViewAt(position: Int): RemoteViews {
        try {
            if (position >= classItems.size) return RemoteViews(context.packageName, R.layout.item_widget_class)

            val item = classItems[position]
            val views = RemoteViews(context.packageName, R.layout.item_widget_class)

            // Bind Data (Safe Call)
            views.setTextViewText(R.id.widget_item_title, item.title ?: "제목 없음")
            views.setTextViewText(R.id.widget_item_time, item.timeDisplay ?: "-")
            views.setTextViewText(R.id.widget_item_room, item.location ?: "장소 미정")

            // Bind Color Decorator
            try {
                val color = Color.parseColor(item.color ?: "#CCCCCC")
                views.setInt(R.id.widget_item_color_strip, "setBackgroundColor", color)
            } catch (e: Exception) {
                views.setInt(R.id.widget_item_color_strip, "setBackgroundColor", Color.GRAY)
            }

            // Fill In Intent for Deep Link
            val deepLinkUrl = item.deepLink
            if (!deepLinkUrl.isNullOrEmpty()) {
                val fillInIntent = Intent().apply {
                    data = Uri.parse(deepLinkUrl)
                    action = Intent.ACTION_VIEW
                }
                views.setOnClickFillInIntent(R.id.widget_item_container, fillInIntent)
            }

            return views
        } catch (e: Exception) {
            e.printStackTrace()
            return RemoteViews(context.packageName, R.layout.item_widget_class)
        }
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
