import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { propertiesTable, wishlistsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { optionalAuth, requireAuth, requireRole } from "../lib/auth.js";

const router: IRouter = Router();

// ─── GET /api/properties ──────────────────────────────────────────────────────
router.get("/properties", optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user?: { userId: string; role: string } }).user;
    const properties = await db
      .select()
      .from(propertiesTable)
      .where(user?.role === "host"
        ? eq(propertiesTable.host_id, user.userId)
        : eq(propertiesTable.status, "active"))
      .orderBy(desc(propertiesTable.created_at));
    res.json(properties.map((property) => ({ ...property, hostId: property.host_id })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// ─── GET /api/properties/my ───────────────────────────────────────────────────
router.get("/properties/my", requireAuth, requireRole("host", "admin", "platform_master_hub"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const properties = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.host_id, user.userId))
      .orderBy(desc(propertiesTable.created_at));
    res.json(properties.map((property) => ({ ...property, hostId: property.host_id })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your properties" });
  }
});

// ─── GET /api/properties/live-tours ──────────────────────────────────────────
router.get("/properties/live-tours", (_req, res) => {
  // There is no live-tour schedule table yet; do not label ordinary listings
  // as live tours. The endpoint remains compatible and returns no false data.
  res.json([]);
});

// Admin/Platform Master listing used for review and management.
router.get("/properties/manage", requireAuth, requireRole("admin", "platform_master_hub"), async (_req, res) => {
  try {
    const properties = await db.select().from(propertiesTable).orderBy(desc(propertiesTable.created_at));
    res.json(properties);
  } catch {
    res.status(500).json({ error: "Failed to fetch properties for review" });
  }
});

// ─── GET /api/properties/:id ─────────────────────────────────────────────────
router.get("/properties/:id", optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, id))
      .limit(1);
    if (!property) { res.status(404).json({ error: "Property not found" }); return; }
    const user = (req as Request & { user?: { userId: string; role: string } }).user;
    if (property.status !== "active" &&
      (!user || (property.host_id !== user.userId && !["admin", "platform_master_hub"].includes(user.role)))) {
      res.status(404).json({ error: "Property not found" });
      return;
    }
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
    const numericPrice = Number(price);
    if (typeof title !== "string" || !title.trim() || typeof location !== "string" || !location.trim() ||
      !Number.isFinite(numericPrice) || numericPrice <= 0) {
      res.status(400).json({ error: "title, location, and price are required" }); return;
    }
    const [property] = await db.insert(propertiesTable).values({
      host_id: user.userId,
      title: title.trim(),
      description: typeof description === "string" ? description : "",
      location: location.trim(),
      price: String(numericPrice),
      images: Array.isArray(images) ? images.filter((item: unknown) => typeof item === "string") : [],
      amenities: Array.isArray(amenities) ? amenities.filter((item: unknown) => typeof item === "string") : [],
      bedrooms: Number.isInteger(bedrooms) && bedrooms >= 0 ? bedrooms : 1,
      bathrooms: Number.isInteger(bathrooms) && bathrooms >= 0 ? bathrooms : 1,
      max_guests: Number.isInteger(max_guests) && max_guests > 0 ? max_guests : 2,
      property_type: typeof property_type === "string" ? property_type : "villa",
      // Host submissions always require review, regardless of a client-supplied status.
      status: user.role === "host" ? "pending" : "active",
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
    const isPrivileged = ["admin", "platform_master_hub"].includes(user.role);
    if (existing.host_id !== user.userId && !isPrivileged) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    if (req.body.status !== undefined) {
      const hostStatusChange = user.role === "host" &&
        ["active", "inactive"].includes(existing.status) &&
        ["active", "inactive"].includes(String(req.body.status));
      const hostResubmission = user.role === "host" && existing.status === "rejected" && req.body.status === "pending";
      if (!hostStatusChange && !hostResubmission) {
        res.status(403).json({ error: "Property approval status can only be changed by an administrator" });
        return;
      }
    }
    const allowed = ["title", "description", "location", "price", "images", "amenities", "bedrooms", "bathrooms", "max_guests", "property_type"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    if (req.body.status !== undefined) updates.status = String(req.body.status);
    if (updates.price !== undefined) {
      const price = Number(updates.price);
      if (!Number.isFinite(price) || price <= 0) { res.status(400).json({ error: "Price must be greater than zero" }); return; }
      updates.price = String(price);
    }
    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid property changes were provided" }); return; }
    const [updated] = await db.update(propertiesTable).set(updates).where(eq(propertiesTable.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update property" });
  }
});

router.patch("/properties/:id/approval", requireAuth, requireRole("admin", "platform_master_hub"), async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const status = req.body?.status;
  if (!["active", "rejected"].includes(status)) {
    res.status(400).json({ error: "Approval status must be active or rejected" });
    return;
  }
  try {
    const [existing] = await db.select({ id: propertiesTable.id, status: propertiesTable.status })
      .from(propertiesTable).where(eq(propertiesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Property not found" }); return; }
    if (!["pending", "rejected"].includes(existing.status)) {
      res.status(409).json({ error: "Only pending or rejected properties can be reviewed" });
      return;
    }
    const [updated] = await db.update(propertiesTable).set({ status }).where(eq(propertiesTable.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update property approval" });
  }
});

// ─── DELETE /api/properties/:id ───────────────────────────────────────────────
router.delete("/properties/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = String(req.params.id);
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Property not found" }); return; }
    if (existing.host_id !== user.userId && !["admin", "platform_master_hub"].includes(user.role)) {
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
    const user = (req as any).user;
    if (user.userId !== userId && !["admin", "platform_master_hub"].includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const items = await db.select().from(wishlistsTable).where(eq(wishlistsTable.user_id, userId));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

router.post("/wishlists", requireAuth, requireRole("customer"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { property_id } = req.body;
    if (typeof property_id !== "string") {
      res.status(400).json({ error: "property_id is required" });
      return;
    }
    const [property] = await db.select({ id: propertiesTable.id, status: propertiesTable.status })
      .from(propertiesTable).where(eq(propertiesTable.id, property_id)).limit(1);
    if (!property || property.status !== "active") {
      res.status(404).json({ error: "Property not found" });
      return;
    }
    const [item] = await db.insert(wishlistsTable).values({ user_id: user.userId, property_id }).returning();
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: "Failed to add to wishlist" });
  }
});

export default router;
