import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { format } from "date-fns";
import { loadHealthAnalytics } from "@/lib/health-analytics";
import { db } from "@/lib/firebase";

type RecordData = Record<string, unknown>;

const DAY_MS = 24 * 60 * 60 * 1000;

export type AssistantHealthContext = {
  coverage: string;
  baselineBuilding: boolean;
  healthDrift?: Record<string, unknown>;
  weeklyMetrics?: Array<{ label: string; value: string; change: string }>;
  insights?: string[];
  recommendations?: string[];
  domains: Array<{
    domain: string;
    available: boolean;
    driftScore?: number;
    trend?: string;
    changePercent?: number;
    explanation: string;
  }>;
  hydration?: Record<string, unknown>;
  nutrition?: Record<string, unknown>;
  medication?: Record<string, unknown>;
  trackerAvailability?: Record<string, string | undefined>;
};

function numberValue(value: unknown): number | null {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function recordDate(record: RecordData): Date | null {
  for (const value of [record.date, record.timestamp, record.scheduledAt]) {
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      const dayKey = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dayKey) {
        return new Date(Number(dayKey[1]), Number(dayKey[2]) - 1, Number(dayKey[3]));
      }
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function dailyTotals(records: RecordData[], getValue: (record: RecordData) => number | null) {
  const totals = new Map<string, number>();
  const today = new Date();
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13).getTime();

  for (const record of records) {
    const date = recordDate(record);
    if (!date || date.getTime() < cutoff) continue;
    const value = getValue(record);
    if (value === null) continue;
    const day = format(date, "yyyy-MM-dd");
    totals.set(day, (totals.get(day) ?? 0) + value);
  }
  return totals;
}

function trendSummary(current: Map<string, number>, previous: Map<string, number>) {
  const average = (values: Map<string, number>) =>
    values.size
      ? [...values.values()].reduce((total, value) => total + value, 0) / values.size
      : null;
  const currentAverage = average(current);
  const previousAverage = average(previous);
  return {
    recentDaysWithRecords: current.size,
    recentDailyAverage: currentAverage === null ? null : Math.round(currentAverage * 10) / 10,
    previousDailyAverage: previousAverage === null ? null : Math.round(previousAverage * 10) / 10,
    percentChange:
      currentAverage !== null && previousAverage !== null && previousAverage !== 0
        ? Math.round(((currentAverage - previousAverage) / previousAverage) * 100)
        : null,
  };
}

function splitRecentDays(values: Map<string, number>) {
  const recent = new Map<string, number>();
  const previous = new Map<string, number>();
  const today = new Date();
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  for (const [day, value] of values) {
    const date = new Date(`${day}T00:00:00`);
    if (date >= cutoff) recent.set(day, value);
    else previous.set(day, value);
  }
  return { recent, previous };
}

function matches(question: string, expression: RegExp): boolean {
  return expression.test(question);
}

export async function loadAssistantHealthContext(
  userId: string,
  question: string,
): Promise<AssistantHealthContext> {
  if (!userId) throw new Error("Authentication is required to load personal health context.");

  const normalizedQuestion = question.toLowerCase();
  const wantsSleep = matches(normalizedQuestion, /sleep|bedtime|rest|insomnia/);
  const wantsHydration = matches(normalizedQuestion, /water|hydration|drink|fluid/);
  const wantsNutrition = matches(
    normalizedQuestion,
    /food|nutrition|meal|calorie|protein|carb|fat|diet/,
  );
  const wantsActivity = matches(normalizedQuestion, /step|walk|activity|exercise|movement/);
  const wantsMedication = matches(
    normalizedQuestion,
    /medication|medicine|pill|dose|adherence|prescription/,
  );
  const wantsScore = matches(
    normalizedQuestion,
    /health drift|drift score|wellness prediction|prediction changing|overall health|lifestyle changes|what should i improve/,
  );
  const wantsWeeklyReport = matches(
    normalizedQuestion,
    /weekly report|health report|summari[sz]e.{0,20}week|week.{0,20}summar|overall.{0,12}week/,
  );
  const hasSpecificDomain =
    wantsSleep || wantsHydration || wantsNutrition || wantsActivity || wantsMedication;
  const wantsOverview =
    wantsScore ||
    wantsWeeklyReport ||
    (!hasSpecificDomain &&
      matches(
        normalizedQuestion,
        /health|wellness|how am i|how am|today|recommend|advice|improv|overall|summari|biggest|lifestyle/,
      ));
  const wantsDomainTrend = matches(
    normalizedQuestion,
    /week|trend|pattern|change|consisten|improv/,
  );
  const wantsAnyHealthContext = wantsOverview || hasSpecificDomain;
  if (!wantsAnyHealthContext) {
    return {
      coverage: "No health records were loaded for this general conversation.",
      baselineBuilding: false,
      domains: [],
    };
  }

  const analytics = await loadHealthAnalytics(userId);

  const context: AssistantHealthContext = {
    coverage: analytics.coverageText,
    baselineBuilding: analytics.baselineBuilding,
    domains: [],
  };

  const relevantKeys = new Set<string>();
  if (wantsOverview)
    ["sleep", "nutrition", "hydration", "activity", "medication"].forEach((key) =>
      relevantKeys.add(key),
    );
  if (wantsSleep) relevantKeys.add("sleep");
  if (wantsHydration) relevantKeys.add("hydration");
  if (wantsNutrition) relevantKeys.add("nutrition");
  if (wantsActivity) relevantKeys.add("activity");
  if (wantsMedication) relevantKeys.add("medication");

  const validDomains = analytics.domains.some((domain) => domain.valid);
  if (wantsOverview || wantsWeeklyReport || (wantsDomainTrend && hasSpecificDomain)) {
    if (wantsOverview || wantsWeeklyReport) {
      context.healthDrift = validDomains
        ? {
            scoreOutOf100: analytics.overallHds,
            category: analytics.category,
            dailyWellnessScore: analytics.dailyWellnessScore,
            dailyStatus: analytics.dailyStatus,
            trend: analytics.change,
            baselineBuilding: analytics.baselineBuilding,
          }
        : {
            available: false,
            reason: "There is not enough valid tracked data to calculate a score.",
          };
    }
    const selectedMetricLabels = new Set<string>();
    if (wantsOverview || wantsWeeklyReport) {
      ["Sleep", "Water", "Steps", "Nutrition"].forEach((label) => selectedMetricLabels.add(label));
    } else {
      if (wantsSleep) selectedMetricLabels.add("Sleep");
      if (wantsHydration) selectedMetricLabels.add("Water");
      if (wantsActivity) selectedMetricLabels.add("Steps");
      if (wantsNutrition) selectedMetricLabels.add("Nutrition");
    }
    context.weeklyMetrics = analytics.weeklyMetrics
      .filter((metric) => selectedMetricLabels.has(metric.label))
      .filter((metric) => metric.value !== "—")
      .map(({ label, value, delta }) => ({ label, value, change: delta }));
    if (wantsOverview || wantsWeeklyReport) {
      context.insights = analytics.insights;
      context.recommendations = analytics.recommendations;
    }
  }

  context.domains = analytics.domains
    .filter((domain) => relevantKeys.has(domain.key))
    .map((domain) => ({
      domain: domain.label,
      available: domain.valid,
      ...(domain.valid
        ? { driftScore: domain.score, trend: domain.trend, changePercent: domain.change }
        : {}),
      explanation: domain.valid
        ? domain.explanation
        : (domain.missingReason ?? "No data is available."),
    }));

  const needProfile = wantsHydration || wantsOverview;
  const profilePromise = needProfile ? getDoc(doc(db, "profiles", userId)) : Promise.resolve(null);
  const foodPromise = wantsNutrition
    ? getDocs(
        query(
          collection(db, "food_logs", userId, "entries"),
          orderBy("timestamp", "desc"),
          limit(120),
        ),
      )
    : Promise.resolve(null);
  const waterPromise = wantsHydration
    ? getDocs(
        query(
          collection(db, "users", userId, "waterLogs"),
          orderBy("timestamp", "desc"),
          limit(120),
        ),
      )
    : Promise.resolve(null);
  const medicationPromise = wantsMedication
    ? Promise.all([
        getDocs(query(collection(db, "users", userId, "medication_schedules"), limit(50))),
        getDocs(query(collection(db, "users", userId, "temporary_medications"), limit(50))),
        getDocs(
          query(
            collection(db, "users", userId, "medication_history"),
            orderBy("scheduledAtMillis", "desc"),
            limit(90),
          ),
        ),
      ])
    : Promise.resolve(null);

  const [profileSnapshot, foodSnapshot, waterSnapshot, medicationSnapshots] = await Promise.all([
    profilePromise,
    foodPromise,
    waterPromise,
    medicationPromise,
  ]);

  if ((wantsHydration || wantsOverview) && profileSnapshot?.exists()) {
    const goalMl = numberValue(profileSnapshot.data().dailyWaterGoal);
    context.hydration = {
      dailyGoalMl: goalMl,
      note:
        goalMl === null
          ? "No personal water goal is configured."
          : "Goal read from the user's profile.",
    };
  }

  if (foodSnapshot) {
    const records = foodSnapshot.docs.map((entry) => entry.data() as RecordData);
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13).getTime();
    const relevant = records.filter((record) => {
      const date = recordDate(record);
      return date !== null && date.getTime() >= cutoff;
    });
    const daysFor = (from: number, until: number) => {
      const totals = new Map<
        string,
        { calories: number; protein: number; carbs: number; fat: number; meals: number }
      >();
      relevant.forEach((record) => {
        const date = recordDate(record);
        if (!date || date.getTime() < from || date.getTime() >= until) return;
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const current = totals.get(day) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
        const calories = numberValue(record.calories);
        const protein = numberValue(record.protein);
        const carbs = numberValue(record.carbs);
        const fat = numberValue(record.fat);
        if (calories !== null) current.calories += calories;
        if (protein !== null) current.protein += protein;
        if (carbs !== null) current.carbs += carbs;
        if (fat !== null) current.fat += fat;
        current.meals += 1;
        totals.set(day, current);
      });
      return [...totals.values()];
    };
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 6 * DAY_MS;
    const previousStart = todayStart - 13 * DAY_MS;
    const week = daysFor(weekStart, todayStart + DAY_MS);
    const previousWeek = daysFor(previousStart, weekStart);
    const averageOf = (days: typeof week, field: keyof (typeof week)[number]) =>
      days.length
        ? Math.round((days.reduce((sum, day) => sum + day[field], 0) / days.length) * 10) / 10
        : null;

    context.nutrition = {
      recentLoggedMeals: relevant.length,
      loggedDaysInLast7: week.length,
      averagePerLoggedDayLast7: {
        calories: averageOf(week, "calories"),
        proteinGrams: averageOf(week, "protein"),
        carbohydrateGrams: averageOf(week, "carbs"),
        fatGrams: averageOf(week, "fat"),
        meals: averageOf(week, "meals"),
      },
      previous7LoggedDays: previousWeek.length,
      note:
        relevant.length === 0
          ? "No recent food records were found; this is missing data, not zero intake."
          : undefined,
    };
  }

  if (waterSnapshot) {
    const records = waterSnapshot.docs.map((entry) => entry.data() as RecordData);
    const byDay = dailyTotals(records, (record) =>
      numberValue(record.amountMl ?? record.amount ?? record.volumeMl),
    );
    const { recent, previous } = splitRecentDays(byDay);
    context.hydration = {
      ...(context.hydration as Record<string, unknown> | undefined),
      recent7Days: trendSummary(recent, previous),
      note:
        recent.size === 0
          ? "No recent water records were found; this is missing data, not zero intake."
          : undefined,
    };
  }

  if (medicationSnapshots) {
    const [regular, temporary, history] = medicationSnapshots;
    const schedules = [...regular.docs, ...temporary.docs].map((entry) => {
      const data = entry.data();
      const times = Array.isArray(data.times)
        ? data.times.filter((time): time is string => typeof time === "string")
        : [];
      return {
        medicineName:
          typeof data.medicineName === "string" ? data.medicineName : "Unnamed medication",
        dosage: typeof data.dosage === "string" ? data.dosage : undefined,
        reminderTimes: times.length ? times : undefined,
        frequency:
          typeof data.frequency === "string"
            ? data.frequency
            : "legacy schedule; exact frequency unavailable",
        weekdays: Array.isArray(data.weekdays)
          ? data.weekdays.filter((day): day is number => typeof day === "number")
          : undefined,
        instruction: typeof data.instruction === "string" ? data.instruction : undefined,
        startDate: typeof data.startDate === "string" ? data.startDate : undefined,
        endDate: typeof data.endDate === "string" ? data.endDate : undefined,
        notes: typeof data.notes === "string" ? data.notes : undefined,
        active: typeof data.active === "boolean" ? data.active : true,
        hasLegacyTimeFlags:
          times.length === 0 && ["morning", "noon", "night"].some((key) => data[key] === true),
      };
    });
    const recentHistory = history.docs.map((entry) => entry.data());
    const taken = recentHistory.filter((entry) => entry.status === "taken").length;
    const scheduled = recentHistory.filter((entry) =>
      ["taken", "unconfirmed", "missed"].includes(String(entry.status)),
    ).length;
    context.medication = {
      schedules,
      recentDoseEvents: scheduled,
      confirmedTaken: taken,
      unconfirmedOrMissed: Math.max(scheduled - taken, 0),
      adherencePercent: scheduled ? Math.round((taken / scheduled) * 100) : null,
      note:
        scheduled === 0
          ? "No scheduled-dose or confirmation history is available; adherence cannot be calculated."
          : "Adherence is based only on recorded scheduled doses and explicit confirmations.",
    };
  }

  if (wantsSleep || wantsActivity) {
    context.trackerAvailability = {
      sleep: wantsSleep
        ? "Use the domain's availability field; only user-scoped sleep records are considered."
        : undefined,
      activity: wantsActivity
        ? "Use the domain's availability field; only user-scoped step records are considered."
        : undefined,
    };
  }

  return context;
}
