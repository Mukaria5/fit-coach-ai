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

/* ----------------------------- nutrition ----------------------------- */

export interface Food {
  id: string;
  slug: string;
  name: string;
  local_names: string[];
  category_slug: string;
  serving_label: string;
  serving_grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  price_ksh: number | null;
  tags: string[];
  good_for: string[];
  notes: string | null;
}

export interface MealComponent {
  name: string;
  quantity?: string;
}

export interface MealPlan {
  id: string;
  user_id?: string;
  title: string;
  plan_type: string;
  start_date: string;
  end_date: string | null;
  budget_ksh: number | null;
  total_cost_ksh: number | null;
  summary: string | null;
  created_at?: string;
}

export interface MealPlanItem {
  id: string;
  plan_id: string;
  plan_date: string;
  meal_type: string;
  time_slot: string | null;
  title: string;
  components: MealComponent[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  cost_ksh: number | null;
  notes: string | null;
  eaten: boolean;
  sort_order: number;
}

export interface NutritionLog {
  id: string;
  log_date: string;
  meal_type: string;
  description: string;
  food_slug: string | null;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  cost_ksh: number | null;
  source: string;
  created_at?: string;
}

export interface NutritionPreferences {
  user_id?: string;
  daily_budget_ksh: number;
  diet_type: string;
  allergies: string[];
  dislikes: string[];
  meals_per_day: number;
  eating_schedule: string | null;
  cooking_style: string;
  calorie_target: number | null;
  protein_target_g: number | null;
}

export interface NutritionTargets {
  calories: number;
  protein_g: number;
  maintenance: number;
  budget_ksh: number;
}

export interface ShoppingList {
  id: string;
  plan_id: string | null;
  title: string;
  total_cost_ksh: number | null;
  created_at?: string;
}

export interface ShoppingListItem {
  id: string;
  list_id: string;
  name: string;
  quantity: string | null;
  category_slug: string | null;
  estimated_cost_ksh: number | null;
  bought: boolean;
}
