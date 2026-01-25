package com.kangnaengbotapp.widget.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import com.kangnaengbotapp.widget.data.WidgetClassItem

class TimetableDrawer(private val context: Context) {

    // Tailwind Slate Colors (Dark Mode)
    private val COLOR_SLATE_900 = Color.parseColor("#0f172a") // Main Background
    private val COLOR_SLATE_800 = Color.parseColor("#1e293b") // Headers
    private val COLOR_SLATE_700 = Color.parseColor("#334155") // Grid Lines
    private val COLOR_SLATE_50 = Color.parseColor("#f8fafc")  // Text Primary (White-ish)
    private val COLOR_SLATE_400 = Color.parseColor("#94a3b8") // Text Secondary (Gray)

    // Dimensions (in dp)
    private val HEADER_HEIGHT_DP = 40f
    private val TIME_COL_WIDTH_DP = 40f
    private val GRID_TEXT_SIZE_SP = 10f
    private val ITEM_TITLE_SIZE_SP = 11f
    private val ITEM_SUB_SIZE_SP = 10f
    private val ITEM_TIME_SIZE_SP = 9f

    fun drawTimetable(classes: List<WidgetClassItem>, width: Int, height: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Density helpers
        val displayMetrics = context.resources.displayMetrics
        val density = displayMetrics.density
        val sp = displayMetrics.scaledDensity

        val headerHeightPx = HEADER_HEIGHT_DP * density
        val timeColWidthPx = TIME_COL_WIDTH_DP * density

        // 0. Calculate Grid Range
        // Default 09:00 - 18:00
        var startHour = 9
        var endHour = 18

        if (classes.isNotEmpty()) {
            val minStart = classes.minOfOrNull { (it.startTime ?: 0) } ?: (9 * 60)
            val maxEnd = classes.maxOfOrNull { (it.endTime ?: 0) } ?: (18 * 60)

            startHour = (minStart / 60)
            // if (startHour > 8) startHour = 9 // Optional: Force 9am start? FE adapts. Let's adapt.
            startHour = startHour.coerceAtMost(9) // Start at least by 9am

            endHour = (maxEnd / 60) + 1
            endHour = endHour.coerceAtLeast(18) // End at least by 6pm
        }

        val totalHours = endHour - startHour
        val cellHeightPx = (height - headerHeightPx) / totalHours.toFloat()
        // 5 Days: Mon-Fri
        val numDays = 5
        val cellWidthPx = (width - timeColWidthPx) / numDays.toFloat()


        // 1. Draw Backgrounds
        // Main Background (Slate 900)
        canvas.drawColor(COLOR_SLATE_900)

        val bgPaint = Paint().apply { style = Paint.Style.FILL }
        
        // Header Row Background (Slate 800)
        bgPaint.color = COLOR_SLATE_800
        canvas.drawRect(0f, 0f, width.toFloat(), headerHeightPx, bgPaint)

        // Time Column Background (Slate 800)
        canvas.drawRect(0f, 0f, timeColWidthPx, height.toFloat(), bgPaint)


        // 2. Draw Grid Lines & Labels
        val linePaint = Paint().apply {
            color = COLOR_SLATE_700
            strokeWidth = 1f * density
            isAntiAlias = true
        }

        val textPaint = Paint().apply {
            isAntiAlias = true
            textSize = GRID_TEXT_SIZE_SP * sp
            textAlign = Paint.Align.CENTER
            color = COLOR_SLATE_400
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
        }

        // Horizontal Lines & Time Text
        for (i in 0..totalHours) {
            val y = headerHeightPx + (i * cellHeightPx)
            
            // Grid Line
            canvas.drawLine(timeColWidthPx, y, width.toFloat(), y, linePaint)

            // Time Text (09:00)
            if (i < totalHours) {
                val hour = startHour + i
                val timeText = String.format("%02d:00", hour)
                // Draw near top of the cell line?
                // FE aligns text top.
                val textY = y + (GRID_TEXT_SIZE_SP * sp) + 4f // slight offset
                canvas.drawText(timeText, timeColWidthPx / 2, textY, textPaint)
            }
        }

        // Vertical Lines & Day Headers
        val days = listOf("월", "화", "수", "목", "금")
        for (i in 0..numDays) {
            val x = timeColWidthPx + (i * cellWidthPx)
            
            // Grid Line
            canvas.drawLine(x, 0f, x, height.toFloat(), linePaint)

            // Day Header Text
            if (i < numDays) {
                val dayText = days[i]
                val textX = x + (cellWidthPx / 2)
                val textY = (headerHeightPx / 2) + (GRID_TEXT_SIZE_SP * sp / 3) 
                
                textPaint.color = COLOR_SLATE_400 
                canvas.drawText(dayText, textX, textY, textPaint)
            }
        }
        
        // CORNER FIX: Draw a line at the very top and very left if needed to close the box? 
        // The loops above cover most, but let's ensure border.
        // Actually, internal lines allow "open" look. 
        // Let's draw a border around the whole time/day area if needed? 
        // FE has borders everywhere.
        
        // 3. Draw Classes
        val blockPaint = Paint().apply { isAntiAlias = true }
        val titlePaint = Paint().apply { 
            isAntiAlias = true
            textSize = ITEM_TITLE_SIZE_SP * sp
            color = Color.WHITE
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            textAlign = Paint.Align.LEFT
        }
        val subPaint = Paint().apply {
            isAntiAlias = true
            textSize = ITEM_SUB_SIZE_SP * sp
            color = Color.parseColor("#e2e8f0") // Slate 200 equivalent? or lighter
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            textAlign = Paint.Align.LEFT
        }
        val timePaint = Paint().apply {
            isAntiAlias = true
            textSize = ITEM_TIME_SIZE_SP * sp
            color = Color.parseColor("#cbd5e1") // Slate 300
            textAlign = Paint.Align.LEFT
        }

        classes.forEach { item ->
            // Day Index (0=Sun, 1=Mon...) -> We want Mon=0
            // item.day is Calendar.DAY_OF_WEEK (1=Sun, 2=Mon...)
            // Wait, ScheduleRemoteViewsFactory passes adjusted or raw?
            // Existing code: val dayIndex = (item.day ?: 0) - 1 
            // In Repository/Factory, we usually convert logic. 
            // Let's assume item.day is 1-based index where Mon=1 in our data model? 
            // Checking ScheduleRemoteViewsFactory: 
            // "val dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK) - 1 // 0=Sun ... 6=Sat"
            // "classItems = data?.classes?.filter { it.day == dayOfWeek }"
            // This suggests item.day follows 0=Sun, 1=Mon convention.
            
            // We only show Mon(1)..Fri(5)
            val dayIndex = (item.day ?: 0) - 1 
            
            if (dayIndex in 0 until numDays) {
                val startMinTotal = item.startTime ?: (startHour * 60)
                val endMinTotal = item.endTime ?: (startHour * 60 + 60)

                // Mapping
                val gridStartMin = startHour * 60
                val startOffset = startMinTotal - gridStartMin
                val duration = endMinTotal - startMinTotal
                
                // Y Position
                // offset / 60.0 * cellHeight
                val topY = headerHeightPx + (startOffset * (cellHeightPx / 60))
                val heightBlock = duration * (cellHeightPx / 60)
                
                // X Position
                val leftX = timeColWidthPx + (dayIndex * cellWidthPx)
                
                val padding = 1f * density // 1dp gap
                val rect = RectF(
                    leftX + padding, 
                    topY + padding, 
                    leftX + cellWidthPx - padding, 
                    topY + heightBlock - padding
                )

                // Draw Block
                blockPaint.color = try { 
                    Color.parseColor(item.color) 
                } catch(e: Exception) { 
                    Color.LTGRAY 
                }
                canvas.drawRoundRect(rect, 6f * density, 6f * density, blockPaint)

                // Draw Text with Clipping
                canvas.save()
                canvas.clipRect(rect)
                
                val textPadding = 4f * density
                var currentTextY = rect.top + textPadding + (ITEM_TITLE_SIZE_SP * sp)

                // 1. Title
                val title = item.title ?: ""
                val safeTitle = truncateText(title, titlePaint, rect.width() - (textPadding*2))
                canvas.drawText(safeTitle, rect.left + textPadding, currentTextY, titlePaint)
                
                // 2. Code + Section
                // e.g. "ND01601[01]"
                currentTextY += (ITEM_TITLE_SIZE_SP * sp) + (2f * density)
                
                // Construct subtitle
                /* 
                   Wait, item doesn't have 'code' or 'section' fields explicitly exposed in WidgetClassItem?
                   Let's check WidgetClassItem structure.
                   If it's not there, we can't draw it.
                   Assuming title is what we have.
                   Let's use 'location' as secondary.
                */
                // Based on previous code: title, location, time string.
                // If code is not available, skip.
                
                // 3. Location
                val location = item.location ?: ""
                if (location.isNotEmpty()) {
                    val safeLoc = truncateText(location, subPaint, rect.width() - (textPadding*2))
                    canvas.drawText(safeLoc, rect.left + textPadding, currentTextY, subPaint)
                }
                
                // 4. Time (Pinned to Bottom)
                // "09:00~10:15"
                val sH = (item.startTime ?: 0) / 60
                val sM = (item.startTime ?: 0) % 60
                val eH = (item.endTime ?: 0) / 60
                val eM = (item.endTime ?: 0) % 60
                val timeStr = String.format("%02d:%02d~%02d:%02d", sH, sM, eH, eM)
                
                val timeTextHeight = ITEM_TIME_SIZE_SP * sp
                val timeY = rect.bottom - textPadding
                 
                // Only draw if there's space
                if (timeY > currentTextY + timeTextHeight) {
                     canvas.drawText(timeStr, rect.left + textPadding, timeY, timePaint)
                }

                canvas.restore()
            }
        }

        return bitmap
    }

    private fun truncateText(text: String, paint: Paint, maxWidth: Float): String {
        if (paint.measureText(text) <= maxWidth) return text
        
        val measuredWidth = FloatArray(1)
        val cnt = paint.breakText(text, true, maxWidth, measuredWidth)
        if (cnt < text.length) {
            val dots = ".."
            val dotsWidth = paint.measureText(dots)
            val available = maxWidth - dotsWidth
            if (available <= 0) return ""
            
            val cnt2 = paint.breakText(text, true, available, measuredWidth)
            return text.substring(0, cnt2.coerceAtLeast(0)) + dots
        }
        return text
    }
}
