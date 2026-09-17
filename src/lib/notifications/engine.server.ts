/**
 * Context-aware reminder engine (server-only).
 *
 * Decides *which* reminders are due for a user right now, in the user's own
 * timezone, skipping anything they have already done today. Content comes from
 * templates.ts, timing from schedule.ts, delivery from send.server.ts.
 */
import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { aiModel } from "@/lib/ai/provider.server";

import { inQuietHours, isDue, localClock, waterSlots } from "./schedule";
import { sendToSubscriptions, type StoredSubscription } from "./send.server";
import * as t from "./templates";
import type { NotificationPayload, NotificationPreferences } from "./types";

type Client = SupabaseClient<Database>;

export interface EngineContext extends t.TemplateContext {
  minutes: number;
  dow: number;
}

/** Builds today's habit/nutrition context for one user. */
export async function loadContext(
  supabase: Client,
  userId: string,
  prefs: NotificationPreferences,
  now = new Date(),
): Promise<EngineContext> {
  const clock = localClock(prefs.timezone, now);

  const [{ data: profile }, { data: log }, { data: nutrition }, { data: recent }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", clock.date)
        .maybeSingle(),
      supabase
        .from("nutrition_logs")
        .select("calories, cost_ksh")
        .eq("user_id", userId)
        .eq("log_date", clock.date),
      supabase
        .from("daily_logs")
        .select("log_date, water_ml, steps, workout_done")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(30),
    ]);

  const waterTarget = profile?.water_target_ml ?? 2500;
  const stepsTarget = profile?.steps_target ?? 8000;
  const caloriesLogged = (nutrition ?? []).reduce((sum, row) => sum + Number(row.calories ?? 0), 0);
  const spent = (nutrition ?? []).reduce((sum, row) => sum + Number(row.cost_ksh ?? 0), 0);

  let streak = 0;
  for (const row of recent ?? []) {
    const active = row.workout_done || Number(row.water_ml) > 0 || Number(row.steps) > 0;
    if (!active) break;
    streak += 1;
  }

  return {
    date: clock.date,
    minutes: clock.minutes,
    dow: clock.dow,
    name: profile?.name ?? null,
    goal: profile?.primary_goal ?? null,
    waterLeftMl: Math.max(0, waterTarget - Number(log?.water_ml ?? 0)),
    waterDone: Number(log?.water_ml ?? 0) >= waterTarget,
    workoutDone: Boolean(log?.workout_done),
    stepsLeft: Math.max(0, stepsTarget - Number(log?.steps ?? 0)),
    mealsLogged: (nutrition ?? []).length,
    caloriesLeft: Math.max(0, 2000 - caloriesLogged),
    streak,
    budgetLeftKsh: Math.max(0, 500 - spent),
  };
}

/** Optional Gemini touch for the long-form reminders. Never blocks delivery. */
async function personalise(kind: string, ctx: EngineContext): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: aiModel(),
      system:
        "You are FitCoach AI, a warm Kenyan fitness and nutrition coach. Write ONE encouraging push notification body, max 160 characters, no emojis, never guilt-driven, plain text only.",
      prompt: `Notification type: ${kind}. User: ${ctx.name ?? "there"}, goal ${ctx.goal ?? "general fitness"}. Today: workout ${ctx.workoutDone ? "done" : "not done"}, ${Math.round(ctx.waterLeftMl / 100) / 10}L water left, ${ctx.mealsLogged} meals logged, ${ctx.streak}-day streak.`,
    });
    return text.trim().slice(0, 180) || null;
  } catch (error) {
    console.error("[notifications] personalisation skipped", error);
    return null;
  }
}

