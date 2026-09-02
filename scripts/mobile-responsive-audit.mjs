import fs from "node:fs";

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
console.log("MANUAL QA REQUIRED: no Chromium, Playwright, Puppeteer, or browser CLI is installed in this workspace.");
console.log("This package verifies responsive source guardrails only; it does not claim rendered viewport success.");
if (checks.some(([, passed]) => !passed)) process.exitCode = 1;