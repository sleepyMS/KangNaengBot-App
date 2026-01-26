package com.kangnaengbotapp.notification

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NotificationModule"
    }

    @ReactMethod
    fun setNotificationSettings(enabled: Boolean, offsetMinutes: Int) {
        // Save settings and Reschedule
        NotificationScheduler.setSettings(reactApplicationContext, enabled, offsetMinutes)
    }

    @ReactMethod
    fun updateNotifications() {
        // Just explicit call to reschedule (e.g. after schedule data update)
        NotificationScheduler.scheduleTodayAlarms(reactApplicationContext)
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val hasPermission = ActivityCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            promise.resolve(hasPermission)
        } else {
            promise.resolve(true)
        }
    }
    
    // Note: Requesting permissions usually requires an Activity.
    // React Native's PermissionAndroid module is better for this.
    // But we can check status here.
}
