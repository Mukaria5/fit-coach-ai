import { supabase } from "@/integrations/supabase/client";
import { isoDaysAgo } from "@/lib/score";
import type { DailyLog } from "@/types";

/**
 * Demo history generator. Purely user-triggered from Profile → "Load 30-day demo
 * history". Rows are marked with a note so they can be told apart from real
 * entries and removed again with `clearDemoHistory()`.
 */
export const DEMO_NOTE = "demo";

function seeded(index: number, salt: number): number {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function generateDemoLogs(days = 30): DailyLog[] {
  const logs: DailyLog[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const ramp = (days - i) / days; // improves over the month
    const r = (salt: number) => seeded(i, salt);
    logs.push({
      log_date: isoDaysAgo(i),
      water_ml: Math.round((1400 + ramp * 1200 + r(1) * 500) / 50) * 50,
      steps: Math.round((4200 + ramp * 4200 + r(2) * 2500) / 100) * 100,
      walk_km: Number((2 + ramp * 3 + r(3) * 1.5).toFixed(1)),
      walk_minutes: Math.round(20 + ramp * 25 + r(4) * 15),
      sleep_minutes: Math.round(360 + ramp * 60 + r(5) * 60),
      workout_done: r(6) < 0.35 + ramp * 0.45,
      nutrition_protein: r(7) < 0.5 + ramp * 0.4,
      nutrition_produce: r(8) < 0.45 + ramp * 0.45,
      nutrition_no_sugar: r(9) < 0.4 + ramp * 0.45,
      nutrition_no_late_snack: r(10) < 0.4 + ramp * 0.4,
      notes: DEMO_NOTE,
    });
  }
  return logs;
}

export async function loadDemoHistory(days = 30): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");

  const rows = generateDemoLogs(days).map((log) => ({ ...log, user_id: user.id }));
  const { error } = await supabase
    .from("daily_logs")
    .upsert(rows as never, { onConflict: "user_id,log_date" });
  if (error) throw error;

  const measurements = [0, 10, 20, 29].map((offset, index) => ({
    user_id: user.id,
    measured_on: isoDaysAgo(29 - offset),
    weight_kg: Number((82 - index * 1.1).toFixed(1)),
    waist_cm: Number((92 - index * 1.3).toFixed(1)),
  }));
  await supabase.from("measurements").upsert(measurements as never, {
    onConflict: "user_id,measured_on",
  });

  return rows.length;
}

export async function clearDemoHistory(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("daily_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("notes", DEMO_NOTE);
  if (error) throw error;
}
