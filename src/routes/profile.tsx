import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { useAuth } from "@/lib/auth-context";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { ProfileForm } from "@/components/profile/ProfileForm";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AuthGate>
      <ProfileCheck>
        <ProfileContent />
      </ProfileCheck>
    </AuthGate>
  );
}

function ProfileContent() {
  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased py-12 px-6">
      <AuroraBackground />
      <div className="w-full max-w-2xl mx-auto glass-strong rounded-2xl p-8 border border-white/10 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl mb-2">Create Profile</h1>
          <p className="text-sm text-muted-foreground">
            Welcome to Nexus Health Drift AI. Let's set up your profile to personalize your
            experience.
          </p>
        </div>

        <ProfileForm />
      </div>
    </div>
  );
}
