import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/notifications/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-dispatch-token");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: valid } = await supabaseAdmin.rpc("verify_dispatch_token" as never, {
          _token: token,
        } as never);
        if (valid !== true) return new Response("Unauthorized", { status: 401 });

        const { dispatchDueNotifications } = await import("@/lib/notifications/engine.server");
        const result = await dispatchDueNotifications(supabaseAdmin);
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
