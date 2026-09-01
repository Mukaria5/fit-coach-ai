import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { generateText, Output } from "ai";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { targetsFromProfile, todayISO } from "./score";
import type { DailyLog, Profile } from "@/types";

type Client = SupabaseClient<Database>;

const MODEL = "google/gemini-3.7-flash";

/* ------------------------------- schemas ------------------------------- */

const macroFields = {
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  cost_ksh: z.number(),
};

export const plannedMealSchema = z.object({
  plan_date: z.string(),
  meal_type: z.string(),
  time_slot: z.string(),
  title: z.string(),
  components: z.array(z.string()),
  notes: z.string().nullable().optional(),
  ...macroFields,
});

export const mealPlanSchema = z.object({
  summary: z.string(),
  meals: z.array(plannedMealSchema),
});

export const foodLogSchema = z.object({
  reply: z.string(),
  entries: z.array(
    z.object({
      meal_type: z.string(),
      description: z.string(),
      servings: z.number(),
      ...macroFields,
    }),
  ),
});

export const shoppingListSchema = z.object({
  title: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      category_slug: z.string().nullable().optional(),
      estimated_cost_ksh: z.number(),
    }),
  ),
});

export type PlannedMeal = z.infer<typeof plannedMealSchema>;
export type MealPlanResult = z.infer<typeof mealPlanSchema>;
export type FoodLogResult = z.infer<typeof foodLogSchema>;
export type ShoppingListResult = z.infer<typeof shoppingListSchema>;

/* ------------------------------- context ------------------------------- */

