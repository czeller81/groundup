import { ReplitConnectors } from "@replit/connectors-sdk";
import { BOOKING_OPERATIONS, formatBookingDateTime } from "@shared/booking-operations";

const STAFF_EMAIL = "info@groundupbjj.com";
export const GROUND_UP_ADDRESS = BOOKING_OPERATIONS.location.address;
export const BOOKING_FROM = "Ground Up <info@groundupbjj.com>";

export function getBookingStaffEmail() {
  return process.env.BOOKING_STAFF_EMAIL || process.env.ADMIN_EMAIL || STAFF_EMAIL;
}

export type ResendEmailPayload = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  from?: string;
};

export type ResendProxy = (
  service: string,
  path: string,
  options: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export function passwordResetEmailContent(locale: "en" | "es", resetUrl: string) {
  return locale === "es"
    ? {
        subject: "Restablece tu contraseña de Ground Up",
        text: `Solicitaste restablecer tu contraseña de Ground Up.\n\nUsa este enlace una sola vez dentro de 60 minutos:\n${resetUrl}\n\nSi no solicitaste esto, puedes ignorar este correo.`,
      }
    : {
        subject: "Reset your Ground Up password",
        text: `You requested a Ground Up password reset.\n\nUse this one-time link within 60 minutes:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      };
}

export function emailVerificationContent(locale: "en" | "es", verificationUrl: string) {
  return locale === "es"
    ? {
        subject: "Confirma tu correo de Ground Up",
        text: `Confirma tu correo electrónico para activar tu cuenta de Ground Up.\n\nUsa este enlace dentro de 60 minutos:\n${verificationUrl}\n\nSi no creaste esta cuenta, puedes ignorar este correo.`,
      }
    : {
        subject: "Verify your Ground Up email",
        text: `Verify your email address to activate your Ground Up account.\n\nUse this link within 60 minutes:\n${verificationUrl}\n\nIf you did not create this account, you can ignore this email.`,
      };
}

export function classLifecycleEmailContent(input: {
  classTitle: string;
  starts: string;
  ends?: string;
  manageUrl?: string;
  participantName?: string;
  status: "confirmed" | "waitlisted" | "cancelled" | "promoted";
  waitlistPosition?: number | null;
  locale: "en" | "es";
}) {
  const isJiuJitsuClass = /jiu[\s-]?jitsu/i.test(input.classTitle);
  const copy = (input.locale === "es"
    ? {
        confirmed: { subject: `Tu reserva está confirmada: ${input.classTitle}`, body: `Tu lugar está confirmado para el ${input.starts}.` },
        waitlisted: { subject: `Estás en la lista de espera: ${input.classTitle}`, body: `La clase está llena. Tu posición en la lista es ${input.waitlistPosition || "pendiente"} para el ${input.starts}. Te enviaremos un correo si se abre un lugar.` },
        cancelled: { subject: `Reserva cancelada: ${input.classTitle}`, body: `Tu reserva para el ${input.starts} ha sido cancelada.` },
        promoted: { subject: `Se abrió un lugar en ${input.classTitle}`, body: `Pasaste de la lista de espera a la clase del ${input.starts}. Tu lugar está confirmado.` },
      }
    : {
        confirmed: { subject: `You're booked for ${input.classTitle}`, body: `Your spot is confirmed for ${input.starts}.` },
        waitlisted: { subject: `You're on the waitlist for ${input.classTitle}`, body: `The class is currently full. You are waitlist position ${input.waitlistPosition || "pending"} for ${input.starts}. We will email you if a spot opens.` },
        cancelled: { subject: `Reservation cancelled for ${input.classTitle}`, body: `Your reservation for ${input.starts} has been cancelled.` },
        promoted: { subject: `A spot opened in ${input.classTitle}`, body: `You have been moved from the waitlist into the class on ${input.starts}. Your spot is now confirmed.` },
      })[input.status];

  const details = [
    input.ends ? (input.locale === "es" ? `Termina: ${input.ends}` : `Ends: ${input.ends}`) : "",
    input.manageUrl ? (input.locale === "es" ? `Administrar reserva: ${input.manageUrl}` : `Manage reservation: ${input.manageUrl}`) : "",
    input.locale === "es"
      ? `${BOOKING_OPERATIONS.guidance.es.arrival}\n${BOOKING_OPERATIONS.guidance.es.whatToBring}`
      : `${BOOKING_OPERATIONS.guidance.en.arrival}\n${BOOKING_OPERATIONS.guidance.en.whatToBring}`,
    input.locale === "es" ? BOOKING_OPERATIONS.policy.es : BOOKING_OPERATIONS.policy.en,
  ].filter(Boolean).join("\n\n");

  if (input.status === "confirmed" || input.status === "promoted") {
    const minimumAttendanceReminder = !isJiuJitsuClass
      ? ""
      : input.locale === "es"
        ? "\n\nRecordatorio: las clases de jiu-jitsu requieren al menos dos personas inscritas. Si hay menos de dos personas inscritas, tu reserva se moverá a la próxima clase programada de jiu-jitsu."
        : "\n\nReminder: Jiu-Jitsu classes require at least two registered participants. If fewer than two people are registered, your reservation will move to the next scheduled Jiu-Jitsu class.";
    return {
      ...copy,
      body: input.locale === "es"
        ? `${copy.body}\n\nDirección de Ground Up: ${GROUND_UP_ADDRESS}\n\n${details}${minimumAttendanceReminder}`
        : `${copy.body}\n\nGround Up address: ${GROUND_UP_ADDRESS}\n\n${details}${minimumAttendanceReminder}`,
    };
  }

  return { ...copy, body: `${copy.body}\n\n${details}` };
}

