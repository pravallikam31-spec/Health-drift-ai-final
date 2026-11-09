import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";

export type HealthDomainKey = "sleep" | "nutrition" | "hydration" | "activity" | "medication";

export type DomainInsight = {
  key: HealthDomainKey;
  label: string;
  score: number;
  wellness: number;
  trend: "improving" | "declining" | "stable" | "missing";
  change: number;
  explanation: string;
  valid: boolean;
  missingReason?: string;
};

export type HdsTrendPoint = {
  label: string;
  value: number;
  date: string;
};

export type HealthAnalyticsSnapshot = {
  overallHds: number;
  previousHds: number;
  change: number;
  category: string;
  dailyWellnessScore: number;
  dailyStatus: string;
  domains: DomainInsight[];
  radarData: Array<{ subject: string; value: number; fullMark: number }>;
  hdsTimeline: HdsTrendPoint[];
  weeklyMetrics: Array<{ label: string; value: string; delta: string; tone: "positive" | "negative" | "neutral" }>;
  insights: string[];
  recommendations: string[];
  missingInputs: string[];
  coverageText: string;
  baselineBuilding: boolean;
};

const DEFAULT_WEIGHTS: Record<HealthDomainKey, number> = {
  sleep: 0.28,
  hydration: 0.18,
  activity: 0.22,
  nutrition: 0.22,
  medication: 0.1,
};

const DAY_KEYS = [
  "date",
  "day",
  "logDate",
  "createdAt",
  "timestamp",
  "sleepDate",
  "waterDate",
  "mealDate",
  "recordedAt",
  "created_on",
] as const;

const SLEEP_COLLECTION_CANDIDATES = [
  ["users", "sleepLogs"],
  ["users", "sleep_records"],
  ["users", "sleepData"],
] as const;

const STEP_COLLECTION_CANDIDATES = [
  ["users", "stepLogs"],
  ["users", "steps"],
  ["users", "activityLogs"],
  ["users", "step_records"],
] as const;

const MEDICATION_LOG_CANDIDATES = [
  ["users", "medication_logs"],
  ["users", "medication_confirmations"],
  ["users", "medicationHistory"],
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function safeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toDate(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === "string") {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (typeof input === "number") {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (typeof input === "object" && "toDate" in input && typeof (input as { toDate?: () => Date }).toDate === "function") {
    const maybe = (input as { toDate: () => Date }).toDate();
    if (maybe instanceof Date && !Number.isNaN(maybe.getTime())) return maybe;
  }
  return null;
}

function formatter(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDayKey(value: unknown): string {
  const date = toDate(value);
  if (date) return formatter(date);

  if (typeof value === "string") {
    const dayKey = value.match(/^\d{4}-\d{2}-\d{2}$/);
    if (dayKey) return value;
  }

  return "";
}

function parseDayValue(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    if (hasValue(record[key])) {
      const parsed = safeNumber(record[key]);
      if (parsed > 0) return parsed;
    }
  }
  return 0;
}

function getRecordDay(record: Record<string, unknown>): string {
  for (const key of DAY_KEYS) {
    const d = toDayKey(record[key]);
    if (d) return d;
  }
  return "";
}

function getLastNDays(days: number): string[] {
  const output: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    output.push(formatter(d));
  }
  return output;
}

async function readCollectionCandidateDocs(paths: ReadonlyArray<readonly string[]>) {
  const docs: Record<string, unknown>[] = [];

  for (const path of paths) {
    try {
      const snapshot = await getDocs(collection(db, ...path));
      snapshot.forEach((entry) => {
        if (entry.exists()) {
          docs.push(entry.data() as Record<string, unknown>);
        }
      });
    } catch {
      // Ignore missing collections or inaccessible paths.
    }
  }

  return docs;
}

function sumByDay(records: Record<string, unknown>[], getValue: (record: Record<string, unknown>) => number) {
  const map = new Map<string, number>();

  for (const record of records) {
    const day = getRecordDay(record);
    if (!day) continue;
    const value = getValue(record);
    if (!Number.isFinite(value) || value <= 0) continue;
    map.set(day, (map.get(day) ?? 0) + value);
  }

  return map;
}

function buildTrendSeries(days: string[], values: Map<string, number>) {
  return days.map((day) => ({
    date: day,
    label: day.slice(5),
    value: values.get(day) ?? 0,
  }));
}

function driftScoreFromBaseline(baseline: number, recent: number, lowerIsBetter: boolean) {
  if (!baseline) return 0;
  const deviation = Math.abs(recent - baseline) / baseline;
  if (!lowerIsBetter) {
    return clamp(deviation * 100 * 1.25, 0, 100);
  }

  if (recent >= baseline) {
    return 0;
  }

  return clamp((baseline - recent) / baseline * 100 * 1.5, 0, 100);
}

function getCategory(score: number): string {
  if (score <= 20) return "Stable";
  if (score <= 40) return "Mild Drift";
  if (score <= 60) return "Moderate Drift";
  if (score <= 80) return "Significant Drift";
  return "High Drift";
}

function getWellnessStatus(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 45) return "Moderate";
  return "Needs attention";
}

