import Stripe from "stripe";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db, pool } from "./db";
import { forms, formResponses, memberLifecycles, memberships, membershipPlans, minorProfiles, users } from "@shared/schema";

export const BILLING_PLAN_KEYS = [
  "ground_up_2",
  "ground_up_3",
  "ground_up_personal",
  "girls_program",
] as const;

export type BillingPlanKey = typeof BILLING_PLAN_KEYS[number];

export const STRIPE_MEMBERSHIP_CATALOG: Record<BillingPlanKey, {
  displayName: string;
  description: string;
  amountCents: number;
  weeklySessionLimit: number | null;
  eligibleClassCategories: string[];
  privateSessionsPerMonth: number;
  personalizedProgram: boolean;
  featured?: boolean;
  audience: "adult" | "guardian_minor";
}> = {
  ground_up_2: {
    displayName: "Ground Up 2",
    description: "Two adult group sessions per week at Ground Up.",
    amountCents: 13900,
    weeklySessionLimit: 2,
    eligibleClassCategories: ["skill", "strength"],
    privateSessionsPerMonth: 0,
    personalizedProgram: false,
    audience: "adult",
  },
  ground_up_3: {
    displayName: "Ground Up 3",
    description: "Three adult group sessions per week at Ground Up.",
    amountCents: 15900,
    weeklySessionLimit: 3,
    eligibleClassCategories: ["skill", "strength"],
    privateSessionsPerMonth: 0,
    personalizedProgram: false,
    featured: true,
    audience: "adult",
  },
  ground_up_personal: {
    displayName: "Ground Up Personal",
    description: "One private coaching session per week. Group classes are not included.",
    amountCents: 25000,
    weeklySessionLimit: null,
    eligibleClassCategories: [],
    privateSessionsPerMonth: 4,
    personalizedProgram: true,
    audience: "adult",
  },
  girls_program: {
    displayName: "Girls Program",
    description: "Two girls' classes per week for an approved minor participant.",
    amountCents: 11900,
    weeklySessionLimit: 2,
    eligibleClassCategories: ["girls_skill", "GIRLS_JIU_JITSU_SELF_DEFENSE"],
    privateSessionsPerMonth: 0,
    personalizedProgram: false,
    audience: "guardian_minor",
  },
};

export function isBillingPlanKey(value: string): value is BillingPlanKey {
  return BILLING_PLAN_KEYS.includes(value as BillingPlanKey);
}

export function getBillingPlanConfig(key: string) {
  return isBillingPlanKey(key) ? STRIPE_MEMBERSHIP_CATALOG[key] : null;
}

export function stripeBillingState(subscription: Stripe.Subscription) {
  if (subscription.cancel_at_period_end) return "cancel_at_period_end";
  switch (subscription.status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "cancelled";
    case "incomplete":
    case "incomplete_expired":
      return "pending";
    default:
      return subscription.status;
  }
}

export type AdminMembershipBillingState =
  | "pending"
  | "active"
  | "past_due"
  | "cancel_at_period_end"
  | "cancelled"
  | "manual";

export function adminMembershipBillingState(membership: {
  billingState?: string | null;
  status?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}): AdminMembershipBillingState {
  if (membership.cancelAtPeriodEnd || membership.billingState === "cancel_at_period_end") {
    return "cancel_at_period_end";
  }
  if (membership.billingState === "pending" || membership.status === "pending") return "pending";
  if (membership.billingState === "past_due") return "past_due";
  if (membership.billingState === "active" || membership.status === "active" || membership.status === "ACTIVE") {
    return "active";
  }
  if (membership.billingState === "cancelled" || membership.status === "cancelled") return "cancelled";
  return "manual";
}

export function unixTimestamp(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}

export function checkoutSessionIsExpired(
  session: Pick<Stripe.Checkout.Session, "status" | "expires_at">,
  now = Date.now(),
) {
  return session.status === "expired" || session.expires_at * 1000 <= now;
}

export const PENDING_CHECKOUT_STALE_AFTER_MS = 30 * 60 * 1000;
export const PENDING_CHECKOUT_RECONCILIATION_LIMIT = 100;
const MISSING_CHECKOUT_SESSION_GRACE_MS = PENDING_CHECKOUT_STALE_AFTER_MS;
const CHECKOUT_RECONCILIATION_LEASE_MS = 30 * 60 * 1000;
const CHECKOUT_RECONCILIATION_LOCK = `
  hashtextextended('ground_up:stripe_checkout_reconciliation', 0)
`;

