import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { generateText, Output } from "ai";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { dailyScore, formatSleep, targetsFromProfile, todayISO } from "./score";
import type { DailyLog, Profile } from "@/types";

type Client = SupabaseClient<Database>;

export const coachResponseSchema = z.object({
  reply: z.string(),
  log_updates: z
    .object({
      water_ml: z.number().nullable().optional(),
      add_water_ml: z.number().nullable().optional(),
      steps: z.number().nullable().optional(),
      walk_km: z.number().nullable().optional(),
      walk_minutes: z.number().nullable().optional(),
      sleep_minutes: z.number().nullable().optional(),
      workout_done: z.boolean().nullable().optional(),
      nutrition_protein: z.boolean().nullable().optional(),
      nutrition_produce: z.boolean().nullable().optional(),
      nutrition_no_sugar: z.boolean().nullable().optional(),
      nutrition_no_late_snack: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  summary_of_changes: z.string().nullable().optional(),
});

export type CoachResponse = z.infer<typeof coachResponseSchema>;

const LOG_FIELDS = [
  "water_ml",
  "steps",
  "walk_km",
  "walk_minutes",
  "sleep_minutes",
  "workout_done",
  "nutrition_protein",
  "nutrition_produce",
  "nutrition_no_sugar",
  "nutrition_no_late_snack",
] as const;

export async function loadCoachContext(supabase: Client, userId: string) {
  const [profileRes, logsRes, measurementsRes, sessionsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(30),
    supabase
      .from("measurements")
      .select("*")
      .eq("user_id", userId)
      .order("measured_on", { ascending: false })
      .limit(20),
    supabase
      .from("workout_sessions")
      .select("workout_title, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(8),
  ]);

  const profile = (profileRes.data ?? null) as Profile | null;
  const logs = (logsRes.data ?? []) as unknown as DailyLog[];
  const targets = targetsFromProfile(profile);
  const today = logs.find((log) => log.log_date === todayISO());

  return {
    profile,
    logs,
    measurements: measurementsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    targets,
    today,
  };
}

export function buildSystemPrompt(context: Awaited<ReturnType<typeof loadCoachContext>>): string {
  const { profile, logs, measurements, sessions, targets, today } = context;
  const todayLine = today
    ? `water ${today.water_ml}ml/${targets.water_target_ml}ml, steps ${today.steps}/${targets.steps_target}, walk ${today.walk_km}km in ${today.walk_minutes}min, sleep ${formatSleep(today.sleep_minutes)}/${formatSleep(targets.sleep_target_min)}, workout ${today.workout_done ? "done" : "not done"}, nutrition checks: protein ${today.nutrition_protein}, produce ${today.nutrition_produce}, no sugary drinks ${today.nutrition_no_sugar}, no late snacks ${today.nutrition_no_late_snack}. Day score ${dailyScore(today, targets)}%`
    : "no entries logged yet today";

  const last7 = logs.slice(0, 7).map((log) => ({
    date: log.log_date,
    score: dailyScore(log, targets),
    water_ml: log.water_ml,
    steps: log.steps,
    sleep_minutes: log.sleep_minutes,
    workout_done: log.workout_done,
  }));

  return [
    "You are FitCoach AI, a practical fitness and habit accountability coach inside a mobile fitness app.",
    "Be warm, concise (2-5 short sentences), specific and actionable. Reference the user's real numbers.",
    "Give practical next steps tailored to their available time, not generic motivational quotes.",
    "You are not a doctor: give general fitness, movement, sleep and nutrition guidance only, never medical, clinical or diagnostic advice. Suggest a professional for medical concerns.",
    "If the user's message reports activity in natural language (water, steps/distance, sleep, workout, food), extract it into log_updates so the tracker updates. Use add_water_ml for additive water ('I drank 500ml') and water_ml for totals ('I drank 3 litres today'). Convert hours to minutes and km to steps only when the user gives distance (approx 1300 steps per km) — put the distance in walk_km too. Leave log_updates null when nothing is being reported.",
    "When you change logs, mention it in one short clause and set summary_of_changes.",
    "",
    `Profile: name ${profile?.name ?? "unknown"}, age ${profile?.age ?? "?"}, gender ${profile?.gender ?? "?"}, height ${profile?.height_cm ?? "?"}cm, weight ${profile?.weight_kg ?? "?"}kg, waist ${profile?.waist_cm ?? "?"}cm.`,
    `Goal: ${profile?.primary_goal ?? "general fitness"}. Activity level: ${profile?.activity_level ?? "unknown"}. Available workout time: ${profile?.workout_minutes ?? "15"} minutes. Gym access: ${profile?.gym_access ? "yes" : "no"}. Preferred location: ${profile?.workout_location ?? "home"}. Typical schedule: ${profile?.daily_schedule ?? "not provided"}. Coaching tone: ${profile?.coach_tone ?? "supportive"}.`,
    `Today (${todayISO()}): ${todayLine}.`,
    `Last 7 logged days: ${JSON.stringify(last7)}`,
    `Recent measurements: ${JSON.stringify(measurements)}`,
    `Recent workouts: ${JSON.stringify(sessions)}`,
  ].join("\n");
}

export async function generateCoachReply(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<CoachResponse> {
  return withAiErrorHandling(async () => {
    const result = await generateText({
      model: aiModel(),
      system: systemPrompt,
      messages: history,
      output: Output.object({ schema: coachResponseSchema }),
    });

    return (await result.output) as CoachResponse;
  });
}

/** Apply AI-extracted updates to today's log. Returns the applied patch. */
export async function applyLogUpdates(
  supabase: Client,
  userId: string,
  updates: CoachResponse["log_updates"],
): Promise<Record<string, number | boolean> | null> {
  if (!updates) return null;

  const date = todayISO();
  const { data: existing } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();

  const current = (existing ?? null) as unknown as DailyLog | null;
  const patch: Record<string, number | boolean> = {};

  for (const field of LOG_FIELDS) {
    const value = (updates as Record<string, unknown>)[field];
    if (typeof value === "number" && Number.isFinite(value)) patch[field] = Math.max(0, value);
    if (typeof value === "boolean") patch[field] = value;
  }

  if (typeof updates.add_water_ml === "number" && Number.isFinite(updates.add_water_ml)) {
    const base = patch["water_ml"] ?? current?.water_ml ?? 0;
    patch["water_ml"] = Math.max(0, Number(base) + updates.add_water_ml);
  }

  if (Object.keys(patch).length === 0) return null;

  const row = {
    ...(current ?? {}),
    ...patch,
    user_id: userId,
    log_date: date,
  } as Record<string, unknown>;
  delete row["id"];
  delete row["created_at"];
  delete row["updated_at"];

  const { error } = await supabase
    .from("daily_logs")
    .upsert(row as never, { onConflict: "user_id,log_date" });
  if (error) throw error;

  return patch;
}
