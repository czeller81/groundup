---
name: Database URL alignment
description: Schema operations and the running server can select different database environment variables.
---

When changing the Drizzle schema, run schema synchronization against the same database URL that the server uses at runtime.

**Why:** This project’s runtime prefers NEON_DATABASE_URL while the Drizzle config reads DATABASE_URL, so an unqualified schema push can succeed against the wrong database and leave live requests with missing tables.

**How to apply:** Before declaring a new table or column available, explicitly map DATABASE_URL to the runtime database variable for the schema command, then restart and exercise the endpoint. If Drizzle’s interactive rename prompt cannot be safely answered non-interactively, use a reviewed idempotent SQL migration against that same URL rather than guessing at a rename.

Keep new features that depend on additive tables disabled behind an explicit development opt-in until the runtime database target is confirmed and synchronized.

**Why:** An unverified runtime URL can make a development-only feature break existing portal routes before its tables exist, while a schema push can modify an unintended database.

**How to apply:** Gate every new UI/API/form path consistently; enable the flag only after confirming the development target and applying the schema there.