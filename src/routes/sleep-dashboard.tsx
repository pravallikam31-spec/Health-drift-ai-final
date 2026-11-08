import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/sleep-dashboard")({
  component: SleepDashboardPage,
});

interface SleepTrackerPlugin {
  openTracker(): Promise<void>;
}

const sleepTrackerPlugin = registerPlugin<SleepTrackerPlugin>("SleepTracker");

function SleepDashboardPage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <SleepDashboardContent />
      </ProfileCheck>
    </AuthGate>
  );
}

function SleepDashboardContent() {
  const navigate = useNavigate();
  const [launchFailed, setLaunchFailed] = React.useState(false);
  const launchStarted = React.useRef(false);
  const isNative = Capacitor.isNativePlatform();
  const canLaunchNative = isNative && Capacitor.isPluginAvailable("SleepTracker");

  const launchTracker = React.useCallback(async () => {
    if (!canLaunchNative || launchStarted.current) return;
    launchStarted.current = true;
    setLaunchFailed(false);
    try {
      await sleepTrackerPlugin.openTracker();
      await navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Unable to open the native Sleep Tracker", error);
      launchStarted.current = false;
      setLaunchFailed(true);
      toast.error("Unable to open the native Sleep Tracker.");
    }
  }, [canLaunchNative, navigate]);

  React.useEffect(() => {
    if (canLaunchNative) void launchTracker();
  }, [canLaunchNative, launchTracker]);

  return (
    <main className="relative min-h-screen bg-background p-4 text-foreground antialiased sm:p-8">
      <AuroraBackground />
      <section className="relative z-10 mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-6 text-center">
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => navigate({ to: "/dashboard" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="font-display text-4xl text-aurora sm:text-5xl">Sleep Tracker</h1>
        {canLaunchNative ? (
          launchFailed ? (
            <Button type="button" onClick={() => void launchTracker()}>
              Open Sleep Tracker
            </Button>
          ) : (
            <p className="max-w-xl text-muted-foreground">Opening the native Sleep Tracker...</p>
          )
        ) : (
          <p className="max-w-xl text-muted-foreground">
            The native Sleep Tracker is available in the Android app.
          </p>
        )}
      </section>
    </main>
  );
}
