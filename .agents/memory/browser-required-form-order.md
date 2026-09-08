---
name: Browser required-form order
description: Browser QA should follow the required-form sequence and titles returned by the forms API
---

Browser coverage for the forced required-form modal must derive the incomplete form sequence and displayed titles from the authenticated forms response rather than assuming seed insertion order.

**Why:** Existing databases can retain forms in an order and with titles that differ from the current seed declaration, while the dashboard advances through the order it receives.

**How to apply:** Use the forms API response as the source of truth for modal progression assertions, and keep the no-document-navigation check scoped to the submissions themselves.