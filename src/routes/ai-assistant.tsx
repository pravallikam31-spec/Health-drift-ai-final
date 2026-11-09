import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Bot,
  Droplets,
  Footprints,
  LoaderCircle,
  Moon,
  Pill,
  Send,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { useAuth } from "@/lib/auth-context";
import {
  loadAssistantHealthContext,
  type AssistantHealthContext,
} from "@/lib/assistant-health-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  welcome?: boolean;
};

const SUGGESTED_QUESTIONS = [
  "What should I improve today?",
  "How was my sleep this week?",
  "Am I drinking enough water?",
  "Summarize my weekly health report.",
];

const DOMAIN_ICONS: Record<string, typeof Activity> = {
  Sleep: Moon,
  Nutrition: Utensils,
  Hydration: Droplets,
  Activity: Footprints,
  Medication: Pill,
};

function newMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

function AssistantPage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <AssistantChat />
      </ProfileCheck>
    </AuthGate>
  );
}

function AssistantChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi. I can help you understand your recent wellness records and trends. I’ll point out when information is missing, and my guidance is not a medical diagnosis.",
      welcome: true,
    },
  ]);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [snapshot, setSnapshot] = React.useState<AssistantHealthContext | null>(null);
  const [snapshotLoading, setSnapshotLoading] = React.useState(true);
  const [snapshotError, setSnapshotError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const refreshSnapshot = React.useCallback(async () => {
    if (!user) return;
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const context = await loadAssistantHealthContext(user.uid, "What should I improve today?");
      setSnapshot(context);
    } catch (loadError) {
      console.error("Unable to load the assistant health snapshot.", loadError);
      setSnapshotError(
        "Your health snapshot could not be loaded. Check your connection and try again.",
      );
    } finally {
      setSnapshotLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const sendQuestion = React.useCallback(
    async (rawQuestion: string, retry = false) => {
      const question = rawQuestion.trim();
      if (!question || sending || !user) return;

      const previousMessages = retry ? messages.slice(0, -1) : messages;
      if (!retry) setMessages((current) => [...current, newMessage("user", question)]);
      setDraft("");
      setError(null);
      setSending(true);

      try {
        const [context, idToken] = await Promise.all([
          loadAssistantHealthContext(user.uid, question),
          user.getIdToken(),
        ]);
        const history = previousMessages
          .filter((message) => !message.welcome)
          .slice(-8)
          .map(({ role, content }) => ({ role, text: content }));
        const response = await fetch("/api/health-assistant", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ question, history, context }),
        });
        const result = (await response.json()) as {
          answer?: unknown;
          error?: unknown;
        };
        if (!response.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "The assistant could not answer right now. Please try again.",
          );
        }
        if (typeof result.answer !== "string" || !result.answer.trim()) {
          throw new Error("The assistant returned an empty response. Please try again.");
        }
        const answer = result.answer.trim();
        setMessages((current) => [...current, newMessage("assistant", answer)]);
      } catch (requestError) {
        console.error("The health assistant request failed.", requestError);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "The assistant is unavailable. Please try again.",
        );
      } finally {
        setSending(false);
      }
    },
    [messages, sending, user],
  );

  const clearConversation = () => {
    setMessages((current) => current.filter((message) => message.welcome));
    setError(null);
    setDraft("");
  };

  const domainCards = snapshot?.domains ?? [];
  const recommendations = snapshot?.recommendations ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-10 gap-2 rounded-xl px-3 text-muted-foreground hover:text-foreground"
            onClick={() => void navigate({ to: "/dashboard" })}
          >
            <ArrowLeft aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Private, account-scoped wellness context
          </div>
        </header>

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
            <Sparkles size={16} aria-hidden="true" />
            Personalized wellness
          </div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">AI Health Assistant</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Ask about your tracked sleep, food, hydration, activity, medication, or health trends.
            Answers use the signed-in account’s available records and call out missing information.
          </p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/30 text-cyan-200">
                  <Bot size={21} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-medium">Wellness assistant</h2>
                  <p className="text-xs text-muted-foreground">Grounded in your recorded data</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={clearConversation}
                disabled={sending || messages.length <= 1}
                aria-label="Clear conversation"
              >
                <Trash2 size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>

            <div
              className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[82%] ${
                      message.role === "user"
                        ? "rounded-br-md bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950"
                        : "rounded-bl-md border border-white/10 bg-white/[0.06] text-slate-100"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-sm text-cyan-200" role="status">
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                  Reviewing relevant records…
                </div>
              )}
              {error && (
                <div
                  className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100"
                  role="alert"
                >
                  <p>{error}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 px-2 text-rose-100 hover:bg-rose-500/10"
                    onClick={() => {
                      const lastUserMessage = [...messages]
                        .reverse()
                        .find((item) => item.role === "user");
                      if (lastUserMessage) void sendQuestion(lastUserMessage.content, true);
                    }}
                    disabled={sending || !messages.some((message) => message.role === "user")}
                  >
                    Try again
                  </Button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length <= 1 && (
              <div className="px-4 pb-3 sm:px-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Suggested questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      type="button"
                      key={question}
                      disabled={sending}
                      onClick={() => void sendQuestion(question)}
                      className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-left text-xs text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/10 disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              className="border-t border-white/10 p-3 sm:p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void sendQuestion(draft);
              }}
            >
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-cyan-300/40">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask a question about your wellness records…"
                  aria-label="Ask the AI Health Assistant"
                  rows={2}
                  maxLength={2000}
                  disabled={sending}
                  className="max-h-36 min-h-12 resize-y border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="mb-0.5 h-10 w-10 shrink-0 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 p-0 text-slate-950 hover:opacity-90"
                  aria-label="Send message"
                >
                  <Send size={17} aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-2 px-1 text-[11px] leading-4 text-muted-foreground">
                Wellness support only, not medical advice. Don’t use this assistant for emergencies.
              </p>
            </form>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-medium">Your recent snapshot</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    From your authenticated health records
                  </p>
                </div>
                {snapshotLoading && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin text-cyan-300"
                    aria-label="Loading snapshot"
                  />
                )}
              </div>

              {snapshotError ? (
                <div className="text-sm text-muted-foreground">
                  <p>{snapshotError}</p>
                  <Button
                    type="button"
                    variant="link"
                    className="mt-2 h-auto p-0 text-cyan-200"
                    onClick={() => void refreshSnapshot()}
                  >
                    Retry
                  </Button>
                </div>
              ) : snapshotLoading && !snapshot ? (
                <p className="text-sm text-muted-foreground">Loading your available records…</p>
              ) : domainCards.length ? (
                <div className="space-y-3">
                  {domainCards.map((domain) => {
                    const Icon = DOMAIN_ICONS[domain.domain] ?? Activity;
                    return (
                      <article
                        key={domain.domain}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <Icon size={15} className="text-cyan-200" aria-hidden="true" />
                            {domain.domain}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {domain.available ? (domain.trend ?? "Recorded") : "No data"}
                          </span>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {domain.explanation}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  No recent health snapshot is available yet. Start tracking a wellness area to
                  build your personal trends.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-violet-200" aria-hidden="true" />
                <h2 className="font-display font-medium">Personalized insights</h2>
              </div>
              {recommendations.length ? (
                <ul className="space-y-3">
                  {recommendations.slice(0, 3).map((recommendation, index) => (
                    <li
                      key={`${index}-${recommendation}`}
                      className="text-sm leading-5 text-slate-200/90"
                    >
                      {recommendation}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Insights will appear when enough relevant tracking data is available. Missing
                  records are not treated as zero.
                </p>
              )}
            </section>

            <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted-foreground">
              <Activity size={15} className="mt-0.5 shrink-0 text-cyan-200" aria-hidden="true" />
              The assistant does not diagnose conditions or recommend changing prescribed
              medication. Contact a healthcare professional for medical concerns.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/ai-assistant")({
  component: AssistantPage,
});
