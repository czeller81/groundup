---
name: Production Stripe mode guard
description: Environment-level separation between sandbox Stripe traffic and production membership data.
---

Production Stripe integration must fail closed unless the configured secret key is a recognized live key. Event livemode checks are necessary but insufficient when production is accidentally configured with a test key and shares a database.

**Why:** A signed sandbox event is valid under a test secret; without an environment-level live-key requirement, it can pass signature and mode checks and mutate production membership state.

**How to apply:** Disable Stripe client mutations and webhook processing in production when the secret is not live, expose the configuration-invalid state to staff, and keep development/sandbox verification explicitly test-key guarded.