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
import { useLocale } from "@/lib/locale";

export default function PortalLogin() {
  const [, setLocation] = useLocation();
  const { login, signup, isAuthenticated } = usePortalAuth();
  const { locale, copy } = useLocale();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/portal/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast({ title: locale === "es" ? "¡Bienvenida de nuevo!" : "Welcome back!", description: locale === "es" ? "Has iniciado sesión correctamente." : "You have been logged in successfully." });
      setLocation("/portal/dashboard");
    } catch (error: any) {
      toast({
        title: locale === "es" ? "No se pudo iniciar sesión" : "Login failed",
        description: error.message || (locale === "es" ? "Correo o contraseña no válidos" : "Invalid email or password"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      toast({ title: locale === "es" ? "Error" : "Error", description: locale === "es" ? "Las contraseñas no coinciden" : "Passwords do not match", variant: "destructive" });
      return;
    }
    if (signupData.password.length < 8) {
      toast({ title: "Error", description: locale === "es" ? "La contraseña debe tener al menos 8 caracteres" : "Password must be at least 8 characters", variant: "destructive" });
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
      });
      toast({ title: locale === "es" ? "¡Cuenta creada!" : "Account created!", description: locale === "es" ? "Bienvenida a Ground Up." : "Welcome to Ground Up." });
      setLocation("/portal/dashboard");
    } catch (error: any) {
      toast({
        title: locale === "es" ? "No se pudo crear la cuenta" : "Signup failed",
        description: error.message || (locale === "es" ? "No se pudo crear la cuenta" : "Failed to create account"),
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
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">{locale === "es" ? "Iniciar sesión" : "Login"}</TabsTrigger>
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
                    placeholder={locale === "es" ? "tu@correo.com" : "your@email.com"}
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
                    placeholder={locale === "es" ? "Escribe tu contraseña" : "Enter your password"}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    data-testid="input-login-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {locale === "es" ? "Iniciar sesión" : "Login"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{locale === "es" ? "Nombre" : "First name"}</Label>
                    <Input
                      id="firstName"
                      placeholder={locale === "es" ? "Nombre" : "First name"}
                      value={signupData.firstName}
                      onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                      required
                      data-testid="input-signup-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{locale === "es" ? "Apellido" : "Last name"}</Label>
                    <Input
                      id="lastName"
                      placeholder={locale === "es" ? "Apellido" : "Last name"}
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
                    placeholder={locale === "es" ? "tu@correo.com" : "your@email.com"}
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    data-testid="input-signup-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{locale === "es" ? "Teléfono (opcional)" : "Phone (optional)"}</Label>
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
                    placeholder={locale === "es" ? "Al menos 8 caracteres" : "At least 8 characters"}
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    data-testid="input-signup-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{locale === "es" ? "Confirmar contraseña" : "Confirm password"}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder={locale === "es" ? "Confirma tu contraseña" : "Confirm your password"}
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    required
                    data-testid="input-signup-confirm"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signup">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {locale === "es" ? "Crear cuenta" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
