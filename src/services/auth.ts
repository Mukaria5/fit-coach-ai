import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Profile } from "@/types";

export async function signUpWithEmail(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { name },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result.error) throw new Error(result.error.message ?? "Google sign-in failed");
  return result;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function fetchProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, email: user.email ?? null, name: user.email?.split("@")[0] ?? null })
      .select("*")
      .single();
    if (insertError) throw insertError;
    return created as unknown as Profile;
  }

  return data as unknown as Profile;
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("profiles")
    .update(patch as never)
    .eq("id", user.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Profile;
}
