import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Clock3,
  HeartPulse,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowButton } from "@/components/ui/GlowButton";

export const Route = createFileRoute("/hypertension-maze")({
  component: HypertensionMazePage,
});

const maze = [
  ["S", "", "🥗", "", "#", "", "💧", "", "", ""],
  ["#", "#", "#", "", "#", "", "#", "#", "#", ""],
  ["", "", "#", "", "", "", "#", "🚬", "", ""],
  ["", "#", "#", "#", "", "#", "#", "", "#", ""],
  ["", "", "", "", "", "", "", "", "#", ""],
  ["", "#", "#", "#", "#", "#", "#", "", "#", ""],
  ["", "", "🍔", "", "", "", "#", "", "", ""],
  ["", "#", "#", "#", "#", "", "#", "#", "#", ""],
  ["", "", "", "", "#", "", "", "", "", "E"],
  ["#", "#", "#", "", "#", "#", "#", "#", "", ""],
] as const;

type Position = { row: number; col: number };
type Direction = "up" | "down" | "left" | "right";
type Choice = { id: string; emoji: string; points: number; label: string; healthy: boolean };

const start: Position = { row: 0, col: 0 };
const choiceAt: Record<string, Choice> = {
  "0,2": { id: "salad", emoji: "🥗", points: 10, label: "Salad", healthy: true },
  "0,6": { id: "water", emoji: "💧", points: 5, label: "Water", healthy: true },
  "2,7": { id: "smoking", emoji: "🚬", points: -20, label: "Smoking", healthy: false },
  "6,2": { id: "fast-food", emoji: "🍔", points: -15, label: "Fast food", healthy: false },
};

function getRisk(score: number) {
  if (score >= 55) return "Low Hypertension Risk";
  if (score >= 30) return "Moderate Hypertension Risk";
  return "High Hypertension Risk";
}

function HypertensionMazePage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <HypertensionMaze />
      </ProfileCheck>
    </AuthGate>
  );
}

