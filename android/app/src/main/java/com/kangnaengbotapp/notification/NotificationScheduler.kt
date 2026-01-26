package com.kangnaengbotapp.notification

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import com.kangnaengbotapp.widget.data.WidgetRepository
import java.util.Calendar

object NotificationScheduler {
    private const val PREFS_NAME = "KangNaengNotificationPrefs"
    private const val KEY_ENABLED = "NOTI_ENABLED"
    private const val KEY_OFFSET = "NOTI_OFFSET" // Minutes

    fun setSettings(context: Context, enabled: Boolean, offsetMinutes: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_OFFSET, offsetMinutes)
            .apply()
        
        // Re-schedule immediately
        scheduleTodayAlarms(context)
    }

    fun scheduleTodayAlarms(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val isEnabled = prefs.getBoolean(KEY_ENABLED, false)

        // Always cancel existing alarms for today first to avoid duplicates or stale alarms
        cancelTodayAlarms(context)

        if (!isEnabled) {
            android.util.Log.d("KangNaengNoti", "Notifications disabled. Alarms cancelled.")
            return
        }

        val offsetMinutes = prefs.getInt(KEY_OFFSET, 10) // Default 10 min
        val repository = WidgetRepository(context)
        val widgetData = repository.getScheduleData() ?: return

        if (widgetData.classes.isNullOrEmpty()) {
            android.util.Log.d("KangNaengNoti", "No classes found. Nothing to schedule.")
            return
        }

        // Determine Today's DayOfWeek (0=Sun, 1=Mon .. 6=Sat)
        // Note: Java Calendar.DAY_OF_WEEK: 1=Sun, 2=Mon...
        // WidgetData uses: 0=Sun, 1=Mon...
        val now = Calendar.getInstance()
        val javaDayOfWeek = now.get(Calendar.DAY_OF_WEEK)
        val todayIndex = javaDayOfWeek - 1 

        val todayClasses = widgetData.classes.filter { it.day == todayIndex }
        
        if (todayClasses.isEmpty()) {
            android.util.Log.d("KangNaengNoti", "No classes for today (Day $todayIndex).")
            return
        }

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        todayClasses.forEach { item ->
            // item.startTime is minutes from midnight (e.g., 540 = 09:00)
            val startMin = item.startTime ?: return@forEach
            
            // Calculate Trigger Time
            // Today Midnight + startMin * 60000 - offset * 60000
            val triggerTime = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                add(Calendar.MINUTE, startMin)
                add(Calendar.MINUTE, -offsetMinutes)
            }

            // If time has passed -> Skip
            if (triggerTime.timeInMillis < System.currentTimeMillis()) {
                android.util.Log.d("KangNaengNoti", "Skipping past class: ${item.title} at ${triggerTime.time}")
                return@forEach
            }

            // Create PendingIntent
            val intent = Intent(context, ClassNotificationReceiver::class.java).apply {
                action = "com.kangnaengbotapp.notification.SHOW_CLASS_NOTI"
                putExtra("CLASS_ID", item.id)
                putExtra("CLASS_TITLE", item.title)
                putExtra("CLASS_LOCATION", item.location)
                putExtra("CLASS_TIME", item.timeDisplay)
            }

            // RequestCode = item.id.hashCode() ensures unique per class
            val requestCode = (item.id ?: "0").hashCode()
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            try {
                // Use setExactAndAllowWhileIdle for reliability
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime.timeInMillis,
                    pendingIntent
                )
                android.util.Log.d("KangNaengNoti", "Scheduled alarm for ${item.title} at ${triggerTime.time} (Req: $requestCode)")
            } catch (e: SecurityException) {
                // Fallback
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime.timeInMillis,
                    pendingIntent
                )
            }
        }
    }

    private fun cancelTodayAlarms(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val repository = WidgetRepository(context)
        val widgetData = repository.getScheduleData() ?: return
        
        // We need to reconstruct PendingIntents to cancel them.
        // Since we generally only know "Today's" alarms from the current logic,
        // it's tricky to cancel "Old" alarms if the schedule CHANGED significantly (e.g. IDs changed).
        // BUT, since we use `item.id.hashCode()`, if IDs persist, we can cancel.
        // If IDs change, old alarms might persist until they fire (and valid IDs update).
        // For now, let's try to cancel all POTENTIAL alarms for today based on current data.
        
        // Better strategy: When rescheduling, we overwrite if IDs match.
        // If a class is REMOVED, we must cancel it.
        // So we should iterate through ALL valid classes (or at least today's form the Repository) and cancel.
        
        // To be safe, we should probably iterate through "All classes" in repository and cancel them?
        // No, `scheduleTodayAlarms` is only for "Today".
        // Let's iterate Today's known classes and cancel.
        
        val now = Calendar.getInstance()
        val javaDayOfWeek = now.get(Calendar.DAY_OF_WEEK)
        val todayIndex = javaDayOfWeek - 1 
        val todayClasses = widgetData.classes?.filter { it.day == todayIndex } ?: emptyList()

        todayClasses.forEach { item ->
             val intent = Intent(context, ClassNotificationReceiver::class.java).apply {
                action = "com.kangnaengbotapp.notification.SHOW_CLASS_NOTI"
            }
            val requestCode = (item.id ?: "0").hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
            )
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }
        }
    }
}
