package com.kangnaengbotapp.widget.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson

class WidgetRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        const val PREFS_NAME = "KangNaengWidgetPrefs"
        const val KEY_SCHEDULE_DATA = "SCHEDULE_DATA"
    }

    fun saveScheduleData(jsonString: String) {
        prefs.edit().putString(KEY_SCHEDULE_DATA, jsonString).apply()
    }

    fun getScheduleData(): WidgetData? {
        val json = prefs.getString(KEY_SCHEDULE_DATA, null) ?: return null
        return try {
            gson.fromJson(json, WidgetData::class.java)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun clearData() {
        prefs.edit().remove(KEY_SCHEDULE_DATA).apply()
    }
}
