import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Database, LogOut, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, ErrorBlock, LoadingBlock } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { clearDemoHistory, loadDemoHistory } from "@/lib/demo-data";
import { fetchProfile, signOut, updateProfile } from "@/services/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — FitCoach AI" },
      {
        name: "description",
        content:
          "Update your daily water, step and sleep targets, coach tone and notifications, or load 30 days of demo history.",
      },
      { property: "og:title", content: "Profile & Settings — FitCoach AI" },
      {
        property: "og:description",
        content: "Your targets, coach preferences and account settings.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const [water, setWater] = useState<string | null>(null);
  const [steps, setSteps] = useState<string | null>(null);
  const [sleep, setSleep] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  const demo = useMutation({
    mutationFn: () => loadDemoHistory(30),
    onSuccess: async (count) => {
      await queryClient.invalidateQueries();
      toast.success(`Loaded ${count} days of demo history`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Demo load failed"),
  });

  const clearDemo = useMutation({
    mutationFn: clearDemoHistory,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Demo history removed");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not clear"),
  });

  if (profileQuery.isPending) {
    return (
      <AppShell title="Profile">
        <LoadingBlock />
      </AppShell>
    );
  }

  const profile = profileQuery.data;
  if (profileQuery.isError || !profile) {
    return (
      <AppShell title="Profile">
        <ErrorBlock message="We couldn't load your profile." />
      </AppShell>
    );
  }

  return (
    <AppShell title="Profile" subtitle={profile.email ?? "Your settings"}>
      <div className="space-y-4">
        <section className="surface p-5">
          <h2 className="text-base font-semibold">Daily targets</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="water">Water (ml)</Label>
              <Input
                id="water"
                type="number"
                value={water ?? String(profile.water_target_ml)}
                onChange={(event) => setWater(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="steps">Steps</Label>
              <Input
                id="steps"
                type="number"
                value={steps ?? String(profile.steps_target)}
                onChange={(event) => setSteps(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sleep">Sleep (minutes)</Label>
              <Input
                id="sleep"
                type="number"
                value={sleep ?? String(profile.sleep_target_min)}
                onChange={(event) => setSleep(event.target.value)}
              />
            </div>
          </div>
          <Button
            className="mt-4"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                water_target_ml: Number(water ?? profile.water_target_ml),
                steps_target: Number(steps ?? profile.steps_target),
                sleep_target_min: Number(sleep ?? profile.sleep_target_min),
              })
            }
          >
            Save targets
          </Button>
        </section>

        <section className="surface p-5">
          <h2 className="text-base font-semibold">Coach & notifications</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tone">Coach tone</Label>
              <Input
                id="tone"
                defaultValue={profile.coach_tone}
                onBlur={(event) => {
                  if (event.target.value !== profile.coach_tone) {
                    save.mutate({ coach_tone: event.target.value });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                e.g. supportive, direct, drill-sergeant.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="notifications">Daily reminders</Label>
              <Switch
                id="notifications"
                checked={profile.notifications_enabled}
                onCheckedChange={(checked) => save.mutate({ notifications_enabled: checked })}
              />
            </div>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="text-base font-semibold">Demo data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Load 30 days of sample habit history to explore Progress and the AI coach. Demo rows are
            tagged separately and can be removed at any time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => demo.mutate()} disabled={demo.isPending}>
              <Database className="size-4" />
              {demo.isPending ? "Loading…" : "Load 30-day demo history"}
            </Button>
            <Button
              variant="outline"
              onClick={() => clearDemo.mutate()}
              disabled={clearDemo.isPending}
            >
              <Trash2 className="size-4" />
              Clear demo history
            </Button>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="text-base font-semibold">Account</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={async () => {
              await signOut();
              queryClient.clear();
              await navigate({ to: "/auth", search: { mode: "signin" } });
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
