import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";

const BASE_URL = "http://127.0.0.1:5000";
const WIDTHS = [320, 375, 390, 430];
const HEIGHT = 900;
const OUTPUT_DIR = "audit-evidence/mobile-rendered";
const CHROME_DIR = "/tmp/ground-up-mobile-qa-chrome";
const CHROME_PATH =
  process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

const surfaces = [
  { id: "member-dashboard", route: "/portal/dashboard", role: "member" },
  { id: "member-schedule", route: "/portal/schedule", role: "member" },
  { id: "member-classes", route: "/portal/my-classes", role: "member" },
  { id: "member-form", route: "/portal/forms/personal-training-intake", role: "member" },
  { id: "coach", route: "/portal/coach", role: "coach" },
  { id: "class-management", route: "/portal/class-admin", role: "admin" },
  { id: "admin", route: "/portal/admin", role: "admin" },
];

if (!existsSync(CHROME_PATH)) {
  throw new Error(`Chromium was not found at ${CHROME_PATH}`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
    });
  }

  async ready() {
    await new Promise((resolve, reject) => {
      this.socket.once("open", resolve);
      this.socket.once("error", reject);
    });
  }

  call(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForJson(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chromium is still starting.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function sessionCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Login did not return a session cookie");
  return setCookie.split(";")[0];
}

async function api(path, options = {}, cookie) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} returned ${response.status}`);
  }
  return response;
}

async function createQaUsers() {
  // Reuse one synthetic account per role so repeated visual passes do not
  // create unbounded database rows or trip the public auth rate limiter.
  const suffix = "rendered-responsive";
  const password = `GroundUp-QA-${suffix}-Password`;
  const authHeaders = { "x-forwarded-for": `mobile-rendered-qa-${process.pid}` };
  const accounts = {};
  for (const [role, locale] of [
    ["member", "en"],
    ["coach", "en"],
  ]) {
    const email = `mobile-qa-${role}-${suffix}@example.invalid`;
    let response;
    try {
      response = await api("/api/portal/login", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ email, password }),
      });
    } catch {
      response = await api("/api/portal/signup", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email,
          password,
          firstName: "Mobile",
          lastName: role === "coach" ? "Coach" : "Member",
          locale,
        }),
      });
    }
    const body = await response.json();
    accounts[role] = { id: body.user.id, email, cookie: sessionCookie(response) };
  }

  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("DEMO_ADMIN_PASSWORD is not available");
  const adminLogin = await api("/api/portal/login", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email: "admin@groundupbjj.com", password: adminPassword }),
  });
  accounts.admin = {
    email: "admin@groundupbjj.com",
    cookie: sessionCookie(adminLogin),
  };
  await api(`/api/portal/admin/members/${accounts.coach.id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role: "coach" }),
  }, accounts.admin.cookie);

  return accounts;
}

async function evaluate(client, sessionId, expression, awaitPromise = false) {
  const result = await client.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result?.value;
}

