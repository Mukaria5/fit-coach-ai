import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, EmptyState, ErrorBlock, LoadingBlock } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { computeStreaks, dailyScore, targetsFromProfile } from "@/lib/score";
import { fetchProfile } from "@/services/auth";
import { weeklySummary } from "@/services/coach";
import { fetchRecentLogs } from "@/services/habits";
import {
  addMeasurement,
  deltaSummary,
  habitCompletion,
  measurementTrend,
  fetchMeasurements,
} from "@/services/progress";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — FitCoach AI" },
      {
        name: "description",
        content: "See 30-day habit completion, streaks, weight and waist trends, plus an AI weekly summary.",
      },
      { property: "og:title", content: "Progress — FitCoach AI" },
      { property: "og:description", content: "Streaks, habit consistency and body trends over 30 days." },
    ],
  }),
  component: ProgressPage,
});

const habitLabels: Record<string, string> = {
  water: "Water",
  walking: "Walking",
  workout: "Workout",
  sleep: "Sleep",
  nutrition: "Nutrition",
};

function ProgressPage() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const logsQuery = useQuery({ queryKey: ["logs", 30], queryFn: () => fetchRecentLogs(30) });
  const measurementsQuery = useQuery({ queryKey: ["measurements"], queryFn: fetchMeasurements });

  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [summary, setSummary] = useState<string | null>(null);

  const addEntry = useMutation({
    mutationFn: async () =>
      addMeasurement({
        weight_kg: weight ? Number(weight) : null,
        waist_cm: waist ? Number(waist) : null,
      }),
    onSuccess: async () => {
      setWeight("");
      setWaist("");
      await queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast.success("Measurement saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  const askSummary = useMutation({
    mutationFn: weeklySummary,
    onSuccess: setSummary,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Summary failed"),
  });

  if (logsQuery.isPending || measurementsQuery.isPending) {
    return (
      <AppShell title="Progress">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (logsQuery.isError) {
    return (
      <AppShell title="Progress">
        <ErrorBlock message={(logsQuery.error as Error).message} />
      </AppShell>
    );
  }

  const targets = targetsFromProfile(profileQuery.data ?? null);
  const logs = logsQuery.data!;
  const streaks = computeStreaks(logs, targets);
  const completion = habitCompletion(logs, targets);
  const weightTrend = deltaSummary(measurementTrend(measurementsQuery.data ?? [], "weight_kg"));
  const waistTrend = deltaSummary(measurementTrend(measurementsQuery.data ?? [], "waist_cm"));
  const scores = logs.map((log) => ({ date: log.log_date, score: dailyScore(log, targets) }));
  const average = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;

  return (
    <AppShell title="Progress" subtitle="Last 30 days">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Current streak" value={`${streaks.current}d`} />
        <Stat label="Longest streak" value={`${streaks.longest}d`} />
        <Stat label="Avg score" value={`${average}%`} />
      </div>

      <section className="surface mt-3 px-5 py-4">
        <h2 className="text-sm font-semibold">Habit consistency</h2>
        <ul className="mt-3 space-y-3">
          {completion.map((item) => (
            <li key={item.key} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>{habitLabels[item.key]}</span>
                <span className="numeric text-muted-foreground">{item.percent}%</span>
              </div>
              <Progress value={item.percent} className="h-1.5" />
            </li>
          ))}
        </ul>
      </section>

      <section className="surface mt-3 px-5 py-4">
        <h2 className="text-sm font-semibold">Daily score</h2>
        {scores.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Log a day to start your chart.</p>
        ) : (
          <div className="mt-4 flex h-28 items-end gap-[3px]">
            {scores.map((point) => (
              <div
                key={point.date}
                title={`${point.date}: ${point.score}%`}
                className="flex-1 rounded-t bg-primary/80"
                style={{ height: `${Math.max(4, point.score)}%` }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="surface mt-3 px-5 py-4">
        <h2 className="text-sm font-semibold">Body measurements</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Trend label="Weight" unit="kg" trend={weightTrend} />
          <Trend label="Waist" unit="cm" trend={waistTrend} />
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Input
            className="w-24"
            placeholder="kg"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Input
            className="w-24"
            placeholder="waist cm"
            inputMode="decimal"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
          />
          <Button
            size="sm"
            disabled={addEntry.isPending || (!weight && !waist)}
            onClick={() => addEntry.mutate()}
          >
            Add entry
          </Button>
        </div>
      </section>

      <section className="surface mt-3 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Weekly AI summary</h2>
          <Button size="sm" variant="outline" disabled={askSummary.isPending} onClick={() => askSummary.mutate()}>
            {askSummary.isPending ? "Thinking…" : "Generate"}
          </Button>
        </div>
        {summary ? (
          <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">{summary}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Get a coach review of your last seven days.
          </p>
        )}
      </section>

      {logs.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No history yet" detail="Log today's habits or load demo history from Profile." />
        </div>
      ) : null}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface px-4 py-4 text-center">
      <p className="numeric font-display text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function Trend({
  label,
  unit,
  trend,
}: {
  label: string;
  unit: string;
  trend: { start: number | null; current: number | null; change: number | null };
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="numeric mt-1 text-lg font-semibold">
        {trend.current != null ? `${trend.current}${unit}` : "—"}
      </p>
      <p className="numeric text-xs text-muted-foreground">
        {trend.change != null ? `${trend.change > 0 ? "+" : ""}${trend.change}${unit} since start` : "No data"}
      </p>
    </div>
  );
}
