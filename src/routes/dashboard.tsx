import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { useAuth } from "@/lib/auth-context";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { GlowButton } from "@/components/ui/GlowButton";
import { useNavigate } from "@tanstack/react-router";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ProfileData } from "@/components/profile/ProfileForm";
import { format } from "date-fns";
import { loadHealthAnalytics, type HealthAnalyticsSnapshot } from "@/lib/health-analytics";
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HeartPulse,
  Activity,
  Droplets,
  Footprints,
  Utensils,
  Pill,
  BrainCircuit,
  LineChart as LineChartIcon,
  Sparkles,
  Bot,
  Clock,
  Moon,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <AuthGate>
      <ProfileCheck>
        <DashboardContent />
      </ProfileCheck>
    </AuthGate>
  );
}

const MOTIVATIONAL_MESSAGES = [
  "Every healthy choice today builds a stronger tomorrow.",
  "Small daily habits create lifelong wellness.",
  "Drink water, stay active, and keep smiling.",
  "Consistency is more important than perfection.",
  "Today's efforts become tomorrow's strength.",
  "Your health is an investment, not an expense.",
  "Take care of your body. It's the only place you have to live.",
  "Wellness is the natural state of your body.",
  "Nourish to flourish.",
  "A healthy outside starts from the inside.",
  "Rest when you need to, but never quit.",
  "Make yourself a priority.",
  "Health is a state of body. Wellness is a state of being.",
  "Progress, not perfection.",
  "Your body hears everything your mind says.",
  "Movement is medicine.",
  "Focus on how far you've come, not how far you have to go.",
  "You are capable of amazing things.",
  "Energy flows where intention goes.",
  "Eat well. Move daily. Hydrate often. Sleep lots. Love your body.",
  "Be stronger than your excuses.",
  "Self-care is how you take your power back.",
  "Strive for progress, not perfection.",
  "A good laugh and a long sleep are the best cures in the doctor's book.",
  "Take it one day at a time.",
  "You don't have to be perfect to be healthy.",
  "Listen to your body.",
  "Breathe in strength, breathe out stress.",
  "Hydration is key to feeling energized.",
  "Invest in your health today for a brighter tomorrow.",
  "Wellness encompasses a healthy body, a sound mind, and a tranquil spirit.",
];

