import cron from "node-cron";
import { db, subsidyRoundsTable, workersTable, businessesTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendSlackMessage } from "../lib/slack";
import { logger } from "../lib/logger";

export function startScheduler(): void {
  // Run every day at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    logger.info("Running daily Slack notification scheduler");

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
    const baseUrl = `https://${domain}`;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in7DaysStr = in7Days.toISOString().split("T")[0];

    try {
      const rounds = await db
        .select({
          round: subsidyRoundsTable,
          workerName: workersTable.name,
          workerId: subsidyRoundsTable.workerId,
          businessName: businessesTable.name,
          managerName: usersTable.name,
          managerId: businessesTable.managerId,
        })
        .from(subsidyRoundsTable)
        .leftJoin(workersTable, eq(workersTable.id, subsidyRoundsTable.workerId))
        .leftJoin(businessesTable, eq(businessesTable.id, subsidyRoundsTable.businessId))
        .leftJoin(usersTable, eq(usersTable.id, businessesTable.managerId))
        .where(eq(subsidyRoundsTable.status, "scheduled"));

      const targetRounds = rounds.filter((r) => {
        const due = r.round.dueDate;
        // 7일 전, 당일, 또는 미완료 3일 후 재알림
        const dDayMs = new Date(due).getTime() - now.getTime();
        const dDays = Math.ceil(dDayMs / (1000 * 60 * 60 * 24));
        return dDays === 7 || dDays === 0 || dDays === -3;
      });

      let sent = 0;
      for (const r of targetRounds) {
        const ok = await sendSlackMessage({
          businessName: r.businessName ?? "Unknown",
          workerName: r.workerName ?? "Unknown",
          roundNumber: r.round.roundNumber,
          amount: r.round.amount,
          dueDate: r.round.dueDate,
          managerName: r.managerName ?? "Unknown",
          workerUrl: `${baseUrl}/workers/${r.workerId}`,
        });

        if (ok) {
          sent++;
          await db.insert(notificationsTable).values({
            roundId: r.round.id,
            workerId: r.workerId,
            businessId: r.round.businessId,
            type: "scheduled_slack",
            message: `[자동] ${r.workerName} ${r.round.roundNumber}회차 신청 알림`,
            isRead: false,
          }).catch((e) => logger.warn({ e }, "Failed to log cron notification"));
        }
      }

      logger.info({ sent, total: targetRounds.length }, "Slack notifications sent");
    } catch (err) {
      logger.error({ err }, "Scheduler error");
    }
  });

  logger.info("Daily scheduler started (runs at 09:00)");
}
