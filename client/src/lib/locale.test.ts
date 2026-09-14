import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GROUND_UP_ADDRESS, localizedPublicPath, PORTAL_COPY } from "./locale";

test("portal confirmation copy includes the academy address in English and Spanish", () => {
  assert.match(PORTAL_COPY.en.spotConfirmed, new RegExp(GROUND_UP_ADDRESS));
  assert.match(PORTAL_COPY.es.spotConfirmed, new RegExp(GROUND_UP_ADDRESS));
});

test("portal waitlist and cancellation copy does not include the academy address", () => {
  for (const locale of ["en", "es"] as const) {
    assert.doesNotMatch(PORTAL_COPY[locale].waitlistAdded, new RegExp(GROUND_UP_ADDRESS));
    assert.doesNotMatch(PORTAL_COPY[locale].reservationCancelled, new RegExp(GROUND_UP_ADDRESS));
  }
});

test("free-entry CTAs resolve to the localized Discovery Pass", () => {
  assert.equal(localizedPublicPath("/discovery-pass", "en"), "/discovery-pass");
  assert.equal(localizedPublicPath("/discovery-pass", "es"), "/es/discovery-pass");
  assert.equal(localizedPublicPath("/discovery-pass#included", "en"), "/discovery-pass#included");
  assert.equal(localizedPublicPath("/discovery-pass?utm_source=test", "es"), "/es/discovery-pass?utm_source=test");
});

test("public free-entry CTA surfaces do not bypass the Discovery Pass", () => {
  const sourceFiles = [
    "../pages/home.tsx",
    "../pages/pricing.tsx",
    "../pages/womens-self-defense.tsx",
    "../pages/girls.tsx",
    "../pages/contact.tsx",
    "../pages/personal-training.tsx",
    "../pages/live-schedule.tsx",
    "../components/layout/navbar.tsx",
    "../../../server/routes.ts",
  ];
  const sources = sourceFiles.map((file) => readFileSync(new URL(file, import.meta.url), "utf8"));
  const publicMarketingSources = [...sources.slice(0, 3), sources[4]];

  for (const source of publicMarketingSources) {
    assert.match(source, /discoveryPassPath|localizedPublicPath\(["']\/discovery-pass/);
    assert.doesNotMatch(source, /localizedPublicPath\(["']\/contact#contact-form/);
  }

  assert.match(sources[3], /contactPath/);
  assert.match(sources[5], /contactPath/);
  assert.match(sources[6], /occurrence\.firstVisitEligible[\s\S]*localizedPublicPath\(["']\/discovery-pass/);
  assert.match(sources[7], /firstVisitPath = localizedPublicPath\(["']\/discovery-pass/);
  assert.match(sources[8], /href="\/discovery-pass">Get Your Free Discovery Pass/);
  assert.doesNotMatch(sources[8], /href="\/book">Book Your Free First Visit/);
});