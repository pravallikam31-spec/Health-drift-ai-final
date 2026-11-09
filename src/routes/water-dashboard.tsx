import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/water-dashboard")({
  component: WaterDashboardPage,
});

function WaterDashboardPage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <WaterDashboard />
      </ProfileCheck>
    </AuthGate>
  );
}

type WaterEntry = {
  amount: number;
  amountMl?: number;
  timestamp: Timestamp | null;
  date: string;
};

type ReminderSettings = {
  enabled: boolean;
  hours: number;
  minutes: number;
};

interface WaterReminderPlugin {
  scheduleReminder(options: { hours: number; minutes: number }): Promise<void>;
  cancelReminder(): Promise<void>;
  requestNotificationPermission(): Promise<{ granted?: boolean } | void>;
  getPendingWaterReminderActions(): Promise<{ tokens: string[] }>;
  acknowledgeWaterReminderAction(options: { token: string }): Promise<void>;
}

const waterReminderPlugin = registerPlugin<WaterReminderPlugin>("WaterReminder");

function WaterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goal, setGoal] = React.useState<number>(0);
  const [goalInput, setGoalInput] = React.useState<string>("");
  const [entries, setEntries] = React.useState<WaterEntry[]>([]);
  const [customAmount, setCustomAmount] = React.useState<string>("");
  const [settings, setSettings] = React.useState<ReminderSettings>({
    enabled: false,
    hours: 2,
    minutes: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [savingGoal, setSavingGoal] = React.useState(false);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const processingReminderActions = React.useRef(false);

  const userId = user?.uid;
  const today = format(new Date(), "yyyy-MM-dd");
  const displayDate = format(new Date(), "EEEE, MMMM do, yyyy");

  const waterConsumed = React.useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.amount || 0), 0),
    [entries],
  );

  const remaining = Math.max(goal - waterConsumed, 0);
  const progress = goal > 0 ? Math.min(Math.round((waterConsumed / goal) * 100), 100) : 0;
  const hydrationStatus =
    progress >= 90 ? "Excellent" : progress >= 70 ? "Good" : progress >= 40 ? "Moderate" : "Low";

  React.useEffect(() => {
    if (!userId) return;

    async function loadWaterData() {
      setLoading(true);
      try {
        const profileRef = doc(db, "profiles", userId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as Record<string, unknown>;
          const storedGoal = Number(profileData.dailyWaterGoal ?? "");
          if (!Number.isNaN(storedGoal) && storedGoal > 0) {
            setGoal(storedGoal);
            setGoalInput(String(storedGoal));
          } else {
            const weightValue = Number(profileData.weight ?? "");
            if (!Number.isNaN(weightValue) && weightValue > 0) {
              const calculatedGoal = Math.round(weightValue * 35);
              setGoal(calculatedGoal);
              setGoalInput(String(calculatedGoal));
              await setDoc(profileRef, { dailyWaterGoal: String(calculatedGoal) }, { merge: true });
            }
          }
        }

        const reminderRef = doc(db, "users", userId, "waterReminderSettings", "settings");
        const reminderSnap = await getDoc(reminderRef);
        if (reminderSnap.exists()) {
          const reminderData = reminderSnap.data() as Record<string, unknown>;
          const hours = Number(reminderData.hours ?? 0);
          const minutes = Number(reminderData.minutes ?? 0);
          setSettings({
            enabled: Boolean(reminderData.enabled),
            hours: Number.isFinite(hours) ? hours : 0,
            minutes: Number.isFinite(minutes) ? minutes : 0,
          });
        }

        await loadEntries(userId, today);
      } catch (error) {
        console.error("Failed to load water dashboard data", error);
      } finally {
        setLoading(false);
      }
    }

    loadWaterData();
  }, [userId, today]);

  React.useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("WaterReminder")) {
      return;
    }

    async function processReminderActions() {
      if (processingReminderActions.current) return;
      processingReminderActions.current = true;

      let savedActions = false;
      try {
        const { tokens } = await waterReminderPlugin.getPendingWaterReminderActions();
        for (const token of tokens) {
          if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              token,
            )
          ) {
            console.error("Ignoring invalid water reminder action token", token);
            continue;
          }

          const waterLogRef = doc(db, "users", userId, "waterLogs", token);
          await setDoc(waterLogRef, {
            amount: 200,
            amountMl: 200,
            date: format(new Date(), "yyyy-MM-dd"),
            timestamp: serverTimestamp(),
            userId,
          });
          await waterReminderPlugin.acknowledgeWaterReminderAction({ token });
          savedActions = true;
        }
      } catch (error) {
        console.error("Failed to process water reminder action", error);
        toast.error("Could not save your water reminder response. It will be retried.");
      } finally {
        processingReminderActions.current = false;
      }

      if (savedActions) {
        try {
          await loadEntries(userId, format(new Date(), "yyyy-MM-dd"));
        } catch (error) {
          console.error("Water reminder entry was saved but the dashboard did not refresh", error);
          toast.error("Your water entry was saved, but the dashboard could not refresh.");
        }
      }
    }

    void processReminderActions();
    const interval = window.setInterval(() => {
      void processReminderActions();
    }, 5_000);

    return () => window.clearInterval(interval);
  }, [userId]);

  async function loadEntries(uid: string, currentDate: string) {
    const entriesRef = collection(db, "users", uid, "waterLogs");
    const waterQuery = query(entriesRef, where("date", "==", currentDate));
    const snapshot = await getDocs(waterQuery);
    const loaded: WaterEntry[] = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const amountValue = Number(data.amountMl ?? data.amount ?? 0);
        const timestampValue =
          data.timestamp && typeof data.timestamp === "object" && "toDate" in data.timestamp
            ? (data.timestamp as Timestamp)
            : null;
        return {
          amount: Number.isFinite(amountValue) ? amountValue : 0,
          amountMl: Number.isFinite(amountValue) ? amountValue : 0,
          timestamp: timestampValue,
          date: String(data.date ?? currentDate),
        };
      })
      .sort((a, b) => {
        const aTs = a.timestamp?.toMillis?.() ?? 0;
        const bTs = b.timestamp?.toMillis?.() ?? 0;
        return aTs - bTs;
      });
    setEntries(loaded);
    const total = loaded.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const remainingValue = Math.max(goal - total, 0);
    const progressValue = goal > 0 ? Math.min(Math.round((total / goal) * 100), 100) : 0;
    console.log("[Water] Entries loaded:", loaded.length);
    console.log("[Water] Total consumed:", total);
    console.log("[Water] Remaining:", remainingValue);
    console.log("[Water] Progress:", progressValue);
  }

  async function saveGoalValue() {
    if (!userId) return;
    const parsed = Number(goalInput);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    setSavingGoal(true);
    try {
      const profileRef = doc(db, "profiles", userId);
      await setDoc(profileRef, { dailyWaterGoal: String(parsed) }, { merge: true });
      setGoal(parsed);
    } catch (error) {
      console.error("Failed to save water goal", error);
    } finally {
      setSavingGoal(false);
    }
  }

  async function addWater(amount: number) {
    if (!userId || amount <= 0) return;
    try {
      const waterLogRef = doc(collection(db, "users", userId, "waterLogs"));
      await setDoc(waterLogRef, {
        amount,
        amountMl: amount,
        date: today,
        timestamp: serverTimestamp(),
        userId: userId,
      });
      await loadEntries(userId, today);
    } catch (error) {
      console.error("Failed to add water entry", error);
    }
  }

  async function addCustomWater() {
    const parsed = Number(customAmount);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    await addWater(parsed);
    setCustomAmount("");
  }

  async function saveReminderSettings(uid: string, updatedSettings: ReminderSettings) {
    const reminderRef = doc(db, "users", uid, "waterReminderSettings", "settings");
    await setDoc(
      reminderRef,
      {
        enabled: updatedSettings.enabled,
        hours: updatedSettings.hours,
        minutes: updatedSettings.minutes,
      },
      { merge: true },
    );
  }

  async function updateReminderSettings(
    updatedSettings: ReminderSettings,
    action: "toggle" | "save" = "save",
  ) {
    if (!userId) return;

    const nativePlatform = Capacitor.isNativePlatform();
    const nativeAvailable = nativePlatform && Capacitor.isPluginAvailable("WaterReminder");
    setSavingSettings(true);

    try {
      if (!updatedSettings.enabled) {
        let cancellationError: unknown;
        if (nativeAvailable) {
          try {
            await waterReminderPlugin.cancelReminder();
          } catch (error) {
            cancellationError = error;
            console.error("Failed to cancel native water reminder", error);
          }
        }

        await saveReminderSettings(userId, updatedSettings);
        setSettings(updatedSettings);
        if (cancellationError) {
          toast.error(
            "Water reminders were disabled, but the scheduled notification could not be canceled.",
          );
        } else if (action === "toggle") {
          toast.success("Water reminders disabled.");
        }
        return;
      }

      const totalMinutes = updatedSettings.hours * 60 + updatedSettings.minutes;
      if (
        !Number.isFinite(updatedSettings.hours) ||
        !Number.isFinite(updatedSettings.minutes) ||
        updatedSettings.hours < 0 ||
        updatedSettings.minutes < 0 ||
        updatedSettings.minutes > 59 ||
        totalMinutes <= 0
      ) {
        toast.error("Choose a reminder interval greater than zero.");
        return;
      }

      if (nativeAvailable) {
        let permission: { granted?: boolean } | void;
        try {
          permission = await waterReminderPlugin.requestNotificationPermission();
        } catch (error) {
          console.error("Water reminder notification permission was not granted", error);
          const disabledSettings = { ...updatedSettings, enabled: false };
          setSettings(disabledSettings);
          await saveReminderSettings(userId, disabledSettings);
          toast.error(
            "Notifications are disabled. Allow notification permission to enable water reminders.",
          );
          return;
        }

        if (permission && permission.granted === false) {
          const disabledSettings = { ...updatedSettings, enabled: false };
          setSettings(disabledSettings);
          await saveReminderSettings(userId, disabledSettings);
          toast.error(
            "Notifications are disabled. Allow notification permission to enable water reminders.",
          );
          return;
        }

        try {
          await waterReminderPlugin.scheduleReminder({
            hours: updatedSettings.hours,
            minutes: updatedSettings.minutes,
          });
        } catch (error) {
          console.error("Failed to schedule native water reminder", error);
          const disabledSettings = { ...updatedSettings, enabled: false };
          setSettings(disabledSettings);
          await saveReminderSettings(userId, disabledSettings);
          toast.error("Could not schedule water reminders. The reminder has been disabled.");
          return;
        }
      }

      await saveReminderSettings(userId, updatedSettings);
      setSettings(updatedSettings);

      if (nativeAvailable) {
        toast.success("Water reminder scheduled.");
      } else if (nativePlatform) {
        toast.error(
          "Native water reminders are unavailable on this device. Your settings were saved, but no notification was scheduled.",
        );
      }
    } catch (error) {
      console.error("Failed to save reminder settings", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update water reminder settings.",
      );
    } finally {
      setSavingSettings(false);
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background text-muted-foreground grid place-items-center">
        Loading hydration dashboard...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased p-4 sm:p-8 pb-32">
      <AuroraBackground />
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="p-3 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-4xl sm:text-5xl mb-2 text-aurora">
                💧 Water Dashboard
              </h1>
              <p className="text-muted-foreground">
                Track hydration, water intake, and daily water goals.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Today's Hydration</CardTitle>
              <CardDescription>Daily water consumption status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Goal</span>
                  <span>{goal ? `${goal} ml` : "0 ml"}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Consumed</span>
                  <span>{waterConsumed} ml</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Remaining</span>
                  <span>{remaining} ml</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goalInput">Edit Daily Goal</Label>
                <div className="flex gap-3">
                  <Input
                    id="goalInput"
                    type="number"
                    value={goalInput}
                    onChange={(event) => setGoalInput(event.target.value)}
                    className="min-w-0"
                  />
                  <Button type="button" onClick={saveGoalValue} disabled={savingGoal}>
                    {savingGoal ? "Saving..." : "Save Goal"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Hydration Progress</CardTitle>
              <CardDescription>Goal completion percentage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-full bg-white/10 h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {waterConsumed} / {goal} ml
                </span>
                <span>{progress}%</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {["0%", "25%", "50%", "75%", "100%"].map((label) => (
                  <div key={label} className="rounded-full border border-white/10 px-2 py-1">
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Hydration Insights</CardTitle>
              <CardDescription>Score and status for today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-5xl font-semibold">{progress}%</div>
              <div className="text-lg text-muted-foreground">Status: {hydrationStatus}</div>
              <p className="text-sm text-muted-foreground">
                Your hydration score is calculated from the percentage of your daily water goal
                completed.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Quick Add Water</CardTitle>
              <CardDescription>Add hydration instantly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[100, 250, 500, 750, 1000].map((amount) => (
                  <Button key={amount} type="button" onClick={() => addWater(amount)}>
                    +{amount} ml
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Custom Water Entry</CardTitle>
              <CardDescription>Enter any amount manually.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customAmount">Amount (ml)</Label>
                  <Input
                    id="customAmount"
                    type="number"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={addCustomWater}
                  disabled={!customAmount || Number(customAmount) <= 0}
                >
                  Add Water
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Water Reminder Settings</CardTitle>
              <CardDescription>Save reminder preferences for later use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  id="notifyEnabled"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input bg-background"
                  checked={settings.enabled}
                  onChange={(event) =>
                    updateReminderSettings({ ...settings, enabled: event.target.checked }, "toggle")
                  }
                />
                <Label htmlFor="notifyEnabled">Enable reminders</Label>
              </div>
              <div>
                <Label>Reminder Interval</Label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="reminderHours">Hours</Label>
                    <Input
                      id="reminderHours"
                      type="number"
                      min={0}
                      max={24}
                      value={settings.hours}
                      onChange={(e) => {
                        const h = Math.max(0, Math.min(24, Number(e.target.value) || 0));
                        setSettings((s) => ({ ...s, hours: h }));
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="reminderMinutes">Minutes</Label>
                    <Input
                      id="reminderMinutes"
                      type="number"
                      min={0}
                      max={59}
                      value={settings.minutes}
                      onChange={(e) => {
                        const m = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                        setSettings((s) => ({ ...s, minutes: m }));
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Expected reminder time (approximate):{" "}
                  {settings.enabled
                    ? (() => {
                        try {
                          const now = new Date();
                          const totalMinutes =
                            (Number(settings.hours) || 0) * 60 + (Number(settings.minutes) || 0);
                          const next = new Date(now.getTime() + totalMinutes * 60 * 1000);
                          return format(next, "h:mm a");
                        } catch (e) {
                          return "--:--";
                        }
                      })()
                    : "Disabled"}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                WorkManager may delay reminders based on device conditions.
              </div>
              <Button
                type="button"
                disabled={savingSettings}
                onClick={() => updateReminderSettings(settings)}
              >
                {savingSettings ? "Saving..." : "Save Reminder Settings"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Today's Water Log</CardTitle>
            <CardDescription>Entries logged for {displayDate}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading entries...</div>
            ) : entries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground text-center">
                No water entries yet today.
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, index) => (
                  <div
                    key={`${entry.date}-${index}-${entry.amount}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
                  >
                    <div>
                      {entry.timestamp?.toDate
                        ? format(entry.timestamp.toDate(), "h:mm a")
                        : "--:--"}
                    </div>
                    <div className="font-medium">{entry.amount} ml</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Quick Actions</CardTitle>
            <CardDescription>Continue your hydration journey.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Button type="button" onClick={() => document.getElementById("customAmount")?.focus()}>
              Add Water
            </Button>
            <Button type="button" variant="outline" onClick={() => alert("Ready for Integration")}>
              View History
            </Button>
            <Button type="button" variant="outline" onClick={() => alert("Ready for Integration")}>
              Weekly Hydration Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