function getDailyMessage() {
  const today = new Date();
  const index =
    (today.getFullYear() + today.getMonth() + today.getDate()) % MOTIVATIONAL_MESSAGES.length;
  return MOTIVATIONAL_MESSAGES[index];
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Good Morning, ${name} ☀️`;
  if (hour >= 12 && hour < 17) return `Good Afternoon, ${name} 🌤️`;
  if (hour >= 17 && hour < 21) return `Good Evening, ${name} 🌇`;
  return `Good Night, ${name} 🌙`;
}

function calculateAge(dob: string) {
  if (!dob) return "N/A";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getProgressWidth(value: string | undefined, multiplier: number, fallback = 0) {
  if (!value) return fallback;

  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(parsed * multiplier, 100);
}

function DashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [healthAnalytics, setHealthAnalytics] = React.useState<HealthAnalyticsSnapshot | null>(
    null,
  );
  const [expandedCard, setExpandedCard] = React.useState<"score" | "daily" | "weekly" | null>(null);

  React.useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as ProfileData);
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      }
    }
    loadProfile();
  }, [user]);

  React.useEffect(() => {
    async function loadAnalytics() {
      if (!user?.uid) {
        setHealthAnalytics(null);
        return;
      }

      try {
        const snapshot = await loadHealthAnalytics(user.uid);
        setHealthAnalytics(snapshot);
      } catch (error) {
        console.error("Error loading health analytics:", error);
        setHealthAnalytics(null);
      }
    }

    void loadAnalytics();
  }, [user?.uid]);

  const greetingName = profile?.fullName?.split(" ")[0] || "User";
  const greeting = getGreeting(greetingName);
  const dailyMessage = React.useMemo(() => getDailyMessage(), []);
  const todayStr = format(new Date(), "EEEE, MMMM do, yyyy");

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-muted-foreground grid place-items-center">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased p-4 sm:p-8 pb-32">
      <AuroraBackground />
      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        {/* TOP WELCOME SECTION */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl mb-3 text-aurora">{greeting}</h1>
            <div className="flex flex-wrap items-center gap-6 mt-3 text-lg text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> {todayStr}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse-soft" />
                <span className="uppercase tracking-[0.2em] text-sm">
                  Profile Status: Completed
                </span>
              </div>
            </div>
          </div>
          <GlowButton
            variant="ghost"
            onClick={() => navigate({ to: "/edit-profile" })}
            className="shrink-0 border border-white/10 text-lg py-3 px-6 h-auto"
          >
            Edit Profile
          </GlowButton>
        </div>

        {/* DAILY MOTIVATIONAL MESSAGE */}
        <div className="glass-strong rounded-3xl p-8 border border-white/10 bg-gradient-to-br from-white/5 to-transparent shadow-lg text-center mx-auto my-12">
          <p className="text-2xl sm:text-3xl font-serif italic text-foreground/90 leading-relaxed">
            "{dailyMessage}"
          </p>
        </div>

        {/* PROFILE SUMMARY CARD */}
        <div className="glass-strong rounded-3xl p-8 border border-white/10 shadow-lg">
          <h2 className="text-2xl font-display text-aurora mb-6 border-b border-white/10 pb-4">
            Profile Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                Full Name
              </div>
              <div className="font-medium text-xl">{profile.fullName}</div>
            </div>
            <div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Age</div>
              <div className="font-medium text-xl">{calculateAge(profile.dob)}</div>
            </div>
            <div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                Gender
              </div>
              <div className="font-medium text-xl">{profile.gender}</div>
            </div>
            <div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                Blood Group
              </div>
              <div className="font-medium text-xl">{profile.bloodGroup || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                Height
              </div>
              <div className="font-medium text-xl">{profile.height} cm</div>
            </div>
            <div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                Weight
              </div>
              <div className="font-medium text-xl">{profile.weight} kg</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                Health Conditions
              </div>
              <div className="font-medium text-xl">
                {profile.medicalConditions?.length > 0
                  ? profile.medicalConditions.join(", ")
                  : "None specified"}
              </div>
            </div>
          </div>
        </div>

        {/* PERSONALIZED HEALTH BADGES */}
        <div className="flex flex-wrap gap-4">
          {profile.medicalConditions?.includes("Diabetes") && (
            <span className="glass-strong px-5 py-3 rounded-full text-base font-medium border border-blue-500/30 text-blue-100 flex items-center gap-2 shadow-sm">
              <Activity className="w-5 h-5 text-blue-400" /> Diabetes Monitoring Active
            </span>
          )}
          {profile.medicalConditions?.includes("Hypertension") && (
            <span className="glass-strong px-5 py-3 rounded-full text-base font-medium border border-rose-500/30 text-rose-100 flex items-center gap-2 shadow-sm">
              <HeartPulse className="w-5 h-5 text-rose-400" /> Blood Pressure Monitoring Active
            </span>
          )}
          {(Array.isArray(profile.currentMedications)
            ? profile.currentMedications.length > 0
            : profile.currentMedications?.trim?.().length > 0) && (
            <span className="glass-strong px-5 py-3 rounded-full text-base font-medium border border-purple-500/30 text-purple-100 flex items-center gap-2 shadow-sm">
              <Pill className="w-5 h-5 text-purple-400" /> Medication Reminders Active
            </span>
          )}
          {profile.dailyWaterGoal && (
            <span className="glass-strong px-5 py-3 rounded-full text-base font-medium border border-cyan-500/30 text-cyan-100 flex items-center gap-2 shadow-sm">
              <Droplets className="w-5 h-5 text-cyan-400" /> Hydration Goal Set
            </span>
          )}
        </div>

        {/* HEALTH OVERVIEW SECTION */}
        <div className="mt-16 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl font-display">Health Overview</h2>
          {healthAnalytics && (
            <div className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
              {healthAnalytics.coverageText}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="glass-strong rounded-3xl border border-white/10 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <HeartPulse className="w-8 h-8 text-rose-400" />
                <h3 className="text-xl font-medium">Health Score</h3>
              </div>
              {healthAnalytics && (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                  {healthAnalytics.category}
                </span>
              )}
            </div>

            {healthAnalytics ? (
              <>
                <div className="flex items-center justify-center py-2">
                  <div className="relative h-32 w-32">
                    <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
                      <circle
                        cx="110"
                        cy="110"
                        r="72"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="14"
                        fill="none"
                      />
                      <circle
                        cx="110"
                        cy="110"
                        r="72"
                        stroke="url(#hds-ring)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={452.39}
                        strokeDashoffset={452.39 - (healthAnalytics.overallHds / 100) * 452.39}
                      />
                      <defs>
                        <linearGradient id="hds-ring" x1="0%" x2="100%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="#67e8f9" />
                          <stop offset="50%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#2dd4bf" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <div className="text-3xl font-display text-white">
                          {healthAnalytics.overallHds}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          / 100
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-2">
                    <div className="text-[9px] uppercase tracking-[0.2em]">Previous</div>
                    <div className="mt-1 text-base font-medium text-white">
                      {healthAnalytics.previousHds}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-2">
                    <div className="text-[9px] uppercase tracking-[0.2em]">Change</div>
                    <div
                      className={`mt-1 text-base font-medium ${healthAnalytics.change >= 0 ? "text-rose-300" : "text-emerald-300"}`}
                    >
                      {healthAnalytics.change >= 0 ? "+" : ""}
                      {healthAnalytics.change}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-2">
                    <div className="text-[9px] uppercase tracking-[0.2em]">Trend</div>
                    <div className="mt-1 text-base font-medium text-cyan-200">
                      {healthAnalytics.hdsTimeline.length ? "Live" : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 h-20 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={
                        healthAnalytics.hdsTimeline.length
                          ? healthAnalytics.hdsTimeline
                          : [{ label: "No data", value: 0, date: "today" }]
                      }
                    >
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#67e8f9"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3 text-sm text-muted-foreground">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Key drivers
                  </div>
                  <p>
                    {healthAnalytics.insights[0] ??
                      "Data is still being collected to build a personalized baseline."}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xl font-medium text-white/50">Calculating...</p>
            )}

            <button
              type="button"
              onClick={() => setExpandedCard(expandedCard === "score" ? null : "score")}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-white/10"
            >
              {expandedCard === "score" ? "Hide details" : "View details"}
            </button>

            {expandedCard === "score" && healthAnalytics && (
              <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={
                        healthAnalytics.radarData.length
                          ? healthAnalytics.radarData
                          : [{ subject: "No data", value: 0, fullMark: 100 }]
                      }
                    >
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                      <Radar dataKey="value" stroke="#67e8f9" fill="#67e8f9" fillOpacity={0.35} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {healthAnalytics.domains.map((domain) => (
                    <div
                      key={domain.key}
                      className="rounded-2xl border border-white/10 bg-black/10 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{domain.label}</span>
                        <span className="text-sm text-cyan-200">{domain.score}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-indigo-500"
                          style={{ width: `${Math.max(domain.score, 5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-strong rounded-3xl border border-white/10 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <h3 className="text-xl font-medium">Daily Prediction</h3>
              </div>
              {healthAnalytics && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200">
                  {healthAnalytics.dailyStatus}
                </span>
              )}
            </div>

            {healthAnalytics ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Daily wellness score
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="text-4xl font-display text-white">
                      {healthAnalytics.dailyWellnessScore}
                    </div>
                    <div className="text-xl font-medium text-emerald-300">/ 100</div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {healthAnalytics.domains
                    .filter((domain) => domain.valid)
                    .slice(0, 4)
                    .map((domain) => (
                      <div
                        key={domain.key}
                        className="rounded-2xl border border-white/10 bg-black/10 p-3"
                      >
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-foreground">{domain.label}</span>
                          <span className="text-cyan-200">{domain.score}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{domain.explanation}</p>
                      </div>
                    ))}
                </div>

                <div className="mt-4 space-y-2">
                  {healthAnalytics.insights.slice(0, 2).map((insight) => (
                    <div
                      key={insight}
                      className="rounded-2xl border border-white/10 bg-black/10 p-3 text-sm text-muted-foreground"
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xl font-medium text-white/50">Preparing prediction...</p>
            )}

            <button
              type="button"
              onClick={() => setExpandedCard(expandedCard === "daily" ? null : "daily")}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-white/10"
            >
              {expandedCard === "daily" ? "Hide details" : "View details"}
            </button>

            {expandedCard === "daily" && healthAnalytics && (
              <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: "Sleep",
                      value: healthAnalytics.domains.find((d) => d.key === "sleep")?.score ?? 0,
                      explanation: "Sleep analysis",
                    },
                    {
                      label: "Nutrition",
                      value: healthAnalytics.domains.find((d) => d.key === "nutrition")?.score ?? 0,
                      explanation: "Nutrition analysis",
                    },
                    {
                      label: "Hydration",
                      value: healthAnalytics.domains.find((d) => d.key === "hydration")?.score ?? 0,
                      explanation: "Hydration status",
                    },
                    {
                      label: "Activity",
                      value: healthAnalytics.domains.find((d) => d.key === "activity")?.score ?? 0,
                      explanation: "Physical activity",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-black/10 p-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-cyan-200">{item.value}</span>
                      </div>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {item.explanation}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Personalized recommendations
                  </div>
                  <ul className="space-y-2 text-sm text-foreground/90">
                    {healthAnalytics.recommendations.map((recommendation) => (
                      <li key={recommendation} className="flex gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="glass-strong rounded-3xl border border-white/10 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <LineChartIcon className="w-8 h-8 text-indigo-400" />
                <h3 className="text-xl font-medium">Weekly Report</h3>
              </div>
              {healthAnalytics && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-violet-200">
                  {healthAnalytics.baselineBuilding ? "Baseline building" : "Updated"}
                </span>
              )}
            </div>

            {healthAnalytics ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Score
                    </div>
                    <div className="mt-2 text-2xl font-display text-white">
                      {healthAnalytics.overallHds}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Previous
                    </div>
                    <div className="mt-2 text-2xl font-display text-white">
                      {healthAnalytics.previousHds}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {healthAnalytics.weeklyMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-white/10 bg-black/10 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {metric.label}
                        </span>
                        <span
                          className={`text-xs font-medium ${metric.tone === "negative" ? "text-rose-300" : metric.tone === "positive" ? "text-emerald-300" : "text-cyan-200"}`}
                        >
                          {metric.delta}
                        </span>
                      </div>
                      <div className="mt-2 text-2xl font-display text-white">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xl font-medium text-white/50">Report ready...</p>
            )}

            <button
              type="button"
              onClick={() => setExpandedCard(expandedCard === "weekly" ? null : "weekly")}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-white/10"
            >
              {expandedCard === "weekly" ? "Hide details" : "View details"}
            </button>

            {expandedCard === "weekly" && healthAnalytics && (
              <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Weekly focus
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">Sleep</span>
                        <span className="text-cyan-200">
                          {healthAnalytics.weeklyMetrics[0]?.value ?? "—"}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-400"
                          style={{
                            width: `${getProgressWidth(healthAnalytics.weeklyMetrics[0]?.value, 12, 20)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">Water</span>
                        <span className="text-cyan-200">
                          {healthAnalytics.weeklyMetrics[1]?.value ?? "—"}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500"
                          style={{
                            width: `${getProgressWidth(healthAnalytics.weeklyMetrics[1]?.value, 20, 20)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">Steps</span>
                        <span className="text-cyan-200">
                          {healthAnalytics.weeklyMetrics[2]?.value ?? "—"}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400"
                          style={{
                            width: `${Math.min(healthAnalytics.domains.find((d) => d.key === "activity")?.score ?? 0, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Weekly improvements & attention
                  </div>
                  <ul className="space-y-2 text-sm text-foreground/90">
                    {healthAnalytics.recommendations.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {healthAnalytics.missingInputs.length > 0 && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-100">
                    Missing inputs: {healthAnalytics.missingInputs.join(", ")}. The model does not
                    infer unavailable records.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MAIN FEATURES SECTION */}
        <h2 className="text-3xl font-display mt-16 mb-6">Main Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Steps Tracking",
              icon: <Footprints className="w-10 h-10 text-emerald-400 mb-6" />,
              subtitle: "Track daily movement and walking goals.",
              onClick: () => navigate({ to: "/steps-dashboard" }),
            },
            {
              title: "Food Intake",
              icon: <Utensils className="w-10 h-10 text-orange-400 mb-6" />,
              subtitle: "Scan meals and track nutrition.",
              onClick: () => navigate({ to: "/food-dashboard" }),
            },
            {
              title: "Water Intake",
              icon: <Droplets className="w-10 h-10 text-cyan-400 mb-6" />,
              subtitle: "Monitor hydration and water goals.",
              onClick: () => navigate({ to: "/water-dashboard" }),
            },
            {
              title: "Sleep Tracker",
              icon: <Moon className="w-10 h-10 text-indigo-400 mb-6" />,
              subtitle: "Track sleep duration, sleep quality, and healthy sleep habits.",
              onClick: () => navigate({ to: "/sleep-dashboard" }),
            },
            {
              title: "Medication Reminders",
              icon: <Pill className="w-10 h-10 text-purple-400 mb-6" />,
              subtitle: "Receive medicine reminders on time.",
              onClick: () => navigate({ to: "/medication-dashboard" }),
            },
            {
              title: "Activities",
              icon: <BrainCircuit className="w-10 h-10 text-blue-400 mb-6" />,
              subtitle: "Brain exercises and wellness activities.",
              onClick: () => navigate({ to: "/activities" }),
            },
            {
              title: "AI Assistant",
              icon: <Bot className="w-10 h-10 text-rose-400 mb-6" />,
              subtitle: "Ask health-related questions and get guidance.",
              onClick: () => navigate({ to: "/ai-assistant" }),
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              onClick={feature.onClick}
              className={`glass-strong rounded-3xl p-8 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group flex flex-col h-full bg-gradient-to-b from-white/5 to-transparent shadow-sm ${feature.onClick ? "cursor-pointer" : ""}`}
            >
              {feature.icon}
              <h3 className="text-2xl font-medium mb-3">{feature.title}</h3>
              <p className="text-base text-muted-foreground flex-grow mb-8 leading-relaxed">
                {feature.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
