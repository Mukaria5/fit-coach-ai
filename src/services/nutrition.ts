import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/score";
import {
  createMealPlan,
  createShoppingList,
  fetchNutritionInsight,
  fetchNutritionTargets,
  logFoodFromText,
  replacePlannedMeal,
} from "@/lib/nutrition.functions";
import type {
  Food,
  MealPlan,
  MealPlanItem,
  NutritionLog,
  NutritionPreferences,
  NutritionTargets,
  ShoppingList,
  ShoppingListItem,
} from "@/types";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

/* ------------------------------ reference ------------------------------ */

export async function searchFoods(query: string, limit = 30): Promise<Food[]> {
  let request = supabase
    .from("foods")
    .select("*")
    .order("name", { ascending: true })
    .limit(limit);
  if (query.trim()) request = request.ilike("name", `%${query.trim()}%`);
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as unknown as Food[];
}

export async function fetchFoodCategories(): Promise<{ slug: string; name: string }[]> {
  const { data, error } = await supabase
    .from("food_categories")
    .select("slug, name")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { slug: string; name: string }[];
}

/* ----------------------------- preferences ----------------------------- */

export const defaultNutritionPreferences: NutritionPreferences = {
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

export async function fetchNutritionPreferences(): Promise<NutritionPreferences> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("nutrition_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { ...defaultNutritionPreferences, ...((data ?? {}) as Partial<NutritionPreferences>) };
}

export async function saveNutritionPreferences(
  patch: Partial<NutritionPreferences>,
): Promise<NutritionPreferences> {
  const userId = await requireUserId();
  const current = await fetchNutritionPreferences();
  const merged = { ...current, ...patch, user_id: userId };
  const { data, error } = await supabase
    .from("nutrition_preferences")
    .upsert(merged as never, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as NutritionPreferences;
}

/* -------------------------------- plans -------------------------------- */

export async function fetchLatestPlan(): Promise<{ plan: MealPlan | null; items: MealPlanItem[] }> {
  const userId = await requireUserId();
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return { plan: null, items: [] };

  const typedPlan = plan as unknown as MealPlan;
  const { data: items, error: itemsError } = await supabase
    .from("meal_plan_items")
    .select("*")
    .eq("plan_id", typedPlan.id)
    .order("plan_date", { ascending: true })
    .order("sort_order", { ascending: true });
  if (itemsError) throw itemsError;

  return { plan: typedPlan, items: (items ?? []) as unknown as MealPlanItem[] };
}

export async function setMealEaten(itemId: string, eaten: boolean): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("meal_plan_items")
    .update({ eaten } as never)
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function generatePlan(days: number, instructions?: string | null) {
  return createMealPlan({ data: { days, instructions: instructions ?? null } });
}

export async function swapMeal(itemId: string, reason?: string | null) {
  return replacePlannedMeal({ data: { itemId, reason: reason ?? null } });
}

/* -------------------------------- logs --------------------------------- */

export async function fetchNutritionLogs(date = todayISO()): Promise<NutritionLog[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", date)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as NutritionLog[];
}

export async function fetchNutritionHistory(days = 7): Promise<NutritionLog[]> {
  const userId = await requireUserId();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", from.toISOString().slice(0, 10))
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as NutritionLog[];
}

export async function logFoodItem(input: {
  food: Food;
  servings: number;
  mealType: string;
}): Promise<void> {
  const userId = await requireUserId();
  const { food, servings, mealType } = input;
  const scale = (value: number | null) => Math.round(Number(value ?? 0) * servings * 10) / 10;
  const { error } = await supabase.from("nutrition_logs").insert({
    user_id: userId,
    log_date: todayISO(),
    meal_type: mealType,
    description: `${servings} × ${food.name} (${food.serving_label})`,
    food_slug: food.slug,
    servings,
    calories: scale(food.calories),
    protein_g: scale(food.protein_g),
    carbs_g: scale(food.carbs_g),
    fat_g: scale(food.fat_g),
    fiber_g: scale(food.fiber_g),
    cost_ksh: scale(food.price_ksh),
    source: "library",
  } as never);
  if (error) throw error;
}

export async function deleteNutritionLog(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("nutrition_logs").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function logFoodNaturalLanguage(message: string) {
  return logFoodFromText({ data: { message } });
}

/* --------------------------- shopping lists ---------------------------- */

export async function fetchLatestShoppingList(): Promise<{
  list: ShoppingList | null;
  items: ShoppingListItem[];
}> {
  const userId = await requireUserId();
  const { data: list, error } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!list) return { list: null, items: [] };

  const typed = list as unknown as ShoppingList;
  const { data: items, error: itemsError } = await supabase
    .from("shopping_list_items")
    .select("*")
    .eq("list_id", typed.id)
    .order("category_slug", { ascending: true })
    .order("name", { ascending: true });
  if (itemsError) throw itemsError;
  return { list: typed, items: (items ?? []) as unknown as ShoppingListItem[] };
}

export async function buildShoppingList(planId: string) {
  return createShoppingList({ data: { planId } });
}

export async function setItemBought(itemId: string, bought: boolean): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ bought } as never)
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) throw error;
}

/* ------------------------------- insights ------------------------------ */

export async function nutritionTargets(): Promise<NutritionTargets> {
  return fetchNutritionTargets();
}

export async function nutritionInsight(): Promise<string> {
  const result = await fetchNutritionInsight();
  return result.insight;
}

export function sumMacros(rows: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; cost_ksh?: number | null }[]) {
  return rows.reduce(
    (acc, row) => ({
      calories: acc.calories + Number(row.calories ?? 0),
      protein_g: acc.protein_g + Number(row.protein_g ?? 0),
      carbs_g: acc.carbs_g + Number(row.carbs_g ?? 0),
      fat_g: acc.fat_g + Number(row.fat_g ?? 0),
      fiber_g: acc.fiber_g + Number(row.fiber_g ?? 0),
      cost_ksh: acc.cost_ksh + Number(row.cost_ksh ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, cost_ksh: 0 },
  );
}

export const nutritionQuickPrompts = [
  "I had ugali with sukuma wiki and two eggs",
  "Chai na mandazi mbili for breakfast",
  "Githeri and avocado for lunch",
  "Nyama choma quarter kilo with kachumbari",
];
