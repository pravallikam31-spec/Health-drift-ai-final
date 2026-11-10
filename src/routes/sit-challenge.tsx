import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock3, HeartPulse, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowButton } from "@/components/ui/GlowButton";

export const Route = createFileRoute("/sit-challenge")({
  component: SitChallengePage,
});

const CHALLENGE_SECONDS = 180;
const MIN_REPETITION_INTERVAL_MS = 450;

function SitChallengePage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <SitChallenge />
      </ProfileCheck>
    </AuthGate>
  );
}

function SitChallenge() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(CHALLENGE_SECONDS);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [fatigue, setFatigue] = useState(5);
  const deadlineRef = useRef<number | null>(null);
  const lastCountedAtRef = useRef(0);

  useEffect(() => {
    if (!running) return;

    const updateTime = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);

      if (remaining === 0) {
        deadlineRef.current = null;
        setRunning(false);
        setFinished(true);
      }
    };

    updateTime();
    const timerId = window.setInterval(updateTime, 200);
    return () => window.clearInterval(timerId);
  }, [running]);

  const score = useMemo(() => {
    const base = Math.min(100, count * 3);
    return Math.max(0, Math.min(100, base - (fatigue - 1) * 2));
  }, [count, fatigue]);

  const performance =
    score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs Improvement";

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  function startChallenge() {
    if (running) return;
    if (seconds === 0) setSeconds(CHALLENGE_SECONDS);
    deadlineRef.current = Date.now() + (seconds === 0 ? CHALLENGE_SECONDS : seconds) * 1000;
    lastCountedAtRef.current = 0;
    setFinished(false);
    setRunning(true);
  }

  function countRepetition() {
    const now = Date.now();
    const deadline = deadlineRef.current;
    if (
      !running ||
      finished ||
      deadline === null ||
      now >= deadline ||
      now - lastCountedAtRef.current < MIN_REPETITION_INTERVAL_MS
    ) {
      return;
    }
    lastCountedAtRef.current = now;
    setCount((current) => current + 1);
  }

  function resetChallenge() {
    deadlineRef.current = null;
    lastCountedAtRef.current = 0;
    setRunning(false);
    setFinished(false);
    setSeconds(CHALLENGE_SECONDS);
    setCount(0);
    setFatigue(5);
  }

  const minutesElapsed = Math.floor((CHALLENGE_SECONDS - seconds) / 60);
  const elapsedSeconds = CHALLENGE_SECONDS - seconds;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10">
      <AuroraBackground />
      <div className="relative z-10 mx-auto max-w-4xl">
        <GlowButton
          variant="ghost"
          onClick={() => navigate({ to: "/activities" })}
          className="mb-6"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Activities
        </GlowButton>

        <Card className="glass-strong mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-violet-500/10">
          <CardHeader className="p-5 sm:p-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Cardiovascular Disease · Fitness challenge
            </p>
            <CardTitle className="font-display text-3xl text-aurora sm:text-5xl">
              3-Minute Sit-to-Stand Challenge
            </CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Stand up and sit down repeatedly for three minutes. Manually count each completed
              repetition and rate your fatigue at the end.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass-strong overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <CardContent className="p-5 sm:p-8">
            <div className="mb-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-center sm:p-6">
                <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock3 aria-hidden="true" className="h-4 w-4 text-cyan-300" />
                  Time remaining
                </div>
                <p
                  aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}
                  aria-live="polite"
                  className="font-mono-display text-5xl font-bold tabular-nums text-cyan-200 sm:text-6xl"
                >
                  {time}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-[width]"
                    style={{ width: `${(elapsedSeconds / CHALLENGE_SECONDS) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-center sm:p-6">
                <div className="mb-2 text-sm text-muted-foreground">Completed repetitions</div>
                <p
                  aria-live="polite"
                  className="font-display text-6xl font-bold tabular-nums text-violet-200 sm:text-7xl"
                >
                  {count}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Count manually with the button below.
                </p>
              </div>
            </div>

            {!finished ? (
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                {!running ? (
                  <Button
                    type="button"
                    onClick={startChallenge}
                    className="h-12 bg-pulse px-8 text-base font-semibold text-primary-foreground shadow-lg hover:opacity-90"
                  >
                    {seconds === CHALLENGE_SECONDS ? "Start Challenge" : "Resume Challenge"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={countRepetition}
                    className="h-14 bg-pulse px-10 text-lg font-bold text-primary-foreground shadow-lg hover:opacity-90 sm:min-w-56"
                  >
                    <Plus aria-hidden="true" className="h-5 w-5" />
                    Count repetition
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetChallenge}
                  className="h-12 border-white/15 bg-white/5 px-6 text-foreground hover:bg-white/10"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-5 sm:p-7">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                    <HeartPulse aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-2xl font-bold sm:text-3xl">
                    Challenge Completed
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    You completed {count} {count === 1 ? "repetition" : "repetitions"} in three
                    minutes.
                  </p>
                </div>

                <div className="mx-auto max-w-xl">
                  <label
                    htmlFor="fatigue-rating"
                    className="mb-2 flex items-center justify-between gap-3 text-sm font-medium"
                  >
                    <span>Rate your fatigue</span>
                    <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-violet-200">
                      {fatigue}/10
                    </span>
                  </label>
                  <input
                    id="fatigue-rating"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={fatigue}
                    onChange={(event) => setFatigue(Number(event.currentTarget.value))}
                    className="w-full accent-violet-400"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 · Least fatigue</span>
                    <span>10 · Most fatigue</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <ResultMetric label="Repetitions" value={String(count)} />
                  <ResultMetric label="Challenge score" value={`${score}/100`} />
                  <ResultMetric label="Performance" value={performance} />
                </div>
                <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
                  Educational fitness challenge only. This score is not a medical diagnosis or a
                  validated cardiovascular assessment.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={resetChallenge}
                    className="h-11 bg-pulse text-primary-foreground hover:opacity-90"
                  >
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: "/activities" })}
                    className="h-11 border-white/15 bg-white/5 text-foreground hover:bg-white/10"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Back to Activities
                  </Button>
                </div>
              </div>
            )}

            {!finished && (
              <p className="mx-auto mt-5 flex max-w-2xl items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
                <Minus aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Use a stable chair and stop if you feel unwell. Each button press adds one manually
                counted repetition; no camera or sensor detects movement.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-center">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
