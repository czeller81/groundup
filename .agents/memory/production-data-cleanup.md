---
name: Production data cleanup
description: Safely reconcile published-app cleanup requests with the correct production database and verify every dependent record.
---

Production cleanup requests must identify records from the published database before mutating anything; the development database can contain a different set of members. Use an exact-ID preflight, delete user-owned dependencies transactionally, and verify zero residual rows afterward.

**Why:** A screenshot from the published portal did not match the development database, and an initial cleanup attempt was correctly rolled back by an exact-row guard.

**How to apply:** Query production read-only first, preserve the exact target IDs, perform one guarded transaction against the production primary, and run a post-delete production verification query.