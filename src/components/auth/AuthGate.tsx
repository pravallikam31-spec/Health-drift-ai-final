import * as React from "react";
import { ClientOnly } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Mail, RefreshCw } from "lucide-react";

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased grid place-items-center px-6">
      <div className="w-full max-w-md glass-strong rounded-2xl p-8 border border-white/10">
        <div className="mb-6">
          <div className="font-display text-xs tracking-[0.3em] text-aurora mb-2">NEXUS</div>
          <h1 className="font-display text-2xl text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register" && password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
        toast.success("Verification email sent. Check your inbox.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title={mode === "login" ? "Welcome back" : "Create your account"}
      subtitle={
        mode === "login"
          ? "Sign in to continue to Health Drift AI"
          : "Predictive healthcare, personalized."
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <button className="text-aurora hover:underline" onClick={() => setMode("register")}>
              Register
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button className="text-aurora hover:underline" onClick={() => setMode("login")}>
              Sign in
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}

function VerifyScreen() {
  const { user, resendVerification, refreshVerification, logout } = useAuth();
  const [busy, setBusy] = React.useState(false);

  return (
    <Shell title="Verify your email" subtitle={`We sent a verification link to ${user?.email}.`}>
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 mb-4">
        <Mail className="h-5 w-5 text-aurora" />
        <p className="text-sm text-muted-foreground">
          Click the link in your email, then refresh status below to continue.
        </p>
      </div>
      <div className="space-y-2">
        <Button
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const ok = await refreshVerification();
              if (ok) toast.success("Email verified!");
              else toast.message("Still not verified. Try again in a moment.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh Verification Status
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await resendVerification();
              toast.success("Verification email resent.");
            } catch (e: any) {
              toast.error(e?.message ?? "Could not resend");
            } finally {
              setBusy(false);
            }
          }}
        >
          Resend Verification Email
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => logout()}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </Shell>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  if (!user.emailVerified) return <VerifyScreen />;

  return <>{children}</>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <AuthProvider>
        <Gate>{children}</Gate>
      </AuthProvider>
    </ClientOnly>
  );
}
