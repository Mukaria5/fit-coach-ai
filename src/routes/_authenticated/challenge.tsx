import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Flame, Lock, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";

import { AppShell, ErrorBlock, LoadingBlock } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  currentDay,
  fetchChallenge,
  fetchOrStartProgress,
  milestones,
  resetChallenge,
  todaysTask,
  updateProgress,
} from "@/services/challenges";

export const Route = createFileRoute("/_authenticated/challenge")({
  head: () => ({
    meta: [
      { title: "30-Day Challenge — FitCoach AI" },
      {
        name: "description",
        content:
          "Follow the 30 Days Stronger challenge: a daily task, streak tracking and weekly milestone badges.",
      },
      { property: "og:title", content: "30-Day Challenge — FitCoach AI" },
      {
        property: "og:description",
        content: "One task a day for 30 days, with streaks and milestone badges.",
      },
    ],
  }),
  component: ChallengePage,
});

function ChallengePage() {
  const queryClient = useQueryClient();
  const challengeQuery = useQuery({ queryKey: ["challenge"], queryFn: fetchChallenge });
  const challenge = challengeQuery.data;

  const progressQuery = useQuery({
    queryKey: ["challenge-progress", challenge?.id],
    queryFn: () => fetchOrStartProgress(challenge!.id),
    enabled: Boolean(challenge?.id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["challenge-progress", challenge?.id] });

  const completeDay = useMutation({
    mutationFn: async () => {
      const progress = progressQuery.data!;
      const completed = progress.completed_days + 1;
      const streak = progress.current_streak + 1;
      return updateProgress(challenge!.id, {
        completed_days: completed,
        current_streak: streak,
        longest_streak: Math.max(progress.longest_streak, streak),
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Day marked complete");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  const restart = useMutation({
    mutationFn: () => resetChallenge(challenge!.id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Challenge restarted");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not restart"),
  });

  if (challengeQuery.isPending || progressQuery.isPending) {
    return (
      <AppShell title="Challenge">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (challengeQuery.isError || progressQuery.isError || !challenge || !progressQuery.data) {
    return (
      <AppShell title="Challenge">
        <ErrorBlock message="We couldn't load your challenge right now." />
      </AppShell>
    );
  }

  const progress = progressQuery.data;
  const day = currentDay(progress, challenge.total_days);
  const percent = Math.round((progress.completed_days / challenge.total_days) * 100);

  return (
    <AppShell title={challenge.title} subtitle={`Day ${day} of ${challenge.total_days}`}>
      <div className="space-y-4">
        <section className="surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Today&apos;s task</p>
              <p className="mt-1 text-base font-medium">{todaysTask(challenge, day)}</p>
            </div>
            <Trophy className="size-6 shrink-0 text-primary" />
          </div>
          <Progress value={percent} className="mt-4" />
          <p className="mt-2 text-xs text-muted-foreground">
            {progress.completed_days} of {challenge.total_days} days complete ({percent}%)
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => completeDay.mutate()}
              disabled={completeDay.isPending || progress.completed_days >= challenge.total_days}
            >
              <CheckCircle2 className="size-4" />
              Mark today complete
            </Button>
            <Button variant="outline" onClick={() => restart.mutate()} disabled={restart.isPending}>
              <RotateCcw className="size-4" />
              Restart
            </Button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="surface p-5">
            <Flame className="size-5 text-primary" />
            <p className="mt-2 text-2xl font-semibold">{progress.current_streak}</p>
            <p className="text-sm text-muted-foreground">Current streak</p>
          </div>
          <div className="surface p-5">
            <Trophy className="size-5 text-primary" />
            <p className="mt-2 text-2xl font-semibold">{progress.longest_streak}</p>
            <p className="text-sm text-muted-foreground">Longest streak</p>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="text-base font-semibold">Milestone badges</h2>
          <ul className="mt-3 space-y-3">
            {milestones.map((milestone) => {
              const unlocked = progress.completed_days >= milestone.unlockedDay;
              return (
                <li key={milestone.week} className="flex items-center gap-3">
                  <span
                    className={`flex size-9 items-center justify-center rounded-full ${
                      unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {unlocked ? <Trophy className="size-4" /> : <Lock className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      Week {milestone.week} · {milestone.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.detail} — unlocks at day {milestone.unlockedDay}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
