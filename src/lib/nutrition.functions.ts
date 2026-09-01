import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateMealPlan,
  generateNutritionInsight,
  generateReplacementMeal,
  generateShoppingList,
  isoPlus,
  loadNutritionContext,
  parseFoodLog,
} from "./nutrition.server";
import { todayISO } from "./score";

const MEAL_TYPES = ["breakfast", "lunch", "supper", "snack"] as const;

function normaliseMealType(value: string): string {
  const v = value.toLowerCase();
  if (v.startsWith("break")) return "breakfast";
  if (v.startsWith("lun")) return "lunch";
  if (v.startsWith("sup") || v.startsWith("din")) return "supper";
  if (MEAL_TYPES.includes(v as (typeof MEAL_TYPES)[number])) return v;
  return "snack";
}

const num = (value: unknown) => Math.max(0, Math.round(Number(value ?? 0) * 10) / 10);

/** AI-generate a daily or weekly Kenyan meal plan and persist it. */
export const createMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        days: z.number().int().min(1).max(7).default(1),
        startDate: z.string().optional(),
        instructions: z.string().max(500).nullable().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const startDate = data.startDate ?? todayISO();
    const nutritionContext = await loadNutritionContext(supabase, userId);

    const plan = await generateMealPlan(nutritionContext, {
      days: data.days,
      startDate,
      instructions: data.instructions ?? null,
    });

    const totalCost = plan.meals.reduce((sum, meal) => sum + num(meal.cost_ksh), 0);
    const endDate = isoPlus(data.days - 1, startDate);

    const { data: created, error } = await supabase
      .from("meal_plans")
      .insert({
        user_id: userId,
        title: data.days > 1 ? `${data.days}-day Kenyan plan` : "Today's Kenyan plan",
        plan_type: data.days > 1 ? "weekly" : "daily",
        start_date: startDate,
        end_date: endDate,
        budget_ksh: nutritionContext.prefs.daily_budget_ksh,
        total_cost_ksh: totalCost,
        summary: plan.summary,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const planId = (created as { id: string }).id;

    const rows = plan.meals.map((meal, index) => ({
      plan_id: planId,
      user_id: userId,
      plan_date: meal.plan_date,
      meal_type: normaliseMealType(meal.meal_type),
      time_slot: meal.time_slot,
      title: meal.title,
      components: meal.components,
      calories: num(meal.calories),
      protein_g: num(meal.protein_g),
      carbs_g: num(meal.carbs_g),
      fat_g: num(meal.fat_g),
      fiber_g: num(meal.fiber_g),
      cost_ksh: num(meal.cost_ksh),
      notes: meal.notes ?? null,
      sort_order: index,
    }));

    if (rows.length) {
      const { error: itemsError } = await supabase.from("meal_plan_items").insert(rows as never);
      if (itemsError) throw new Error(itemsError.message);
    }

    return { planId, summary: plan.summary, mealCount: rows.length, totalCost };
  });

/** Natural-language food logging: "I had ugali with sukuma and two eggs". */
export const logFoodFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ message: z.string().min(2).max(1000) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const nutritionContext = await loadNutritionContext(supabase, userId);
    const parsed = await parseFoodLog(nutritionContext, data.message);

    const rows = parsed.entries.map((entry) => ({
      user_id: userId,
      log_date: todayISO(),
      meal_type: normaliseMealType(entry.meal_type),
      description: entry.description,
      servings: num(entry.servings) || 1,
      calories: num(entry.calories),
      protein_g: num(entry.protein_g),
      carbs_g: num(entry.carbs_g),
      fat_g: num(entry.fat_g),
      fiber_g: num(entry.fiber_g),
      cost_ksh: num(entry.cost_ksh),
      source: "ai",
    }));

    if (rows.length) {
      const { error } = await supabase.from("nutrition_logs").insert(rows as never);
      if (error) throw new Error(error.message);

      // Keep the habit tracker in sync: something was eaten, so mark protein/produce sensibly.
      const text = data.message.toLowerCase();
      const patch: Record<string, boolean> = {};
      if (/egg|mayai|omena|kuku|nyama|fish|samaki|beans|ndengu|githeri|maziwa|mala|yoghurt/.test(text))
        patch["nutrition_protein"] = true;
      if (/sukuma|managu|terere|cabbage|kachumbari|spinach|fruit|banana|ndizi|mango|maembe|papai|orange/.test(text))
        patch["nutrition_produce"] = true;
      if (Object.keys(patch).length) {
        const { data: existing } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", userId)
          .eq("log_date", todayISO())
          .maybeSingle();
        const row = { ...(existing ?? {}), ...patch, user_id: userId, log_date: todayISO() } as Record<string, unknown>;
        delete row["id"];
        delete row["created_at"];
        delete row["updated_at"];
        await supabase.from("daily_logs").upsert(row as never, { onConflict: "user_id,log_date" });
      }
    }

    return { reply: parsed.reply, entries: rows.length };
  });

