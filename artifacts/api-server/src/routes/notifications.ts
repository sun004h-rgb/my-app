import { Router, type IRouter } from "express";
import { db, notificationsTable, workersTable, businessesTable, subsidyRoundsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  ListNotificationsQueryParams,
  MarkNotificationReadParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { sendSlackMessage } from "../lib/slack";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const qp = ListNotificationsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const { unreadOnly } = qp.data;
  const conditions = [];
  if (unreadOnly) conditions.push(eq(notificationsTable.isRead, false));

  const notifications = await db
    .select({
      id: notificationsTable.id,
      roundId: notificationsTable.roundId,
      workerId: notificationsTable.workerId,
      businessId: notificationsTable.businessId,
      type: notificationsTable.type,
      message: notificationsTable.message,
      sentAt: notificationsTable.sentAt,
      isRead: notificationsTable.isRead,
      workerName: workersTable.name,
      businessName: businessesTable.name,
    })
    .from(notificationsTable)
    .leftJoin(workersTable, eq(workersTable.id, notificationsTable.workerId))
    .leftJoin(businessesTable, eq(businessesTable.id, notificationsTable.businessId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(notificationsTable.sentAt))
    .limit(100);

  res.json(
    notifications.map((n) => ({
      ...n,
      sentAt: n.sentAt.toISOString(),
    }))
  );
});

router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [notification] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, params.data.id))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({
    ...notification,
    sentAt: notification.sentAt.toISOString(),
    workerName: null,
    businessName: null,
  });
});

router.post("/notifications/send-slack", requireAuth, async (req, res): Promise<void> => {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
  const baseUrl = `https://${domain}`;

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find upcoming rounds (scheduled, due within 7 days)
  const rounds = await db
    .select({
      round: subsidyRoundsTable,
      workerName: workersTable.name,
      businessName: businessesTable.name,
      managerName: usersTable.name,
      workerId: subsidyRoundsTable.workerId,
    })
    .from(subsidyRoundsTable)
    .leftJoin(workersTable, eq(workersTable.id, subsidyRoundsTable.workerId))
    .leftJoin(businessesTable, eq(businessesTable.id, subsidyRoundsTable.businessId))
    .leftJoin(usersTable, eq(usersTable.id, businessesTable.managerId))
    .where(eq(subsidyRoundsTable.status, "scheduled"));

  const upcomingRounds = rounds.filter((r) => {
    const due = new Date(r.round.dueDate);
    return due >= now && due <= in7Days;
  });

  let sent = 0;
  for (const r of upcomingRounds) {
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
      // Log notification
      await db.insert(notificationsTable).values({
        roundId: r.round.id,
        workerId: r.workerId,
        businessId: r.round.businessId,
        type: "slack",
        message: `${r.workerName} ${r.round.roundNumber}회차 신청 알림 발송`,
        isRead: false,
      }).catch((e) => logger.warn({ e }, "Failed to log notification"));
    }
  }

  res.json({
    sent,
    total: upcomingRounds.length,
    message: `${sent}/${upcomingRounds.length}건 슬랙 알림 발송 완료`,
  });
});

export default router;
