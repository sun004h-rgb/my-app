import cron from "node-cron";
import { db, subsidyRoundsTable, workersTable, businessesTable, usersTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendSlackMessage } from "../lib/slack";
import { logger } from "../lib/logger";
import { getOrInitSettings } from "../routes/settings";

export function startScheduler(): void {
  // Run every day at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    logger.info("Running daily Slack notification scheduler");

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
    const baseUrl = `https://${domain}`;

    const now = new Date();

    try {
      // DB에서 알림 설정 로드
      const settings = await getOrInitSettings();

      if (!settings.slackEnabled) {
        logger.info("Slack notifications disabled — skipping");
        return;
      }

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
        const dDayMs = new Date(r.round.dueDate).getTime() - now.getTime();
        const dDays = Math.ceil(dDayMs / (1000 * 60 * 60 * 24));

        // D-N: 사전 알림 (설정된 일수)
        if (dDays === settings.advanceDays || dDays === 0) return true;

        if (dDays < 0) {
          const overdue = Math.abs(dDays);
          // 3회차이고 설정된 임계일 초과: 매일 알림
          if (r.round.roundNumber === 3 && overdue > settings.round3UrgentThresholdDays) return true;
          // 그 외: 설정된 간격으로 알림
          if (overdue % settings.overdueIntervalDays === 0) return true;
        }

        return false;
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
          siteUrl: baseUrl,
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
