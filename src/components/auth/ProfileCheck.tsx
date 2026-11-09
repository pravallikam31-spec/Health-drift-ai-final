import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Module-level cache to avoid duplicate reads in the same session
const profileCache: Record<string, boolean> = {};

export function markProfileCompleteLocally(uid: string) {
  profileCache[uid] = true;
}

export function ProfileCheck({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = React.useState(true);
  const routerState = useRouterState();

  React.useEffect(() => {
    async function checkProfile() {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        let hasProfile = false;

        if (profileCache[user.uid]) {
          hasProfile = true;
        } else {
          const docRef = doc(db, "profiles", user.uid);
          const docSnap = await getDoc(docRef);
          hasProfile = docSnap.exists();
          if (hasProfile) {
            profileCache[user.uid] = true;
          }
        }

        if (!hasProfile && routerState.location.pathname !== "/profile") {
          navigate({ to: "/profile", replace: true });
        } else if (hasProfile && routerState.location.pathname === "/profile") {
          navigate({ to: "/dashboard", replace: true });
        } else {
          setChecking(false);
        }
      } catch (err) {
        console.error("Error checking profile:", err);
        // Treat error as no profile to prevent unauthorized dashboard access
        if (routerState.location.pathname !== "/profile") {
          navigate({ to: "/profile", replace: true });
        } else {
          setChecking(false);
        }
      }
    }

    checkProfile();
  }, [user, navigate, routerState.location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background text-muted-foreground grid place-items-center">
        Checking profile...
      </div>
    );
  }

  return <>{children}</>;
}
