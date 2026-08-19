import { supabase } from "@/integrations/supabase/client";
import { dayDiff, todayISO } from "@/lib/score";
import type { Challenge, ChallengeProgress } from "@/types";

export const CHALLENGE_SLUG = "30-days-stronger";

export async function fetchChallenge(): Promise<Challenge> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("slug", CHALLENGE_SLUG)
    .single();
  if (error) throw error;
  return data as unknown as Challenge;
}

export async function fetchOrStartProgress(challengeId: string): Promise<ChallengeProgress> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("challenge_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as unknown as ChallengeProgress;

  const { data: created, error: insertError } = await supabase
    .from("challenge_progress")
    .insert({ user_id: user.id, challenge_id: challengeId } as never)
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created as unknown as ChallengeProgress;
}

export async function updateProgress(
  challengeId: string,
  patch: Partial<ChallengeProgress>,
): Promise<ChallengeProgress> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("challenge_progress")
    .update(patch as never)
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ChallengeProgress;
}

export async function resetChallenge(challengeId: string): Promise<ChallengeProgress> {
  return updateProgress(challengeId, {
    started_on: todayISO(),
    completed_days: 0,
    current_streak: 0,
  });
}

export function currentDay(progress: ChallengeProgress, totalDays: number): number {
  const elapsed = dayDiff(progress.started_on, todayISO()) + 1;
  return Math.max(1, Math.min(totalDays, elapsed));
}

export function todaysTask(challenge: Challenge, day: number): string {
  const tasks = challenge.daily_tasks ?? [];
  if (tasks.length === 0) return "Complete your five daily habits.";
  return tasks[(day - 1) % tasks.length]!;
}

export interface Milestone {
  week: number;
  title: string;
  detail: string;
  unlockedDay: number;
}

export const milestones: Milestone[] = [
  { week: 1, title: "Foundation week", detail: "Hit water + walking every day", unlockedDay: 7 },
  { week: 2, title: "Momentum week", detail: "Add 4 workouts", unlockedDay: 14 },
  { week: 3, title: "Strength week", detail: "Sleep 7h+ on 6 days", unlockedDay: 21 },
  { week: 4, title: "Finisher week", detail: "All five habits, 5 days", unlockedDay: 30 },
];
