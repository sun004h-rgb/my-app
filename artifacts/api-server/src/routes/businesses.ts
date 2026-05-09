import { Router, type IRouter } from "express";
import { db, businessesTable, workersTable } from "@workspace/db";
import { eq, and, like, sql, count } from "drizzle-orm";
import {
  ListBusinessesQueryParams,
  CreateBusinessBody,
  GetBusinessParams,
  UpdateBusinessParams,
  UpdateBusinessBody,
  DeleteBusinessParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/businesses", requireAuth, async (req, res): Promise<void> => {
  const qp = ListBusinessesQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const { year, managerId, search, status } = qp.data;
  const isAdmin = req.user!.role === "admin";

  const conditions = [];
  if (!isAdmin) {
    conditions.push(eq(businessesTable.managerId, req.user!.userId));
  } else if (managerId) {
    conditions.push(eq(businessesTable.managerId, managerId));
  }
  if (year) conditions.push(eq(businessesTable.applicationYear, year));
  if (search) conditions.push(like(businessesTable.name, `%${search}%`));
  if (status) conditions.push(eq(businessesTable.status, status));

  const businesses = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      representativeName: businessesTable.representativeName,
      businessNumber: businessesTable.businessNumber,
      foundedDate: businessesTable.foundedDate,
      representativeResidentNumber: businessesTable.representativeResidentNumber,
      representativePhone: businessesTable.representativePhone,
      certPassword: businessesTable.certPassword,
      managerName: businessesTable.managerName,
      managerId: businessesTable.managerId,
      operatingAgency: businessesTable.operatingAgency,
      operatingAgencyPhone: businessesTable.operatingAgencyPhone,
      applicationYear: businessesTable.applicationYear,
      bankName: businessesTable.bankName,
      accountNumber: businessesTable.accountNumber,
      status: businessesTable.status,
      createdAt: businessesTable.createdAt,
      workerCount: count(workersTable.id),
    })
    .from(businessesTable)
    .leftJoin(workersTable, eq(workersTable.businessId, businessesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(businessesTable.id)
    .orderBy(businessesTable.createdAt);

  res.json(
    businesses.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      workerCount: Number(b.workerCount),
    }))
  );
});

router.post("/businesses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db.insert(businessesTable).values(parsed.data).returning();
  res.status(201).json({ ...business, createdAt: business.createdAt.toISOString(), workerCount: 0 });
});

router.get("/businesses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      representativeName: businessesTable.representativeName,
      businessNumber: businessesTable.businessNumber,
      foundedDate: businessesTable.foundedDate,
      representativeResidentNumber: businessesTable.representativeResidentNumber,
      representativePhone: businessesTable.representativePhone,
      certPassword: businessesTable.certPassword,
      managerName: businessesTable.managerName,
      managerId: businessesTable.managerId,
      operatingAgency: businessesTable.operatingAgency,
      operatingAgencyPhone: businessesTable.operatingAgencyPhone,
      applicationYear: businessesTable.applicationYear,
      bankName: businessesTable.bankName,
      accountNumber: businessesTable.accountNumber,
      status: businessesTable.status,
      createdAt: businessesTable.createdAt,
      workerCount: count(workersTable.id),
    })
    .from(businessesTable)
    .leftJoin(workersTable, eq(workersTable.businessId, businessesTable.id))
    .where(eq(businessesTable.id, params.data.id))
    .groupBy(businessesTable.id);

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  // Access control for managers
  if (req.user!.role !== "admin" && business.managerId !== req.user!.userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json({ ...business, createdAt: business.createdAt.toISOString(), workerCount: Number(business.workerCount) });
});

router.patch("/businesses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.managerId !== req.user!.userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== null && v !== undefined) updates[k] = v;
  }

  const [updated] = await db
    .update(businessesTable)
    .set(updates)
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), workerCount: 0 });
});

router.delete("/businesses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.managerId !== req.user!.userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.delete(businessesTable).where(eq(businessesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
