import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { bookingsTable, paymentsTable, propertiesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

// ─── GET /api/bookings ────────────────────────────────────────────────────────
router.get("/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let bookings;
    if (["admin", "support"].includes(user.role)) {
      bookings = await db.select().from(bookingsTable).orderBy(desc(bookingsTable.created_at));
    } else {
      bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.guest_id, user.userId)).orderBy(desc(bookingsTable.created_at));
    }
    res.json(bookings);
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────
router.get("/bookings/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(booking);
  } catch {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// ─── POST /api/bookings ───────────────────────────────────────────────────────
router.post("/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { property_id, check_in, check_out, guests_count = 1, notes = "" } = req.body;
    if (!property_id || !check_in || !check_out) {
      res.status(400).json({ error: "property_id, check_in, check_out are required" }); return;
    }

    // Get property to calculate price
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, property_id)).limit(1);
    if (!property) { res.status(404).json({ error: "Property not found" }); return; }

    const msPerDay = 1000 * 60 * 60 * 24;
    const nights = Math.max(1, Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / msPerDay));
    const total_price = String(Number(property.price) * nights);

    const [booking] = await db.insert(bookingsTable).values({
      property_id, guest_id: user.userId, check_in, check_out,
      total_price, guests_count: Number(guests_count), notes,
    }).returning();

    // Create a pending payment record
    const commission = String(Number(total_price) * 0.1);
    await db.insert(paymentsTable).values({
      booking_id: booking.id,
      amount: total_price,
      commission,
      net_amount: String(Number(total_price) - Number(commission)),
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────
router.patch("/bookings/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    const [updated] = await db.update(bookingsTable).set({ status: "cancelled" }).where(eq(bookingsTable.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// ─── GET /api/payments ────────────────────────────────────────────────────────
router.get("/payments", requireAuth, async (req: Request, res: Response) => {
  try {
    const payments = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.created_at));
    res.json(payments);
  } catch {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// A payment row is not proof that a host was paid. Do not present booking payment
// records as payouts or mark them complete without a configured payout processor.
const payoutUnavailable = {
  error: "Host payouts are unavailable until a payout processor is connected",
  code: "PAYOUT_PROCESSOR_NOT_CONFIGURED",
};

router.get("/payouts/stats", requireAuth, (_req, res): void => {
  res.status(503).json(payoutUnavailable);
});

router.get("/payouts/my", requireAuth, (_req, res): void => {
  res.status(503).json(payoutUnavailable);
});

router.get("/payouts", requireAuth, (req: Request, res: Response): void => {
  const user = (req as any).user;
  if (!["admin", "support", "platform_master_hub"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.status(503).json(payoutUnavailable);
});

router.patch("/payouts/:id/approve", requireAuth, (req: Request, res: Response): void => {
  const user = (req as any).user;
  if (!["admin", "platform_master_hub"].includes(user.role)) {
    res.status(403).json({ error: "Only administrators can approve payouts" });
    return;
  }
  res.status(503).json(payoutUnavailable);
});

export default router;
