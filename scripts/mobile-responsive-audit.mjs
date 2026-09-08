import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";

const widths = [320, 375, 390, 430];
const files = {
  css: "client/src/index.css",
  navbar: "client/src/components/layout/portal-navbar.tsx",
  dashboard: "client/src/pages/portal/dashboard.tsx",
  schedule: "client/src/pages/portal/schedule.tsx",
  forms: "client/src/pages/portal/form.tsx",
  coach: "client/src/pages/portal/coach.tsx",
  admin: "client/src/pages/portal/admin.tsx",
  classAdmin: "client/src/pages/portal/class-admin.tsx",
};

const source = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, fs.readFileSync(file, "utf8")]));
const checks = [
  ["page overflow guard", source.css.includes("overflow-x: hidden")],
  ["mobile menu exposes expanded state", source.navbar.includes("aria-expanded") && source.navbar.includes("aria-controls")],
  ["mobile menu is breakpoint constrained", source.navbar.includes("md:hidden")],
  ["dashboard has mobile tap sizing", source.dashboard.includes("min-h-11")],
  ["forms stack narrow actions", source.forms.includes("flex-col") && source.forms.includes("sm:flex-row")],
  ["schedule contains local horizontal scrolling only", source.schedule.includes("overflow-x-auto")],
  ["coach layout collapses before desktop", source.coach.includes("lg:grid-cols-3")],
  ["admin layout has narrow-screen controls", source.admin.includes("min-h-11") || source.admin.includes("py-3")],
  ["class admin has narrow-screen controls", source.classAdmin.includes("min-h-11") || source.classAdmin.includes("py-3")],
];

