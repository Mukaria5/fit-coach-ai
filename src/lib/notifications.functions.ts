import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

/** Public VAPID key — safe to share with the browser. */
export const getVapidPublicKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ key: process.env["VAPID_PUBLIC_KEY"] ?? "" }));

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return data;
    const { data: created, error } = await supabase
      .from("notification_preferences")
      .insert({ user_id: userId, enabled: false })
      .select("*")
      .single();
    if (error) throw new Error("Could not load reminder settings");
    return created;
  });

const prefsSchema = z
  .object({
    enabled: z.boolean(),
    water_enabled: z.boolean(),
    workout_enabled: z.boolean(),
    meal_enabled: z.boolean(),
    streak_enabled: z.boolean(),
    daily_briefing_enabled: z.boolean(),
    evening_checkin_enabled: z.boolean(),
    weekly_review_enabled: z.boolean(),
    sleep_enabled: z.boolean(),
    nutrition_enabled: z.boolean(),
    daily_briefing_time: time,
    workout_time: time,
    breakfast_time: time,
    lunch_time: time,
    dinner_time: time,
    evening_checkin_time: time,
    sleep_time: time,
    weekly_review_time: time,
    quiet_hours_start: time,
    quiet_hours_end: time,
    water_interval_hours: z.number().int().min(1).max(6),
    weekly_review_dow: z.number().int().min(0).max(6),
    timezone: z.string().min(1).max(64),
  })
  .partial();

export const saveNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => prefsSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("notification_preferences")
      .upsert(
        Object.assign(
          { user_id: context.userId },
          Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
        ),
        { onConflict: "user_id" },
      );
    if (error) throw new Error("Could not save reminder settings");
    return { ok: true };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        endpoint: z.string().url().max(1000),
        p256dh: z.string().min(1).max(300),
        auth: z.string().min(1).max(100),
        userAgent: z.string().max(300).optional(),
        timezone: z.string().max(64).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
        is_active: true,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error("Could not save this device");
    await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: userId, enabled: true, ...(data.timezone ? { timezone: data.timezone } : {}) },
        { onConflict: "user_id" },
      );
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ endpoint: z.string().max(1000) }).parse(data))
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { deliver } = await import("@/lib/notifications/engine.server");
    const { testNotification } = await import("@/lib/notifications/templates");
    const sent = await deliver(
      context.supabase,
      context.userId,
      testNotification(),
      new Date().toISOString().slice(0, 10),
      false,
    );
    return { sent };
  });
