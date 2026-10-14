import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  sendTestNotification,
} from "@/lib/notifications.functions";
import { CATEGORY_FLAG, CATEGORY_LABELS, type NotificationCategory } from "@/lib/notifications/types";
import { currentSubscription, disablePush, enablePush, pushSupport, type PushSupport } from "@/lib/pwa/push-client";

const NOT_NOW_KEY = "fitcoach-reminders-not-now";

function supportMessage(support: PushSupport): string | null {
  if (support === "preview") return "Reminders work in the published app, not inside the editor preview.";
  if (support === "needs-install")
    return "On iPhone, first add FitCoach AI to your Home Screen (Share → Add to Home Screen), then open it from there.";
  if (support === "unsupported") return "This browser doesn't support reminders.";
  return null;
}

function usePushState() {
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  useEffect(() => {
    const s = pushSupport();
    setSupport(s);
    void currentSubscription().then((sub) => setSubscribed(Boolean(sub)));
  }, []);
  return { support, subscribed, setSubscribed };
}

/** Friendly opt-in card shown on the dashboard until the user decides. */
export function EnableRemindersCard() {
  const { support, subscribed, setSubscribed } = usePushState();
  const [hidden, setHidden] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => setHidden(window.localStorage.getItem(NOT_NOW_KEY) === "1"), []);

  const enable = useMutation({
    mutationFn: enablePush,
    onSuccess: async () => {
      setSubscribed(true);
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Reminders are on");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not turn on reminders"),
  });

  if (hidden || subscribed !== false || support === "unsupported" || support === "preview") return null;

  return (
    <section className="surface flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-base font-semibold">Stay on track with gentle reminders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Water, workouts, meals and a morning briefing — only when it helps, never during quiet hours.
          </p>
          {supportMessage(support) ? (
            <p className="mt-2 text-xs text-muted-foreground">{supportMessage(support)}</p>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <Button disabled={support !== "supported" || enable.isPending} onClick={() => enable.mutate()}>
          {enable.isPending ? "Turning on…" : "Enable reminders"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            window.localStorage.setItem(NOT_NOW_KEY, "1");
            setHidden(true);
          }}
        >
          Not now
        </Button>
      </div>
    </section>
  );
}

type TimeKey =
  | "daily_briefing_time"
  | "workout_time"
  | "breakfast_time"
  | "lunch_time"
  | "dinner_time"
  | "evening_checkin_time"
  | "sleep_time"
  | "weekly_review_time"
  | "quiet_hours_start"
  | "quiet_hours_end";

const TIMES: [TimeKey, string][] = [
  ["daily_briefing_time", "Daily briefing"],
  ["workout_time", "Workout"],
  ["breakfast_time", "Breakfast"],
  ["lunch_time", "Lunch"],
  ["dinner_time", "Supper"],
  ["evening_checkin_time", "Evening check-in"],
  ["sleep_time", "Sleep"],
  ["weekly_review_time", "Weekly review"],
  ["quiet_hours_start", "Quiet hours from"],
  ["quiet_hours_end", "Quiet hours until"],
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Full reminder settings for the Profile page. */
export function ReminderSettingsSection() {
  const queryClient = useQueryClient();
  const { support, subscribed, setSubscribed } = usePushState();
  const prefsQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => getNotificationPreferences(),
  });

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => saveNotificationPreferences({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-preferences"] }),
    onError: () => toast.error("Could not save reminder settings"),
  });

  const toggleDevice = useMutation({
    mutationFn: async (on: boolean) => (on ? enablePush() : disablePush()),
    onSuccess: async (_r, on) => {
      setSubscribed(on);
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success(on ? "Reminders are on for this device" : "Reminders off for this device");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  const test = useMutation({
    mutationFn: () => sendTestNotification(),
    onSuccess: ({ sent }) =>
      sent > 0 ? toast.success("Test reminder sent") : toast.error("No device is set up for reminders yet"),
    onError: () => toast.error("Could not send a test reminder"),
  });

  const prefs = prefsQuery.data;
  const note = supportMessage(support);

  return (
    <section className="surface p-5">
      <h2 className="text-base font-semibold">Reminders</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Times use your timezone{prefs ? ` (${prefs.timezone})` : ""}. Reminders you've already done are skipped.
      </p>
      {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Label htmlFor="push-device" className="flex items-center gap-2">
          {subscribed ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          Reminders on this device
        </Label>
        <Switch
          id="push-device"
          checked={Boolean(subscribed)}
          disabled={support !== "supported" || toggleDevice.isPending}
          onCheckedChange={(on) => toggleDevice.mutate(on)}
        />
      </div>

      {!prefs ? null : (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Label htmlFor="push-all">All reminders</Label>
            <Switch id="push-all" checked={prefs.enabled} onCheckedChange={(v) => save.mutate({ enabled: v })} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((cat) => {
              const flag = CATEGORY_FLAG[cat];
              return (
                <div key={cat} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                  <Label htmlFor={`cat-${cat}`} className="text-sm">
                    {CATEGORY_LABELS[cat].emoji} {CATEGORY_LABELS[cat].label}
                  </Label>
                  <Switch
                    id={`cat-${cat}`}
                    checked={Boolean(prefs[flag as keyof typeof prefs])}
                    disabled={!prefs.enabled}
                    onCheckedChange={(v) => save.mutate({ [flag]: v })}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TIMES.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-xs">{label}</Label>
                <Input
                  id={key}
                  type="time"
                  defaultValue={String(prefs[key]).slice(0, 5)}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== String(prefs[key]).slice(0, 5))
                      save.mutate({ [key]: e.target.value });
                  }}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="water-every" className="text-xs">Water every (hours)</Label>
              <Input
                id="water-every"
                type="number"
                min={1}
                max={6}
                defaultValue={prefs.water_interval_hours}
                onBlur={(e) => {
                  const v = Math.min(6, Math.max(1, Number(e.target.value) || 2));
                  if (v !== prefs.water_interval_hours) save.mutate({ water_interval_hours: v });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-day" className="text-xs">Weekly review day</Label>
              <select
                id="review-day"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={prefs.weekly_review_dow}
                onChange={(e) => save.mutate({ weekly_review_dow: Number(e.target.value) })}
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" disabled={!subscribed || test.isPending} onClick={() => test.mutate()}>
              <Send className="size-4" />
              Send a test reminder
            </Button>
            <Button
              variant="ghost"
              onClick={() => save.mutate({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}
            >
              Use this device's timezone
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
