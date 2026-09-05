import test from "node:test";
import assert from "node:assert/strict";
import { insertMinorProfileSchema } from "@shared/schema";
import { isGirlsClass, minorAgeAt } from "./member-entitlements";
import { localizeFormText } from "../client/src/lib/locale";
import { localizedClassTitle } from "../client/src/lib/class-booking";

test("girls classes are classified separately from adult classes", () => {
  assert.equal(isGirlsClass({
    canonicalCategory: "GIRLS_JIU_JITSU_SELF_DEFENSE",
    audienceGroup: "FEMALE_YOUTH",
  }), true);
  assert.equal(isGirlsClass({
    canonicalCategory: "JIU_JITSU_SELF_DEFENSE",
    audienceGroup: "ADULT_WOMEN",
  }), false);
});

test("minor eligibility uses the participant age at class time", () => {
  const birthDate = new Date("2010-09-05T00:00:00.000Z");
  assert.equal(minorAgeAt(birthDate, new Date("2028-09-04T00:00:00.000Z")), 17);
  assert.equal(minorAgeAt(birthDate, new Date("2028-09-05T00:00:00.000Z")), 18);
});

test("minor profile data requires contact details and guardian consent fields", () => {
  const valid = insertMinorProfileSchema.safeParse({
    guardianUserId: "guardian-1",
    firstName: "Sofia",
    lastName: "Rivera",
    dateOfBirth: "2014-05-10",
    emergencyContactName: "Ana Rivera",
    emergencyContactPhone: "555-555-0100",
    emergencyContactRelationship: "Mother",
    consentSignature: "Ana Rivera",
    consentedAt: new Date(),
  });
  assert.equal(valid.success, true);
  assert.equal(insertMinorProfileSchema.safeParse({
    guardianUserId: "guardian-1",
    firstName: "Sofia",
    lastName: "Rivera",
    dateOfBirth: "2014-05-10",
    emergencyContactName: "",
    emergencyContactPhone: "555",
    emergencyContactRelationship: "Mother",
    consentSignature: "",
    consentedAt: new Date(),
  }).success, false);
});

test("girls class participant copy is available in English and Spanish", () => {
  const occurrence = {
    title: "Girls' Jiu-Jitsu",
    canonicalCategory: "GIRLS_JIU_JITSU_SELF_DEFENSE",
    strengthFocus: null,
  } as const;
  assert.equal(localizedClassTitle(occurrence, "en"), "Girls' Jiu-Jitsu");
  assert.match(localizedClassTitle(occurrence, "es"), /Niñas/);
  assert.equal(
    localizeFormText("es", "minor-consent", "field", "Parent / Guardian Full Name", "parentName"),
    "Nombre completo de madre, padre o tutora",
  );
  assert.equal(
    localizeFormText("en", "minor-consent", "field", "Parent / Guardian Full Name", "parentName"),
    "Parent / Guardian Full Name",
  );
});