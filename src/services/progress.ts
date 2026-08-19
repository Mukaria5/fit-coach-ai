import { supabase } from "@/integrations/supabase/client";
import { habitKeys, habitRatio, isHabitComplete, type HabitTargets } from "@/lib/score";
import type { DailyLog, HabitKey, Measurement } from "@/types";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function fetchMeasurements(): Promise<Measurement[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("user_id", userId)
    .order("measured_on", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Measurement[];
}

export async function addMeasurement(values: {
  weight_kg?: number | null;
  waist_cm?: number | null;
  measured_on?: string;
}): Promise<Measurement> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("measurements")
    .insert({ ...values, user_id: userId } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Measurement;
}

export interface HabitCompletion {
  key: HabitKey;
  percent: number;
}

export function habitCompletion(logs: DailyLog[], targets: HabitTargets): HabitCompletion[] {
  return habitKeys.map((key) => {
    if (logs.length === 0) return { key, percent: 0 };
    const completed = logs.filter((log) => isHabitComplete(key, log, targets)).length;
    return { key, percent: Math.round((completed / logs.length) * 100) };
  });
}

export function averageRatio(logs: DailyLog[], key: HabitKey, targets: HabitTargets): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce((sum, log) => sum + habitRatio(key, log, targets), 0);
  return total / logs.length;
}

export interface TrendPoint {
  date: string;
  label: string;
  value: number | null;
}

export function measurementTrend(
  measurements: Measurement[],
  field: "weight_kg" | "waist_cm",
): TrendPoint[] {
  return measurements
    .filter((m) => m[field] != null)
    .map((m) => ({
      date: m.measured_on,
      label: m.measured_on.slice(5),
      value: Number(m[field]),
    }));
}

export function deltaSummary(points: TrendPoint[]) {
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  if (values.length === 0) return { start: null, current: null, change: null };
  const start = values[0]!;
  const current = values[values.length - 1]!;
  return { start, current, change: Number((current - start).toFixed(1)) };
}
