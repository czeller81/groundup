import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { ClassCard } from "@/components/class-card";
import type { LiveClass } from "@/lib/class-booking";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { localizeApiError, useLocale } from "@/lib/locale";
import { localizedPortalPath } from "@/lib/portal-navigation";
import { usePortalAuth } from "@/lib/portal-auth";
import { Button } from "@/components/ui/button";

export default function PortalClasses() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const { locale, copy } = useLocale();
  const portalPath = (path: string) => localizedPortalPath(path, locale);
  const { data = [], isLoading, isError, refetch } = useQuery<LiveClass[]>({
    queryKey: ["/api/portal/classes"],
    enabled: isAuthenticated,
  });
  const reserve = useMutation({
    mutationFn: async (occurrenceId: string) => (await apiRequest("POST", "/api/portal/class-reservations", { occurrenceId })).json(),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-classes"] });
      toast({
        title: reservation.status === "waitlisted" ? copy.classFullNow : copy.classBooked,
        description: reservation.status === "waitlisted"
          ? copy.waitlistAdded
          : copy.spotConfirmed,
      });
    },
    onError: (error: Error) => toast({ title: copy.couldNotBook, description: localizeApiError(error.message, locale, copy.couldNotBook), variant: "destructive" }),
  });
  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation(portalPath("/portal/login"));
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || (isAuthenticated && isLoading)) {
    return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#0B0F14]"><Loader2 className="h-8 w-8 animate-spin text-[#5EEBFF]" /></main>;
  }
  if (!isAuthenticated) return null;

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-3 py-6 text-white sm:px-4 sm:py-10">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#5EEBFF]">{copy.liveAvailability}</p>
        <h1 className="mt-3 break-words text-3xl font-black uppercase sm:text-4xl">{copy.findNextClass}</h1>
        <p className="mt-3 text-gray-400">{copy.findNextClassDescription}</p>
        <p className="mt-2 text-xs text-gray-500">{copy.bookingManaged}</p>
      </div>
      {isError ? (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
            <div>
              <p className="font-semibold text-red-200">{copy.loadError}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 border-red-400/30 text-red-200 hover:bg-red-400/10">
                <RefreshCw className="mr-2 h-3.5 w-3.5" />{copy.tryAgain}
              </Button>
            </div>
          </div>
        </div>
      ) : data.length ? (
        <div className="mt-8 space-y-4">
          {data.map((occurrence) => (
            <ClassCard
              key={occurrence.id}
              occurrence={occurrence}
              locale={locale}
              actionLabel={occurrence.bookingState === "waitlist" ? copy.joinWaitlist : copy.bookClass}
              busy={reserve.isPending && reserve.variables === occurrence.id}
              onAction={() => reserve.mutate(occurrence.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#121826] p-4 text-center sm:p-8">
          <p className="text-gray-300">{copy.noClasses}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{copy.noClassesDescription}</p>
          <Button asChild variant="outline" className="mt-5 border-white/10 text-gray-300 hover:bg-white/5">
            <Link href={locale === "es" ? "/es/contacto" : "/contact"}>{copy.contactUs}</Link>
          </Button>
        </div>
      )}
    </main>
  );
}