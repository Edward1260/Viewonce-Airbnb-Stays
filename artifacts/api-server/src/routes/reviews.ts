import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  bookingsTable,
  db,
  propertiesTable,
  reviewsTable,
  usersTable,
} from "@workspace/db";
import {
  CreateReviewBody,
  CreateReviewResponse,
  DeleteReviewParams,
  GetPropertyReviewsParams,
  GetPropertyReviewsResponse,
  GetUserReviewsParams,
  GetUserReviewsResponse,
} from "@workspace/api-zod";
import { requireAuth, type JwtPayload } from "../lib/auth.js";

const router: IRouter = Router();

type AuthenticatedRequest = Request & { user: JwtPayload };

const reviewProjection = {
  id: reviewsTable.id,
  booking_id: reviewsTable.booking_id,
  reviewer_id: reviewsTable.reviewer_id,
  property_id: reviewsTable.property_id,
  reviewer_name: usersTable.full_name,
  property_title: propertiesTable.title,
  property_location: propertiesTable.location,
  rating: reviewsTable.rating,
  comment: reviewsTable.comment,
  created_at: reviewsTable.created_at,
};

async function refreshPropertyRating(propertyId: string, executor: typeof db | any): Promise<void> {
  const [summary] = await executor
    .select({
      average: sql<string>`coalesce(avg(${reviewsTable.rating}), 0)::numeric(4,2)`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.property_id, propertyId));

  await executor
    .update(propertiesTable)
    .set({
      rating: String(summary?.average ?? "0"),
      review_count: Number(summary?.count ?? 0),
    })
    .where(eq(propertiesTable.id, propertyId));
}

router.get("/reviews/property/:propertyId", async (req: Request, res: Response): Promise<void> => {
  const params = GetPropertyReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid property id" });
    return;
  }

  try {
    const reviews = await db
      .select(reviewProjection)
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.reviewer_id, usersTable.id))
      .innerJoin(propertiesTable, eq(reviewsTable.property_id, propertiesTable.id))
      .where(eq(reviewsTable.property_id, params.data.propertyId))
      .orderBy(desc(reviewsTable.created_at));
    res.json(GetPropertyReviewsResponse.parse(reviews));
  } catch (error) {
    req.log?.error({ error }, "Failed to fetch property reviews");
    res.status(500).json({ error: "Failed to fetch property reviews" });
  }
});

router.get("/reviews/user/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const params = GetUserReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  if (params.data.userId !== req.user.userId && !["admin", "support", "platform_master_hub"].includes(req.user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const reviews = await db
      .select(reviewProjection)
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.reviewer_id, usersTable.id))
      .innerJoin(propertiesTable, eq(reviewsTable.property_id, propertiesTable.id))
      .where(eq(reviewsTable.reviewer_id, params.data.userId))
      .orderBy(desc(reviewsTable.created_at));
    res.json(GetUserReviewsResponse.parse(reviews));
  } catch (error) {
    req.log?.error({ error }, "Failed to fetch user reviews");
    res.status(500).json({ error: "Failed to fetch user reviews" });
  }
});

router.post("/reviews", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [booking] = await db
      .select({
        id: bookingsTable.id,
        guest_id: bookingsTable.guest_id,
        property_id: bookingsTable.property_id,
        status: bookingsTable.status,
      })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, parsed.data.booking_id))
      .limit(1);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    if (booking.guest_id !== req.user.userId) {
      res.status(403).json({ error: "Only the guest who made this booking can review it" });
      return;
    }
    if (booking.status !== "completed") {
      res.status(409).json({ error: "A review can only be added after a completed stay" });
      return;
    }

    const review = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(reviewsTable)
        .values({
          booking_id: booking.id,
          reviewer_id: req.user.userId,
          property_id: booking.property_id,
          rating: parsed.data.rating,
          comment: parsed.data.comment.trim(),
        })
        .returning();

      await refreshPropertyRating(booking.property_id, tx);

      const [result] = await tx
        .select(reviewProjection)
        .from(reviewsTable)
        .innerJoin(usersTable, eq(reviewsTable.reviewer_id, usersTable.id))
        .innerJoin(propertiesTable, eq(reviewsTable.property_id, propertiesTable.id))
        .where(eq(reviewsTable.id, created.id))
        .limit(1);
      return result;
    });

    res.status(201).json(CreateReviewResponse.parse(review));
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      res.status(409).json({ error: "This completed booking already has a review" });
      return;
    }
    req.log?.error({ error }, "Failed to create review");
    res.status(500).json({ error: "Failed to create review" });
  }
});

router.delete("/reviews/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const params = DeleteReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid review id" });
    return;
  }

  try {
    const deleted = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: reviewsTable.id,
          reviewer_id: reviewsTable.reviewer_id,
          property_id: reviewsTable.property_id,
        })
        .from(reviewsTable)
        .where(eq(reviewsTable.id, params.data.id))
        .limit(1);

      if (!existing) return { kind: "missing" as const };
      if (existing.reviewer_id !== req.user.userId && !["admin", "platform_master_hub"].includes(req.user.role)) {
        return { kind: "forbidden" as const };
      }

      await tx.delete(reviewsTable).where(and(eq(reviewsTable.id, existing.id)));
      await refreshPropertyRating(existing.property_id, tx);
      return { kind: "deleted" as const };
    });

    if (deleted.kind === "missing") {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    if (deleted.kind === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.sendStatus(204);
  } catch (error) {
    req.log?.error({ error }, "Failed to delete review");
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
