import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/sleep-dashboard")({
  component: SleepDashboardPage,
});

function SleepDashboardPage() {
  const navigate = useNavigate();

  return (
    <AuthGate>
      <ProfileCheck>
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
            <h1 className="font-display text-4xl text-aurora sm:text-5xl">
              Sleep Tracker
            </h1>
            <p className="max-w-xl text-muted-foreground">
              The new native Sleep Tracker will be integrated here later.
            </p>
          </section>
        </main>
      </ProfileCheck>
    </AuthGate>
  );
}
