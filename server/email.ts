import { ReplitConnectors } from "@replit/connectors-sdk";

const STAFF_EMAIL = "info@groundupbjj.com";

function resend() {
  return new ReplitConnectors();
}

export async function sendStaffNotificationEmail(input: {
  subject: string;
  text: string;
  inboxPath: string;
}) {
  const response = await resend().proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ground Up <info@groundupbjj.com>",
      to: [STAFF_EMAIL],
      subject: input.subject,
      text: `${input.text}\n\nOpen in portal: ${input.inboxPath}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}`);
  }
}

export async function sendClassLifecycleEmail(input: {
  to: string;
  firstName: string;
  classTitle: string;
  startsAt: Date;
  status: "confirmed" | "waitlisted" | "cancelled" | "promoted";
  waitlistPosition?: number | null;
  locale?: "en" | "es";
}) {
  const locale = input.locale === "es" ? "es-US" : "en-US";
  const starts = new Intl.DateTimeFormat(locale, {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(input.startsAt);
  const copy = (input.locale === "es"
    ? {
        confirmed: { subject: `Tu reserva está confirmada: ${input.classTitle}`, body: `Tu lugar está confirmado para el ${starts}.` },
        waitlisted: { subject: `Estás en la lista de espera: ${input.classTitle}`, body: `La clase está llena. Tu posición en la lista es ${input.waitlistPosition || "pendiente"} para el ${starts}. Te enviaremos un correo si se abre un lugar.` },
        cancelled: { subject: `Reserva cancelada: ${input.classTitle}`, body: `Tu reserva para el ${starts} ha sido cancelada.` },
        promoted: { subject: `Se abrió un lugar en ${input.classTitle}`, body: `Pasaste de la lista de espera a la clase del ${starts}. Tu lugar está confirmado.` },
      }
    : {
        confirmed: { subject: `You're booked for ${input.classTitle}`, body: `Your spot is confirmed for ${starts}.` },
        waitlisted: { subject: `You're on the waitlist for ${input.classTitle}`, body: `The class is currently full. You are waitlist position ${input.waitlistPosition || "pending"} for ${starts}. We will email you if a spot opens.` },
        cancelled: { subject: `Reservation cancelled for ${input.classTitle}`, body: `Your reservation for ${starts} has been cancelled.` },
        promoted: { subject: `A spot opened in ${input.classTitle}`, body: `You have been moved from the waitlist into the class on ${starts}. Your spot is now confirmed.` },
      })[input.status];
  const response = await resend().proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ground Up <info@groundupbjj.com>",
      to: [input.to],
      subject: copy.subject,
      text: input.locale === "es"
        ? `Hola ${input.firstName},\n\n${copy.body}\n\nGround Up Jiu-Jitsu & Fitness`
        : `Hi ${input.firstName},\n\n${copy.body}\n\nGround Up Jiu-Jitsu & Fitness`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}`);
  }
}