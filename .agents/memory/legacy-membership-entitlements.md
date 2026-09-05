---
name: Legacy membership entitlement compatibility
description: Unconfigured historical memberships retain legacy class-booking behavior while plan-linked memberships use the new entitlement engine.
---

Historical membership rows without a configured membership plan remain eligible for the existing class booking and waitlist behavior. Weekly limits and entitlement ledger accounting apply when a membership is linked to a plan.

**Why:** Existing member records predate configurable entitlement rules, and silently imposing new limits on them would change historical behavior without a migration decision.

**How to apply:** Treat plan assignment as the explicit opt-in boundary for weekly limits and category restrictions. Preserve the class reservation tables and transactional capacity lock for both paths.