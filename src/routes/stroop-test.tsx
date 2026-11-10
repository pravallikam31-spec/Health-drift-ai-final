import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Brain, Clock3, ShieldAlert, Sparkles, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowButton } from "@/components/ui/GlowButton";

export const Route = createFileRoute("/stroop-test")({
  component: StroopTestPage,
});

type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";
type ColorOption = { label: string; value: string };
type Question = { word: string; fontColor: ColorOption; options: ColorOption[] };

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];
const BASE_COLORS: ColorOption[] = [
  { label: "RED", value: "#ef4444" },
  { label: "BLUE", value: "#3b82f6" },
  { label: "GREEN", value: "#22c55e" },
  { label: "YELLOW", value: "#facc15" },
];
const EXTRA_COLORS: ColorOption[] = [
  { label: "PURPLE", value: "#a855f7" },
  { label: "PINK", value: "#ec4899" },
  { label: "ORANGE", value: "#f97316" },
  { label: "CYAN", value: "#06b6d4" },
];
const QUESTION_SECONDS: Record<Difficulty, number> = {
  Easy: 10,
  Medium: 7,
  Hard: 5,
  Expert: 4,
};
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const COOLDOWN_KEY = "stroop-test-last-played";
const DIFFICULTY_KEY = "stroopLevel";

