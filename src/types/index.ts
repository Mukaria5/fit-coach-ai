export type HabitKey = "water" | "walking" | "workout" | "sleep" | "nutrition";

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  waist_cm: number | null;
  activity_level: string | null;
  primary_goal: string | null;
  workout_minutes: string | null;
  gym_access: boolean | null;
  workout_location: string | null;
  daily_schedule: string | null;
  water_target_ml: number;
  steps_target: number;
  sleep_target_min: number;
  onboarded: boolean;
  dark_mode: boolean;
  notifications_enabled: boolean;
  coach_tone: string;
}

export interface DailyLog {
  id?: string;
  user_id?: string;
  log_date: string;
  water_ml: number;
  steps: number;
  walk_km: number;
  walk_minutes: number;
  sleep_minutes: number;
  workout_done: boolean;
  nutrition_protein: boolean;
  nutrition_produce: boolean;
  nutrition_no_sugar: boolean;
  nutrition_no_late_snack: boolean;
  notes?: string | null;
}

export interface Measurement {
  id?: string;
  measured_on: string;
  weight_kg: number | null;
  waist_cm: number | null;
}

export interface Exercise {
  name: string;
  detail: string;
}

export interface Workout {
  id: string;
  slug: string;
  title: string;
  duration_min: number;
  difficulty: string;
  equipment: string;
  calories: number;
  categories: string[];
  exercises: Exercise[];
  description: string | null;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  total_days: number;
  daily_tasks: string[];
}

export interface ChallengeProgress {
  id?: string;
  challenge_id: string;
  started_on: string;
  completed_days: number;
  current_streak: number;
  longest_streak: number;
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface LogUpdatePatch {
  water_ml?: number;
  steps?: number;
  walk_km?: number;
  walk_minutes?: number;
  sleep_minutes?: number;
  workout_done?: boolean;
  nutrition_protein?: boolean;
  nutrition_produce?: boolean;
  nutrition_no_sugar?: boolean;
  nutrition_no_late_snack?: boolean;
  notes?: string;
}
