package com.kangnaengbotapp.widget.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import com.kangnaengbotapp.widget.data.WidgetClassItem

// Constants for drawing
private const val GRID_START_HOUR = 9
private const val GRID_END_HOUR = 18
private const val NUM_DAYS = 5 // Mon-Fri
private const val HEADER_HEIGHT = 60f
private const val TIME_COLUMN_WIDTH = 80f

class TimetableDrawer(private val context: Context) {

    fun drawTimetable(classes: List<WidgetClassItem>, width: Int, height: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        // Background
        canvas.drawColor(Color.parseColor("#1a1b23")) // Dark background

        val paint = Paint().apply {
            isAntiAlias = true
            textSize = 24f
            color = Color.WHITE
        }

        // 0. Calculate Grid Range
        // Default 09:00 - 18:00
        var startHour = 9
        var endHour = 18
        
        if (classes.isNotEmpty()) {
            val minStart = classes.minOfOrNull { (it.startTime ?: 0) } ?: (9 * 60)
            val maxEnd = classes.maxOfOrNull { (it.endTime ?: 0) } ?: (18 * 60)
            
            startHour = (minStart / 60)
            if (startHour > 8) startHour = 9 // Keep 9 AM as min unless earlier class exists
            
            endHour = (maxEnd / 60) + 1 // Ceiling
            if (endHour < 18) endHour = 18 // Keep 6 PM as max unless later class exists
        }
        
        // Calculate cell dimensions
        val cellWidth = (width - TIME_COLUMN_WIDTH) / NUM_DAYS
        val totalHours = endHour - startHour
        val cellHeight = (height - HEADER_HEIGHT) / totalHours

        // Helper for SP to PX
        val sp = context.resources.displayMetrics.scaledDensity
        
        // 1. Draw Grid Lines & Headers
        paint.color = Color.parseColor("#2c2d3a") // Grid line color
        paint.strokeWidth = 2f
        
        // Horizontal Lines (Hours)
        for (i in 0..totalHours) {
            val y = HEADER_HEIGHT + (i * cellHeight)
            canvas.drawLine(TIME_COLUMN_WIDTH, y, width.toFloat(), y, paint)
            
            // Time Text
            if (i < totalHours) {
                val hour = startHour + i
                val timeText = String.format("%02d:00", hour)
                paint.color = Color.GRAY
                paint.textSize = 11f * sp // 11sp
                paint.textAlign = Paint.Align.CENTER
                canvas.drawText(timeText, TIME_COLUMN_WIDTH / 2, y + 30f, paint) // Centered in column
            }
        }

        
        // Vertical Lines (Days)
        val days = listOf("월", "화", "수", "목", "금")
        for (i in 0..NUM_DAYS) {
            val x = TIME_COLUMN_WIDTH + (i * cellWidth)
            canvas.drawLine(x, 0f, x, height.toFloat(), paint) // Use original paint from loop? No reset color
            
            // Day Header Text
            if (i < NUM_DAYS) {
                paint.color = Color.WHITE
                paint.textSize = 14f * sp // 14sp
                paint.textAlign = Paint.Align.CENTER
                paint.typeface = Typeface.DEFAULT_BOLD
                canvas.drawText(days[i], x + (cellWidth / 2), HEADER_HEIGHT / 1.5f, paint)
                paint.typeface = Typeface.DEFAULT
            }
        }

        // 2. Draw Classes
        classes.forEach { item ->
            // Filter: 0=Sun (skip), 1=Mon(0), 2=Tue(1)...
            val dayIndex = (item.day ?: 0) - 1 
            if (dayIndex in 0 until NUM_DAYS) {
                val startMinTotal = item.startTime ?: (9 * 60)
                val endMinTotal = item.endTime ?: (10 * 60)
                
                // Calculate mapping to Y
                // StartHour (min 60)
                val gridStartMin = startHour * 60
                val startOffset = startMinTotal - gridStartMin
                val duration = endMinTotal - startMinTotal
                
                // Y position
                val topY = HEADER_HEIGHT + (startOffset * (cellHeight / 60))
                val heightPx = duration * (cellHeight / 60)
                
                // X position
                val leftX = TIME_COLUMN_WIDTH + (dayIndex * cellWidth)
                
                val rect = RectF(leftX + 2f, topY + 2f, leftX + cellWidth - 2f, topY + heightPx - 2f)
                
                // Draw Block Background
                paint.color = try { Color.parseColor(item.color) } catch(e: Exception) { Color.LTGRAY }
                paint.style = Paint.Style.FILL
                canvas.drawRoundRect(rect, 8f, 8f, paint)
                
                // Draw Text (Title)
                val titleSize = 13f * sp
                val roomSize = 10f * sp
                val lineHeight = titleSize + 10f // Spacing

                paint.color = Color.WHITE
                paint.textSize = titleSize // 13sp
                paint.textAlign = Paint.Align.LEFT
                // Simple text wrapping or clipping logic
                val title = item.title ?: ""
                val room = item.location ?: ""
                
                // Measure text to ensure it fits or clip
                // Just draw two lines for simplicity
                val textX = leftX + 8f
                var textY = topY + titleSize + 5f // Initial baseline
                canvas.drawText(title, textX, textY, paint)
                
                textY += lineHeight
                paint.textSize = roomSize // 10sp
                paint.color = Color.parseColor("#DDDDDD")
                canvas.drawText(room, textX, textY, paint)
            }
        }

        return bitmap
    }
}
