---
name: Rendered portal mobile QA
description: Durable guidance for repeating the portal's rendered responsive checks.
---

The portal's rendered mobile QA should use the deterministic Chromium/CDP runner across every supported role, locale, and target phone width. Page-level overflow is the release signal; campaign tables and inbox tabs may scroll inside their own containers, and Radix UI's hidden native selects are not visible tap targets.

**Why:** Static responsive guards cannot catch intrinsic-width layout regressions or language leakage in role-specific portal surfaces, while naive DOM checks report legitimate local scrolling and hidden form implementation controls as failures.

**How to apply:** Re-run the rendered matrix after portal layout, navigation, or locale-copy changes, inspect the generated screenshots/report, and separately verify real-device keyboard/focus behavior when release confidence requires it.