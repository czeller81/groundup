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

test("confirmed class emails include the member-facing academy address", () => {
  const english = classLifecycleEmailContent({
    classTitle: "SKILL",
    starts: "Saturday, September 12 at 10:00 AM PDT",
    status: "confirmed",
    locale: "en",
  });
  const spanish = classLifecycleEmailContent({
    classTitle: "SKILL",
    starts: "sábado, 12 de septiembre a las 10:00 a. m. PDT",
    status: "promoted",
    locale: "es",
  });
  const waitlisted = classLifecycleEmailContent({
    classTitle: "SKILL",
    starts: "Saturday, September 12 at 10:00 AM PDT",
    status: "waitlisted",
    locale: "en",
  });

  assert.match(english.body, new RegExp(GROUND_UP_ADDRESS));
  assert.match(spanish.body, new RegExp(GROUND_UP_ADDRESS));
  assert.doesNotMatch(waitlisted.body, new RegExp(GROUND_UP_ADDRESS));
});