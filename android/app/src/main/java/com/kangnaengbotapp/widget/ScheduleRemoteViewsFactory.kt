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
        android.util.Log.d("KangNaengWidget", "Factory: getViewAt $position")
        if (position >= classItems.size) return RemoteViews(context.packageName, R.layout.item_widget_class)

        val views = RemoteViews(context.packageName, R.layout.item_widget_class)

        try {
            val item = classItems[position]
            android.util.Log.d("KangNaengWidget", "Factory: Binding ${item.title}")

            // Bind Basic Text
            views.setTextViewText(R.id.widget_item_title, item.title ?: "제목 없음")
            views.setTextViewText(R.id.widget_item_time, item.timeDisplay ?: "")
            views.setTextViewText(R.id.widget_item_room, item.location ?: "")

            // Simple Color Logic (using setBackgroundColor on ImageView)
            try {
                if (!item.color.isNullOrEmpty()) {
                    views.setInt(R.id.widget_item_color_strip, "setBackgroundColor", Color.parseColor(item.color))
                } else {
                    views.setInt(R.id.widget_item_color_strip, "setBackgroundColor", Color.GRAY)
                }
            } catch (e: Exception) {
                views.setInt(R.id.widget_item_color_strip, "setBackgroundColor", Color.GRAY)
            }

            // Fill In Intent
            val fillInIntent = Intent()
            val deepLinkUrl = item.deepLink
            if (!deepLinkUrl.isNullOrEmpty()) {
                fillInIntent.data = Uri.parse(deepLinkUrl)
            }
            views.setOnClickFillInIntent(R.id.widget_item_container, fillInIntent)

        } catch (e: Exception) {
            e.printStackTrace()
            android.util.Log.e("KangNaengWidget", "Factory: Error in getViewAt", e)
        }

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