function getColorPool(level: Difficulty) {
  const extraCount = level === "Medium" ? 2 : level === "Hard" ? 3 : level === "Expert" ? 4 : 0;
  return [...BASE_COLORS, ...EXTRA_COLORS.slice(0, extraCount)];
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function createQuestions(level: Difficulty): Question[] {
  const colors = getColorPool(level);
  return Array.from({ length: 10 }, () => ({
    word: colors[Math.floor(Math.random() * colors.length)].label,
    fontColor: colors[Math.floor(Math.random() * colors.length)],
    options: level === "Easy" ? colors : shuffle(colors),
  }));
}

function getNextDifficulty(level: Difficulty, accuracy: number): Difficulty {
  const currentIndex = DIFFICULTIES.indexOf(level);
  if (accuracy >= 80) return DIFFICULTIES[Math.min(currentIndex + 1, DIFFICULTIES.length - 1)];
  if (accuracy >= 50) return level;
  return DIFFICULTIES[Math.max(currentIndex - 1, 0)];
}

function formatRemaining(ms: number) {
  const totalMinutes = Math.ceil(ms / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${Math.max(1, minutes)}m`;
}

function StroopTestPage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <StroopTest />
      </ProfileCheck>
    </AuthGate>
  );
}

function StroopTest() {
  const navigate = useNavigate();
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const questionsRef = useRef<Question[]>([]);
  const questionIndexRef = useRef(0);
  const handledQuestionRef = useRef<number | null>(null);
  const correctCountRef = useRef(0);
  const deadlineRef = useRef(0);
  const [started, setStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    nextDifficulty: Difficulty;
  } | null>(null);

  useEffect(() => {
    setNow(Date.now());
    try {
      const savedDifficulty = window.localStorage.getItem(DIFFICULTY_KEY);
      if (savedDifficulty && DIFFICULTIES.includes(savedDifficulty as Difficulty)) {
        setDifficulty(savedDifficulty as Difficulty);
      }

      const lastPlayed = Number(window.localStorage.getItem(COOLDOWN_KEY));
      if (Number.isFinite(lastPlayed) && lastPlayed > 0) {
        const until = lastPlayed + COOLDOWN_MS;
        if (until > Date.now()) setCooldownUntil(until);
      }
    } catch {
      setStorageError(
        "This browser could not read saved test settings. Enable local storage to continue.",
      );
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (cooldownUntil === null) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  const completeTest = useCallback(
    (finalCorrect: number) => {
      const score = Math.round((finalCorrect / 10) * 100);
      const nextDifficulty = getNextDifficulty(difficulty, score);
      const completedAt = Date.now();
      const until = completedAt + COOLDOWN_MS;

      try {
        window.localStorage.setItem(COOLDOWN_KEY, String(completedAt));
        window.localStorage.setItem(DIFFICULTY_KEY, nextDifficulty);
      } catch {
        setStorageError(
          "The test is complete, but this browser could not save its cooldown. Keep local storage enabled; the cooldown may not persist after closing this page.",
        );
      }

      setCooldownUntil(until);
      setNow(completedAt);
      setDifficulty(nextDifficulty);
      setResult({ score, nextDifficulty });
      setStarted(false);
      deadlineRef.current = 0;
    },
    [difficulty],
  );

  const submitAnswer = useCallback(
    (choice: string | null) => {
      if (!started || result) return;

      const index = questionIndexRef.current;
      const question = questionsRef.current[index];
      if (!question || handledQuestionRef.current === index) return;

      handledQuestionRef.current = index;
      const selectedColor =
        deadlineRef.current > 0 && Date.now() >= deadlineRef.current ? null : choice;
      const nextCorrect =
        selectedColor === question.fontColor.label
          ? correctCountRef.current + 1
          : correctCountRef.current;
      correctCountRef.current = nextCorrect;
      setCorrectCount(nextCorrect);
      deadlineRef.current = 0;

      if (index === 9) {
        completeTest(nextCorrect);
        return;
      }

      questionIndexRef.current = index + 1;
      setQuestionIndex(index + 1);
    },
    [completeTest, result, started],
  );

  useEffect(() => {
    if (!started || result || !questions[questionIndex]) return;

    deadlineRef.current = Date.now() + QUESTION_SECONDS[difficulty] * 1_000;
    setQuestionTimeLeft(QUESTION_SECONDS[difficulty]);

    const intervalId = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1_000));
      setQuestionTimeLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(intervalId);
        submitAnswer(null);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [difficulty, questionIndex, questions, result, started, submitAnswer]);

  const isCoolingDown = cooldownUntil !== null && now < cooldownUntil;
  const currentQuestion = questions[questionIndex];

  function startTest() {
    if (!storageReady || storageError || isCoolingDown || started) return;
    const newQuestions = createQuestions(difficulty);
    questionsRef.current = newQuestions;
    questionIndexRef.current = 0;
    handledQuestionRef.current = null;
    correctCountRef.current = 0;
    setQuestions(newQuestions);
    setQuestionIndex(0);
    setCorrectCount(0);
    setQuestionTimeLeft(QUESTION_SECONDS[difficulty]);
    setResult(null);
    setStarted(true);
  }

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
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <Brain aria-hidden="true" className="h-4 w-4" />
              Attention &amp; focus · Color-word challenge
            </p>
            <CardTitle className="font-display text-3xl text-aurora sm:text-5xl">
              Stroop Color Test
            </CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Name the ink color of each word. Ignore what the word says.
            </CardDescription>
          </CardHeader>
        </Card>

        {!storageReady ? (
          <StatusCard title="Checking saved test settings">
            Loading your difficulty and cooldown status…
          </StatusCard>
        ) : storageError && !result ? (
          <StatusCard title="Local storage is unavailable">{storageError}</StatusCard>
        ) : result ? (
          <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
            <CardContent className="p-5 sm:p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <Sparkles aria-hidden="true" className="h-7 w-7" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  Test complete
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your score reflects this game run only; it is not a clinical assessment.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ResultMetric label="Correct answers" value={`${correctCount}/10`} />
                <ResultMetric label="Accuracy" value={`${result.score}%`} />
                <ResultMetric label="Next difficulty" value={result.nextDifficulty} />
              </div>
              <p className="mt-5 rounded-2xl border border-violet-300/15 bg-violet-300/5 p-4 text-center text-sm text-muted-foreground">
                You can play again after the three-day cooldown.
                {cooldownUntil !== null && (
                  <span className="mt-1 block font-semibold text-cyan-200">
                    Available in {formatRemaining(Math.max(0, cooldownUntil - now))}
                  </span>
                )}
              </p>
              {storageError && (
                <p role="alert" className="mt-4 text-center text-sm text-amber-200">
                  {storageError}
                </p>
              )}
              <div className="mt-6 flex justify-center">
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
            </CardContent>
          </Card>
        ) : isCoolingDown ? (
          <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
            <CardContent className="p-5 text-center sm:p-8">
              <Timer aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-cyan-200" />
              <h2 className="font-display text-2xl font-bold text-foreground">
                Replay cooldown active
              </h2>
              <p className="mt-3 text-muted-foreground">
                This browser has recorded a completed test. You can play again in{" "}
                <span className="font-semibold text-cyan-200">
                  {formatRemaining(cooldownUntil - now)}
                </span>
                .
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                The three-day cooldown is stored in this browser&apos;s local storage and is not
                linked to your account. Clearing browser storage can remove it.
              </p>
              <div className="mt-6">
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
            </CardContent>
          </Card>
        ) : started && currentQuestion ? (
          <Card className="glass-strong overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <CardContent className="p-5 sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-medium text-cyan-100">
                  Question {questionIndex + 1} of 10
                </span>
                <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-sm font-medium text-violet-100">
                  {difficulty}
                </span>
                <span
                  aria-live="polite"
                  className="flex items-center gap-2 font-mono text-lg font-semibold tabular-nums text-foreground"
                >
                  <Clock3 aria-hidden="true" className="h-4 w-4 text-cyan-200" />
                  {questionTimeLeft}s
                </span>
              </div>

              <div
                className="mb-7 grid min-h-44 place-items-center rounded-3xl border border-white/10 bg-black/10 px-4 py-8 sm:min-h-56"
                aria-live="polite"
              >
                <p
                  className="font-display text-5xl font-black tracking-[0.12em] sm:text-7xl"
                  style={{ color: currentQuestion.fontColor.value }}
                >
                  {currentQuestion.word}
                </p>
              </div>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Choose the <span className="font-semibold text-foreground">font color</span>, not
                the written word.
              </p>

              <div
                role="group"
                aria-label="Choose the displayed font color"
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                {currentQuestion.options.map((color) => (
                  <Button
                    key={color.label}
                    type="button"
                    variant="outline"
                    onClick={() => submitAnswer(color.label)}
                    className="h-12 border-white/15 bg-white/5 text-base font-bold tracking-wide hover:bg-white/10"
                  >
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color.value }}
                    />
                    <span style={{ color: color.value }}>{color.label}</span>
                  </Button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-muted-foreground">
                <span>
                  Correct: <span className="font-semibold text-foreground">{correctCount}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate({ to: "/activities" })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Exit test
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
            <CardContent className="p-5 sm:p-8">
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4">
                <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Important:</span> respond to the
                  color of the letters, not the word itself. Each run has 10 questions. A timeout
                  counts as an incorrect answer.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile
                  label="Current difficulty"
                  value={difficulty}
                  detail="Your level is saved in this browser and changes with your accuracy."
                />
                <InfoTile
                  label="Time per question"
                  value={`${QUESTION_SECONDS[difficulty]} seconds`}
                  detail="Higher difficulty adds colors and shortens the timer."
                />
              </div>

              <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>• 80% or higher advances difficulty; 50–79% keeps it; below 50% lowers it.</li>
                <li>• Completing a run starts a three-day replay cooldown in this browser.</li>
                <li>
                  • This is an educational attention game, not a clinical diagnosis or validated
                  measure of chronic stress or burnout.
                </li>
              </ul>

              {storageError && (
                <p role="alert" className="mt-4 text-sm text-amber-200">
                  {storageError}
                </p>
              )}

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={startTest}
                  disabled={!storageReady || Boolean(storageError)}
                  className="h-12 bg-pulse px-8 text-base font-semibold text-primary-foreground shadow-lg hover:opacity-90"
                >
                  <Brain aria-hidden="true" className="h-5 w-5" />
                  Start 10-question test
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/activities" })}
                  className="h-12 border-white/15 bg-white/5 px-6 text-foreground hover:bg-white/10"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Back to Activities
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function StatusCard({ title, children }: { title: string; children: string }) {
  return (
    <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
      <CardContent className="p-8 text-center">
        <p className="font-display text-xl font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-center">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
