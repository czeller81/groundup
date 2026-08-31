---
name: Calendar cancellation testing
description: The ordering required to validate Google Calendar cancellation propagation.
---

For cancellation acceptance tests, synchronize the recurring instance while it is active, create a reservation, then cancel the Google instance and synchronize again. A tombstone encountered before its first import has no local occurrence to transition and cannot prove reservation cancellation.

**Why:** Google Calendar can return a cancelled recurring-instance tombstone without the full event payload, while the application only cancels local reservations when a matching occurrence already exists.

**How to apply:** Keep the active-import step separate from the cancellation step, and assert the occurrence becomes disabled, its reservations are cancelled, and the cancellation lifecycle email is delivered.