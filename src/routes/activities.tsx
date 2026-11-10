import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Brain, HeartPulse, Puzzle, Timer } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GlowButton } from "@/components/ui/GlowButton";

export const Route = createFileRoute("/activities")({
  component: ActivitiesPage,
});

const activities = [
  {
    title: "Nutrition Sudoku",
    category: "Type 2 Diabetes",
    difficulty: "Easy",
    description:
      "Arrange foods according to their Glycemic Index (GI) and learn how dietary habits influence Type 2 Diabetes risk.",
    href: "/nutrition-sudoku",
    icon: Puzzle,
    accent: "text-cyan-300",
    border: "hover:border-cyan-300/40",
  },
  {
    title: "Hypertension Maze",
    category: "Hypertension",
    difficulty: "Medium",
    description:
      "Navigate through healthy and risky lifestyle choices while maintaining a healthy blood pressure score.",
    href: "/hypertension-maze",
    icon: HeartPulse,
    accent: "text-rose-300",
    border: "hover:border-rose-300/40",
  },
  {
    title: "3-Minute Sit-to-Stand Challenge",
    category: "Cardiovascular Disease",
    difficulty: "Medium",
    description:
      "Stand up and sit down repeatedly for 3 minutes. Count repetitions to evaluate endurance and cardiovascular fitness.",
    href: "/sit-challenge",
    icon: Timer,
    accent: "text-pink-300",
    border: "hover:border-pink-300/40",
  },
  {
    title: "Stroop Color Test",
    category: "Chronic Stress & Burnout",
    difficulty: "Hard",
    description:
      "Identify the COLOR of the word instead of reading the word. Measures attention and reaction time.",
    href: "/stroop-test",
    icon: Brain,
    accent: "text-violet-300",
    border: "hover:border-violet-300/40",
  },
];

function ActivitiesPage() {
  const navigate = useNavigate();

  return (
    <AuthGate>
      <ProfileCheck>
        <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12">
          <AuroraBackground />
          <div className="relative z-10 mx-auto max-w-7xl">
            <GlowButton
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="mb-8"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to Dashboard
            </GlowButton>

            <section className="glass-strong mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-violet-500/10 p-6 shadow-lg sm:p-10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
                Health Drift AI · Wellness
              </p>
              <h1 className="font-display text-4xl font-bold text-aurora sm:text-6xl">
                Health Activities
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-relaxed text-muted-foreground sm:text-xl">
                Play interactive wellness games designed to assess and improve your health risks
                related to Type 2 Diabetes, Hypertension, Cardiovascular Disease, and Chronic Stress
                &amp; Burnout.
              </p>
            </section>

            <section aria-label="Health activities" className="grid gap-5 md:grid-cols-2 xl:gap-7">
              {activities.map((activity) => {
                const Icon = activity.icon;

                return (
                  <a
                    key={activity.href}
                    href={activity.href}
                    className="group block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Card
                      className={`glass-strong flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:bg-white/[0.06] ${activity.border}`}
                    >
                      <CardHeader className="p-6 sm:p-8">
                        <div
                          className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 ${activity.accent}`}
                        >
                          <Icon aria-hidden="true" className="h-7 w-7" />
                        </div>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground">
                            {activity.category}
                          </span>
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {activity.difficulty}
                          </span>
                        </div>
                        <CardTitle className="font-display text-2xl sm:text-3xl">
                          {activity.title}
                        </CardTitle>
                        <CardDescription className="pt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                          {activity.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1" />
                      <CardFooter className="justify-between px-6 pb-6 sm:px-8 sm:pb-8">
                        <span className={`text-sm font-semibold ${activity.accent}`}>
                          Start Activity
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${activity.accent}`}
                        />
                      </CardFooter>
                    </Card>
                  </a>
                );
              })}
            </section>
          </div>
        </main>
      </ProfileCheck>
    </AuthGate>
  );
}
