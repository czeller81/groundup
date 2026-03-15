export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type ClassCategory =
  | "womens-bjj"
  | "kids"
  | "youth"
  | "conditioning"
  | "strength"
  | "competition"
  | "open-mat"
  | "self-defense";

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
  description?: string;
}

export const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const CATEGORY_CONFIG: Record<ClassCategory, { label: string; color: string; bg: string; border: string; glow: string; icon: string }> = {
  "womens-bjj":   { label: "Women's BJJ",         color: "text-[#B06CFF]", bg: "bg-[#B06CFF]/15",  border: "border-[#B06CFF]/30", glow: "shadow-[#B06CFF]/20", icon: "🥋" },
  "kids":         { label: "Kids",                 color: "text-[#FFB199]", bg: "bg-[#FFB199]/15",  border: "border-[#FFB199]/30", glow: "shadow-[#FFB199]/20", icon: "⭐" },
  "youth":        { label: "Youth",                color: "text-orange-400", bg: "bg-orange-400/15", border: "border-orange-400/30", glow: "shadow-orange-400/20", icon: "🔥" },
  "conditioning": { label: "Conditioning",         color: "text-[#5EEBFF]", bg: "bg-[#5EEBFF]/15",  border: "border-[#5EEBFF]/30", glow: "shadow-[#5EEBFF]/20", icon: "⚡" },
  "strength":     { label: "Strength & Cond.",     color: "text-emerald-400", bg: "bg-emerald-400/15", border: "border-emerald-400/30", glow: "shadow-emerald-400/20", icon: "💪" },
  "competition":  { label: "Competition",          color: "text-amber-400", bg: "bg-amber-400/15",  border: "border-amber-400/30", glow: "shadow-amber-400/20", icon: "🏆" },
  "open-mat":     { label: "Open Mat",             color: "text-gray-400",  bg: "bg-gray-400/15",   border: "border-gray-400/30",  glow: "shadow-gray-400/20",  icon: "🔓" },
  "self-defense": { label: "Self-Defense",         color: "text-rose-400",  bg: "bg-rose-400/15",   border: "border-rose-400/30",  glow: "shadow-rose-400/20",  icon: "🛡️" },
};

