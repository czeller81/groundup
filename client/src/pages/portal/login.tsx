import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePortalAuth } from "@/lib/portal-auth";
import { Loader2 } from "lucide-react";
import { localizeApiError, useLocale } from "@/lib/locale";
import { track, trackEvent } from "@/lib/analytics";

export default function PortalLogin() {
  const [location, setLocation] = useLocation();
  const { login, signup, isAuthenticated } = usePortalAuth();
  const { locale, copy } = useLocale();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const routePath = location.split("?")[0];
  const isSpanishRoute = routePath === "/es/portal/login" || routePath === "/es/portal/signup";
  const isSignupRoute = routePath === "/portal/signup" || routePath === "/es/portal/signup";

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [discoveryClaimContext, setDiscoveryClaimContext] = useState<{ variant: "B"; firstName: string; email: string; phone: string } | null>(null);
  const discoveryIntent = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("intent") === "discovery-pass";
  const discoveryVariant = typeof window !== "undefined"
    ? (window.localStorage.getItem("groundup-discovery-variant") === "B" || discoveryClaimContext?.variant === "B" ? "B" : "A")
    : "A";

  useEffect(() => {
    if (!discoveryIntent) return;
    let cancelled = false;
    void fetch("/api/discovery-pass/claim-context")
      .then((response) => response.ok ? response.json() : null)
      .then((context) => {
        if (cancelled || !context || context.variant !== "B") return;
        setDiscoveryClaimContext(context);
        window.localStorage.setItem("groundup-discovery-variant", "B");
        setSignupData((current) => ({
          ...current,
          firstName: current.firstName || context.firstName || "",
          email: current.email || context.email || "",
          phone: current.phone || context.phone || "",
        }));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [discoveryIntent]);

  const postAuthPath = () => {
    const destination = locale === "es" || isSpanishRoute ? "/es/portal/dashboard" : "/portal/dashboard";
    if (!discoveryIntent || typeof window === "undefined") return destination;
    const params = new URLSearchParams({ intent: "discovery-pass" });
    const current = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "ttclid"]) {
      const value = current.get(key);
      if (value) params.set(key, value.slice(0, 200));
    }
    return `${destination}?${params.toString()}`;
  };

  useEffect(() => {
    if (isAuthenticated) {
      setLocation(postAuthPath());
    }
  }, [isAuthenticated, isSpanishRoute, locale, setLocation]);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginData.email, loginData.password, discoveryIntent);
      trackEvent("member_login_completed", { method: "password", locale });
      if (discoveryIntent) {
        window.localStorage.setItem("groundup-discovery-onboarding", "1");
      }
      toast({ title: copy.welcomeToast, description: copy.loggedInSuccessfully });
      setLocation(postAuthPath());
    } catch (error: any) {
      toast({
        title: copy.loginFailed,
        description: localizeApiError(error.message, locale, copy.invalidEmailPassword),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      toast({ title: copy.error, description: copy.passwordsDoNotMatch, variant: "destructive" });
      return;
    }
    if (signupData.password.length < 8) {
      toast({ title: copy.error, description: copy.passwordMinLength, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await signup({
        email: signupData.email,
        password: signupData.password,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        phone: signupData.phone || undefined,
        locale,
        discoveryIntent,
      });
      trackEvent("member_signup_completed", { method: "password", locale });
      if (discoveryIntent) {
        window.localStorage.setItem("groundup-discovery-onboarding", "1");
        trackEvent("discovery_account_created", { locale, variant: discoveryVariant });
        track("discovery_account_created", "training", { funnel_kind: "discovery_pass", locale, variant: discoveryVariant });
      }
      toast({ title: copy.accountCreated, description: copy.welcomeToGroundUp });
      setLocation(postAuthPath());
    } catch (error: any) {
      toast({
        title: copy.signupFailed,
        description: localizeApiError(error.message, locale, copy.failedToCreateAccount),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#B06CFF]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#5EEBFF]/10 rounded-full blur-3xl" />
      <Card className="w-full max-w-md relative z-10 bg-[#121826] border-white/10" data-testid="portal-login-card">
        <CardHeader className="text-center">
          <a href={locale === "es" ? "/es" : "/"} className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-300">
            ← {copy.backToWebsite}
          </a>
          <CardTitle className="text-2xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {copy.login}
          </CardTitle>
          <CardDescription className="text-gray-400">{copy.loginDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={isSignupRoute ? "signup" : "login"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">{copy.loginTab}</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">{copy.signup}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{copy.email}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder={copy.emailPlaceholder}
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    data-testid="input-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{copy.password}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={copy.passwordPlaceholder}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    data-testid="input-login-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {copy.loginTab}
                </Button>
                <a
                  href={locale === "es" ? "/es/portal/reset-password" : "/portal/reset-password"}
                  className="block text-center text-sm text-gray-400 underline underline-offset-4 hover:text-white"
                >
                  {copy.forgotPassword}
                </a>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{copy.firstName}</Label>
                    <Input
                      id="firstName"
                      placeholder={copy.firstName}
                      value={signupData.firstName}
                      onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                      required
                      data-testid="input-signup-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{copy.lastName}</Label>
                    <Input
                      id="lastName"
                      placeholder={copy.lastName}
                      value={signupData.lastName}
                      onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                      required
                      data-testid="input-signup-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{copy.email}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder={copy.emailPlaceholder}
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    data-testid="input-signup-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{copy.phoneOptional}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(555) 123-4567"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                    data-testid="input-signup-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{copy.password}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={copy.atLeastEightCharacters}
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    data-testid="input-signup-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{copy.confirmPassword}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder={copy.confirmYourPassword}
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    required
                    data-testid="input-signup-confirm"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signup">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {copy.createAccount}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
