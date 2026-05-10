import { Router, type IRouter } from "express";
import { db, notificationSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function getOrInitSettings() {
  const [existing] = await db.select().from(notificationSettingsTable).where(eq(notificationSettingsTable.id, 1));
  if (existing) return existing;

  const [created] = await db
    .insert(notificationSettingsTable)
    .values({ id: 1 })
    .returning();
  return created;
}

router.get("/settings/notifications", requireAuth, async (_req, res): Promise<void> => {
  const settings = await getOrInitSettings();
  res.json({ ...settings, updatedAt: settings.updatedAt.toISOString() });
});

router.put("/settings/notifications", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { slackEnabled, advanceDays, overdueIntervalDays, round3UrgentThresholdDays, round3DeadlineDays } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof slackEnabled === "boolean") updates.slackEnabled = slackEnabled;
  if (typeof advanceDays === "number") updates.advanceDays = advanceDays;
  if (typeof overdueIntervalDays === "number") updates.overdueIntervalDays = overdueIntervalDays;
  if (typeof round3UrgentThresholdDays === "number") updates.round3UrgentThresholdDays = round3UrgentThresholdDays;
  if (typeof round3DeadlineDays === "number") updates.round3DeadlineDays = round3DeadlineDays;

  await getOrInitSettings();

  const [updated] = await db
    .update(notificationSettingsTable)
    .set(updates)
    .where(eq(notificationSettingsTable.id, 1))
    .returning();

  logger.info({ updates }, "Notification settings updated");
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

export default router;
export { getOrInitSettings };
