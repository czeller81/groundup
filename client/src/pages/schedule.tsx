import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/seo";
import { Clock, Filter, ChevronRight, CalendarDays, Zap, Star, Users, ArrowRight } from "lucide-react";
import {
  SCHEDULE, DAYS, CATEGORY_CONFIG, getClassesForDay, getCurrentDay,
  type DayOfWeek, type ClassEntry
} from "@/lib/schedule-data";

const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

type FilterKey = "all" | "bjj" | "strength" | "kids" | "open-mat";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All Classes" },
  { key: "bjj",      label: "Jiu-Jitsu" },
  { key: "strength", label: "Strength & Cond." },
  { key: "kids",     label: "Kids" },
  { key: "open-mat", label: "Open Mat" },
];

function matchesFilter(entry: ClassEntry, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "bjj")      return entry.category === "jiu-jitsu";
  if (filter === "strength") return entry.category === "strength";
  if (filter === "kids")     return entry.category === "kids";
  if (filter === "open-mat") return entry.category === "open-mat";
  return true;
}

function ClassCard({ entry, index }: { entry: ClassEntry; index: number }) {
  const cfg = CATEGORY_CONFIG[entry.category];
  const duration = entry.endTime
    ? (() => {
        const toMin = (t: string) => {
          const [time, period] = t.split(" ");
          const [h, m] = time.split(":").map(Number);
          return (period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h) * 60 + m;
        };
        return toMin(entry.endTime) - toMin(entry.startTime);
      })()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      className="group relative"
    >
      <div className={`relative rounded-2xl border ${cfg.border} bg-[#121826]/80 backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-lg hover:${cfg.glow} hover:border-opacity-60 hover:-translate-y-0.5 overflow-hidden`}>
        {/* Subtle gradient top bar */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${cfg.bg.replace('/15', '/60')}`} />

        {/* Featured badge */}
        {entry.featured && (
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
              <Star className="h-2.5 w-2.5" />Featured
            </span>
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Time column */}
          <div className="flex-shrink-0 text-right min-w-[72px]">
            <p className="text-white font-bold text-sm leading-tight">{entry.startTime}</p>
            {entry.endTime && <p className="text-gray-500 text-xs mt-0.5">{entry.endTime}</p>}
            {duration && (
              <div className="flex items-center gap-1 justify-end mt-1.5">
                <Clock className="h-2.5 w-2.5 text-gray-600" />
                <span className="text-gray-600 text-[10px]">{duration}m</span>
              </div>
            )}
          </div>

          {/* Divider line */}
          <div className="flex flex-col items-center flex-shrink-0 pt-1">
            <div className={`w-2 h-2 rounded-full ${cfg.bg.replace('/15', '/80')} border ${cfg.border}`} />
            <div className="w-px flex-1 min-h-[24px] bg-white/5 mt-1" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-white font-semibold text-sm leading-snug mb-2">{entry.title}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                <span>{cfg.icon}</span>{cfg.label}
              </span>
              {entry.advanced && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Advanced
                </span>
              )}
              {entry.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Schedule() {
  const todayDay = getCurrentDay();
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDay);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const dayClasses = getClassesForDay(activeDay).filter((c) => matchesFilter(c, activeFilter));
  const todayClasses = getClassesForDay(todayDay);

  return (
    <div className="min-h-screen bg-[#0B0F14]">
      <SEO
        title="Women-Only Class Schedule in Oxnard | Ground Up"
        description="View the live Google Calendar schedule for Ground Up's women-only Brazilian Jiu-Jitsu, self-defense, strength, and movement classes in Oxnard."
        canonical="/schedule"
      />
      {/* Hero */}
      <section className="relative pt-20 pb-14 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#B06CFF]/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B06CFF]/8 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-xs font-semibold uppercase tracking-widest mb-6">
              <CalendarDays className="h-3.5 w-3.5" />
              Weekly Class Schedule
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-none mb-5" style={{ fontFamily: 'var(--font-display)' }}>
              Train With <span className="text-[#B06CFF]">Purpose</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed mb-4">
              Intentionally small classes designed for women. Jiu-jitsu, self-defense, strength, and movement with real coaching.
            </p>
            <p className="text-[#5EEBFF] text-sm font-medium tracking-wide">Small group coaching. Real progress.</p>
          </motion.div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30 bg-[#0B0F14]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* Day pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none mb-3">
            {DAYS.map((day) => {
              const isToday = day === todayDay;
              const isActive = day === activeDay;
              const count = getClassesForDay(day).length;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`relative flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? "bg-[#B06CFF] text-white shadow-lg shadow-[#B06CFF]/30"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5"
                  }`}
                >
                  {isToday && !isActive && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#5EEBFF]" />
                  )}
                  <span>{DAY_SHORT[day]}</span>
                  <span className={`text-[9px] font-normal ${isActive ? "text-white/70" : "text-gray-600"}`}>{count} cls</span>
                </button>
              );
            })}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            <Filter className="h-3.5 w-3.5 text-gray-600 flex-shrink-0 mt-1" />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeFilter === f.key
                    ? "bg-[#5EEBFF]/15 text-[#5EEBFF] border border-[#5EEBFF]/30"
                    : "bg-white/5 text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule content */}
      <section className="max-w-5xl mx-auto px-4 py-8">

        {/* Today highlight if viewing today */}
        {activeDay === todayDay && (
          <div className="mb-6 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#5EEBFF]/8 border border-[#5EEBFF]/20">
            <Zap className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" />
            <p className="text-[#5EEBFF] text-sm font-medium">Today's classes — {todayClasses.length} sessions available</p>
          </div>
        )}

        {/* Day heading */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {activeDay}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {dayClasses.length === 0 ? "No classes match this filter" : `${dayClasses.length} class${dayClasses.length !== 1 ? "es" : ""}`}
            </p>
          </div>
        </div>

        {/* Class cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay + activeFilter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {dayClasses.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No classes on this day match the selected filter.</p>
              </div>
            ) : (
              dayClasses.map((entry, i) => <ClassCard key={entry.id} entry={entry} index={i} />)
            )}
          </motion.div>
        </AnimatePresence>

        {/* Program Spotlights */}
        <div className="mt-14 grid sm:grid-cols-3 gap-4">
          {[
             { title: "Women's Jiu-Jitsu", desc: "A safe, structured environment built for women. Learn real techniques with personalized coaching.", color: "text-[#B06CFF]", bg: "bg-[#B06CFF]/10", border: "border-[#B06CFF]/20", href: "/book" },
             { title: "Girls / Mother + Daughter", desc: "Ask about current female-youth eligibility, guardian requirements, and family participation.", color: "text-[#FFB199]", bg: "bg-[#FFB199]/10", border: "border-[#FFB199]/20", href: "/girls" },
             { title: "Strength & Movement", desc: "Build useful strength, mobility, and confidence at your own starting point.", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", href: "/pricing" },
          ].map((sp) => (
            <Link key={sp.title} href={sp.href}>
              <div className={`group rounded-2xl border ${sp.border} ${sp.bg} p-5 hover:brightness-110 transition-all duration-200 cursor-pointer h-full`}>
                <p className={`font-bold text-sm uppercase tracking-wider mb-2 ${sp.color}`}>{sp.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{sp.desc}</p>
                <div className={`flex items-center gap-1 mt-4 text-xs font-semibold ${sp.color}`}>
                  Learn more <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="border-t border-white/5 bg-gradient-to-b from-transparent to-[#121826]/40 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#5EEBFF] text-xs font-semibold uppercase tracking-widest mb-4">Ready to Start?</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Built for Women, Kids &amp; <span className="text-[#B06CFF]">Purposeful Training</span>
          </h2>
          <p className="text-gray-400 text-base mb-8 max-w-xl mx-auto">
            Train smarter with structure, support, and intention. Our classes are small by design — so every session feels personal.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90 uppercase tracking-wider">
              <Link href="/book">Book Your Free First Visit</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#B06CFF]/40 text-[#B06CFF] hover:bg-[#B06CFF]/10 uppercase tracking-wider">
              <Link href="/contact">Contact Us</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5 uppercase tracking-wider">
              <Link href="/pricing">View Programs</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
