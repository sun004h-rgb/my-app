import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  representativeName: text("representative_name").notNull(),
  businessNumber: text("business_number").notNull().unique(),
  foundedDate: text("founded_date"),
  representativeResidentNumber: text("representative_resident_number"),
  representativePhone: text("representative_phone"),
  certPassword: text("cert_password"),
  managerName: text("manager_name").notNull(),
  managerId: integer("manager_id").notNull().references(() => usersTable.id),
  operatingAgency: text("operating_agency"),
  operatingAgencyPhone: text("operating_agency_phone"),
  applicationYear: integer("application_year").notNull(),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
