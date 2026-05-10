import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationSettingsTable = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  slackEnabled: boolean("slack_enabled").notNull().default(true),
  advanceDays: integer("advance_days").notNull().default(7),
  overdueIntervalDays: integer("overdue_interval_days").notNull().default(3),
  round3UrgentThresholdDays: integer("round3_urgent_threshold_days").notNull().default(30),
  round3DeadlineDays: integer("round3_deadline_days").notNull().default(60),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationSettings = typeof notificationSettingsTable.$inferSelect;
