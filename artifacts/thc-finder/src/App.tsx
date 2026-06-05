import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AgeGate } from "@/components/age-gate";
import { PopupAd } from "@/components/popup-ad";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Advertise from "@/pages/advertise";
import BusinessDetail from "@/pages/business-detail";
import Dashboard from "@/pages/dashboard";
import AddEditBusiness from "@/pages/add-edit-business";
import Admin from "@/pages/admin";
import AccountSettings from "@/pages/account-settings";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/advertise" component={Advertise} />
        <Route path="/business/:id" component={BusinessDetail} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/add" component={AddEditBusiness} />
        <Route path="/dashboard/edit/:id" component={AddEditBusiness} />
        <Route path="/admin" component={Admin} />
        <Route path="/account-settings" component={AccountSettings} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AgeGate />
          <PopupAd />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
