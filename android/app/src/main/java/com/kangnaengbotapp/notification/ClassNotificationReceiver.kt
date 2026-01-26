package com.kangnaengbotapp.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.kangnaengbotapp.MainActivity
import com.kangnaengbotapp.R

class ClassNotificationReceiver : BroadcastReceiver() {

    companion object {
        const val CHANNEL_ID = "kangnaeng_class_channel"
        const val CHANNEL_NAME = "수업 알림"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val title = intent.getStringExtra("CLASS_TITLE") ?: "수업 알림"
        val location = intent.getStringExtra("CLASS_LOCATION") ?: ""
        val timeStr = intent.getStringExtra("CLASS_TIME") ?: ""
        
        android.util.Log.d("KangNaengNoti", "Received alarm: $title, $location")

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create Channel (Safe to call repeatedly)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "수업 시작 전 알림을 보냅니다."
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Tap Action -> Open App
        val appIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            0,
            appIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Build Notification
        val builder = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.Notification.Builder(context, CHANNEL_ID)
        } else {
            android.app.Notification.Builder(context)
        }

        builder.setSmallIcon(R.mipmap.ic_launcher) // Use launcher icon or notification icon
            .setContentTitle(title)
            .setContentText("$timeStr | $location")
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setShowWhen(true)
        
        // Use unique ID for notification
        val notiId = (System.currentTimeMillis() % 10000).toInt()
        notificationManager.notify(notiId, builder.build())
    }
}
