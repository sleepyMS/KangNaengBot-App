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

    // Theme Color Palette
    data class ThemeColors(
        val bgMain: Int,
        val bgHeader: Int,
        val bgTimeCol: Int,
        val gridLine: Int,
        val textPrimary: Int,
        val textSecondary: Int
    )

    private val DarkTheme = ThemeColors(
        bgMain = Color.parseColor("#0f172a"),      // Slate 900
        bgHeader = Color.parseColor("#1e293b"),    // Slate 800
        bgTimeCol = Color.parseColor("#1e293b"),   // Slate 800
        gridLine = Color.parseColor("#334155"),    // Slate 700
        textPrimary = Color.parseColor("#f8fafc"), // Slate 50
        textSecondary = Color.parseColor("#94a3b8")// Slate 400
    )

    private val LightTheme = ThemeColors(
        bgMain = Color.WHITE,                      // White
        bgHeader = Color.parseColor("#f9fafb"),    // Gray 50
        bgTimeCol = Color.parseColor("#f9fafb"),   // Gray 50
        gridLine = Color.parseColor("#e5e7eb"),    // Gray 200
        textPrimary = Color.parseColor("#374151"), // Gray 700
        textSecondary = Color.parseColor("#9ca3af")// Gray 400
    )

    // Dimensions (in dp)
    private val HEADER_HEIGHT_DP = 40f
    private val TIME_COL_WIDTH_DP = 40f
    private val GRID_TEXT_SIZE_SP = 10f
    private val ITEM_TITLE_SIZE_SP = 11f
    private val ITEM_SUB_SIZE_SP = 10f
    private val ITEM_TIME_SIZE_SP = 9f
    private val MIN_WIDTH_FOR_FULL_TEXT_DP = 35f // Threshold for smart truncation

    fun drawTimetable(classes: List<WidgetClassItem>, width: Int, height: Int, themeName: String? = "light"): Bitmap {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Select Theme
        val theme = if (themeName == "dark") DarkTheme else LightTheme

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
            startHour = startHour.coerceAtMost(9)

            endHour = (maxEnd / 60) + 1
            endHour = endHour.coerceAtLeast(18)
        }

        val totalHours = endHour - startHour
        val cellHeightPx = (height - headerHeightPx) / totalHours.toFloat()
        val numDays = 5
        val cellWidthPx = (width - timeColWidthPx) / numDays.toFloat()

        // 1. Draw Backgrounds
        canvas.drawColor(theme.bgMain)

        val bgPaint = Paint().apply { style = Paint.Style.FILL }
        
        // Header Row Background
        bgPaint.color = theme.bgHeader
        canvas.drawRect(0f, 0f, width.toFloat(), headerHeightPx, bgPaint)

        // Time Column Background
        bgPaint.color = theme.bgTimeCol
        canvas.drawRect(0f, 0f, timeColWidthPx, height.toFloat(), bgPaint)


        // 2. Draw Grid Lines & Labels
        val linePaint = Paint().apply {
            color = theme.gridLine
            strokeWidth = 1f * density
            isAntiAlias = true
        }

        val textPaint = Paint().apply {
            isAntiAlias = true
            textSize = GRID_TEXT_SIZE_SP * sp
            textAlign = Paint.Align.CENTER
            color = theme.textSecondary
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
                val textY = y + (GRID_TEXT_SIZE_SP * sp) + 4f 
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
                
                textPaint.color = theme.textSecondary
                canvas.drawText(dayText, textX, textY, textPaint)
            }
        }
        
        // 3. Draw Classes
        val blockPaint = Paint().apply { isAntiAlias = true }
        val titlePaint = Paint().apply { 
            isAntiAlias = true
            textSize = ITEM_TITLE_SIZE_SP * sp
            color = Color.WHITE // Always white on colored block
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            textAlign = Paint.Align.LEFT
        }
        val subPaint = Paint().apply {
            isAntiAlias = true
            textSize = ITEM_SUB_SIZE_SP * sp
            color = Color.parseColor("#e2e8f0") // Slate 200 equivalent
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
            val dayIndex = (item.day ?: 0) - 1 
            
            if (dayIndex in 0 until numDays) {
                val startMinTotal = item.startTime ?: (startHour * 60)
                val endMinTotal = item.endTime ?: (startHour * 60 + 60)

                val gridStartMin = startHour * 60
                val startOffset = startMinTotal - gridStartMin
                val duration = endMinTotal - startMinTotal
                
                // Y Position
                val topY = headerHeightPx + (startOffset * (cellHeightPx / 60))
                val heightBlock = duration * (cellHeightPx / 60)
                
                // X Position
                val maxCols = (item.maxCols ?: 1).coerceAtLeast(1)
                val colIndex = (item.colIndex ?: 0).coerceAtLeast(0)
                
                val subCellWidth = cellWidthPx / maxCols
                val leftX = timeColWidthPx + (dayIndex * cellWidthPx) + (colIndex * subCellWidth)
                
                val padding = 1f * density 
                val rect = RectF(
                    leftX + padding, 
                    topY + padding, 
                    leftX + subCellWidth - padding, 
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
                val blockWidthDp = rect.width() / density
                val isVeryNarrow = blockWidthDp < MIN_WIDTH_FOR_FULL_TEXT_DP

                // Smart Text Sizing
                val activeTitleSize = if (isVeryNarrow) 9f else ITEM_TITLE_SIZE_SP
                titlePaint.textSize = activeTitleSize * sp
                
                var currentTextY = rect.top + textPadding + titlePaint.textSize

                // 1. Title
                val title = item.title ?: ""
                val safeTitle = if (isVeryNarrow) {
                     // Smart Truncation: No dots, just fit what we can
                     truncateTextSmart(title, titlePaint, rect.width() - (textPadding*2))
                } else {
                     truncateText(title, titlePaint, rect.width() - (textPadding*2))
                }
                canvas.drawText(safeTitle, rect.left + textPadding, currentTextY, titlePaint)
                
                // 2. Location (Skip if very narrow or no space)
                currentTextY += (activeTitleSize * sp) + (2f * density)
                val location = item.location ?: ""
                
                // Check remaining height
                if (!isVeryNarrow && location.isNotEmpty() && rect.bottom > currentTextY + subPaint.textSize) {
                     val safeLoc = truncateText(location, subPaint, rect.width() - (textPadding*2))
                     canvas.drawText(safeLoc, rect.left + textPadding, currentTextY, subPaint)
                }
                
                // 3. Time (Skip if very narrow)
                if (!isVeryNarrow) {
                    val sH = (item.startTime ?: 0) / 60
                    val sM = (item.startTime ?: 0) % 60
                    val eH = (item.endTime ?: 0) / 60
                    val eM = (item.endTime ?: 0) % 60
                    val timeStr = String.format("%02d:%02d", sH, sM) // Just start time if tight? No, range.
                    // If tight, maybe just start time?
                    // Let's stick to simple logic: if enough space at bottom
                    
                    val timeTextHeight = ITEM_TIME_SIZE_SP * sp
                    val timeY = rect.bottom - textPadding
                    
                    if (timeY > currentTextY + timeTextHeight) {
                         canvas.drawText(timeStr, rect.left + textPadding, timeY, timePaint)
                    }
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

    /**
     * Smart Truncation for very narrow columns.
     * Simply returns the substring that fits, WITHOUT adding dots ".." to save space.
     * This is better for reading "Calculus" as "Calcu" instead of "Cal.."
     */
    private fun truncateTextSmart(text: String, paint: Paint, maxWidth: Float): String {
        if (paint.measureText(text) <= maxWidth) return text
        val measuredWidth = FloatArray(1)
        val cnt = paint.breakText(text, true, maxWidth, measuredWidth)
        return text.substring(0, cnt.coerceAtLeast(0))
    }
}

