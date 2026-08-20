import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — FitCoach AI" },
      {
        name: "description",
        content: "Choose a new password for your FitCoach AI account and get back to your habits.",
      },
      { property: "og:title", content: "Set a new password — FitCoach AI" },
      {
        property: "og:description",
        content: "Finish resetting your FitCoach AI password.",
      },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      await navigate({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Open this page from the reset link in your email, then choose a new password.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
      <Link to="/auth" className="mt-5 text-center text-sm text-muted-foreground">
        Back to sign in
      </Link>
    </div>
  );
}