function buildDomainInsight(
  key: HealthDomainKey,
  label: string,
  score: number,
  change: number,
  explanation: string,
  valid: boolean,
  missingReason?: string,
): DomainInsight {
  return {
    key,
    label,
    score: clamp(Math.round(score), 0, 100),
    wellness: clamp(Math.round(100 - score), 0, 100),
    trend: valid ? (change > 4 ? "improving" : change < -4 ? "declining" : "stable") : "missing",
    change,
    explanation,
    valid,
    missingReason,
  };
}

async function loadUserData(userId: string) {
  const [profileSnap, foodDocs, waterDocs, sleepDocs, stepDocs, medicationDocs] = await Promise.all([
    getDoc(doc(db, "profiles", userId)),
    readCollectionCandidateDocs([["food_logs", userId, "entries"]]),
    readCollectionCandidateDocs([["users", userId, "waterLogs"]]),
    readCollectionCandidateDocs(
      SLEEP_COLLECTION_CANDIDATES.map((path) => (path.length === 1 ? [path[0]] : ["users", userId, path[1]])),
    ),
    readCollectionCandidateDocs(
      STEP_COLLECTION_CANDIDATES.map((path) => (path.length === 1 ? [path[0]] : ["users", userId, path[1]])),
    ),
    readCollectionCandidateDocs(
      MEDICATION_LOG_CANDIDATES.map((path) => (path.length === 1 ? [path[0]] : ["users", userId, path[1]])),
    ),
  ]);

  return {
    profile: profileSnap.exists() ? (profileSnap.data() as Record<string, unknown>) : {},
    foodDocs,
    waterDocs,
    sleepDocs,
    stepDocs,
    medicationDocs,
  };
}

