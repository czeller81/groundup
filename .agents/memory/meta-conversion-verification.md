---
name: Meta conversion verification
description: Discovery Pass activation uses the existing consent-gated browser Pixel; live Meta receipt requires owner-side verification.
---

The Discovery Pass conversion is intentionally browser-only until Meta test-event access or an approved CAPI connection is available. The canonical custom event is `DiscoveryPassActivated`, emitted after a successful backend activation and deduplicated with the persisted pass ID.

**Why:** The Replit environment has no Meta CAPI credentials or test-event connection, so live receipt must not be claimed from local or synthetic browser tests.

**How to apply:** Preserve the consent gate, pass-ID event deduplication, and server-success trigger. Complete live verification in Meta Events Manager before changing campaign optimization.