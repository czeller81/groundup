import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users, Shield, Dumbbell, Star, ChevronRight, CheckCircle,
  ArrowLeft, Phone, Mail, MapPin, Clock, Calendar,
  Flame, Lock, Heart, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SEO from "@/components/seo";
import { SCHEDULE, CATEGORY_CONFIG, type ClassEntry } from "@/lib/schedule-data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  label: string;
  tagline: string;
  icon: React.ElementType;
  accent: string;
  bg: string;
  border: string;
  audiences: string[];
  categories: string[];
  forKids?: boolean;
}

const PROGRAMS: Program[] = [
  {
    id: "womens-bjj",
    label: "Women's BJJ Fundamentals",
    tagline: "Structured technique classes in a women-only environment",
    icon: Heart,
    accent: "#B06CFF",
    bg: "bg-[#B06CFF]/10",
    border: "border-[#B06CFF]/30",
    audiences: ["women"],
    categories: ["jiu-jitsu"],
  },
  {
    id: "self-defense",
    label: "Women's Self-Defense",
    tagline: "8-week program — practical skills you'll use for life",
    icon: Shield,
    accent: "#FF6B8A",
    bg: "bg-[#FF6B8A]/10",
    border: "border-[#FF6B8A]/30",
    audiences: ["women"],
    categories: ["jiu-jitsu"],
  },
  {
    id: "kids",
    label: "Kids Jiu-Jitsu",
    tagline: "Ages 4–14 — confidence, discipline, and real self-defense",
    icon: Star,
    accent: "#FFB199",
    bg: "bg-[#FFB199]/10",
    border: "border-[#FFB199]/30",
    audiences: ["kids", "youth"],
    categories: ["kids"],
    forKids: true,
  },
  {
    id: "conditioning",
    label: "Strength & Conditioning",
    tagline: "Get fit, build endurance — no prior BJJ experience needed",
    icon: Flame,
    accent: "#5EEBFF",
    bg: "bg-[#5EEBFF]/10",
    border: "border-[#5EEBFF]/30",
    audiences: ["adults", "all"],
    categories: ["strength"],
  },
  {
    id: "personal-training",
    label: "Personal Training",
    tagline: "1-on-1 private sessions — your schedule, your goals",
    icon: Award,
    accent: "#4ADE80",
    bg: "bg-[#4ADE80]/10",
    border: "border-[#4ADE80]/30",
    audiences: ["adults", "all", "women", "kids"],
    categories: [],
  },
  {
    id: "open",
    label: "Not Sure Yet",
    tagline: "Let Coach Raymi help you find the right fit",
    icon: Dumbbell,
    accent: "#9CA3AF",
    bg: "bg-gray-400/10",
    border: "border-gray-400/30",
    audiences: ["all"],
    categories: [],
  },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  experience: z.enum(["none", "some", "experienced"]),
  childName: z.string().optional(),
  childAge: z.string().optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClassesForProgram(program: Program): ClassEntry[] {
  if (!program.categories.length) return [];
  return SCHEDULE.filter((c) => program.categories.includes(c.category) && !c.advanced);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < step ? "bg-[#FFB199] w-8" : i === step ? "bg-[#FFB199]/60 w-5" : "bg-white/10 w-3"
          }`}
        />
      ))}
    </div>
  );
}

function stepVariants() {
  return {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Book() {
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassEntry | null>(null);
  const [confirmedLead, setConfirmedLead] = useState<{ firstName: string; classTitle: string } | null>(null);

  const form = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      experience: "none",
      childName: "",
      childAge: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: DetailsForm) => {
      const payload = {
        ...data,
        program: selectedProgram?.id ?? "open",
        classId: selectedClass?.id ?? null,
        classTitle: selectedClass?.title ?? (selectedProgram?.id === "personal-training" ? "Personal Training" : null),
        classDay: selectedClass?.day ?? null,
        classTime: selectedClass ? `${selectedClass.startTime}–${selectedClass.endTime}` : null,
      };
      return apiRequest("POST", "/api/trial-leads", payload);
    },
    onSuccess: (_, variables) => {
      setConfirmedLead({
        firstName: variables.firstName,
        classTitle: selectedClass?.title ?? selectedProgram?.label ?? "your first class",
      });
      setStep(3);
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again or call us at (786) 757-1175.",
        variant: "destructive",
      });
    },
  });

  const availableClasses = selectedProgram ? getClassesForProgram(selectedProgram) : [];
  const isKids = selectedProgram?.forKids ?? false;
  const isPersonal = selectedProgram?.id === "personal-training";
  const isOpen = selectedProgram?.id === "open";

  function handleProgramSelect(p: Program) {
    setSelectedProgram(p);
    setSelectedClass(null);
    setStep(1);
  }

  function handleClassSelect(c: ClassEntry) {
    setSelectedClass(c);
    setStep(2);
  }

  function handleSkipClass() {
    setSelectedClass(null);
    setStep(2);
  }

  function onSubmit(data: DetailsForm) {
    mutation.mutate(data);
  }

  return (
    <>
      <SEO
        title="Book Your Free Trial Class | Ground Up Jiu-Jitsu & Fitness Oxnard"
        description="Reserve your first free BJJ class at Ground Up Jiu-Jitsu in Oxnard, CA. No experience needed. Takes 2 minutes."
        canonical="/book"
      />

      <div className="min-h-screen bg-[#0B0F14] pt-20 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          {/* Header */}
          {step < 3 && (
            <div className="text-center mb-8 pt-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/20 bg-[#FFB199]/5 text-[#FFB199] text-xs font-semibold uppercase tracking-wider mb-4">
                <Lock className="h-3.5 w-3.5" /> Free — No Credit Card Required
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                BOOK YOUR <span className="text-[#FFB199]">FREE TRIAL</span>
              </h1>
              <p className="text-gray-400 text-sm mt-2">Takes 2 minutes. We'll reach out to confirm your spot.</p>
              <StepIndicator step={step} total={3} />
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── STEP 0: PROGRAM ────────────────────────────────────────── */}
            {step === 0 && (
              <motion.div key="step-0" variants={stepVariants()} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <p className="text-gray-400 text-center text-sm mb-6">Which program are you interested in?</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {PROGRAMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProgramSelect(p)}
                      className={`text-left p-5 rounded-2xl border transition-all duration-200 bg-[#121826] hover:scale-[1.02] active:scale-[0.98] group ${p.border} hover:shadow-lg`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${p.accent}20` }}
                      >
                        <p.icon className="h-5 w-5" style={{ color: p.accent }} />
                      </div>
                      <div className="font-bold text-white text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>
                        {p.label}
                      </div>
                      <div className="text-gray-500 text-xs leading-relaxed">{p.tagline}</div>
                      <ChevronRight
                        className="h-4 w-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: p.accent }}
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: PICK A CLASS ───────────────────────────────────── */}
            {step === 1 && selectedProgram && (
              <motion.div key="step-1" variants={stepVariants()} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs mb-6 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to programs
                </button>

                <div
                  className="flex items-center gap-3 p-4 rounded-xl border mb-6"
                  style={{ borderColor: `${selectedProgram.accent}30`, backgroundColor: `${selectedProgram.accent}10` }}
                >
                  <selectedProgram.icon className="h-5 w-5 flex-shrink-0" style={{ color: selectedProgram.accent }} />
                  <div>
                    <div className="text-white font-semibold text-sm">{selectedProgram.label}</div>
                    <div className="text-gray-500 text-xs">{selectedProgram.tagline}</div>
                  </div>
                </div>

                {(isPersonal || isOpen) ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-2 text-sm">
                      {isPersonal
                        ? "Personal training times are set directly with Coach Raymi based on your schedule."
                        : "We'll help you find the right class once we know more about you."}
                    </div>
                    <Button
                      onClick={handleSkipClass}
                      className="mt-4 bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90 uppercase tracking-wider"
                    >
                      Continue <ChevronRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm mb-4 text-center">
                      Pick a class time that works for you — or skip to tell us your availability.
                    </p>
                    <div className="space-y-3 mb-6">
                      {availableClasses.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm">No specific class times found — we'll match you during onboarding.</div>
                      ) : (
                        availableClasses.map((cls) => {
                          const cfg = CATEGORY_CONFIG[cls.category];
                          return (
                            <button
                              key={cls.id}
                              onClick={() => handleClassSelect(cls)}
                              className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-[#121826] hover:border-white/15 hover:bg-[#1A2030] transition-all group"
                            >
                              <div className={`w-2 h-10 rounded-full flex-shrink-0 ${cfg.bg}`} style={{ backgroundColor: cfg.bg }} />
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold text-sm truncate">{cls.title}</div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="flex items-center gap-1 text-gray-500 text-xs">
                                    <Calendar className="h-3 w-3" /> {cls.day}
                                  </span>
                                  <span className="flex items-center gap-1 text-gray-500 text-xs">
                                    <Clock className="h-3 w-3" /> {cls.startTime}{cls.endTime ? `–${cls.endTime}` : ""}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0" />
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="text-center">
                      <button onClick={handleSkipClass} className="text-gray-500 hover:text-gray-300 text-xs underline underline-offset-4 transition-colors">
                        None of these work — skip this step
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: CONTACT DETAILS ────────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step-2" variants={stepVariants()} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs mb-6 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>

                {selectedClass && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-[#121826] mb-6">
                    <CheckCircle className="h-4 w-4 text-[#4ADE80] flex-shrink-0" />
                    <div className="text-sm">
                      <span className="text-white font-semibold">{selectedClass.title}</span>
                      <span className="text-gray-500 ml-2">{selectedClass.day} · {selectedClass.startTime}</span>
                    </div>
                  </div>
                )}

                <div className="bg-[#121826] rounded-2xl border border-white/5 p-6">
                  <p className="text-gray-400 text-sm mb-6">Just a few details so Coach Raymi can reach out to confirm your spot.</p>

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-xs mb-1.5 block">First Name *</Label>
                        <Input
                          {...form.register("firstName")}
                          placeholder="Jane"
                          className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FFB199]/50"
                        />
                        {form.formState.errors.firstName && (
                          <p className="text-red-400 text-xs mt-1">{form.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-300 text-xs mb-1.5 block">Last Name *</Label>
                        <Input
                          {...form.register("lastName")}
                          placeholder="Smith"
                          className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FFB199]/50"
                        />
                        {form.formState.errors.lastName && (
                          <p className="text-red-400 text-xs mt-1">{form.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-300 text-xs mb-1.5 block">Email *</Label>
                      <Input
                        {...form.register("email")}
                        type="email"
                        placeholder="jane@example.com"
                        className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FFB199]/50"
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-400 text-xs mt-1">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-gray-300 text-xs mb-1.5 block">Phone Number *</Label>
                      <Input
                        {...form.register("phone")}
                        type="tel"
                        placeholder="(555) 000-0000"
                        className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FFB199]/50"
                      />
                      {form.formState.errors.phone && (
                        <p className="text-red-400 text-xs mt-1">{form.formState.errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-gray-300 text-xs mb-2 block">Your experience level</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "none", label: "No experience" },
                          { value: "some", label: "A little" },
                          { value: "experienced", label: "Been training" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => form.setValue("experience", opt.value as any)}
                            className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                              form.watch("experience") === opt.value
                                ? "border-[#FFB199]/60 bg-[#FFB199]/10 text-[#FFB199]"
                                : "border-white/5 bg-[#0B0F14] text-gray-400 hover:border-white/15"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isKids && (
                      <div className="grid sm:grid-cols-2 gap-4 pt-1 border-t border-white/5">
                        <div>
                          <Label className="text-gray-300 text-xs mb-1.5 block">Child's Name</Label>
                          <Input
                            {...form.register("childName")}
                            placeholder="Alex"
                            className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FFB199]/50"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300 text-xs mb-1.5 block">Child's Age</Label>
                          <Input
                            {...form.register("childAge")}
                            placeholder="8"
                            className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FFB199]/50"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={mutation.isPending}
                      className="w-full bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 h-12 text-sm mt-2"
                    >
                      {mutation.isPending ? "Confirming…" : "Confirm My Free Trial"}
                    </Button>

                    <p className="text-center text-gray-600 text-xs">
                      We'll text or call to confirm your spot. No spam, ever.
                    </p>
                  </form>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: CONFIRMATION ───────────────────────────────────── */}
            {step === 3 && confirmedLead && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="pt-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-[#4ADE80]/15 border border-[#4ADE80]/30 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="h-9 w-9 text-[#4ADE80]" />
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  YOU'RE IN, {confirmedLead.firstName.toUpperCase()}!
                </h2>
                <p className="text-gray-400 mb-8">
                  Coach Raymi will reach out shortly to confirm your spot for{" "}
                  <span className="text-white font-medium">{confirmedLead.classTitle}</span>.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mb-8 text-left">
                  <div className="bg-[#121826] rounded-2xl border border-white/5 p-5">
                    <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                      What to Bring
                    </h3>
                    {[
                      "Comfortable athletic clothing",
                      "Water bottle",
                      "An open mind",
                      "No gear needed — we've got you",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-[#4ADE80] flex-shrink-0 mt-0.5" />
                        <span className="text-gray-400 text-xs">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#121826] rounded-2xl border border-white/5 p-5">
                    <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                      Questions? Reach Out
                    </h3>
                    <a
                      href="tel:+17867571175"
                      className="flex items-center gap-2 text-[#FFB199] text-sm mb-3 hover:text-[#FFB199]/80 transition-colors"
                    >
                      <Phone className="h-4 w-4" /> (786) 757-1175
                    </a>
                    <a
                      href="mailto:raymin33@gmail.com"
                      className="flex items-center gap-2 text-[#5EEBFF] text-sm mb-3 hover:text-[#5EEBFF]/80 transition-colors"
                    >
                      <Mail className="h-4 w-4" /> raymin33@gmail.com
                    </a>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <MapPin className="h-4 w-4 flex-shrink-0" /> Oxnard, CA
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#1A1230] to-[#121826] rounded-2xl border border-[#B06CFF]/20 p-5 mb-8 text-left">
                  <p className="text-gray-300 text-sm leading-relaxed italic">
                    "Arrive 15 minutes early so I can give you a quick tour, answer any questions, and make sure you feel at home before class starts. Looking forward to seeing you on the mat."
                  </p>
                  <p className="text-[#B06CFF] text-xs mt-2 font-semibold">— Coach Raymi Gonzalez, Purple Belt (3rd Degree)</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/schedule">
                    <Button variant="outline" className="border-white/10 text-gray-300 hover:text-white hover:border-white/20 w-full sm:w-auto">
                      View Full Schedule
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button className="bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90 w-full sm:w-auto">
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
