---
name: Distributed maintenance leases
description: How cross-instance maintenance coordination avoids duplicate work without permanent locks.
---

Use a PostgreSQL advisory lock on a dedicated pool connection for production-only maintenance coordination, and set an idle-session timeout so crashed or stalled owners are eventually released.

**Why:** Advisory locks belong to the database session that acquired them, so pooled queries cannot safely unlock them unless acquisition and release share one dedicated connection. A stalled process otherwise has no natural lock expiry.

**How to apply:** Keep development on the existing local guard, acquire and release the advisory lock on the same client, and treat a failed unlock as harmless because the database may already have expired the session.

When a lease temporarily changes a pooled session setting, restore that setting before returning the client; attach a client error listener for expected idle-timeout termination.

**Why:** PostgreSQL can asynchronously terminate an abandoned idle lease session, and a pooled client can otherwise retain the short timeout or emit an uncaught error after the work has ended.

**How to apply:** Scope the listener to the lease lifecycle, reset `idle_session_timeout` before release when the session is still alive, and tolerate cleanup against an already-terminated session.