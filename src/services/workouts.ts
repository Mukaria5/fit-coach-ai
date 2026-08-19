import { supabase } from "@/integrations/supabase/client";
import type { Workout } from "@/types";

export const workoutCategories = [
  "5 Minute",
  "10 Minute",
  "15 Minute",
  "20 Minute",
  "Beginner",
  "Full Body",
  "Core",
  "Lower Body",
  "Upper Body",
  "No Equipment",
];

export async function fetchWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .order("duration_min", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Workout[];
}

/** Pick today's recommended workout from the user's available time and equipment. */
export function recommendWorkout(
  workouts: Workout[],
  opts: { minutes?: string | null; gymAccess?: boolean | null },
): Workout | null {
  if (workouts.length === 0) return null;
  const budget = minutesBudget(opts.minutes);
  const eligible = workouts.filter(
    (w) => w.duration_min <= budget && (opts.gymAccess ? true : w.equipment === "None"),
  );
  const pool = eligible.length > 0 ? eligible : workouts;
  const sorted = [...pool].sort((a, b) => b.duration_min - a.duration_min);
  const index = new Date().getDate() % sorted.length;
  return sorted[index] ?? sorted[0]!;
}

export function minutesBudget(minutes?: string | null): number {
  switch (minutes) {
    case "5-10":
      return 10;
    case "15":
      return 15;
    case "20-30":
      return 30;
    case "30-60":
      return 60;
    default:
      return 15;
  }
}

export async function completeWorkoutSession(workout: Workout): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase.from("workout_sessions").insert({
    user_id: user.id,
    workout_id: workout.id,
    workout_title: workout.title,
    duration_min: workout.duration_min,
  } as never);
  if (error) throw error;
}

export async function fetchSessionCount(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;
  const { count, error } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userData.user.id);
  if (error) throw error;
  return count ?? 0;
}
