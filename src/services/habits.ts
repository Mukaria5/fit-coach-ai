import { supabase } from "@/integrations/supabase/client";
import { emptyLog, isoDaysAgo, todayISO } from "@/lib/score";
import type { DailyLog, LogUpdatePatch } from "@/types";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function fetchLog(date = todayISO()): Promise<DailyLog> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as DailyLog) ?? emptyLog(date);
}

export async function fetchRecentLogs(days = 30): Promise<DailyLog[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", isoDaysAgo(days - 1))
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DailyLog[];
}

export async function saveLog(patch: LogUpdatePatch, date = todayISO()): Promise<DailyLog> {
  const userId = await requireUserId();
  const current = await fetchLog(date);
  const merged = { ...current, ...patch, user_id: userId, log_date: date };
  delete (merged as { id?: string }).id;

  const { data, error } = await supabase
    .from("daily_logs")
    .upsert(merged as never, { onConflict: "user_id,log_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as DailyLog;
}

export async function addWater(ml: number, date = todayISO()): Promise<DailyLog> {
  const current = await fetchLog(date);
  return saveLog({ water_ml: Math.max(0, current.water_ml + ml) }, date);
}

export async function logWalk(
  values: { steps?: number; walk_km?: number; walk_minutes?: number },
  date = todayISO(),
): Promise<DailyLog> {
  return saveLog(values, date);
}

export async function logSleep(minutes: number, date = todayISO()): Promise<DailyLog> {
  return saveLog({ sleep_minutes: Math.max(0, minutes) }, date);
}

export async function setWorkoutDone(done: boolean, date = todayISO()): Promise<DailyLog> {
  return saveLog({ workout_done: done }, date);
}

export async function toggleNutrition(
  key: "nutrition_protein" | "nutrition_produce" | "nutrition_no_sugar" | "nutrition_no_late_snack",
  value: boolean,
  date = todayISO(),
): Promise<DailyLog> {
  return saveLog({ [key]: value } as LogUpdatePatch, date);
}
