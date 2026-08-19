import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  applyLogUpdates,
  buildSystemPrompt,
  generateCoachReply,
  loadCoachContext,
} from "./coach.server";

const chatInput = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(2000),
});

export const sendCoachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => chatInput.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;

    let conversationId = data.conversationId ?? null;
    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, title: data.message.slice(0, 60) } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = (created as { id: string }).id;
    }

    const { error: userMsgError } = await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      content: data.message,
    } as never);
    if (userMsgError) throw new Error(userMsgError.message);

    const { data: historyRows } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const history = ((historyRows ?? []) as { role: string; content: string }[]).map((row) => ({
      role: row.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: row.content,
    }));

    const coachContext = await loadCoachContext(supabase, userId);
    const result = await generateCoachReply(buildSystemPrompt(coachContext), history);
    const applied = await applyLogUpdates(supabase, userId, result.log_updates ?? null);

    const { data: assistantRow, error: assistantError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "assistant",
        content: result.reply,
      } as never)
      .select("id, created_at")
      .single();
    if (assistantError) throw new Error(assistantError.message);

    return {
      conversationId,
      messageId: (assistantRow as { id: string }).id,
      reply: result.reply,
      applied,
      summary: result.summary_of_changes ?? null,
    };
  });

export const fetchCoachHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conversation } = await context.supabase
      .from("ai_conversations")
      .select("id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) return { conversationId: null, messages: [] };
    const conversationId = (conversation as { id: string }).id;

    const { data: messages } = await context.supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    return {
      conversationId,
      messages: (messages ?? []) as { id: string; role: string; content: string; created_at: string }[],
    };
  });

export const generateWeeklySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const coachContext = await loadCoachContext(context.supabase, context.userId);
    const result = await generateCoachReply(buildSystemPrompt(coachContext), [
      {
        role: "user",
        content:
          "Write my weekly review in 3-4 sentences: what went well this week, the one habit that slipped, and one concrete fix for next week. Do not change any logs.",
      },
    ]);
    return { summary: result.reply };
  });
