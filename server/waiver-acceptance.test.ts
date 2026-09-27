import assert from "node:assert/strict";
import { test } from "node:test";
import type { Form } from "@shared/schema";
import {
  getWaiverTermsVersionHash,
  getWaiverTermsSnapshot,
  isVersionedWaiver,
  validateWaiverAcceptanceAnswers,
} from "./waiver-acceptance";

const waiver = {
  slug: "liability-waiver",
  title: "Martial Arts Liability Waiver",
  description: "Required waiver",
  fields: [
    { name: "fullName", type: "text", required: true },
    { name: "dateOfBirth", type: "date", required: true },
    { name: "riskAcknowledgment", type: "checkbox", required: true },
    { name: "liabilityRelease", type: "checkbox", required: true },
    { name: "digitalSignature", type: "text", required: true },
    { name: "signatureDate", type: "date", required: true },
  ],
} as unknown as Form;

const validAnswers = {
  fullName: "Jordan Member",
  dateOfBirth: "1990-05-10",
  riskAcknowledgment: true,
  liabilityRelease: true,
  digitalSignature: "Jordan Member",
  signatureDate: "2026-09-27",
};

test("waiver version hashes include the current terms but ignore JSON object key order", () => {
  const reordered = {
    ...waiver,
    fields: (waiver.fields as Array<Record<string, unknown>>).map((field) => ({
      ...field,
    })),
  };
  assert.equal(getWaiverTermsVersionHash(waiver), getWaiverTermsVersionHash(reordered));
  assert.notEqual(
    getWaiverTermsVersionHash(waiver),
    getWaiverTermsVersionHash({ ...waiver, title: "Updated waiver" }),
  );
  assert.deepEqual(getWaiverTermsSnapshot(waiver).fields, waiver.fields);
});

test("only the liability waiver is treated as a versioned waiver", () => {
  assert.equal(isVersionedWaiver(waiver), true);
  assert.equal(isVersionedWaiver({ slug: "intake-form" }), false);
});

test("waiver acceptance requires all affirmative consents and matching human signature", () => {
  const acceptance = validateWaiverAcceptanceAnswers(waiver, validAnswers);
  assert.equal(acceptance.signerName, "Jordan Member");
  assert.deepEqual(acceptance.evidence.consentedFields, {
    riskAcknowledgment: true,
    liabilityRelease: true,
  });
  assert.equal(acceptance.evidence.signatureDate, "2026-09-27");

  assert.throws(
    () => validateWaiverAcceptanceAnswers(waiver, { ...validAnswers, riskAcknowledgment: false }),
    /Accept every required waiver statement/,
  );
  assert.throws(
    () => validateWaiverAcceptanceAnswers(waiver, { ...validAnswers, digitalSignature: "Someone Else" }),
    /full name/,
  );
  assert.throws(
    () => validateWaiverAcceptanceAnswers(waiver, { ...validAnswers, dateOfBirth: "" }),
    /dateOfBirth/,
  );
  assert.throws(
    () => validateWaiverAcceptanceAnswers(waiver, { ...validAnswers, signatureDate: "2026-02-31" }),
    /valid signature date/,
  );

  const optionalConsent = {
    ...waiver,
    fields: [...waiver.fields, { name: "marketingOptIn", type: "checkbox", required: false }],
  };
  assert.doesNotThrow(() => validateWaiverAcceptanceAnswers(optionalConsent, validAnswers));
});
