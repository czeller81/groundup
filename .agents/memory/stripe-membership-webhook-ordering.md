---
name: Stripe membership webhook ordering
description: The ordering and reconciliation rule for subscription-backed membership activation.
---

Stripe can deliver `customer.subscription.created` before `checkout.session.completed`. Membership activation must therefore reconcile by the authenticated Ground Up account, plan, and Stripe customer when a subscription ID or checkout-session ID has not been stored yet. Activation must also validate the expanded recurring price against the approved plan before changing local membership state.

**Why:** Treating the early subscription event as a new record while a pending Checkout record exists creates a false duplicate and can cause webhook retries instead of activation. Metadata alone is not proof that a subscription purchased the intended entitlement.

**How to apply:** Keep webhook processing idempotent, verify the stored customer relationship and exact recurring price/product/amount, and let later checkout, subscription, and invoice events update the same membership record. Expired pending checkouts should not permanently block a new checkout attempt.