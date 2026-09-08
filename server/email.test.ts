import assert from "node:assert/strict";
import test from "node:test";
import { classLifecycleEmailContent, contactAcknowledgementEmailContent, GROUND_UP_ADDRESS, leadAcknowledgementEmailContent } from "./email";

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