export type StripeCheckoutReconciliationSummary = {
  scanned: number;
  completed: number;
  expired: number;
  missing: number;
  apiFailures: number;
  processingFailures: number;
};

/**
 * Run one maintenance pass while holding a database-wide lease.
 *
 * Advisory locks are held by a PostgreSQL session, so using a dedicated pool
 * client is important: the lock and unlock must use the same connection. The
 * idle-session timeout is the lease expiry. It releases the lock if the
 * process dies or the pass stops making progress without relying on another
 * application instance to clean up the lock.
 *
 * Development keeps the previous single-process behavior and avoids making
 * local reconciliation depend on cross-instance coordination.
 */
export async function withStripeCheckoutReconciliationLease<T>(
  work: () => Promise<T>,
): Promise<T | undefined> {
  if (process.env.NODE_ENV !== "production") {
    return work();
  }

  const client = await pool.connect();
  let acquired = false;
  try {
    await client.query(`SET idle_session_timeout = ${CHECKOUT_RECONCILIATION_LEASE_MS}`);
    const result = await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock(${CHECKOUT_RECONCILIATION_LOCK}) AS acquired`,
    );
    acquired = Boolean(result.rows[0]?.acquired);
    if (!acquired) return undefined;

    return await work();
  } finally {
    if (acquired) {
      try {
        await client.query(`SELECT pg_advisory_unlock(${CHECKOUT_RECONCILIATION_LOCK})`);
      } catch {
        // PostgreSQL may already have closed an expired lease connection.
      }
    }
    client.release();
  }
}

function isMissingStripeResource(error: unknown) {
  return error instanceof Stripe.errors.StripeError && error.code === "resource_missing";
}

async function cancelPendingCheckoutMembership(membershipId: string) {
  await db.update(memberships).set({
    status: "cancelled",
    billingState: "cancelled",
    cancelledAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(memberships.id, membershipId),
    eq(memberships.billingState, "pending"),
    eq(memberships.billingSource, "stripe_checkout"),
  ));
}

export async function expirePendingCheckoutSession(sessionId: string) {
  const [membership] = await db.select({ id: memberships.id }).from(memberships).where(and(
    eq(memberships.stripeCheckoutSessionId, sessionId),
    eq(memberships.billingState, "pending"),
    eq(memberships.billingSource, "stripe_checkout"),
  )).limit(1);
  if (membership) {
    await cancelPendingCheckoutMembership(membership.id);
  }
}

async function reconcilePendingCheckoutMemberships(
  stripe: Stripe,
  pendingMemberships: Array<typeof memberships.$inferSelect>,
  now = Date.now(),
): Promise<StripeCheckoutReconciliationSummary> {
  const summary: StripeCheckoutReconciliationSummary = {
    scanned: pendingMemberships.length,
    completed: 0,
    expired: 0,
    missing: 0,
    apiFailures: 0,
    processingFailures: 0,
  };
  for (const membership of pendingMemberships) {
    if (!membership.stripeCheckoutSessionId) continue;

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(membership.stripeCheckoutSessionId);
    } catch (error) {
      // A deleted or otherwise missing Checkout session cannot complete later.
      // Network/API failures are left pending so a transient Stripe outage never
      // cancels a member's checkout.
      if (isMissingStripeResource(error) &&
        membership.createdAt.getTime() <= now - MISSING_CHECKOUT_SESSION_GRACE_MS) {
        await cancelPendingCheckoutMembership(membership.id);
        summary.missing++;
      } else {
        summary.apiFailures++;
      }
      continue;
    }

    if (session.status === "complete" && session.subscription) {
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
      let subscription: Stripe.Subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!subscription.metadata?.ground_up_user_id && Object.keys(session.metadata || {}).length) {
          subscription = await stripe.subscriptions.update(subscription.id, {
            metadata: session.metadata || {},
          });
        }
      } catch {
        // Keep the membership pending when Stripe cannot finish a completed
        // session lookup. The next maintenance pass can safely retry it.
        summary.apiFailures++;
        continue;
      }
      try {
        await applyStripeSubscription(subscription, {
          checkoutSessionId: session.id,
          latestInvoiceId: typeof subscription.latest_invoice === "string"
            ? subscription.latest_invoice
            : subscription.latest_invoice?.id,
        });
        summary.completed++;
      } catch {
        // A local processing error must not turn a still-reconcilable checkout
        // into a cancellation. Keep it visible for a later retry/investigation.
        summary.processingFailures++;
      }
      continue;
    }

    if (checkoutSessionIsExpired(session)) {
      await cancelPendingCheckoutMembership(membership.id);
      summary.expired++;
    }
  }
  return summary;
}

export async function reconcilePendingStripeCheckouts(stripe: Stripe, userId: string) {
  const pendingMemberships = await db.select().from(memberships).where(and(
    eq(memberships.userId, userId),
    eq(memberships.billingState, "pending"),
    eq(memberships.billingSource, "stripe_checkout"),
    isNotNull(memberships.stripeCheckoutSessionId),
  ));

  return reconcilePendingCheckoutMemberships(stripe, pendingMemberships);
}

export async function reconcileStalePendingStripeCheckouts(
  stripe: Stripe,
  options: {
    now?: number;
    limit?: number;
  } = {},
) {
  const now = options.now ?? Date.now();
  const limit = options.limit ?? PENDING_CHECKOUT_RECONCILIATION_LIMIT;
  const pendingMemberships = await db.select().from(memberships).where(and(
    eq(memberships.billingState, "pending"),
    eq(memberships.billingSource, "stripe_checkout"),
    isNotNull(memberships.stripeCheckoutSessionId),
    lte(memberships.createdAt, new Date(now - PENDING_CHECKOUT_STALE_AFTER_MS)),
  )).orderBy(asc(memberships.createdAt)).limit(limit);

  return reconcilePendingCheckoutMemberships(stripe, pendingMemberships, now);
}

export async function requiredFormsForCheckout(userId: string) {
  const required = await db.select({
    id: forms.id,
    slug: forms.slug,
    title: forms.title,
  }).from(forms).where(eq(forms.isRequired, true));
  if (!required.length) return [];
  const submitted = await db.select({ formId: forms.id })
    .from(forms)
    .innerJoin(formResponses, eq(formResponses.formId, forms.id))
    .where(and(
      eq(formResponses.userId, userId),
      eq(formResponses.status, "submitted"),
      inArray(forms.id, required.map((form) => form.id)),
    ));
  const submittedIds = new Set(submitted.map((row) => row.formId));
  return required.filter((form) => !submittedIds.has(form.id));
}

export async function canSelectGirlsProgram(userId: string) {
  const [minor] = await db.select({ id: minorProfiles.id })
    .from(minorProfiles)
    .where(and(
      eq(minorProfiles.guardianUserId, userId),
      // A revoked consent record is not an eligible guardian/minor context.
      // The consent lifecycle remains authoritative in minor booking flows.
      isNull(minorProfiles.consentRevokedAt),
    ))
    .limit(1);
  return Boolean(minor);
}

export async function getOrCreateStripeCustomer(stripe: Stripe, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!customer.deleted) return customer;
    } catch {
      // A deleted customer can be safely replaced and linked below.
    }
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    phone: user.phone || undefined,
    metadata: { ground_up_user_id: user.id },
  });
  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
  return customer;
}

export async function activeStripeMembershipForUser(userId: string, stripe?: Stripe) {
  if (stripe) {
    await reconcilePendingStripeCheckouts(stripe, userId);
  }
  const pendingCutoff = new Date(Date.now() - 30 * 60 * 1000);
  const [membership] = await db.select().from(memberships).where(and(
    eq(memberships.userId, userId),
    inArray(memberships.billingSource, ["stripe", "stripe_checkout"]),
    or(
      inArray(memberships.billingState, ["active", "past_due", "cancel_at_period_end"]),
      and(eq(memberships.billingState, "pending"), gte(memberships.createdAt, pendingCutoff)),
    ),
  )).limit(1);
  return membership || null;
}

export async function applyStripeSubscription(subscription: Stripe.Subscription, extra: {
  checkoutSessionId?: string | null;
  latestInvoiceId?: string | null;
  billingStateOverride?: string;
  billingFailureAt?: Date | null;
} = {}) {
  const userId = subscription.metadata?.ground_up_user_id;
  const planKey = subscription.metadata?.ground_up_plan_key;
  if (!userId || !isBillingPlanKey(planKey)) {
    throw new Error("STRIPE_SUBSCRIPTION_METADATA_INVALID");
  }
  const plan = await db.select().from(membershipPlans).where(eq(membershipPlans.internalKey, planKey)).limit(1);
  const membershipPlan = plan[0];
  if (!membershipPlan) throw new Error("MEMBERSHIP_PLAN_NOT_CONFIGURED");
  const state = extra.billingStateOverride || stripeBillingState(subscription);
  const values = {
    userId,
    planId: membershipPlan.id,
    type: membershipPlan.internalKey,
    status: state === "active" || state === "cancel_at_period_end" || state === "past_due" ? "active" : state === "cancelled" ? "cancelled" : "pending",
    priceCents: membershipPlan.displayPriceCents || STRIPE_MEMBERSHIP_CATALOG[planKey].amountCents,
    source: "stripe_subscription",
    billingSource: "stripe",
    billingState: state,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripeProductId: membershipPlan.stripeProductId,
    stripePriceId: membershipPlan.stripePriceId,
    stripeSubscriptionId: subscription.id,
    stripeCheckoutSessionId: extra.checkoutSessionId || null,
    stripeLatestInvoiceId: extra.latestInvoiceId || null,
    currentPeriodStart: unixTimestamp(subscription.items.data[0]?.current_period_start),
    currentPeriodEnd: unixTimestamp(subscription.items.data[0]?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelledAt: state === "cancelled" ? unixTimestamp(subscription.canceled_at) || new Date() : null,
    billingFailureAt: extra.billingFailureAt || null,
    updatedAt: new Date(),
  } as const;
  const [subscriptionMembership] = await db.select().from(memberships).where(
    eq(memberships.stripeSubscriptionId, subscription.id),
  ).limit(1);
  const [checkoutSessionMembership] = extra.checkoutSessionId
    ? await db.select().from(memberships).where(eq(memberships.stripeCheckoutSessionId, extra.checkoutSessionId)).limit(1)
    : [];
  const [pendingCheckoutMembership] = await db.select().from(memberships).where(and(
    eq(memberships.userId, userId),
    eq(memberships.planId, membershipPlan.id),
    eq(memberships.stripeCustomerId, values.stripeCustomerId),
    eq(memberships.billingState, "pending"),
    eq(memberships.billingSource, "stripe_checkout"),
  )).orderBy(memberships.createdAt).limit(1);
  const existing = subscriptionMembership || checkoutSessionMembership || pendingCheckoutMembership;
  const [otherActive] = await db.select().from(memberships).where(and(
    eq(memberships.userId, userId),
    inArray(memberships.billingState, ["active", "past_due", "cancel_at_period_end", "pending"]),
  )).limit(1);
  if (otherActive && otherActive.id !== existing?.id && otherActive.stripeSubscriptionId !== subscription.id) {
    throw new Error("STRIPE_DUPLICATE_SUBSCRIPTION");
  }

  const checkoutMembershipDuplicates = [checkoutSessionMembership, pendingCheckoutMembership]
    .filter((membership): membership is NonNullable<typeof membership> =>
      Boolean(membership && membership.id !== existing?.id && membership.billingState === "pending" && membership.billingSource === "stripe_checkout"),
    );
  for (const duplicate of checkoutMembershipDuplicates) {
    await db.delete(memberships).where(eq(memberships.id, duplicate.id));
  }

  const membershipValues = {
    ...values,
    stripeCheckoutSessionId: extra.checkoutSessionId
      || subscriptionMembership?.stripeCheckoutSessionId
      || checkoutSessionMembership?.stripeCheckoutSessionId
      || pendingCheckoutMembership?.stripeCheckoutSessionId
      || null,
  };
  if (existing) {
    const [updated] = await db.update(memberships).set(membershipValues).where(eq(memberships.id, existing.id)).returning();
    if (state === "active" || state === "past_due" || state === "cancel_at_period_end") {
      await db.update(memberLifecycles).set({
        currentState: "ACTIVE_MEMBER",
        convertedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(memberLifecycles.userId, userId));
    }
    return updated;
  }
  let created;
  try {
    [created] = await db.insert(memberships).values({
      ...membershipValues,
      startDate: unixTimestamp(subscription.start_date) || new Date(),
      endDate: state === "cancelled" ? unixTimestamp(subscription.ended_at) : null,
    }).returning();
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
    const [raceWinner] = await db.select().from(memberships).where(eq(memberships.stripeSubscriptionId, subscription.id)).limit(1);
    if (!raceWinner) throw error;
    created = raceWinner;
  }
  if (state === "active" || state === "past_due" || state === "cancel_at_period_end") {
    await db.update(memberLifecycles).set({
      currentState: "ACTIVE_MEMBER",
      convertedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(memberLifecycles.userId, userId));
  }
  return created;
}