async function run() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.rm(CHROME_DIR, { recursive: true, force: true });
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--remote-debugging-port=9222",
    `--user-data-dir=${CHROME_DIR}`,
    `--window-size=430,${HEIGHT}`,
    "about:blank",
  ], { stdio: "ignore" });

  let client;
  try {
    const version = await waitForJson("http://127.0.0.1:9222/json/version");
    const browser = new CdpClient(version.webSocketDebuggerUrl);
    await browser.ready();
    const target = await browser.call("Target.createTarget", { url: "about:blank" });
    const attached = await browser.call("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const sessionId = attached.sessionId;
    client = browser;
    await client.call("Page.enable", {}, sessionId);
    await client.call("Runtime.enable", {}, sessionId);
    await client.call("Network.enable", {}, sessionId);

    const accounts = await createQaUsers();
    const results = [];
    for (const width of WIDTHS) {
      await client.call("Emulation.setDeviceMetricsOverride", {
        width,
        height: HEIGHT,
        deviceScaleFactor: 1,
        mobile: true,
      }, sessionId);
      for (const locale of ["en", "es"]) {
        for (const surface of surfaces) {
          const account = accounts[surface.role];
          await client.call("Network.setCookie", {
            name: account.cookie.split("=")[0],
            value: account.cookie.split("=").slice(1).join("="),
            url: BASE_URL,
            httpOnly: true,
          }, sessionId);
          const route = locale === "es" ? `/es${surface.route}` : surface.route;
          await client.call("Page.navigate", { url: `${BASE_URL}${route}` }, sessionId);
          await delay(500);
          await evaluate(client, sessionId, `new Promise(resolve => {
            const start = Date.now();
            const check = () => document.readyState === "complete" || Date.now() - start > 5000
              ? resolve(true) : setTimeout(check, 100);
            check();
          })`, true);
          await delay(350);

          const menuCheck = await evaluate(client, sessionId, `(() => {
            const button = document.querySelector('button[aria-controls="portal-mobile-navigation"]');
            if (!button) return { present: false, opened: false };
            button.click();
            return new Promise(resolve => setTimeout(() => {
              const menu = document.getElementById("portal-mobile-navigation");
              const style = menu ? getComputedStyle(menu) : null;
              const opened = Boolean(menu && style && style.display !== "none" && menu.getBoundingClientRect().height > 0);
              button.click();
              resolve({ present: true, opened });
            }, 250));
          })()`, true);
          await delay(300);

          const metrics = await evaluate(client, sessionId, `(() => {
            const visible = (element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" &&
                element.getAttribute("aria-hidden") !== "true" &&
                rect.width > 0 && rect.height > 0;
            };
            const insideLocalScroller = (element) => {
              let parent = element.parentElement;
              while (parent) {
                const overflowX = getComputedStyle(parent).overflowX;
                if (overflowX === "auto" || overflowX === "scroll") return true;
                parent = parent.parentElement;
              }
              return false;
            };
            const controls = [...document.querySelectorAll("button, a, input, textarea, select")]
              .filter(visible)
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                  element,
                  tag: element.tagName.toLowerCase(),
                  role: element.getAttribute("role") || "",
                  text: (element.innerText || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "").trim().replace(/\\s+/g, " ").slice(0, 100),
                  html: element.outerHTML.slice(0, 240),
                  left: Math.round(rect.left * 10) / 10,
                  right: Math.round(rect.right * 10) / 10,
                  top: Math.round(rect.top * 10) / 10,
                  bottom: Math.round(rect.bottom * 10) / 10,
                  width: Math.round(rect.width * 10) / 10,
                  height: Math.round(rect.height * 10) / 10,
                  insideLocalScroller: insideLocalScroller(element),
                };
              });
            const outOfBounds = controls
              .filter((control) => (control.left < -1 || control.right > innerWidth + 1 || control.top < -1) && !control.insideLocalScroller)
              .map(({ element, ...control }) => control);
            const tooSmall = controls.filter((control) =>
              ["button", "input", "textarea", "select"].includes(control.tag) &&
              !(control.tag === "select" && control.width <= 1 && control.height <= 1) &&
              (control.width < 40 || control.height < 40)
            );
            const overflowSources = [...document.querySelectorAll("body *")]
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                  tag: element.tagName.toLowerCase(),
                  className: typeof element.className === "string" ? element.className.slice(0, 160) : "",
                  text: (element.innerText || "").trim().replace(/\s+/g, " ").slice(0, 80),
                  left: Math.round(rect.left * 10) / 10,
                  right: Math.round(rect.right * 10) / 10,
                  width: Math.round(rect.width * 10) / 10,
                };
              })
              .filter((element) => element.left < -1 || element.right > innerWidth + 1)
              .sort((a, b) => b.right - a.right)
              .slice(0, 12);
            return {
              title: document.title,
              bodyText: document.body.innerText.slice(0, 2000),
              viewport: innerWidth,
              documentWidth: document.documentElement.scrollWidth,
              bodyWidth: document.body.scrollWidth,
              pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
              outOfBounds,
              tooSmall: tooSmall.map(({ element, ...control }) => control),
              overflowSources,
              controlCount: controls.length,
            };
          })()`);
          const screenshot = await client.call("Page.captureScreenshot", { format: "jpeg", quality: 82 }, sessionId);
          const filename = `${width}-${locale}-${surface.id}.jpg`;
          await fs.writeFile(`${OUTPUT_DIR}/${filename}`, Buffer.from(screenshot.data, "base64"));
          let adminProfile = null;
          let profileScreenshot = null;
          if (surface.id === "admin") {
            adminProfile = await evaluate(client, sessionId, `(() => {
              const member = document.querySelector('[data-testid^="member-item-"]');
              if (!member) return { present: false, tabsFit: false, pageOverflow: false };
              member.click();
              return new Promise(resolve => setTimeout(() => {
                const tabs = [...document.querySelectorAll('[role="tab"]')]
                  .filter((tab) => getComputedStyle(tab).display !== "none");
                const tabsFit = tabs.every((tab) => {
                  const rect = tab.getBoundingClientRect();
                  return rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1;
                });
                resolve({
                  present: true,
                  tabCount: tabs.length,
                  tabsFit,
                  pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
                  profileTitle: document.querySelector('[role="tablist"]')?.innerText || "",
                });
              }, 500));
            })()`, true);
            await delay(250);
            profileScreenshot = `${width}-${locale}-${surface.id}-profile.jpg`;
            const profileCapture = await client.call("Page.captureScreenshot", { format: "jpeg", quality: 82 }, sessionId);
            await fs.writeFile(`${OUTPUT_DIR}/${profileScreenshot}`, Buffer.from(profileCapture.data, "base64"));
          }
          results.push({ width, locale, surface: surface.id, route, mobileMenu: menuCheck, adminProfile, ...metrics, screenshot: filename, profileScreenshot });
        }
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      targetWidths: WIDTHS,
      surfaces: surfaces.map(({ id, route, role }) => ({ id, route, role })),
      results,
      summary: {
        cases: results.length,
        pageOverflow: results.filter((result) => result.pageOverflow).length,
        outOfBoundsControls: results.filter((result) => result.outOfBounds.length).length,
        undersizedControls: results.filter((result) => result.tooSmall.length).length,
        mobileMenuFailures: results.filter((result) => !result.mobileMenu.present || !result.mobileMenu.opened).length,
        adminProfileFailures: results.filter((result) => result.surface === "admin" && (!result.adminProfile?.present ||
          !result.adminProfile.tabsFit || result.adminProfile.pageOverflow)).length,
      },
    };
    await fs.writeFile(`${OUTPUT_DIR}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report.summary));
    if (report.summary.pageOverflow || report.summary.outOfBoundsControls ||
      report.summary.undersizedControls || report.summary.mobileMenuFailures || report.summary.adminProfileFailures) {
      process.exitCode = 1;
    }
  } finally {
    client?.close();
    chrome.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});