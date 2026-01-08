import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortalAuthProvider } from "@/lib/portal-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import PersonalTraining from "@/pages/personal-training";
import Coaches from "@/pages/coaches";
import Pricing from "@/pages/pricing";
import Contact from "@/pages/contact";
import Admin from "@/pages/admin";
import PortalLogin from "@/pages/portal/login";
import PortalDashboard from "@/pages/portal/dashboard";
import PortalForm from "@/pages/portal/form";
import PortalBooking from "@/pages/portal/booking";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <MainLayout><Home /></MainLayout>
      </Route>
      <Route path="/personal-training">
        <MainLayout><PersonalTraining /></MainLayout>
      </Route>
      <Route path="/coaches">
        <MainLayout><Coaches /></MainLayout>
      </Route>
      <Route path="/pricing">
        <MainLayout><Pricing /></MainLayout>
      </Route>
      <Route path="/contact">
        <MainLayout><Contact /></MainLayout>
      </Route>
      <Route path="/admin">
        <MainLayout><Admin /></MainLayout>
      </Route>
      
      <Route path="/portal/login" component={PortalLogin} />
      <Route path="/portal/dashboard" component={PortalDashboard} />
      <Route path="/portal/forms/:slug" component={PortalForm} />
      <Route path="/portal/booking" component={PortalBooking} />
      
      <Route>
        <MainLayout><NotFound /></MainLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PortalAuthProvider>
          <Toaster />
          <Router />
        </PortalAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
