---
name: Vite API proxy
description: Routing constraint for the ViewOnce static HTML pages and Vite development server.
---

The Vite development proxy must match `/api/`, not the bare `/api` prefix.

**Why:** Static legacy pages load a root-level `api.js`; a bare `/api` proxy also captures `/api.js`, sends it to Express, and produces a misleading 404 that leaves `window.api` undefined.

**How to apply:** Keep browser API requests under `/api/...` and preserve static asset names, while using the slash-terminated proxy key in the Vite configuration.