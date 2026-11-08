package com.healthdrift.ai.sleep

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.hypot
import kotlin.math.max

class SleepHistoryGraphView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    private val records = mutableListOf<SleepRecord>()
    private var selectedIndex = -1

    private val axisColor = Color.rgb(148, 163, 184)
    private val gridColor = Color.argb(45, 148, 163, 184)
    private val lineColor = Color.rgb(34, 211, 238)
    private val pointColor = Color.rgb(59, 130, 246)
    private val primaryTextColor = Color.rgb(248, 250, 252)
    private val cardColor = Color.rgb(18, 29, 53)

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = axisColor
        textSize = dp(11f)
    }
    private val axisPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = axisColor
        strokeWidth = dp(1f)
        style = Paint.Style.STROKE
    }
    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = gridColor
        strokeWidth = dp(1f)
        style = Paint.Style.STROKE
    }
    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = lineColor
        strokeWidth = dp(2.5f)
        strokeJoin = Paint.Join.ROUND
        strokeCap = Paint.Cap.ROUND
        style = Paint.Style.STROKE
    }
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(70, 59, 130, 246)
        strokeWidth = dp(8f)
        strokeJoin = Paint.Join.ROUND
        strokeCap = Paint.Cap.ROUND
        style = Paint.Style.STROKE
    }
    private val pointPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = pointColor
        style = Paint.Style.FILL
    }
    private val tooltipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = cardColor
        style = Paint.Style.FILL
    }

    private val fullDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private val tickDateFormat = SimpleDateFormat("MMM d", Locale.getDefault())
    private var pointPositions = emptyList<Pair<Float, Float>>()

    init {
        isClickable = true
    }

    fun setRecords(newRecords: List<SleepRecord>) {
        records.clear()
        records.addAll(newRecords.sortedBy { it.startTime })
        selectedIndex = -1
        updateContentDescription()
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        if (records.isEmpty()) {
            textPaint.textAlign = Paint.Align.CENTER
            textPaint.color = axisColor
            canvas.drawText(
                "No sleep records yet.",
                width / 2f,
                height / 2f,
                textPaint
            )
            pointPositions = emptyList()
            return
        }

        val left = dp(48f)
        val top = dp(24f)
        val right = width - dp(14f)
        val bottom = height - dp(56f)
        if (right <= left || bottom <= top) return

        val maxHours = max(
            8.0,
            ceil((records.maxOf { it.duration } / 3_600_000.0 + 1.0) / 2.0) * 2.0
        )

        drawGrid(canvas, left, top, right, bottom, maxHours)
        val minTime = records.first().startTime.toDouble()
        val maxTime = records.last().startTime.toDouble()
        val timeRange = maxTime - minTime

        pointPositions = records.map { record ->
            val x = if (timeRange == 0.0) {
                (left + right) / 2f
            } else {
                left + ((record.startTime - minTime) / timeRange).toFloat() * (right - left)
            }
            val hours = record.duration / 3_600_000.0
            val y = bottom - (hours / maxHours).toFloat() * (bottom - top)
            x to y
        }

        drawXAxisLabels(canvas, left, right, bottom)
        drawAxisTitles(canvas, left, bottom)
        drawData(canvas, left, top, right, bottom)
    }

    private fun drawGrid(
        canvas: Canvas,
        left: Float,
        top: Float,
        right: Float,
        bottom: Float,
        maxHours: Double
    ) {
        val divisions = 4
        for (i in 0..divisions) {
            val fraction = i.toFloat() / divisions
            val y = bottom - fraction * (bottom - top)
            canvas.drawLine(left, y, right, y, gridPaint)
            textPaint.textAlign = Paint.Align.RIGHT
            textPaint.color = axisColor
            canvas.drawText(
                String.format(Locale.getDefault(), "%.0f", maxHours * fraction),
                left - dp(8f),
                y + dp(4f),
                textPaint
            )
        }
        canvas.drawLine(left, top, left, bottom, axisPaint)
        canvas.drawLine(left, bottom, right, bottom, axisPaint)
    }

    private fun drawXAxisLabels(
        canvas: Canvas,
        left: Float,
        right: Float,
        bottom: Float
    ) {
        val labelCount = minOf(5, records.size)
        val indices = if (labelCount == 1) {
            listOf(0)
        } else {
            (0 until labelCount).map { label ->
                label * (records.lastIndex) / (labelCount - 1)
            }.distinct()
        }

        textPaint.color = axisColor
        textPaint.textAlign = Paint.Align.CENTER
        indices.forEach { index ->
            val (x, _) = pointPositions[index]
            canvas.drawText(
                tickDateFormat.format(Date(records[index].startTime)),
                x.coerceIn(left + dp(18f), right - dp(18f)),
                bottom + dp(18f),
                textPaint
            )
        }
    }

    private fun drawAxisTitles(canvas: Canvas, left: Float, bottom: Float) {
        textPaint.color = axisColor
        textPaint.textSize = dp(10f)
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("Sleep date", (left + width - dp(14f)) / 2f, height - dp(6f), textPaint)
        canvas.save()
        canvas.rotate(-90f, dp(11f), (bottom + dp(24f)) / 2f)
        canvas.drawText("Hours", dp(11f), (bottom + dp(24f)) / 2f, textPaint)
        canvas.restore()
        textPaint.textSize = dp(11f)
    }

    private fun drawData(
        canvas: Canvas,
        left: Float,
        top: Float,
        right: Float,
        bottom: Float
    ) {
        val linePath = Path()
        pointPositions.forEachIndexed { index, (x, y) ->
            if (index == 0) linePath.moveTo(x, y) else linePath.lineTo(x, y)
        }

        if (pointPositions.size > 1) {
            canvas.drawPath(linePath, glowPaint)
            canvas.drawPath(linePath, linePaint)
        }

        pointPositions.forEachIndexed { index, (x, y) ->
            pointPaint.color = if (index == selectedIndex) lineColor else pointColor
            canvas.drawCircle(x, y, dp(if (index == selectedIndex) 6f else 4f), pointPaint)
            if (index == selectedIndex) {
                pointPaint.color = Color.argb(70, 34, 211, 238)
                canvas.drawCircle(x, y, dp(11f), pointPaint)
                pointPaint.color = lineColor
                canvas.drawCircle(x, y, dp(4f), pointPaint)
            }
        }

        if (selectedIndex in records.indices) {
            drawTooltip(canvas, selectedIndex, left, top, right, bottom)
        }
    }

    private fun drawTooltip(
        canvas: Canvas,
        index: Int,
        left: Float,
        top: Float,
        right: Float,
        bottom: Float
    ) {
        val record = records[index]
        val dateText = fullDateFormat.format(Date(record.startTime))
        val hours = record.duration / 3_600_000L
        val minutes = record.duration % 3_600_000L / 60_000L
        val durationText = "${hours}h ${minutes}m"
        val boxWidth = dp(144f)
        val boxHeight = dp(48f)
        val (pointX, pointY) = pointPositions[index]
        val boxLeft = (pointX - boxWidth / 2).coerceIn(left, right - boxWidth)
        val boxTop = (pointY - boxHeight - dp(12f)).coerceAtLeast(top)

        canvas.drawRoundRect(
            RectF(boxLeft, boxTop, boxLeft + boxWidth, boxTop + boxHeight),
            dp(10f),
            dp(10f),
            tooltipPaint
        )
        textPaint.color = primaryTextColor
        textPaint.textAlign = Paint.Align.CENTER
        textPaint.textSize = dp(11f)
        canvas.drawText(dateText, boxLeft + boxWidth / 2, boxTop + dp(19f), textPaint)
        textPaint.color = lineColor
        canvas.drawText(
            "Duration: $durationText",
            boxLeft + boxWidth / 2,
            boxTop + dp(37f),
            textPaint
        )
        textPaint.color = axisColor
        textPaint.textSize = dp(11f)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> return true
            MotionEvent.ACTION_UP -> {
                val nearest = pointPositions.indices
                    .map { index ->
                        index to hypot(
                            event.x - pointPositions[index].first,
                            event.y - pointPositions[index].second
                        )
                    }
                    .minByOrNull { it.second }

                if (nearest != null && nearest.second <= dp(32f)) {
                    selectedIndex = nearest.first
                    updateContentDescription()
                    invalidate()
                    performClick()
                }
                return true
            }
            MotionEvent.ACTION_CANCEL -> return true
        }
        return super.onTouchEvent(event)
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    private fun updateContentDescription() {
        contentDescription = if (selectedIndex in records.indices) {
            val record = records[selectedIndex]
            val hours = record.duration / 3_600_000L
            val minutes = record.duration % 3_600_000L / 60_000L
            "${fullDateFormat.format(Date(record.startTime))}, $hours hours $minutes minutes"
        } else {
            "Sleep duration graph. ${records.size} saved records. Select a point to see its date and duration."
        }
    }

    private fun dp(value: Float): Float =
        value * resources.displayMetrics.density
}
