---
name: Stripe membership webhook ordering
description: The ordering and reconciliation rule for subscription-backed membership activation.
---

Stripe can deliver `customer.subscription.created` before `checkout.session.completed`. Membership activation must therefore reconcile by the authenticated Ground Up account, plan, and Stripe customer when a subscription ID or checkout-session ID has not been stored yet.

**Why:** Treating the early subscription event as a new record while a pending Checkout record exists creates a false duplicate and can cause webhook retries instead of activation.

**How to apply:** Keep webhook processing idempotent and let later checkout, subscription, and invoice events update the same membership record. Expired pending checkouts should not permanently block a new checkout attempt.