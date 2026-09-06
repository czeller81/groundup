import Stripe from "stripe";
import { asc, eq } from "drizzle-orm";
import { db } from "../server/db";
import { membershipPlans } from "../shared/schema";
import { BILLING_PLAN_KEYS, STRIPE_MEMBERSHIP_CATALOG } from "../server/membership-billing";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required");
if (!secretKey.startsWith("sk_test_")) {
  throw new Error("Refusing to create membership catalog entries with a non-test Stripe key.");
}

const stripe = new Stripe(secretKey, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

async function findOrCreateProduct(planKey: typeof BILLING_PLAN_KEYS[number]) {
  const config = STRIPE_MEMBERSHIP_CATALOG[planKey];
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((product) => product.metadata?.ground_up_plan_key === planKey);
  if (existing) return existing;
  return stripe.products.create({
    name: config.displayName,
    description: config.description,
    metadata: {
      ground_up_plan_key: planKey,
      ground_up_catalog: "ground_up_memberships",
    },
  });
}

async function findOrCreatePrice(planKey: typeof BILLING_PLAN_KEYS[number], productId: string) {
  const config = STRIPE_MEMBERSHIP_CATALOG[planKey];
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const existing = prices.data.find((price) =>
    price.currency === "usd" &&
    price.unit_amount === config.amountCents &&
    price.recurring?.interval === "month" &&
    price.recurring?.interval_count === 1,
  );
  if (existing) return existing;
  return stripe.prices.create({
    product: productId,
    unit_amount: config.amountCents,
    currency: "usd",
    recurring: { interval: "month", interval_count: 1 },
    metadata: {
      ground_up_plan_key: planKey,
      ground_up_catalog: "ground_up_memberships",
    },
  });
}

async function reconcile() {
  for (const planKey of BILLING_PLAN_KEYS) {
    const config = STRIPE_MEMBERSHIP_CATALOG[planKey];
    const product = await findOrCreateProduct(planKey);
    const price = await findOrCreatePrice(planKey, product.id);
    if (product.default_price !== price.id) {
      await stripe.products.update(product.id, { default_price: price.id });
    }

    const [existing] = await db.select().from(membershipPlans)
      .where(eq(membershipPlans.internalKey, planKey))
      .orderBy(asc(membershipPlans.createdAt))
      .limit(1);
    const values = {
      internalKey: planKey,
      displayName: config.displayName,
      active: true,
      weeklySessionLimit: config.weeklySessionLimit,
      eligibleClassCategories: config.eligibleClassCategories,
      privateSessionsPerMonth: config.privateSessionsPerMonth,
      personalizedProgram: config.personalizedProgram,
      displayPriceCents: config.amountCents,
      stripeProductId: product.id,
      stripePriceId: price.id,
      updatedAt: new Date(),
    };
    if (existing) {
      await db.update(membershipPlans).set(values).where(eq(membershipPlans.id, existing.id));
    } else {
      await db.insert(membershipPlans).values(values);
    }
    console.log(`${planKey}: ${product.id} / ${price.id} / $${(config.amountCents / 100).toFixed(2)}`);
  }
}

reconcile().catch((error) => {
  console.error("Stripe membership reconciliation failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});