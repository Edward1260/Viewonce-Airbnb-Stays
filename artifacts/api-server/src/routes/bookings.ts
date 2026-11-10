import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { bookingsTable, paymentsTable, propertiesTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

// ─── GET /api/bookings ────────────────────────────────────────────────────────
router.get("/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let bookings;
    if (["admin", "support", "platform_master_hub"].includes(user.role)) {
      bookings = await db.select().from(bookingsTable).orderBy(desc(bookingsTable.created_at));
    } else if (user.role === "host") {
      const properties = await db.select({ id: propertiesTable.id }).from(propertiesTable)
        .where(eq(propertiesTable.host_id, user.userId));
      const propertyIds = properties.map((property) => property.id);
      bookings = propertyIds.length
        ? await db.select().from(bookingsTable).where(inArray(bookingsTable.property_id, propertyIds)).orderBy(desc(bookingsTable.created_at))
        : [];
    } else {
      bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.guest_id, user.userId)).orderBy(desc(bookingsTable.created_at));
    }
    res.json(bookings.map((booking) => ({
      ...booking,
      propertyId: booking.property_id,
      guestId: booking.guest_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: Number(booking.total_price),
      guests: booking.guests_count,
    })));
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
    const user = (req as any).user;
    let allowed = booking.guest_id === user.userId || ["admin", "support", "platform_master_hub"].includes(user.role);
    if (!allowed && user.role === "host") {
      const [property] = await db.select({ host_id: propertiesTable.host_id }).from(propertiesTable)
        .where(eq(propertiesTable.id, booking.property_id)).limit(1);
      allowed = property?.host_id === user.userId;
    }
    if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }
    res.json({
      ...booking,
      propertyId: booking.property_id,
      guestId: booking.guest_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: Number(booking.total_price),
      guests: booking.guests_count,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// ─── POST /api/bookings ───────────────────────────────────────────────────────
router.post("/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== "customer") {
      res.status(403).json({ error: "Only customer accounts can create bookings" });
      return;
    }
    const { property_id, check_in, check_out, guests_count = 1, notes = "" } = req.body;
    if (!property_id || !check_in || !check_out) {
      res.status(400).json({ error: "property_id, check_in, check_out are required" }); return;
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof check_in !== "string" || typeof check_out !== "string" ||
      !datePattern.test(check_in) || !datePattern.test(check_out) || check_out <= check_in ||
      !Number.isInteger(Number(guests_count)) || Number(guests_count) < 1) {
      res.status(400).json({ error: "Provide valid booking dates and a positive guest count" });
      return;
    }

    // Get property to calculate price
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, property_id)).limit(1);
    if (!property) { res.status(404).json({ error: "Property not found" }); return; }
    if (property.status !== "active") { res.status(409).json({ error: "This property is not currently available for booking" }); return; }
    if (property.max_guests && Number(guests_count) > property.max_guests) {
      res.status(400).json({ error: `This property allows up to ${property.max_guests} guests` });
      return;
    }

    const checkInDate = new Date(`${check_in}T00:00:00.000Z`);
    const checkOutDate = new Date(`${check_out}T00:00:00.000Z`);
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkInDate < now) {
      res.status(400).json({ error: "Check-in must be a valid current or future date" });
      return;
    }
    const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const nightlyPrice = Number(property.price);
    if (!Number.isFinite(nightlyPrice) || nightlyPrice <= 0) {
      res.status(409).json({ error: "This property does not have a valid nightly price" });
      return;
    }
    const total_price = String(nightlyPrice * nights);

    const booking = await db.transaction(async (tx) => {
      const [created] = await tx.insert(bookingsTable).values({
        property_id, guest_id: user.userId, check_in, check_out,
        total_price, guests_count: Number(guests_count), notes: typeof notes === "string" ? notes : "",
      }).returning();
      const commission = String(Number(total_price) * 0.1);
      await tx.insert(paymentsTable).values({
        booking_id: created.id,
        amount: total_price,
        commission,
        net_amount: String(Number(total_price) - Number(commission)),
      });
      return created;
    });

    res.status(201).json({
      ...booking,
      propertyId: booking.property_id,
      guestId: booking.guest_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: Number(booking.total_price),
      guests: booking.guests_count,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────
router.patch("/bookings/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = (req as any).user;
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.guest_id !== user.userId && !["admin", "platform_master_hub"].includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!["pending", "confirmed"].includes(booking.status)) {
      res.status(409).json({ error: "Only pending or confirmed bookings can be cancelled" });
      return;
    }
    const [updated] = await db.update(bookingsTable).set({ status: "cancelled" }).where(eq(bookingsTable.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// ─── GET /api/payments ────────────────────────────────────────────────────────
router.get("/payments", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let payments;
    if (["admin", "platform_master_hub"].includes(user.role)) {
      payments = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.created_at));
    } else {
      let bookingIds: string[] = [];
      if (user.role === "customer") {
        const bookings = await db.select({ id: bookingsTable.id }).from(bookingsTable)
          .where(eq(bookingsTable.guest_id, user.userId));
        bookingIds = bookings.map((booking) => booking.id);
      } else if (user.role === "host") {
        const properties = await db.select({ id: propertiesTable.id }).from(propertiesTable)
          .where(eq(propertiesTable.host_id, user.userId));
        const propertyIds = properties.map((property) => property.id);
        if (propertyIds.length) {
          const bookings = await db.select({ id: bookingsTable.id }).from(bookingsTable)
            .where(inArray(bookingsTable.property_id, propertyIds));
          bookingIds = bookings.map((booking) => booking.id);
        }
      } else {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      payments = bookingIds.length
        ? await db.select().from(paymentsTable).where(inArray(paymentsTable.booking_id, bookingIds)).orderBy(desc(paymentsTable.created_at))
        : [];
    }
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
