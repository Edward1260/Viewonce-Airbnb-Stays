import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { propertiesTable, wishlistsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

// ─── GET /api/properties ──────────────────────────────────────────────────────
router.get("/properties", async (_req, res) => {
  try {
    const properties = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.status, "active"))
      .orderBy(desc(propertiesTable.created_at));
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// ─── GET /api/properties/my ───────────────────────────────────────────────────
router.get("/properties/my", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const properties = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.host_id, user.userId))
      .orderBy(desc(propertiesTable.created_at));
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your properties" });
  }
});

// ─── GET /api/properties/live-tours ──────────────────────────────────────────
router.get("/properties/live-tours", async (_req, res) => {
  try {
    const properties = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.status, "active"))
      .limit(6);
    res.json(properties.map(p => ({ ...p, isLiveTour: true, tourScheduledAt: null })));
  } catch {
    res.status(500).json({ error: "Failed to fetch live tours" });
  }
});

// ─── GET /api/properties/:id ─────────────────────────────────────────────────
router.get("/properties/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, id))
      .limit(1);
    if (!property) { res.status(404).json({ error: "Property not found" }); return; }
    res.json(property);
  } catch {
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

// ─── POST /api/properties ─────────────────────────────────────────────────────
router.post("/properties", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!["host", "admin"].includes(user.role)) {
      res.status(403).json({ error: "Only hosts and admins can create properties" }); return;
    }
    const { title, description, location, price, images, amenities, bedrooms, bathrooms, max_guests, property_type } = req.body;
    if (!title || !location || !price) {
      res.status(400).json({ error: "title, location, and price are required" }); return;
    }
    const [property] = await db.insert(propertiesTable).values({
      host_id: user.userId, title, description, location,
      price: String(price), images, amenities, bedrooms, bathrooms, max_guests, property_type,
    }).returning();
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: "Failed to create property" });
  }
});

// ─── PUT /api/properties/:id ─────────────────────────────────────────────────
router.put("/properties/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = String(req.params.id);
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Property not found" }); return; }
    if (existing.host_id !== user.userId && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const allowed = ["title", "description", "location", "price", "images", "amenities", "bedrooms", "bathrooms", "max_guests", "property_type", "status"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    const [updated] = await db.update(propertiesTable).set(updates).where(eq(propertiesTable.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update property" });
  }
});

// ─── DELETE /api/properties/:id ───────────────────────────────────────────────
router.delete("/properties/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = String(req.params.id);
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Property not found" }); return; }
    if (existing.host_id !== user.userId && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    res.json({ message: "Property deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete property" });
  }
});

// ─── Wishlist ─────────────────────────────────────────────────────────────────
router.get("/wishlists/user/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const items = await db.select().from(wishlistsTable).where(eq(wishlistsTable.user_id, userId));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

router.post("/wishlists", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { property_id } = req.body;
    const [item] = await db.insert(wishlistsTable).values({ user_id: user.userId, property_id }).returning();
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: "Failed to add to wishlist" });
  }
});

export default router;
