import crypto from "node:crypto";
import fs from "node:fs/promises";
import pg from "pg";
import Stripe from "stripe";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.BROWSER_QA_BASE_URL || "http://127.0.0.1:5000";
const CHROMIUM_PATH =
  process.env.BROWSER_EXECUTABLE_PATH ||
  "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";
const password = "GroundUp-Browser-QA-2026!";
const prefix = `ground-up-browser-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const email = `${prefix}@example.invalid`;
const evidenceDir = "audit-evidence/stripe-browser";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

const forms = {
  "personal-training-intake": async (page) => {
    await page.locator('[data-testid="input-trainingExperience"]').fill("New to structured jiu-jitsu training.");
    await chooseFirst(page, "currentFitness");
    await page.locator('[data-testid="input-injuries"]').fill("None");
    await page.locator('[data-testid="input-availability"]').fill("Monday and Wednesday evenings");
  },
  "health-parq": async (page) => {
    for (const group of await page.locator('[role="radiogroup"]').all()) {
      await group.getByRole("radio").last().click();
    }
    await page.locator('[data-testid="input-emergencyContact"]').fill("Browser QA Contact, 555-0100");
  },
  "goals-preferences": async (page) => {
    await chooseFirst(page, "primaryGoal");
    await page.locator('[data-testid="input-shortTermGoals"]').fill("Build consistency and confidence.");
    await page.locator('[data-testid="input-longTermGoals"]').fill("Train regularly and improve overall fitness.");
    await chooseFirst(page, "preferredStyle");
  },
  "liability-waiver": async (page) => {
    await page.locator('[data-testid="input-fullName"]').fill("Browser QA Member");
    await page.locator('[data-testid="input-dateOfBirth"]').fill("1990-01-01");
    await page.locator('[data-testid="input-emergencyContact"]').fill("Browser QA Contact");
    await page.locator('[data-testid="input-emergencyPhone"]').fill("555-0100");
    for (const checkbox of await page.locator('input[type="checkbox"]').all()) {
      await checkbox.check();
    }
    await page.locator('[data-testid="input-digitalSignature"]').fill("Browser QA Member");
    await page.locator('[data-testid="input-signatureDate"]').fill("2026-09-06");
  },
  "media-release": async (page) => {
    await page.locator('[role="radiogroup"]').getByRole("radio").last().click();
  },
  "gym-rules": async (page) => {
    for (const checkbox of await page.locator('input[type="checkbox"]').all()) {
      await checkbox.check();
    }
  },
};

async function chooseFirst(page, name) {
  await page.locator(`[data-testid="select-${name}"]`).click();
  await page.getByRole("option").first().click();
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${evidenceDir}/${name}.png`, fullPage: true });
}

async function waitForBillingState(page, expectedState, timeout = 30000) {
  await page.waitForFunction(
    async (state) => {
      const response = await fetch("/api/portal/billing");
      if (!response.ok) return false;
      const body = await response.json();
      return body.activeMembership?.billingState === state;
    },
    expectedState,
    { timeout },
  );
}

async function postSignedWebhook(type, object, id) {
  const payload = JSON.stringify({
    id,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    type,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const response = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });
  if (!response.ok) throw new Error(`Webhook ${type} returned ${response.status}`);
}

