import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { format } from "date-fns";
import { ArrowLeft, BellRing, CalendarClock, Clock3, Pill, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { Card } from "@/components/ui/card";
import { GlowButton } from "@/components/ui/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/medication-dashboard")({
  component: MedicationDashboardPage,
});

function MedicationDashboardPage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <MedicationDashboard />
      </ProfileCheck>
    </AuthGate>
  );
}

type Frequency = "once" | "daily" | "selected_days";
type Instruction = "before_food" | "after_food" | "any_time" | "";
type RecordSource = "schedule" | "temporary" | "profile";

type MedicationReminder = {
  id: string;
  source: RecordSource;
  medicineName: string;
  dosage: string;
  times: string[];
  frequency: Frequency;
  weekdays: number[];
  instruction: Instruction;
  startDate: string;
  endDate: string;
  notes: string;
  active: boolean;
  legacyTimes: string[];
};

type MedicationForm = Omit<MedicationReminder, "id" | "source" | "legacyTimes">;

type MedicationHistoryEntry = {
  id: string;
  medicineName: string;
  dosage: string;
  status: "taken" | "unconfirmed" | "missed" | string;
  scheduledAtMillis: number;
  takenAt?: Timestamp | number;
  snoozeHistory?: Array<{ eventAtMillis?: number; snoozeUntilMillis?: number }>;
};

type MedicationReminderPlugin = {
  requestNotificationPermission(): Promise<NotificationStatus>;
  getStatus(): Promise<NotificationStatus>;
  openExactAlarmSettings(): Promise<void>;
  scheduleReminders(options: { reminders: string }): Promise<NotificationStatus>;
  getPendingActions(): Promise<{ events: string[] }>;
  acknowledgeAction(options: { eventId: string }): Promise<void>;
};

type NotificationStatus = {
  notificationsGranted: boolean;
  notificationsEnabled: boolean;
  exactAlarmAvailable: boolean;
};

type NativeReminderAction = {
  eventId: string;
  type: "scheduled" | "taken" | "snoozed";
  occurrenceId: string;
  reminderId: string;
  medicineName: string;
  dosage?: string;
  scheduledAtMillis: number;
  eventAtMillis?: number;
  snoozeUntilMillis?: number;
};

const medicationReminderPlugin = registerPlugin<MedicationReminderPlugin>("MedicationReminders");
const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asWeekdayArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is number => typeof item === "number" && Number.isInteger(item) && item >= 1 && item <= 7,
  );
}

function legacyTimes(data: Record<string, unknown>): string[] {
  const labels = [
    ["morning", "Morning"],
    ["noon", "Noon"],
    ["night", "Night"],
  ] as const;
  return labels
    .filter(([key]) => data[key] === true)
    .map(([key, label]) => {
      const timing = data[`${key}Type`] === "after" || (data[`${key}Type`] !== "before" && data.beforeFood === false)
        ? "After food"
        : "Before food";
      return `${label} · ${timing} (set an exact time to enable reminders)`;
    });
}

function normalizeMedication(
  id: string,
  source: Exclude<RecordSource, "profile">,
  data: Record<string, unknown>,
): MedicationReminder {
  const times = asStringArray(data.times).filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time));
  const frequency = data.frequency === "once" || data.frequency === "selected_days"
    ? data.frequency
    : "daily";
  const instruction =
    data.instruction === "before_food" ||
    data.instruction === "after_food" ||
    data.instruction === "any_time"
      ? data.instruction
      : "";

  return {
    id,
    source,
    medicineName: asString(data.medicineName).trim(),
    dosage: asString(data.dosage),
    times,
    frequency,
    weekdays: asWeekdayArray(data.weekdays),
    instruction,
    startDate: asString(data.startDate),
    endDate: asString(data.endDate),
    notes: asString(data.notes),
    active: typeof data.active === "boolean" ? data.active : true,
    legacyTimes: times.length === 0 ? legacyTimes(data) : [],
  };
}

function getLocalDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function nextReminder(reminder: MedicationReminder): Date | null {
  if (!reminder.active || reminder.times.length === 0) return null;
  const now = new Date();
  const times = reminder.times
    .map((time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return { hours, minutes };
    })
    .sort((a, b) => a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes));

  for (let dayOffset = 0; dayOffset < 370; dayOffset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    const dateKey = getLocalDate(date);
    if (reminder.startDate && dateKey < reminder.startDate) continue;
    if (reminder.endDate && dateKey > reminder.endDate) return null;

    const isoWeekday = ((date.getDay() + 6) % 7) + 1;
    if (reminder.frequency === "selected_days" && !reminder.weekdays.includes(isoWeekday)) {
      continue;
    }

    for (const time of times) {
      const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hours, time.minutes);
      if (candidate > now) return candidate;
    }
    if (reminder.frequency === "once") return null;
  }
  return null;
}

function createEmptyForm(): MedicationForm {
  return {
    medicineName: "",
    dosage: "",
    times: [""],
    frequency: "daily",
    weekdays: [],
    instruction: "",
    startDate: "",
    endDate: "",
    notes: "",
    active: true,
  };
}

function MedicationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [medications, setMedications] = React.useState<MedicationReminder[]>([]);
  const [history, setHistory] = React.useState<MedicationHistoryEntry[]>([]);
  const [form, setForm] = React.useState<MedicationForm>(createEmptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notificationStatus, setNotificationStatus] = React.useState<NotificationStatus | null>(null);
  const [processingActions, setProcessingActions] = React.useState(false);
  const processingRef = React.useRef(false);
  const userId = user?.uid;

  const loadHistory = React.useCallback(async (uid: string) => {
    const snapshot = await getDocs(collection(db, "users", uid, "medication_history"));
    const entries = snapshot.docs.map((entry) => {
      const data = entry.data();
      const storedDate = data.scheduledAt;
      const scheduledAtMillis =
        typeof data.scheduledAtMillis === "number"
          ? data.scheduledAtMillis
          : storedDate instanceof Timestamp
            ? storedDate.toMillis()
            : 0;
      return {
        id: entry.id,
        medicineName: asString(data.medicineName),
        dosage: asString(data.dosage),
        status: asString(data.status) || "unconfirmed",
        scheduledAtMillis,
        takenAt:
          data.takenAt instanceof Timestamp || typeof data.takenAt === "number"
            ? data.takenAt
            : undefined,
        snoozeHistory: Array.isArray(data.snoozeHistory) ? data.snoozeHistory : [],
      } satisfies MedicationHistoryEntry;
    });
    entries.sort((a, b) => b.scheduledAtMillis - a.scheduledAtMillis);
    setHistory(entries);
  }, []);

  const syncNativeReminders = React.useCallback(
    async (records: MedicationReminder[], requestPermission = false) => {
      if (!Capacitor.isNativePlatform()) {
        setNotificationStatus(null);
        return;
      }
      if (!Capacitor.isPluginAvailable("MedicationReminders")) {
        toast.error("Medication notifications are unavailable in this Android build.");
        return;
      }

      try {
        let status = await medicationReminderPlugin.getStatus();
        if (requestPermission && !status.notificationsEnabled) {
          status = await medicationReminderPlugin.requestNotificationPermission();
        }

        const nativeRecords = records.map((record) => ({
          id: `${userId}:${record.id}`,
          medicineName: record.medicineName,
          dosage: record.dosage,
          times: record.times,
          frequency: record.frequency,
          weekdays: record.weekdays,
          startDate: record.startDate,
          endDate: record.endDate,
          active: record.active,
        }));
        const scheduleStatus = await medicationReminderPlugin.scheduleReminders({
          reminders: JSON.stringify(nativeRecords),
        });
        status = { ...status, ...scheduleStatus };
        setNotificationStatus(status);

        if (!status.notificationsEnabled && nativeRecords.some((record) => record.active && record.times.length)) {
          toast.error("Reminders are saved, but Android notifications are disabled.");
        } else if (!status.exactAlarmAvailable) {
          toast.message("Android may delay reminders until exact-alarm access is allowed.");
        }
      } catch (error) {
        console.error("[Medication] Native reminder sync failed:", error);
        toast.error("Could not sync medication reminders to this Android device.");
      }
    },
    [userId],
  );

  const loadData = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profileSnap, scheduleSnap, temporarySnap] = await Promise.all([
        getDoc(doc(db, "profiles", userId)),
        getDocs(collection(db, "users", userId, "medication_schedules")),
        getDocs(collection(db, "users", userId, "temporary_medications")),
      ]);
      const profile = profileSnap.exists() ? profileSnap.data() : {};
      const scheduleRecords = scheduleSnap.docs.map((entry) =>
        normalizeMedication(entry.id, "schedule", entry.data()),
      );
      const temporaryRecords = temporarySnap.docs.map((entry) =>
        normalizeMedication(entry.id, "temporary", entry.data()),
      );
      const storedNames = new Set(
        [...scheduleRecords, ...temporaryRecords].map((record) => record.medicineName.toLowerCase()),
      );
      const profileMeds: unknown = profile.currentMedications;
      const profileNames = Array.isArray(profileMeds)
        ? profileMeds.filter((name): name is string => typeof name === "string")
        : typeof profileMeds === "string"
          ? profileMeds.split(",").map((name) => name.trim()).filter(Boolean)
          : [];
      const profileRecords = profileNames
        .filter((name) => !storedNames.has(name.toLowerCase()))
        .map((name) => ({
          ...createEmptyForm(),
          id: `profile-${encodeURIComponent(name)}`,
          source: "profile" as const,
          medicineName: name,
          legacyTimes: [],
        }));
      const allRecords = [...scheduleRecords, ...temporaryRecords, ...profileRecords];
      setMedications(allRecords);
      await Promise.all([loadHistory(userId), syncNativeReminders(allRecords)]);
    } catch (error) {
      console.error("[Medication] Load error:", error);
      toast.error("Could not load medication records.");
    } finally {
      setLoading(false);
    }
  }, [loadHistory, syncNativeReminders, userId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const processPendingActions = React.useCallback(async () => {
    if (
      !userId ||
      !Capacitor.isNativePlatform() ||
      !Capacitor.isPluginAvailable("MedicationReminders") ||
      processingRef.current
    ) {
      return;
    }
    processingRef.current = true;
    setProcessingActions(true);
    let updated = false;
    try {
      const { events } = await medicationReminderPlugin.getPendingActions();
      for (const serializedEvent of events) {
        let event: NativeReminderAction;
        try {
          event = JSON.parse(serializedEvent) as NativeReminderAction;
        } catch (error) {
          console.error("[Medication] Ignoring malformed native action:", error);
          continue;
        }

        if (
          !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(event.eventId) ||
          !/^[0-9a-f]{64}$/i.test(event.occurrenceId) ||
          !["scheduled", "taken", "snoozed"].includes(event.type) ||
          !Number.isFinite(event.scheduledAtMillis)
        ) {
          console.error("[Medication] Ignoring invalid native action", event.eventId);
          continue;
        }

        const historyRef = doc(db, "users", userId, "medication_history", event.occurrenceId);
        const existing = await getDoc(historyRef);
        const commonFields = {
          reminderId: event.reminderId,
          medicineName: event.medicineName,
          dosage: event.dosage ?? "",
          scheduledAtMillis: event.scheduledAtMillis,
          scheduledAt: Timestamp.fromMillis(event.scheduledAtMillis),
          updatedAt: serverTimestamp(),
          userId,
        };

        if (event.type === "scheduled") {
          if (!existing.exists() || existing.data().status !== "taken") {
            await setDoc(
              historyRef,
              {
                ...commonFields,
                status: "unconfirmed",
                createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
              },
              { merge: true },
            );
          }
        } else if (event.type === "taken") {
          await setDoc(
            historyRef,
            { ...commonFields, status: "taken", takenAt: serverTimestamp(), confirmedVia: "notification" },
            { merge: true },
          );
        } else {
          const snooze = {
            eventAtMillis: event.eventAtMillis ?? Date.now(),
            snoozeUntilMillis: event.snoozeUntilMillis ?? 0,
          };
          await setDoc(
            historyRef,
            {
              ...commonFields,
              ...(existing.exists() ? {} : { status: "unconfirmed", createdAt: serverTimestamp() }),
              snoozeHistory: arrayUnion(snooze),
            },
            { merge: true },
          );
        }
        await medicationReminderPlugin.acknowledgeAction({ eventId: event.eventId });
        updated = true;
      }

      if (updated) await loadHistory(userId);
    } catch (error) {
      console.error("[Medication] Could not sync reminder actions:", error);
      toast.error("Medication responses could not sync yet. They will be retried.");
    } finally {
      processingRef.current = false;
      setProcessingActions(false);
    }
  }, [loadHistory, userId]);

  React.useEffect(() => {
    void processPendingActions();
    const interval = window.setInterval(() => void processPendingActions(), 5_000);
    return () => window.clearInterval(interval);
  }, [processPendingActions]);

  React.useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("MedicationReminders")) {
      return;
    }
    void medicationReminderPlugin.getStatus().then(setNotificationStatus).catch((error) => {
      console.error("[Medication] Could not read notification settings:", error);
    });
  }, [userId]);

  const openNewMedicine = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setFormOpen(true);
  };

  const openEditMedicine = (medication: MedicationReminder) => {
    setEditingId(medication.id);
    setForm({
      medicineName: medication.medicineName,
      dosage: medication.dosage,
      times: medication.times.length ? [...medication.times] : [""],
      frequency: medication.frequency,
      weekdays: [...medication.weekdays],
      instruction: medication.instruction,
      startDate: medication.startDate,
      endDate: medication.endDate,
      notes: medication.notes,
      active: medication.active,
    });
    setFormOpen(true);
  };

  const saveMedicine = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;
    const name = form.medicineName.trim();
    const times = form.times.map((time) => time.trim()).filter(Boolean);
    if (!name || times.length === 0) {
      toast.error("Enter a medicine name and at least one reminder time.");
      return;
    }
    if (form.times.some((time) => !time)) {
      toast.error("Complete or remove every reminder time.");
      return;
    }
    if (form.frequency === "selected_days" && form.weekdays.length === 0) {
      toast.error("Select at least one weekday.");
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      toast.error("End date must be on or after the start date.");
      return;
    }

    setSaving(true);
    try {
      const existing = medications.find((medication) => medication.id === editingId);
      const scheduleCollection = collection(db, "users", userId, "medication_schedules");
      const targetRef =
        existing && existing.source !== "profile"
          ? doc(db, "users", userId, existing.source === "temporary" ? "temporary_medications" : "medication_schedules", existing.id)
          : doc(scheduleCollection);
      const payload = {
        medicineName: name,
        dosage: form.dosage.trim(),
        times,
        frequency: form.frequency,
        weekdays: form.frequency === "selected_days" ? form.weekdays : [],
        instruction: form.instruction,
        startDate: form.startDate,
        endDate: form.endDate,
        notes: form.notes.trim(),
        active: form.active,
        schemaVersion: 2,
        updatedAt: serverTimestamp(),
        ...(existing ? {} : { createdAt: serverTimestamp() }),
      };
      const savedRecord: MedicationReminder = {
        ...form,
        ...payload,
        id: targetRef.id,
        source: "schedule",
        medicineName: name,
        dosage: form.dosage.trim(),
        times,
        notes: form.notes.trim(),
        legacyTimes: [],
      };
      const nextRecords = existing
        ? medications.map((medication) => (medication.id === existing.id ? savedRecord : medication))
        : [...medications.filter((medication) => medication.medicineName.toLowerCase() !== name.toLowerCase()), savedRecord];
      setMedications(nextRecords);
      setFormOpen(false);
      setEditingId(null);
      await syncNativeReminders(nextRecords, true);
      await setDoc(targetRef, payload, { merge: true });
      toast.success(existing ? "Medication reminder updated." : "Medication reminder added.");
    } catch (error) {
      console.error("[Medication] Save error:", error);
      toast.error("Could not save this medication. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMedicine = async (medication: MedicationReminder) => {
    if (!userId || !window.confirm(`Delete ${medication.medicineName} and cancel its reminders?`)) return;
    try {
      if (medication.source === "profile") {
        const profileRef = doc(db, "profiles", userId);
        const profileSnap = await getDoc(profileRef);
        const stored = profileSnap.data()?.currentMedications;
        const names = Array.isArray(stored)
          ? stored.filter((name): name is string => typeof name === "string")
          : typeof stored === "string"
            ? stored.split(",").map((name) => name.trim()).filter(Boolean)
            : [];
        await setDoc(
          profileRef,
          { currentMedications: names.filter((name) => name.toLowerCase() !== medication.medicineName.toLowerCase()) },
          { merge: true },
        );
      } else {
        const collectionName =
          medication.source === "temporary" ? "temporary_medications" : "medication_schedules";
        const nextRecords = medications.filter((record) => record.id !== medication.id);
        setMedications(nextRecords);
        await syncNativeReminders(nextRecords);
        await deleteDoc(doc(db, "users", userId, collectionName, medication.id));
        toast.success("Medication deleted and its reminder canceled.");
        return;
      }
      const nextRecords = medications.filter((record) => record.id !== medication.id);
      setMedications(nextRecords);
      await syncNativeReminders(nextRecords);
      toast.success("Medication deleted and its reminder canceled.");
    } catch (error) {
      console.error("[Medication] Delete error:", error);
      toast.error("Could not delete this medication.");
    }
  };

  const toggleActive = async (medication: MedicationReminder) => {
    if (!userId) return;
    const active = !medication.active;
    const scheduleCollection = collection(db, "users", userId, "medication_schedules");
    const targetRef =
      medication.source !== "profile"
        ? doc(
            db,
            "users",
            userId,
            medication.source === "temporary" ? "temporary_medications" : "medication_schedules",
            medication.id,
          )
        : doc(scheduleCollection);
    try {
      if (medication.source === "profile") {
        const updated: MedicationReminder = { ...medication, id: targetRef.id, source: "schedule", active };
        const nextRecords = medications.map((item) => (item.id === medication.id ? updated : item));
        setMedications(nextRecords);
        await syncNativeReminders(nextRecords);
        await setDoc(targetRef, {
          medicineName: medication.medicineName,
          dosage: medication.dosage,
          times: medication.times,
          frequency: medication.frequency,
          weekdays: medication.weekdays,
          instruction: medication.instruction,
          startDate: medication.startDate,
          endDate: medication.endDate,
          notes: medication.notes,
          active,
          schemaVersion: 2,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const updated: MedicationReminder = { ...medication, active };
        const nextRecords = medications.map((item) => (item.id === medication.id ? updated : item));
        setMedications(nextRecords);
        await syncNativeReminders(nextRecords);
        await setDoc(targetRef, { active, updatedAt: serverTimestamp() }, { merge: true });
      }
      toast.success(active ? "Medication reminder activated." : "Medication reminder deactivated.");
    } catch (error) {
      console.error("[Medication] Status update failed:", error);
      toast.error("Could not update medication status.");
    }
  };

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("MedicationReminders")) {
      toast.error("Android notification settings are only available in the installed app.");
      return;
    }
    try {
      const status = await medicationReminderPlugin.requestNotificationPermission();
      setNotificationStatus(status);
      if (!status.notificationsEnabled) {
        toast.error("Allow notifications in Android settings to receive medication reminders.");
      } else if (!status.exactAlarmAvailable) {
        toast.message("Notifications are enabled; Android may delay reminders without exact-alarm access.");
      } else {
        toast.success("Medication notification permissions are ready.");
      }
    } catch (error) {
      console.error("[Medication] Notification permission request failed:", error);
      toast.error("Could not request notification permission.");
    }
  };

  const openExactAlarmSettings = async () => {
    try {
      await medicationReminderPlugin.openExactAlarmSettings();
    } catch (error) {
      console.error("[Medication] Exact-alarm settings could not be opened:", error);
      toast.error("Could not open Android exact-alarm settings.");
    }
  };

  const scheduledHistory = history.filter((entry) =>
    entry.status === "taken" || entry.status === "unconfirmed" || entry.status === "missed",
  );
  const takenCount = scheduledHistory.filter((entry) => entry.status === "taken").length;
  const adherence = scheduledHistory.length ? Math.round((takenCount / scheduledHistory.length) * 100) : null;

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background text-foreground grid place-items-center p-6">
        <AuroraBackground />
        <p className="relative z-10 text-muted-foreground">Loading medications...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased p-4 pb-16 sm:p-8">
      <AuroraBackground />
      <main className="relative z-10 mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              aria-label="Back to dashboard"
              className="mt-1 rounded-full p-3 transition-colors hover:bg-white/10 sm:mt-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="flex flex-wrap items-center gap-3 font-display text-3xl text-aurora sm:text-5xl">
                <Pill className="h-8 w-8 text-purple-400 sm:h-10 sm:w-10" />
                Medication Reminders
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Schedule precise reminders and record confirmed doses.
              </p>
            </div>
          </div>
          <GlowButton type="button" onClick={openNewMedicine} className="justify-center">
            <Plus className="h-4 w-4" /> Add Medicine
          </GlowButton>
        </header>

        {Capacitor.isNativePlatform() && (
          <Card className="glass-strong flex flex-col gap-3 rounded-2xl border border-cyan-400/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <p>
                Android notifications and exact-alarm access are controlled by system settings.
                Do Not Disturb and notification channel settings may silence or suppress alerts.
                {notificationStatus &&
                  ` Notifications ${notificationStatus.notificationsEnabled ? "enabled" : "disabled"}; exact alarms ${notificationStatus.exactAlarmAvailable ? "available" : "not allowed"}.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void requestPermissions()}
                className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/20"
              >
                Notification permission
              </button>
              {notificationStatus && !notificationStatus.exactAlarmAvailable && (
                <button
                  type="button"
                  onClick={() => void openExactAlarmSettings()}
                  className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-100 hover:bg-violet-500/20"
                >
                  Exact alarm settings
                </button>
              )}
            </div>
          </Card>
        )}

        {formOpen && (
          <Card className="glass-strong rounded-3xl border border-cyan-400/20 p-5 sm:p-7">
            <form onSubmit={saveMedicine} className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-2xl text-aurora">
                  {editingId ? "Edit Medicine" : "Add Medicine"}
                </h2>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="medicineName">Medicine name *</Label>
                  <Input
                    id="medicineName"
                    required
                    maxLength={100}
                    value={form.medicineName}
                    onChange={(event) => setForm((current) => ({ ...current, medicineName: event.target.value }))}
                    placeholder="e.g., Metformin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicineDosage">Dosage (optional)</Label>
                  <Input
                    id="medicineDosage"
                    maxLength={60}
                    value={form.dosage}
                    onChange={(event) => setForm((current) => ({ ...current, dosage: event.target.value }))}
                    placeholder="e.g., 500 mg"
                  />
                </div>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Reminder times *</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {form.times.map((time, index) => (
                    <div key={`time-${index}`} className="flex items-end gap-2">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`medicineTime-${index}`}>Time {index + 1}</Label>
                        <Input
                          id={`medicineTime-${index}`}
                          type="time"
                          required
                          value={time}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              times: current.times.map((value, timeIndex) =>
                                timeIndex === index ? event.target.value : value,
                              ),
                            }))
                          }
                        />
                      </div>
                      {form.times.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove time ${index + 1}`}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              times: current.times.filter((_, timeIndex) => timeIndex !== index),
                            }))
                          }
                          className="mb-1 rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, times: [...current.times, ""] }))}
                  className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100"
                >
                  <Plus className="h-4 w-4" /> Add another reminder time
                </button>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <select
                    id="frequency"
                    value={form.frequency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        frequency: event.target.value as Frequency,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="selected_days">Selected days</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instruction">Instructions (optional)</Label>
                  <select
                    id="instruction"
                    value={form.instruction}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        instruction: event.target.value as Instruction,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                  >
                    <option value="">Not specified</option>
                    <option value="before_food">Before food</option>
                    <option value="after_food">After food</option>
                    <option value="any_time">Any time</option>
                  </select>
                </div>
              </div>

              {form.frequency === "selected_days" && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Days of the week *</legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const selected = form.weekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              weekdays: selected
                                ? current.weekdays.filter((value) => value !== day.value)
                                : [...current.weekdays, day.value].sort(),
                            }))
                          }
                          className={`rounded-full border px-3 py-2 text-xs transition ${
                            selected
                              ? "border-cyan-300/60 bg-cyan-500/20 text-cyan-100"
                              : "border-white/10 bg-white/5 text-muted-foreground"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date (optional)</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicineNotes">Additional notes (optional)</Label>
                <textarea
                  id="medicineNotes"
                  maxLength={500}
                  rows={3}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
                  placeholder="Notes for your own reference"
                />
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4 accent-cyan-400"
                />
                Reminder is active
              </label>

              <GlowButton type="submit" disabled={saving} className="w-full justify-center">
                {saving ? "Saving..." : editingId ? "Save Changes" : "Save Medicine"}
              </GlowButton>
            </form>
          </Card>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-aurora">Your Medicines</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reminder times use the device's current local timezone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void openNewMedicine()}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20"
            >
              <Plus className="h-4 w-4" /> Add Medicine
            </button>
          </div>

          {medications.length === 0 ? (
            <Card className="glass-strong rounded-3xl border border-white/10 p-8 text-center">
              <Pill className="mx-auto mb-3 h-8 w-8 text-purple-300" />
              <p className="text-muted-foreground">No medicines have been added yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {medications.map((medication) => {
                const next = nextReminder(medication);
                const frequencyLabel =
                  medication.frequency === "once"
                    ? "Once"
                    : medication.frequency === "selected_days"
                      ? WEEKDAYS.filter((day) => medication.weekdays.includes(day.value))
                          .map((day) => day.label)
                          .join(", ") || "Selected days"
                      : "Daily";
                const instructionLabel = {
                  before_food: "Before food",
                  after_food: "After food",
                  any_time: "Any time",
                  "": "Instruction not specified",
                }[medication.instruction];

                return (
                  <Card
                    key={`${medication.source}-${medication.id}`}
                    className="glass-strong rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="rounded-xl border border-purple-400/20 bg-purple-500/10 p-2">
                          <Pill className="h-5 w-5 text-purple-300" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-semibold">{medication.medicineName}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {medication.dosage || "Dosage not specified"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                          medication.active
                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/5 text-muted-foreground"
                        }`}
                      >
                        {medication.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="flex gap-2 text-muted-foreground">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                        <span>
                          {medication.times.length ? medication.times.join(" · ") : "No exact reminder time set"}
                        </span>
                      </div>
                      <div className="flex gap-2 text-muted-foreground">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                        <span>{frequencyLabel}</span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>
                        Next reminder:{" "}
                        <span className="text-foreground">
                          {next ? format(next, "EEE, MMM d 'at' h:mm a") : "Not scheduled"}
                        </span>
                      </p>
                      <p>
                        {instructionLabel}
                        {medication.startDate ? ` · From ${medication.startDate}` : ""}
                        {medication.endDate ? ` · Until ${medication.endDate}` : ""}
                      </p>
                      {medication.notes && <p className="break-words">{medication.notes}</p>}
                      {medication.legacyTimes.map((legacyTime) => (
                        <p key={legacyTime} className="text-amber-200/80">
                          Existing schedule: {legacyTime}
                        </p>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() => openEditMedicine(medication)}
                        className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-100 hover:bg-violet-500/20"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(medication)}
                        className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/20"
                      >
                        {medication.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteMedicine(medication)}
                        className="ml-auto inline-flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-aurora">Medication History & Adherence</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Only notification actions confirmed by you count as taken.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 text-sm">
              Adherence:{" "}
              <span className="font-semibold text-cyan-100">
                {adherence === null ? "No confirmed-dose history yet" : `${adherence}% (${takenCount}/${scheduledHistory.length})`}
              </span>
            </div>
          </div>

          {history.length === 0 ? (
            <Card className="glass-strong rounded-2xl border border-white/10 p-5 text-sm text-muted-foreground">
              Dose history will appear after a scheduled reminder fires. Opening the dashboard syncs
              confirmation actions saved by Android while the app was closed.
            </Card>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 20).map((entry) => {
                const takenDate =
                  entry.takenAt instanceof Timestamp
                    ? entry.takenAt.toDate()
                    : typeof entry.takenAt === "number"
                      ? new Date(entry.takenAt)
                      : null;
                const status = entry.status === "taken" ? "Taken" : entry.status === "missed" ? "Missed" : "Unconfirmed";
                return (
                  <Card
                    key={entry.id}
                    className="glass-strong flex flex-col gap-2 rounded-2xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {entry.medicineName} {entry.dosage && <span className="text-muted-foreground">· {entry.dosage}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled {entry.scheduledAtMillis ? format(new Date(entry.scheduledAtMillis), "PPpp") : "time unavailable"}
                        {takenDate ? ` · Confirmed ${format(takenDate, "p")}` : ""}
                      </p>
                      {entry.snoozeHistory?.length ? (
                        <p className="text-xs text-muted-foreground">
                          Snoozed {entry.snoozeHistory.length} time{entry.snoozeHistory.length === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs ${
                        entry.status === "taken"
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : entry.status === "missed"
                            ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                            : "border-amber-400/30 bg-amber-500/10 text-amber-100"
                      }`}
                    >
                      {status}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}
          {processingActions && <p className="text-xs text-muted-foreground">Syncing reminder actions…</p>}
        </section>
      </main>
    </div>
  );
}
