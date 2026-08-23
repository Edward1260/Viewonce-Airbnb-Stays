import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { invitationTokensTable } from "@workspace/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import { requireAuth, type JwtPayload } from "../lib/auth.js";

const router: IRouter = Router();

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function currentUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

function canManageInvites(user: JwtPayload): boolean {
  return ["platform_master_hub", "super_admin", "platform_master"].includes(user.role);
}

// Public validation is intentionally read-only. Consumption happens only during
// a successful privileged signup, so refreshing an invite page cannot burn it.
router.post("/validate-invite", async (req, res) => {
  const { token, action = "check" } = req.body ?? {};
  if (typeof token !== "string" || token.length < 32) {
    res.status(400).json({ valid: false, reason: "missing_or_invalid_token" });
    return;
  }

  try {
    const [invite] = await db
      .select()
      .from(invitationTokensTable)
      .where(
        and(
          eq(invitationTokensTable.token_hash, hashToken(token)),
          isNull(invitationTokensTable.used_at),
          gt(invitationTokensTable.expires_at, new Date()),
        ),
      )
      .limit(1);

    if (!invite) {
      res.json({ valid: false, reason: "invalid_or_expired_invite" });
      return;
    }

    if (action === "consume") {
      const [consumed] = await db
        .update(invitationTokensTable)
        .set({ used_at: new Date() })
        .where(
          and(
            eq(invitationTokensTable.id, invite.id),
            isNull(invitationTokensTable.used_at),
          ),
        )
        .returning();
      if (!consumed) {
        res.json({ valid: false, reason: "invite_already_used" });
        return;
      }
      res.json({ valid: true, role: invite.role, email: invite.email, reason: "invite_consumed" });
      return;
    }

    res.json({ valid: true, role: invite.role, email: invite.email, reason: "invite_valid" });
  } catch (error) {
    req.log.error({ err: error }, "Invite validation failed");
    res.status(500).json({ valid: false, reason: "invite_service_unavailable" });
  }
});

// Only the platform master can issue host/admin/support invitation links.
router.post("/invitations", requireAuth, async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (!canManageInvites(user)) {
    res.status(403).json({ error: "Only the Platform Master can issue invitations" });
    return;
  }

  const { email = null, role, expiresInHours = 72 } = req.body ?? {};
  if (!["host", "admin", "support"].includes(String(role))) {
    res.status(400).json({ error: "role must be host, admin, or support" });
    return;
  }
  const hours = Number(expiresInHours);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 720) {
    res.status(400).json({ error: "expiresInHours must be between 1 and 720" });
    return;
  }

  try {
    const token = crypto.randomBytes(32).toString("base64url");
    const [invite] = await db
      .insert(invitationTokensTable)
      .values({
        token_hash: hashToken(token),
        email: email ? String(email).toLowerCase().trim() : null,
        role: String(role),
        invited_by: user.userId,
        expires_at: new Date(Date.now() + hours * 60 * 60 * 1000),
      })
      .returning({ id: invitationTokensTable.id, role: invitationTokensTable.role, email: invitationTokensTable.email, expires_at: invitationTokensTable.expires_at });

    res.status(201).json({
      ...invite,
      token,
      invitePath: `/auth.html?invite=${encodeURIComponent(token)}&role=${encodeURIComponent(String(role))}`,
    });
  } catch (error) {
    req.log.error({ err: error }, "Invitation creation failed");
    res.status(500).json({ error: "Failed to create invitation" });
  }
});

router.get("/invitations", requireAuth, async (req: Request, res: Response) => {
  const user = currentUser(req);
  if (!canManageInvites(user)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const invites = await db
    .select({
      id: invitationTokensTable.id,
      email: invitationTokensTable.email,
      role: invitationTokensTable.role,
      expires_at: invitationTokensTable.expires_at,
      used_at: invitationTokensTable.used_at,
      created_at: invitationTokensTable.created_at,
    })
    .from(invitationTokensTable)
    .orderBy(invitationTokensTable.created_at);
  res.json(invites);
});

export default router;