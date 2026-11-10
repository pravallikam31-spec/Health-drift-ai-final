import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock3, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowButton } from "@/components/ui/GlowButton";

export const Route = createFileRoute("/nutrition-sudoku")({
  component: NutritionSudokuPage,
});

type GiLevel = "Low" | "Medium" | "High";
type Food = {
  id: string;
  emoji: string;
  name: string;
  gi: GiLevel;
};
type AttemptResult = {
  score: number;
  accuracy: number;
  low: number;
  medium: number;
  high: number;
  risk: string;
};
type Attempt = AttemptResult & { number: number };

const foods: Food[] = [
  { id: "apple", emoji: "🍏", name: "Apple", gi: "Low" },
  { id: "oats", emoji: "🥣", name: "Oats", gi: "Low" },
  { id: "carrot", emoji: "🥕", name: "Carrot", gi: "Low" },
  { id: "corn", emoji: "🌽", name: "Corn", gi: "Medium" },
  { id: "sweet-potato", emoji: "🍠", name: "Sweet Potato", gi: "Medium" },
  { id: "watermelon", emoji: "🍉", name: "Watermelon", gi: "Medium" },
  { id: "white-bread", emoji: "🍞", name: "White Bread", gi: "High" },
  { id: "white-rice", emoji: "🍚", name: "White Rice", gi: "High" },
  { id: "donut", emoji: "🍩", name: "Donut", gi: "High" },
];

const giStyles: Record<GiLevel, string> = {
  Low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  Medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  High: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

function evaluateGrid(grid: (Food | null)[]): AttemptResult {
  const low = grid.filter((food) => food?.gi === "Low").length;
  const medium = grid.filter((food) => food?.gi === "Medium").length;
  const high = grid.filter((food) => food?.gi === "High").length;
  const score = grid.filter(Boolean).length;

  return {
    score,
    accuracy: Math.round((score / foods.length) * 100),
    low,
    medium,
    high,
    risk:
      low >= 3 ? "Low Diabetes Risk" : low >= 2 ? "Moderate Diabetes Risk" : "High Diabetes Risk",
  };
}

function NutritionSudokuPage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <NutritionSudoku />
      </ProfileCheck>
    </AuthGate>
  );
}

