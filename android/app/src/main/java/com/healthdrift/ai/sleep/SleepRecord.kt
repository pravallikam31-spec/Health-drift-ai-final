package com.healthdrift.ai.sleep

data class SleepRecord(
    val startTime: Long,
    val endTime: Long,
    val duration: Long,
    val probability: Int
)
