---
name: Meta conversion verification
description: Discovery Pass activation uses the consent-gated browser Pixel; optional server CAPI tests require explicit server-only configuration.
---

Production activation emits the canonical `DiscoveryPassActivated` event after backend success and deduplicates with the persisted pass ID. Development builds provide an explicit `?meta_test_event=1` path for Meta Events Manager Test Events: it emits one synthetic-ID event, records a local verification, and sends only locale. An optional admin-only server CAPI path is separately gated by server-only configuration, explicit granted consent, rate limiting, and Meta's `events_received === 1` response.

**Why:** Browser verification must remain credential-free, while server verification may be useful after an approved Meta credential exists. Keeping the CAPI path separately opt-in and synthetic prevents test traffic from becoming member or campaign data.

**How to apply:** For browser checks, open the Pixel’s Meta Events Manager Test Events page and use the development portal URL with the query flag. For server checks, configure the server-only Meta values and use the admin test route with `consent: "granted"`. Confirm event name, synthetic ID, exactly-once result, consent state, and minimized locale-only payload before changing campaign optimization.