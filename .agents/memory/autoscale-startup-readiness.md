---
name: Autoscale startup readiness
description: HTTP services must begin listening before non-critical database maintenance work.
---

Autoscale promotion can fail even when the production bundle builds correctly if the server waits on a database-backed maintenance task before opening its HTTP listener.

**Why:** The publish artifact built and pushed successfully, but readiness probes arrived while startup was still waiting on admin-password synchronization.

**How to apply:** Keep non-critical startup synchronization asynchronous after `listen()`; verify production mode with a direct `GET /` probe before publishing.