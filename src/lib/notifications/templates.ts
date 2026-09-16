/**
 * Notification content templates — pure, no scheduling and no delivery.
 * Deliberately encouraging: never guilt-driven, never shaming.
 */
import type { NotificationPayload } from "./types";

export interface TemplateContext {
  /** Local calendar date used for deduplication. */
  date: string;
  name?: string | null;
  waterLeftMl: number;
  waterDone: boolean;
  workoutDone: boolean;
  stepsLeft: number;
  mealsLogged: number;
  caloriesLeft: number;
  streak: number;
  goal?: string | null;
  budgetLeftKsh?: number | null;
}

const dashboard = "/home";

export function waterReminder(ctx: TemplateContext, slot: string): NotificationPayload {
  const litres = (ctx.waterLeftMl / 1000).toFixed(1);
  return {
    kind: "water",
    title: "💧 Quick water check-in",
    body:
      ctx.waterLeftMl > 0
        ? `About ${litres}L left to hit today's target. A glass now keeps it easy.`
        : "You haven't logged your water yet today.",
    url: dashboard,
    dedupeKey: `water:${ctx.date}:${slot}`,
  };
}

export function workoutReminder(ctx: TemplateContext): NotificationPayload {
  return {
    kind: "workout",
    title: "🔥 Your workout is still waiting",
    body: "Even 15–20 minutes today keeps the momentum going.",
    url: "/workouts",
    dedupeKey: `workout:${ctx.date}`,
  };
}

export function workoutDoneNudge(ctx: TemplateContext): NotificationPayload {
  return {
    kind: "workout",
    title: "💪 Workout logged",
    body: "Nice work — keep the streak moving.",
    url: "/progress",
    dedupeKey: `workout-done:${ctx.date}`,
  };
}

export function mealReminder(
  ctx: TemplateContext,
  meal: "breakfast" | "lunch" | "dinner",
): NotificationPayload {
  const copy = {
    breakfast: "🍳 Breakfast time — a protein-first Kenyan start sets up the whole day.",
    lunch: "🍽️ Lunch time — check today's Kenyan meal suggestions.",
    dinner: "🍽️ What's for dinner? Check today's Kenyan meal suggestions.",
  } as const;
  return {
    kind: "meal",
    title: copy[meal].slice(0, 40),
    body: copy[meal],
    url: "/nutrition",
    dedupeKey: `meal:${meal}:${ctx.date}`,
  };
}

export function nutritionReminder(ctx: TemplateContext): NotificationPayload {
  return {
    kind: "nutrition",
    title: "🥗 Nothing logged yet today",
    body:
      ctx.budgetLeftKsh && ctx.budgetLeftKsh > 0
        ? `You still have about KSh ${Math.round(ctx.budgetLeftKsh)} of today's food budget to work with.`
        : "Log what you ate and FitCoach will keep your macros on track.",
    url: "/nutrition",
    dedupeKey: `nutrition:${ctx.date}`,
  };
}

export function streakReminder(ctx: TemplateContext): NotificationPayload {
  return {
    kind: "streak",
    title: "🔥 Your streak is still alive",
    body: `${ctx.streak} days so far — one small action today keeps it going.`,
    url: dashboard,
    dedupeKey: `streak:${ctx.date}`,
  };
}

export function streakMilestone(ctx: TemplateContext): NotificationPayload {
  return {
    kind: "streak",
    title: `🔥 ${ctx.streak}-day streak!`,
    body: "You're building real consistency. Keep it simple today.",
    url: "/progress",
    dedupeKey: `streak-milestone:${ctx.streak}`,
  };
}

export function dailyBriefing(ctx: TemplateContext, aiBody?: string | null): NotificationPayload {
  const focus = [
    `• ${(ctx.waterLeftMl / 1000 || 2).toFixed(1)}L+ water`,
    "• 20-minute workout",
    "• Stay within your meal plan",
  ].join("\n");
  return {
    kind: "daily_briefing",
    title: "🌅 Good morning",
    body: aiBody?.trim() || `Today's focus:\n${focus}\n\nLet's keep it simple today.`,
    url: dashboard,
    dedupeKey: `briefing:${ctx.date}`,
  };
}

export function eveningCheckIn(ctx: TemplateContext, aiBody?: string | null): NotificationPayload {
  return {
    kind: "evening_checkin",
    title: "🌙 How did today go?",
    body: aiBody?.trim() || "Check in with FitCoach and close out your day in under a minute.",
    url: "/coach",
    dedupeKey: `evening:${ctx.date}`,
  };
}

export function weeklyReview(ctx: TemplateContext, aiBody?: string | null): NotificationPayload {
  return {
    kind: "weekly_review",
    title: "📊 Your week is ready",
    body:
      aiBody?.trim() ||
      "See your workouts, nutrition, habits and progress — plus what FitCoach recommends next week.",
    url: "/progress",
    dedupeKey: `weekly:${ctx.date}`,
  };
}

export function sleepReminder(ctx: TemplateContext): NotificationPayload {
  return {
    kind: "sleep",
    title: "💤 Winding-down time",
    body: "Lights down soon — good sleep is what makes tomorrow's training count.",
    url: dashboard,
    dedupeKey: `sleep:${ctx.date}`,
  };
}

export function testNotification(): NotificationPayload {
  return {
    kind: "test",
    title: "✅ FitCoach reminders are on",
    body: "This is what a FitCoach reminder looks like. Tap to open your dashboard.",
    url: dashboard,
    dedupeKey: `test:${Date.now()}`,
  };
}
