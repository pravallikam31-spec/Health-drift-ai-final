import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/steps-dashboard")({
  component: StepsDashboardPage,
});

function StepsDashboardPage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <StepsDashboard />
      </ProfileCheck>
    </AuthGate>
  );
}

function StepsDashboard() {
  const navigate = useNavigate();

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
                🚶 Steps Dashboard
              </h1>
              <p className="text-muted-foreground">
                Track your daily steps, activity progress, and walking goals.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Today's Steps</CardTitle>
              <CardDescription>Daily walking activity status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-5xl font-semibold">0</div>
              <div className="text-sm text-muted-foreground">Goal: 5000</div>
              <div className="text-sm text-muted-foreground">Progress: 0%</div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Step Progress</CardTitle>
              <CardDescription>See your goal completion at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Steps</span>
                <span className="text-lg font-semibold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Remaining Steps</span>
                <span className="text-lg font-semibold">5000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Goal Completion</span>
                <span className="text-lg font-semibold">0%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Activity Summary</CardTitle>
              <CardDescription>Basic walking metrics for the day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Distance Walked</span>
                <span className="text-lg font-semibold">0 km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Calories Burned</span>
                <span className="text-lg font-semibold">0 kcal</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Minutes</span>
                <span className="text-lg font-semibold">0 mins</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Weekly Steps</CardTitle>
            <CardDescription>Ready for future Firestore integration.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: "Monday", value: "0" },
                { label: "Tuesday", value: "0" },
                { label: "Wednesday", value: "0" },
                { label: "Thursday", value: "0" },
                { label: "Friday", value: "0" },
                { label: "Saturday", value: "0" },
                { label: "Sunday", value: "0" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="text-sm text-muted-foreground mb-2">{item.label}</div>
                  <div className="text-2xl font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Quick Actions</CardTitle>
            <CardDescription>Future step control options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="button" className="w-full sm:w-auto">
                Add Steps Manually
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                View History
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Weekly Report
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Ready for Integration</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Future Readiness</CardTitle>
            <CardDescription>Designed for wearables and step services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              {[
                "Mobile Step Counter",
                "Google Fit",
                "Samsung Health",
                "Apple Health",
                "Wearables",
                "Smart Watches",
              ].map((item) => (
                <li key={item} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              This screen is ready for future integration without needing design changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
