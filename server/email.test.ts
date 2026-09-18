import assert from "node:assert/strict";
import test from "node:test";
import { classLifecycleEmailContent, contactAcknowledgementEmailContent, deliverResendEmailWithProxy, GROUND_UP_ADDRESS, leadAcknowledgementEmailContent } from "./email";

test("lead acknowledgement copy matches the visitor language", () => {
  const english = leadAcknowledgementEmailContent({
    firstName: "Cecilia",
    program: "training",
    classTitle: "Ground Up BJJ",
    locale: "en",
  });
  const spanish = leadAcknowledgementEmailContent({
    firstName: "Cecilia",
    program: "training",
    classTitle: "Ground Up BJJ",
    locale: "es",
  });

  assert.match(english.subject, /received/i);
  assert.match(english.text, /24–48 hours/);
  assert.match(spanish.subject, /Recibimos/);
  assert.match(spanish.text, /24 a 48 horas/);
  assert.doesNotMatch(spanish.text, /Our team will get back/);
});

test("contact acknowledgement copy confirms the response window", () => {
  const english = contactAcknowledgementEmailContent({
    firstName: "Cecilia",
    subject: "Schedule Question",
    locale: "en",
  });
  const spanish = contactAcknowledgementEmailContent({
    firstName: "Cecilia",
    subject: "Pregunta sobre el horario",
    locale: "es",
  });

  assert.match(english.text, /Our team will get back to you within 24–48 hours/);
  assert.match(spanish.text, /Nuestro equipo te responderá dentro de 24 a 48 horas/);
});

test("only confirmed class emails include the member-facing academy address", () => {
  for (const locale of ["en", "es"] as const) {
    for (const status of ["confirmed", "promoted"] as const) {
      const email = classLifecycleEmailContent({
        classTitle: "SKILL",
        starts: locale === "es"
          ? "sábado, 12 de septiembre a las 10:00 a. m. PDT"
          : "Saturday, September 12 at 10:00 AM PDT",
        status,
        locale,
      });

      assert.match(email.body, new RegExp(GROUND_UP_ADDRESS), `${locale} ${status} email should include the address`);
    }

    for (const status of ["waitlisted", "cancelled"] as const) {
      const email = classLifecycleEmailContent({
        classTitle: "SKILL",
        starts: "Saturday, September 12 at 10:00 AM PDT",
        status,
        locale,
      });

      assert.doesNotMatch(email.body, new RegExp(GROUND_UP_ADDRESS), `${locale} ${status} email should not include the address`);
    }
  }
});

test("confirmed Jiu-Jitsu emails explain the two-person minimum in both languages", () => {
  const english = classLifecycleEmailContent({
    classTitle: "Ground Up — Jiu-Jitsu / Self-Defense",
    starts: "Wednesday, September 9 at 5:00 PM PDT",
    status: "confirmed",
    locale: "en",
  });
  const spanish = classLifecycleEmailContent({
    classTitle: "Ground Up — Jiu-Jitsu / Self-Defense",
    starts: "miércoles, 9 de septiembre a las 5:00 p. m. PDT",
    status: "confirmed",
    locale: "es",
  });
  const strength = classLifecycleEmailContent({
    classTitle: "Ground Up — Strength & Conditioning",
    starts: "Wednesday, September 9 at 6:00 PM PDT",
    status: "confirmed",
    locale: "en",
  });
  const waitlist = classLifecycleEmailContent({
    classTitle: "Ground Up — Jiu-Jitsu / Self-Defense",
    starts: "Wednesday, September 9 at 5:00 PM PDT",
    status: "waitlisted",
    locale: "en",
  });

  assert.match(english.body, /at least two registered participants/i);
  assert.match(english.body, /next scheduled Jiu-Jitsu class/i);
  assert.match(spanish.body, /al menos dos personas inscritas/i);
  assert.match(spanish.body, /próxima clase programada de jiu-jitsu/i);
  assert.doesNotMatch(strength.body, /at least two registered participants/i);
  assert.doesNotMatch(waitlist.body, /at least two registered participants/i);
});

test("mocked Resend delivery carries the outbox idempotency key and sender payload", async () => {
  let captured: { service: string; path: string; options: { headers: Record<string, string>; body: string } } | undefined;
  const id = await deliverResendEmailWithProxy(async (service, path, options) => {
    captured = { service, path, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ id: "msg_test_123" }) };
  }, {
    to: "qa@example.invalid",
    subject: "Booking confirmation",
    text: "A test booking",
  }, "member:reservation:occurrence:reservation_confirmed:1");

  assert.equal(id, "msg_test_123");
  assert.equal(captured?.service, "resend");
  assert.equal(captured?.path, "/emails");
  assert.equal(captured?.options.headers["Idempotency-Key"], "member:reservation:occurrence:reservation_confirmed:1");
  assert.deepEqual(JSON.parse(captured!.options.body), {
    from: "Ground Up <info@groundupbjj.com>",
    to: ["qa@example.invalid"],
    subject: "Booking confirmation",
    text: "A test booking",
  });
});