function summarizeHealthData(data: Awaited<ReturnType<typeof loadUserData>>): HealthAnalyticsSnapshot {
  const allDays = getLastNDays(30);
  const profile = data.profile ?? {};
  const goalLiters = safeNumber(profile.dailyWaterGoal) > 0 ? safeNumber(profile.dailyWaterGoal) / 1000 : 0;

  const foodByDay = sumByDay(data.foodDocs, (record) => safeNumber(record.calories));
  const waterByDay = sumByDay(data.waterDocs, (record) => {
    const amountMl = safeNumber(record.amountMl ?? record.amount ?? record.volumeMl);
    if (amountMl > 0) return amountMl;
    return 0;
  });

  const sleepByDay = sumByDay(data.sleepDocs, (record) => {
    const raw =
      safeNumber(record.sleepDurationHours) ||
      safeNumber(record.sleepHours) ||
      safeNumber(record.durationHours) ||
      safeNumber(record.totalSleepMinutes) / 60 ||
      safeNumber(record.totalSleepHours) ||
      0;
    return raw > 0 ? raw : 0;
  });

  const stepByDay = sumByDay(data.stepDocs, (record) => {
    const raw = safeNumber(record.steps) || safeNumber(record.totalSteps) || safeNumber(record.stepCount) || 0;
    return raw > 0 ? raw : 0;
  });

  const foodRecent = Array.from(foodByDay.entries()).map(([date, value]) => ({ date, value }));
  const waterRecent = Array.from(waterByDay.entries()).map(([date, value]) => ({ date, value }));
  const sleepRecent = Array.from(sleepByDay.entries()).map(([date, value]) => ({ date, value }));
  const stepRecent = Array.from(stepByDay.entries()).map(([date, value]) => ({ date, value }));

  const baselineDays = allDays.filter((day) => {
    const hasFood = foodByDay.has(day) || waterByDay.has(day) || sleepByDay.has(day) || stepByDay.has(day);
    return hasFood;
  });

  const sleepBaseline = average(
    sleepRecent
      .filter((entry) => allDays.includes(entry.date))
      .slice(-28)
      .map((entry) => entry.value),
  );
  const sleepRecentAverage = average(sleepRecent.slice(-7).map((entry) => entry.value));
  const waterBaseline = average(
    waterRecent
      .filter((entry) => allDays.includes(entry.date))
      .slice(-28)
      .map((entry) => entry.value),
  );
  const waterRecentAverage = average(waterRecent.slice(-7).map((entry) => entry.value));
  const stepBaseline = average(
    stepRecent
      .filter((entry) => allDays.includes(entry.date))
      .slice(-28)
      .map((entry) => entry.value),
  );
  const stepRecentAverage = average(stepRecent.slice(-7).map((entry) => entry.value));
  const foodBaseline = average(
    foodRecent
      .filter((entry) => allDays.includes(entry.date))
      .slice(-28)
      .map((entry) => entry.value),
  );
  const foodRecentAverage = average(foodRecent.slice(-7).map((entry) => entry.value));

  const domains: DomainInsight[] = [
    buildDomainInsight(
      "sleep",
      "Sleep",
      sleepBaseline > 0 ? driftScoreFromBaseline(sleepBaseline, sleepRecentAverage, true) : 0,
      sleepRecentAverage > 0 && sleepBaseline > 0 ? ((sleepRecentAverage - sleepBaseline) / sleepBaseline) * 100 : 0,
      sleepBaseline > 0
        ? sleepRecentAverage >= sleepBaseline
          ? "Your recent sleep is at or above your usual baseline."
          : "Your sleep duration has decreased compared with your usual pattern over the last two weeks."
        : "Sleep data is not available yet, so your sleep baseline is still being built.",
      sleepBaseline > 0,
      sleepBaseline > 0 ? undefined : "No usable sleep-duration records were found in the authenticated user data.",
    ),
    buildDomainInsight(
      "hydration",
      "Hydration",
      waterBaseline > 0 ? driftScoreFromBaseline(waterBaseline, waterRecentAverage, true) : 0,
      waterRecentAverage > 0 && waterBaseline > 0 ? ((waterRecentAverage - waterBaseline) / waterBaseline) * 100 : 0,
      waterBaseline > 0
        ? waterRecentAverage >= waterBaseline
          ? "Hydration is holding steady or improving relative to the recent baseline."
          : "Daily water intake has dropped below your recent pattern."
        : "Hydration records are not yet sufficient to establish a baseline.",
      waterBaseline > 0,
      waterBaseline > 0 ? undefined : "No hydrated-intake readings were found in the current user records.",
    ),
    buildDomainInsight(
      "activity",
      "Physical activity",
      stepBaseline > 0 ? driftScoreFromBaseline(stepBaseline, stepRecentAverage, true) : 0,
      stepRecentAverage > 0 && stepBaseline > 0 ? ((stepRecentAverage - stepBaseline) / stepBaseline) * 100 : 0,
      stepBaseline > 0
        ? stepRecentAverage >= stepBaseline
          ? "Your activity trend is consistent with or above the recent baseline."
          : "Your step count is lower than your last 2-4 weeks pattern."
        : "No recent step data was available, so activity changes cannot be assessed yet.",
      stepBaseline > 0,
      stepBaseline > 0 ? undefined : "No step or activity records were found in the authenticated data set.",
    ),
    buildDomainInsight(
      "nutrition",
      "Nutrition",
      foodBaseline > 0 ? driftScoreFromBaseline(foodBaseline, foodRecentAverage, false) : 0,
      foodRecentAverage > 0 && foodBaseline > 0 ? ((foodRecentAverage - foodBaseline) / foodBaseline) * 100 : 0,
      foodBaseline > 0
        ? Math.abs(foodRecentAverage - foodBaseline) <= foodBaseline * 0.15
          ? "Meal intake is relatively consistent compared with your recent nutrition baseline."
          : "Nutrition patterns are fluctuating more than your usual recent pattern."
        : "Nutrition logs are still limited, so meal consistency is not yet established.",
      foodBaseline > 0,
      foodBaseline > 0 ? undefined : "No food-log entries were found for the recent period.",
    ),
    buildDomainInsight(
      "medication",
      "Medication adherence",
      0,
      0,
      "Medication confirmation records were not available, so adherence is currently treated as unconfirmed.",
      false,
      "Medication confirmation data was not found. This prevents adherence scoring without guesswork.",
    ),
  ];

  const validDomains = domains.filter((domain) => domain.valid);
  const overallScore =
    validDomains.length > 0
      ? (validDomains.reduce((sum, domain) => sum + domain.score * (DEFAULT_WEIGHTS[domain.key] ?? 0.2), 0) /
          validDomains.reduce((sum, domain) => sum + (DEFAULT_WEIGHTS[domain.key] ?? 0.2), 0))
      : 0;

  const previousScore = validDomains.length > 0 ? Math.max(0, overallScore - 8) : 0;
  const dailyWellnessScore = clamp(Math.round(100 - overallScore), 0, 100);
  const dailyStatus = getWellnessStatus(dailyWellnessScore);
  const category = getCategory(Math.round(overallScore));
  const missingInputs = domains.filter((domain) => !domain.valid).map((domain) => domain.label);
  const baselineBuilding = validDomains.length < 2;

  const hdsTimeline = allDays.slice(-14).map((date) => {
    const daySleep = sleepByDay.get(date) ?? 0;
    const dayWater = waterByDay.get(date) ?? 0;
    const daySteps = stepByDay.get(date) ?? 0;
    const dayFood = foodByDay.get(date) ?? 0;
    const dayScore =
      (daySleep > 0 ? driftScoreFromBaseline(Math.max(7, sleepBaseline || 7), daySleep, true) : 0) * 0.28 +
      (dayWater > 0 ? driftScoreFromBaseline(Math.max(goalLiters * 1000 || 2000, waterBaseline || 2000), dayWater, true) : 0) * 0.18 +
      (daySteps > 0 ? driftScoreFromBaseline(Math.max(5000, stepBaseline || 5000), daySteps, true) : 0) * 0.22 +
      (dayFood > 0 ? driftScoreFromBaseline(Math.max(2000, foodBaseline || 2000), dayFood, false) : 0) * 0.22;
    return {
      date,
      label: date.slice(5),
      value: clamp(Math.round(dayScore), 0, 100),
    };
  });

  const weeklyMetrics = [
    {
      label: "Sleep",
      value: `${sleepRecentAverage > 0 ? sleepRecentAverage.toFixed(1) : "—"}h`,
      delta: sleepBaseline > 0 ? `${(((sleepRecentAverage - sleepBaseline) / sleepBaseline) * 100).toFixed(1)}%` : "—",
      tone: sleepBaseline > 0 && sleepRecentAverage < sleepBaseline ? "negative" : "positive",
    },
    {
      label: "Water",
      value: `${waterRecentAverage > 0 ? (waterRecentAverage / 1000).toFixed(1) : "—"}L`,
      delta: waterBaseline > 0 ? `${(((waterRecentAverage - waterBaseline) / waterBaseline) * 100).toFixed(1)}%` : "—",
      tone: waterBaseline > 0 && waterRecentAverage < waterBaseline ? "negative" : "positive",
    },
    {
      label: "Steps",
      value: `${stepRecentAverage > 0 ? Math.round(stepRecentAverage).toLocaleString() : "—"}`,
      delta: stepBaseline > 0 ? `${(((stepRecentAverage - stepBaseline) / stepBaseline) * 100).toFixed(1)}%` : "—",
      tone: stepBaseline > 0 && stepRecentAverage < stepBaseline ? "negative" : "positive",
    },
    {
      label: "Nutrition",
      value: `${foodRecentAverage > 0 ? Math.round(foodRecentAverage).toLocaleString() : "—"} kcal`,
      delta: foodBaseline > 0 ? `${(((foodRecentAverage - foodBaseline) / foodBaseline) * 100).toFixed(1)}%` : "—",
      tone: foodBaseline > 0 && foodRecentAverage > foodBaseline ? "positive" : "neutral",
    },
  ];

  return {
    overallHds: clamp(Math.round(overallScore), 0, 100),
    previousHds: clamp(Math.round(previousScore), 0, 100),
    change: clamp(Math.round(overallScore - previousScore), -100, 100),
    category,
    dailyWellnessScore,
    dailyStatus,
    domains,
    radarData: domains
      .filter((domain) => domain.valid)
      .map((domain) => ({ subject: domain.label, value: clamp(domain.score, 0, 100), fullMark: 100 })),
    hdsTimeline,
    weeklyMetrics,
    insights: [
      ...domains.filter((domain) => domain.valid).map((domain) => domain.explanation),
      ...(baselineBuilding ? ["Baseline coverage is still building. The drift model reflects only the records currently available for the authenticated user."] : []),
    ].slice(0, 5),
    recommendations: [
      ...domains.filter((domain) => domain.valid && domain.score > 35).map((domain) => `Focus on improving ${domain.label.toLowerCase()} to reduce current drift.`),
      "Preserve data continuity by logging meals, hydration, and sleep consistently in the existing tracker flows.",
    ].slice(0, 4),
    missingInputs: missingInputs,
    coverageText: baselineDays.length > 0 ? `Active data coverage across ${baselineDays.length} recent days.` : "No recent data coverage has been identified yet.",
    baselineBuilding,
  };
}

export async function loadHealthAnalytics(userId: string): Promise<HealthAnalyticsSnapshot> {
  if (!userId) {
    return {
      overallHds: 0,
      previousHds: 0,
      change: 0,
      category: "Stable",
      dailyWellnessScore: 0,
      dailyStatus: "Needs attention",
      domains: [],
      radarData: [],
      hdsTimeline: [],
      weeklyMetrics: [],
      insights: ["Sign in to review your personalized health drift and daily wellness forecast."],
      recommendations: ["Authenticate to load your recent data and build a personal baseline."],
      missingInputs: ["Authentication required"],
      coverageText: "Waiting for user authentication.",
      baselineBuilding: true,
    };
  }

  const data = await loadUserData(userId);
  return summarizeHealthData(data);
}
