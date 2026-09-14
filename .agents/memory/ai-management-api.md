---
name: AI management API boundary
description: Keep external AI access separate from browser admin sessions and protect it with its own bearer secret.
---

External AI management uses a dedicated bearer key and `/api/ai/v1` routes; it must not reuse browser sessions, the demo admin password, or frontend credentials.

**Why:** ChatGPT needs server-to-server access, while the existing admin API is cookie/session-based and exposes broader browser-oriented behavior.

**How to apply:** Keep the AI API scoped to explicit operations and marketing actions, validate every mutation, maintain an OpenAPI contract, and store `AI_MANAGEMENT_API_KEY` only in Replit Secrets.