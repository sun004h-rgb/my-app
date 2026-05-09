import { Router, type IRouter } from "express";
import { db, subsidyRoundsTable, workersTable, businessesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListRoundsQueryParams,
  CreateRoundBody,
  UpdateRoundParams,
  UpdateRoundBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { calculateDueDate, ROUND_AMOUNTS } from "../lib/rounds";

const router: IRouter = Router();

function formatRound(r: typeof subsidyRoundsTable.$inferSelect, workerName: string | null, businessName: string | null, managerName: string | null) {
  return {
    id: r.id,
    workerId: r.workerId,
    businessId: r.businessId,
    workerName,
    businessName,
    managerName,
    roundNumber: r.roundNumber,
    dueDate: r.dueDate,
    amount: r.amount,
    status: r.status,
    notes: r.notes,
    round2NotApplied: null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/rounds", requireAuth, async (req, res): Promise<void> => {
  const qp = ListRoundsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const { workerId, businessId, status, roundNumber, dueSoon } = qp.data;

  const conditions = [];
  if (workerId) conditions.push(eq(subsidyRoundsTable.workerId, workerId));
  if (businessId) conditions.push(eq(subsidyRoundsTable.businessId, businessId));
  if (status) conditions.push(eq(subsidyRoundsTable.status, status));
  if (roundNumber) conditions.push(eq(subsidyRoundsTable.roundNumber, roundNumber));

  if (dueSoon) {
    // Handled post-query for simplicity
  }

  const rounds = await db
    .select({
      round: subsidyRoundsTable,
      workerName: workersTable.name,
      businessName: businessesTable.name,
      managerName: usersTable.name,
      managerId: businessesTable.managerId,
    })
    .from(subsidyRoundsTable)
    .leftJoin(workersTable, eq(workersTable.id, subsidyRoundsTable.workerId))
    .leftJoin(businessesTable, eq(businessesTable.id, subsidyRoundsTable.businessId))
    .leftJoin(usersTable, eq(usersTable.id, businessesTable.managerId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(subsidyRoundsTable.dueDate);

  let result = rounds;

  // Manager access filter
  if (req.user!.role !== "admin") {
    result = result.filter((r) => r.managerId === req.user!.userId);
  }

  // Due soon filter (within 7 days)
  if (dueSoon) {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    result = result.filter((r) => {
      const due = new Date(r.round.dueDate);
      return due >= now && due <= soon;
    });
  }

  res.json(result.map((r) => formatRound(r.round, r.workerName, r.businessName, r.managerName)));
});

router.post("/rounds", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRoundBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { workerId, roundNumber, amount } = parsed.data;

  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, workerId));
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  // Check for duplicate
  const [existing] = await db
    .select()
    .from(subsidyRoundsTable)
    .where(and(eq(subsidyRoundsTable.workerId, workerId), eq(subsidyRoundsTable.roundNumber, roundNumber)));

  if (existing) {
    res.status(409).json({ error: "이미 해당 회차가 존재합니다" });
    return;
  }

  const rn = roundNumber as 1 | 2 | 3;
  const dueDate = calculateDueDate(worker.hireDate, rn, worker.isMidJoiner);
  const finalAmount = amount ?? ROUND_AMOUNTS[rn];

  const [round] = await db
    .insert(subsidyRoundsTable)
    .values({ workerId, businessId: worker.businessId, roundNumber, dueDate, amount: finalAmount, status: "scheduled" })
    .returning();

  res.status(201).json(formatRound(round, worker.name, null, null));
});

router.patch("/rounds/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRoundParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRoundBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.amount != null) updates.amount = parsed.data.amount;
  if (parsed.data.notes != null) updates.notes = parsed.data.notes;

  const [round] = await db
    .update(subsidyRoundsTable)
    .set(updates)
    .where(eq(subsidyRoundsTable.id, params.data.id))
    .returning();

  if (!round) {
    res.status(404).json({ error: "Round not found" });
    return;
  }

  res.json(formatRound(round, null, null, null));
});

export default router;
