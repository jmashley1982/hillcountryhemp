import { useState, useEffect } from "react";
import { useResetPassword } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

function useSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = useSearchParam("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const resetPassword = useResetPassword();

  useEffect(() => {
    if (!token) {
      setTokenError("No reset token found. Please request a new link.");
    }
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    resetPassword.mutate(
      { data: { token, newPassword } },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => setLocation("/login"), 3000);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Invalid or expired link. Please request a new one.";
          setTokenError(msg);
        },
      },
    );
  };

  if (tokenError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md bg-card p-8 rounded-xl border-2 border-border shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-950/40 border-2 border-red-700 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h1 className="text-2xl text-foreground mb-3">Link Expired</h1>
          <p className="text-muted-foreground font-medium text-sm mb-6">{tokenError}</p>
          <Link href="/forgot-password">
            <Button className="font-bold">Request a New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md bg-card p-8 rounded-xl border-2 border-border shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#99CC66]/20 border-2 border-[#99CC66]/40 mb-4">
            <CheckCircle className="h-6 w-6 text-[#99CC66]" />
          </div>
          <h1 className="text-2xl text-[#99CC66] mb-2">Password Updated!</h1>
          <p className="text-muted-foreground font-medium text-sm">
            Your password has been changed. Redirecting you to login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md bg-card p-8 rounded-xl border-2 border-border shadow-xl">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-bold mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>

        <h1 className="text-3xl text-primary text-center mb-2">Set New Password</h1>
        <p className="text-muted-foreground text-center font-bold mb-8 text-sm">
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="font-bold uppercase text-xs tracking-wider text-foreground">
              New Password
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-2 font-medium"
              placeholder="At least 6 characters"
              autoFocus
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="font-bold uppercase text-xs tracking-wider text-foreground">
              Confirm Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-2 font-medium"
              placeholder="Repeat your new password"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full font-bold text-lg border-b-4 border-black/20"
            size="lg"
            disabled={resetPassword.isPending || !newPassword || !confirmPassword}
          >
            {resetPassword.isPending ? "Saving…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
