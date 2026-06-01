import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import { requireLogin, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Public
router.get("/brands", async (_req, res): Promise<void> => {
  const brands = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      is_featured: brandsTable.isFeatured,
    })
    .from(brandsTable)
    .orderBy(brandsTable.name);
  res.json(brands);
});

// Admin: add brand
router.post(
  "/brands",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ error: "Brand name required" });
      return;
    }
    try {
      await db.insert(brandsTable).values({ name });
      res.status(201).json({ success: true });
    } catch {
      res.status(400).json({ error: "Brand already exists" });
    }
  },
);

// Admin: delete brand
router.delete(
  "/brands/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await db
      .delete(brandsTable)
      .where(eq(brandsTable.id, parseInt(raw, 10)));
    res.json({ success: true });
  },
);

// Admin: toggle featured
router.put(
  "/brands/:id/feature",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const [brand] = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, id));
    if (!brand) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }
    const newStatus = brand.isFeatured ? 0 : 1;
    await db
      .update(brandsTable)
      .set({ isFeatured: newStatus })
      .where(eq(brandsTable.id, id));
    res.json({ is_featured: newStatus });
  },
);

export default router;
