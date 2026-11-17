---
name: Service worker cache versioning
description: Keep offline caches in sync with app routes and static assets.
---

Change the service worker's static and dynamic cache names together whenever its cached assets or fetch behavior changes. The new worker should activate and remove the previous cache set.

**Why:** Reusing a cache name let an existing client keep serving a stale route even after the server-side page was fixed.

**How to apply:** When changing the service worker's precache list or routing logic, bump both cache names and verify the updated worker serves the changed page in a client that had previously installed the app.
