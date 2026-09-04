---
name: SPA route fallback allowlist
description: Direct preview and production navigation depends on keeping client routes aligned with the server fallback allowlists.
---

Client-side routes must be added to both development and production SPA fallback allowlists, not only to the React router. Otherwise direct navigation and crawlers receive 404 responses even though in-app navigation works.

**Why:** The server intentionally returns real 404s for unknown paths to protect crawlers and scanners, so new public routes do not fall through automatically.

**How to apply:** When adding a public route, update the router, server metadata/content if applicable, and both fallback allowlists. Normalize trailing slashes before allowlist checks and verify direct proxied-preview navigation.