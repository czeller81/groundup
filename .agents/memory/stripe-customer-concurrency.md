---
name: Stripe customer creation concurrency
description: The concurrency boundary required before creating a Stripe subscription Checkout session.
---

Stripe customer lookup/creation must be serialized per user before a checkout membership records the customer ID. A checkout lock that starts after customer creation is too late: concurrent requests can create customer A and customer B, overwrite the user with B, and make A's valid subscription fail ownership validation.

**Why:** The browser rehearsal exposed this only under concurrent checkout requests; the customer ownership safeguard correctly rejected the resulting mismatch, but left the winning membership pending.

**How to apply:** Hold a database advisory transaction lock around customer lookup, Stripe creation, and user-row update. Keep the subscription's customer ownership check in place as a second defense.