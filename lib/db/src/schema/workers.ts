import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const workersTable = pgTable("workers", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hireDate: text("hire_date").notNull(),
  residentNumber: text("resident_number"),
  isMidJoiner: boolean("is_mid_joiner").notNull().default(false),
  status: text("status").notNull().default("active"),
  resignDate: text("resign_date"),
  resignReason: text("resign_reason"),
  canApplyAfterResign: boolean("can_apply_after_resign"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWorkerSchema = createInsertSchema(workersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workersTable.$inferSelect;
