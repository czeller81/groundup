import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortalAuthProvider } from "@/lib/portal-auth";
import { HelmetProvider } from "react-helmet-async";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import PersonalTraining from "@/pages/personal-training";
import Coaches from "@/pages/coaches";
import Pricing from "@/pages/pricing";
import Contact from "@/pages/contact";
import Admin from "@/pages/admin";
import PortalLogin from "@/pages/portal/login";
import PortalResetPassword from "@/pages/portal/reset-password";
import PortalDashboard from "@/pages/portal/dashboard";
import PortalForm from "@/pages/portal/form";
import PortalClasses from "@/pages/portal/classes";
import MyClasses from "@/pages/portal/my-classes";
import ClassAdmin from "@/pages/portal/class-admin";
import PortalAdminMembers from "@/pages/portal/admin";
import PortalCoach from "@/pages/portal/coach";
import LiveSchedule from "@/pages/live-schedule";
import FirstVisitBooking from "@/pages/first-visit-booking";
import WomensSelfDefense from "@/pages/womens-self-defense";
import Girls from "@/pages/girls";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import PortalNavbar from "@/components/layout/portal-navbar";
import AdaptiveCapacity from "@/pages/adaptive-capacity";
import AnalyticsConsent from "@/components/analytics-consent";
import Privacy from "@/pages/privacy";
import MetaPixel from "@/components/meta-pixel";
import { SpanishHome, SpanishPrograms, SpanishSchedule, SpanishBooking, SpanishContact, SpanishPrivacy } from "@/pages/spanish";
import { LocaleProvider } from "@/lib/locale";

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
    <div className="min-h-screen bg-[#0B0F14]">
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
      <Route path="/privacy">
        <MainLayout><Privacy /></MainLayout>
      </Route>
      <Route path="/schedule">
        <MainLayout><LiveSchedule /></MainLayout>
      </Route>
      <Route path="/book">
        <MainLayout><FirstVisitBooking /></MainLayout>
      </Route>
      <Route path="/womens-self-defense">
        <MainLayout><WomensSelfDefense /></MainLayout>
      </Route>
      <Route path="/girls">
        <MainLayout><Girls /></MainLayout>
      </Route>
      <Route path="/kids">
        <Redirect to="/girls" />
      </Route>
      <Route path="/adaptive-capacity">
        <MainLayout><AdaptiveCapacity /></MainLayout>
      </Route>
      <Route path="/es">
        <SpanishHome />
      </Route>
      <Route path="/es/programas">
        <SpanishPrograms />
      </Route>
      <Route path="/es/horario">
        <SpanishSchedule />
      </Route>
      <Route path="/es/reservar">
        <SpanishBooking />
      </Route>
      <Route path="/es/contacto">
        <SpanishContact />
      </Route>
      <Route path="/es/privacidad">
        <SpanishPrivacy />
      </Route>
      <Route path="/admin">
        <MainLayout><Admin /></MainLayout>
      </Route>
      
      <Route path="/ln/login"><Redirect to="/portal/login" /></Route>
      <Route path="/es/portal/login" component={PortalLogin} />
      <Route path="/portal/login" component={PortalLogin} />
      <Route path="/es/portal/reset-password" component={PortalResetPassword} />
      <Route path="/portal/reset-password" component={PortalResetPassword} />
      <Route path="/es/portal/dashboard">
        <PortalLayout><PortalDashboard /></PortalLayout>
      </Route>
      <Route path="/portal/dashboard">
        <PortalLayout><PortalDashboard /></PortalLayout>
      </Route>
      <Route path="/es/portal/forms/:slug">
        <PortalLayout><PortalForm /></PortalLayout>
      </Route>
      <Route path="/portal/forms/:slug">
        <PortalLayout><PortalForm /></PortalLayout>
      </Route>
      <Route path="/es/portal/booking">
        <Redirect to="/es/portal/schedule" />
      </Route>
      <Route path="/portal/booking">
        <Redirect to="/portal/schedule" />
      </Route>
      <Route path="/es/portal/my-classes">
        <PortalLayout><MyClasses /></PortalLayout>
      </Route>
      <Route path="/portal/my-classes">
        <PortalLayout><MyClasses /></PortalLayout>
      </Route>
      <Route path="/es/portal/admin">
        <PortalLayout><PortalAdminMembers /></PortalLayout>
      </Route>
      <Route path="/portal/admin">
        <PortalLayout><PortalAdminMembers /></PortalLayout>
      </Route>
      <Route path="/es/portal/class-admin">
        <PortalLayout><ClassAdmin /></PortalLayout>
      </Route>
      <Route path="/portal/class-admin">
        <PortalLayout><ClassAdmin /></PortalLayout>
      </Route>
      <Route path="/es/portal/coach">
        <PortalLayout><PortalCoach /></PortalLayout>
      </Route>
      <Route path="/portal/coach">
        <PortalLayout><PortalCoach /></PortalLayout>
      </Route>
      <Route path="/es/portal/schedule">
        <PortalLayout><PortalClasses /></PortalLayout>
      </Route>
      <Route path="/portal/schedule">
        <PortalLayout><PortalClasses /></PortalLayout>
      </Route>
      
      <Route>
        <MainLayout><NotFound /></MainLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <LocaleProvider>
        <AnalyticsConsent />
        <MetaPixel />
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <PortalAuthProvider>
              <Toaster />
              <Router />
            </PortalAuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </HelmetProvider>
  );
}

export default App;
