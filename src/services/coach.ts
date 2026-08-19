import { fetchCoachHistory, generateWeeklySummary, sendCoachMessage } from "@/lib/coach.functions";
import { AI_API_URL, aiBackendConfigured, apiRequest } from "./api";
import { supabase } from "@/integrations/supabase/client";
import type { CoachMessage } from "@/types";

export interface CoachReply {
  conversationId: string;
  reply: string;
  applied: Record<string, number | boolean> | null;
  summary: string | null;
}

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Sends a message to the coach.
 * Prefers the external FastAPI service when `VITE_AI_API_URL` is set,
 * otherwise uses the built-in server function.
 */
export async function askCoach(
  message: string,
  conversationId: string | null,
): Promise<CoachReply> {
  if (aiBackendConfigured && AI_API_URL) {
    return apiRequest<CoachReply>("/coach/message", {
      method: "POST",
      body: { message, conversation_id: conversationId },
      accessToken: await accessToken(),
    });
  }

  const result = await sendCoachMessage({ data: { message, conversationId } });
  return {
    conversationId: result.conversationId,
    reply: result.reply,
    applied: result.applied,
    summary: result.summary,
  };
}

export async function loadCoachHistory(): Promise<{
  conversationId: string | null;
  messages: CoachMessage[];
}> {
  const result = await fetchCoachHistory();
  return {
    conversationId: result.conversationId,
    messages: result.messages.map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
      created_at: message.created_at,
    })),
  };
}

export async function weeklySummary(): Promise<string> {
  const result = await generateWeeklySummary();
  return result.summary;
}

export const coachQuickActions = [
  { label: "Start 7-min workout", prompt: "Give me a 7-minute workout I can do right now at home." },
  { label: "Log today's progress", prompt: "Here's my day: I drank 2 litres of water and walked 5,000 steps." },
  { label: "Ask about food", prompt: "What should I eat for dinner tonight to support my goal?" },
  { label: "View today's plan", prompt: "What does my plan look like for the rest of today?" },
];