function NutritionSudoku() {
  const navigate = useNavigate();
  const [grid, setGrid] = useState<(Food | null)[]>(() => Array(foods.length).fill(null));
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);

  const resultForCurrentGrid = useCallback((currentGrid: (Food | null)[]) => {
    const attempt = evaluateGrid(currentGrid);
    setResult(attempt);
    setHistory((previous) => [...previous, { ...attempt, number: previous.length + 1 }]);
    setSelectedFoodId(null);
  }, []);

  useEffect(() => {
    if (result || timeLeft <= 0) return;

    const timerId = window.setTimeout(() => {
      setTimeLeft((remaining) => Math.max(0, remaining - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [result, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !result) {
      resultForCurrentGrid(grid);
    }
  }, [grid, result, resultForCurrentGrid, timeLeft]);

  const usedFoodIds = useMemo(
    () => new Set(grid.flatMap((food) => (food ? [food.id] : []))),
    [grid],
  );
  const selectedFood = foods.find((food) => food.id === selectedFoodId) ?? null;
  const filledCount = grid.filter(Boolean).length;
  const lowCount = grid.filter((food) => food?.gi === "Low").length;
  const mediumCount = grid.filter((food) => food?.gi === "Medium").length;
  const highCount = grid.filter((food) => food?.gi === "High").length;

  function placeFood(index: number, food: Food) {
    if (result) return;
    setGrid((current) => {
      const previousIndex = current.findIndex((placed) => placed?.id === food.id);
      const updated = [...current];
      if (previousIndex >= 0) updated[previousIndex] = null;
      updated[index] = food;
      return updated;
    });
    setSelectedFoodId(null);
  }

  function handleCellClick(index: number) {
    if (result) return;
    if (grid[index]) {
      setGrid((current) => current.map((food, cellIndex) => (cellIndex === index ? null : food)));
      return;
    }
    if (selectedFood) placeFood(index, selectedFood);
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>, index: number) {
    event.preventDefault();
    const food = foods.find((item) => item.id === event.dataTransfer.getData("text/plain"));
    if (food) placeFood(index, food);
  }

  function resetBoard() {
    setGrid(Array(foods.length).fill(null));
    setSelectedFoodId(null);
    setTimeLeft(300);
    setResult(null);
  }

  const formattedTime = `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
    timeLeft % 60,
  ).padStart(2, "0")}`;

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

        <Card className="glass-strong mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-violet-500/10">
          <CardHeader className="p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Type 2 Diabetes · Nutrition
                </p>
                <CardTitle className="font-display text-3xl text-aurora sm:text-5xl">
                  Nutrition Sudoku
                </CardTitle>
                <CardDescription className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Arrange foods according to their Glycemic Index (GI) and learn how dietary habits
                  influence Type 2 Diabetes risk.
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

        <section aria-label="Glycemic index guide" className="mb-6 grid gap-3 sm:grid-cols-3">
          {(["Low", "Medium", "High"] as const).map((level) => (
            <Card key={level} className={`rounded-2xl border ${giStyles[level]} bg-card/60`}>
              <CardContent className="p-4 sm:p-5">
                <h2 className="font-display text-lg font-semibold">{level} GI</h2>
                <p className="mt-1 text-sm opacity-80">
                  {level === "Low"
                    ? "0–55 · Healthy"
                    : level === "Medium"
                      ? "56–69 · Moderate"
                      : "70+ · Risky"}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
            <CardHeader className="p-5 pb-3 sm:px-7 sm:pt-7">
              <CardTitle className="font-display text-2xl">Sudoku Grid</CardTitle>
              <CardDescription>
                {selectedFood
                  ? `Selected ${selectedFood.name}. Choose an empty cell.`
                  : "Drag a food into a cell, or select a food and tap a cell. Tap a filled cell to remove it."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 sm:px-7 sm:pb-7">
              <div className="mx-auto grid w-full max-w-[34rem] grid-cols-3 gap-2 sm:gap-3">
                {grid.map((food, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={
                      food
                        ? `Cell ${index + 1}: ${food.name}. Activate to remove.`
                        : selectedFood
                          ? `Place ${selectedFood.name} in cell ${index + 1}`
                          : `Empty cell ${index + 1}`
                    }
                    onClick={() => handleCellClick(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, index)}
                    disabled={Boolean(result)}
                    className={`aspect-square min-h-0 rounded-xl border text-3xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:rounded-2xl sm:text-5xl ${
                      food
                        ? "border-cyan-300/30 bg-cyan-400/10 hover:bg-cyan-400/20"
                        : "border-dashed border-white/20 bg-black/10 hover:border-cyan-300/50 hover:bg-cyan-400/5"
                    } ${result ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {food ? (
                      <span className="flex h-full flex-col items-center justify-center gap-1">
                        <span>{food.emoji}</span>
                        <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                          {food.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">+</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  Foods placed: <strong className="text-foreground">{filledCount}/9</strong>
                </span>
                <span>{Math.round((filledCount / foods.length) * 100)}% filled</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-[width]"
                  style={{ width: `${(filledCount / foods.length) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
              <CardHeader className="p-5 pb-3 sm:px-6 sm:pt-6">
                <CardTitle className="font-display text-2xl">Food Items</CardTitle>
                <CardDescription>
                  {selectedFood
                    ? "Choose an empty grid cell to place it."
                    : "Select or drag foods into the grid."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 p-5 pt-2 sm:grid-cols-2 sm:p-6 sm:pt-2">
                {foods.map((food) => {
                  const isUsed = usedFoodIds.has(food.id);
                  const isSelected = selectedFoodId === food.id;

                  return (
                    <button
                      key={food.id}
                      type="button"
                      draggable={!result && !isUsed}
                      disabled={Boolean(result) || isUsed}
                      onClick={() => setSelectedFoodId(isSelected ? null : food.id)}
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", food.id)}
                      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                        isUsed
                          ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
                          : isSelected
                            ? "border-cyan-300/60 bg-cyan-400/15 ring-1 ring-cyan-300/30"
                            : "cursor-pointer border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="text-2xl" aria-hidden="true">
                        {food.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {food.name}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${giStyles[food.gi]}`}
                      >
                        {food.gi}
                      </span>
                      {isUsed && <Check aria-label="Placed" className="h-4 w-4 text-emerald-300" />}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="glass-strong rounded-3xl border border-white/10 bg-white/[0.03]">
              <CardHeader className="p-5 pb-3 sm:px-6 sm:pt-6">
                <CardTitle className="font-display text-xl">GI Food Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 p-5 pt-1 sm:px-6 sm:pb-6">
                {[
                  { level: "Low", count: lowCount },
                  { level: "Medium", count: mediumCount },
                  { level: "High", count: highCount },
                ].map(({ level, count }) => (
                  <div
                    key={level}
                    className={`rounded-xl border p-3 text-center ${giStyles[level as GiLevel]}`}
                  >
                    <div className="text-2xl font-bold tabular-nums">{count}</div>
                    <div className="text-xs">{level} GI</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={() => resultForCurrentGrid(grid)}
            disabled={Boolean(result)}
            className="h-12 flex-1 bg-pulse text-primary-foreground shadow-lg hover:opacity-90"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {result ? "Attempt Complete" : "Predict Risk"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetBoard}
            className="h-12 border-white/15 bg-white/5 text-foreground hover:bg-white/10"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            New Attempt
          </Button>
        </div>

        {result && (
          <Card
            aria-live="polite"
            className="glass-strong mt-6 rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 to-violet-500/10"
          >
            <CardHeader className="p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Attempt Complete
              </p>
              <CardTitle className="font-display text-2xl sm:text-3xl">{result.risk}</CardTitle>
              <CardDescription>
                Educational activity result based on the foods placed. This is not a medical
                diagnosis.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-3 sm:px-7 sm:pb-7">
              <ResultMetric label="Foods placed" value={`${result.score}/9`} />
              <ResultMetric label="Grid completion" value={`${result.accuracy}%`} />
              <ResultMetric
                label="GI distribution"
                value={`${result.low} low · ${result.medium} medium · ${result.high} high`}
              />
            </CardContent>
          </Card>
        )}

        <Card className="glass-strong mt-6 rounded-3xl border border-white/10 bg-white/[0.03]">
          <CardHeader className="p-5 sm:px-7 sm:pt-6">
            <CardTitle className="font-display text-xl">Attempt History</CardTitle>
            <CardDescription>Results are kept in this page session only.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:px-7 sm:pb-6">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attempts yet.</p>
            ) : (
              <ol className="space-y-2">
                {history.map((attempt) => (
                  <li
                    key={attempt.number}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                  >
                    <span className="font-medium">Attempt {attempt.number}</span>
                    <span className="text-muted-foreground">
                      {attempt.score}/9 foods · {attempt.accuracy}% · {attempt.risk}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
