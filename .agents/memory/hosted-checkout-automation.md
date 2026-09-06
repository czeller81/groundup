---
name: Hosted Checkout automation boundary
description: Stripe-hosted Checkout behavior observed during headless browser rehearsal.
---

Stripe-hosted Checkout may require a two-step agent disclosure and an explicit phone number before the submit button will complete in headless automation. A signed webhook fixture can validate Ground Up’s rendered billing states, but it is not evidence that the hosted buyer payment completed.

**Why:** The hosted page accepted valid test card and billing fields, but the browser rehearsal initially omitted Stripe’s required phone field and later treated Processing plus a fixture as success.

**How to apply:** Fill the hosted phone field, complete the agent disclosure, require the real billing redirect and webhook-backed membership state, and keep fixture-only continuation out of passing evidence.