export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type ClassCategory =
  | "jiu-jitsu"
  | "kids"
  | "strength"
  | "recovery"
  | "open-mat";

export type Audience = "women" | "kids" | "youth" | "adults" | "all";

export interface ClassEntry {
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  title: string;
  category: ClassCategory;
  audience: Audience[];
  tags: string[];
  featured?: boolean;
  advanced?: boolean;
  description?: string;
}

export const DAYS: DayOfWeek[] = ["Monday", "Wednesday", "Friday"];

export const CATEGORY_CONFIG: Record<ClassCategory, { label: string; color: string; bg: string; border: string; glow: string; icon: string }> = {
  "jiu-jitsu":  { label: "Jiu-Jitsu",          color: "text-[#B06CFF]",   bg: "bg-[#B06CFF]/15",   border: "border-[#B06CFF]/30",   glow: "shadow-[#B06CFF]/20",   icon: "🥋" },
  "kids":       { label: "Kids",               color: "text-[#FFB199]",   bg: "bg-[#FFB199]/15",   border: "border-[#FFB199]/30",   glow: "shadow-[#FFB199]/20",   icon: "⭐" },
  "strength":   { label: "Strength & Cond.",   color: "text-emerald-400", bg: "bg-emerald-400/15", border: "border-emerald-400/30", glow: "shadow-emerald-400/20", icon: "💪" },
  "recovery":   { label: "Stretch & Recovery", color: "text-[#5EEBFF]",   bg: "bg-[#5EEBFF]/15",   border: "border-[#5EEBFF]/30",   glow: "shadow-[#5EEBFF]/20",   icon: "🧘" },
  "open-mat":   { label: "Open Mat",           color: "text-gray-400",    bg: "bg-gray-400/15",    border: "border-gray-400/30",    glow: "shadow-gray-400/20",    icon: "🔓" },
};

export const SCHEDULE: ClassEntry[] = [
  // MONDAY
  { id: "mon-1", day: "Monday",    startTime: "12:00 PM", endTime: "1:00 PM",  title: "Advanced Jiu-Jitsu — Drills & Submissions", category: "jiu-jitsu", audience: ["adults"], tags: ["Drills & Submissions"], advanced: true },
  { id: "mon-2", day: "Monday",    startTime: "4:30 PM",  endTime: "5:30 PM",  title: "Strength & Conditioning",                   category: "strength",  audience: ["adults"], tags: ["All Levels"] },
  { id: "mon-3", day: "Monday",    startTime: "5:30 PM",  endTime: "6:30 PM",  title: "Jiu-Jitsu — Beginner",                      category: "jiu-jitsu", audience: ["all"],    tags: ["Beginner", "All Levels"], featured: true },

  // WEDNESDAY
  { id: "wed-1", day: "Wednesday", startTime: "12:00 PM", endTime: "1:00 PM",  title: "Jiu-Jitsu — Transitions & Technique",       category: "jiu-jitsu", audience: ["adults"], tags: ["Transitions & Technique"], advanced: true },
  { id: "wed-2", day: "Wednesday", startTime: "5:30 PM",  endTime: "6:30 PM",  title: "Athletes Strength & Conditioning",          category: "strength",  audience: ["adults"], tags: ["Athletes"] },
  { id: "wed-3", day: "Wednesday", startTime: "6:30 PM",  endTime: "7:30 PM",  title: "Jiu-Jitsu — Beginner",                      category: "jiu-jitsu", audience: ["all"],    tags: ["Beginner", "All Levels"], featured: true },

  // FRIDAY
  { id: "fri-1", day: "Friday",    startTime: "12:00 PM", endTime: "1:00 PM",  title: "Jiu-Jitsu — Ecological Approach",           category: "jiu-jitsu", audience: ["adults"], tags: ["Ecological Approach"], advanced: true },
  { id: "fri-2", day: "Friday",    startTime: "4:30 PM",  endTime: "5:30 PM",  title: "Strength & Conditioning",                   category: "strength",  audience: ["adults"], tags: ["All Levels"] },
  { id: "fri-3", day: "Friday",    startTime: "5:30 PM",  endTime: "6:30 PM",  title: "Jiu-Jitsu — Beginner",                      category: "jiu-jitsu", audience: ["all"],    tags: ["Beginner", "All Levels"], featured: true },

];

export function getClassesForDay(day: DayOfWeek): ClassEntry[] {
  return SCHEDULE.filter((c) => c.day === day).sort((a, b) => {
    const toMinutes = (t: string) => {
      const [time, period] = t.split(" ");
      const [h, m] = time.split(":").map(Number);
      return (period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h) * 60 + m;
    };
    return toMinutes(a.startTime) - toMinutes(b.startTime);
  });
}

export function getTodayClasses(): ClassEntry[] {
  const dayNames: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = dayNames[new Date().getDay()];
  return getClassesForDay(today);
}

export function getCurrentDay(): DayOfWeek {
  const dayNames: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return dayNames[new Date().getDay()];
}
