---
name: Portal form navigation
description: Non-obvious query invalidation behavior during member form submission
---

Portal form submission should mark the forms list stale without refetching the active form query before navigating to the dashboard.

**Why:** Refetching the form query and immediately unmounting the form page can cancel a browser promise and trigger the development runtime error overlay even when the submit API succeeds.

**How to apply:** When changing the submit success callback, preserve the no-refetch invalidation behavior; let the dashboard fetch the stale forms list after navigation.