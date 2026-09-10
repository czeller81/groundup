---
name: Hosted analytics verification
description: Replit-hosted analytics is injected only after Publishing analytics is enabled and the app is republished.
---

The published app can contain the safe `window.umami` wrapper and custom event names while collecting no hosted analytics if Publishing analytics is disabled or the deployment predates the setting. A public deployment and an authorized analytics query do not prove that the tracker is active.

**Why:** A Discovery Pass verification found the production bundle and app-side event code, but no injected tracker, no `window.umami`, and no hosted pageviews or custom events.

**How to apply:** Before testing hosted funnels, inspect the published HTML/browser runtime for the tracker and query for recent pageviews. If absent, enable Replit-hosted analytics in Publishing settings and republish; do not add a property ID or third-party script to application code.