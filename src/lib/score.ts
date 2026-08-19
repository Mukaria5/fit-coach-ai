import type { DailyLog, HabitKey, Profile } from "@/types";

export interface HabitTargets {
  water_target_ml: number;
  steps_target: number;
  sleep_target_min: number;
}

export const defaultTargets: HabitTargets = {
  water_target_ml: 2500,
  steps_target: 8000,
  sleep_target_min: 450,
};

export function targetsFromProfile(profile?: Profile | null): HabitTargets {
  if (!profile) return defaultTargets;
  return {
    water_target_ml: profile.water_target_ml ?? defaultTargets.water_target_ml,
    steps_target: profile.steps_target ?? defaultTargets.steps_target,
    sleep_target_min: profile.sleep_target_min ?? defaultTargets.sleep_target_min,
  };
}

export function nutritionCount(log: DailyLog): number {
  return [
    log.nutrition_protein,
    log.nutrition_produce,
    log.nutrition_no_sugar,
    log.nutrition_no_late_snack,
  ].filter(Boolean).length;
}

/** Ratio 0..1 of how complete a single habit is for the day. */
export function habitRatio(key: HabitKey, log: DailyLog, targets: HabitTargets): number {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  switch (key) {
    case "water":
      return clamp(log.water_ml / Math.max(1, targets.water_target_ml));
    case "walking":
      return clamp(log.steps / Math.max(1, targets.steps_target));
    case "workout":
      return log.workout_done ? 1 : 0;
    case "sleep":
      return clamp(log.sleep_minutes / Math.max(1, targets.sleep_target_min));
    case "nutrition":
      return nutritionCount(log) / 4;
  }
}

export const habitKeys: HabitKey[] = ["water", "walking", "workout", "sleep", "nutrition"];

/** Overall daily score, 0..100. */
export function dailyScore(log: DailyLog, targets: HabitTargets): number {
  const total = habitKeys.reduce((sum, key) => sum + habitRatio(key, log, targets), 0);
  return Math.round((total / habitKeys.length) * 100);
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "Outstanding day";
  if (score >= 70) return "Great progress today";
  if (score >= 45) return "Good start — keep going";
  if (score > 0) return "Let's build some momentum";
  return "Your day starts here";
}

export function isHabitComplete(key: HabitKey, log: DailyLog, targets: HabitTargets): boolean {
  return habitRatio(key, log, targets) >= 0.999;
}

/** A day counts toward a streak when at least 3 of 5 habits are complete. */
export function dayCounts(log: DailyLog, targets: HabitTargets): boolean {
  return habitKeys.filter((key) => isHabitComplete(key, log, targets)).length >= 3;
}

export function computeStreaks(logs: DailyLog[], targets: HabitTargets) {
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  let current = 0;
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  let completedDays = 0;

  for (const log of sorted) {
    const counts = dayCounts(log, targets);
    if (counts) completedDays += 1;
    const consecutive =
      previous === null ? true : dayDiff(previous, log.log_date) === 1 || dayDiff(previous, log.log_date) === 0;
    run = counts ? (consecutive ? run + 1 : 1) : 0;
    longest = Math.max(longest, run);
    previous = log.log_date;
  }
  current = run;
  return { current, longest, completedDays };
}

export function dayDiff(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / 86400000);
}

export function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatLitres(ml: number): string {
  return `${(ml / 1000).toFixed(2).replace(/0$/, "")}L`;
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function isoDaysAgo(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function emptyLog(date = todayISO()): DailyLog {
  return {
    log_date: date,
    water_ml: 0,
    steps: 0,
    walk_km: 0,
    walk_minutes: 0,
    sleep_minutes: 0,
    workout_done: false,
    nutrition_protein: false,
    nutrition_produce: false,
    nutrition_no_sugar: false,
    nutrition_no_late_snack: false,
  };
}

export function greeting(name?: string | null): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}
