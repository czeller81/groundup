---
name: Meta conversion verification
description: Discovery Pass activation uses the existing consent-gated browser Pixel; live Meta receipt requires owner-side verification.
---

The Discovery Pass conversion is browser-only. Production activation emits the canonical `DiscoveryPassActivated` event after backend success and deduplicates with the persisted pass ID. Development builds also provide an explicit `?meta_test_event=1` path for Meta Events Manager Test Events: it emits one synthetic-ID event, records a local verification, and sends only locale.

**Why:** The test path makes owner-side receipt checks repeatable without a CAPI credential, customer record, or activation mutation. It remains opt-in and development-only so it cannot silently become campaign traffic.

**How to apply:** Open the Pixel’s Meta Events Manager Test Events page, then use the development portal URL with the query flag. Confirm event name, synthetic ID, exactly-once result, consent state, and minimized payload before changing campaign optimization.