import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { usePortalAuth } from "@/lib/portal-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { localizeApiError, localizeFormOption, localizeFormText, useLocale } from "@/lib/locale";
import { trackEvent } from "@/lib/analytics";
import { localizedPortalPath } from "@/lib/portal-navigation";
import { Save, Send, Loader2, CheckCircle, Lock, RotateCcw } from "lucide-react";

type PortalFormProps = {
  formSlug?: string;
  embedded?: boolean;
  onSubmitted?: (slug: string) => void;
};

export default function PortalForm({ formSlug, embedded = false, onSubmitted }: PortalFormProps = {}) {
  const routeParams = useParams<{ slug: string }>();
  const slug = formSlug || routeParams.slug;
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const { locale, copy } = useLocale();
  const portalPath = (path: string) => localizedPortalPath(path, locale);
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useQuery<{ form: any; response: any }>({
    queryKey: ["/api/portal/forms", slug],
    enabled: isAuthenticated && !!slug,
  });

  const form = data?.form;
  const existingResponse = data?.response;
  const isSubmitted = existingResponse?.status === "submitted";

  useEffect(() => {
    if (existingResponse?.answers) {
      setAnswers(existingResponse.answers as Record<string, any>);
    }
  }, [existingResponse]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/portal/forms/${slug}/save`, { answers });
      return res.json();
    },
    onSuccess: () => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/portal/forms"] });
    },
    onError: (error: any) => {
      toast({ title: copy.error, description: localizeApiError(error.message, locale, copy.failedToSaveForm), variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/portal/forms/${slug}/submit`, { answers });
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitting(false);
      toast({ title: copy.formSubmitted, description: copy.formSubmittedDescription });
      if (slug === "liability-waiver" || slug === "gym-rules") {
        trackEvent("discovery_waiver_completed", { locale, form: slug });
      }
      // Mark the forms list stale without refetching the active form query.
      // Navigation immediately unmounts this page, and cancelling that
      // refetch can surface as an unhandled browser promise rejection.
      queryClient.invalidateQueries({ queryKey: ["/api/portal/forms"], refetchType: "none" });
      if (embedded && slug) {
        onSubmitted?.(slug);
      } else {
        setLocation(portalPath("/portal/dashboard"));
      }
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({ title: copy.error, description: localizeApiError(error.message, locale, copy.failedToSubmitForm), variant: "destructive" });
    },
  });

  const retakeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/portal/forms/${slug}/retake`, {});
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitting(false);
      setAnswers({});
      queryClient.invalidateQueries({ queryKey: ["/api/portal/forms", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/forms"] });
      toast({ title: copy.formReset, description: copy.formResetDescription });
    },
    onError: (error: any) => {
      toast({ title: copy.error, description: localizeApiError(error.message, locale, copy.failedToResetForm), variant: "destructive" });
    },
  });

  const debouncedSave = useCallback(() => {
    if (!isSubmitted && !isSubmitting && !submitMutation.isPending && Object.keys(answers).length > 0) {
      saveMutation.mutate();
    }
  }, [answers, isSubmitted, isSubmitting, submitMutation.isPending]);

  useEffect(() => {
    const timer = setTimeout(debouncedSave, 2000);
    return () => clearTimeout(timer);
  }, [answers, debouncedSave]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(portalPath("/portal/login"));
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
             <p className="text-muted-foreground">{copy.formNotFound}</p>
            <Button className="mt-4" asChild>
              <Link href={portalPath("/portal/dashboard")}>{copy.backToDashboard}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleMultiSelectChange = (fieldId: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      }
      return { ...prev, [fieldId]: current.filter((o: string) => o !== option) };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submitMutation.isPending) return;
    setIsSubmitting(true);
    submitMutation.mutate();
  };

  const renderField = (field: any) => {
    const fieldKey = field.name || field.id;
    const value = answers[fieldKey] ?? "";

    switch (field.type) {
      case "text":
        return (
          <Input
            id={fieldKey}
            name={fieldKey}
            type="text"
            autoComplete="off"
            value={value}
            onChange={(e) => handleChange(fieldKey, e.target.value)}
            disabled={isSubmitted}
            data-testid={`input-${fieldKey}`}
          />
        );

      case "date":
        return (
          <Input
            id={fieldKey}
            name={fieldKey}
            type="date"
            autoComplete="off"
            value={value}
            onChange={(e) => handleChange(fieldKey, e.target.value)}
            disabled={isSubmitted}
            data-testid={`input-${fieldKey}`}
          />
        );

      case "tel":
        return (
          <Input
            id={fieldKey}
            name={fieldKey}
            type="tel"
            autoComplete="off"
            inputMode="tel"
            value={value}
            onChange={(e) => handleChange(fieldKey, e.target.value)}
            disabled={isSubmitted}
            placeholder="(555) 000-0000"
            data-testid={`input-${fieldKey}`}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={fieldKey}
            name={fieldKey}
            autoComplete="off"
            value={value}
            onChange={(e) => handleChange(fieldKey, e.target.value)}
            disabled={isSubmitted}
            rows={4}
            data-testid={`input-${fieldKey}`}
          />
        );

      case "select":
        return (
          <Select value={value} onValueChange={(v) => handleChange(fieldKey, v)} disabled={isSubmitted}>
            <SelectTrigger data-testid={`select-${fieldKey}`}>
                 <SelectValue placeholder={copy.selectAnOption} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                   {localizeFormOption(locale, slug, option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "boolean":
        return (
          <RadioGroup value={value?.toString()} onValueChange={(v) => handleChange(fieldKey, v === "true")} disabled={isSubmitted}>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`${fieldKey}-yes`} />
                 <Label htmlFor={`${fieldKey}-yes`}>{copy.yes}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`${fieldKey}-no`} />
                 <Label htmlFor={`${fieldKey}-no`}>{copy.no}</Label>
              </div>
            </div>
          </RadioGroup>
        );

      case "checkbox":
        return (
          <div className="flex items-start space-x-3 p-3 bg-white/[0.03] border border-white/5 rounded-lg">
            <Checkbox
              id={fieldKey}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(fieldKey, !!checked)}
              disabled={isSubmitted}
              className="mt-0.5"
            />
            <Label htmlFor={fieldKey} className="text-sm leading-relaxed cursor-pointer font-normal">
               {localizeFormText(locale, slug, "field", field.label, fieldKey)}
            </Label>
          </div>
        );

      case "multiselect":
        const selectedOptions = answers[fieldKey] || [];
        return (
          <div className="space-y-2">
            {field.options?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${fieldKey}-${option}`}
                  checked={selectedOptions.includes(option)}
                  onCheckedChange={(checked) => handleMultiSelectChange(fieldKey, option, !!checked)}
                  disabled={isSubmitted}
                />
                 <Label htmlFor={`${fieldKey}-${option}`}>{localizeFormOption(locale, slug, option)}</Label>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const fields = form.fields as any[];

  return (
    <div className={embedded ? "text-white" : undefined}>
      <div className="bg-[#121826]/50 border-b border-white/5 py-4 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{localizeFormText(locale, slug, "title", form.title)}</h1>
            {form.description && <p className="text-sm text-gray-400">{localizeFormText(locale, slug, "description", form.description)}</p>}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {isSubmitted && (
          form?.retakeable ? (
            <Card className="mb-6 bg-[#121826] border-[#5EEBFF]/30">
              <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <p className="text-gray-300 text-sm">
                    {copy.formUpdateNotice}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 border-[#5EEBFF]/30 text-[#5EEBFF] hover:bg-[#5EEBFF]/10"
                  onClick={() => retakeMutation.mutate()}
                  disabled={retakeMutation.isPending}
                >
                  {retakeMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <RotateCcw className="h-4 w-4 mr-2" />}
                  {copy.retakeForm}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6 bg-[#121826] border-amber-500/30">
              <CardContent className="p-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  {copy.formLocked}
                </p>
              </CardContent>
            </Card>
          )
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {fields.map((field) => {
                const fieldKey = field.name || field.id;
                const isCheckbox = field.type === "checkbox";
                return (
                  <div key={fieldKey} className="space-y-2">
                    {!isCheckbox && (
                      <Label htmlFor={fieldKey}>
                        {localizeFormText(locale, slug, "field", field.label, fieldKey)}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                    )}
                    {isCheckbox && field.required && (
                      <span className="text-xs text-red-400">* {copy.required}</span>
                    )}
                    {renderField(field)}
                  </div>
                );
              })}

              {!isSubmitted && (
                <div className="flex flex-col items-stretch gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {saveMutation.isPending && (
                      <span className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                         {copy.saving}
                      </span>
                    )}
                    {lastSaved && !saveMutation.isPending && (
                       <span>{copy.draftSavedAt} {lastSaved.toLocaleTimeString(locale)}</span>
                    )}
                  </div>
                   <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      data-testid="button-save-draft"
                    >
                      <Save className="h-4 w-4 mr-2" />
                       {copy.saveDraft}
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitMutation.isPending || isSubmitting}
                      data-testid="button-submit-form"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                       {submitMutation.isPending ? copy.submitting : copy.submitForm}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
