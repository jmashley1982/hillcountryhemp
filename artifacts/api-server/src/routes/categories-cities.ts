import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, citiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, requireLogin } from "../middlewares/auth.js";

const router: IRouter = Router();

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(rows);
});

router.post(
  "/admin/categories",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const { name } = req.body as { name?: string };
    const trimmed = name?.trim();
    if (!trimmed) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    try {
      await db.insert(categoriesTable).values({ name: trimmed });
      res.status(201).json({ success: true });
    } catch {
      res.status(409).json({ error: "Category already exists" });
    }
  },
);

router.patch(
  "/admin/categories/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const { name } = req.body as { name?: string };
    const trimmed = name?.trim();
    if (!trimmed || isNaN(id)) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    try {
      await db.update(categoriesTable).set({ name: trimmed }).where(eq(categoriesTable.id, id));
      res.json({ success: true });
    } catch {
      res.status(409).json({ error: "Name already in use" });
    }
  },
);

router.delete(
  "/admin/categories/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.json({ success: true });
  },
);

// ── Cities ────────────────────────────────────────────────────────────────────

router.get("/cities", async (_req, res): Promise<void> => {
  const rows = await db.select().from(citiesTable).orderBy(citiesTable.name);
  res.json(rows);
});

router.post(
  "/admin/cities",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const { name } = req.body as { name?: string };
    const trimmed = name?.trim();
    if (!trimmed) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    try {
      await db.insert(citiesTable).values({ name: trimmed });
      res.status(201).json({ success: true });
    } catch {
      res.status(409).json({ error: "City already exists" });
    }
  },
);

router.patch(
  "/admin/cities/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const { name } = req.body as { name?: string };
    const trimmed = name?.trim();
    if (!trimmed || isNaN(id)) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    try {
      await db.update(citiesTable).set({ name: trimmed }).where(eq(citiesTable.id, id));
      res.json({ success: true });
    } catch {
      res.status(409).json({ error: "Name already in use" });
    }
  },
);

router.delete(
  "/admin/cities/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(citiesTable).where(eq(citiesTable.id, id));
    res.json({ success: true });
  },
);

export default router;
