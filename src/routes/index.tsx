import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Droplets, Footprints, MessageCircle, Moon, Trophy } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitCoach AI — Habit tracking with an AI fitness coach" },
      {
        name: "description",
        content:
          "Track water, walking, workouts, sleep and nutrition, then chat with an AI coach that logs your day from plain language and keeps you accountable for 30 days.",
      },
      { property: "og:title", content: "FitCoach AI — Your daily accountability coach" },
      {
        property: "og:description",
        content:
          "Five daily habits, a real progress score, 30-day challenge and an AI coach that logs your day as you talk.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Droplets, title: "Water & hydration", detail: "One tap glasses, daily litre target." },
  { icon: Footprints, title: "Walking", detail: "Steps, distance and minutes moved." },
  { icon: Activity, title: "Workouts", detail: "5–20 minute sessions, no equipment needed." },
  { icon: Moon, title: "Sleep", detail: "Log hours and see your weekly rhythm." },
  { icon: MessageCircle, title: "AI coach", detail: "\"I drank 500ml and walked 5k\" — logged." },
  { icon: Trophy, title: "30-day challenge", detail: "Streaks, milestones and badges." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="font-display text-lg font-semibold tracking-tight">
          FitCoach <span className="text-primary">AI</span>
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-10 pb-16 text-center">
        <p className="text-sm font-medium text-primary">Accountability, not willpower</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-4xl leading-tight font-semibold sm:text-5xl">
          Five daily habits. One honest score. A coach that never forgets.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          FitCoach AI tracks hydration, walking, workouts, sleep and nutrition — and turns a
          sentence like “slept 7 hours, walked 6k steps” into logged progress.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ mode: "signin" }}>
              I already have an account
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-3 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="surface p-5">
            <feature.icon className="size-5 text-primary" />
            <h2 className="mt-3 text-base font-semibold">{feature.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{feature.detail}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        FitCoach AI gives general fitness guidance, not medical advice.
      </footer>
    </div>
  );
}
