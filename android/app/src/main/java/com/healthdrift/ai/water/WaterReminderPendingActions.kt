package com.healthdrift.ai.water

import android.content.Context

object WaterReminderPendingActions {

    private const val PREFERENCES_NAME = "water_reminder_actions"
    private const val PENDING_TOKENS_KEY = "pending_tokens"

    @Synchronized
    @JvmStatic
    fun enqueue(context: Context, token: String): Boolean {
        val tokens = pendingTokens(context)
        if (!tokens.add(token)) return true
        return preferences(context).edit().putStringSet(PENDING_TOKENS_KEY, tokens).commit()
    }

    @Synchronized
    fun hasPending(context: Context): Boolean = pendingTokens(context).isNotEmpty()

    @Synchronized
    fun getPending(context: Context): Set<String> = pendingTokens(context)

    @Synchronized
    fun acknowledge(context: Context, token: String): Boolean {
        val tokens = pendingTokens(context)
        if (!tokens.remove(token)) return true
        return preferences(context).edit().putStringSet(PENDING_TOKENS_KEY, tokens).commit()
    }

    private fun pendingTokens(context: Context): MutableSet<String> =
        preferences(context).getStringSet(PENDING_TOKENS_KEY, emptySet())
            ?.toMutableSet()
            ?: mutableSetOf()

    private fun preferences(context: Context) =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
}
