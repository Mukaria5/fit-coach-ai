import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplets, Footprints, Moon, Salad, Dumbbell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, ErrorBlock, LoadingBlock } from "@/components/app-shell";
import { ProgressRing } from "@/components/progress-ring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  dailyScore,
  formatLitres,
  formatSleep,
  greeting,
  habitRatio,
  scoreLabel,
  targetsFromProfile,
} from "@/lib/score";
import { fetchProfile } from "@/services/auth";
import { addWater, fetchLog, logSleep, logWalk, saveLog, setWorkoutDone, toggleNutrition } from "@/services/habits";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Today — FitCoach AI" },
      {
        name: "description",
        content: "Your daily habit dashboard: water, walking, workout, sleep and nutrition in one score.",
      },
      { property: "og:title", content: "Today — FitCoach AI" },
      { property: "og:description", content: "Track five habits and see one honest daily score." },
    ],
  }),
  component: HomePage,
});

const nutritionItems = [
  { key: "nutrition_protein", label: "Protein with every meal" },
  { key: "nutrition_produce", label: "Fruit or vegetables" },
  { key: "nutrition_no_sugar", label: "No sugary drinks" },
  { key: "nutrition_no_late_snack", label: "No late-night snacking" },
] as const;

function HomePage() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const logQuery = useQuery({ queryKey: ["log", "today"], queryFn: () => fetchLog() });

  const [steps, setSteps] = useState("");
  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");
  const [sleepHours, setSleepHours] = useState("");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["log"] });
    await queryClient.invalidateQueries({ queryKey: ["logs"] });
  };

  const mutate = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: refresh,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  if (profileQuery.isPending || logQuery.isPending) {
    return (
      <AppShell title="Today">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (logQuery.isError) {
    return (
      <AppShell title="Today">
        <ErrorBlock message={(logQuery.error as Error).message} />
      </AppShell>
    );
  }

  const profile = profileQuery.data ?? null;
  const targets = targetsFromProfile(profile);
  const log = logQuery.data!;
  const score = dailyScore(log, targets);

  return (
    <AppShell title={greeting(profile?.name)} subtitle={scoreLabel(score)}>
      <section className="surface flex flex-col items-center gap-4 px-5 py-7">
        <ProgressRing value={score} caption="daily score" />
        <div className="grid w-full grid-cols-5 gap-2 text-center">
          {(
            [
              { key: "water", icon: Droplets },
              { key: "walking", icon: Footprints },
              { key: "workout", icon: Dumbbell },
              { key: "sleep", icon: Moon },
              { key: "nutrition", icon: Salad },
            ] as const
          ).map((item) => {
            const ratio = Math.round(habitRatio(item.key, log, targets) * 100);
            return (
              <div key={item.key} className="flex flex-col items-center gap-1.5">
                <item.icon className="size-4 text-primary" />
                <Progress value={ratio} className="h-1.5 w-full" />
                <span className="numeric text-[0.65rem] text-muted-foreground">{ratio}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <Card title="Water" value={`${formatLitres(log.water_ml)} of ${formatLitres(targets.water_target_ml)}`}>
        <div className="flex flex-wrap gap-2">
          {[250, 500, 750].map((ml) => (
            <Button key={ml} variant="outline" size="sm" onClick={() => mutate.mutate(() => addWater(ml))}>
              +{ml}ml
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutate.mutate(() => saveLog({ water_ml: 0 }))}
          >
            Reset
          </Button>
        </div>
      </Card>

      <Card
        title="Walking"
        value={`${log.steps.toLocaleString()} steps · ${log.walk_km}km · ${log.walk_minutes}min`}
      >
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="w-24"
            placeholder="steps"
            inputMode="numeric"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
          <Input
            className="w-20"
            placeholder="km"
            inputMode="decimal"
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />
          <Input
            className="w-20"
            placeholder="min"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              mutate.mutate(() =>
                logWalk({
                  ...(steps ? { steps: Number(steps) } : {}),
                  ...(km ? { walk_km: Number(km) } : {}),
                  ...(minutes ? { walk_minutes: Number(minutes) } : {}),
                }),
              );
              setSteps("");
              setKm("");
              setMinutes("");
            }}
          >
            Save
          </Button>
        </div>
      </Card>

      <Card title="Workout" value={log.workout_done ? "Completed today" : "Not done yet"}>
        <div className="flex items-center justify-between gap-3">
          <Switch
            checked={log.workout_done}
            onCheckedChange={(checked) => mutate.mutate(() => setWorkoutDone(checked))}
          />
          <Button asChild variant="outline" size="sm">
            <Link to="/workouts">Browse workouts</Link>
          </Button>
        </div>
      </Card>

      <Card
        title="Sleep"
        value={`${formatSleep(log.sleep_minutes)} of ${formatSleep(targets.sleep_target_min)}`}
      >
        <div className="flex items-end gap-2">
          <Input
            className="w-24"
            placeholder="hours"
            inputMode="decimal"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              const hours = Number(sleepHours);
              if (!Number.isFinite(hours) || hours <= 0) {
                toast.error("Enter hours slept");
                return;
              }
              mutate.mutate(() => logSleep(Math.round(hours * 60)));
              setSleepHours("");
            }}
          >
            Log sleep
          </Button>
        </div>
      </Card>

      <Card title="Nutrition" value={`${nutritionItems.filter((i) => log[i.key]).length} of 4 habits`}>
        <ul className="space-y-2.5">
          {nutritionItems.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
              <span>{item.label}</span>
              <Switch
                checked={log[item.key]}
                onCheckedChange={(checked) => mutate.mutate(() => toggleNutrition(item.key, checked))}
              />
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}

function Card({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface mt-3 px-5 py-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="numeric text-xs text-muted-foreground">{value}</p>
      </div>
      {children}
    </section>
  );
}