/** Swap one planned meal for a different Kenyan option. */
export const replacePlannedMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ itemId: z.string().uuid(), reason: z.string().max(300).nullable().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: item, error } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("id", data.itemId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) throw new Error("That meal is no longer in your plan");

    const current = item as unknown as {
      title: string;
      meal_type: string;
      plan_date: string;
      time_slot: string | null;
    };

    const nutritionContext = await loadNutritionContext(supabase, userId);
    const replacement = await generateReplacementMeal(nutritionContext, current, data.reason ?? null);

    const { error: updateError } = await supabase
      .from("meal_plan_items")
      .update({
        title: replacement.title,
        components: replacement.components,
        calories: num(replacement.calories),
        protein_g: num(replacement.protein_g),
        carbs_g: num(replacement.carbs_g),
        fat_g: num(replacement.fat_g),
        fiber_g: num(replacement.fiber_g),
        cost_ksh: num(replacement.cost_ksh),
        notes: replacement.notes ?? null,
        eaten: false,
      } as never)
      .eq("id", data.itemId)
      .eq("user_id", userId);
    if (updateError) throw new Error(updateError.message);

    return { title: replacement.title };
  });

/** Build a Kenyan shopping list from a plan. */
export const createShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ planId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: items, error } = await supabase
      .from("meal_plan_items")
      .select("title, components, plan_date")
      .eq("plan_id", data.planId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!items?.length) throw new Error("This plan has no meals yet");

    const nutritionContext = await loadNutritionContext(supabase, userId);
    const list = await generateShoppingList(
      nutritionContext,
      items as { title: string; components: unknown; plan_date: string }[],
    );

    const total = list.items.reduce((sum, item) => sum + num(item.estimated_cost_ksh), 0);

    const { data: created, error: listError } = await supabase
      .from("shopping_lists")
      .insert({
        user_id: userId,
        plan_id: data.planId,
        title: list.title || "Shopping list",
        total_cost_ksh: total,
      } as never)
      .select("id")
      .single();
    if (listError) throw new Error(listError.message);
    const listId = (created as { id: string }).id;

    const rows = list.items.map((item) => ({
      list_id: listId,
      user_id: userId,
      name: item.name,
      quantity: item.quantity,
      category_slug: item.category_slug ?? null,
      estimated_cost_ksh: num(item.estimated_cost_ksh),
    }));
    if (rows.length) {
      const { error: itemsError } = await supabase.from("shopping_list_items").insert(rows as never);
      if (itemsError) throw new Error(itemsError.message);
    }

    return { listId, itemCount: rows.length, total };
  });

/** One primary food recommendation for today. */
export const fetchNutritionInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const nutritionContext = await loadNutritionContext(context.supabase, context.userId);
    return { insight: await generateNutritionInsight(nutritionContext) };
  });

/** Server-computed daily targets so the UI and AI always agree. */
export const fetchNutritionTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const nutritionContext = await loadNutritionContext(context.supabase, context.userId);
    return {
      calories: nutritionContext.targets.calories,
      protein_g: nutritionContext.targets.protein_g,
      maintenance: nutritionContext.targets.maintenance,
      budget_ksh: nutritionContext.prefs.daily_budget_ksh,
    };
  });