function HypertensionMaze() {
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Position>(start);
  const [score, setScore] = useState(50);
  const [timeLeft, setTimeLeft] = useState(300);
  const [healthyChoices, setHealthyChoices] = useState(0);
  const [riskyChoices, setRiskyChoices] = useState(0);
  const [collectedChoices, setCollectedChoices] = useState<Set<string>>(() => new Set());
  const [gameCompleted, setGameCompleted] = useState(false);
  const [finishedByTimeout, setFinishedByTimeout] = useState(false);

  const movePlayer = useCallback(
    (direction: Direction) => {
      if (gameCompleted) return;

      const offset: Record<Direction, Position> = {
        up: { row: -1, col: 0 },
        down: { row: 1, col: 0 },
        left: { row: 0, col: -1 },
        right: { row: 0, col: 1 },
      };
      const next = {
        row: player.row + offset[direction].row,
        col: player.col + offset[direction].col,
      };

      if (
        next.row < 0 ||
        next.row >= maze.length ||
        next.col < 0 ||
        next.col >= maze[0].length ||
        maze[next.row][next.col] === "#"
      ) {
        return;
      }

      const choiceKey = `${next.row},${next.col}`;
      const choice = choiceAt[choiceKey];
      if (choice && !collectedChoices.has(choice.id)) {
        setScore((current) => current + choice.points);
        if (choice.healthy) setHealthyChoices((current) => current + 1);
        else setRiskyChoices((current) => current + 1);
        setCollectedChoices((current) => new Set(current).add(choice.id));
      }

      setPlayer(next);
      if (maze[next.row][next.col] === "E") {
        setGameCompleted(true);
      }
    },
    [collectedChoices, gameCompleted, player],
  );

  useEffect(() => {
    if (gameCompleted) return;

    const timerId = window.setInterval(() => {
      setTimeLeft((remaining) => Math.max(remaining - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [gameCompleted]);

  useEffect(() => {
    if (timeLeft === 0 && !gameCompleted) {
      setGameCompleted(true);
      setFinishedByTimeout(true);
    }
  }, [gameCompleted, timeLeft]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const directionByKey: Record<string, Direction> = {
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
      };
      const direction = directionByKey[key];
      if (!direction) return;
      event.preventDefault();
      movePlayer(direction);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePlayer]);

  const progress = useMemo(
    () => Math.min(((healthyChoices + riskyChoices) / 4) * 100, 100),
    [healthyChoices, riskyChoices],
  );
  const formattedTime = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;
  const result = getRisk(score);

  function resetGame() {
    setPlayer(start);
    setScore(50);
    setTimeLeft(300);
    setHealthyChoices(0);
    setRiskyChoices(0);
    setCollectedChoices(new Set());
    setGameCompleted(false);
    setFinishedByTimeout(false);
  }

  const controls: { direction: Direction; label: string; icon: typeof ArrowUp }[] = [
    { direction: "up", label: "Move up", icon: ArrowUp },
    { direction: "left", label: "Move left", icon: ArrowLeft },
    { direction: "down", label: "Move down", icon: ArrowDown },
    { direction: "right", label: "Move right", icon: ArrowRight },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10">
      <AuroraBackground />
      <div className="relative z-10 mx-auto max-w-7xl">
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Hypertension · Healthy choices
                </p>
                <CardTitle className="font-display text-3xl text-aurora sm:text-5xl">
                  Hypertension Maze
                </CardTitle>
                <CardDescription className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Reach the heart exit while navigating healthy and risky lifestyle choices that
                  affect your blood pressure score.
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <Clock3 aria-hidden="true" className="h-5 w-5 text-cyan-300" />
                <span className="font-mono-display text-xl tabular-nums" aria-live="polite">
                  {formattedTime}
                </span>
                <span className="text-xs text-muted-foreground">left</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
            <CardHeader className="p-5 pb-3 sm:px-7 sm:pt-7">
              <CardTitle className="font-display text-2xl">Find the exit</CardTitle>
              <CardDescription>
                Use WASD or arrow keys, or the touch controls. Each lifestyle choice scores once.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 sm:px-7 sm:pb-7">
              <div
                role="grid"
                aria-label="Hypertension maze"
                className="mx-auto grid w-full max-w-[38rem] grid-cols-10 gap-1"
              >
                {maze.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const key = `${rowIndex},${colIndex}`;
                    const choice = choiceAt[key];
                    const collected = choice ? collectedChoices.has(choice.id) : false;
                    const isPlayer = player.row === rowIndex && player.col === colIndex;
                    const isWall = cell === "#";
                    const isExit = cell === "E";
                    const label = isPlayer
                      ? "Player"
                      : isWall
                        ? "Wall"
                        : isExit
                          ? "Exit"
                          : choice
                            ? `${choice.label}${collected ? ", collected" : ""}`
                            : cell === "S"
                              ? "Start"
                              : "Path";

                    return (
                      <div
                        key={key}
                        role="gridcell"
                        aria-label={label}
                        className={`grid aspect-square min-w-0 place-items-center rounded-md border text-base sm:rounded-lg sm:text-2xl ${
                          isWall
                            ? "border-white/5 bg-slate-950/90"
                            : isExit
                              ? "border-violet-300/30 bg-violet-400/15"
                              : choice
                                ? choice.healthy
                                  ? "border-emerald-300/20 bg-emerald-400/10"
                                  : "border-rose-300/20 bg-rose-400/10"
                                : "border-white/10 bg-white/[0.04]"
                        } ${collected ? "opacity-50" : ""}`}
                      >
                        {isPlayer ? (
                          <span aria-label="You are here">🏃</span>
                        ) : isExit ? (
                          "❤️"
                        ) : cell === "S" ? (
                          "🟢"
                        ) : choice ? (
                          collected ? (
                            <Check
                              aria-label={`${choice.label} collected`}
                              className="h-4 w-4 text-emerald-200 sm:h-5 sm:w-5"
                            />
                          ) : (
                            choice.emoji
                          )
                        ) : null}
                      </div>
                    );
                  }),
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/5 p-2 text-emerald-200">
                  🥗 Water / salad
                  <span className="mt-1 block">+5 / +10</span>
                </div>
                <div className="rounded-xl border border-rose-300/20 bg-rose-400/5 p-2 text-rose-200">
                  🍔 Fast food
                  <span className="mt-1 block">−15</span>
                </div>
                <div className="rounded-xl border border-rose-300/20 bg-rose-400/5 p-2 text-rose-200">
                  🚬 Smoking
                  <span className="mt-1 block">−20</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
              <CardHeader className="p-5 pb-3 sm:px-6 sm:pt-6">
                <CardTitle className="font-display text-2xl">Activity score</CardTitle>
                <CardDescription>Starting score: 50 points</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-1 sm:px-6 sm:pb-6">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HeartPulse className="h-4 w-4 text-rose-300" /> Score
                  </span>
                  <strong className="text-2xl tabular-nums">{score}</strong>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/5 p-3">
                    <p className="text-xs text-emerald-200">Healthy choices</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{healthyChoices}</p>
                  </div>
                  <div className="rounded-xl border border-rose-300/20 bg-rose-400/5 p-3">
                    <p className="text-xs text-rose-200">Risky choices</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{riskyChoices}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                    <span>Choices explored</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-label="Lifestyle choices explored"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {controls.map(({ direction, label, icon: Icon }) => (
                    <Button
                      key={direction}
                      type="button"
                      aria-label={label}
                      title={label}
                      variant="outline"
                      disabled={gameCompleted}
                      onClick={() => movePlayer(direction)}
                      className={`h-12 border-white/15 bg-white/5 text-foreground hover:bg-white/10 ${
                        direction === "up" || direction === "down" ? "col-start-2" : ""
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </Button>
                  ))}
                </div>

                {gameCompleted ? (
                  <div
                    aria-live="polite"
                    className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      {finishedByTimeout ? "Time is up" : "Maze complete"}
                    </p>
                    <h3 className="mt-2 font-display text-xl">{result}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Final score: {score}. This activity is educational and is not a medical
                      diagnosis.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Choices can only be collected once. Reach the heart exit before the timer ends.
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetGame}
                  className="w-full border-white/15 bg-white/5 text-foreground hover:bg-white/10"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Reset Maze
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
