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
import PortalAdminMembers from "@/pages/portal/admin";
import PortalCoach from "@/pages/portal/coach";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import PortalNavbar from "@/components/layout/portal-navbar";

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0F14] overflow-x-hidden">
      <PortalNavbar />
      {children}
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
      <Route path="/portal/dashboard">
        <PortalLayout><PortalDashboard /></PortalLayout>
      </Route>
      <Route path="/portal/forms/:slug">
        <PortalLayout><PortalForm /></PortalLayout>
      </Route>
      <Route path="/portal/booking">
        <PortalLayout><PortalBooking /></PortalLayout>
      </Route>
      <Route path="/portal/admin">
        <PortalLayout><PortalAdminMembers /></PortalLayout>
      </Route>
      <Route path="/portal/coach">
        <PortalLayout><PortalCoach /></PortalLayout>
      </Route>
      
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
