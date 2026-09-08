---
name: Free-entry CTA routing
description: The boundary between prospect free-entry CTAs and unrelated contact or member actions.
---

Public free-entry language should enter the locale-aware Discovery Pass, while contact links remain available for eligibility/inquiry states and member actions keep their portal destinations.

**Why:** Treating every “first visit” label as the same action can either bypass the Discovery funnel or remove legitimate contact and member paths.

**How to apply:** When adding a public CTA, classify the user intent first; use `localizedPublicPath("/discovery-pass", locale)` only for free-entry prospects and cover both rendered marketing links and server fallback links.