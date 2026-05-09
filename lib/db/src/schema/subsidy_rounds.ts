import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workersTable } from "./workers";
import { businessesTable } from "./businesses";

export const subsidyRoundsTable = pgTable("subsidy_rounds", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull().references(() => workersTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  dueDate: text("due_date").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubsidyRoundSchema = createInsertSchema(subsidyRoundsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubsidyRound = z.infer<typeof insertSubsidyRoundSchema>;
export type SubsidyRound = typeof subsidyRoundsTable.$inferSelect;
