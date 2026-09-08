---
name: Browser CTA smoke checks
description: Durable guidance for running localized public CTA checks in this workspace.
---

Public CTA browser smoke checks should use the Nix-provided system Chromium when Playwright's bundled headless shell is unavailable, mock live schedule data, and assert the final route after client redirects.

**Why:** The workspace has Chromium available through Nix but not always through Playwright's browser cache, and anonymous member links intentionally resolve the `/portal/booking` alias to the locale-aware portal schedule.

**How to apply:** Keep schedule fixtures deterministic, exercise both desktop and mobile locale paths, and assert the user-visible destination rather than an intermediate alias.