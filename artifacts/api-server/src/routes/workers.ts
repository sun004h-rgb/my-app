import { Router, type IRouter } from "express";
import { db, workersTable, businessesTable, subsidyRoundsTable } from "@workspace/db";
import { eq, and, like } from "drizzle-orm";
import {
  ListWorkersQueryParams,
  CreateWorkerBody,
  GetWorkerParams,
  UpdateWorkerParams,
  UpdateWorkerBody,
  DeleteWorkerParams,
  ResignWorkerParams,
  ResignWorkerBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { calculateDueDate, ROUND_AMOUNTS } from "../lib/rounds";

const router: IRouter = Router();

function maskResidentNumber(n: string | null): string | null {
  if (!n) return null;
  return n.replace(/(\d{6})-?\d{7}/, "$1-*******");
}

router.get("/workers", requireAuth, async (req, res): Promise<void> => {
  // Parse businessId separately — it's optional for admin (0 or absent = all)
  const rawBizId = req.query["businessId"];
  const businessId = rawBizId !== undefined && rawBizId !== "" && rawBizId !== "0"
    ? Number(rawBizId)
    : null;

  const status = req.query["status"] as string | undefined;
  const search = req.query["search"] as string | undefined;

  // Access check for non-admins: must supply a specific businessId they manage
  if (req.user!.role !== "admin") {
    if (!businessId) {
      res.status(400).json({ error: "businessId is required for managers" });
      return;
    }
    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
    if (!biz || biz.managerId !== req.user!.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  const conditions = [];
  if (businessId) conditions.push(eq(workersTable.businessId, businessId));
  if (status) conditions.push(eq(workersTable.status, status));
  if (search) conditions.push(like(workersTable.name, `%${search}%`));

  const workers = await db
    .select({
      id: workersTable.id,
      businessId: workersTable.businessId,
      name: workersTable.name,
      hireDate: workersTable.hireDate,
      residentNumber: workersTable.residentNumber,
      isMidJoiner: workersTable.isMidJoiner,
      status: workersTable.status,
      resignDate: workersTable.resignDate,
      resignReason: workersTable.resignReason,
      canApplyAfterResign: workersTable.canApplyAfterResign,
      createdAt: workersTable.createdAt,
      businessName: businessesTable.name,
    })
    .from(workersTable)
    .leftJoin(businessesTable, eq(businessesTable.id, workersTable.businessId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(workersTable.createdAt);

  res.json(
    workers.map((w) => ({
      ...w,
      residentNumber: maskResidentNumber(w.residentNumber),
      createdAt: w.createdAt.toISOString(),
    }))
  );
});

router.post("/workers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { businessId, name, hireDate, residentNumber, isMidJoiner, status } = parsed.data;

  // Access check
  if (req.user!.role !== "admin") {
    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
    if (!biz || biz.managerId !== req.user!.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  const [worker] = await db
    .insert(workersTable)
    .values({ businessId, name, hireDate, residentNumber, isMidJoiner, status: status ?? "active" })
    .returning();

  // Auto-generate all 3 rounds
  const roundsToCreate = [1, 2, 3] as const;
  for (const roundNumber of roundsToCreate) {
    const dueDate = calculateDueDate(hireDate, roundNumber, isMidJoiner);
    const amount = ROUND_AMOUNTS[roundNumber];
    await db.insert(subsidyRoundsTable).values({
      workerId: worker.id,
      businessId,
      roundNumber,
      dueDate,
      amount,
      status: "scheduled",
    });
  }

  res.status(201).json({
    ...worker,
    residentNumber: maskResidentNumber(worker.residentNumber),
    createdAt: worker.createdAt.toISOString(),
    businessName: null,
  });
});

router.get("/workers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [worker] = await db
    .select({
      id: workersTable.id,
      businessId: workersTable.businessId,
      name: workersTable.name,
      hireDate: workersTable.hireDate,
      residentNumber: workersTable.residentNumber,
      isMidJoiner: workersTable.isMidJoiner,
      status: workersTable.status,
      resignDate: workersTable.resignDate,
      resignReason: workersTable.resignReason,
      canApplyAfterResign: workersTable.canApplyAfterResign,
      createdAt: workersTable.createdAt,
      businessName: businessesTable.name,
    })
    .from(workersTable)
    .leftJoin(businessesTable, eq(businessesTable.id, workersTable.businessId))
    .where(eq(workersTable.id, params.data.id));

  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  // Access check
  if (req.user!.role !== "admin") {
    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, worker.businessId));
    if (!biz || biz.managerId !== req.user!.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  const rounds = await db
    .select()
    .from(subsidyRoundsTable)
    .where(eq(subsidyRoundsTable.workerId, params.data.id))
    .orderBy(subsidyRoundsTable.roundNumber);

  res.json({
    ...worker,
    residentNumber: maskResidentNumber(worker.residentNumber),
    createdAt: worker.createdAt.toISOString(),
    rounds: rounds.map((r) => ({
      ...r,
      workerName: worker.name,
      businessName: worker.businessName,
      managerName: null,
      round2NotApplied: null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.patch("/workers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(workersTable).where(eq(workersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== null && v !== undefined) updates[k] = v;
  }

  const [updated] = await db
    .update(workersTable)
    .set(updates)
    .where(eq(workersTable.id, params.data.id))
    .returning();

  res.json({
    ...updated,
    residentNumber: maskResidentNumber(updated.residentNumber),
    createdAt: updated.createdAt.toISOString(),
    businessName: null,
  });
});

router.delete("/workers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(workersTable).where(eq(workersTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/workers/:id/resign", requireAuth, async (req, res): Promise<void> => {
  const params = ResignWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ResignWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { resignDate, resignReason, canApplyAfterResign } = parsed.data;

  const [worker] = await db
    .update(workersTable)
    .set({ status: "resigned", resignDate, resignReason, canApplyAfterResign: canApplyAfterResign ?? false })
    .where(eq(workersTable.id, params.data.id))
    .returning();

  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  // Update rounds for resigned worker
  const rounds = await db
    .select()
    .from(subsidyRoundsTable)
    .where(eq(subsidyRoundsTable.workerId, params.data.id));

  for (const round of rounds) {
    if (round.status === "scheduled") {
      const roundDue = new Date(round.dueDate);
      const resign = new Date(resignDate);
      let newStatus = "resigned";
      if (round.roundNumber === 1 && resign < roundDue) {
        newStatus = "not_applicable";
      }
      await db
        .update(subsidyRoundsTable)
        .set({ status: newStatus })
        .where(eq(subsidyRoundsTable.id, round.id));
    }
  }

  res.json({
    ...worker,
    residentNumber: maskResidentNumber(worker.residentNumber),
    createdAt: worker.createdAt.toISOString(),
    businessName: null,
  });
});

export default router;
