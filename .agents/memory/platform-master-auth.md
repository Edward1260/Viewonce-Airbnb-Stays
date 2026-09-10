---
name: Platform Master session isolation
description: Platform Master authentication must remain separate from customer authentication and must not be silently restored.
---

Platform Master authentication uses dedicated session-only browser keys and the shared API client selects that token only on Platform Master Hub pages. The login screen clears those keys and removes legacy privileged credentials while preserving a customer session.

**Why:** The Platform Master operator must complete a fresh sign-in, but entering the hub should not unexpectedly destroy a customer's separate authenticated session.

**How to apply:** Keep Platform Master redirects, verification, logout, and session-expiry handling scoped to the dedicated session keys. Do not reintroduce localStorage persistence or a shared customer token fallback for hub requests.