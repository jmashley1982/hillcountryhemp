import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();
  const { data: user } = useGetMe();

  useEffect(() => {
    if (user) {
      setLocation(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      toast({ title: "Password updated!", description: "You can now log in with your new password." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginForm) => {
    login.mutate({ data }, {
      onSuccess: (res) => {
        toast({ title: "Welcome back", description: "Logged in successfully." });
        setLocation(res.role === 'admin' ? '/admin' : '/dashboard');
      },
      onError: (err: any) => {
        toast({ 
          title: "Login failed", 
          description: err.error || "Invalid credentials", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md bg-card p-8 rounded-xl border-2 border-border shadow-xl">
        <h1 className="text-3xl text-primary text-center mb-2">Business Login</h1>
        <p className="text-muted-foreground text-center font-bold mb-8">Manage your store listing</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs tracking-wider">Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-2 font-medium" />
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
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-bold uppercase text-xs tracking-wider">Password</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium">
                      Forgot password?
                    </Link>
                  </div>
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
              disabled={login.isPending}
            >
              {login.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center text-sm font-bold text-muted-foreground">
          Don't have an account? <Link href="/register" className="text-primary hover:underline">Register here</Link>
        </div>
      </div>
    </div>
  );
}