/** All reminders due for this user at this moment, already context-filtered. */
export async function duePayloads(
  prefs: NotificationPreferences,
  ctx: EngineContext,
): Promise<NotificationPayload[]> {
  if (!prefs.enabled) return [];
  if (inQuietHours(ctx.minutes, prefs.quiet_hours_start, prefs.quiet_hours_end)) return [];

  const due: NotificationPayload[] = [];

  if (prefs.water_enabled && !ctx.waterDone) {
    const slot = waterSlots(prefs).find((time) => isDue(ctx.minutes, time));
    if (slot) due.push(t.waterReminder(ctx, slot));
  }

  if (prefs.workout_enabled && !ctx.workoutDone && isDue(ctx.minutes, prefs.workout_time)) {
    due.push(t.workoutReminder(ctx));
  }

  if (prefs.meal_enabled) {
    const meals: [("breakfast" | "lunch" | "dinner"), string][] = [
      ["breakfast", prefs.breakfast_time],
      ["lunch", prefs.lunch_time],
      ["dinner", prefs.dinner_time],
    ];
    for (const [meal, time] of meals) {
      if (isDue(ctx.minutes, time)) due.push(t.mealReminder(ctx, meal));
    }
  }

  if (prefs.nutrition_enabled && ctx.mealsLogged === 0 && isDue(ctx.minutes, prefs.dinner_time)) {
    due.push(t.nutritionReminder(ctx));
  }

  if (prefs.daily_briefing_enabled && isDue(ctx.minutes, prefs.daily_briefing_time)) {
    due.push(t.dailyBriefing(ctx, await personalise("morning briefing", ctx)));
  }

  if (prefs.evening_checkin_enabled && isDue(ctx.minutes, prefs.evening_checkin_time)) {
    due.push(t.eveningCheckIn(ctx, await personalise("evening check-in", ctx)));
  }

  if (
    prefs.weekly_review_enabled &&
    ctx.dow === prefs.weekly_review_dow &&
    isDue(ctx.minutes, prefs.weekly_review_time)
  ) {
    due.push(t.weeklyReview(ctx, await personalise("weekly review", ctx)));
  }

  if (prefs.sleep_enabled && isDue(ctx.minutes, prefs.sleep_time)) {
    due.push(t.sleepReminder(ctx));
  }

  if (prefs.streak_enabled && ctx.streak >= 3) {
    if ([7, 14, 21, 30, 60, 100].includes(ctx.streak) && isDue(ctx.minutes, prefs.workout_time)) {
      due.push(t.streakMilestone(ctx));
    } else if (!ctx.workoutDone && isDue(ctx.minutes, prefs.evening_checkin_time)) {
      due.push(t.streakReminder(ctx));
    }
  }

  return due;
}

/** Records a delivery, returning false when the same reminder already went out. */
async function claimDelivery(
  supabase: Client,
  userId: string,
  payload: NotificationPayload,
  date: string,
  sent: number,
): Promise<void> {
  const { error } = await supabase.from("notification_deliveries").insert({
    user_id: userId,
    kind: payload.kind,
    dedupe_key: payload.dedupeKey,
    local_date: date,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    sent_count: sent,
  });
  if (error) console.error("[notifications] delivery record failed", error.message);
}

async function alreadySent(
  supabase: Client,
  userId: string,
  dedupeKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_deliveries")
    .select("id")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();
  return Boolean(data);
}

async function subscriptionsFor(supabase: Client, userId: string): Promise<StoredSubscription[]> {
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("is_active", true);
  return data ?? [];
}

async function deactivate(supabase: Client, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await supabase.from("push_subscriptions").update({ is_active: false }).in("id", ids);
}

/** Sends one payload now, honouring per-user deduplication. */
export async function deliver(
  supabase: Client,
  userId: string,
  payload: NotificationPayload,
  date: string,
  dedupe = true,
): Promise<number> {
  if (dedupe && (await alreadySent(supabase, userId, payload.dedupeKey))) return 0;

  const subscriptions = await subscriptionsFor(supabase, userId);
  if (!subscriptions.length) return 0;

  const result = await sendToSubscriptions(subscriptions, payload);
  await deactivate(supabase, result.gone);
  if (result.sent > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_active", true);
  }
  if (dedupe) await claimDelivery(supabase, userId, payload, date, result.sent);
  return result.sent;
}

/** Scheduled sweep across every user who has reminders switched on. */
export async function dispatchDueNotifications(
  supabase: Client,
  now = new Date(),
): Promise<{ users: number; sent: number }> {
  const { data: rows, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("enabled", true);
  if (error) throw new Error(error.message);

  let sent = 0;
  let users = 0;

  for (const prefs of rows ?? []) {
    try {
      const ctx = await loadContext(supabase, prefs.user_id, prefs, now);
      const payloads = await duePayloads(prefs, ctx);
      if (!payloads.length) continue;
      users += 1;
      for (const payload of payloads) {
        sent += await deliver(supabase, prefs.user_id, payload, ctx.date);
      }
    } catch (error) {
      console.error("[notifications] user dispatch failed", error);
    }
  }

  return { users, sent };
}
