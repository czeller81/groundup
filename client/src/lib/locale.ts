import { useEffect, useState } from "react";

export type Locale = "en" | "es";

const LOCALE_KEY = "groundup-locale";
const LOCALE_EVENT = "groundup-locale-change";

export const PORTAL_COPY = {
  en: {
    dashboard: "Your Ground Up",
    schedule: "Schedule",
    myClasses: "Your Training",
    forms: "Your Forms",
    coachCenter: "Coach Center",
    classAdmin: "Class Management",
    admin: "Admin",
    account: "Account",
    logout: "Log out",
    member: "Member",
    coach: "Coach",
    administrator: "Administrator",
    findNextClass: "Find your next class",
    findNextClassDescription: "Choose a time that works for you and reserve your spot.",
    nextClass: "Next class",
    noUpcomingClasses: "No upcoming classes are booked yet.",
    noUpcomingClassesDescription: "Find a class that works for you.",
    viewSchedule: "View schedule",
    bookClass: "Book class",
    joinWaitlist: "Join waitlist",
    classBooked: "Class booked",
    classFull: "Class full",
    spotsLeft: "spot(s) left",
    beginnerFriendly: "Beginner friendly",
    loading: "Loading",
    loadError: "We couldn't load this right now. Please try again.",
    noClasses: "No upcoming classes are available right now.",
    noClassesDescription: "Check back soon or contact us and we'll help you find your next class.",
    upcoming: "Upcoming",
    waitlisted: "Waitlisted",
    history: "History",
    cancelled: "Cancelled",
    cancel: "Cancel",
    waitlistPosition: "Waitlist position",
    language: "Language",
    english: "English",
    spanish: "Español",
    login: "Member login",
    signup: "Sign up",
    email: "Email",
    password: "Password",
    welcomeBack: "Welcome back",
    loginDescription: "Your training, your schedule, your next step.",
    backToWebsite: "Return to Ground Up",
  },
  es: {
    dashboard: "Tu Ground Up",
    schedule: "Horario",
    myClasses: "Tu entrenamiento",
    forms: "Tus formularios",
    coachCenter: "Centro de coaches",
    classAdmin: "Gestión de clases",
    admin: "Administración",
    account: "Cuenta",
    logout: "Cerrar sesión",
    member: "Miembro",
    coach: "Coach",
    administrator: "Administración",
    findNextClass: "Encuentra tu próxima clase",
    findNextClassDescription: "Elige un horario que te funcione y reserva tu lugar.",
    nextClass: "Próxima clase",
    noUpcomingClasses: "Todavía no tienes clases reservadas.",
    noUpcomingClassesDescription: "Encuentra una clase que funcione para ti.",
    viewSchedule: "Ver horario",
    bookClass: "Reservar clase",
    joinWaitlist: "Unirme a la lista de espera",
    classBooked: "Clase reservada",
    classFull: "Clase llena",
    spotsLeft: "lugar(es) disponible(s)",
    beginnerFriendly: "Ideal para principiantes",
    loading: "Cargando",
    loadError: "No pudimos cargar esto. Intenta de nuevo.",
    noClasses: "No hay clases próximas disponibles en este momento.",
    noClassesDescription: "Vuelve pronto o contáctanos para ayudarte a encontrar tu próxima clase.",
    upcoming: "Próximas",
    waitlisted: "Lista de espera",
    history: "Historial",
    cancelled: "Cancelada",
    cancel: "Cancelar",
    waitlistPosition: "Posición en la lista",
    language: "Idioma",
    english: "English",
    spanish: "Español",
    login: "Acceso de miembros",
    signup: "Crear cuenta",
    email: "Correo electrónico",
    password: "Contraseña",
    welcomeBack: "Bienvenida de nuevo",
    loginDescription: "Tu entrenamiento, tu horario, tu próximo paso.",
    backToWebsite: "Volver a Ground Up",
  },
} as const;

function readLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(LOCALE_KEY) === "es" ? "es" : "en";
}

export function setLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_KEY, locale);
  document.documentElement.lang = locale;
  window.dispatchEvent(new Event(LOCALE_EVENT));
}

export function useLocale() {
  const [locale, updateLocale] = useState<Locale>(readLocale);

  useEffect(() => {
    const handleChange = () => updateLocale(readLocale());
    window.addEventListener(LOCALE_EVENT, handleChange);
    return () => window.removeEventListener(LOCALE_EVENT, handleChange);
  }, []);

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    updateLocale(nextLocale);
  };

  return { locale, copy: PORTAL_COPY[locale], setLocale: changeLocale };
}