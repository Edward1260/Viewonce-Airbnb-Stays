import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_IN = "30d";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function normalizeRole(role: unknown): string {
  const value = typeof role === "string" ? role.trim().toLowerCase() : "";
  if (["platform_master", "super_admin", "platform_master_hub"].includes(value)) {
    return "platform_master_hub";
  }
  if (value === "superadmin") return "admin";
  return value;
}

export function isPlatformMasterRole(role: unknown): boolean {
  return normalizeRole(role) === "platform_master_hub";
}

export function requireRole(...allowedRoles: string[]) {
  const allowed = new Set(allowedRoles.map(normalizeRole));
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user || !allowed.has(normalizeRole(user.role))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

function getJwtSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

export function assertAuthConfig(): void {
  getJwtSecret();
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

// Re-check the account on every authenticated request so disabled users and
// stale role claims in existing tokens cannot retain access.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
    return;
  }
  try {
    const [account] = await db
      .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role, is_active: usersTable.is_active })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);
    if (!account || account.is_active !== true) {
      res.status(401).json({ error: "Unauthorized", message: "Account is inactive or no longer exists" });
      return;
    }
    (req as Request & { user: JwtPayload }).user = {
      userId: account.id,
      email: account.email,
      role: normalizeRole(account.role),
    };
    next();
  } catch {
    next(new Error("Authentication service is temporarily unavailable"));
  }
}

// Optional auth — attaches req.user if token present, continues either way
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    let payload: JwtPayload | null = null;
    try {
      payload = verifyToken(authHeader.slice(7));
    } catch {
      payload = null;
    }
    if (payload) {
      try {
      const [account] = await db
        .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role, is_active: usersTable.is_active })
        .from(usersTable)
        .where(eq(usersTable.id, payload.userId))
        .limit(1);
      if (account?.is_active === true) {
        (req as Request & { user: JwtPayload }).user = {
          userId: account.id,
          email: account.email,
          role: normalizeRole(account.role),
        };
      }
      } catch (error) {
        next(error);
        return;
      }
    }
  }
  next();
}
