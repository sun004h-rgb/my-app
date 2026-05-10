import { Router, type IRouter } from "express";
import { db, businessesTable, workersTable, subsidyRoundsTable, usersTable } from "@workspace/db";
import { eq, and, count, sum, gte, lte, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const monthStartStr = monthStart.toISOString().split("T")[0];
  const monthEndStr = monthEnd.toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const [totalBiz] = await db.select({ count: count() }).from(businessesTable);
  const [totalWorkers] = await db.select({ count: count() }).from(workersTable);
  const [totalRounds] = await db.select({ count: count() }).from(subsidyRoundsTable);

  const [pendingRounds] = await db
    .select({ count: count() })
    .from(subsidyRoundsTable)
    .where(eq(subsidyRoundsTable.status, "scheduled"));

  const [completedThisMonth] = await db
    .select({ count: count() })
    .from(subsidyRoundsTable)
    .where(
      and(
        eq(subsidyRoundsTable.status, "paid"),
        sql`${subsidyRoundsTable.dueDate} >= ${monthStartStr}`,
        sql`${subsidyRoundsTable.dueDate} <= ${monthEndStr}`
      )
    );

  const [feeResult] = await db
    .select({ total: sum(subsidyRoundsTable.amount) })
    .from(subsidyRoundsTable)
    .where(
      and(
        eq(subsidyRoundsTable.status, "paid"),
        sql`${subsidyRoundsTable.dueDate} >= ${monthStartStr}`,
        sql`${subsidyRoundsTable.dueDate} <= ${monthEndStr}`
      )
    );

  const [overdueRounds] = await db
    .select({ count: count() })
    .from(subsidyRoundsTable)
    .where(
      and(
        eq(subsidyRoundsTable.status, "scheduled"),
        sql`${subsidyRoundsTable.dueDate} < ${todayStr}`
      )
    );

  const [upcomingThisWeek] = await db
    .select({ count: count() })
    .from(subsidyRoundsTable)
    .where(
      and(
        eq(subsidyRoundsTable.status, "scheduled"),
        sql`${subsidyRoundsTable.dueDate} >= ${todayStr}`,
        sql`${subsidyRoundsTable.dueDate} <= ${weekEndStr}`
      )
    );

  // Businesses by year
  const bizByYear = await db
    .select({
      year: businessesTable.applicationYear,
      count: count(),
    })
    .from(businessesTable)
    .groupBy(businessesTable.applicationYear)
    .orderBy(businessesTable.applicationYear);

  // Rounds by status
  const roundsByStatus = await db
    .select({
      status: subsidyRoundsTable.status,
      count: count(),
    })
    .from(subsidyRoundsTable)
    .groupBy(subsidyRoundsTable.status);

  res.json({
    totalBusinesses: Number(totalBiz.count),
    totalWorkers: Number(totalWorkers.count),
    totalRounds: Number(totalRounds.count),
    pendingRounds: Number(pendingRounds.count),
    completedThisMonth: Number(completedThisMonth.count),
    feeThisMonth: Number(feeResult.total ?? 0),
    overdueRounds: Number(overdueRounds.count),
    upcomingThisWeek: Number(upcomingThisWeek.count),
    businessesByYear: bizByYear.map((b) => ({ year: b.year, count: Number(b.count) })),
    roundsByStatus: roundsByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
  });
});

router.get("/dashboard/manager-stats", requireAuth, async (_req, res): Promise<void> => {
  const managers = await db.select().from(usersTable).where(eq(usersTable.role, "manager"));

  const stats = await Promise.all(
    managers.map(async (m) => {
      const [bizCount] = await db
        .select({ count: count() })
        .from(businessesTable)
        .where(eq(businessesTable.managerId, m.id));

      const bizIds = await db
        .select({ id: businessesTable.id })
        .from(businessesTable)
        .where(eq(businessesTable.managerId, m.id));

      const idList = bizIds.map((b) => b.id);

      let workerCount = 0;
      let pendingRounds = 0;
      let completedRounds = 0;

      if (idList.length > 0) {
        const [wCount] = await db
          .select({ count: count() })
          .from(workersTable)
          .where(inArray(workersTable.businessId, idList));
        workerCount = Number(wCount.count);

        const [pCount] = await db
          .select({ count: count() })
          .from(subsidyRoundsTable)
          .where(
            and(
              inArray(subsidyRoundsTable.businessId, idList),
              eq(subsidyRoundsTable.status, "scheduled")
            )
          );
        pendingRounds = Number(pCount.count);

        const [cCount] = await db
          .select({ count: count() })
          .from(subsidyRoundsTable)
          .where(
            and(
              inArray(subsidyRoundsTable.businessId, idList),
              eq(subsidyRoundsTable.status, "paid")
            )
          );
        completedRounds = Number(cCount.count);
      }

      return {
        managerId: m.id,
        managerName: m.name,
        businessCount: Number(bizCount.count),
        workerCount,
        pendingRounds,
        completedRounds,
      };
    })
  );

  res.json(stats);
});

router.get("/dashboard/upcoming-rounds", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const rounds = await db
    .select({
      round: subsidyRoundsTable,
      workerName: workersTable.name,
      businessName: businessesTable.name,
      managerName: usersTable.name,
    })
    .from(subsidyRoundsTable)
    .leftJoin(workersTable, eq(workersTable.id, subsidyRoundsTable.workerId))
    .leftJoin(businessesTable, eq(businessesTable.id, subsidyRoundsTable.businessId))
    .leftJoin(usersTable, eq(usersTable.id, businessesTable.managerId))
    .where(
      and(
        eq(subsidyRoundsTable.status, "scheduled"),
        sql`${subsidyRoundsTable.dueDate} >= ${todayStr}`,
        sql`${subsidyRoundsTable.dueDate} <= ${weekEndStr}`
      )
    )
    .orderBy(subsidyRoundsTable.dueDate)
    .limit(20);

  res.json(
    rounds.map((r) => ({
      id: r.round.id,
      workerId: r.round.workerId,
      businessId: r.round.businessId,
      workerName: r.workerName,
      businessName: r.businessName,
      managerName: r.managerName,
      roundNumber: r.round.roundNumber,
      dueDate: r.round.dueDate,
      amount: r.round.amount,
      status: r.round.status,
      notes: r.round.notes,
      round2NotApplied: null,
      createdAt: r.round.createdAt.toISOString(),
    }))
  );
});

export default router;