export const SCHEDULE: ClassEntry[] = [
  // MONDAY
  { id: "mon-1", day: "Monday",    startTime: "12:00 PM", endTime: "1:00 PM",  title: "Conditioning for Jiu-Jitsu",                          category: "conditioning", audience: ["adults"],         tags: ["Adults", "All Levels"] },
  { id: "mon-2", day: "Monday",    startTime: "3:45 PM",  endTime: "4:30 PM",  title: "Kids Intro to Jiu-Jitsu",                             category: "kids",         audience: ["kids"],           tags: ["Ages 4–7", "Beginners"], featured: true },
  { id: "mon-3", day: "Monday",    startTime: "4:30 PM",  endTime: "5:30 PM",  title: "Intro to Jiu-Jitsu",                                  category: "youth",        audience: ["youth"],          tags: ["Ages 8+", "Beginners"] },
  { id: "mon-4", day: "Monday",    startTime: "5:30 PM",  endTime: "6:30 PM",  title: "Jiu-Jitsu / Women's Only",                            category: "womens-bjj",   audience: ["women"],          tags: ["Women Only"], featured: true },

  // TUESDAY
  { id: "tue-1", day: "Tuesday",   startTime: "4:00 PM",  endTime: "5:00 PM",  title: "Strength & Conditioning — Kids & Teens",              category: "strength",     audience: ["kids", "youth"],  tags: ["Kids & Teens", "Martial Arts"] },
  { id: "tue-2", day: "Tuesday",   startTime: "5:00 PM",  endTime: "6:00 PM",  title: "Strength & Conditioning — Adults",                    category: "strength",     audience: ["adults"],         tags: ["Adults", "All Levels"] },

  // WEDNESDAY
  { id: "wed-1", day: "Wednesday", startTime: "4:00 PM",  endTime: "5:00 PM",  title: "Strength & Conditioning — Adults",                    category: "strength",     audience: ["adults"],         tags: ["Adults", "All Levels"] },
  { id: "wed-2", day: "Wednesday", startTime: "5:00 PM",  endTime: "6:00 PM",  title: "Strength & Conditioning for Competition Jiu-Jitsu",   category: "competition",  audience: ["adults"],         tags: ["Competition", "Advanced"] },
  { id: "wed-3", day: "Wednesday", startTime: "6:00 PM",  endTime: "7:00 PM",  title: "Jiu-Jitsu / Women's Only",                            category: "womens-bjj",   audience: ["women"],          tags: ["Women Only"], featured: true },

  // THURSDAY
  { id: "thu-1", day: "Thursday",  startTime: "12:00 PM", endTime: "1:00 PM",  title: "Conditioning for Jiu-Jitsu",                          category: "conditioning", audience: ["adults"],         tags: ["Adults", "All Levels"] },
  { id: "thu-2", day: "Thursday",  startTime: "3:45 PM",  endTime: "4:30 PM",  title: "Kids Intro to Jiu-Jitsu",                             category: "kids",         audience: ["kids"],           tags: ["Ages 4–7", "Beginners"] },
  { id: "thu-3", day: "Thursday",  startTime: "4:30 PM",  endTime: "5:30 PM",  title: "Youth Intro to Jiu-Jitsu",                            category: "youth",        audience: ["youth"],          tags: ["Youth", "Beginners"] },
  { id: "thu-4", day: "Thursday",  startTime: "5:30 PM",  endTime: "6:30 PM",  title: "Jiu-Jitsu / Self-Defense Women's Only",               category: "self-defense", audience: ["women"],          tags: ["Women Only", "Self-Defense"], featured: true },

  // FRIDAY
  { id: "fri-1", day: "Friday",    startTime: "12:00 PM", endTime: "1:00 PM",  title: "Strength & Conditioning",                             category: "strength",     audience: ["adults"],         tags: ["Adults", "Open"] },
  { id: "fri-2", day: "Friday",    startTime: "4:00 PM",  endTime: "5:00 PM",  title: "Ecological Approach Competition — Kids",              category: "competition",  audience: ["kids"],           tags: ["Kids", "Competition"] },
  { id: "fri-3", day: "Friday",    startTime: "5:00 PM",  endTime: "6:00 PM",  title: "Jiu-Jitsu Women's Only",                              category: "womens-bjj",   audience: ["women"],          tags: ["Women Only"] },

  // SATURDAY
  { id: "sat-1", day: "Saturday",  startTime: "10:00 AM", endTime: "11:00 AM", title: "Jiu-Jitsu / Self-Defense Intro — Women's",           category: "self-defense", audience: ["women"],          tags: ["Women Only", "Beginners"], featured: true },
  { id: "sat-2", day: "Saturday",  startTime: "11:00 AM", endTime: "12:00 PM", title: "Ecological Approach Competition — Kids",              category: "competition",  audience: ["kids"],           tags: ["Kids", "Competition"] },
  { id: "sat-3", day: "Saturday",  startTime: "12:00 PM", endTime: "1:00 PM",  title: "Strength & Conditioning Open",                        category: "strength",     audience: ["all"],            tags: ["Open to All"] },

  // SUNDAY
  { id: "sun-1", day: "Sunday",    startTime: "9:00 AM",  endTime: "10:00 AM", title: "Strength & Conditioning",                             category: "strength",     audience: ["all"],            tags: ["Open to All"] },
  { id: "sun-2", day: "Sunday",    startTime: "10:00 AM", endTime: "",         title: "Open Mat",                                            category: "open-mat",     audience: ["all"],            tags: ["Open to All"] },
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