console.log("Ground Up deterministic responsive fallback QA");
console.log(`Target widths: ${widths.join(", ")}px`);
for (const [label, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);

const baseUrl = (process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`).replace(/\/+$/, "");
const scheduleFixture = {
  timezone: "America/Los_Angeles",
  source: "google_calendar",
  sync: { configured: true, healthy: true, lastSuccessfulAt: "2026-09-08T00:00:00.000Z" },
  occurrences: [
    {
      id: "browser-first-visit",
      title: "Beginner Jiu-Jitsu",
      start: "2026-09-09T17:00:00.000Z",
      end: "2026-09-09T18:00:00.000Z",
      location: "Ground Up",
      instructorName: "Raymi Gonzalez",
      capacity: 12,
      confirmedCount: 0,
      bookingState: "available",
      firstVisitEligible: true,
      bookingEnabled: true,
      audience: "all",
      audienceGroup: "ALL",
      girlsClass: false,
      canonicalCategory: "BJJ",
      strengthFocus: null,
    },
    {
      id: "browser-member",
      title: "Advanced Training",
      start: "2026-09-10T17:00:00.000Z",
      end: "2026-09-10T18:00:00.000Z",
      location: "Ground Up",
      instructorName: "Raymi Gonzalez",
      capacity: 12,
      confirmedCount: 0,
      bookingState: "available",
      firstVisitEligible: false,
      bookingEnabled: true,
      audience: "members",
      audienceGroup: "ALL",
      girlsClass: false,
      canonicalCategory: "BJJ",
      strengthFocus: null,
    },
    {
      id: "browser-contact",
      title: "Girls Program",
      start: "2026-09-11T17:00:00.000Z",
      end: "2026-09-11T18:00:00.000Z",
      location: "Ground Up",
      instructorName: "Raymi Gonzalez",
      capacity: 12,
      confirmedCount: 0,
      bookingState: "not_available",
      firstVisitEligible: false,
      bookingEnabled: false,
      audience: "all",
      audienceGroup: "ALL",
      girlsClass: true,
      canonicalCategory: "GIRLS_JIU_JITSU_SELF_DEFENSE",
      strengthFocus: null,
    },
  ],
};

function expectPath(page, expectedPath) {
  const actual = new URL(page.url());
  const expected = new URL(expectedPath, baseUrl);
  if (actual.pathname !== expected.pathname || actual.hash !== expected.hash) {
    throw new Error(`Expected ${expected.pathname}${expected.hash}, received ${actual.pathname}${actual.hash}`);
  }
}

async function clickAndExpectPath(page, locator, expectedPath) {
  await locator.waitFor({ state: "visible" });
  await Promise.all([
    page.waitForURL((url) => {
      const actual = new URL(url);
      const expected = new URL(expectedPath, baseUrl);
      return actual.pathname === expected.pathname && actual.hash === expected.hash;
    }),
    locator.click(),
  ]);
  expectPath(page, expectedPath);
}

async function runBrowserSmoke() {
  let systemChromium;
  try {
    systemChromium = execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
  } catch {
    systemChromium = undefined;
  }
  const browser = await chromium.launch({
    headless: true,
    ...(systemChromium ? { executablePath: systemChromium } : {}),
  });
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });

  for (const context of [desktop, mobile]) {
    await context.route("**/api/classes", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(scheduleFixture),
    }));
  }

  try {
    const page = await desktop.newPage();

    for (const [localePath, discoveryPath] of [["/", "/discovery-pass"], ["/es", "/es/discovery-pass"]]) {
      await page.goto(`${baseUrl}${localePath}`);
      await clickAndExpectPath(page, page.getByTestId("hero-cta-book"), discoveryPath);

      await page.goto(`${baseUrl}${localePath}`);
      await clickAndExpectPath(page, page.getByTestId("nav-free-visit-desktop"), discoveryPath);

      await page.goto(`${baseUrl}${localePath === "/" ? "/pricing" : "/es/pricing"}`);
      await clickAndExpectPath(
        page,
        page.locator("section").first().locator(`a[href="${discoveryPath}"]`),
        discoveryPath,
      );
    }
    console.log("PASS  desktop localized home, pricing, and navbar free-entry CTAs");

    for (const [localePath, discoveryPath, contactPath, memberPath] of [
      ["/schedule", "/discovery-pass", "/contact#contact-form", "/portal/schedule"],
      ["/es/horario", "/es/discovery-pass", "/es/contacto#contact-form", "/es/portal/schedule"],
    ]) {
      await page.goto(`${baseUrl}${localePath}`);
      const firstVisitLabel = localePath.startsWith("/es") ? "Reservar primera visita" : "Book first visit";
      const contactLabel = localePath.startsWith("/es") ? "Consultar disponibilidad" : "Contact / inquire";
      const memberLabel = localePath.startsWith("/es") ? "Reserva para miembros" : "Member booking";
      await clickAndExpectPath(page, page.getByRole("button", { name: firstVisitLabel, exact: true }), discoveryPath);

      await page.goto(`${baseUrl}${localePath}`);
      await clickAndExpectPath(page, page.getByRole("button", { name: contactLabel, exact: true }), contactPath);

      await page.goto(`${baseUrl}${localePath}`);
      await clickAndExpectPath(page, page.getByRole("button", { name: memberLabel, exact: true }), memberPath);
    }
    console.log("PASS  localized schedule free-entry, contact, and member actions");

    const mobilePage = await mobile.newPage();
    for (const [localePath, discoveryPath] of [["/", "/discovery-pass"], ["/es", "/es/discovery-pass"]]) {
      await mobilePage.goto(`${baseUrl}${localePath}`);
      await mobilePage.getByTestId("mobile-menu-toggle").click();
      await clickAndExpectPath(mobilePage, mobilePage.getByTestId("nav-free-visit-mobile"), discoveryPath);
    }
    console.log("PASS  mobile navbar CTAs preserve locale");
  } finally {
    await desktop.close();
    await mobile.close();
    await browser.close();
  }
}

if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
else {
  try {
    await runBrowserSmoke();
  } catch (error) {
    console.error(`FAIL  browser smoke: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}