package com.kangnaengbotapp.widget.data

data class WidgetData(
    val updatedAtDisplay: String? = null,
    val formattedDate: String? = null,
    val classes: List<WidgetClassItem>? = null, // Renamed from todayClasses
    val isEmpty: Boolean = true
)

data class WidgetClassItem(
    val id: String? = null,
    val title: String? = null,
    val location: String? = null,
    val timeDisplay: String? = null, // "09:00 - 10:30"
    val color: String? = null,       // Hex Color String e.g. "#FF5733"
    val deepLink: String? = null,    // "kangnaeng://class/101"
    
    // New fields for Grid View
    val day: Int? = 0,               // 0=Sun, 1=Mon, ..., 6=Sat
    val startTime: Int? = 0,         // Minutes from 00:00 (e.g. 540 for 9:00)
    val endTime: Int? = 0            // Minutes from 00:00
)
