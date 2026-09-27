---
name: Calendar cancellation testing
description: The ordering required to validate Google Calendar cancellation propagation.
---

For cancellation acceptance tests, synchronize the recurring instance while it is active, create a reservation, then cancel the Google instance and synchronize again. When trimming a series, derive the cutoff from the first unwanted instance returned by Google, not from a separate runtime clock.

**Why:** Google Calendar can return a cancelled recurring-instance tombstone without the full event payload, while the application only cancels local reservations when a matching occurrence already exists. The connector sandbox and workspace shell clocks also differed by a calendar day during a live cutoff, so runtime-based recurrence dates can retain or remove the wrong instance.

**How to apply:** Keep the active-import step separate from the cancellation step, and assert the occurrence becomes disabled, its reservations are cancelled, and the cancellation lifecycle email is delivered. For series edits, set UTC `UNTIL` strictly before the first disallowed occurrence, reread the master event, then synchronize and verify the published schedule.