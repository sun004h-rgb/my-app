import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subsidyRoundsTable } from "./subsidy_rounds";
import { workersTable } from "./workers";
import { businessesTable } from "./businesses";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull().references(() => subsidyRoundsTable.id, { onDelete: "cascade" }),
  workerId: integer("worker_id").notNull().references(() => workersTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