function resend() {
  return new ReplitConnectors();
}

export async function deliverResendEmailWithProxy(
  proxy: ResendProxy,
  input: ResendEmailPayload,
  idempotencyKey?: string,
) {
  const response = await proxy("resend", "/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: input.from || BOOKING_FROM,
      to: [input.to],
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      subject: input.subject,
      text: input.text,
    }),
  });
  const responseText = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}${responseText ? `: ${responseText.slice(0, 300)}` : ""}`);
  }
  try {
    const parsed = responseText ? JSON.parse(responseText) : {};
    return typeof parsed?.id === "string" ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

export async function deliverResendEmail(input: ResendEmailPayload, idempotencyKey?: string) {
  const connector = resend();
  return deliverResendEmailWithProxy(
    connector.proxy.bind(connector) as unknown as ResendProxy,
    input,
    idempotencyKey,
  );
}

export async function sendStaffNotificationEmail(input: {
  subject: string;
  text: string;
  inboxPath: string;
  replyTo?: string;
}) {
  const response = await resend().proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ground Up <info@groundupbjj.com>",
      to: [STAFF_EMAIL],
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      subject: input.subject,
      text: `${input.text}\n\nOpen in portal: ${input.inboxPath}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}`);
  }
}

export function leadAcknowledgementEmailContent(input: {
  firstName: string;
  program: string;
  classTitle?: string | null;
  locale: "en" | "es";
}) {
  const adaptive = input.program === "adaptive-capacity";
  if (input.locale === "es") {
    return {
      subject: adaptive ? "Recibimos tu registro para Capacidad Adaptativa" : "Recibimos tu solicitud de Ground Up",
      text: [
        `Hola ${input.firstName},`,
        "",
        adaptive
          ? "Recibimos tu registro para recibir noticias sobre Capacidad Adaptativa."
          : `Recibimos tu solicitud${input.classTitle ? ` para ${input.classTitle}` : ""}.`,
        "Nuestro equipo revisará tu información y te responderá dentro de 24 a 48 horas.",
        "",
        "Gracias,",
        "Ground Up Jiu-Jitsu & Fitness",
      ].join("\n"),
    };
  }
  return {
    subject: adaptive ? "We received your Adaptive Capacity signup" : "We received your Ground Up request",
    text: [
      `Hi ${input.firstName},`,
      "",
      adaptive
        ? "We received your signup to hear more about Adaptive Capacity."
        : `We received your request${input.classTitle ? ` for ${input.classTitle}` : ""}.`,
      "Our team will review your information and get back to you within 24–48 hours.",
      "",
      "Thank you,",
      "Ground Up Jiu-Jitsu & Fitness",
    ].join("\n"),
  };
}

export async function sendLeadAcknowledgementEmail(input: {
  to: string;
  firstName: string;
  program: string;
  classTitle?: string | null;
  locale: "en" | "es";
}) {
  const copy = leadAcknowledgementEmailContent(input);
  const response = await resend().proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ground Up <info@groundupbjj.com>",
      to: [input.to],
      subject: copy.subject,
      text: copy.text,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}`);
  }
}

export function contactAcknowledgementEmailContent(input: {
  firstName: string;
  subject: string;
  locale: "en" | "es";
}) {
  return input.locale === "es"
    ? {
        subject: "Recibimos tu mensaje de Ground Up",
        text: `Hola ${input.firstName},\n\nRecibimos tu mensaje sobre “${input.subject}”. Nuestro equipo te responderá dentro de 24 a 48 horas.\n\nGracias,\nGround Up Jiu-Jitsu & Fitness`,
      }
    : {
        subject: "We received your Ground Up message",
        text: `Hi ${input.firstName},\n\nWe received your message about “${input.subject}”. Our team will get back to you within 24–48 hours.\n\nThank you,\nGround Up Jiu-Jitsu & Fitness`,
      };
}

export async function sendContactAcknowledgementEmail(input: {
  to: string;
  firstName: string;
  subject: string;
  locale: "en" | "es";
}) {
  const copy = contactAcknowledgementEmailContent(input);
  const response = await resend().proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ground Up <info@groundupbjj.com>",
      to: [input.to],
      subject: copy.subject,
      text: copy.text,
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
  const locale = input.locale === "es" ? "es" : "en";
  const starts = formatBookingDateTime(input.startsAt, locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const copy = classLifecycleEmailContent({
    classTitle: input.classTitle,
    starts,
    status: input.status,
    waitlistPosition: input.waitlistPosition,
    locale: input.locale === "es" ? "es" : "en",
  });
  await deliverResendEmail({
    to: input.to,
    subject: copy.subject,
    text: input.locale === "es"
      ? `Hola ${input.firstName},\n\n${copy.body}\n\nGround Up Jiu-Jitsu & Fitness`
      : `Hi ${input.firstName},\n\n${copy.body}\n\nGround Up Jiu-Jitsu & Fitness`,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  locale: "en" | "es";
  resetUrl: string;
}) {
  const copy = passwordResetEmailContent(input.locale, input.resetUrl);
  const response = await resend().proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ground Up <info@groundupbjj.com>",
      to: [input.to],
      subject: copy.subject,
      text: copy.text,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}`);
  }
}

export async function sendEmailVerificationEmail(input: {
  to: string;
  locale: "en" | "es";
  verificationUrl: string;
}) {
  const content = emailVerificationContent(input.locale, input.verificationUrl);
  await resend().proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ground Up <info@groundupbjj.com>",
      to: [input.to],
      subject: content.subject,
      text: content.text,
    }),
  });
}