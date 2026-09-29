---
name: Database URL alignment
description: Schema operations and the running server can select different database environment variables.
---

Replit Publish compares its managed development and production databases. Keep Drizzle's Publish-facing configuration on the managed `DATABASE_URL`; the app runtime may separately prefer `NEON_DATABASE_URL`, so do not assume the two targets are identical.

Represent persistent runtime-created tables that may appear in the managed production catalog (such as the PostgreSQL session store) in the shared schema. This keeps them in the development baseline used by a later Publish diff.

**Why:** A table present only in managed production can be proposed for removal, while blindly redirecting schema pushes to a runtime secret can modify an unconfirmed or production database.

**How to apply:** Read both connection-selection paths and check development/production catalogs read-only. Never print or inspect secret values. Before a Publish or production schema change, establish which target owns the data and obtain approval for the proposed diff.