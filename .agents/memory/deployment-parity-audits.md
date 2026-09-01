---
name: Deployment parity audits
description: Published Ground Up behavior can lag the workspace booking architecture, so audit both surfaces before judging readiness.
---

The published Ground Up site and the workspace can represent different releases; a passing local build does not prove that a production endpoint or flow exists.

**Why:** The workspace registered the Google Calendar class API while the published site still served the older booking experience and returned 404 for that API.

**How to apply:** For future release or booking audits, verify production route existence, response shape, and representative data separately from local tests before calling a cutover ready.