export interface NutritionPrefs {
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

export const defaultPrefs: NutritionPrefs = {
  daily_budget_ksh: 400,
  diet_type: "omnivore",
  allergies: [],
  dislikes: [],
  meals_per_day: 3,
  eating_schedule: null,
  cooking_style: "home",
  calorie_target: null,
  protein_target_g: null,
};

/** Mifflin-St Jeor + activity factor + goal adjustment. */
export function estimateTargets(profile: Profile | null, prefs: NutritionPrefs) {
  const weight = Number(profile?.weight_kg ?? 70);
  const height = Number(profile?.height_cm ?? 170);
  const age = Number(profile?.age ?? 30);
  const male = (profile?.gender ?? "").toLowerCase().startsWith("m");
  const bmr = 10 * weight + 6.25 * height - 5 * age + (male ? 5 : -161);

  const activity =
    { sedentary: 1.25, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[
      (profile?.activity_level ?? "light").toLowerCase()
    ] ?? 1.375;

  const goal = (profile?.primary_goal ?? "maintenance").toLowerCase();
  const maintenance = bmr * activity;
  let calories = maintenance;
  if (goal.includes("loss") || goal.includes("lose") || goal.includes("fat")) calories = maintenance - 450;
  if (goal.includes("muscle") || goal.includes("gain") || goal.includes("bulk")) calories = maintenance + 300;

  const proteinPerKg = goal.includes("muscle") ? 1.9 : goal.includes("loss") ? 1.8 : 1.5;

  return {
    calories: prefs.calorie_target ?? Math.round(calories / 10) * 10,
    protein_g: prefs.protein_target_g ?? Math.round(weight * proteinPerKg),
    maintenance: Math.round(maintenance),
    goal,
  };
}

export async function loadNutritionContext(supabase: Client, userId: string) {
  const [profileRes, prefsRes, logsRes, todayFoodRes, foodsRes, mealsRes, sessionsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("nutrition_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(7),
    supabase.from("nutrition_logs").select("*").eq("user_id", userId).eq("log_date", todayISO()),
    supabase
      .from("foods")
      .select("slug, name, local_names, category_slug, serving_label, calories, protein_g, carbs_g, fat_g, fiber_g, price_ksh, tags, good_for"),
    supabase.from("meals").select("slug, title, meal_type, calories, protein_g, cost_ksh, tags, good_for"),
    supabase
      .from("workout_sessions")
      .select("workout_title, duration_min, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(5),
  ]);

  const profile = (profileRes.data ?? null) as Profile | null;
  const prefsRow = prefsRes.data as Partial<NutritionPrefs> | null;
  const prefs: NutritionPrefs = { ...defaultPrefs, ...(prefsRow ?? {}) };
  const logs = (logsRes.data ?? []) as unknown as DailyLog[];

  return {
    profile,
    prefs,
    logs,
    habitTargets: targetsFromProfile(profile),
    todayFood: todayFoodRes.data ?? [],
    foods: foodsRes.data ?? [],
    meals: mealsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    targets: estimateTargets(profile, prefs),
  };
}

export type NutritionContext = Awaited<ReturnType<typeof loadNutritionContext>>;

/* ------------------------------- prompts ------------------------------- */

const KENYAN_RULES = [
  "You are FitCoach AI's Kenyan nutrition coach. You plan real Kenyan food, not Western diet-plan food.",
  "Only use foods that are actually available and normal in Kenya: ugali, brown ugali, githeri, ndengu, njahi, maharagwe, sukuma wiki, managu, terere, cabbage, kachumbari, matoke, ngwaci, nduma, viazi, rice, chapati, uji, mandazi, omena, tilapia, kuku, nyama, matumbo, maini, mayai, mala, maziwa, yoghurt, avocado, njugu karanga, ndizi, maembe, papai, tikitimaji, chungwa, chai.",
  "Use Kenyan portion language people recognise: a fist of ugali, one cup, one chapati, a handful of njugu, quarter kilo, a mug of chai.",
  "Never tell a user to eliminate ugali or chapati. Fix portions, cooking method and pairing instead: less oil, more greens, add protein, one chapati instead of three, boiled instead of deep fried.",
  "Respect the daily budget in Kenyan shillings. Cheap protein routes are omena, ndengu, githeri, mayai, njahi, mala. Suggest expensive foods only when the budget allows.",
  "Respect diet type, allergies and dislikes absolutely. Never include an allergen or a disliked food.",
  "Fit meals to the user's real schedule and cooking style (home cooking, kibanda/street, or mixed).",
  "You are not a doctor or dietitian. Give general food and portion guidance only, never medical, clinical or diagnostic advice, no supplements protocols, no extreme calorie cuts (never below 1200 kcal for women or 1500 kcal for men). If a health condition is mentioned, advise seeing a professional.",
  "Costs are approximate KSh estimates, not exact prices.",
];

export function nutritionContextBlock(context: NutritionContext): string {
  const { profile, prefs, targets, todayFood, sessions, logs } = context;
  const eatenToday = (todayFood as { description: string; calories: number; protein_g: number }[]).map(
    (row) => `${row.description} (${Math.round(row.calories)}kcal, ${Math.round(row.protein_g)}g protein)`,
  );
  const eatenTotals = (todayFood as { calories: number; protein_g: number; cost_ksh: number | null }[]).reduce(
    (acc, row) => ({
      calories: acc.calories + Number(row.calories ?? 0),
      protein: acc.protein + Number(row.protein_g ?? 0),
      cost: acc.cost + Number(row.cost_ksh ?? 0),
    }),
    { calories: 0, protein: 0, cost: 0 },
  );

  const foodLibrary = (context.foods as { name: string; serving_label: string; calories: number; protein_g: number; price_ksh: number | null }[])
    .map((f) => `${f.name} (${f.serving_label}: ${Math.round(f.calories)}kcal, ${f.protein_g}g P, ~KSh ${f.price_ksh ?? "?"})`)
    .join("; ");

  return [
    `User: ${profile?.name ?? "unknown"}, age ${profile?.age ?? "?"}, ${profile?.gender ?? "?"}, ${profile?.height_cm ?? "?"}cm, ${profile?.weight_kg ?? "?"}kg.`,
    `Fitness goal: ${profile?.primary_goal ?? "general fitness"}. Activity: ${profile?.activity_level ?? "light"}.`,
    `Daily targets: ${targets.calories} kcal, ${targets.protein_g}g protein (maintenance ~${targets.maintenance} kcal).`,
    `Food budget: KSh ${prefs.daily_budget_ksh}/day. Diet: ${prefs.diet_type}. Cooking style: ${prefs.cooking_style}. Meals per day: ${prefs.meals_per_day}.`,
    `Allergies: ${prefs.allergies.join(", ") || "none"}. Dislikes: ${prefs.dislikes.join(", ") || "none"}.`,
    `Eating schedule: ${prefs.eating_schedule ?? profile?.daily_schedule ?? "not provided"}.`,
    `Eaten today: ${eatenToday.length ? eatenToday.join("; ") : "nothing logged yet"} (running total ${Math.round(eatenTotals.calories)} kcal, ${Math.round(eatenTotals.protein)}g protein, KSh ${Math.round(eatenTotals.cost)}).`,
    `Recent workouts: ${JSON.stringify(sessions)}`,
    `Recent habit days: ${JSON.stringify(
      logs.slice(0, 5).map((l) => ({ date: l.log_date, steps: l.steps, workout: l.workout_done, water_ml: l.water_ml })),
    )}`,
    `Approximate Kenyan food reference: ${foodLibrary}`,
  ].join("\n");
}

function gateway() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI coach is not configured");
  return createLovableAiGatewayProvider(apiKey);
}

async function structured<T>(system: string, prompt: string, schema: z.ZodType<T>): Promise<T> {
  const result = await generateText({
    model: gateway()(MODEL),
    system,
    prompt,
    output: Output.object({ schema: schema as never }),
  });
  return (await result.output) as T;
}

/* ------------------------------ generators ----------------------------- */

export function isoPlus(days: number, from = todayISO()): string {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function generateMealPlan(
  context: NutritionContext,
  options: { days: number; startDate: string; instructions?: string | null },
): Promise<MealPlanResult> {
  const dates = Array.from({ length: options.days }, (_, i) => isoPlus(i, options.startDate));
  const system = [...KENYAN_RULES, "", nutritionContextBlock(context)].join("\n");
  const prompt = [
    `Build a Kenyan meal plan for these dates: ${dates.join(", ")}.`,
    `Give exactly ${context.prefs.meals_per_day} meals per day plus at most one snack per day.`,
    `Each day's total should land near ${context.targets.calories} kcal and at least ${context.targets.protein_g}g protein, and the day's total cost should stay within KSh ${context.prefs.daily_budget_ksh}.`,
    "Vary meals across days; do not repeat the same supper twice in a row.",
    "components must be short Kenyan portion strings like '1 fist ugali', '1 cup sukuma wiki', '1 cup omena'.",
    "time_slot must be a clock time like '07:00' matching the user's schedule. meal_type is one of breakfast, lunch, supper, snack.",
    "summary: 2-3 sentences explaining how this plan serves their goal and budget.",
    options.instructions ? `Extra request from the user: ${options.instructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const plan = await structured(system, prompt, mealPlanSchema);
  const allowed = new Set(dates);
  return {
    summary: plan.summary,
    meals: plan.meals.filter((m) => allowed.has(m.plan_date)),
  };
}

export async function parseFoodLog(context: NutritionContext, message: string): Promise<FoodLogResult> {
  const system = [
    ...KENYAN_RULES,
    "Estimate calories and macros for Kenyan meals described in casual language or Swahili/Sheng.",
    "Return one entry per distinct food or meal. Be realistic about oil in chapati, chips, mandazi and pilau.",
    "reply: one or two warm sentences confirming what was logged and one short useful observation about their goal.",
    "",
    nutritionContextBlock(context),
  ].join("\n");
  return structured(system, `The user says they ate: "${message}". Log it.`, foodLogSchema);
}

export async function generateReplacementMeal(
  context: NutritionContext,
  meal: { title: string; meal_type: string; plan_date: string; time_slot: string | null },
  reason: string | null,
): Promise<PlannedMeal> {
  const system = [...KENYAN_RULES, "", nutritionContextBlock(context)].join("\n");
  const prompt = [
    `Replace this planned meal with a different Kenyan option: "${meal.title}" (${meal.meal_type} on ${meal.plan_date}).`,
    reason ? `Reason for swapping: ${reason}` : "The user simply wants something else.",
    `Keep similar calories and protein, stay within the budget, keep plan_date "${meal.plan_date}", meal_type "${meal.meal_type}" and time_slot "${meal.time_slot ?? "12:00"}".`,
  ].join("\n");
  return structured(system, prompt, plannedMealSchema);
}

export async function generateShoppingList(
  context: NutritionContext,
  meals: { title: string; components: unknown; plan_date: string }[],
): Promise<ShoppingListResult> {
  const system = [
    ...KENYAN_RULES,
    "Turn a meal plan into a Kenyan shopping list with market-style quantities (2kg unga, 3 bunches sukuma wiki, 1/2 kg omena) and approximate KSh costs.",
    "Combine duplicates into one line. Use category_slug from: staples, proteins, vegetables, legumes, fruits, dairy, fats, drinks.",
    "",
    nutritionContextBlock(context),
  ].join("\n");
  return structured(
    system,
    `Build one shopping list covering these planned meals: ${JSON.stringify(meals)}`,
    shoppingListSchema,
  );
}

export async function generateNutritionInsight(context: NutritionContext): Promise<string> {
  const system = [...KENYAN_RULES, "", nutritionContextBlock(context)].join("\n");
  const result = await generateText({
    model: gateway()(MODEL),
    system,
    prompt:
      "In 2-3 short sentences give me today's single most important food action, based on what I've already eaten, my training and my budget. Be specific about a Kenyan food and portion.",
  });
  return result.text.trim();
}
