---
name: Asset imports via @assets alias
description: How image imports resolve in this Vite project and the uppercase-extension pitfall
---

# Importing images via the `@assets` alias

The `@assets` alias maps to `attached_assets/`. Files imported this way are processed by Vite at build time.

## Rule: extensions must be lowercase and Vite-recognized
Imports like `@assets/PHOTO.JPG` (uppercase `.JPG`) FAIL both `tsc` (TS2307 cannot find module) and `vite build` ("content contains invalid JS syntax / add **/*.JPG to assetsInclude"). Vite's `vite/client` asset type declarations are case-sensitive and only cover lowercase `.jpg`, `.png`, etc.

**Why:** `vite.config.ts` is forbidden to edit in this project, so we cannot add `assetsInclude` for `.JPG`. iPhone/camera photos arrive with uppercase `.JPG`.

**How to apply:** Before importing a user-attached photo, copy it to a lowercase `.jpg` (and ideally a clean descriptive name) inside `attached_assets/`, then import the lowercase file. `attached_assets/` is NOT web-served — referencing by URL path won't work; you must import via `@assets` so Vite bundles it.
