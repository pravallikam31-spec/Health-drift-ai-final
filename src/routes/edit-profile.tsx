import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/lib/auth-context";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import { ProfileForm, ProfileData } from "@/components/profile/ProfileForm";
import { GlowButton } from "@/components/ui/GlowButton";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/edit-profile")({
  component: EditProfilePage,
});

function EditProfilePage() {
  return (
    <AuthGate>
      <EditProfileContent />
    </AuthGate>
  );
}

function EditProfileContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [initialData, setInitialData] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      await navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  React.useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInitialData(docSnap.data() as ProfileData);
        }
      } catch (err) {
        console.error("Error fetching profile for edit:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased py-12 px-6">
      <AuroraBackground />
      <div className="w-full max-w-2xl mx-auto glass-strong rounded-2xl p-8 border border-white/10 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl mb-2">Edit Profile</h1>
          <p className="text-sm text-muted-foreground">
            Update your personal and health information.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-10">Loading profile...</div>
        ) : (
          <ProfileForm initialData={initialData} />
        )}

        <div className="mt-10 border-t border-white/10 pt-6">
          <GlowButton
            type="button"
            variant="ghost"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full justify-center border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {loggingOut ? "Logging out..." : "Logout"}
          </GlowButton>
        </div>
      </div>
    </div>
  );
}
