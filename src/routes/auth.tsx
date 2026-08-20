import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/services/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "signin" ? ("signin" as const) : ("signup" as const),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — FitCoach AI" },
      {
        name: "description",
        content: "Create your FitCoach AI account or sign in to keep your habit streak going.",
      },
      { property: "og:title", content: "Sign in — FitCoach AI" },
      {
        property: "og:description",
        content: "Access your habit dashboard, AI coach and 30-day challenge.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
        toast.success("Account created — let's set up your plan.");
      } else {
        await signInWithEmail(email, password);
      }
      await navigate({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    }
  };

  const reset = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    try {
      await sendPasswordReset(email);
      toast.success("Password reset email sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset email");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-5">
        <Link to="/" className="font-display text-lg font-semibold tracking-tight">
          FitCoach <span className="text-primary">AI</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto w-full max-w-sm flex-1 px-5 pt-6">
        <h1 className="text-2xl font-semibold">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignUp ? "Two minutes to set up your daily plan." : "Pick up where your streak left off."}
        </p>

        <Button variant="outline" className="mt-6 w-full" onClick={google}>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {isSignUp ? (
            <div className="space-y-1.5">
              <Label htmlFor="name">First name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
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
            {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-sm">
          <button type="button" className="text-primary" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "I already have an account" : "Create a new account"}
          </button>
          {!isSignUp ? (
            <button type="button" className="text-muted-foreground" onClick={reset}>
              Forgot password?
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
