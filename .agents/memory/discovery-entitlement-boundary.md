---
name: Discovery entitlement boundary
description: Rules for prospect booking eligibility and audited exceptions for reservations created without valid entitlement.
---

Prospects with neither a valid Discovery Pass nor an active membership cannot reserve member classes, even when a class type is not explicitly marked membership-required. Active legacy memberships without a linked plan remain valid.

**Why:** A prospect was able to reserve a class outside the seven-day Discovery window because the absence of a class-level membership-required flag was treated as general eligibility.

**How to apply:** Keep entitlement checks at the transactional reservation boundary. If honoring an affected reservation, create an admin-audited exception linked to that exact reservation, extend only far enough to cover it, and keep cancellation release behavior consistent.

Member schedule visibility and authenticated reservation creation both use a rolling seven-day window measured from the current time.

**Why:** Hiding future classes only in the interface would still allow a crafted reservation request, while enforcing only at booking time would expose choices members cannot yet use.

**How to apply:** Clamp authenticated member schedule results to seven days and enforce the same boundary inside the reservation transaction. Do not apply this member-only limit to admin schedule access.