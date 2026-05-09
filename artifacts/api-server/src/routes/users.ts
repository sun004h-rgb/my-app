import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin, hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.post("/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password, name, role } = parsed.data;
  const passwordHash = hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({ username, passwordHash, name, role })
    .returning();

  res.status(201).json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

router.patch("/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.password) updates.passwordHash = hashPassword(parsed.data.password);

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

router.delete("/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
