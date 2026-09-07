import assert from "node:assert/strict";
import test from "node:test";
import { contactAcknowledgementEmailContent, leadAcknowledgementEmailContent } from "./email";

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