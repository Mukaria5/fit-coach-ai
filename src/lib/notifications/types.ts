/**
 * Shared notification types — safe to import from both client and server.
 * Content, scheduling and delivery are deliberately kept in separate modules.
 */

export const NOTIFICATION_KINDS = [
  "water",
  "workout",
  "meal",
  "streak",
  "daily_briefing",
  "evening_checkin",
  "weekly_review",
  "sleep",
  "nutrition",
  "test",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** A ready-to-send notification. Content only — no scheduling, no transport. */
export interface NotificationPayload {
  kind: NotificationKind;
  title: string;
  body: string;
  /** In-app path opened when the notification is tapped. */
  url: string;
  /** Unique per user per event/day so the same reminder is never sent twice. */
  dedupeKey: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  water_enabled: boolean;
  workout_enabled: boolean;
  meal_enabled: boolean;
  streak_enabled: boolean;
  daily_briefing_enabled: boolean;
  evening_checkin_enabled: boolean;
  weekly_review_enabled: boolean;
  sleep_enabled: boolean;
  nutrition_enabled: boolean;
  daily_briefing_time: string;
  workout_time: string;
  breakfast_time: string;
  lunch_time: string;
  dinner_time: string;
  evening_checkin_time: string;
  sleep_time: string;
  water_interval_hours: number;
  weekly_review_dow: number;
  weekly_review_time: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export type NotificationCategory = Exclude<NotificationKind, "test">;

export const CATEGORY_LABELS: Record<NotificationCategory, { label: string; emoji: string }> = {
  water: { label: "Water", emoji: "💧" },
  workout: { label: "Workout", emoji: "🏋️" },
  meal: { label: "Meals", emoji: "🍽️" },
  streak: { label: "Streak", emoji: "🔥" },
  daily_briefing: { label: "Daily briefing", emoji: "🌅" },
  evening_checkin: { label: "Evening check-in", emoji: "🌙" },
  weekly_review: { label: "Weekly review", emoji: "📊" },
  sleep: { label: "Sleep reminder", emoji: "💤" },
  nutrition: { label: "Nutrition reminder", emoji: "🥗" },
};

/** Maps a notification category to the preference column that gates it. */
export const CATEGORY_FLAG: Record<NotificationCategory, keyof NotificationPreferences> = {
  water: "water_enabled",
  workout: "workout_enabled",
  meal: "meal_enabled",
  streak: "streak_enabled",
  daily_briefing: "daily_briefing_enabled",
  evening_checkin: "evening_checkin_enabled",
  weekly_review: "weekly_review_enabled",
  sleep: "sleep_enabled",
  nutrition: "nutrition_enabled",
};
