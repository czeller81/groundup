---
name: Localized route link keys
description: Why localized navigation lists need identity beyond their destination path
---

When several translated navigation labels intentionally point to one localized landing page, React list keys must include the label or item index rather than only the shared destination.

**Why:** Spanish category navigation currently consolidates several public categories into one translated programs surface; path-only keys produced runtime duplicate-key warnings.

**How to apply:** Use a stable composite key for repeated translated links while keeping the destination path localized separately.