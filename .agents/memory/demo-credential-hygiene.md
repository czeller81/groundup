---
name: Demo credential hygiene
description: How to keep non-production demo admin credentials from drifting from the database or becoming public frontend secrets.
---

Demo credentials should be managed through secure environment configuration and synchronized to the existing admin account only when explicitly enabled; a frontend-prefilled password is not authoritative.

**Why:** The documented admin email existed in both environments, but its stored password hash had diverged from the password displayed by the legacy admin form, producing repeated 401 responses.

**How to apply:** Use the secure secret flow for demo-password changes, verify the account role in each environment, publish before expecting production changes, and remove the temporary reset secret after synchronization.