import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadingBlock } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchProfile, updateProfile } from "@/services/auth";
import type { Profile } from "@/types";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your plan — FitCoach AI" },
      {
        name: "description",
        content: "Answer a few questions so FitCoach AI can tailor your daily habit targets.",
      },
      { property: "og:title", content: "Set up your plan — FitCoach AI" },
      { property: "og:description", content: "Personalise your habit targets in two minutes." },
    ],
  }),
  component: Onboarding,
});

const goals = ["Lose weight", "Build strength", "More energy", "Better sleep"];
const activityLevels = ["Sedentary", "Lightly active", "Active", "Very active"];
const timeOptions = ["5-10", "15", "20-30", "30-60"];

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isPending } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    waist_cm: "",
    activity_level: activityLevels[1]!,
    primary_goal: goals[0]!,
    workout_minutes: timeOptions[1]!,
    gym_access: false,
    water_target_ml: 2500,
    steps_target: 8000,
    sleep_target_min: 450,
  });

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      name: profile.name ?? prev.name,
      age: profile.age ? String(profile.age) : prev.age,
      height_cm: profile.height_cm ? String(profile.height_cm) : prev.height_cm,
      weight_kg: profile.weight_kg ? String(profile.weight_kg) : prev.weight_kg,
      waist_cm: profile.waist_cm ? String(profile.waist_cm) : prev.waist_cm,
      activity_level: profile.activity_level ?? prev.activity_level,
      primary_goal: profile.primary_goal ?? prev.primary_goal,
      workout_minutes: profile.workout_minutes ?? prev.workout_minutes,
      gym_access: profile.gym_access ?? prev.gym_access,
      water_target_ml: profile.water_target_ml ?? prev.water_target_ml,
      steps_target: profile.steps_target ?? prev.steps_target,
      sleep_target_min: profile.sleep_target_min ?? prev.sleep_target_min,
    }));
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const patch: Partial<Profile> = {
        name: form.name || null,
        age: form.age ? Number(form.age) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
        activity_level: form.activity_level,
        primary_goal: form.primary_goal,
        workout_minutes: form.workout_minutes,
        gym_access: form.gym_access,
        water_target_ml: form.water_target_ml,
        steps_target: form.steps_target,
        sleep_target_min: form.sleep_target_min,
        onboarded: true,
      };
      return updateProfile(patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Your plan is ready");
      await navigate({ to: "/home" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <LoadingBlock label="Loading your profile…" />
      </div>
    );
  }

  const steps = [
    {
      title: "About you",
      body: (
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" className="col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Age">
            <Input
              type="number"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </Field>
          <Field label="Height (cm)">
            <Input
              type="number"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
            />
          </Field>
          <Field label="Weight (kg)">
            <Input
              type="number"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            />
          </Field>
          <Field label="Waist (cm)">
            <Input
              type="number"
              value={form.waist_cm}
              onChange={(e) => setForm({ ...form, waist_cm: e.target.value })}
            />
          </Field>
        </div>
      ),
    },
    {
      title: "Your goal",
      body: (
        <div className="space-y-5">
          <Choices
            label="Primary goal"
            options={goals}
            value={form.primary_goal}
            onChange={(primary_goal) => setForm({ ...form, primary_goal })}
          />
          <Choices
            label="Activity level"
            options={activityLevels}
            value={form.activity_level}
            onChange={(activity_level) => setForm({ ...form, activity_level })}
          />
        </div>
      ),
    },
    {
      title: "Training time",
      body: (
        <div className="space-y-5">
          <Choices
            label="Minutes per day"
            options={timeOptions}
            value={form.workout_minutes}
            onChange={(workout_minutes) => setForm({ ...form, workout_minutes })}
          />
          <button
            type="button"
            onClick={() => setForm({ ...form, gym_access: !form.gym_access })}
            className={`surface w-full px-4 py-3 text-left text-sm ${form.gym_access ? "ring-2 ring-primary" : ""}`}
          >
            I have gym or equipment access
          </button>
        </div>
      ),
    },
    {
      title: "Daily targets",
      body: (
        <div className="space-y-4">
          <Field label="Water target (ml)">
            <Input
              type="number"
              value={form.water_target_ml}
              onChange={(e) => setForm({ ...form, water_target_ml: Number(e.target.value) })}
            />
          </Field>
          <Field label="Steps target">
            <Input
              type="number"
              value={form.steps_target}
              onChange={(e) => setForm({ ...form, steps_target: Number(e.target.value) })}
            />
          </Field>
          <Field label="Sleep target (minutes)">
            <Input
              type="number"
              value={form.sleep_target_min}
              onChange={(e) => setForm({ ...form, sleep_target_min: Number(e.target.value) })}
            />
          </Field>
        </div>
      ),
    },
  ];

  const active = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 py-10">
      <p className="text-sm font-medium text-primary">
        Step {step + 1} of {steps.length}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{active.title}</h1>
      <div className="mt-6 flex gap-1.5">
        {steps.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <div className="mt-7">{active.body}</div>

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : null}
        <Button
          className="flex-1"
          disabled={save.isPending}
          onClick={() => (last ? save.mutate() : setStep(step + 1))}
        >
          {last ? (save.isPending ? "Saving…" : "Finish setup") : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`surface px-3 py-3 text-sm ${value === option ? "ring-2 ring-primary" : ""}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
