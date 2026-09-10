import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, notificationsTable, supportTicketsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get("/users", requireAuth, async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    let query = db.select({
      id: usersTable.id,
      email: usersTable.email,
      full_name: usersTable.full_name,
      role: usersTable.role,
      phone: usersTable.phone,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
    }).from(usersTable);

    const users = role
      ? await query.where(eq(usersTable.role, String(role)))
      : await query;

    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post("/users", requireAuth, async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user;
    if (!["admin", "platform_master_hub"].includes(caller.role)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const { email, password = "TempPass123!", full_name = "", role = "customer", phone = "" } = req.body;
    const password_hash = await bcrypt.hash(String(password), 12);
    const [user] = await db.insert(usersTable).values({
      email: String(email).toLowerCase().trim(), password_hash, full_name: String(full_name), role: String(role), phone: String(phone),
    }).returning({ id: usersTable.id, email: usersTable.email, full_name: usersTable.full_name, role: usersTable.role });
    res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "Email already exists" }); return; }
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get("/users/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [user] = await db.select({
      id: usersTable.id, email: usersTable.email, full_name: usersTable.full_name,
      role: usersTable.role, phone: usersTable.phone, is_active: usersTable.is_active, created_at: usersTable.created_at,
    }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
router.patch("/users/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user;
    const id = String(req.params.id);
    if (caller.userId !== id && !["admin", "platform_master_hub"].includes(caller.role)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const allowed = ["full_name", "phone", "avatar_url"];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    if (req.body.password) {
      updates["password_hash"] = await bcrypt.hash(String(req.body.password), 12);
    }
    updates["updated_at"] = new Date();
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
      id: usersTable.id, email: usersTable.email, full_name: usersTable.full_name, role: usersTable.role,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ─── Host assignment ──────────────────────────────────────────────────────────
router.post("/users/hosts/:hostId/assign", requireAuth, async (req: Request, res: Response) => {
  res.json({ message: "Host assigned successfully" });
});

// ─── Notifications ────────────────────────────────────────────────────────────
router.get("/notifications", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const items = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.user_id, user.userId))
      .orderBy(desc(notificationsTable.created_at))
      .limit(50);
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch("/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await db.update(notificationsTable).set({ is_read: true }).where(eq(notificationsTable.id, id));
    res.json({ message: "Marked as read" });
  } catch {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// ─── Support Tickets ──────────────────────────────────────────────────────────
router.get("/support/tickets", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tickets = ["admin", "support"].includes(user.role)
      ? await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.created_at))
      : await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.customer_id, user.userId)).orderBy(desc(supportTicketsTable.created_at));
    res.json(tickets);
  } catch {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.get("/support/tickets/stats", requireAuth, async (_req, res) => {
  try {
    const tickets = await db.select().from(supportTicketsTable);
    res.json({
      activeCount: tickets.filter(t => t.status === "open" || t.status === "in_progress").length,
      resolvedCount: tickets.filter(t => t.status === "resolved").length,
      totalCount: tickets.length,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.post("/support/tickets", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { subject, description, priority = "medium", category = "general" } = req.body;
    if (!subject) { res.status(400).json({ error: "Subject is required" }); return; }
    const [ticket] = await db.insert(supportTicketsTable).values({
      customer_id: user.userId, subject: String(subject), description: String(description || ""), priority: String(priority), category: String(category),
    }).returning();
    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

router.patch("/support/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!["admin", "support"].includes(user.role)) {
      res.status(403).json({ error: "Only support staff can update tickets" });
      return;
    }
    const id = String(req.params.id);
    const allowed = ["status", "priority", "category"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = String(req.body[key]);
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "At least one ticket field is required" });
      return;
    }
    const [updated] = await db.update(supportTicketsTable).set(updates).where(eq(supportTicketsTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// ─── Knowledge base ───────────────────────────────────────────────────────────
router.get("/knowledge-base", requireAuth, async (_req, res) => res.json([]));
router.post("/knowledge-base", requireAuth, async (req: Request, res: Response) => res.status(201).json({ id: "stub", ...req.body }));
router.put("/knowledge-base/:id", requireAuth, async (req: Request, res: Response) => res.json({ id: req.params.id, ...req.body }));
router.delete("/knowledge-base/:id", requireAuth, async (_req, res) => res.json({ message: "Deleted" }));
router.get("/knowledge-base/search", requireAuth, async (_req, res) => res.json([]));

// ─── Reviews ──────────────────────────────────────────────────────────────────
router.get("/reviews/user/:userId", requireAuth, async (_req, res) => res.json([]));
router.post("/reviews", requireAuth, async (req: Request, res: Response) => res.status(201).json({ id: "stub", ...req.body, created_at: new Date() }));
router.delete("/reviews/:id", requireAuth, async (_req, res) => res.json({ message: "Deleted" }));

// ─── Refunds ──────────────────────────────────────────────────────────────────
router.get("/refunds", requireAuth, async (_req, res) => res.json([]));
router.patch("/refunds/:id/:action", requireAuth, async (req: Request, res: Response) => res.json({ id: req.params.id, action: req.params.action }));

// ─── AI chat ──────────────────────────────────────────────────────────────────
const AI_MODEL = process.env["OPENAI_MODEL"] || "gpt-4o-mini";
const AI_TIMEOUT_MS = 30_000;
const MAX_AI_MESSAGE_LENGTH = 4_000;

const roleInstructions: Record<string, string> = {
  customer: "Help customers discover stays, understand bookings, prepare for check-in, and resolve payment or support questions. Never expose private host, admin, or platform data.",
  host: "Help hosts manage listings, approval status, reservations, guest communication, pricing, and payouts. Do not claim that a listing, payment, or approval changed unless the user completes the relevant action in the app.",
  admin: "Help administrators with property moderation, bookings, payments, refunds, support operations, and platform analytics. Treat live metrics as unavailable unless supplied in the current context.",
  support: "Help support staff triage tickets, explain policies, draft clear customer replies, and identify the next safe support action. Do not promise refunds or account changes.",
  platform_master_hub: "Help the Platform Master manage platform settings, invitations, access control, moderation, security, and branding. Never reveal secrets or claim a change was saved unless the app confirms it.",
  platform_master: "Help the Platform Master manage platform settings, invitations, access control, moderation, security, and branding. Never reveal secrets or claim a change was saved unless the app confirms it.",
  super_admin: "Help the Platform Master manage platform settings, invitations, access control, moderation, security, and branding. Never reveal secrets or claim a change was saved unless the app confirms it.",
};

function stringContextValue(value: unknown, maxLength = 240): string | undefined {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return undefined;
  return String(value).slice(0, maxLength);
}

router.post("/ai/chat", requireAuth, async (req: Request, res: Response) => {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "AI service is not configured", code: "AI_NOT_CONFIGURED" });
    return;
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) {
    res.status(400).json({ error: "A message is required" });
    return;
  }
  if (message.length > MAX_AI_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Messages must be ${MAX_AI_MESSAGE_LENGTH} characters or fewer` });
    return;
  }

  const user = (req as any).user;
  const rawContext = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  const context = {
    view: stringContextValue(rawContext.view, 80),
    currentPage: stringContextValue(rawContext.currentPage, 80),
    activeTicketId: stringContextValue(rawContext.activeTicketId, 80),
    currentCity: stringContextValue(rawContext.currentCity, 80),
    propertyType: stringContextValue(rawContext.propertyType, 80),
    activeFilter: stringContextValue(rawContext.activeFilter, 120),
  };
  const contextText = Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const role = String(user.role);
  const systemPrompt = [
    "You are ViewOnce AI, the assistant for ViewOnce Airbnb Stays in Kenya.",
    roleInstructions[role] || "Help the signed-in user navigate ViewOnce and understand available features.",
    "Answer in clear, concise language. Use Kenyan Shillings only when the user supplies a KSh amount.",
    "Do not invent property availability, booking status, prices, refunds, account data, or platform metrics.",
    "If the user asks you to perform an action, explain the relevant app section and state that the action still needs confirmation there.",
    "Do not output HTML, scripts, markdown tables, or secrets.",
    contextText ? `Current app context:\n${contextText}` : "",
  ].filter(Boolean).join("\n\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.3,
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
      signal: controller.signal,
    });
    const payload: any = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("OpenAI request failed", { status: upstream.status, code: payload?.error?.code });
      res.status(upstream.status === 429 ? 429 : 502).json({
        error: "The AI service is temporarily unavailable",
        code: "AI_UPSTREAM_ERROR",
      });
      return;
    }

    const reply = payload?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      res.status(502).json({ error: "The AI service returned an empty response", code: "AI_EMPTY_RESPONSE" });
      return;
    }

    res.json({
      reply,
      model: AI_MODEL,
      timestamp: new Date().toISOString(),
      error: false,
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("AI request error", { timeout: isTimeout });
    res.status(504).json({
      error: isTimeout ? "The AI service took too long to respond" : "The AI service is temporarily unavailable",
      code: isTimeout ? "AI_TIMEOUT" : "AI_REQUEST_FAILED",
    });
  } finally {
    clearTimeout(timeout);
  }
});

// ─── Payout process stub ─────────────────────────────────────────────────────
router.post("/payouts/:id/process", requireAuth, async (req: Request, res: Response) => {
  res.json({ id: req.params.id, status: "processing", message: "Payout submitted for processing" });
});

// ─── M-Pesa status stub ───────────────────────────────────────────────────────
router.get("/payments/mpesa/status/:txId", requireAuth, async (req: Request, res: Response) => {
  res.json({ transactionId: req.params.txId, status: "unknown" });
});

// ─── Stub endpoints for dashboard widgets ────────────────────────────────────
router.get("/security/stats", requireAuth, async (_req, res) => res.json({ threats: 0, events: 0, score: 98 }));
router.get("/security/threats/active", requireAuth, async (_req, res) => res.json([]));
router.get("/security/events", requireAuth, async (_req, res) => res.json([]));
router.get("/system/errors", requireAuth, async (_req, res) => res.json([]));
router.get("/system/performance", requireAuth, async (_req, res) => res.json({ cpu: 12, memory: 34, latency: 45 }));
router.get("/system/audit-logs", requireAuth, async (_req, res) => res.json([]));
router.get("/ai/analytics/insights", requireAuth, async (_req, res) => res.json({ insights: [] }));
router.get("/refunds/stats", requireAuth, async (_req, res) => res.json({ total: 0, pending: 0 }));
router.get("/host-onboarding/status", requireAuth, async (_req, res) => res.json({ complete: false, steps: [] }));
router.get("/auth/verify-master", requireAuth, async (req: Request, res) => {
  const user = (req as any).user;
  res.json({ valid: user.role === "platform_master_hub", role: user.role });
});

export default router;
