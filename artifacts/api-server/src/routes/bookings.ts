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

// ─── GET /api/payouts/stats ───────────────────────────────────────────────────
router.get("/payouts/stats", requireAuth, async (_req, res) => {
  try {
    const payments = await db.select({
      amount: paymentsTable.amount,
      net_amount: paymentsTable.net_amount,
      status: paymentsTable.status,
    }).from(paymentsTable);
    const total = payments.reduce((sum, payment) => sum + Number(payment.net_amount || 0), 0);
    const pending = payments.filter(payment => payment.status === "pending" || payment.status === "processing")
      .reduce((sum, payment) => sum + Number(payment.net_amount || 0), 0);
    const completed = payments.filter(payment => payment.status === "completed")
      .reduce((sum, payment) => sum + Number(payment.net_amount || 0), 0);
    res.json({ total, pending, completed, currency: "USD" });
  } catch {
    res.status(500).json({ error: "Failed to fetch payout stats" });
  }
});

router.get("/payouts/my", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const payouts = await db.select({
      id: paymentsTable.id,
      booking_id: paymentsTable.booking_id,
      amount: paymentsTable.amount,
      commission: paymentsTable.commission,
      net_amount: paymentsTable.net_amount,
      method: paymentsTable.payment_method,
      status: paymentsTable.status,
      created_at: paymentsTable.created_at,
      property_title: propertiesTable.title,
    }).from(paymentsTable)
      .innerJoin(bookingsTable, eq(paymentsTable.booking_id, bookingsTable.id))
      .innerJoin(propertiesTable, eq(bookingsTable.property_id, propertiesTable.id))
      .where(eq(propertiesTable.host_id, user.userId))
      .orderBy(desc(paymentsTable.created_at));
    res.json(payouts);
  } catch {
    res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

router.get("/payouts", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!["admin", "support", "platform_master_hub"].includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const payouts = await db.select({
      id: paymentsTable.id,
      booking_id: paymentsTable.booking_id,
      amount: paymentsTable.amount,
      commission: paymentsTable.commission,
      net_amount: paymentsTable.net_amount,
      method: paymentsTable.payment_method,
      status: paymentsTable.status,
      created_at: paymentsTable.created_at,
      property_title: propertiesTable.title,
      host_id: propertiesTable.host_id,
    }).from(paymentsTable)
      .innerJoin(bookingsTable, eq(paymentsTable.booking_id, bookingsTable.id))
      .innerJoin(propertiesTable, eq(bookingsTable.property_id, propertiesTable.id))
      .orderBy(desc(paymentsTable.created_at));
    res.json(payouts);
  } catch {
    res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

router.patch("/payouts/:id/approve", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!["admin", "platform_master_hub"].includes(user.role)) {
      res.status(403).json({ error: "Only administrators can approve payouts" });
      return;
    }
    const id = String(req.params.id);
    const [updated] = await db.update(paymentsTable)
      .set({ status: "completed" })
      .where(eq(paymentsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Payout not found" });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to approve payout" });
  }
});

export default router;
