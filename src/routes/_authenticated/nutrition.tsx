import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  ListPlus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Utensils,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, EmptyState, ErrorBlock, LoadingBlock } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/score";
import {
  buildShoppingList,
  deleteNutritionLog,
  fetchLatestPlan,
  fetchLatestShoppingList,
  fetchNutritionLogs,
  generatePlan,
  logFoodItem,
  logFoodNaturalLanguage,
  nutritionInsight,
  nutritionQuickPrompts,
  nutritionTargets,
  searchFoods,
  setItemBought,
  setMealEaten,
  sumMacros,
  swapMeal,
} from "@/services/nutrition";
import type { Food } from "@/types";

export const Route = createFileRoute("/_authenticated/nutrition")({
  head: () => ({
    meta: [
      { title: "Kenyan Nutrition Coach — FitCoach AI" },
      {
        name: "description",
        content:
          "Budget-aware Kenyan meal plans, natural-language food logging in Swahili or English, calorie and protein targets, plus an automatic shopping list.",
      },
      { property: "og:title", content: "Kenyan Nutrition Coach — FitCoach AI" },
      {
        property: "og:description",
        content:
          "Ugali, githeri, omena and nyama choma planned around your goal, budget and schedule.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NutritionPage,
});

type Tab = "today" | "plan" | "foods" | "shopping";

const tabs: { key: Tab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "plan", label: "Plan" },
  { key: "foods", label: "Foods" },
  { key: "shopping", label: "Shopping" },
];

function ksh(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `KSh ${Math.round(Number(value))}`;
}

function Bar({ value, target, label, unit }: { value: number; target: number; label: string; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {Math.round(value)}
          <span className="text-muted-foreground">
            {" / "}
            {Math.round(target)} {unit}
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NutritionPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("today");
  const [message, setMessage] = useState("");
  const [foodQuery, setFoodQuery] = useState("");
  const [planDays, setPlanDays] = useState(1);
  const [planNotes, setPlanNotes] = useState("");

  const targetsQuery = useQuery({ queryKey: ["nutrition-targets"], queryFn: nutritionTargets });
  const logsQuery = useQuery({ queryKey: ["nutrition-logs", todayISO()], queryFn: () => fetchNutritionLogs() });
  const planQuery = useQuery({ queryKey: ["meal-plan"], queryFn: fetchLatestPlan });
  const listQuery = useQuery({ queryKey: ["shopping-list"], queryFn: fetchLatestShoppingList });
  const foodsQuery = useQuery({
    queryKey: ["foods", foodQuery],
    queryFn: () => searchFoods(foodQuery),
    enabled: tab === "foods",
  });
  const insightQuery = useQuery({
    queryKey: ["nutrition-insight"],
    queryFn: nutritionInsight,
    enabled: false,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["meal-plan"] }),
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] }),
    ]);
  };

  const logText = useMutation({
    mutationFn: (text: string) => logFoodNaturalLanguage(text),
    onSuccess: async () => {
      setMessage("");
      await invalidate();
      toast.success("Logged");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not log that meal"),
  });

  const logFood = useMutation({
    mutationFn: (food: Food) => logFoodItem({ food, servings: 1, mealType: "snack" }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Added to today");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not add"),
  });

  const removeLog = useMutation({
    mutationFn: (id: string) => deleteNutritionLog(id),
    onSuccess: invalidate,
  });

  const makePlan = useMutation({
    mutationFn: () => generatePlan(planDays, planNotes || null),
    onSuccess: async () => {
      setPlanNotes("");
      await invalidate();
      setTab("plan");
      toast.success("Meal plan ready");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Plan generation failed"),
  });

  const swap = useMutation({
    mutationFn: (itemId: string) => swapMeal(itemId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Meal swapped");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not swap"),
  });

  const eaten = useMutation({
    mutationFn: (input: { id: string; eaten: boolean }) => setMealEaten(input.id, input.eaten),
    onSuccess: invalidate,
  });

  const makeList = useMutation({
    mutationFn: (planId: string) => buildShoppingList(planId),
    onSuccess: async () => {
      await invalidate();
      setTab("shopping");
      toast.success("Shopping list ready");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not build list"),
  });

  const bought = useMutation({
    mutationFn: (input: { id: string; bought: boolean }) => setItemBought(input.id, input.bought),
    onSuccess: invalidate,
  });

  const logs = logsQuery.data ?? [];
  const totals = useMemo(() => sumMacros(logs), [logs]);
  const targets = targetsQuery.data;

  const plan = planQuery.data?.plan ?? null;
  const planItems = planQuery.data?.items ?? [];
  const groupedPlan = useMemo(() => {
    const map = new Map<string, typeof planItems>();
    for (const item of planItems) {
      const bucket = map.get(item.plan_date) ?? [];
      bucket.push(item);
      map.set(item.plan_date, bucket);
    }
    return [...map.entries()];
  }, [planItems]);

  if (targetsQuery.isPending || logsQuery.isPending) {
    return (
      <AppShell title="Nutrition">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (targetsQuery.isError) {
    return (
      <AppShell title="Nutrition">
        <ErrorBlock message="We couldn't load your nutrition targets." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Nutrition"
      subtitle="Kenyan food, your goal, your budget"
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void insightQuery.refetch();
          }}
        >
          <Sparkles className="size-4" />
        </Button>
      }
    >
      <div className="space-y-4">
        <nav className="surface flex gap-1 p-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                tab === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {insightQuery.data ? (
          <section className="surface p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="size-4 text-primary" /> Coach insight
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {insightQuery.data}
            </p>
          </section>
        ) : null}

        {tab === "today" ? (
          <>
            <section className="surface space-y-4 p-5">
              <h2 className="text-base font-semibold">Today so far</h2>
              <Bar label="Calories" value={totals.calories} target={targets?.calories ?? 2000} unit="kcal" />
              <Bar label="Protein" value={totals.protein_g} target={targets?.protein_g ?? 100} unit="g" />
              <Bar label="Spend" value={totals.cost_ksh} target={targets?.budget_ksh ?? 400} unit="KSh" />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="size-3.5" />
                Maintenance is about {Math.round(targets?.maintenance ?? 0)} kcal per day.
              </p>
            </section>

            <section className="surface p-5">
              <h2 className="text-base font-semibold">Log a meal in your own words</h2>
              <Textarea
                className="mt-3"
                rows={2}
                placeholder="e.g. Ugali na sukuma wiki with two eggs"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={!message.trim() || logText.isPending}
                  onClick={() => logText.mutate(message.trim())}
                >
                  <Plus className="size-4" />
                  {logText.isPending ? "Logging…" : "Log it"}
                </Button>
                {nutritionQuickPrompts.slice(0, 2).map((prompt) => (
                  <Button key={prompt} variant="outline" size="sm" onClick={() => setMessage(prompt)}>
                    {prompt}
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="px-1 text-base font-semibold">Today&apos;s log</h2>
              {logs.length === 0 ? (
                <EmptyState
                  title="Nothing logged yet"
                  detail="Describe your meal above or add from the food library."
                />
              ) : (
                logs.map((log) => (
                  <article key={log.id} className="surface flex items-start gap-3 p-4">
                    <Utensils className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{log.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.meal_type} · {Math.round(log.calories)} kcal ·{" "}
                        {Math.round(log.protein_g)}g protein · {ksh(log.cost_ksh)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove log"
                      onClick={() => removeLog.mutate(log.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </article>
                ))
              )}
            </section>
          </>
        ) : null}

        {tab === "plan" ? (
          <>
            <section className="surface p-5">
              <h2 className="text-base font-semibold">Generate a Kenyan meal plan</h2>
              <div className="mt-3 flex gap-2">
                {[1, 3, 7].map((days) => (
                  <Button
                    key={days}
                    size="sm"
                    variant={planDays === days ? "default" : "outline"}
                    onClick={() => setPlanDays(days)}
                  >
                    {days === 1 ? "Today" : `${days} days`}
                  </Button>
                ))}
              </div>
              <Input
                className="mt-3"
                placeholder="Anything to consider? e.g. no beef, kibanda lunch"
                value={planNotes}
                onChange={(event) => setPlanNotes(event.target.value)}
              />
              <Button className="mt-3" disabled={makePlan.isPending} onClick={() => makePlan.mutate()}>
                <Sparkles className="size-4" />
                {makePlan.isPending ? "Planning…" : "Generate plan"}
              </Button>
            </section>

            {planQuery.isPending ? <LoadingBlock /> : null}

            {plan ? (
              <section className="surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{plan.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      From {plan.start_date} · est. {ksh(plan.total_cost_ksh)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => makeList.mutate(plan.id)} disabled={makeList.isPending}>
                    <ListPlus className="size-4" />
                    Shopping list
                  </Button>
                </div>
                {plan.summary ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{plan.summary}</p>
                ) : null}
              </section>
            ) : !planQuery.isPending ? (
              <EmptyState title="No plan yet" detail="Generate one above to see your day mapped out." />
            ) : null}

            {groupedPlan.map(([date, items]) => (
              <section key={date} className="space-y-2">
                <h3 className="px-1 text-sm font-semibold text-muted-foreground">{date}</h3>
                {items.map((item) => (
                  <article key={item.id} className="surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{item.meal_type}</Badge>
                          {item.time_slot ? (
                            <span className="text-xs text-muted-foreground">{item.time_slot}</span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(item.calories)} kcal · {Math.round(item.protein_g)}g protein ·{" "}
                          {ksh(item.cost_ksh)}
                        </p>
                        {item.components.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.components
                              .map((component) =>
                                component.quantity
                                  ? `${component.name} (${component.quantity})`
                                  : component.name,
                              )
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          size="icon"
                          variant={item.eaten ? "default" : "outline"}
                          aria-label="Mark eaten"
                          onClick={() => eaten.mutate({ id: item.id, eaten: !item.eaten })}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Swap meal"
                          disabled={swap.isPending}
                          onClick={() => swap.mutate(item.id)}
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </>
        ) : null}

        {tab === "foods" ? (
          <>
            <div className="surface flex items-center gap-2 px-4 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                className="w-full bg-transparent py-1.5 text-sm outline-none"
                placeholder="Search ugali, omena, githeri…"
                value={foodQuery}
                onChange={(event) => setFoodQuery(event.target.value)}
              />
            </div>
            {foodsQuery.isPending ? <LoadingBlock /> : null}
            {foodsQuery.data?.length === 0 ? (
              <EmptyState title="No foods matched" detail="Try a local name like sukuma or matoke." />
            ) : null}
            <div className="space-y-2">
              {(foodsQuery.data ?? []).map((food) => (
                <article key={food.id} className="surface flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{food.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {food.serving_label} · {Math.round(food.calories)} kcal ·{" "}
                      {Math.round(food.protein_g)}g protein · {ksh(food.price_ksh)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={`Log ${food.name}`}
                    onClick={() => logFood.mutate(food)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {tab === "shopping" ? (
          <>
            {listQuery.isPending ? <LoadingBlock /> : null}
            {listQuery.data?.list ? (
              <>
                <section className="surface p-5">
                  <h2 className="text-base font-semibold">{listQuery.data.list.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Estimated total {ksh(listQuery.data.list.total_cost_ksh)}
                  </p>
                </section>
                <div className="space-y-2">
                  {listQuery.data.items.map((item) => (
                    <article key={item.id} className="surface flex items-center gap-3 p-4">
                      <Button
                        size="icon"
                        variant={item.bought ? "default" : "outline"}
                        aria-label="Mark bought"
                        onClick={() => bought.mutate({ id: item.id, bought: !item.bought })}
                      >
                        <Check className="size-4" />
                      </Button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${item.bought ? "line-through opacity-60" : ""}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity ?? "—"} · {ksh(item.estimated_cost_ksh)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : !listQuery.isPending ? (
              <EmptyState
                title="No shopping list yet"
                detail="Generate a meal plan, then build a list from it."
              />
            ) : null}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
