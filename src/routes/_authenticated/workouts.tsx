import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Dumbbell, Flame, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, EmptyState, ErrorBlock, LoadingBlock } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  completeWorkoutSession,
  fetchSessionCount,
  fetchWorkouts,
  workoutCategories,
} from "@/services/workouts";
import type { Workout } from "@/types";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({
    meta: [
      { title: "Workout Library — FitCoach AI" },
      {
        name: "description",
        content:
          "Browse 5 to 20 minute guided workouts by duration, body focus and equipment, then log a completed session.",
      },
      { property: "og:title", content: "Workout Library — FitCoach AI" },
      {
        property: "og:description",
        content: "Short, no-equipment friendly workouts you can finish today.",
      },
    ],
  }),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const queryClient = useQueryClient();
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: fetchWorkouts });
  const sessionsQuery = useQuery({ queryKey: ["workout-sessions"], queryFn: fetchSessionCount });

  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const complete = useMutation({
    mutationFn: (workout: Workout) => completeWorkoutSession(workout),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workout-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["log"] }),
      ]);
      toast.success("Workout logged");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not log"),
  });

  const filtered = useMemo(() => {
    const list = workoutsQuery.data ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((workout) => {
      const matchesCategory = !category || workout.categories.includes(category);
      const matchesTerm = !term || workout.title.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [workoutsQuery.data, category, search]);

  if (workoutsQuery.isPending) {
    return (
      <AppShell title="Workouts">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (workoutsQuery.isError) {
    return (
      <AppShell title="Workouts">
        <ErrorBlock message="We couldn't load the workout library." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Workouts"
      subtitle={`${sessionsQuery.data ?? 0} sessions completed`}
    >
      <div className="space-y-4">
        <Input
          placeholder="Search workouts…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Button
            size="sm"
            variant={category === null ? "default" : "outline"}
            onClick={() => setCategory(null)}
            className="shrink-0"
          >
            All
          </Button>
          {workoutCategories.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={category === item ? "default" : "outline"}
              onClick={() => setCategory(item)}
              className="shrink-0"
            >
              {item}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No workouts match"
            detail="Try a different duration or clear your search."
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((workout) => {
              const open = openId === workout.id;
              return (
                <li key={workout.id} className="surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold">{workout.title}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {workout.duration_min} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Flame className="size-3.5" />
                          {workout.calories} kcal
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Dumbbell className="size-3.5" />
                          {workout.equipment}
                        </span>
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {workout.difficulty}
                    </Badge>
                  </div>

                  {workout.description ? (
                    <p className="mt-3 text-sm text-muted-foreground">{workout.description}</p>
                  ) : null}

                  {open ? (
                    <ol className="mt-3 space-y-2 border-t border-border pt-3">
                      {workout.exercises.map((exercise, index) => (
                        <li key={`${workout.id}-${index}`} className="text-sm">
                          <span className="font-medium">{exercise.name}</span>
                          <span className="text-muted-foreground"> — {exercise.detail}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenId(open ? null : workout.id)}
                    >
                      {open ? "Hide exercises" : "View exercises"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => complete.mutate(workout)}
                      disabled={complete.isPending}
                    >
                      <Play className="size-4" />
                      Mark complete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
