import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister, useGetMe } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Sparkles, Mail } from "lucide-react";

const CONTACT_EMAIL = "hempfindertx@gmail.com";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const register = useRegister();
  const { data: user } = useGetMe();

  useEffect(() => {
    if (user) {
      setLocation(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, setLocation]);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (data: RegisterForm) => {
    register.mutate({ data: { email: data.email, password: data.password } }, {
      onSuccess: () => {
        toast({ title: "Account created", description: "Welcome to Hill Country Hemp Finder." });
        setLocation('/dashboard');
      },
      onError: (err: unknown) => {
        const msg = (err as { error?: string })?.error ?? "Could not create account";
        toast({
          title: "Registration failed",
          description: msg,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-4">

        {/* Beta Notice */}
        <div className="bg-[#99CC66]/10 border-2 border-[#99CC66]/30 rounded-xl p-4 flex gap-3">
          <Sparkles className="h-5 w-5 text-[#99CC66] shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-[#99CC66] mb-1">🌿 Hill Country Hemp Finder — Beta</p>
            <p className="text-muted-foreground leading-relaxed">
              We're gearing up for a full public release on the App Store. Signing up now and completing your profile helps solidify the platform and gives your shop prime visibility at launch. Early listings get the best spot on the map.
            </p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-xl border-2 border-border shadow-xl">
          <h1 className="text-3xl text-primary text-center mb-2">Claim Your Spot</h1>
          <p className="text-muted-foreground text-center font-bold mb-8">List your store on Hill Country Hemp Finder</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider">Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" className="border-2 font-medium" placeholder="you@yourbusiness.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider">Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="border-2 font-medium" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider">Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="border-2 font-medium" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full font-bold text-lg border-b-4 border-black/20"
                size="lg"
                disabled={register.isPending}
              >
                {register.isPending ? "Creating Account…" : "Create Account"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm font-bold text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">Login here</Link>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center text-sm text-muted-foreground pb-2">
          <span>Questions? </span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold"
          >
            <Mail className="h-3.5 w-3.5" />
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}
