import { createHash } from "node:crypto";
import type { Form } from "@shared/schema";

type WaiverFormVersion = Pick<Form, "slug" | "title" | "description" | "fields">;

export type WaiverAcceptanceEvidence = {
  signerName: string;
  evidence: {
    consentedFields: Record<string, true>;
    signatureDate: string;
  };
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(record[key])}`,
    ).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? "null" : serialized;
}

export function isVersionedWaiver(form: Pick<Form, "slug">) {
  return form.slug === "liability-waiver";
}

export function getWaiverTermsSnapshot(form: WaiverFormVersion) {
  return {
    slug: form.slug,
    title: form.title,
    description: form.description,
    fields: form.fields,
  };
}

export function getWaiverTermsVersionHash(form: WaiverFormVersion) {
  return createHash("sha256")
    .update(stableJson(getWaiverTermsSnapshot(form)))
    .digest("hex");
}

export function validateWaiverAcceptanceAnswers(
  form: WaiverFormVersion,
  input: unknown,
): WaiverAcceptanceEvidence {
  if (!isVersionedWaiver(form)) {
    throw new Error("This form does not support current waiver acceptance.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Complete the waiver using the member form.");
  }

  const answers = input as Record<string, unknown>;
  const fields = Array.isArray(form.fields)
    ? form.fields as Array<{ name?: string; id?: string; type?: string; required?: boolean }>
    : [];
  const consentedFields: Record<string, true> = {};

  for (const field of fields) {
    const key = field.name || field.id;
    if (!key) continue;
    const value = answers[key];
    if (field.type === "checkbox") {
      if (field.required && value !== true) {
        throw new Error("Accept every required waiver statement before submitting.");
      }
      if (field.required) consentedFields[key] = true;
      continue;
    }
    if (!field.required) continue;
    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`Complete the required waiver field: ${key}.`);
      }
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Complete the required waiver field: ${key}.`);
    }
  }

  const nameField = fields.find((field) => (field.name || field.id) === "fullName");
  const signatureField = fields.find((field) => (field.name || field.id) === "digitalSignature");
  const dateField = fields.find((field) => (field.name || field.id) === "signatureDate");
  const signerName = nameField ? String(answers[nameField.name || nameField.id || ""] || "").trim() : "";
  const signature = signatureField ? String(answers[signatureField.name || signatureField.id || ""] || "").trim() : "";
  const signatureDate = dateField ? String(answers[dateField.name || dateField.id || ""] || "").trim() : "";

  if (!signerName || !signature || signerName.localeCompare(signature, undefined, { sensitivity: "accent" }) !== 0) {
    throw new Error("Type your full name in both the name and digital signature fields.");
  }
  const parsedSignatureDate = /^\d{4}-\d{2}-\d{2}$/.test(signatureDate)
    ? new Date(`${signatureDate}T00:00:00.000Z`)
    : null;
  if (!parsedSignatureDate
    || Number.isNaN(parsedSignatureDate.getTime())
    || parsedSignatureDate.toISOString().slice(0, 10) !== signatureDate) {
    throw new Error("Enter a valid signature date.");
  }

  return {
    signerName,
    evidence: {
      consentedFields,
      signatureDate,
    },
  };
}