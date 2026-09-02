import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { setLocale, useLocale } from "@/lib/locale";
import { Loader2 } from "lucide-react";

export default function PortalResetPassword() {
  const [location, setLocation] = useLocation();
  const { locale, copy } = useLocale();
  const { toast } = useToast();
  const isSpanishRoute = location === "/es/portal/reset-password";
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", [location]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (isSpanishRoute) {
      setLocale("es");
      document.documentElement.lang = "es";
    }
  }, [isSpanishRoute]);

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/portal/password-reset/request", { email, locale });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  const completeReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/portal/password-reset/complete", { token, password });
      setCompleted(true);
      toast({ title: copy.passwordUpdated });
    } catch (error: any) {
      toast({ title: copy.invalidReset, description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#121826] border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-white">{copy.passwordUpdated}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation(isSpanishRoute ? "/es/portal/login" : "/portal/login")}>
              {copy.backToLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4 relative overflow-hidden">
      <Card className="w-full max-w-md relative z-10 bg-[#121826] border-white/10">
        <CardHeader className="text-center">
          <a href={isSpanishRoute ? "/es/portal/login" : "/portal/login"} className="mb-2 inline-flex justify-center text-xs text-gray-500 hover:text-gray-300">
            ← {copy.backToLogin}
          </a>
          <CardTitle className="text-2xl text-white" style={{ fontFamily: "var(--font-display)" }}>
            {copy.resetPassword}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {token ? copy.newPassword : copy.resetDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <form onSubmit={completeReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">{copy.newPassword}</Label>
                <Input id="reset-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {copy.updatePassword}
              </Button>
            </form>
          ) : sent ? (
            <p className="text-center text-gray-300">{copy.resetSent}</p>
          ) : (
            <form onSubmit={requestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">{copy.email}</Label>
                <Input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {copy.sendResetLink}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}