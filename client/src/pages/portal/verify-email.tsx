import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useLocale } from "@/lib/locale";

export default function PortalVerifyEmail() {
  const [, setLocation] = useLocation();
  const { locale } = useLocale();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("error");
      setMessage(locale === "es" ? "Este enlace no es válido." : "This verification link is not valid.");
      return;
    }
    void apiRequest("POST", "/api/portal/email-verification/verify", { token })
      .then(async (response) => {
        const result = await response.json();
        setState("success");
        setMessage(result.user?.accountStatus === "needs_review"
          ? (locale === "es" ? "Tu correo está confirmado. El equipo revisará tu cuenta antes de habilitarla." : "Your email is verified. Staff will review your account before member access is enabled.")
          : (locale === "es" ? "Tu correo está confirmado. Ya puedes continuar." : "Your email is verified. You can continue."));
        window.setTimeout(() => setLocation(locale === "es" ? "/es/portal/dashboard" : "/portal/dashboard"), 900);
      })
      .catch((error: Error) => {
        setState("error");
        setMessage(error.message || (locale === "es" ? "Este enlace venció o no es válido." : "This link has expired or is invalid."));
      });
  }, [locale, setLocation]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] p-4 text-white">
      <Card className="w-full max-w-md border-white/10 bg-[#121826]">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-[#5EEBFF]" />
          <CardTitle>{locale === "es" ? "Verificación de correo" : "Email verification"}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {state === "loading" ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : <p className="text-gray-300">{message}</p>}
          {state === "error" ? (
            <Button className="mt-5" onClick={() => setLocation(locale === "es" ? "/es/portal/login" : "/portal/login")}>
              {locale === "es" ? "Volver a iniciar sesión" : "Return to sign in"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}