import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
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
  validateSearch: (
    search: Record<string, unknown>,
  ): { mode?: "signin" | "signup" | undefined } => ({
    mode: search["mode"] === "signin" ? "signin" : search["mode"] === "signup" ? "signup" : undefined,
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
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const goToApp = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.user.id)
      .maybeSingle();
    await navigate({ to: profile?.onboarded ? "/home" : "/onboarding" });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSignUp) {
        const data = await signUpWithEmail(email, password, name);
        if (!data.session) {
          setAwaitingConfirm(true);
          setCooldown(45);
          return;
        }
        toast.success("Account created — let's set up your plan.");
        await navigate({ to: "/onboarding" });
        return;
      }
      await signInWithEmail(email, password);
      await goToApp();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setCooldown(45);
      toast.success("Confirmation email sent again");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not resend the confirmation email",
      );
    }
  };

  const confirmedCheck = async () => {
    if (!password) {
      setAwaitingConfirm(false);
      setIsSignUp(false);
      return;
    }
    setBusy(true);
    try {
      await signInWithEmail(email, password);
      await goToApp();
    } catch {
      toast.error("Not confirmed yet — open the link in your inbox, then try again.");
    } finally {
      setBusy(false);
    }
  };

  const maskedEmail = (() => {
    const [local = "", domain = ""] = email.split("@");
    const visible = local.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(local.length - 2, 2))}@${domain}`;
  })();

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

      {awaitingConfirm ? (
        <div className="mx-auto w-full max-w-sm flex-1 px-5 pt-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            ✉️
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{maskedEmail}</span>. You must click that link
            before you can sign in and start your plan.
          </p>

          <div className="mt-6 space-y-2.5">
            <Button asChild className="w-full">
              <a href="mailto:">Open email app</a>
            </Button>
            <Button className="w-full" variant="secondary" onClick={confirmedCheck} disabled={busy}>
              {busy ? "Checking…" : "I've confirmed my email"}
            </Button>
            <Button variant="outline" className="w-full" onClick={resend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend confirmation email"}
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Link expired or already used? Resend it above — older links stop working once a newer one is
            sent.
          </p>

          <button
            type="button"
            className="mt-4 text-sm text-primary"
            onClick={() => {
              setAwaitingConfirm(false);
              setIsSignUp(false);
            }}
          >
            Back to sign in
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
