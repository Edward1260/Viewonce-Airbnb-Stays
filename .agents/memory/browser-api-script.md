---
name: Browser API script format
description: Module-format constraint for the shared static-page API client.
---

The shared browser API client is loaded with a normal script tag by static HTML pages.

**Why:** An unconditional `export` statement makes the browser reject the entire file with `Unexpected token 'export'`, leaving authentication and dashboard pages crashed with no API client.

**How to apply:** Expose the client through `window.api`; only use guarded CommonJS compatibility if needed, and never add top-level ES module syntax unless all consumers switch to `type="module"`.