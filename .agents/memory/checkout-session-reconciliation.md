---
name: Checkout session reconciliation
description: The safe lifecycle rule for Stripe subscription Checkout sessions that do not produce timely webhooks.
---

Pending Stripe Checkout memberships must be reconciled against the Checkout Session API and the completion/expiration webhook, not only against subscription webhooks. A completed session must adopt the existing pending membership; an expired session may transition it to cancelled so a retry can create a fresh checkout.

**Why:** Stripe can leave an abandoned or expired Checkout session without the subscription webhook that normally resolves the pending record. Treating every lookup failure as expiration is unsafe because temporary API failures and account-mode mismatches can look like missing resources.

**How to apply:** Keep transient Stripe errors pending, use explicit expired status or an expired timestamp for immediate cleanup, and only terminally clean up a missing session after a stale grace period. Preserve the checkout-session and subscription identifiers when adopting a completed session.

Billing reconciliation tests should create isolated plan rows with synthetic Stripe product/price IDs, inject the approved-plan resolver, and scope stale scans to the fixture account.

**Why:** A global maintenance scan can select unrelated pending records, while relying on configured catalog rows couples tests to seeded development data and external Stripe credentials.

**How to apply:** Keep reconciliation evidence local to its fixture account and use fake Stripe responses; do not let tests mutate or reconcile other accounts’ pending checkouts.