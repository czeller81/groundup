---
name: Member evidence fixture timing
description: Keep booking-window integration fixtures valid regardless of the weekday when the suite runs.
---

Booking-window evidence fixtures must place their first several occurrences inside one configured Monday week and within the seven-day booking horizon; anchoring every run to the next Monday can make later fixtures unavailable on Monday runs.

**Why:** The booking-window guard runs before form and entitlement assertions, so calendar-relative fixtures can fail for timing reasons unrelated to the behavior under test.

**How to apply:** Derive fixture dates from the current weekday, using the current week when its remaining days fit the scenario and the next Monday only for late-week runs.