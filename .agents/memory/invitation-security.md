---
name: Invitation security
description: Durable rules for privileged ViewOnce account invitations.
---

Privileged roles must be granted only through server-issued invitation tokens that are hashed at rest, scoped to a role, optionally scoped to an email, expire, and can be consumed once.

**Why:** Browser-generated invite tokens and permissive validation create an authorization bypass; signup and invite consumption must also be atomic so concurrent requests cannot create an account from one invitation twice.

**How to apply:** Keep invitation issuance Platform Master-only, validate role/email/expiry inside the signup transaction, and never add demo or localStorage fallbacks to privileged authentication.