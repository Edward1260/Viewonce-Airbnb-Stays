import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  numeric,
  integer,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  full_name: text("full_name").notNull().default(""),
  role: text("role").notNull().default("customer"),
  phone: text("phone").default(""),
  avatar_url: text("avatar_url").default(""),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// ─── Properties ───────────────────────────────────────────────────────────────
export const propertiesTable = pgTable("properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  host_id: uuid("host_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  location: text("location").notNull().default(""),
  price: numeric("price").notNull().default("0"),
  images: text("images").array().default(sql`'{}'`),
  amenities: text("amenities").array().default(sql`'{}'`),
  bedrooms: integer("bedrooms").default(1),
  bathrooms: integer("bathrooms").default(1),
  max_guests: integer("max_guests").default(2),
  property_type: text("property_type").default("villa"),
  status: text("status").notNull().default("active"),
  rating: numeric("rating").default("0"),
  review_count: integer("review_count").default(0),
  is_featured: boolean("is_featured").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({
  id: true,
  created_at: true,
});
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsTable = pgTable("bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  property_id: uuid("property_id")
    .notNull()
    .references(() => propertiesTable.id, { onDelete: "cascade" }),
  guest_id: uuid("guest_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  check_in: date("check_in").notNull(),
  check_out: date("check_out").notNull(),
  total_price: numeric("total_price").notNull().default("0"),
  guests_count: integer("guests_count").default(1),
  status: text("status").notNull().default("pending"),
  notes: text("notes").default(""),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  created_at: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  booking_id: uuid("booking_id")
    .notNull()
    .references(() => bookingsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull().default("0"),
  commission: numeric("commission").default("0"),
  net_amount: numeric("net_amount").notNull().default("0"),
  payment_method: text("payment_method").default("card"),
  status: text("status").notNull().default("pending"),
  stripe_payment_id: text("stripe_payment_id").default(""),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;

// ─── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsTable = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    booking_id: uuid("booking_id")
      .notNull()
      .references(() => bookingsTable.id, { onDelete: "cascade" }),
    reviewer_id: uuid("reviewer_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    property_id: uuid("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.booking_id)],
);

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  created_at: true,
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;

// ─── Support Tickets ──────────────────────────────────────────────────────────
export const supportTicketsTable = pgTable("support_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customer_id: uuid("customer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  category: text("category").default("general"),
  assigned_to: uuid("assigned_to").references(() => usersTable.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;

// ─── Wishlists ────────────────────────────────────────────────────────────────
export const wishlistsTable = pgTable(
  "wishlists",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    property_id: uuid("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.user_id, t.property_id)],
);

export type Wishlist = typeof wishlistsTable.$inferSelect;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  message: text("message").notNull().default(""),
  type: text("type").default("info"),
  is_read: boolean("is_read").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;

// ─── Privileged invitations ───────────────────────────────────────────────────
export const invitationTokensTable = pgTable("invitation_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  token_hash: text("token_hash").notNull().unique(),
  email: text("email"),
  role: text("role").notNull(),
  invited_by: uuid("invited_by").references(() => usersTable.id, { onDelete: "set null" }),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  used_at: timestamp("used_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type InvitationToken = typeof invitationTokensTable.$inferSelect;
