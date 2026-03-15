import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays, Zap, ChevronRight } from "lucide-react";
import {
  DAYS, CATEGORY_CONFIG, getClassesForDay, getCurrentDay,
  type DayOfWeek, type ClassEntry
} from "@/lib/schedule-data";

const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

function PortalClassCard({ entry, index }: { entry: ClassEntry; index: number }) {
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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.border} ${cfg.bg} hover:brightness-110 transition-all duration-200`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-black/20 text-base`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm leading-snug truncate">{entry.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-semibold ${cfg.color}`}>{entry.startTime}</span>
          {entry.endTime && <span className="text-gray-600 text-xs">→ {entry.endTime}</span>}
          {duration && <span className="text-gray-600 text-[10px]">· {duration}m</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 flex-shrink-0 max-w-[80px] justify-end">
        {entry.tags.slice(0, 1).map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-gray-400">{tag}</span>
        ))}
      </div>
    </motion.div>
  );
}

export default function PortalSchedule() {
  const todayDay = getCurrentDay();
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDay);

  const dayClasses = getClassesForDay(activeDay);
  const todayClasses = getClassesForDay(todayDay);

  return (
    <div className="min-h-screen bg-[#0B0F14]">
      {/* Header */}
      <div className="bg-[#121826]/50 border-b border-white/5 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              ACADEMY <span className="text-[#5EEBFF]">SCHEDULE</span>
            </h1>
            <p className="text-sm text-gray-400">Weekly class times &amp; programs</p>
          </div>
          <Button asChild size="sm" className="bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90 text-xs">
            <Link href="/portal/booking">Book Session</Link>
          </Button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-5">

        {/* Today's classes highlight */}
        {todayDay && (
          <div className="mb-5 p-4 rounded-2xl bg-[#121826] border border-[#5EEBFF]/15">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-[#5EEBFF]" />
              <span className="text-[#5EEBFF] text-sm font-bold uppercase tracking-wider">Today — {todayDay}</span>
              <span className="ml-auto text-gray-600 text-xs">{todayClasses.length} classes</span>
            </div>
            {todayClasses.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-3">No classes scheduled today.</p>
            ) : (
              <div className="space-y-2">
                {todayClasses.map((entry, i) => (
                  <PortalClassCard key={entry.id} entry={entry} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Day selector */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">Browse by Day</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DAYS.map((day) => {
              const isToday = day === todayDay;
              const isActive = day === activeDay;
              const count = getClassesForDay(day).length;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`relative flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#B06CFF] text-white shadow-lg shadow-[#B06CFF]/25"
                      : "bg-[#121826] text-gray-400 hover:text-white border border-white/5"
                  }`}
                >
                  {isToday && !isActive && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#5EEBFF]" />
                  )}
                  <span className="uppercase tracking-wide">{DAY_SHORT[day]}</span>
                  <span className={`text-[9px] ${isActive ? "text-white/60" : "text-gray-600"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day classes */}
        <div className="bg-[#121826] rounded-2xl border border-white/5 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>
              {activeDay} <span className="text-gray-500 font-normal text-sm">— {dayClasses.length} classes</span>
            </h2>
            {activeDay === todayDay && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5EEBFF] bg-[#5EEBFF]/10 px-2 py-1 rounded-full border border-[#5EEBFF]/20">Today</span>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeDay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2"
            >
              {dayClasses.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No classes scheduled.</p>
                </div>
              ) : (
                dayClasses.map((entry, i) => <PortalClassCard key={entry.id} entry={entry} index={i} />)
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Category legend */}
        <div className="mt-5 p-4 bg-[#121826] rounded-2xl border border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-medium">Class Types</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm">{cfg.icon}</span>
                <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Full schedule CTA */}
        <div className="mt-5 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#B06CFF]/10 to-[#5EEBFF]/10 border border-white/5">
          <div>
            <p className="text-white text-sm font-semibold">View Full Schedule</p>
            <p className="text-gray-500 text-xs">See all classes on the public website</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-[#5EEBFF] hover:text-[#5EEBFF] hover:bg-[#5EEBFF]/10">
            <Link href="/schedule">
              Open <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
