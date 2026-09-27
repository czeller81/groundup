---
name: Drizzle uniqueness and schema sync
description: Avoid duplicate uniqueness declarations and inspect partial database changes after failed schema pushes.
---

Declare a unique constraint once: do not combine a column-level `.unique()` with a second named unique index over the same column.

**Why:** A duplicate Drizzle uniqueness declaration caused a schema push to fail after earlier DDL had already been applied, so the failed push did not leave the database untouched.

**How to apply:** Check both column declarations and table-level indexes before syncing. After any failed push, inspect the target database catalog before retrying, and confirm the runtime and schema-sync database targets match.