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
import { ArrowLeft, Save, Send, Loader2, CheckCircle } from "lucide-react";

export default function PortalForm() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/portal/forms/${slug}/submit`, { answers });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Form Submitted!", description: "Your form has been submitted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/forms"] });
      setLocation("/portal/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit form", variant: "destructive" });
    },
  });

  const debouncedSave = useCallback(() => {
    if (!isSubmitted && Object.keys(answers).length > 0) {
      saveMutation.mutate();
    }
  }, [answers, isSubmitted]);

  useEffect(() => {
    const timer = setTimeout(debouncedSave, 2000);
    return () => clearTimeout(timer);
  }, [answers, debouncedSave]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/portal/login");
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
            <p className="text-muted-foreground">Form not found</p>
            <Button className="mt-4" asChild>
              <Link href="/portal/dashboard">Back to Dashboard</Link>
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
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
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
                <Label htmlFor={`${fieldKey}-yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`${fieldKey}-no`} />
                <Label htmlFor={`${fieldKey}-no`}>No</Label>
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
              {field.label}
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
                <Label htmlFor={`${fieldKey}-${option}`}>{option}</Label>
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
    <div>
      <div className="bg-[#121826]/50 border-b border-white/5 py-4 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{form.title}</h1>
          {form.description && <p className="text-sm text-gray-400">{form.description}</p>}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {isSubmitted && (
          <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800 dark:text-green-200">
                This form has been submitted and can no longer be edited.
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-6">
              {fields.map((field) => {
                const fieldKey = field.name || field.id;
                const isCheckbox = field.type === "checkbox";
                return (
                  <div key={fieldKey} className="space-y-2">
                    {!isCheckbox && (
                      <Label htmlFor={fieldKey}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                    )}
                    {isCheckbox && field.required && (
                      <span className="text-xs text-red-400">* Required</span>
                    )}
                    {renderField(field)}
                  </div>
                );
              })}

              {!isSubmitted && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {saveMutation.isPending && (
                      <span className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </span>
                    )}
                    {lastSaved && !saveMutation.isPending && (
                      <span>Draft saved at {lastSaved.toLocaleTimeString()}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      data-testid="button-save-draft"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Draft
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-form"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit Form
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
