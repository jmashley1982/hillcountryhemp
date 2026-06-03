import { useGetMe, useUpdateEmail, useUpdatePassword } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, Loader2 } from "lucide-react";

export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useGetMe();

  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: "" });
  const [emailError, setEmailError] = useState("");

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (!userLoading && !user) setLocation("/login");
  }, [user, userLoading, setLocation]);

  const updateEmail = useUpdateEmail({
    mutation: {
      onSuccess: () => {
        setEmailForm({ currentPassword: "", newEmail: "" });
        setEmailError("");
        queryClient.invalidateQueries({ queryKey: ["getMe"] });
        toast({ title: "Email updated", description: "Your email address has been changed." });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Something went wrong";
        setEmailError(msg);
      },
    },
  });

  const updatePassword = useUpdatePassword({
    mutation: {
      onSuccess: () => {
        setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
        setPwError("");
        toast({ title: "Password updated", description: "Your password has been changed." });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Something went wrong";
        setPwError(msg);
      },
    },
  });

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    if (!emailForm.newEmail.trim()) {
      setEmailError("New email is required");
      return;
    }
    updateEmail.mutate({ data: emailForm });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.newPassword.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("Passwords do not match");
      return;
    }
    updatePassword.mutate({ data: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword } });
  }

  if (userLoading) {
    return (
      <div className="p-12 text-center font-bold text-xl animate-pulse">Loading...</div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-bold mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>
          </Link>
          <h1 className="text-4xl text-[#99CC66]">Account Settings</h1>
          <p className="text-muted-foreground font-bold mt-1 truncate">{user?.email}</p>
        </div>

        <div className="space-y-6">
          {/* Change Email */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-[#99CC66]" />
              <h2 className="text-xl font-heading text-foreground">Change Email</h2>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-current-pw">Current Password</Label>
                <Input
                  id="email-current-pw"
                  type="password"
                  autoComplete="current-password"
                  value={emailForm.currentPassword}
                  onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  className="bg-background border-2"
                  data-testid="input-email-current-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
                  className="bg-background border-2"
                  data-testid="input-new-email"
                />
              </div>
              {emailError && (
                <p className="text-sm text-destructive font-bold" data-testid="error-email">{emailError}</p>
              )}
              <Button
                type="submit"
                disabled={updateEmail.isPending}
                className="font-bold bg-primary"
                data-testid="button-update-email"
              >
                {updateEmail.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Email
              </Button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-[#99CC66]" />
              <h2 className="text-xl font-heading text-foreground">Change Password</h2>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw-current">Current Password</Label>
                <Input
                  id="pw-current"
                  type="password"
                  autoComplete="current-password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  className="bg-background border-2"
                  data-testid="input-current-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">New Password</Label>
                <Input
                  id="pw-new"
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  className="bg-background border-2"
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-confirm">Confirm New Password</Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  className="bg-background border-2"
                  data-testid="input-confirm-password"
                />
              </div>
              {pwError && (
                <p className="text-sm text-destructive font-bold" data-testid="error-password">{pwError}</p>
              )}
              <Button
                type="submit"
                disabled={updatePassword.isPending}
                className="font-bold bg-primary"
                data-testid="button-update-password"
              >
                {updatePassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
