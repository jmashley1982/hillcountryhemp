import { useState } from "react";
import { useForgotPassword } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    forgotPassword.mutate(
      { data: { email: email.trim() } },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
        onError: () => {
          toast({
            title: "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md bg-card p-8 rounded-xl border-2 border-border shadow-xl">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-bold mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>

        {submitted ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#99CC66]/20 border-2 border-[#99CC66]/40 mb-4">
              <Mail className="h-6 w-6 text-[#99CC66]" />
            </div>
            <h1 className="text-2xl text-[#99CC66] mb-2">Check your email</h1>
            <p className="text-muted-foreground font-medium text-sm leading-relaxed">
              If an account with <strong className="text-foreground">{email}</strong> exists,
              we've sent a password reset link. Check your inbox (and spam folder).
            </p>
            <p className="text-xs text-muted-foreground/60 mt-4">
              The link expires in 1 hour.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl text-primary text-center mb-2">Forgot Password?</h1>
            <p className="text-muted-foreground text-center font-bold mb-8 text-sm">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-bold uppercase text-xs tracking-wider text-foreground">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 font-medium"
                  placeholder="you@example.com"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full font-bold text-lg border-b-4 border-black/20"
                size="lg"
                disabled={forgotPassword.isPending || !email.trim()}
              >
                {forgotPassword.isPending ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
