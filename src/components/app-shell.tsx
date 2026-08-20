import { Link } from "@tanstack/react-router";
import { Activity, Dumbbell, Home, MessageCircle, Trophy, User } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/progress", label: "Progress", icon: Activity },
  { to: "/coach", label: "Coach", icon: MessageCircle },
  { to: "/challenge", label: "Challenge", icon: Trophy },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col gap-2 border-r border-border bg-sidebar px-4 py-6 md:flex">
        <Link to="/home" className="mb-6 px-2 font-display text-lg font-semibold tracking-tight">
          FitCoach <span className="text-primary">AI</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-md">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {action}
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-5 pb-28 md:pb-10">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-between border-t border-border bg-background/95 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[0.65rem] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="surface flex flex-col items-center gap-1 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function ErrorBlock({ message }: { message?: string }) {
  return (
    <div className="surface px-6 py-8 text-center text-sm text-destructive">
      {message ?? "Something went wrong loading this screen."}
    </div>
  );
}
