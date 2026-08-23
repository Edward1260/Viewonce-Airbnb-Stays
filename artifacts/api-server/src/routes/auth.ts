import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { invitationTokensTable } from "@workspace/db";
import { and, gt, isNull } from "drizzle-orm";
import { signToken, signRefreshToken, verifyToken, type JwtPayload } from "../lib/auth.js";

const router: IRouter = Router();

// ─── Shared signup logic ─────────────────────────────────────────────────────
async function doSignup(req: Request, res: Response): Promise<void> {
  const { email, password, name, full_name, firstName, lastName, role = "customer", phone = "", invitationToken } = req.body ?? {};
  const resolvedName = (full_name || name || `${firstName || ""} ${lastName || ""}`.trim() || "User").trim();
  const resolvedEmail = String(email || "").toLowerCase().trim();

  if (!resolvedEmail || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  const requestedRole = String(role);
  if (requestedRole !== "customer") {
    if (!["host", "admin", "support"].includes(requestedRole) || typeof invitationToken !== "string") {
      res.status(403).json({ error: "A valid platform invitation is required for this account type" });
      return;
    }
  }

  const password_hash = await bcrypt.hash(String(password), 12);
  let user;
  try {
    user = await db.transaction(async (tx) => {
      let inviteId: string | undefined;
      if (requestedRole !== "customer") {
        const tokenHash = crypto.createHash("sha256").update(invitationToken as string).digest("hex");
        const [invite] = await tx.select().from(invitationTokensTable).where(and(
          eq(invitationTokensTable.token_hash, tokenHash),
          eq(invitationTokensTable.role, requestedRole),
          isNull(invitationTokensTable.used_at),
          gt(invitationTokensTable.expires_at, new Date()),
        )).limit(1);
        if (!invite || (invite.email && invite.email !== resolvedEmail)) {
          const error = new Error("Invalid, expired, or mismatched platform invitation");
          (error as Error & { status?: number }).status = 403;
          throw error;
        }
        inviteId = invite.id;
      }

      const [existing] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, resolvedEmail))
        .limit(1);
      if (existing) {
        const error = new Error("An account with this email already exists");
        (error as Error & { status?: number }).status = 409;
        throw error;
      }

      const [createdUser] = await tx.insert(usersTable).values({
        email: resolvedEmail,
        password_hash,
        full_name: resolvedName,
        role: requestedRole === "customer" ? "customer" : requestedRole,
        phone: String(phone),
      }).returning();

      if (inviteId) {
        const [consumed] = await tx.update(invitationTokensTable).set({ used_at: new Date() }).where(and(
          eq(invitationTokensTable.id, inviteId),
          isNull(invitationTokensTable.used_at),
        )).returning({ id: invitationTokensTable.id });
        if (!consumed) {
          const error = new Error("Invitation was already used");
          (error as Error & { status?: number }).status = 409;
          throw error;
        }
      }
      return createdUser;
    });
  } catch (err) {
    const status = (err as Error & { status?: number })?.status;
    if (status) {
      res.status(status).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }

  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  const token = signToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.status(201).json({
    otpRequired: false,
    token,
    accessToken: token,
    refreshToken,
    userId: user.id,
    id: user.id,
    user: { id: user.id, email: user.email, name: user.full_name, role: user.role },
  });
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, String(email).toLowerCase().trim()))
      .limit(1);

    if (!user || !user.is_active) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(String(password), user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const token = signToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.json({
      token,
      accessToken: token,
      refreshToken,
      userId: user.id,
      id: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    req.log?.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post("/auth/signup", async (req: Request, res: Response) => {
  try {
    await doSignup(req, res);
  } catch (err) {
    req.log?.error({ err }, "Signup error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/signup/request-otp  (alias: no actual OTP, instant signup)
router.post("/auth/signup/request-otp", async (req: Request, res: Response) => {
  try {
    await doSignup(req, res);
  } catch (err) {
    req.log?.error({ err }, "OTP signup error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// First-run bootstrap is deliberately one-time: once a platform master exists,
// this endpoint can never create another one.
router.get("/auth/setup-status", async (_req, res) => {
  const [master] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "platform_master_hub"))
    .limit(1);
  res.json({
    required: !master,
    message: master ? "Platform Master setup is already complete" : "Create the first Platform Master account",
  });
});

router.post("/auth/setup", async (req: Request, res: Response) => {
  try {
    const [master] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "platform_master_hub"))
      .limit(1);
    if (master) {
      res.status(409).json({ error: "Platform Master setup is already complete" });
      return;
    }

    const { email, password, firstName = "", lastName = "", phone = "" } = req.body ?? {};
    const resolvedEmail = String(email || "").toLowerCase().trim();
    if (!resolvedEmail || String(password || "").length < 8 || !firstName || !lastName) {
      res.status(400).json({ error: "First name, last name, email, and an 8-character password are required" });
      return;
    }
    const password_hash = await bcrypt.hash(String(password), 12);
    const [user] = await db.insert(usersTable).values({
      email: resolvedEmail,
      password_hash,
      full_name: `${firstName} ${lastName}`.trim(),
      role: "platform_master_hub",
      phone: String(phone),
    }).returning();
    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const token = signToken(payload);
    res.status(201).json({
      token,
      accessToken: token,
      refreshToken: signRefreshToken(payload),
      user: { id: user.id, email: user.email, name: user.full_name, role: user.role },
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    req.log?.error({ err }, "Platform setup error");
    res.status(500).json({ error: "Platform setup failed" });
  }
});

// ─── POST /api/auth/signup/verify-otp  (stub — OTP not used, token already issued)
router.post("/auth/signup/verify-otp", async (req: Request, res: Response) => {
  // In this implementation OTP is never required, so this is a fallback stub
  res.status(400).json({ error: "OTP verification not required — signup completed directly" });
});

// ─── POST /api/auth/signup/resend-otp ────────────────────────────────────────
router.post("/auth/signup/resend-otp", async (_req: Request, res: Response) => {
  res.status(400).json({ error: "OTP not used in this implementation" });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post("/auth/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) { res.status(400).json({ error: "refreshToken required" }); return; }
    const payload = verifyToken(String(refreshToken)) as JwtPayload;
    const newToken = signToken(payload);
    const newRefresh = signRefreshToken(payload);
    res.json({ token: newToken, accessToken: newToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────
router.get("/users/me", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  try {
    const payload = verifyToken(authHeader.slice(7)) as JwtPayload;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      id: user.id, email: user.email, name: user.full_name, full_name: user.full_name,
      role: user.role, phone: user.phone, avatar_url: user.avatar_url,
      is_active: user.is_active, created_at: user.created_at,
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── GET /api/auth/verify-master ─────────────────────────────────────────────
router.get("/auth/verify-master", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ valid: false }); return; }
  try {
    const payload = verifyToken(authHeader.slice(7)) as JwtPayload;
    res.json({ valid: payload.role === "platform_master_hub", role: payload.role });
  } catch {
    res.status(401).json({ valid: false });
  }
});

export default router;