async function cleanup() {
  const customers = await stripe.customers.list({ limit: 100 });
  for (const customer of customers.data.filter((item) => (item.email || "").startsWith(prefix))) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 100,
    });
    for (const subscription of subscriptions.data) {
      if (!["canceled", "incomplete_expired"].includes(subscription.status)) {
        try {
          await stripe.subscriptions.cancel(subscription.id);
        } catch {}
      }
    }
    const sessions = await stripe.checkout.sessions.list({ customer: customer.id, limit: 100 });
    for (const session of sessions.data) {
      if (session.status === "open") {
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch {}
      }
    }
    try {
      await stripe.customers.del(customer.id);
    } catch {}
  }

  const pool = new pg.Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "CREATE TEMP TABLE browser_qa_users ON COMMIT DROP AS SELECT id FROM users WHERE email LIKE $1",
      [`${prefix}%`],
    );
    const deletes = [
      "DELETE FROM bookings USING browser_qa_users WHERE bookings.user_id = browser_qa_users.id",
      "DELETE FROM class_reservations USING browser_qa_users WHERE class_reservations.user_id = browser_qa_users.id OR class_reservations.attendance_recorded_by = browser_qa_users.id",
      "DELETE FROM discovery_passes USING browser_qa_users WHERE discovery_passes.user_id = browser_qa_users.id OR discovery_passes.created_by = browser_qa_users.id",
      "DELETE FROM emergency_contacts USING browser_qa_users WHERE emergency_contacts.user_id = browser_qa_users.id",
      "DELETE FROM entitlement_ledger USING browser_qa_users WHERE entitlement_ledger.user_id = browser_qa_users.id",
      "DELETE FROM form_responses USING browser_qa_users WHERE form_responses.user_id = browser_qa_users.id",
      "DELETE FROM member_audit_events USING browser_qa_users WHERE member_audit_events.user_id = browser_qa_users.id OR member_audit_events.actor_id = browser_qa_users.id",
      "DELETE FROM member_goals USING browser_qa_users WHERE member_goals.user_id = browser_qa_users.id",
      "DELETE FROM member_lifecycle_events USING browser_qa_users WHERE member_lifecycle_events.user_id = browser_qa_users.id OR member_lifecycle_events.actor_id = browser_qa_users.id",
      "DELETE FROM member_lifecycles USING browser_qa_users WHERE member_lifecycles.user_id = browser_qa_users.id",
      "DELETE FROM memberships USING browser_qa_users WHERE memberships.user_id = browser_qa_users.id OR memberships.assigned_by = browser_qa_users.id",
      "DELETE FROM minor_profiles USING browser_qa_users WHERE minor_profiles.guardian_user_id = browser_qa_users.id",
      "DELETE FROM password_reset_tokens USING browser_qa_users WHERE password_reset_tokens.user_id = browser_qa_users.id",
      "DELETE FROM session_notes USING browser_qa_users WHERE session_notes.user_id = browser_qa_users.id OR session_notes.coach_id = browser_qa_users.id",
      "DELETE FROM users USING browser_qa_users WHERE users.id = browser_qa_users.id",
    ];
    for (const statement of deletes) await client.query(statement);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  await fs.mkdir(evidenceDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") console.error(`browser-console: ${message.text()}`);
  });

  try {
    await page.goto(`${BASE_URL}/portal/login`, { waitUntil: "networkidle" });
    await page.getByTestId("tab-signup").click();
    await page.getByTestId("input-signup-firstname").fill("Browser QA");
    await page.getByTestId("input-signup-lastname").fill("Member");
    await page.getByTestId("input-signup-email").fill(email);
    await page.getByTestId("input-signup-phone").fill("555-0100");
    await page.getByTestId("input-signup-password").fill(password);
    await page.getByTestId("input-signup-confirm").fill(password);
    await Promise.all([
      page.waitForURL(/\/portal\/dashboard$/),
      page.getByTestId("button-signup").click(),
    ]);
    await page.goto(`${BASE_URL}/portal/billing`, { waitUntil: "networkidle" });
    await page.getByText("Complete required forms", { exact: true }).waitFor();
    await screenshot(page, "01-forms-incomplete");
    await page.getByText("Ground Up 2", { exact: true }).waitFor();
    await screenshot(page, "02-membership-selection");

    for (const [slug, fill] of Object.entries(forms)) {
      await page.goto(`${BASE_URL}/portal/forms/${slug}`, { waitUntil: "networkidle" });
      await fill(page);
      await Promise.all([
        page.waitForURL(/\/portal\/dashboard$/),
        page.getByTestId("button-submit-form").click(),
      ]);
    }

    await page.goto(`${BASE_URL}/portal/billing`, { waitUntil: "networkidle" });
    await page.getByText("$139/mo", { exact: false }).waitFor();
    await page.getByText("2 adult group sessions each week", { exact: true }).waitFor();
    await screenshot(page, "03-ground-up-2-card");
    await page.getByText("Ground Up 3", { exact: true }).waitFor();
    await page.getByText("$159/mo", { exact: false }).waitFor();
    await page.getByText("3 adult group sessions each week", { exact: true }).waitFor();
    await page.getByText("Ground Up Personal", { exact: true }).waitFor();
    await page.getByText("$250/mo", { exact: false }).waitFor();
    await page.getByText("1 private session each week; no group entitlement", { exact: true }).waitFor();
    if (await page.getByText("Girls Program", { exact: true }).count()) {
      throw new Error("Girls Program is visible for an ordinary adult member");
    }

    const startButtons = page.getByRole("button", { name: "Start membership" });
    await startButtons.first().click();
    await page.waitForURL(/stripe\.com/, { timeout: 45000 });
    await screenshot(page, "04-stripe-checkout");

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.count() && !(await emailInput.inputValue())) {
      await emailInput.fill(email);
    }
    const cardNumber = page.locator('input[name="cardNumber"]').first();
    const cardExpiry = page.locator('input[name="cardExpiry"]').first();
    const cardCvc = page.locator('input[name="cardCvc"]').first();
    if (!(await cardNumber.count())) throw new Error("Stripe card number field not found");
    await cardNumber.fill("4242424242424242");
    await cardExpiry.fill("1230");
    await cardCvc.fill("123");
    const postalCode = page.locator('input[name="billingPostalCode"]').first();
    if (await postalCode.count()) await postalCode.fill("93001");
    const payButton = page.getByRole("button", { name: /Pay|Subscribe|Start trial/i }).last();
    await payButton.click();
    await page.waitForURL(/\/portal\/billing/, { timeout: 60000 });
    await waitForBillingState(page, "active", 60000);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Ground Up 2", { exact: true }).first().waitFor();
    await page.getByText("Active", { exact: true }).waitFor();
    await page.getByText("Manage billing", { exact: true }).waitFor();
    await screenshot(page, "05-active-membership");

    const activeButtons = page.getByRole("button", { name: "Membership already active" });
    if ((await activeButtons.count()) < 3) throw new Error("Duplicate purchase UI is incomplete");
    await screenshot(page, "06-duplicate-purchase-blocker");

    await page.getByRole("button", { name: "Manage billing" }).click();
    await page.waitForURL(/stripe\.com/, { timeout: 45000 });
    await page.getByText(/Payment|Billing|Subscription/i).first().waitFor({ timeout: 30000 });
    await screenshot(page, "07-customer-portal");
    await page.goBack({ waitUntil: "networkidle" });
    await page.waitForURL(/\/portal\/billing/);

    const billingResponse = await page.evaluate(async () => (await fetch("/api/portal/billing")).json());
    const subscriptionId = billingResponse.activeMembership?.stripeSubscriptionId;
    if (!subscriptionId) throw new Error("Active subscription ID was not returned");
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await postSignedWebhook(
      "invoice.payment_failed",
      {
        id: `in_browser_failed_${Date.now()}`,
        parent: { subscription_details: { subscription: subscriptionId } },
      },
      `evt_browser_failed_${Date.now()}`,
    );
    await page.reload({ waitUntil: "networkidle" });
    await waitForBillingState(page, "past_due");
    await page.getByText("Payment past due", { exact: true }).waitFor();
    await page.getByText("Update your payment method to keep access.", { exact: true }).waitFor();
    await screenshot(page, "08-past-due");

    await postSignedWebhook(
      "invoice.paid",
      { id: `in_browser_paid_${Date.now()}`, parent: { subscription_details: { subscription: subscriptionId } } },
      `evt_browser_paid_${Date.now()}`,
    );
    await page.reload({ waitUntil: "networkidle" });
    await waitForBillingState(page, "active");
    await page.getByRole("button", { name: "Cancel at period end" }).click();
    await page.getByText("Cancellation scheduled", { exact: true }).waitFor();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Ends at period end", { exact: true }).waitFor();
    await page.getByText("Your access continues through the paid period.", { exact: true }).waitFor();
    await screenshot(page, "09-cancel-at-period-end");

    await page.goto(`${BASE_URL}/es/portal/billing`, { waitUntil: "networkidle" });
    await page.getByText("Membresía", { exact: true }).waitFor();
    await page.getByText("Administrar pago", { exact: true }).waitFor();
    await page.getByText("Ground Up 2", { exact: true }).first().waitFor();
    await screenshot(page, "10-spanish-membership");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/portal/billing`, { waitUntil: "networkidle" });
    await page.getByText("Choose your Ground Up rhythm", { exact: true }).waitFor();
    await screenshot(page, "11-mobile-membership-390");

    console.log(JSON.stringify({
      result: "PASS",
      account: "synthetic browser fixture",
      screenshots: 11,
      viewport: "desktop + 390px",
      checkout: "Stripe-hosted test Checkout completed",
      webhookUi: "active, past_due, recovered, cancel_at_period_end",
      plans: ["ground_up_2", "ground_up_3", "ground_up_personal"],
      girlsProgram: "hidden without guardian/minor context",
    }));
  } finally {
    await context.close();
    await browser.close();
  }
}

try {
  await main();
} finally {
  await cleanup();
}