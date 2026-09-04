import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell, ErrorBlock, LoadingBlock } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askCoach, coachQuickActions, loadCoachHistory } from "@/services/coach";
import { nutritionQuickPrompts } from "@/services/nutrition";
import type { CoachMessage } from "@/types";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI Coach — FitCoach AI" },
      {
        name: "description",
        content: "Chat with your AI fitness coach and log habits in plain language, like \"I walked 6k steps\".",
      },
      { property: "og:title", content: "AI Coach — FitCoach AI" },
      { property: "og:description", content: "Natural-language habit logging and daily coaching." },
    ],
  }),
  component: CoachPage,
});

function CoachPage() {
  const queryClient = useQueryClient();
  const historyQuery = useQuery({ queryKey: ["coach", "history"], queryFn: loadCoachHistory });
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!historyQuery.data) return;
    setMessages(historyQuery.data.messages);
    setConversationId(historyQuery.data.conversationId);
  }, [historyQuery.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async (text: string) => askCoach(text, conversationId),
    onMutate: (text) => {
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, role: "user", content: text },
      ]);
    },
    onSuccess: async (reply) => {
      setConversationId(reply.conversationId);
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: reply.reply },
      ]);
      if (reply.applied && Object.keys(reply.applied).length > 0) {
        toast.success("Logged from your message");
        await queryClient.invalidateQueries({ queryKey: ["log"] });
        await queryClient.invalidateQueries({ queryKey: ["logs"] });
        await queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Coach unavailable"),
  });

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    setInput("");
    send.mutate(trimmed);
  };

  return (
    <AppShell title="AI Coach" subtitle="Ask anything or log your day in a sentence">
      {historyQuery.isPending ? (
        <LoadingBlock label="Loading conversation…" />
      ) : historyQuery.isError ? (
        <ErrorBlock message={(historyQuery.error as Error).message} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {coachQuickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => submit(action.prompt)}
                disabled={send.isPending}
              >
                {action.label}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {nutritionQuickPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => submit(prompt)}
                disabled={send.isPending}
              >
                {prompt}
              </Button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {messages.length === 0 ? (
              <div className="surface px-5 py-8 text-center text-sm text-muted-foreground">
                Say hello, or try “I drank 500ml of water and slept 7 hours”.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "surface"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
            {send.isPending ? (
              <div className="surface max-w-[60%] px-4 py-3 text-sm text-muted-foreground">Coach is typing…</div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form
            className="sticky bottom-24 mt-4 flex gap-2 md:bottom-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit(input);
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Message your coach…"
            />
            <Button type="submit" disabled={send.isPending || !input.trim()}>
              Send
            </Button>
          </form>
        </>
      )}
    </AppShell>
  );
}
