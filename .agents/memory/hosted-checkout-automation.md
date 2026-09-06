---
name: Hosted Checkout automation boundary
description: Stripe-hosted Checkout behavior observed during headless browser rehearsal.
---

Stripe-hosted Checkout may require a two-step agent disclosure and can remain in Processing in headless automation without creating a payment or subscription event. A signed webhook fixture can validate Ground Up’s rendered billing states, but it is not evidence that the hosted buyer payment completed.

**Why:** The hosted page accepted valid test card and billing fields, yet produced no Stripe payment, subscription, or Checkout-completed event and sent no webhook to Ground Up.

**How to apply:** Keep the browser suite non-passing until a supported interactive Stripe test-mode payment completes end to end. Label any webhook-backed UI continuation as state-rendering evidence only.